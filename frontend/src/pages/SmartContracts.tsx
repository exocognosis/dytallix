import { 
  CommandLineIcon, 
  ShieldCheckIcon,
  CodeBracketIcon,
  PlayIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export function SmartContracts() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-700 pb-6">
        <h1 className="text-3xl font-bold text-white flex items-center">
          <CommandLineIcon className="w-8 h-8 mr-3" />
          Smart Contracts
        </h1>
        <p className="mt-2 text-gray-400">
          Deploy and interact with quantum-safe smart contracts on the Dytallix network
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <button className="p-6 bg-blue-800 hover:bg-blue-700 rounded-lg border border-blue-600 transition-colors text-center">
          <CodeBracketIcon className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <h3 className="font-semibold text-white mb-1">Deploy Contract</h3>
          <p className="text-sm text-gray-300">Deploy new quantum-safe contracts</p>
        </button>
        
        <button className="p-6 bg-purple-800 hover:bg-purple-700 rounded-lg border border-purple-600 transition-colors text-center">
          <PlayIcon className="w-8 h-8 text-purple-400 mx-auto mb-2" />
          <h3 className="font-semibold text-white mb-1">Interact</h3>
          <p className="text-sm text-gray-300">Call contract functions</p>
        </button>
        
        <button className="p-6 bg-green-800 hover:bg-green-700 rounded-lg border border-green-600 transition-colors text-center">
          <ShieldCheckIcon className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <h3 className="font-semibold text-white mb-1">Audit</h3>
          <p className="text-sm text-gray-300">AI-powered security audit</p>
        </button>
      </div>

      {/* Contract Templates */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-xl font-bold text-blue-400 mb-4">Quantum-Safe Contract Templates</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
            <div className="flex items-center mb-3">
              <DocumentTextIcon className="w-6 h-6 text-blue-400 mr-2" />
              <h3 className="font-semibold text-white">QToken (ERC-20)</h3>
            </div>
            <p className="text-gray-300 text-sm mb-3">
              Quantum-resistant fungible token with PQC signatures and enhanced security features.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs bg-green-900 text-green-400 px-2 py-1 rounded">PQC Ready</span>
              <button className="text-blue-400 hover:text-blue-300 text-sm">Deploy →</button>
            </div>
          </div>
          
          <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
            <div className="flex items-center mb-3">
              <DocumentTextIcon className="w-6 h-6 text-purple-400 mr-2" />
              <h3 className="font-semibold text-white">QNFT (ERC-721)</h3>
            </div>
            <p className="text-gray-300 text-sm mb-3">
              Non-fungible tokens with quantum-proof ownership verification and metadata protection.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs bg-green-900 text-green-400 px-2 py-1 rounded">PQC Ready</span>
              <button className="text-purple-400 hover:text-purple-300 text-sm">Deploy →</button>
            </div>
          </div>
          
          <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
            <div className="flex items-center mb-3">
              <DocumentTextIcon className="w-6 h-6 text-green-400 mr-2" />
              <h3 className="font-semibold text-white">QMultiSig</h3>
            </div>
            <p className="text-gray-300 text-sm mb-3">
              Multi-signature wallet with quantum-resistant threshold signatures for enhanced security.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs bg-green-900 text-green-400 px-2 py-1 rounded">PQC Ready</span>
              <button className="text-green-400 hover:text-green-300 text-sm">Deploy →</button>
            </div>
          </div>
          
          <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
            <div className="flex items-center mb-3">
              <DocumentTextIcon className="w-6 h-6 text-yellow-400 mr-2" />
              <h3 className="font-semibold text-white">QGovernance</h3>
            </div>
            <p className="text-gray-300 text-sm mb-3">
              DAO governance contract with quantum-safe voting mechanisms and proposal management.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs bg-green-900 text-green-400 px-2 py-1 rounded">PQC Ready</span>
              <button className="text-yellow-400 hover:text-yellow-300 text-sm">Deploy →</button>
            </div>
          </div>
        </div>
      </div>

      {/* Deployed Contracts */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-xl font-bold text-blue-400 mb-4">Your Deployed Contracts</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
            <div className="flex items-center">
              <CheckCircleIcon className="w-5 h-5 text-green-400 mr-3" />
              <div>
                <div className="font-semibold text-white">DGT Staking Pool</div>
                <div className="text-sm text-gray-400">0x742d...89a1 • Deployed 3 days ago</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-green-900 text-green-400 px-2 py-1 rounded">Active</span>
              <button className="text-blue-400 hover:text-blue-300 text-sm">Interact</button>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
            <div className="flex items-center">
              <CheckCircleIcon className="w-5 h-5 text-green-400 mr-3" />
              <div>
                <div className="font-semibold text-white">Quantum NFT Collection</div>
                <div className="text-sm text-gray-400">0x1a7b...4c92 • Deployed 1 week ago</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-green-900 text-green-400 px-2 py-1 rounded">Active</span>
              <button className="text-blue-400 hover:text-blue-300 text-sm">Interact</button>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 mr-3" />
              <div>
                <div className="font-semibold text-white">Legacy Token Contract</div>
                <div className="text-sm text-gray-400">0x8f3d...2e81 • Deployed 2 months ago</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-yellow-900 text-yellow-400 px-2 py-1 rounded">Needs PQC Upgrade</span>
              <button className="text-yellow-400 hover:text-yellow-300 text-sm">Upgrade</button>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Security */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-xl font-bold text-blue-400 mb-4">Security Features</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Quantum-Safe Features</h3>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-center">
                <CheckCircleIcon className="w-4 h-4 text-green-400 mr-2" />
                CRYSTALS-Dilithium signatures
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="w-4 h-4 text-green-400 mr-2" />
                Falcon compact signatures
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="w-4 h-4 text-green-400 mr-2" />
                SPHINCS+ stateless signatures
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="w-4 h-4 text-green-400 mr-2" />
                Kyber key encapsulation
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">AI Security Auditing</h3>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-center">
                <CheckCircleIcon className="w-4 h-4 text-green-400 mr-2" />
                Automated vulnerability scanning
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="w-4 h-4 text-green-400 mr-2" />
                Gas optimization analysis
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="w-4 h-4 text-green-400 mr-2" />
                Logic error detection
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="w-4 h-4 text-green-400 mr-2" />
                Real-time monitoring
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
