import type { Metadata } from 'next';
import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google';
import Script from 'next/script';

import './globals.css';

const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'QuantumVault CRM',
  description: 'QuantumVault deal flow, tasks, inbox, and calendar for Dytallix.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
};

const themeInitScript = `
(() => {
  const storageKey = 'quantumvault-crm-theme';
  const root = document.documentElement;
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  try {
    const storedTheme = window.localStorage.getItem(storageKey);
    const theme = storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : systemTheme;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
  } catch {
    root.classList.toggle('dark', systemTheme === 'dark');
    root.style.colorScheme = systemTheme;
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
        <Script id="quantumvault-theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        {children}
      </body>
    </html>
  );
}