import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getRpcClient } from '../rpc.js';
import { getSigner } from '../signer/index.js';
import { sendError } from '../util/responses.js';
import { logger } from '../util/logger.js';

interface StatusResponse {
  api: string;
  height: number;
  nodeSyncLag: number;
  faucetBalance: string;
  mempoolBacklog: number;
  timestamp: string;
}

export async function statusRoutes(fastify: FastifyInstance) {
  fastify.get('/api/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const rpc = getRpcClient();
      const signer = getSigner();
      
      // Get block height
      let height = 0;
      try {
        height = await rpc.getBlockNumber();
      } catch (error) {
        logger.warn({ error }, 'Failed to get block number');
      }
      
      // Get faucet balance
      let faucetBalance = '0';
      try {
        const address = signer.getAddress();
        faucetBalance = await rpc.getBalance(address);
      } catch (error) {
        logger.warn({ error }, 'Failed to get faucet balance');
      }
      
      const response: StatusResponse = {
        api: 'ok',
        height,
        nodeSyncLag: 0, // TODO: implement actual sync lag detection
        faucetBalance,
        mempoolBacklog: 0, // TODO: implement mempool query
        timestamp: new Date().toISOString(),
      };
      
      return reply.send(response);
    } catch (error) {
      logger.error({ error }, 'Status endpoint error');
      return sendError(reply, 500, 'INTERNAL_ERROR', 'Failed to get status');
    }
  });
}
