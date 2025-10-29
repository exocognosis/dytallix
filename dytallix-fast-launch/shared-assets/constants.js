// Dytallix Design Constants
// Centralized design tokens and configuration

export const COLORS = {
  primary: {
    blue: '#0066cc',
    dark: '#003d7a',
    light: '#3399ff',
  },
  accent: {
    purple: '#7c3aed',
    quantum: '#a855f7',
  },
  status: {
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
  },
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  }
};

export const TYPOGRAPHY = {
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    mono: '"Monaco", "Courier New", monospace',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
    '6xl': '3.75rem',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.6,
    relaxed: 1.8,
  }
};

export const SPACING = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
  '4xl': '5rem',
};

export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

export const ANIMATIONS = {
  duration: {
    fast: '150ms',
    base: '250ms',
    slow: '350ms',
  },
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  }
};

export const BRAND = {
  name: 'Dytallix',
  tagline: 'Securing the Quantum Future',
  description: 'Post-Quantum Cryptography and Blockchain Solutions',
  email: 'contact@dytallix.com',
  twitter: '@dytallix',
  github: 'github.com/dytallix',
};

export const API_ENDPOINTS = {
  base: '/api',
  demo: '/api/demo-request',
  whitepaper: '/api/whitepaper-download',
  newsletter: '/api/newsletter-subscribe',
  wallet: {
    create: '/wallet/create',
    sign: '/wallet/sign',
    export: '/wallet/export',
  },
  faucet: {
    request: '/faucet/request',
    status: '/faucet/status',
  },
  explorer: {
    search: '/explorer/search',
    block: '/explorer/block',
    transaction: '/explorer/transaction',
    address: '/explorer/address',
  }
};

export const PQC_ALGORITHMS = {
  kyber: {
    name: 'Kyber',
    type: 'Key Encapsulation',
    status: 'NIST Selected',
    description: 'Lattice-based key encapsulation mechanism',
  },
  dilithium: {
    name: 'Dilithium',
    type: 'Digital Signature',
    status: 'NIST Selected',
    description: 'Lattice-based digital signature scheme',
  },
  sphincsPlus: {
    name: 'SPHINCS+',
    type: 'Digital Signature',
    status: 'NIST Selected',
    description: 'Hash-based signature scheme',
  },
  falcon: {
    name: 'Falcon',
    type: 'Digital Signature',
    status: 'NIST Selected',
    description: 'Lattice-based signature scheme',
  }
};

export const FEATURES = {
  build: [
    {
      title: 'PQC Wallet',
      description: 'Post-quantum secure wallet with hybrid cryptography',
      icon: '🔐',
      path: '/build/pqc-wallet.html',
    },
    {
      title: 'Faucet',
      description: 'Get testnet tokens for development',
      icon: '💧',
      path: '/build/faucet.html',
    },
    {
      title: 'Explorer',
      description: 'Real-time blockchain explorer with PQC insights',
      icon: '🔍',
      path: '/build/explorer.html',
    },
    {
      title: 'Dashboard',
      description: 'Project management and API key control',
      icon: '📊',
      path: '/build/dashboard.html',
    },
    {
      title: 'Tokenomics',
      description: 'Token economics and staking analytics',
      icon: '💰',
      path: '/build/tokenomics.html',
    },
    {
      title: 'Documentation',
      description: 'Comprehensive developer guides and API reference',
      icon: '📚',
      path: '/build/docs.html',
    },
  ],
  quantumshield: [
    {
      title: 'Post-Quantum Encryption',
      description: 'Enforce PQC standards across your infrastructure',
    },
    {
      title: 'Secure Data Re-Wrapping',
      description: 'Migrate from classical to quantum-resistant encryption',
    },
    {
      title: 'Attestation & Audit Trail',
      description: 'Prove compliance with immutable cryptographic proofs',
    },
    {
      title: 'Crypto-Agile Framework',
      description: 'Seamlessly switch between cryptographic algorithms',
    },
  ]
};

export default {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  BREAKPOINTS,
  ANIMATIONS,
  BRAND,
  API_ENDPOINTS,
  PQC_ALGORITHMS,
  FEATURES,
};
