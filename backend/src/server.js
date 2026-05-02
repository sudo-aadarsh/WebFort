import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { WebSocketServer } from 'ws';
import http from 'http';

import { initializeDatabase } from './config/database.js';
import authRoutes from './api/auth/routes.js';
import scanRoutes from './api/scans/routes.js';
import reportRoutes from './api/reports/routes.js';
import userRoutes from './api/users/routes.js';
import alertRoutes from './api/alerts/routes.js';
import integrationRoutes from './api/integrations/routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { setupWebSocket } from './services/websocket.js';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize database
initializeDatabase();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/integrations', integrationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use(errorHandler);

// WebSocket setup
const wss = new WebSocketServer({ server, path: '/ws' });
setupWebSocket(wss);

// Start server
server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║                                          ║
  ║   🛡️  WebFort API Server                 ║
  ║   ────────────────────────               ║
  ║   Port:    ${PORT}                          ║
  ║   Mode:    ${process.env.NODE_ENV || 'development'}               ║
  ║   Health:  http://localhost:${PORT}/api/health ║
  ║                                          ║
  ╚══════════════════════════════════════════╝
  `);
});

export { app, server, wss };
