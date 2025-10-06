import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db.js';
// import { getSigner } from '../signer/index.js'; // available but not used in this module
import { setSigner, LocalPrivateKeySigner } from '../signer/index.js';
import { sendError, ErrorCodes } from '../util/responses.js';
import { getConfig } from '../config.js';
import { logger } from '../util/logger.js';

const rotateKeySchema = z.object({
  newKey: z.string().min(32),
});

const topupMetadataSchema = z.object({
  amount: z.number().positive(),
  note: z.string().optional(),
});

interface RotateKeyRequest {
  newKey: string;
}

interface TopupMetadataRequest {
  amount: number;
  note?: string;
}

/**
 * Middleware to check admin authorization
 */
function checkAdminAuth(request: FastifyRequest, reply: FastifyReply): boolean {
  const config = getConfig();
  const authHeader = request.headers.authorization;
  
  if (!authHeader) {
    sendError(reply, 401, ErrorCodes.UNAUTHORIZED, 'Missing authorization header');
    return false;
  }
  
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (token !== config.ADMIN_TOKEN) {
    sendError(reply, 403, ErrorCodes.FORBIDDEN, 'Invalid admin token');
    return false;
  }
  
  // Check IP allowlist
  const clientIp = request.ip;
  const allowedIps = config.ADMIN_ALLOWED_IPS.split(',').map(ip => ip.trim());
  
  if (!allowedIps.includes(clientIp) && !allowedIps.includes('0.0.0.0')) {
    logger.warn({ clientIp, allowedIps }, 'Admin access denied from unauthorized IP');
    sendError(reply, 403, ErrorCodes.FORBIDDEN, 'IP not authorized for admin access');
    return false;
  }
  
  return true;
}

export async function adminRoutes(fastify: FastifyInstance) {
  // Pause faucet
  fastify.post('/api/admin/pause', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    if (!checkAdminAuth(request, reply)) return;
    
    try {
      const db = getDb();
      db.prepare('UPDATE admin_state SET is_paused = 1, updated_by = ? WHERE id = 1')
        .run('admin');
      
      logger.info('Faucet paused by admin');
      return reply.send({ paused: true });
    } catch (error) {
      logger.error({ error }, 'Failed to pause faucet');
      return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR, 'Failed to pause faucet');
    }
  });
  
  // Resume faucet
  fastify.post('/api/admin/resume', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    if (!checkAdminAuth(request, reply)) return;
    
    try {
      const db = getDb();
      db.prepare('UPDATE admin_state SET is_paused = 0, updated_by = ? WHERE id = 1')
        .run('admin');
      
      logger.info('Faucet resumed by admin');
      return reply.send({ paused: false });
    } catch (error) {
      logger.error({ error }, 'Failed to resume faucet');
      return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR, 'Failed to resume faucet');
    }
  });
  
  // Rotate signing key
  fastify.post('/api/admin/rotate-key', async (
    request: FastifyRequest<{ Body: RotateKeyRequest }>,
    reply: FastifyReply
  ) => {
    if (!checkAdminAuth(request, reply)) return;
    
    try {
      const body = rotateKeySchema.parse(request.body);
      
      // Create new signer with new key
      const newSigner = new LocalPrivateKeySigner(body.newKey);
      const newAddress = newSigner.getAddress();
      
      // Swap the signer
      setSigner(newSigner);
      
      // Record the key rotation event
      const db = getDb();
      db.prepare(`
        INSERT INTO kv (key, value) 
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
      `).run(
        'last_key_rotation',
        JSON.stringify({ timestamp: new Date().toISOString(), newAddress }),
        JSON.stringify({ timestamp: new Date().toISOString(), newAddress })
      );
      
      logger.info({ newAddress }, 'Signing key rotated by admin');
      return reply.send({ 
        success: true, 
        newAddress,
        rotatedAt: new Date().toISOString()
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, ErrorCodes.INVALID_REQUEST, 'Invalid request parameters', error.errors);
      }
      
      logger.error({ error }, 'Failed to rotate key');
      return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR, 'Failed to rotate key');
    }
  });
  
  // Record top-up metadata
  fastify.post('/api/admin/topup', async (
    request: FastifyRequest<{ Body: TopupMetadataRequest }>,
    reply: FastifyReply
  ) => {
    if (!checkAdminAuth(request, reply)) return;
    
    try {
      const body = topupMetadataSchema.parse(request.body);
      const db = getDb();
      
      db.prepare(`
        INSERT INTO kv (key, value) 
        VALUES (?, ?)
      `).run(
        `topup_${Date.now()}`,
        JSON.stringify({
          amount: body.amount,
          note: body.note,
          timestamp: new Date().toISOString(),
        })
      );
      
      logger.info({ amount: body.amount, note: body.note }, 'Top-up metadata recorded by admin');
      return reply.send({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, ErrorCodes.INVALID_REQUEST, 'Invalid request parameters', error.errors);
      }
      
      logger.error({ error }, 'Failed to record top-up');
      return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR, 'Failed to record top-up');
    }
  });
}
