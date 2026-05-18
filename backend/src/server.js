import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { WebSocketServer } from 'ws';
import http from 'http';

import { initializeDatabase } from './config/database.js';
import redis from './config/redis.js';
import { connectQueue, closeQueue } from './services/queue.js';
import authRoutes from './api/auth/routes.js';
import scanRoutes from './api/scans/routes.js';
import reportRoutes from './api/reports/routes.js';
import userRoutes from './api/users/routes.js';
import alertRoutes from './api/alerts/routes.js';
import integrationRoutes from './api/integrations/routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { auditLog } from './middleware/auditLog.js';
import { resolveTenant } from './middleware/tenant.js';
import { setupWebSocket } from './services/websocket.js';
import { oobService } from './services/oob.js';
import { logger, metrics } from './utils/logger.js';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// ─── Database Init ────────────────────────────────────────────────────────────
await initializeDatabase();

// ─── Message Queue Init ───────────────────────────────────────────────────────
await connectQueue();

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: [/http:\/\/localhost:\d+/, process.env.CORS_ORIGIN],
  credentials: true,
}));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Redis-backed Rate Limiting ───────────────────────────────────────────────
// Each limiter needs its OWN RedisStore instance (unique prefix)
function makeStore(prefix) {
  if (redis.status !== 'ready') return undefined; // memory fallback
  return new RedisStore({
    prefix: `rl:${prefix}:`,
    sendCommand: (...args) => redis.call(...args),
  });
}

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increased for interactive UI
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('global'),
  message: { error: 'Too many requests, please try again later.' },
});

const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100, // Increased to allow polling and list views
  store: makeStore('scan'),
  message: { error: 'Scan rate limit exceeded.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  store: makeStore('auth'),
  message: { error: 'Too many auth attempts, please try again in 15 minutes.' },
});

app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/scans', scanLimiter);

// ─── Request Logging ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      tenantId: req.tenant?.id,
      userId: req.user?.id
    }, 'HTTP Request');
  });
  next();
});

// ─── Tenant Resolution ────────────────────────────────────────────────────────
app.use('/api/', resolveTenant);

// ─── Audit Logging ────────────────────────────────────────────────────────────
app.use('/api/', auditLog);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/integrations', integrationRoutes);

// ─── OOB Interaction Tracker ──────────────────────────────────────────────────
app.all('/api/oob/:token', (req, res) => {
  const { token } = req.params;
  oobService.recordHit(token, {
    method: req.method,
    headers: req.headers,
    ip: req.ip,
    query: req.query,
    body: req.body
  });
  res.status(200).send('OK');
});

// ─── Health & Metrics ─────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const redisOk = redis.status === 'ready';
  res.json({
    status: 'healthy',
    version: '2.0.0',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    services: {
      postgres: 'connected',
      redis: redisOk ? 'connected' : 'unavailable',
    },
  });
});

app.get('/api/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  let output = '# HELP websecure_scans_started Total scans started\n';
  output += `# TYPE websecure_scans_started counter\nwebsecure_scans_started ${metrics.scansStarted}\n\n`;
  output += '# HELP websecure_scans_completed Total scans completed\n';
  output += `# TYPE websecure_scans_completed counter\nwebsecure_scans_completed ${metrics.scansCompleted}\n\n`;
  output += '# HELP websecure_vulnerabilities_total Total vulnerabilities found\n';
  output += `# TYPE websecure_vulnerabilities_total counter\nwebsecure_vulnerabilities_total ${metrics.vulnerabilitiesFound}\n`;
  res.send(output);
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── WebSocket ────────────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server, path: '/ws' });
setupWebSocket(wss);

// ─── Start Server ─────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  const redisStatus = redis.status === 'ready' ? '✓ Redis' : '⚠ Redis (memory fallback)';
  console.log(`
  ╔══════════════════════════════════════════╗
  ║                                          ║
  ║   🛡️  WebSecure API Server v2.0            ║
  ║   ────────────────────────               ║
  ║   Port:    ${PORT}                          ║
  ║   Mode:    ${(process.env.NODE_ENV || 'development').padEnd(16)}║
  ║   Health:  http://localhost:${PORT}/api/health ║
  ║                                          ║
  ╚══════════════════════════════════════════╝
  `);
  console.log(`  ✓ PostgreSQL  connected`);
  console.log(`  ${redisStatus}      connected`);
  console.log(`  ✓ Audit Log   enabled`);
  console.log(`  ✓ Multi-Tenant middleware active\n`);
});

export { app, server, wss };

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close();
  await closeQueue();
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
