// Provide a global replacer for BigInt serialization
(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

import Fastify from 'fastify';
import cors from '@fastify/cors';
import authRoutes from './routes/auth';
import merchantsRoutes from './routes/merchants';
import intentsRoutes from './routes/intents';
import onrampRoutes from './routes/onramp';
import offrampRoutes from './routes/offramp';
import payoutsRoutes from './routes/payouts';
import eventsRoutes from './routes/events';
import bankAccountRoutes from './routes/bankAccounts';
import walletRoutes from './routes/wallets';

const server = Fastify({ logger: true });

server.register(cors);

// Register routes
server.register(authRoutes, { prefix: '/v1/auth' });
server.register(merchantsRoutes, { prefix: '/v1/merchants' });
server.register(intentsRoutes, { prefix: '/v1/payment_intents' });
server.register(onrampRoutes, { prefix: '/v1/onramp' });
server.register(offrampRoutes, { prefix: '/v1/offramp' });
server.register(payoutsRoutes, { prefix: '/v1/payouts' });
server.register(eventsRoutes, { prefix: '/v1/events' });
server.register(bankAccountRoutes, { prefix: '/v1/bank-accounts' });
server.register(walletRoutes, { prefix: '/v1/wallets' });

server.get('/health', async () => ({ status: 'ok' }));

const start = async () => {
    try {
        const port = parseInt(process.env.PORT || '3010', 10);
        await server.listen({ port, host: '0.0.0.0' });
        console.log(`Server listening on http://localhost:${port}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
