import request from 'supertest';
import express from 'express';
import faucetRouter from '../../src/routes/faucet';

const app = express();
app.use(express.json());
app.use('/api/faucet', faucetRouter);

describe('Faucet Controller Comprehensive Tests', () => {
  it('dispenses two tokens successfully', async () => {
    const res = await request(app)
      .post('/api/faucet/dispense')
      .send({ 
        address: '0x1111111111111111111111111111111111111111', 
        tokens: [ 
          { symbol: 'TOKENA', amount: '10' }, 
          { symbol: 'TOKENB', amount: '5' } 
        ] 
      });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.dispensed).toHaveLength(2);
    expect(res.body.dispensed[0].symbol).toBe('TOKENA');
    expect(res.body.dispensed[0].amount).toBe('10');
    expect(res.body.dispensed[1].symbol).toBe('TOKENB');
    expect(res.body.dispensed[1].amount).toBe('5');
    expect(res.body.cooldowns).toBeDefined();
    expect(res.body.message).toBe('Dispense successful.');
  });

  it('returns INVALID_ADDRESS error for malformed address', async () => {
    const res = await request(app)
      .post('/api/faucet/dispense')
      .send({ 
        address: 'invalid-address', 
        tokens: [{ symbol: 'TOKENA', amount: '10' }] 
      });
    
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FAUCET_INVALID_ADDRESS');
    expect(res.body.error.message).toBe('Address format is invalid.');
  });

  it('returns UNSUPPORTED_TOKEN error for unknown token', async () => {
    const res = await request(app)
      .post('/api/faucet/dispense')
      .send({ 
        address: '0x2222222222222222222222222222222222222222', 
        tokens: [{ symbol: 'UNKNOWN_TOKEN', amount: '10' }] 
      });
    
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FAUCET_UNSUPPORTED_TOKEN');
    expect(res.body.error.details.symbol).toBe('UNKNOWN_TOKEN');
  });

  it('returns DUPLICATE_SYMBOL error for duplicate tokens', async () => {
    const res = await request(app)
      .post('/api/faucet/dispense')
      .send({ 
        address: '0x3333333333333333333333333333333333333333', 
        tokens: [
          { symbol: 'TOKENA', amount: '10' },
          { symbol: 'TOKENA', amount: '5' }
        ] 
      });
    
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FAUCET_DUPLICATE_SYMBOL');
    expect(res.body.error.details.symbol).toBe('TOKENA');
  });

  it('returns AMOUNT_INVALID error for excessive amounts', async () => {
    const res = await request(app)
      .post('/api/faucet/dispense')
      .send({ 
        address: '0x4444444444444444444444444444444444444444', 
        tokens: [{ symbol: 'TOKENA', amount: '1000' }] // exceeds maxPerRequest of 100
      });
    
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FAUCET_AMOUNT_INVALID');
    expect(res.body.error.details.symbol).toBe('TOKENA');
  });

  it('returns COOLDOWN_ACTIVE error for repeated requests', async () => {
    const address = '0x5555555555555555555555555555555555555555';
    
    // First request should succeed
    const res1 = await request(app)
      .post('/api/faucet/dispense')
      .send({ 
        address, 
        tokens: [{ symbol: 'TOKENA', amount: '10' }] 
      });
    
    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);

    // Second request should fail due to cooldown
    const res2 = await request(app)
      .post('/api/faucet/dispense')
      .send({ 
        address, 
        tokens: [{ symbol: 'TOKENA', amount: '10' }] 
      });
    
    expect(res2.status).toBe(429);
    expect(res2.body.success).toBe(false);
    expect(res2.body.error.code).toBe('FAUCET_COOLDOWN_ACTIVE');
    expect(res2.body.error.details.blocked).toBeDefined();
    expect(res2.body.error.details.blocked[0].symbol).toBe('TOKENA');
  });

  it('enforces rate limiting per IP', async () => {
    // Make multiple requests quickly to trigger rate limit
    const requests = [];
    for (let i = 0; i < 12; i++) {
      requests.push(
        request(app)
          .post('/api/faucet/dispense')
          .send({ 
            address: `0x${(6666 + i).toString().padStart(40, '0')}`, 
            tokens: [{ symbol: 'TOKENB', amount: '5' }] 
          })
      );
    }

    const responses = await Promise.all(requests);
    
    // First few should succeed, later ones should be rate limited
    const successCount = responses.filter(res => res.status === 200).length;
    const rateLimitedCount = responses.filter(res => res.status === 429 && res.body.error.code === 'FAUCET_RATE_LIMIT_IP').length;
    
    expect(successCount).toBeLessThan(12);
    expect(rateLimitedCount).toBeGreaterThan(0);
  });
});