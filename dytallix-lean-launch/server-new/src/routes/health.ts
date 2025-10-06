import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { register } from 'prom-client';
import { getDb } from '../db.js';

export async function healthRoutes(fastify: FastifyInstance) {
  // Basic health check
  fastify.get('/healthz', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).send('ok');
  });
  
  // Readiness check (checks database)
  fastify.get('/readyz', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const db = getDb();
      // Simple query to check database
      db.prepare('SELECT 1').get();
      return reply.code(200).send('ready');
    } catch (error) {
      return reply.code(503).send('not ready');
    }
  });
  
  // Prometheus metrics
  fastify.get('/metrics', async (_request: FastifyRequest, reply: FastifyReply) => {
    const metrics = await register.metrics();
    return reply
      .header('Content-Type', register.contentType)
      .send(metrics);
  });
}
