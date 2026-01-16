// Sidebar configuration generated via automated patch application

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    {
      type: 'category',
      label: 'Start',
      collapsed: false,
      items: [
        'start/overview',
        'start/quickstart',
        'start/testnet-rules',
        'start/faq'
      ]
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/network-architecture',
        'architecture/parameters',
        'architecture/tokenomics-testnet',
        'architecture/pqc-primer'
      ]
    },
    {
      type: 'category',
      label: 'Users',
      items: [
        'users/wallet-guide',
        'users/faucet-guide',
        'users/explorer-guide'
      ]
    },
    {
      type: 'category',
      label: 'Developers',
      items: [
        'developers/dev-walkthrough',
        'developers/smart-contracts',
        'developers/sdk',
        'developers/api-reference',
        'developers/openapi',
        'developers/websockets-grpc',
        {
          type: 'category',
          label: 'Examples',
          items: [
            'developers/examples/js-quickstart',
            'developers/examples/python-quickstart',
            'developers/examples/go-quickstart'
          ]
        }
      ]
    },
    {
      type: 'category',
      label: 'Operators',
      items: [
        'operators/validator-node-setup',
        'operators/monitoring-troubleshooting',
        'operators/upgrades-resets'
      ]
    },
    {
      type: 'category',
      label: 'Security',
      items: [
        'security/overview',
        'security/key-management',
        'security/network-security',
        'security/application-security',
        'security/monitoring-detection',
        'security/incident-response',
        'security/roadmap'
      ]
    },
    {
      type: 'category',
      label: 'Modules',
      items: [
        'modules/index',
        'modules/staking',
        'modules/governance',
        'modules/pqc-crypto',
        'modules/bridge',
        'modules/faucet',
        'modules/telemetry',
        'modules/wasm'
      ]
    },
    {
      type: 'category',
      label: 'Community',
      items: [
        'community/community-channels',
        'community/contributing'
      ]
    },
    {
      type: 'category',
      label: 'Legal',
      items: [
        'legal/README'
      ]
    }
  ]
};

export default sidebars;
