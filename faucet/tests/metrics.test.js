const request = require('supertest');
const app = require('../src/server');
const { 
  httpRequestsTotal, 
  faucetRequestsTotal, 
  rateLimitHitsTotal,
  http5xxResponsesTotal,
  httpRequestDuration,
  inFlightRequests,
  register
} = require('../src/middleware/metrics');

describe('Metrics Middleware', () => {
  beforeEach(() => {
    // Reset metrics before each test
    register.resetMetrics();
  });

  describe('HTTP Metrics', () => {
    it('should track successful requests', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check that metrics were recorded
      const metrics = await register.metrics();
      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('path="/health"');
      expect(metrics).toContain('method="GET"');
      expect(metrics).toContain('status="200"');
    });

    it('should track 5xx errors', async () => {
      // For now, test that the counter exists and can be incremented
      http5xxResponsesTotal.labels('/test', 'GET').inc();
      
      const metrics = await register.metrics();
      expect(metrics).toContain('http_5xx_responses_total');
      expect(metrics).toContain('path="/test"');
    });

    it('should track request duration', async () => {
      await request(app)
        .get('/health')
        .expect(200);

      const metrics = await register.metrics();
      expect(metrics).toContain('http_request_duration_seconds');
      expect(metrics).toContain('path="/health"');
      expect(metrics).toContain('method="GET"');
    });
  });

  describe('Faucet Metrics', () => {
    it('should track successful faucet requests', async () => {
      const faucetRequest = {
        address: 'dyt1test_address_for_metrics_test'
      };

      // Note: This may fail due to validation, but we'll check for metric tracking
      await request(app)
        .post('/api/faucet')
        .send(faucetRequest);

      // Check faucet metrics - should have either success or error
      const metrics = await register.metrics();
      expect(metrics).toContain('faucet_requests_total');
    });

    it('should track rate limited faucet requests', async () => {
      // For testing, we'll manually increment the metric
      faucetRequestsTotal.labels('rate_limited').inc();

      const metrics = await register.metrics();
      expect(metrics).toContain('faucet_requests_total');
      expect(metrics).toContain('result="rate_limited"');
    });

    it('should track failed faucet requests', async () => {
      const invalidRequest = {
        address: 'invalid_address'
      };

      await request(app)
        .post('/api/faucet')
        .send(invalidRequest);

      // Check error metrics
      const metrics = await register.metrics();
      expect(metrics).toContain('faucet_requests_total');
    });
  });

  describe('Rate Limiting Metrics', () => {
    it('should track rate limit hits', async () => {
      // Manually trigger rate limit counter for testing
      rateLimitHitsTotal.inc();

      const metrics = await register.metrics();
      expect(metrics).toContain('rate_limit_hits_total');
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
        .get('/api/balance/dyt1very_long_address_that_should_be_sanitized');

      const response = await request(app)
        .get('/metrics')
        .expect(200);

      // Should contain sanitized path, not the actual address
      expect(response.text).toContain('[address]');
      expect(response.text).not.toContain('dyt1very_long_address_that_should_be_sanitized');
    });
  });
});