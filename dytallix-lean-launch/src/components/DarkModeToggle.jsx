import React, { useState, useEffect } from 'react'

const DarkModeToggle = () => {
  const [isDark, setIsDark] = useState(true) // Default to dark since current theme is dark

  useEffect(() => {
    // Check localStorage for saved preference
    const savedMode = localStorage.getItem('darkMode')
    if (savedMode !== null) {
      const dark = savedMode === 'true'
      setIsDark(dark)
      document.body.classList.toggle('dark', dark)
    } else {
      // Default to dark mode
      document.body.classList.add('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const newMode = !isDark
    setIsDark(newMode)
    document.body.classList.toggle('dark', newMode)
    localStorage.setItem('darkMode', newMode.toString())
  }

  return (
    <button
      onClick={toggleDarkMode}
      data-test="dark-mode-toggle"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        background: 'transparent',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '6px',
        padding: '8px',
        color: 'inherit',
        cursor: 'pointer',
        fontSize: '14px',
        marginLeft: '12px'
      }}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  )
}

export default DarkModeToggle