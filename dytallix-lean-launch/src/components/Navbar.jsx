import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import styles from '../styles/Navbar.module.css'

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/faucet', label: 'Faucet' },
    { path: '/tech-specs', label: 'Tech Specs' },
    { path: '/modules', label: 'AI Modules' },
    { path: '/roadmap', label: 'Roadmap' },
    { path: '/dev-resources', label: 'Developer Resources' }
  ]

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <nav className={styles.navbar}>
      <div className="container">
        <div className={styles.navContent}>
          <Link to="/" className={styles.logo}>
            <img src="/src/assets/logo.png" alt="Dytallix" className={styles.logoImg} />
            <span className={styles.logoText}>Dytallix</span>
          </Link>

          <div className={`${styles.navLinks} ${isMenuOpen ? styles.navLinksOpen : ''}`}>
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`${styles.navLink} ${
                  location.pathname === item.path ? styles.navLinkActive : ''
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <button
            className={styles.menuButton}
            onClick={toggleMenu}
            aria-label="Toggle navigation menu"
          >
            <span className={styles.menuIcon}></span>
            <span className={styles.menuIcon}></span>
            <span className={styles.menuIcon}></span>
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar