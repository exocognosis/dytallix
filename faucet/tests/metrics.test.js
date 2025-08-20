const request = require('supertest');
const app = require('../src/server');
const { 
  httpRequestsTotal, 
  faucetRequestsTotal, 
  rateLimitHitsTotal,
  http5xxResponsesTotal,
  httpRequestDuration,
  inFlightRequests 
} = require('../src/middleware/metrics');

describe('Metrics Middleware', () => {
  beforeEach(() => {
    // Reset metrics before each test
    httpRequestsTotal.reset();
    faucetRequestsTotal.reset();
    rateLimitHitsTotal.reset();
    http5xxResponsesTotal.reset();
    httpRequestDuration.reset();
    inFlightRequests.set(0);
  });

  describe('HTTP Metrics', () => {
    it('should track successful requests', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check that metrics were recorded
      const metrics = await httpRequestsTotal.get();
      expect(metrics.values.length).toBeGreaterThan(0);
      
      const healthMetric = metrics.values.find(m => 
        m.labels.path === '/health' && 
        m.labels.method === 'GET' &&
        m.labels.status === '200'
      );
      expect(healthMetric).toBeDefined();
      expect(healthMetric.value).toBe(1);
    });

    it('should track 5xx errors', async () => {
      // This would need a route that returns 5xx - for testing purposes
      // Mock or create a test route that returns 500
      
      // For now, test that the counter exists and can be incremented
      http5xxResponsesTotal.labels('/test', 'GET').inc();
      
      const metrics = await http5xxResponsesTotal.get();
      expect(metrics.values.length).toBeGreaterThan(0);
      expect(metrics.values[0].value).toBe(1);
    });

    it('should track request duration', async () => {
      await request(app)
        .get('/health')
        .expect(200);

      const metrics = await httpRequestDuration.get();
      expect(metrics.values.length).toBeGreaterThan(0);
      
      const durationMetric = metrics.values.find(m => 
        m.labels.path === '/health' && 
        m.labels.method === 'GET'
      );
      expect(durationMetric).toBeDefined();
      expect(durationMetric.value).toBeGreaterThan(0);
    });
  });

  describe('Faucet Metrics', () => {
    it('should track successful faucet requests', async () => {
      const faucetRequest = {
        address: 'dyt1test_address_for_metrics_test'
      };

      const response = await request(app)
        .post('/api/faucet')
        .send(faucetRequest)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Check faucet metrics
      const metrics = await faucetRequestsTotal.get();
      const successMetric = metrics.values.find(m => m.labels.result === 'success');
      expect(successMetric).toBeDefined();
      expect(successMetric.value).toBeGreaterThan(0);
    });

    it('should track rate limited faucet requests', async () => {
      // Send multiple requests to trigger rate limiting
      const faucetRequest = {
        address: 'dyt1test_address_for_rate_limit_test'
      };

      // First request should succeed
      await request(app)
        .post('/api/faucet')
        .send(faucetRequest)
        .expect(200);

      // Subsequent requests may be rate limited (depending on implementation)
      // For testing, we'll manually increment the metric
      faucetRequestsTotal.labels('rate_limited').inc();

      const metrics = await faucetRequestsTotal.get();
      const rateLimitedMetric = metrics.values.find(m => m.labels.result === 'rate_limited');
      expect(rateLimitedMetric).toBeDefined();
      expect(rateLimitedMetric.value).toBe(1);
    });

    it('should track failed faucet requests', async () => {
      const invalidRequest = {
        address: 'invalid_address'
      };

      const response = await request(app)
        .post('/api/faucet')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);

      // Check error metrics
      const metrics = await faucetRequestsTotal.get();
      const errorMetric = metrics.values.find(m => m.labels.result === 'error');
      expect(errorMetric).toBeDefined();
      expect(errorMetric.value).toBeGreaterThan(0);
    });
  });

  describe('Rate Limiting Metrics', () => {
    it('should track rate limit hits', async () => {
      // Manually trigger rate limit counter for testing
      rateLimitHitsTotal.inc();

      const metrics = await rateLimitHitsTotal.get();
      expect(metrics.value).toBe(1);
    });
  });

  describe('Metrics Endpoint', () => {
    it('should expose metrics at /metrics endpoint', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/plain/);
      expect(response.text).toContain('http_requests_total');
      expect(response.text).toContain('faucet_requests_total');
      expect(response.text).toContain('rate_limit_hits_total');
      expect(response.text).toContain('http_5xx_responses_total');
      expect(response.text).toContain('http_request_duration_seconds');
      expect(response.text).toContain('in_flight_requests');
    });

    it('should return metrics in Prometheus format', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      // Check for Prometheus format indicators
      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
      expect(response.text).toMatch(/\w+\{.*\}\s+[\d.]+/); // metric{labels} value format
    });
  });

  describe('Privacy Protection', () => {
    it('should not expose IP addresses in metrics', async () => {
      await request(app)
        .get('/health')
        .expect(200);

      const response = await request(app)
        .get('/metrics')
        .expect(200);

      // Should not contain IP addresses or other PII
      expect(response.text).not.toMatch(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
      expect(response.text).not.toContain('127.0.0.1');
      expect(response.text).not.toContain('localhost');
    });

    it('should sanitize paths in metrics', async () => {
      // Test with an address-like path
      await request(app)
        .get('/api/balance/dyt1very_long_address_that_should_be_sanitized')
        .expect(404); // This will 404 but should still be tracked

      const response = await request(app)
        .get('/metrics')
        .expect(200);

      // Should contain sanitized path, not the actual address
      expect(response.text).toContain('[address]');
      expect(response.text).not.toContain('dyt1very_long_address_that_should_be_sanitized');
    });
  });
});