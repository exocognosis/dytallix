import request from 'supertest';
import express from 'express';
import faucetRouter from '../../src/routes/faucet';

const app = express();
app.use(express.json());
app.use('/api/faucet', faucetRouter);

describe('Faucet Controller', () => {
  it('dispenses two tokens', async () => {
    const res = await request(app).post('/api/faucet/dispense').send({ address: '0x1111111111111111111111111111111111111111', tokens: [ { symbol: 'TOKENA', amount: '10' }, { symbol: 'TOKENB', amount: '5' } ] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.dispensed).toHaveLength(2);
  });
});