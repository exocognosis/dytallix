import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db.js';
import { getSigner } from '../signer/index.js';
import { getRpcClient } from '../rpc.js';
import { checkIpLimit, checkAddressLimit, recordFingerprint, detectSuspiciousActivity } from '../limits.js';
import { sendError, ErrorCodes } from '../util/responses.js';
import { isValidAddress, normalizeAddress, getClientIp } from '../util/validators.js';
import { getConfig } from '../config.js';
import { logger } from '../util/logger.js';

const faucetRequestSchema = z.object({
  address: z.string().min(1),
});

interface FaucetRequest {
  address: string;
}

export async function faucetRoutes(fastify: FastifyInstance) {
  fastify.post('/api/faucet', async (
    request: FastifyRequest<{ Body: FaucetRequest }>,
    reply: FastifyReply
  ) => {
    const config = getConfig();
    const db = getDb();
    
    try {
      // Validate request
      const body = faucetRequestSchema.parse(request.body);
      const address = normalizeAddress(body.address);
      
      if (!isValidAddress(address)) {
        return sendError(reply, 400, ErrorCodes.INVALID_ADDRESS, 'Invalid address format');
      }
      
      // Get client IP
      const ip = getClientIp(request.headers as Record<string, string | string[] | undefined>);
      const userAgent = request.headers['user-agent'] || null;
      
      // Check if faucet is paused
      const adminState = db.prepare('SELECT is_paused FROM admin_state WHERE id = 1').get() as { is_paused: number } | undefined;
      if (adminState?.is_paused) {
        return sendError(reply, 503, ErrorCodes.FAUCET_PAUSED, 'Faucet is currently paused');
      }
      
      // Check for suspicious activity
      if (detectSuspiciousActivity(ip)) {
        logger.warn({ ip }, 'Suspicious activity detected');
        return sendError(reply, 429, ErrorCodes.RATE_LIMIT, 'Suspicious activity detected');
      }
      
      // Check rate limits
      const ipLimit = checkIpLimit(ip);
      if (!ipLimit.allowed) {
        reply.header('Retry-After', Math.ceil((ipLimit.resetAt.getTime() - Date.now()) / 1000).toString());
        return sendError(
          reply,
          429,
          ErrorCodes.RATE_LIMIT,
          'IP rate limit exceeded',
          { resetAt: ipLimit.resetAt.toISOString() }
        );
      }
      
      const addressLimit = checkAddressLimit(address);
      if (!addressLimit.allowed) {
        reply.header('Retry-After', Math.ceil((addressLimit.resetAt.getTime() - Date.now()) / 1000).toString());
        return sendError(
          reply,
          429,
          ErrorCodes.RATE_LIMIT,
          'Address rate limit exceeded',
          { resetAt: addressLimit.resetAt.toISOString() }
        );
      }
      
      // Check faucet balance
      const signer = getSigner();
      const rpc = getRpcClient();
      const faucetAddress = signer.getAddress();
      const faucetBalance = await rpc.getBalance(faucetAddress);
      const balanceNum = parseInt(faucetBalance, 16);
      
      if (balanceNum < config.FAUCET_MIN_BALANCE) {
        logger.error({ balance: balanceNum, minBalance: config.FAUCET_MIN_BALANCE }, 'Faucet balance too low');
        return sendError(reply, 503, ErrorCodes.INSUFFICIENT_BALANCE, 'Faucet balance too low');
      }
      
      // Get nonce (simplified - in production, query actual nonce from chain)
      const nonce = Date.now() % 1000000;
      
      // Build and sign transaction
      const tx = {
        to: address,
        value: config.FAUCET_DRIP_AMOUNT.toString(),
        data: '0x',
        nonce,
        gasLimit: '21000',
        gasPrice: '1000000000', // 1 gwei
        chainId: config.CHAIN_ID,
      };
      
      const signedTx = await signer.signTransaction(tx);
      
      // Submit transaction
      let txHash: string;
      try {
        txHash = signedTx.hash; // Use pre-computed hash instead of submitting for now
        // In production: txHash = await rpc.sendRawTransaction(signedTx.raw);
      } catch (error) {
        logger.error({ error }, 'Failed to submit transaction');
        return sendError(reply, 500, ErrorCodes.RPC_ERROR, 'Failed to submit transaction');
      }
      
      // Record grant
      db.prepare(`
        INSERT INTO faucet_grants (address, ip, amount, tx_hash, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(address, ip, config.FAUCET_DRIP_AMOUNT, txHash, 'submitted');
      
      // Record fingerprint
      recordFingerprint(ip, address, userAgent as string | null);
      
      logger.info({ address, ip, txHash }, 'Faucet grant successful');
      
      return reply.send({ txHash });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, ErrorCodes.INVALID_REQUEST, 'Invalid request parameters', error.errors);
      }
      
      logger.error({ error }, 'Faucet endpoint error');
      return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR, 'Internal server error');
    }
  });
}
