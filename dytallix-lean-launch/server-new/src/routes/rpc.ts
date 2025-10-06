import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getRpcClient } from '../rpc.js';
import { sendError, ErrorCodes } from '../util/responses.js';
import { logger } from '../util/logger.js';

const rpcRequestSchema = z.object({
  method: z.string().min(1),
  params: z.array(z.any()).optional().default([]),
});

interface RpcProxyRequest {
  method: string;
  params?: unknown[];
}

export async function rpcRoutes(fastify: FastifyInstance) {
  fastify.post('/api/rpc', async (
    request: FastifyRequest<{ Body: RpcProxyRequest }>,
    reply: FastifyReply
  ) => {
    try {
      const body = rpcRequestSchema.parse(request.body);
      const rpc = getRpcClient();
      
      try {
        const result = await rpc.call({
          method: body.method,
          params: body.params || [],
        });
        
        if (result.error) {
          return reply.code(400).send({
            code: 'RPC_ERROR',
            message: result.error.message,
            details: result.error,
          });
        }
        
        return reply.send({ result: result.result });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('not allowed')) {
            return sendError(reply, 403, ErrorCodes.RPC_METHOD_NOT_ALLOWED, error.message);
          }
          if (error.message === 'RPC_TIMEOUT') {
            return sendError(reply, 504, ErrorCodes.RPC_TIMEOUT, 'RPC request timed out');
          }
        }
        throw error;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, ErrorCodes.INVALID_REQUEST, 'Invalid request parameters', error.errors);
      }
      
      logger.error({ error }, 'RPC proxy error');
      return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR, 'Internal server error');
    }
  });
}
