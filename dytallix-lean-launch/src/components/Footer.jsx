import React from 'react'
import { Link } from 'react-router-dom'
import styles from '../styles/Footer.module.css'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerContent}>
          <div className={styles.footerSection}>
            <h3 className={styles.footerTitle}>Dytallix</h3>
            <p className={styles.footerDescription}>
              Next-generation post-quantum blockchain with AI-enhanced security and smart contract capabilities.
            </p>
          </div>

          <div className={styles.footerSection}>
            <h4 className={styles.footerSubtitle}>Platform</h4>
            <ul className={styles.footerLinks}>
              <li><Link to="/faucet" className={styles.footerLink}>Faucet</Link></li>
              <li><Link to="/tech-specs" className={styles.footerLink}>Tech Specs</Link></li>
              <li><Link to="/modules" className={styles.footerLink}>AI Modules</Link></li>
              <li><Link to="/roadmap" className={styles.footerLink}>Roadmap</Link></li>
            </ul>
          </div>

          <div className={styles.footerSection}>
            <h4 className={styles.footerSubtitle}>Resources</h4>
            <ul className={styles.footerLinks}>
              <li><a href="https://github.com/dytallix" className={styles.footerLink}>GitHub</a></li>
              <li><a href="https://discord.gg/dytallix" className={styles.footerLink}>Discord</a></li>
              <li><a href="/docs" className={styles.footerLink}>Documentation</a></li>
              <li><Link to="/dev-resources" className={styles.footerLink}>Developer Resources</Link></li>
            </ul>
          </div>

          <div className={styles.footerSection}>
            <h4 className={styles.footerSubtitle}>Connect</h4>
            <ul className={styles.footerLinks}>
              <li><a href="https://twitter.com/dytallix" className={styles.footerLink}>Twitter</a></li>
              <li><a href="https://telegram.me/dytallix" className={styles.footerLink}>Telegram</a></li>
              <li><a href="https://medium.com/@dytallix" className={styles.footerLink}>Medium</a></li>
              <li><a href="mailto:hello@dytallix.com" className={styles.footerLink}>Contact</a></li>
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p className={styles.copyright}>
            © {currentYear} Dytallix. All rights reserved.
          </p>
          <div className={styles.footerBottomLinks}>
            <a href="/privacy" className={styles.footerBottomLink}>Privacy Policy</a>
            <a href="/terms" className={styles.footerBottomLink}>Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer