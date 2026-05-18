/**
 * queue.js — RabbitMQ message queue abstraction.
 * Handles connection, channel creation, publishing, and consuming.
 * Falls back to in-process execution if RabbitMQ is unavailable.
 */
import amqplib from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://websecure:websecure_mq@localhost:5672/websecure';

// Queue names
export const QUEUES = {
  SCAN_JOBS: 'websecure.scan.jobs',
  SCAN_RESULTS: 'websecure.scan.results',
  SCAN_PROGRESS: 'websecure.scan.progress',
};

let connection = null;
let channel = null;
let isConnected = false;

export async function connectQueue() {
  try {
    connection = await amqplib.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Declare all queues as durable (survive broker restarts)
    for (const queue of Object.values(QUEUES)) {
      await channel.assertQueue(queue, {
        durable: true,
        arguments: {
          'x-message-ttl': 3600000,      // Messages expire after 1 hour
          'x-dead-letter-exchange': '',   // Dead-letter to default exchange
          'x-dead-letter-routing-key': `${queue}.dead`,
        },
      });
      // Also create the dead-letter queue
      await channel.assertQueue(`${queue}.dead`, { durable: true });
    }

    // Prefetch: each worker processes 1 job at a time
    await channel.prefetch(1);

    isConnected = true;
    console.log('✓ RabbitMQ connected');

    connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err.message);
      isConnected = false;
    });

    connection.on('close', () => {
      console.warn('⚠️  RabbitMQ connection closed. Reconnecting in 5s...');
      isConnected = false;
      setTimeout(connectQueue, 5000);
    });

    return channel;
  } catch (err) {
    console.warn('⚠️  RabbitMQ unavailable — using in-process fallback:', err.message);
    isConnected = false;
    return null;
  }
}

/**
 * Publish a message to a queue.
 * Returns true if published to RabbitMQ, false if fallback is needed.
 */
export function publish(queueName, payload) {
  if (!isConnected || !channel) return false;

  try {
    channel.sendToQueue(
      queueName,
      Buffer.from(JSON.stringify(payload)),
      {
        persistent: true,        // Survive broker restarts
        contentType: 'application/json',
        timestamp: Date.now(),
      }
    );
    return true;
  } catch (err) {
    console.error('Queue publish error:', err.message);
    return false;
  }
}

/**
 * Subscribe to a queue and process messages.
 * @param {string} queueName
 * @param {function} handler - async function(payload) that processes the message
 */
export async function consume(queueName, handler) {
  if (!isConnected || !channel) {
    console.warn(`Cannot consume from ${queueName}: RabbitMQ not connected`);
    return;
  }

  await channel.consume(queueName, async (msg) => {
    if (!msg) return;

    try {
      const payload = JSON.parse(msg.content.toString());
      await handler(payload);
      channel.ack(msg);  // Acknowledge successful processing
    } catch (err) {
      console.error(`Error processing message from ${queueName}:`, err.message);
      // Negative ack — requeue=false sends to dead-letter queue
      channel.nack(msg, false, false);
    }
  });

  console.log(`✓ Consuming from queue: ${queueName}`);
}

/**
 * Check if the queue system is connected.
 */
export function isQueueConnected() {
  return isConnected;
}

/**
 * Graceful shutdown.
 */
export async function closeQueue() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log('RabbitMQ connection closed gracefully');
  } catch (err) {
    console.error('Error closing RabbitMQ:', err.message);
  }
}
