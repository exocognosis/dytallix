import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'

interface FAQItem {
  question: string
  answer: string
}

const faqData: FAQItem[] = [
  {
    question: "What is Dytallix's core technology stack?",
    answer: "Dytallix is built on a hybrid blockchain architecture combining Rust-based consensus mechanisms with TypeScript/React frontends. The core uses post-quantum cryptographic algorithms (CRYSTALS-Dilithium, Falcon, SPHINCS+) for signatures, Kyber for key exchange, and HASH-based signatures for long-term security. Our AI layer is implemented using Python with TensorFlow/PyTorch for smart contract auditing and threat detection."
  },
  {
    question: "How does Dytallix's dual-token system work?",
    answer: "Dytallix uses a dual-token system: DGT (governance, 1 billion fixed supply) and DRT (reward, adaptive emission). DGT is allocated for ecosystem development, community incentives, team/advisors (with vesting), partnerships, and liquidity, and is used for protocol governance and voting. DRT is distributed as staking and participation rewards, with emission rates adjustable by DGT-holder votes. DRT is burnable to create deflationary pressure. All major protocol changes and emissions are governed by DGT token voting."
  },
  {
    question: "What's the difference between native quantum security vs bolt-on quantum security?",
    answer: "Native quantum security means the blockchain is designed from the ground up with post-quantum cryptography integrated into every layer - consensus, transactions, smart contracts, and network communication. Bolt-on quantum security involves adding quantum-resistant features to existing classical systems, which creates security gaps and compatibility issues. Dytallix uses native quantum security, ensuring complete protection against quantum attacks without legacy vulnerabilities."
  },
  {
    question: "How does Dytallix's AI-driven protection work?",
    answer: "Our AI system continuously analyzes transaction patterns, smart contract behavior, and network activity using machine learning models. It performs real-time anomaly detection to identify potential attacks, automated smart contract auditing before deployment, risk scoring for transactions, and predictive analytics for emerging threats. The AI models are trained on both historical blockchain data and quantum attack simulations."
  },
  {
    question: "What consensus mechanism does Dytallix use?",
    answer: "Dytallix uses a novel Quantum-Proof Delegated Proof of Stake (QDPoS) consensus mechanism. Validators are selected based on stake weight and quantum-resistant digital signatures. The consensus process uses post-quantum cryptographic primitives for all communication and verification, ensuring the network remains secure even against quantum adversaries."
  },
  {
    question: "Is Dytallix compatible with existing DeFi protocols?",
    answer: "Dytallix maintains EVM compatibility for smart contracts while using quantum-resistant signatures and cryptography at the protocol level. This allows existing DeFi applications to be ported with minimal changes, while benefiting from quantum security. We provide migration tools and wrapper contracts to facilitate seamless integration."
  },
  {
    question: "What happens when quantum computers become more powerful?",
    answer: "Dytallix is designed with crypto-agility in mind. Our modular architecture allows for seamless upgrades to new post-quantum algorithms as they become standardized. The protocol includes built-in governance mechanisms to vote on and implement cryptographic upgrades without hard forks, ensuring long-term quantum resistance."
  },
  {
    question: "How does staking work on Dytallix?",
    answer: "DGT holders can stake their tokens to participate in network validation and earn DRT rewards. Minimum stake is 50,000 DGT to run a validator node or 1,000 DGT for delegation. Staking rewards are paid in DRT tokens with rates determined by network participation and governed by DGT holders. Unstaking has a 21-day unbonding period for security. Slashing penalties apply for validator misbehavior."
  },
  {
    question: "What makes Dytallix different from other quantum-resistant blockchains?",
    answer: "Unlike other projects that focus solely on quantum-resistant cryptography, Dytallix combines quantum security with AI-driven protection, creating a comprehensive defense system. Our crypto-agile architecture, EVM compatibility, and focus on real-world usability set us apart. We're also one of the first to implement NIST-standardized post-quantum algorithms in a production blockchain."
  },
  {
    question: "How can developers build on Dytallix?",
    answer: "Developers can use familiar tools like Solidity, Hardhat, and Web3.js due to our EVM compatibility. We provide additional SDKs for quantum-resistant features, AI integration APIs, and comprehensive documentation. Our testnet offers faucets and development tools, while our grant program supports promising projects building on Dytallix."
  },
  {
    question: "What are the transaction fees on Dytallix?",
    answer: "Transaction fees are paid in DRT tokens and are dynamic based on network congestion. Simple transfers start from 0.01 DRT, while smart contract interactions range from 0.1-10 DRT depending on complexity. A portion of fees are burned to create deflationary pressure on DRT, while the remainder goes to validators and the treasury for ecosystem development."
  },
  {
    question: "How does Dytallix ensure regulatory compliance?",
    answer: "Dytallix implements optional privacy features while maintaining transparency for regulatory compliance. We support identity verification for institutional users, transaction monitoring capabilities for compliance officers, and work with regulatory bodies to ensure our quantum security innovations meet legal requirements across jurisdictions."
  }
]

export function About() {
  const [openItems, setOpenItems] = useState<number[]>([])

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

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
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            About Dytallix
          </h1>
          <p className="text-lg text-gray-300">
            Learn more about our quantum-safe blockchain technology and ecosystem
          </p>
        </motion.div>
      </section>

      {/* Mission Section */}
      <section className="max-w-6xl mx-auto mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="bg-gray-900 border-gray-800 shadow-lg">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-2xl font-bold text-blue-400 mb-4">Our Mission</h2>
              <div className="text-gray-300 space-y-4 leading-relaxed">
                <p>
                  Dytallix is pioneering the next generation of blockchain by combining post-quantum cryptography and artificial intelligence into a unified, quantum-secure ecosystem.
                  Our mission is to protect digital assets and decentralized applications from the accelerating threat of quantum computing, without compromising performance or usability.
                </p>
                <p>
                  As quantum machines advance toward breaking classical cryptography, Dytallix offers a future-proof foundation for the decentralized economy. We believe quantum resistance should never come at the cost of innovation, which is why our platform enhances security while unlocking new capabilities for developers and users alike.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-6xl mx-auto mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card className="bg-gray-900 border-gray-800 shadow-lg">
            <CardContent className="p-6 space-y-6">
              <h2 className="text-2xl font-bold text-green-400 mb-6">Frequently Asked Questions</h2>
              
              <div className="space-y-4">
                {faqData.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="border border-gray-700 rounded-lg overflow-hidden"
                  >
                    <Button
                      variant="ghost"
                      onClick={() => toggleItem(index)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-800 transition-colors rounded-none h-auto"
                    >
                      <span className="font-semibold text-white">{item.question}</span>
                      {openItems.includes(index) ? (
                        <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </Button>
                    
                    {openItems.includes(index) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="px-4 pb-4"
                      >
                        <div className="pt-2 border-t border-gray-700">
                          <p className="text-gray-300 leading-relaxed">{item.answer}</p>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Technical Specifications */}
      <section className="max-w-6xl mx-auto mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="bg-gray-900 border-gray-800 shadow-lg">
            <CardContent className="p-6 space-y-6">
              <h2 className="text-2xl font-bold text-purple-400 mb-6">Technical Specifications</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="space-y-6"
                >
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h4 className="font-semibold text-white mb-3 text-lg">Post-Quantum Cryptography</h4>
                    <ul className="text-gray-300 text-sm space-y-2">
                      <li className="flex items-center"><span className="text-purple-400 mr-2">•</span> CRYSTALS-Dilithium (Digital Signatures)</li>
                      <li className="flex items-center"><span className="text-purple-400 mr-2">•</span> Falcon (Compact Signatures)</li>
                      <li className="flex items-center"><span className="text-purple-400 mr-2">•</span> SPHINCS+ (Stateless Hash-based Signatures)</li>
                      <li className="flex items-center"><span className="text-purple-400 mr-2">•</span> Kyber (Key Encapsulation)</li>
                    </ul>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h4 className="font-semibold text-white mb-3 text-lg">Consensus</h4>
                    <ul className="text-gray-300 text-sm space-y-2">
                      <li className="flex items-center"><span className="text-purple-400 mr-2">•</span> Quantum-Proof Delegated Proof of Stake</li>
                      <li className="flex items-center"><span className="text-purple-400 mr-2">•</span> 3-second block times</li>
                      <li className="flex items-center"><span className="text-purple-400 mr-2">•</span> 10,000+ TPS capacity</li>
                      <li className="flex items-center"><span className="text-purple-400 mr-2">•</span> Instant finality</li>
                    </ul>
                  </div>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="space-y-6"
                >
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h4 className="font-semibold text-white mb-3 text-lg">AI Features</h4>
                    <ul className="text-gray-300 text-sm space-y-2">
                      <li className="flex items-center"><span className="text-purple-400 mr-2">•</span> Real-time anomaly detection</li>
                      <li className="flex items-center"><span className="text-purple-400 mr-2">•</span> Automated contract auditing</li>
                      <li className="flex items-center"><span className="text-purple-400 mr-2">•</span> Predictive threat analysis</li>
                      <li className="flex items-center"><span className="text-purple-400 mr-2">•</span> Risk scoring algorithms</li>
                    </ul>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h4 className="font-semibold text-white mb-3 text-lg">Development</h4>
                    <ul className="text-gray-300 text-sm space-y-2">
                      <li className="flex items-center"><span className="text-purple-400 mr-2">•</span> EVM Compatible</li>
                      <li className="flex items-center"><span className="text-purple-400 mr-2">•</span> Solidity Support</li>
                      <li className="flex items-center"><span className="text-purple-400 mr-2">•</span> Web3.js Integration</li>
                      <li className="flex items-center"><span className="text-purple-400 mr-2">•</span> Quantum-safe SDKs</li>
                    </ul>
                  </div>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Contact Information */}
      <section className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Card className="bg-gray-900 border-gray-800 shadow-lg">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-2xl font-bold text-orange-400 mb-6">Get In Touch</h2>
              <div className="text-gray-300">
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h4 className="font-semibold text-white mb-3 text-lg">Contact Us</h4>
                  <Button
                    variant="outline"
                    className="border-orange-500/50 text-orange-400 hover:bg-orange-500/20"
                    onClick={() => window.location.href = 'mailto:hello@dytallix.com'}
                  >
                    hello@dytallix.com
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </main>
  )
}
