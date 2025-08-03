import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { motion } from "framer-motion";

export const TestnetDashboard: React.FC = () => {
  return (
    <main className="bg-dashboard-bg text-dashboard-text min-h-screen px-6 py-12">
      {/* Header */}
      <section className="max-w-6xl mx-auto text-center space-y-6 mb-16">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-primary-400 animate-pulse"></div>
            <span className="text-primary-400 font-mono text-sm uppercase tracking-wider">TESTNET LIVE</span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-dashboard-text">
            Dytallix Testnet Dashboard
          </h1>
          <p className="text-lg md:text-xl text-dashboard-text-muted max-w-3xl mx-auto">
            Experience the future of quantum-resistant blockchain technology. Join our testnet to explore 
            post-quantum cryptography, AI-enhanced security, and next-generation DeFi infrastructure.
          </p>
        </motion.div>
      </section>

      {/* Network Status */}
      <section className="max-w-6xl mx-auto mb-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <h2 className="text-2xl font-bold mb-8 text-dashboard-text">Network Status</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { label: "Chain ID", value: "dytallix-testnet-1", color: "text-quantum-400" },
              { label: "Active Validators", value: "4", color: "text-primary-400" },
              { label: "Block Height", value: "847,293", color: "text-dashboard-text" },
              { label: "Block Time", value: "5.2s", color: "text-dashboard-text" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1, duration: 0.6 }}
              >
                <Card className="bg-dashboard-card border-dashboard-border shadow-lg dashboard-card hover:bg-dashboard-card-hover transition-all duration-300">
                  <CardContent className="p-6 text-center">
                    <div className={`text-2xl font-bold ${stat.color} mb-1`}>
                      {stat.value}
                    </div>
                    <div className="text-dashboard-text-gray text-sm">
                      {stat.label}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Quick Access Links */}
      <section className="max-w-6xl mx-auto mb-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <h2 className="text-2xl font-bold mb-8 text-dashboard-text">Testnet Tools</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Block Explorer",
                description: "Browse blocks, transactions, and network activity",
                url: "http://explorer.dytallix.com",
                internal: "/explorer",
                icon: "🔍",
                color: "text-quantum-400",
                gradient: "from-quantum-400 to-quantum-600"
              },
              {
                title: "Testnet Faucet",
                description: "Get test DGT & DRT tokens for development",
                url: "/faucet",
                internal: "/faucet",
                icon: "💧",
                color: "text-primary-400",
                gradient: "from-primary-400 to-primary-600"
              },
              {
                title: "Quantum Wallet",
                description: "Quantum-resistant wallet for testnet",
                url: "/wallet",
                internal: "/wallet",
                icon: "🔒",
                color: "text-yellow-400",
                gradient: "from-yellow-400 to-orange-500"
              },
              {
                title: "GitHub Repository",
                description: "Explore source code and documentation",
                url: "https://github.com/HisMadRealm/dytallix",
                internal: null,
                icon: "📦",
                color: "text-dashboard-text",
                gradient: "from-gray-400 to-gray-600"
              },
            ].map((tool, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="group"
              >
                {tool.internal ? (
                  <Link to={tool.internal} className="block h-full">
                    <Card className="bg-dashboard-card border-dashboard-border shadow-lg dashboard-card hover:bg-dashboard-card-hover hover:border-dashboard-border-hover transition-all duration-300 h-full relative overflow-hidden">
                      <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
                      <CardContent className="p-6 space-y-4 relative z-10 h-full flex flex-col">
                        <div className="text-center">
                          <div className="text-3xl mb-3 transform group-hover:scale-110 transition-transform duration-300">
                            {tool.icon}
                          </div>
                          <h3 className={`font-semibold ${tool.color} group-hover:opacity-80 mb-2`}>
                            {tool.title} →
                          </h3>
                        </div>
                        <p className="text-dashboard-text-gray text-sm leading-relaxed flex-grow">
                          {tool.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ) : (
                  <a href={tool.url} target="_blank" rel="noopener noreferrer" className="block h-full">
                    <Card className="bg-dashboard-card border-dashboard-border shadow-lg dashboard-card hover:bg-dashboard-card-hover hover:border-dashboard-border-hover transition-all duration-300 h-full relative overflow-hidden">
                      <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
                      <CardContent className="p-6 space-y-4 relative z-10 h-full flex flex-col">
                        <div className="text-center">
                          <div className="text-3xl mb-3 transform group-hover:scale-110 transition-transform duration-300">
                            {tool.icon}
                          </div>
                          <h3 className={`font-semibold ${tool.color} group-hover:opacity-80 mb-2`}>
                            {tool.title} ↗
                          </h3>
                        </div>
                        <p className="text-dashboard-text-gray text-sm leading-relaxed flex-grow">
                          {tool.description}
                        </p>
                      </CardContent>
                    </Card>
                  </a>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Recent Activity */}
      <section className="max-w-6xl mx-auto mb-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <h2 className="text-2xl font-bold mb-8 text-dashboard-text">Recent Testnet Activity</h2>
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Recent Blocks */}
            <Card className="bg-dashboard-card border-dashboard-border shadow-lg dashboard-card">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-quantum-400 mb-4">Latest Blocks</h3>
                <div className="space-y-3">
                  {[
                    { height: "847,293", hash: "0x7a8b9c...def123", txs: 15, time: "2 mins ago" },
                    { height: "847,292", hash: "0x456789...abc012", txs: 23, time: "7 mins ago" },
                    { height: "847,291", hash: "0x123abc...789def", txs: 8, time: "12 mins ago" },
                    { height: "847,290", hash: "0x9e8d7c...654321", txs: 31, time: "17 mins ago" },
                  ].map((block, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-dashboard-border last:border-b-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full bg-primary-400"></div>
                        <div>
                          <div className="font-mono text-sm text-dashboard-text">#{block.height}</div>
                          <div className="font-mono text-xs text-dashboard-text-gray">{block.hash}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-dashboard-text">{block.txs} txs</div>
                        <div className="text-xs text-dashboard-text-gray">{block.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="bg-dashboard-card border-dashboard-border shadow-lg dashboard-card">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-primary-400 mb-4">Recent Transactions</h3>
                <div className="space-y-3">
                  {[
                    { hash: "0xabc123...def456", type: "Transfer", amount: "1,250 DGT", time: "1 min ago" },
                    { hash: "0x789xyz...123abc", type: "Contract", amount: "500 DGT", time: "3 mins ago" },
                    { hash: "0x456def...789ghi", type: "Stake", amount: "10,000 DGT", time: "5 mins ago" },
                    { hash: "0x123ghi...456jkl", type: "Transfer", amount: "750 DGT", time: "8 mins ago" },
                  ].map((tx, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-dashboard-border last:border-b-0">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          tx.type === 'Transfer' ? 'bg-quantum-400' : 
                          tx.type === 'Contract' ? 'bg-yellow-400' : 'bg-primary-400'
                        }`}></div>
                        <div>
                          <div className="font-mono text-sm text-dashboard-text">{tx.hash}</div>
                          <div className="text-xs text-dashboard-text-gray">{tx.type}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-dashboard-text">{tx.amount}</div>
                        <div className="text-xs text-dashboard-text-gray">{tx.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </section>

      {/* Testnet Features */}
      <section className="max-w-6xl mx-auto mb-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1.0, duration: 0.6 }}
        >
          <h2 className="text-2xl font-bold mb-8 text-dashboard-text">Testnet Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Post-Quantum Security",
                description: "Test Dilithium and Falcon signatures in a live environment",
                icon: "🛡️",
                features: ["NIST-approved algorithms", "Quantum-resistant keys", "Future-proof signatures"]
              },
              {
                title: "AI-Enhanced Operations",
                description: "Experience autonomous threat detection and smart contract auditing",
                icon: "🧠",
                features: ["Real-time monitoring", "Anomaly detection", "Automated audits"]
              },
              {
                title: "Developer Tools",
                description: "Complete toolkit for quantum-safe dApp development",
                icon: "⚡",
                features: ["WebAssembly runtime", "Smart contracts", "Cross-chain bridges"]
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2, duration: 0.6 }}
                whileHover={{ y: -5 }}
                className="group"
              >
                <Card className="bg-dashboard-card border-dashboard-border shadow-lg dashboard-card hover:bg-dashboard-card-hover hover:border-dashboard-border-hover transition-all duration-300 h-full">
                  <CardContent className="p-6 space-y-4">
                    <div className="text-center space-y-3">
                      <div className="text-3xl transform group-hover:scale-110 transition-transform duration-300">
                        {feature.icon}
                      </div>
                      <h3 className="text-lg font-semibold text-dashboard-text">
                        {feature.title}
                      </h3>
                    </div>
                    <p className="text-dashboard-text-muted text-sm leading-relaxed">
                      {feature.description}
                    </p>
                    <div className="space-y-2">
                      {feature.features.map((item, idx) => (
                        <div key={idx} className="flex items-center space-x-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary-400"></div>
                          <span className="text-dashboard-text-gray">{item}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Getting Started */}
      <section className="max-w-6xl mx-auto mb-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="text-center"
        >
          <h2 className="text-2xl font-bold mb-8 text-dashboard-text">Get Started</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/wallet">
              <Button className="text-lg px-8 py-4 rounded-2xl shadow-xl bg-primary-600 hover:bg-primary-700 text-white border-0 glow-green">
                Create Testnet Wallet
              </Button>
            </Link>
            <Link to="/faucet">
              <Button variant="outline" className="text-lg px-8 py-4 rounded-2xl shadow-xl border-dashboard-border-hover text-dashboard-text hover:bg-dashboard-card">
                Get Test Tokens
              </Button>
            </Link>
            <a href="https://github.com/HisMadRealm/dytallix" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="text-lg px-8 py-4 rounded-2xl shadow-xl border-dashboard-border-hover text-dashboard-text hover:bg-dashboard-card">
                View Documentation
              </Button>
            </a>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <section className="mt-24 text-center text-dashboard-text-gray text-sm">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="mb-4">
            🚀 Building the future of quantum-resistant blockchain technology
          </p>
          <p>
            Questions? Join our <a href="https://discord.gg/fw34A8bK" className="text-primary-400 hover:text-primary-300 transition-colors">Discord</a> or email{" "}
            <a href="mailto:hello@dytallix.com" className="text-primary-400 hover:text-primary-300 transition-colors">
              hello@dytallix.com
            </a>
          </p>
        </motion.div>
      </section>
    </main>
  );
};
