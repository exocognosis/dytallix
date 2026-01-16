// Docusaurus config isolated from app root (CommonJS for compatibility)
const {themes: prismThemes} = require('prism-react-renderer');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Dytallix Docs',
  tagline: 'Modular Post-Quantum Enabled Testnet',
  url: 'https://docs.dytallix.example',
  baseUrl: '/',
  favicon: 'img/favicon.ico',
  organizationName: 'dytallix',
  projectName: 'dytallix-docs',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  i18n: { defaultLocale: 'en', locales: ['en'] },
  presets: [
    [
      'classic',
      ({
        docs: {
          // Previously pointed to nested docs/ directory; now use current dir.
          path: '.',
          // Restrict to specific content directories to avoid non-doc markdown at root.
          include: [
            'start/**/*.{md,mdx}',
            'architecture/**/*.{md,mdx}',
            'users/**/*.{md,mdx}',
            'developers/**/*.{md,mdx}',
            'operators/**/*.{md,mdx}',
            'security/**/*.{md,mdx}',
            'modules/**/*.{md,mdx}',
            'community/**/*.{md,mdx}',
            'legal/**/*.{md,mdx}'
          ],
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/dytallix/dytallix-lean-launch/edit/main/docs/'
        },
        theme: { customCss: require.resolve('./src/css/custom.css') }
      })
    ]
  ],
  staticDirectories: ['static'],
  customFields: {
    docsLanding: '/docs/start/overview'
  },
  themeConfig: {
    image: 'img/social-card.png',
    navbar: {
      title: 'Dytallix',
      logo: { alt: 'Dytallix Logo', src: 'img/logo.png' },
      items: [
        { to: '/docs/start/overview', label: 'Start', position: 'left' },
        { to: '/docs/architecture/network-architecture', label: 'Architecture', position: 'left' },
        { to: '/docs/developers/dev-walkthrough', label: 'Developers', position: 'left' },
        { to: '/docs/operators/validator-node-setup', label: 'Operators', position: 'left' },
        { to: '/docs/security/overview', label: 'Security', position: 'left' },
        { href: 'https://github.com/dytallix/dytallix-lean-launch', label: 'GitHub', position: 'right' }
      ]
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {label: 'Overview', to: '/docs/start/overview'},
            {label: 'Architecture', to: '/docs/architecture/network-architecture'},
            {label: 'Security', to: '/docs/security/overview'}
          ]
        },
        {
          title: 'Legal',
          items: [
            {label: 'Privacy', to: '/docs/legal/privacy-policy'},
            {label: 'Terms', to: '/docs/legal/terms-testnet'},
            {label: 'Licensing', to: '/docs/legal/licensing'}
          ]
        }
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Dytallix`
    },
    prism: { theme: prismThemes.github, darkTheme: prismThemes.dracula }
  }
};

module.exports = config;
