import { 
  CommandLineIcon, 
  ShieldCheckIcon,
  CodeBracketIcon,
  PlayIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline'
import { motion } from 'framer-motion';
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export function SmartContracts() {
  return (
    <main className="bg-black text-white min-h-screen px-6 py-12">
      {/* Header */}
      <section className="max-w-6xl mx-auto mb-12">
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6 }}
          className="text-center space-y-4"
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight flex items-center justify-center">
            <CommandLineIcon className="w-12 h-12 mr-4" />
            Smart Contracts
          </h1>
          <p className="text-lg text-gray-300">
            Deploy and interact with quantum-safe smart contracts on the Dytallix network
          </p>
        </motion.div>
      </section>

      {/* Quick Actions */}
      <section className="max-w-6xl mx-auto mb-12">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Deploy Contract",
              description: "Deploy new quantum-safe contracts",
              icon: CodeBracketIcon,
              color: "blue"
            },
            {
              title: "Interact",
              description: "Call contract functions",
              icon: PlayIcon,
              color: "purple"
            },
            {
              title: "AI Audit",
              description: "AI-powered security audit",
              icon: ShieldCheckIcon,
              color: "green"
            }
          ].map((action, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
            >
              <Card className={`cursor-pointer transition-all hover:scale-105 border shadow-lg ${
                action.color === 'blue' ? 'bg-blue-900/20 border-blue-700 hover:bg-blue-900/30' :
                action.color === 'purple' ? 'bg-purple-900/20 border-purple-700 hover:bg-purple-900/30' :
                'bg-green-900/20 border-green-700 hover:bg-green-900/30'
              }`}>
                <CardContent className="p-6 text-center">
                  <action.icon className={`w-12 h-12 mx-auto mb-4 ${
                    action.color === 'blue' ? 'text-blue-400' :
                    action.color === 'purple' ? 'text-purple-400' :
                    'text-green-400'
                  }`} />
                  <h3 className="font-semibold text-white mb-2">{action.title}</h3>
                  <p className="text-sm text-gray-300">{action.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Contract Templates */}
      <section className="max-w-6xl mx-auto mb-12">
        <motion.h2 
          initial={{ opacity: 0 }} 
          whileInView={{ opacity: 1 }} 
          viewport={{ once: true }} 
          className="text-2xl font-bold mb-6 text-blue-400"
        >
          Quantum-Safe Contract Templates
        </motion.h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            {
              title: "ERC-20 Token (PQC)",
              description: "Standard fungible token with post-quantum cryptography",
              features: ["Dilithium signatures", "Quantum-resistant transfers", "Governance ready"],
              status: "ready",
              language: "Rust"
            },
            {
              title: "NFT Collection (PQC)",
              description: "Non-fungible token collection with quantum security",
              features: ["SPHINCS+ verification", "Metadata protection", "Royalty system"],
              status: "ready",
              language: "Rust"
            },
            {
              title: "DAO Governance",
              description: "Decentralized governance with quantum-safe voting",
              features: ["Falcon signatures", "Proposal system", "Treasury management"],
              status: "beta",
              language: "Rust"
            },
            {
              title: "DeFi Liquidity Pool",
              description: "Automated market maker with quantum protection",
              features: ["PQC price oracles", "Secure swaps", "Yield farming"],
              status: "development",
              language: "Rust"
            }
          ].map((template, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
            >
              <Card className="bg-gray-900 border-gray-800 shadow-lg hover:bg-gray-800 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">{template.title}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        template.status === 'ready' ? 'bg-green-900 text-green-400' :
                        template.status === 'beta' ? 'bg-yellow-900 text-yellow-400' :
                        'bg-blue-900 text-blue-400'
                      }`}>
                        {template.status}
                      </span>
                      <span className="px-2 py-1 bg-orange-900 text-orange-400 rounded text-xs">
                        {template.language}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 mb-4">{template.description}</p>
                  <div className="space-y-2 mb-4">
                    {template.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center">
                        <CheckCircleIcon className="w-4 h-4 text-green-400 mr-2" />
                        <span className="text-sm text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      className="flex items-center"
                      disabled={template.status === 'development'}
                    >
                      <RocketLaunchIcon className="w-4 h-4 mr-1" />
                      Deploy
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center"
                    >
                      <DocumentTextIcon className="w-4 h-4 mr-1" />
                      View Code
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Recent Deployments */}
      <section className="max-w-6xl mx-auto mb-12">
        <motion.h2 
          initial={{ opacity: 0 }} 
          whileInView={{ opacity: 1 }} 
          viewport={{ once: true }} 
          className="text-2xl font-bold mb-6 text-purple-400"
        >
          Recent Deployments
        </motion.h2>
        <Card className="bg-gray-900 border-gray-800 shadow-lg">
          <CardContent className="p-6">
            <div className="space-y-4">
              {[
                {
                  name: "DytalToken",
                  type: "ERC-20 Token",
                  address: "0x742d35Cc4Cf3E3C3E3C3E3C3E3C3E3C3E3C3E3C3",
                  status: "verified",
                  timestamp: "2 hours ago"
                },
                {
                  name: "DytaNFT Collection",
                  type: "NFT Contract",
                  address: "0x987fEDCBA98765432109876543210987654321098",
                  status: "verified",
                  timestamp: "5 hours ago"
                },
                {
                  name: "GovernanceDAO",
                  type: "DAO Contract",
                  address: "0x123456789ABCDEF123456789ABCDEF123456789A",
                  status: "pending",
                  timestamp: "1 day ago"
                }
              ].map((deployment, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      deployment.status === 'verified' ? 'bg-green-400' : 'bg-yellow-400'
                    }`}></div>
                    <div>
                      <div className="font-medium text-white">{deployment.name}</div>
                      <div className="text-sm text-gray-400">{deployment.type}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-gray-300">
                      {deployment.address.slice(0, 10)}...{deployment.address.slice(-8)}
                    </div>
                    <div className="text-xs text-gray-500">{deployment.timestamp}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Security Features */}
      <section className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Card className="bg-gradient-to-r from-green-900/50 to-blue-900/50 border-green-700/50 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <ShieldCheckIcon className="w-6 h-6 mr-2" />
                Quantum-Safe Security Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">100%</div>
                  <div className="text-sm text-green-200">Quantum Resistant</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400">3</div>
                  <div className="text-sm text-blue-200">PQC Algorithms</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-400">AI</div>
                  <div className="text-sm text-purple-200">Powered Audits</div>
                </div>
              </div>
              <div className="mt-6 text-center">
                <p className="text-green-200 mb-4">
                  All smart contracts are automatically protected with post-quantum cryptography and AI-powered security audits.
                </p>
                <Button variant="outline" className="border-green-400 text-green-400 hover:bg-green-400/10">
                  Learn More About PQC
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </main>
  )
}
