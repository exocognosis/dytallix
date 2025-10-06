import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getRpcClient } from '../rpc.js';
// import { getSigner } from '../signer/index.js'; // TODO: use for server-signed transactions
import { sendError, ErrorCodes } from '../util/responses.js';
import { isValidAddress } from '../util/validators.js';
import { logger } from '../util/logger.js';

const contractCallSchema = z.object({
  address: z.string().min(1),
  method: z.string().min(1),
  params: z.array(z.any()).optional().default([]),
});

const contractSendSchema = z.object({
  address: z.string().min(1),
  method: z.string().min(1),
  params: z.array(z.any()).optional().default([]),
  value: z.string().optional().default('0'),
});

interface ContractCallRequest {
  address: string;
  method: string;
  params?: unknown[];
}

interface ContractSendRequest extends ContractCallRequest {
  value?: string;
}

export async function contractsRoutes(fastify: FastifyInstance) {
  // Read-only contract call
  fastify.post('/api/contracts/call', async (
    request: FastifyRequest<{ Body: ContractCallRequest }>,
    reply: FastifyReply
  ) => {
    try {
      const body = contractCallSchema.parse(request.body);
      
      if (!isValidAddress(body.address)) {
        return sendError(reply, 400, ErrorCodes.INVALID_ADDRESS, 'Invalid contract address');
      }
      
      const rpc = getRpcClient();
      
      // Encode call data (simplified - in production, use proper ABI encoding)
      const callData = '0x'; // TODO: implement proper method encoding
      
      const result = await rpc.call({
        method: 'eth_call',
        params: [
          {
            to: body.address,
            data: callData,
          },
          'latest',
        ],
      });
      
      if (result.error) {
        return sendError(reply, 400, ErrorCodes.RPC_ERROR, result.error.message);
      }
      
      return reply.send({ result: result.result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, ErrorCodes.INVALID_REQUEST, 'Invalid request parameters', error.errors);
      }
      
      logger.error({ error }, 'Contract call error');
      return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR, 'Internal server error');
    }
  });
  
  // State-changing contract transaction (server signs)
  fastify.post('/api/contracts/send', async (
    request: FastifyRequest<{ Body: ContractSendRequest }>,
    reply: FastifyReply
  ) => {
    try {
      const body = contractSendSchema.parse(request.body);
      
      if (!isValidAddress(body.address)) {
        return sendError(reply, 400, ErrorCodes.INVALID_ADDRESS, 'Invalid contract address');
      }
      
      // Server-signed contract calls require special authorization
      // For now, return 403 as this is a sensitive operation
      logger.warn({ address: body.address, method: body.method }, 'Contract send attempted (not authorized)');
      return sendError(
        reply,
        403,
        ErrorCodes.FORBIDDEN,
        'Server-signed contract transactions require explicit authorization'
      );
      
      // TODO: Implement proper authorization and transaction signing
      /*
      const signer = getSigner();
      const rpc = getRpcClient();
      
      const tx = {
        to: body.address,
        value: body.value || '0',
        data: callData,
        nonce: await getNonce(signer.getAddress()),
        gasLimit: '100000',
        gasPrice: '1000000000',
        chainId: config.CHAIN_ID,
      };
      
      const signedTx = await signer.signTransaction(tx);
      const txHash = await rpc.sendRawTransaction(signedTx.raw);
      
      return reply.send({ txHash });
      */
    } catch (error) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, ErrorCodes.INVALID_REQUEST, 'Invalid request parameters', error.errors);
      }
      
      logger.error({ error }, 'Contract send error');
      return sendError(reply, 500, ErrorCodes.INTERNAL_ERROR, 'Internal server error');
    }
  });
}
