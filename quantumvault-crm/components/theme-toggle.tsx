'use client';

import { useEffect, useState } from 'react';

const THEME_STORAGE_KEY = 'quantumvault-crm-theme';

type ThemeMode = 'light' | 'dark';

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    setTheme(root.classList.contains('dark') ? 'dark' : 'light');
    setMounted(true);
  }, []);

  function handleToggle() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <button
      aria-checked={theme === 'dark'}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={className ? `theme-toggle-shell ${className}` : 'theme-toggle-shell'}
      onClick={handleToggle}
      role="switch"
      type="button"
    >
      <span className="theme-toggle-copy">
        <span className="theme-toggle-label">Theme</span>
        <span className="theme-toggle-value">{mounted ? theme : 'light'}</span>
      </span>
      <span className="theme-toggle-track" aria-hidden="true">
        <span className={`theme-toggle-knob${theme === 'dark' ? ' is-dark' : ''}`} />
      </span>
    </button>
  );
}