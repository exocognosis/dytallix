/// <reference types="cypress" />

describe('Anomaly Endpoint', () => {
  it('should return status 200 and valid JSON structure', () => {
    // Make request to anomaly endpoint
    cy.request('/anomaly').then((response) => {
      // Assert status 200
      expect(response.status).to.eq(200)
      
      // Assert response is JSON
      expect(response.headers).to.have.property('content-type')
      expect(response.headers['content-type']).to.include('application/json')
      
      // Assert JSON structure has required fields
      expect(response.body).to.have.property('timestamp')
      expect(response.body).to.have.property('anomalies')
      
      // Verify timestamp is a valid ISO string
      expect(response.body.timestamp).to.be.a('string')
      const timestamp = new Date(response.body.timestamp)
      expect(timestamp.getTime()).to.not.be.NaN
      
      // Verify anomalies is an array
      expect(response.body.anomalies).to.be.an('array')
    })
  })

  it('should have consistent response structure across multiple calls', () => {
    // Make multiple requests to ensure consistency
    const requests = Array.from({ length: 3 }, () => cy.request('/anomaly'))
    
    Promise.all(requests).then((responses) => {
      responses.forEach((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.all.keys(['ok', 'timestamp', 'anomalies', 'status'])
        expect(response.body.anomalies).to.be.an('array')
      })
    })
  })

  it('should return recent timestamp', () => {
    cy.request('/anomaly').then((response) => {
      const responseTime = new Date(response.body.timestamp)
      const now = new Date()
      const timeDiff = Math.abs(now.getTime() - responseTime.getTime())
      
      // Timestamp should be within last 5 seconds
      expect(timeDiff).to.be.lessThan(5000)
    })
  })

  it('should handle CORS properly', () => {
    // Request from allowed origin should work
    cy.request({
      method: 'GET',
      url: '/anomaly',
      headers: {
        'Origin': 'http://localhost:5173'
      }
    }).then((response) => {
      expect(response.status).to.eq(200)
    })
  })

  it('should be accessible for monitoring systems', () => {
    // Test that the endpoint is suitable for automated monitoring
    cy.request('/anomaly').then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body.ok).to.be.a('boolean')
      expect(response.body.status).to.be.a('string')
      
      // Should complete within reasonable time (< 2 seconds)
      expect(response.duration).to.be.lessThan(2000)
    })
  })
})