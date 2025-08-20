import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/docs',
    component: ComponentCreator('/docs', '735'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', '8e5'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', '05f'),
            routes: [
              {
                path: '/docs/architecture/network-architecture',
                component: ComponentCreator('/docs/architecture/network-architecture', '508'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/architecture/parameters',
                component: ComponentCreator('/docs/architecture/parameters', '202'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/architecture/pqc-primer',
                component: ComponentCreator('/docs/architecture/pqc-primer', 'e32'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/architecture/tokenomics-testnet',
                component: ComponentCreator('/docs/architecture/tokenomics-testnet', 'c4b'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/community/',
                component: ComponentCreator('/docs/community/', '044'),
                exact: true
              },
              {
                path: '/docs/community/community-channels',
                component: ComponentCreator('/docs/community/community-channels', '7c0'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/community/contributing',
                component: ComponentCreator('/docs/community/contributing', 'b18'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/community/INTERFACES',
                component: ComponentCreator('/docs/community/INTERFACES', '528'),
                exact: true
              },
              {
                path: '/docs/community/ONBOARDING',
                component: ComponentCreator('/docs/community/ONBOARDING', '794'),
                exact: true
              },
              {
                path: '/docs/community/proposals-README',
                component: ComponentCreator('/docs/community/proposals-README', '647'),
                exact: true
              },
              {
                path: '/docs/developers/api-reference',
                component: ComponentCreator('/docs/developers/api-reference', 'bed'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developers/dev-walkthrough',
                component: ComponentCreator('/docs/developers/dev-walkthrough', 'b15'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developers/examples/go-quickstart',
                component: ComponentCreator('/docs/developers/examples/go-quickstart', 'c14'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developers/examples/js-quickstart',
                component: ComponentCreator('/docs/developers/examples/js-quickstart', '616'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developers/examples/python-quickstart',
                component: ComponentCreator('/docs/developers/examples/python-quickstart', '906'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developers/openapi',
                component: ComponentCreator('/docs/developers/openapi', 'f9b'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developers/sdk',
                component: ComponentCreator('/docs/developers/sdk', '1b0'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developers/smart-contracts',
                component: ComponentCreator('/docs/developers/smart-contracts', 'a03'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/developers/websockets-grpc',
                component: ComponentCreator('/docs/developers/websockets-grpc', 'dcc'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/legal/',
                component: ComponentCreator('/docs/legal/', '524'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/legal/licensing',
                component: ComponentCreator('/docs/legal/licensing', '05e'),
                exact: true
              },
              {
                path: '/docs/legal/privacy-policy',
                component: ComponentCreator('/docs/legal/privacy-policy', '1c3'),
                exact: true
              },
              {
                path: '/docs/legal/terms-testnet',
                component: ComponentCreator('/docs/legal/terms-testnet', 'fd3'),
                exact: true
              },
              {
                path: '/docs/modules/',
                component: ComponentCreator('/docs/modules/', 'a23'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/modules/agentRole',
                component: ComponentCreator('/docs/modules/agentRole', '2d4'),
                exact: true
              },
              {
                path: '/docs/modules/bridge',
                component: ComponentCreator('/docs/modules/bridge', '104'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/modules/context',
                component: ComponentCreator('/docs/modules/context', '192'),
                exact: true
              },
              {
                path: '/docs/modules/documents-Development',
                component: ComponentCreator('/docs/modules/documents-Development', '54e'),
                exact: true
              },
              {
                path: '/docs/modules/documents-README',
                component: ComponentCreator('/docs/modules/documents-README', 'a45'),
                exact: true
              },
              {
                path: '/docs/modules/documents-whitepaper',
                component: ComponentCreator('/docs/modules/documents-whitepaper', '204'),
                exact: true
              },
              {
                path: '/docs/modules/faucet',
                component: ComponentCreator('/docs/modules/faucet', '6d5'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/modules/governance',
                component: ComponentCreator('/docs/modules/governance', 'a72'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/modules/pqc-crypto',
                component: ComponentCreator('/docs/modules/pqc-crypto', '4d4'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/modules/staking',
                component: ComponentCreator('/docs/modules/staking', '2ea'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/modules/telemetry',
                component: ComponentCreator('/docs/modules/telemetry', '399'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/modules/vision',
                component: ComponentCreator('/docs/modules/vision', '7bf'),
                exact: true
              },
              {
                path: '/docs/modules/wasm',
                component: ComponentCreator('/docs/modules/wasm', 'd03'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/operators/monitoring-troubleshooting',
                component: ComponentCreator('/docs/operators/monitoring-troubleshooting', '8dd'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/operators/upgrades-resets',
                component: ComponentCreator('/docs/operators/upgrades-resets', '9a2'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/operators/validator-node-setup',
                component: ComponentCreator('/docs/operators/validator-node-setup', '2bc'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/security/application-security',
                component: ComponentCreator('/docs/security/application-security', '9b7'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/security/disaster-recovery',
                component: ComponentCreator('/docs/security/disaster-recovery', 'a3d'),
                exact: true
              },
              {
                path: '/docs/security/GKE_SECURITY_HARDENING',
                component: ComponentCreator('/docs/security/GKE_SECURITY_HARDENING', 'd44'),
                exact: true
              },
              {
                path: '/docs/security/hardening_checklist',
                component: ComponentCreator('/docs/security/hardening_checklist', 'f9f'),
                exact: true
              },
              {
                path: '/docs/security/incident-response',
                component: ComponentCreator('/docs/security/incident-response', 'f5c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/security/INTERFACES',
                component: ComponentCreator('/docs/security/INTERFACES', 'cda'),
                exact: true
              },
              {
                path: '/docs/security/key-management',
                component: ComponentCreator('/docs/security/key-management', '44a'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/security/monitoring-detection',
                component: ComponentCreator('/docs/security/monitoring-detection', 'be5'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/security/network-security',
                component: ComponentCreator('/docs/security/network-security', '738'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/security/overview',
                component: ComponentCreator('/docs/security/overview', 'adb'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/security/policies',
                component: ComponentCreator('/docs/security/policies', 'e82'),
                exact: true
              },
              {
                path: '/docs/security/roadmap',
                component: ComponentCreator('/docs/security/roadmap', '934'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/start/faq',
                component: ComponentCreator('/docs/start/faq', '2e0'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/start/overview',
                component: ComponentCreator('/docs/start/overview', '489'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/start/quickstart',
                component: ComponentCreator('/docs/start/quickstart', '8c8'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/start/testnet-rules',
                component: ComponentCreator('/docs/start/testnet-rules', 'b22'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/users/explorer-guide',
                component: ComponentCreator('/docs/users/explorer-guide', 'b76'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/users/faucet-guide',
                component: ComponentCreator('/docs/users/faucet-guide', '49c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/users/wallet-guide',
                component: ComponentCreator('/docs/users/wallet-guide', 'b64'),
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
    path: '/',
    component: ComponentCreator('/', '2e1'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
