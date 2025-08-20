import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

const NotFound = () => {
  const headingRef = useRef(null)

  // Focus management for accessibility
  useEffect(() => {
    if (headingRef.current) {
      headingRef.current.focus()
    }
  }, [])

  return (
    <div className="section">
      <div className="container">
        <div className="section-header" style={{ textAlign: 'center', paddingTop: '40px' }}>
          <h1 
            ref={headingRef} 
            className="section-title" 
            tabIndex="-1"
            style={{ marginBottom: '16px' }}
          >
            Page Not Found
          </h1>
          <p className="section-subtitle" style={{ maxWidth: '600px', margin: '0 auto 32px' }}>
            Sorry, the page you're looking for doesn't exist. This could be due to a mistyped URL 
            or the page may have been moved or deleted.
          </p>
          <p className="muted" style={{ fontSize: '1.1rem', marginBottom: '40px' }}>
            Dytallix is a next-generation post-quantum blockchain platform with AI-enhanced security 
            and smart contract capabilities, designed for the quantum era.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', maxWidth: '500px', margin: '0 auto' }}>
          {/* Primary action */}
          <Link 
            to="/" 
            className="btn btn-primary"
            style={{ 
              fontSize: '1.1rem', 
              padding: '12px 24px',
              textDecoration: 'none',
              display: 'inline-block'
            }}
          >
            Return Home
          </Link>

          {/* Secondary navigation */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link 
              to="/tech-stack" 
              className="btn btn-secondary"
              style={{ textDecoration: 'none' }}
            >
              Tech Stack
            </Link>
            <Link 
              to="/roadmap" 
              className="btn btn-secondary"
              style={{ textDecoration: 'none' }}
            >
              Roadmap
            </Link>
          </div>

          {/* Helpful links */}
          <div className="card" style={{ width: '100%', textAlign: 'center', marginTop: '24px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px' }}>
              Popular Destinations
            </h2>
            <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <Link to="/faucet" className="muted" style={{ textDecoration: 'none', padding: '8px' }}>
                🚰 Faucet - Get test tokens
              </Link>
              <Link to="/wallet" className="muted" style={{ textDecoration: 'none', padding: '8px' }}>
                👛 Wallet - Manage assets
              </Link>
              <Link to="/explorer" className="muted" style={{ textDecoration: 'none', padding: '8px' }}>
                🔍 Explorer - View transactions
              </Link>
              <Link to="/dev-resources" className="muted" style={{ textDecoration: 'none', padding: '8px' }}>
                📚 Documentation - Developer resources
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFound