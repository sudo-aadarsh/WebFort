#!/usr/bin/env node
/**
 * worker.js — Standalone scan worker process.
 *
 * This process connects to RabbitMQ and consumes scan jobs from the
 * `websecure.scan.jobs` queue. Each job is processed by the ScanEngine.
 *
 * Run multiple instances of this worker for horizontal scaling:
 *   node src/worker.js
 *   # or via Kubernetes Deployment with replicas: 5
 *
 * The worker shares the same database and Redis connections as the API,
 * but runs as a completely separate process.
 */
import 'dotenv/config';
import { initializeDatabase } from './config/database.js';
import { connectQueue, consume, QUEUES } from './services/queue.js';
import { ScanEngine } from './core/engine.js';

const WORKER_ID = `worker-${process.pid}-${Date.now().toString(36)}`;

async function main() {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║                                          ║
  ║   🔧 WebSecure Scan Worker                 ║
  ║   ────────────────────────               ║
  ║   Worker ID: ${WORKER_ID.padEnd(23)}    ║
  ║                                          ║
  ╚══════════════════════════════════════════╝
  `);

  // Initialize shared services
  await initializeDatabase();

  const channel = await connectQueue();
  if (!channel) {
    console.error('❌ Cannot start worker: RabbitMQ is unavailable.');
    console.error('   Make sure RabbitMQ is running: docker compose up rabbitmq');
    process.exit(1);
  }

  // Consume scan jobs
  await consume(QUEUES.SCAN_JOBS, async (job) => {
    const { scanId, targetUrl, scanType, scanDepth } = job;
    console.log(`[${WORKER_ID}] Processing scan ${scanId} → ${targetUrl} (${scanType})`);

    const start = Date.now();
    await ScanEngine.executeScan({ scanId, targetUrl, scanType, scanDepth });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    console.log(`[${WORKER_ID}] Scan ${scanId} completed in ${elapsed}s`);
  });

  console.log(`✓ Worker ${WORKER_ID} is ready and waiting for scan jobs...\n`);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log(`[${WORKER_ID}] Received SIGTERM. Finishing current job and shutting down...`);
  // The RabbitMQ consumer will finish its current message before exiting
  setTimeout(() => process.exit(0), 5000);
});

process.on('SIGINT', () => {
  console.log(`[${WORKER_ID}] Received SIGINT. Shutting down...`);
  process.exit(0);
});

main().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});
