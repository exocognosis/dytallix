import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import styles from '../styles/Navbar.module.css'

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/wallet', label: 'Wallet' },
    { path: '/faucet', label: 'Faucet' },
    { path: '/tech-stack', label: 'Tech Stack' },
    { path: '/roadmap', label: 'Roadmap' },
    { path: '/deploy', label: 'Deploy' },
    { path: '/explorer', label: 'Explorer' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/modules', label: 'AI Modules' },
    { path: '/dev-resources', label: 'Docs' }
  ]

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <nav className={styles.navbar}>
      <div className="container">
        <div className={styles.navContent}>
          <Link to="/" className={styles.logo} aria-label="Dytallix Home">
            <div className={styles.logoBadge} aria-hidden="true">D</div>
            <span className={styles.logoText}>Dytallix</span>
          </Link>

          <div className={`${styles.navLinks} ${isMenuOpen ? styles.navLinksOpen : ''}`}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                  onClick={() => setIsMenuOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              )
            })}
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
