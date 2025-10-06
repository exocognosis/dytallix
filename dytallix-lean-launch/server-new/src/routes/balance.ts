import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getRpcClient } from '../rpc.js';
import { sendError } from '../util/responses.js';
import { isValidAddress } from '../util/validators.js';
import { logger } from '../util/logger.js';

const balanceQuerySchema = z.object({
  address: z.string().min(1),
});

interface BalanceQuery {
  address: string;
}

export async function balanceRoutes(fastify: FastifyInstance) {
  fastify.get('/api/balance', async (
    request: FastifyRequest<{ Querystring: BalanceQuery }>,
    reply: FastifyReply
  ) => {
    try {
      const query = balanceQuerySchema.parse(request.query);
      
      if (!isValidAddress(query.address)) {
        return sendError(reply, 400, 'INVALID_ADDRESS', 'Invalid address format');
      }
      
      const rpc = getRpcClient();
      const balance = await rpc.getBalance(query.address);
      
      return reply.send({ balance });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, 'INVALID_REQUEST', 'Invalid request parameters', error.errors);
      }
      
      logger.error({ error }, 'Balance endpoint error');
      return sendError(reply, 500, 'INTERNAL_ERROR', 'Failed to get balance');
    }
  });
}
