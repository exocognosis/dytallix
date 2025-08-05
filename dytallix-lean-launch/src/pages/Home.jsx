import React from 'react'
import { Link } from 'react-router-dom'
import styles from '../styles/Home.module.css'

const Home = () => {
  return (
    <div className={styles.home}>
      {/* Hero Section */}
      <section className={`${styles.hero} section`}>
        <div className="container">
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              The Future of <span className={styles.highlight}>Post-Quantum</span> Blockchain
            </h1>
            <p className={styles.heroSubtitle}>
              Dytallix combines cutting-edge post-quantum cryptography with AI-enhanced security 
              to create the most secure and intelligent blockchain platform for the quantum era.
            </p>
            <div className={styles.heroActions}>
              <Link to="/faucet" className="btn btn-primary">
                Get Test Tokens
              </Link>
              <Link to="/tech-specs" className="btn btn-outline">
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Key Features</h2>
            <p className="section-subtitle">
              Built for the quantum future with advanced security and AI capabilities
            </p>
          </div>
          
          <div className="grid grid-3">
            <div className="card">
              <div className={styles.featureIcon}>🛡️</div>
              <h3 className={styles.featureTitle}>Post-Quantum Security</h3>
              <p className={styles.featureDescription}>
                Advanced cryptographic algorithms resistant to quantum computer attacks, 
                ensuring your assets remain secure in the quantum era.
              </p>
            </div>
            
            <div className="card">
              <div className={styles.featureIcon}>🤖</div>
              <h3 className={styles.featureTitle}>AI-Enhanced Protection</h3>
              <p className={styles.featureDescription}>
                Machine learning algorithms continuously monitor network activity 
                to detect and prevent anomalous behavior and potential threats.
              </p>
            </div>
            
            <div className="card">
              <div className={styles.featureIcon}>⚡</div>
              <h3 className={styles.featureTitle}>High Performance</h3>
              <p className={styles.featureDescription}>
                Optimized consensus mechanisms and efficient transaction processing 
                deliver enterprise-grade performance without compromising security.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={`${styles.stats} section`}>
        <div className="container">
          <div className="grid grid-2">
            <div className={styles.statItem}>
              <div className={styles.statNumber}>10,000+</div>
              <div className={styles.statLabel}>Transactions Processed</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statNumber}>99.9%</div>
              <div className={styles.statLabel}>Uptime</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statNumber}>256-bit</div>
              <div className={styles.statLabel}>Quantum Resistance</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statNumber}>50ms</div>
              <div className={styles.statLabel}>Average Block Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section">
        <div className="container">
          <div className={styles.cta}>
            <h2 className={styles.ctaTitle}>Ready to Build on Dytallix?</h2>
            <p className={styles.ctaDescription}>
              Join our growing community of developers and start building the future today.
            </p>
            <div className={styles.ctaActions}>
              <Link to="/dev-resources" className="btn btn-primary">
                Developer Resources
              </Link>
              <Link to="/modules" className="btn btn-secondary">
                Try AI Modules
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home