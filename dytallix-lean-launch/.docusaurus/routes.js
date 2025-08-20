import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/CodeShield',
    component: ComponentCreator('/CodeShield', '91b'),
    exact: true
  },
  {
    path: '/Dashboard',
    component: ComponentCreator('/Dashboard', '8f3'),
    exact: true
  },
  {
    path: '/Deploy',
    component: ComponentCreator('/Deploy', '8a6'),
    exact: true
  },
  {
    path: '/DevResources',
    component: ComponentCreator('/DevResources', '1fb'),
    exact: true
  },
  {
    path: '/Explorer',
    component: ComponentCreator('/Explorer', '22f'),
    exact: true
  },
  {
    path: '/Faucet',
    component: ComponentCreator('/Faucet', '918'),
    exact: true
  },
  {
    path: '/FlowRate',
    component: ComponentCreator('/FlowRate', 'ffc'),
    exact: true
  },
  {
    path: '/Home',
    component: ComponentCreator('/Home', '8c6'),
    exact: true
  },
  {
    path: '/Modules',
    component: ComponentCreator('/Modules', '66e'),
    exact: true
  },
  {
    path: '/Monitor',
    component: ComponentCreator('/Monitor', '51d'),
    exact: true
  },
  {
    path: '/NetFlux',
    component: ComponentCreator('/NetFlux', '4f5'),
    exact: true
  },
  {
    path: '/PulseGuard',
    component: ComponentCreator('/PulseGuard', '8f7'),
    exact: true
  },
  {
    path: '/Roadmap',
    component: ComponentCreator('/Roadmap', '7bb'),
    exact: true
  },
  {
    path: '/StakeBalancer',
    component: ComponentCreator('/StakeBalancer', '514'),
    exact: true
  },
  {
    path: '/TechStack',
    component: ComponentCreator('/TechStack', 'aa4'),
    exact: true
  },
  {
    path: '/Wallet',
    component: ComponentCreator('/Wallet', '2c7'),
    exact: true
  },
  {
    path: '/docs',
    component: ComponentCreator('/docs', 'ff8'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', 'fb4'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', '561'),
            routes: [
              {
                path: '/docs/',
                component: ComponentCreator('/docs/', 'e35'),
                exact: true
              },
              {
                path: '/docs/architecture/network-architecture',
                component: ComponentCreator('/docs/architecture/network-architecture', '114'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/architecture/parameters',
                component: ComponentCreator('/docs/architecture/parameters', 'b32'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/architecture/pqc-primer',
                component: ComponentCreator('/docs/architecture/pqc-primer', '018'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/architecture/tokenomics-testnet',
                component: ComponentCreator('/docs/architecture/tokenomics-testnet', 'f99'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/community/community-channels',
                component: ComponentCreator('/docs/community/community-channels', '3b9'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/community/contributing',
                component: ComponentCreator('/docs/community/contributing', '9ef'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developers/api-reference',
                component: ComponentCreator('/docs/developers/api-reference', 'a8b'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developers/dev-walkthrough',
                component: ComponentCreator('/docs/developers/dev-walkthrough', 'cc5'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developers/examples/go-quickstart',
                component: ComponentCreator('/docs/developers/examples/go-quickstart', 'f06'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developers/examples/js-quickstart',
                component: ComponentCreator('/docs/developers/examples/js-quickstart', '60c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developers/examples/python-quickstart',
                component: ComponentCreator('/docs/developers/examples/python-quickstart', '8e3'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developers/openapi',
                component: ComponentCreator('/docs/developers/openapi', '01e'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developers/sdk',
                component: ComponentCreator('/docs/developers/sdk', '577'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developers/smart-contracts',
                component: ComponentCreator('/docs/developers/smart-contracts', 'a8b'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developers/websockets-grpc',
                component: ComponentCreator('/docs/developers/websockets-grpc', 'ed9'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/evm_migration/MATCHES',
                component: ComponentCreator('/docs/evm_migration/MATCHES', '9e7'),
                exact: true
              },
              {
                path: '/docs/legacy-frontend-readme',
                component: ComponentCreator('/docs/legacy-frontend-readme', '776'),
                exact: true
              },
              {
                path: '/docs/legal/',
                component: ComponentCreator('/docs/legal/', '2fa'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/legal/licensing',
                component: ComponentCreator('/docs/legal/licensing', '393'),
                exact: true
              },
              {
                path: '/docs/legal/privacy-policy',
                component: ComponentCreator('/docs/legal/privacy-policy', '984'),
                exact: true
              },
              {
                path: '/docs/legal/terms-testnet',
                component: ComponentCreator('/docs/legal/terms-testnet', '881'),
                exact: true
              },
              {
                path: '/docs/modules/',
                component: ComponentCreator('/docs/modules/', 'f23'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/modules/bridge',
                component: ComponentCreator('/docs/modules/bridge', '6fe'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/modules/faucet',
                component: ComponentCreator('/docs/modules/faucet', 'c7b'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/modules/governance',
                component: ComponentCreator('/docs/modules/governance', 'f70'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/modules/pqc-crypto',
                component: ComponentCreator('/docs/modules/pqc-crypto', '2fc'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/modules/staking',
                component: ComponentCreator('/docs/modules/staking', '0a3'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/modules/telemetry',
                component: ComponentCreator('/docs/modules/telemetry', 'e8b'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/modules/wasm',
                component: ComponentCreator('/docs/modules/wasm', 'f76'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/operators/monitoring-troubleshooting',
                component: ComponentCreator('/docs/operators/monitoring-troubleshooting', 'd4f'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/operators/upgrades-resets',
                component: ComponentCreator('/docs/operators/upgrades-resets', '420'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/operators/validator-node-setup',
                component: ComponentCreator('/docs/operators/validator-node-setup', '470'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/security/application-security',
                component: ComponentCreator('/docs/security/application-security', '4eb'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/security/incident-response',
                component: ComponentCreator('/docs/security/incident-response', 'af4'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/security/key-management',
                component: ComponentCreator('/docs/security/key-management', '658'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/security/monitoring-detection',
                component: ComponentCreator('/docs/security/monitoring-detection', '8b8'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/security/network-security',
                component: ComponentCreator('/docs/security/network-security', 'fbb'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/security/overview',
                component: ComponentCreator('/docs/security/overview', '836'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/security/roadmap',
                component: ComponentCreator('/docs/security/roadmap', '77b'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/start/faq',
                component: ComponentCreator('/docs/start/faq', '074'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/start/overview',
                component: ComponentCreator('/docs/start/overview', 'a58'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/start/quickstart',
                component: ComponentCreator('/docs/start/quickstart', 'fb4'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/start/testnet-rules',
                component: ComponentCreator('/docs/start/testnet-rules', 'c37'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/users/explorer-guide',
                component: ComponentCreator('/docs/users/explorer-guide', '537'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/users/faucet-guide',
                component: ComponentCreator('/docs/users/faucet-guide', '054'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/users/wallet-guide',
                component: ComponentCreator('/docs/users/wallet-guide', '961'),
                exact: true,
                sidebar: "docs"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
