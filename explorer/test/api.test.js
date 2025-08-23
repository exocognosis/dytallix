const request = require('supertest');
const app = require('../src/server');

describe('Dytallix Explorer API Extensions', () => {
  // Governance API Tests
  describe('Governance API', () => {
    test('GET /api/governance/proposals should return proposals list', async () => {
      const response = await request(app)
        .get('/api/governance/proposals')
        .expect(200);
      
      expect(response.body).toHaveProperty('proposals');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('activeProposals');
      expect(Array.isArray(response.body.proposals)).toBe(true);
    });

    test('POST /api/governance should create a new proposal', async () => {
      const proposalData = {
        title: 'Test Proposal Creation',
        description: 'This is a test proposal for unit testing',
        submitter: 'dyt1tester123'
      };

      const response = await request(app)
        .post('/api/governance')
        .send(proposalData)
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(proposalData.title);
      expect(response.body.description).toBe(proposalData.description);
      expect(response.body.submitter).toBe(proposalData.submitter);
      expect(response.body.status).toBe('pending');
    });

    test('GET /api/governance/proposals/:id should return specific proposal', async () => {
      // First create a proposal
      const proposalData = {
        title: 'Test Proposal for Retrieval',
        description: 'This proposal is for testing retrieval',
        submitter: 'dyt1tester456'
      };

      const createResponse = await request(app)
        .post('/api/governance')
        .send(proposalData)
        .expect(201);

      const proposalId = createResponse.body.id;

      // Then retrieve it
      const response = await request(app)
        .get(`/api/governance/proposals/${proposalId}`)
        .expect(200);
      
      expect(response.body.id).toBe(proposalId);
      expect(response.body.title).toBe(proposalData.title);
    });

    test('POST /api/governance/proposals/:id/vote should cast a vote', async () => {
      // First create a proposal
      const proposalData = {
        title: 'Test Proposal for Voting',
        description: 'This proposal is for testing voting',
        submitter: 'dyt1tester789'
      };

      const createResponse = await request(app)
        .post('/api/governance')
        .send(proposalData)
        .expect(201);

      const proposalId = createResponse.body.id;

      // Then vote on it
      const voteData = {
        voter: 'dyt1voter123',
        option: 'yes'
      };

      const response = await request(app)
        .post(`/api/governance/proposals/${proposalId}/vote`)
        .send(voteData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.proposal.votes.yes).toBe(1);
    });
  });

  // Contracts API Tests
  describe('Contracts API', () => {
    test('GET /api/contracts should return contracts list', async () => {
      const response = await request(app)
        .get('/api/contracts')
        .expect(200);
      
      expect(response.body).toHaveProperty('contracts');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.contracts)).toBe(true);
    });

    test('POST /api/contracts/deploy should deploy a contract', async () => {
      const deploymentData = {
        sourceCode: 'contract TestContract { function test() public { } }',
        initMsg: { owner: 'dyt1owner123' },
        from: 'dyt1deployer123'
      };

      const response = await request(app)
        .post('/api/contracts/deploy')
        .send(deploymentData)
        .expect(201);
      
      expect(response.body).toHaveProperty('address');
      expect(response.body).toHaveProperty('gasUsed');
      expect(response.body).toHaveProperty('txHash');
      expect(response.body.address).toMatch(/^dyt1contract/);
    });

    test('POST /api/contracts/:address/execute should execute contract', async () => {
      // First deploy a contract
      const deploymentData = {
        sourceCode: 'contract TestContract { function test() public { } }',
        initMsg: { owner: 'dyt1owner123' },
        from: 'dyt1deployer123'
      };

      const deployResponse = await request(app)
        .post('/api/contracts/deploy')
        .send(deploymentData)
        .expect(201);

      const contractAddress = deployResponse.body.address;

      // Then execute it
      const executionData = {
        execMsg: { action: 'test' },
        from: 'dyt1executor123'
      };

      const response = await request(app)
        .post(`/api/contracts/${contractAddress}/execute`)
        .send(executionData)
        .expect(200);
      
      expect(response.body).toHaveProperty('result');
      expect(response.body).toHaveProperty('gasUsed');
      expect(response.body).toHaveProperty('txHash');
    });

    test('GET /api/contracts/:address/state should return contract state', async () => {
      // First deploy a contract
      const deploymentData = {
        sourceCode: 'contract TestContract { function test() public { } }',
        initMsg: { owner: 'dyt1owner123' },
        from: 'dyt1deployer123'
      };

      const deployResponse = await request(app)
        .post('/api/contracts/deploy')
        .send(deploymentData)
        .expect(201);

      const contractAddress = deployResponse.body.address;

      // Then get its state
      const response = await request(app)
        .get(`/api/contracts/${contractAddress}/state`)
        .expect(200);
      
      expect(response.body).toHaveProperty('address');
      expect(response.body).toHaveProperty('state');
      expect(response.body.address).toBe(contractAddress);
    });
  });

  // Accounts API Tests
  describe('Accounts API', () => {
    test('GET /api/accounts/:addr should return account details', async () => {
      const testAddress = 'dyt1testaccount123';

      const response = await request(app)
        .get(`/api/accounts/${testAddress}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('address');
      expect(response.body).toHaveProperty('balances');
      expect(response.body).toHaveProperty('staking');
      expect(response.body).toHaveProperty('txCount');
      expect(response.body.address).toBe(testAddress);
      expect(response.body.balances).toHaveProperty('DGT');
      expect(response.body.balances).toHaveProperty('DRT');
      expect(response.body.staking).toHaveProperty('staked');
      expect(response.body.staking).toHaveProperty('pendingRewards');
      expect(response.body.staking).toHaveProperty('apr');
    });

    test('GET /api/accounts/:addr with invalid address should return error', async () => {
      const response = await request(app)
        .get('/api/accounts/invalidaddress')
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INVALID_ADDRESS');
    });
  });

  // Enhanced Transactions API Tests
  describe('Enhanced Transactions API', () => {
    test('GET /api/transactions should include AI risk scores', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .expect(200);
      
      expect(response.body).toHaveProperty('transactions');
      expect(Array.isArray(response.body.transactions)).toBe(true);
      
      if (response.body.transactions.length > 0) {
        const transaction = response.body.transactions[0];
        expect(transaction).toHaveProperty('ai_risk_score');
        expect(transaction).toHaveProperty('gasUsed');
        expect(typeof transaction.ai_risk_score).toBe('number');
        expect(transaction.ai_risk_score).toBeGreaterThanOrEqual(0);
        expect(transaction.ai_risk_score).toBeLessThanOrEqual(1);
      }
    });
  });
});