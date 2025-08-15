import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { motion } from "framer-motion";

export const Homepage: React.FC = () => {
  return (
    <main className="bg-dashboard-bg text-dashboard-text min-h-screen px-6 py-12">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto text-center space-y-6">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-dashboard-text"
        >
          Quantum-Secure.  AI-Enhanced.  Future-Ready.
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-lg md:text-xl text-dashboard-text-muted max-w-4xl mx-auto leading-relaxed"
        >
          Dytallix is an L1 blockchain and post-quantum cryptocurrency, engineered from the ground up to resist quantum attacks and power secure, intelligent applications.
        </motion.p>
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.4, duration: 0.6 }}
          className="flex flex-wrap justify-center gap-4"
        >
          <Link to="/testnet">
            <Button className="text-lg px-8 py-4 rounded-2xl shadow-xl bg-primary-600 hover:bg-primary-700 text-white border-0 glow-green">
              Join the Testnet
            </Button>
          </Link>
          <Link to="/explorer">
            <Button className="text-lg px-8 py-4 rounded-2xl shadow-xl bg-primary-600 hover:bg-primary-700 text-white border-0 glow-green">
              Blockchain Explorer
            </Button>
          </Link>
          <a href="https://discord.gg/fw34A8bK" target="_blank" rel="noopener noreferrer">
            <Button className="text-lg px-8 py-4 rounded-2xl shadow-xl bg-indigo-600 hover:bg-indigo-700 text-white border-0 glow-purple">
              Join the Discord
            </Button>
          </a>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto mt-24 grid md:grid-cols-3 gap-6">
        {[
          {
            title: "Post-Quantum Cryptography",
            text: "Dytallix uses NIST-approved post-quantum algorithms (Dilithium, Falcon, SPHINCS+) to secure signatures and key exchange, making the network quantum-resilient by design.",
            color: "text-quantum-400"
          },
          {
            title: "Autonomous AI Modules",
            text: "Machine learning powers real-time anomaly detection, fraud analytics, and autonomous smart contract auditing, delivering proactive defense against evolving on-chain threats.",
            color: "text-primary-400"
          },
          {
            title: "Cross-Chain Bridge",
            text: "Modular and crypto-agile by design, Dytallix is ready to upgrade algorithms and integrate new cryptographic standards as they emerge.",
            color: "text-primary-500"
          },
        ].map((item, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.6 + i * 0.2, duration: 0.6 }}
            className="h-full"
          >
            <Card className="bg-dashboard-card border-dashboard-border shadow-lg dashboard-card hover:bg-dashboard-card-hover hover:border-dashboard-border-hover transition-all duration-300 h-full min-h-[280px]">
              <CardContent className="p-6 h-full flex flex-col justify-center text-center">
                <div className="space-y-4">
                  <h3 className={`text-xl font-semibold ${item.color}`}>
                    {item.title}
                  </h3>
                  <p className="text-dashboard-text-muted leading-relaxed">
                    {item.text}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </section>

      {/* Platform Features */}
      <section className="max-w-6xl mx-auto mt-24">
        <motion.h2 
          initial={{ opacity: 0 }} 
          whileInView={{ opacity: 1 }} 
          viewport={{ once: true }} 
          className="text-3xl md:text-4xl font-bold text-center mb-12 text-dashboard-text"
        >
          Platform Features
        </motion.h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: "Quantum Wallet", link: "/wallet", desc: "Quantum-resistant wallet for secure digital asset management", color: "text-primary-400" },
            { title: "Testnet Faucet", link: "/faucet", desc: "Get testnet tokens (DGT/DRT) for development and testing", color: "text-quantum-400" },
            { title: "Blockchain Explorer", link: "/explorer", desc: "Explore transactions, blocks, and network activity in real-time", color: "text-quantum-500" },
            { title: "Enterprise AI", link: "/enterprise-ai", desc: " Eight specialized AI modules for intelligent automation and optimization", color: "text-primary-500" },
            { title: "Analytics Dashboard", link: "/analytics", desc: "Real-time market analytics and actionable trading insights", color: "text-quantum-600" },
            { title: "Smart Contracts", link: "/contracts", desc: "Deploy and interact with quantum-safe smart contracts", color: "text-primary-600" },
            { title: "Tokenomics", link: "/tokenomics", desc: "Understand DGT/DRT dual-token economics and governance", color: "text-yellow-400" },
            { title: "Settings", link: "/settings", desc: "Configure your account and security preferences", color: "text-dashboard-text-gray" },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
            >
              <Link to={item.link} className="block">
                <Card className="bg-dashboard-card border-dashboard-border shadow-lg dashboard-card hover:bg-dashboard-card-hover hover:border-dashboard-border-hover transition-all duration-300 group">
                  <CardContent className="p-6 space-y-3">
                    <h4 className={`font-semibold ${item.color} group-hover:opacity-80 mb-1`}>
                      {item.title} →
                    </h4>
                    <p className="text-dashboard-text-gray text-sm">
                      {item.desc}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Why Dytallix Section */}
      <section className="max-w-6xl mx-auto mt-32 space-y-12">
        <motion.div
          initial={{ opacity: 0 }} 
          whileInView={{ opacity: 1 }} 
          viewport={{ once: true }} 
          className="text-center space-y-6"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-dashboard-text">
            Why Dytallix?
          </h2>
          <p className="text-dashboard-text-gray text-lg max-w-3xl mx-auto">
            The quantum threat is real and Dytallix is built to meet it. We secure digital assets with post-quantum cryptography, zero-knowledge privacy, and decentralized AI governance. Our mission: evolve blockchain before it's outpaced by the future.
          </p>
        </motion.div>

        {/* Dynamic Cards showcasing Dytallix virtues */}
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: "Quantum-Resistant Future",
              icon: "🛡️",
              gradient: "from-quantum-400 to-quantum-600",
              description: "Quantum computing is no longer theoretical. IBM and others have already cracked classical encryption. Dytallix counters this with NIST-approved post-quantum cryptography:",
              highlights: [
                "Dilithium & Falcon signatures",
                "SPHINCS+ quantum-secure hashing",
                "PQC key exchange",
                "Crypto-agile, upgrade-ready design"
              ],
              stats: "99.9% resistance to quantum-class attacks"
            },
            {
              title: "On-Chain AI Intelligence",
              icon: "🧠",
              gradient: "from-primary-400 to-primary-600",
              description: "AI runs natively on-chain: enabling real-time threat detection, contract audits, and predictive analytics without centralized control.",
              highlights: [
                "On-chain anomaly detection",
                "Autonomous smart contract audits",
                "Predictive analytics for markets",
                "AI-governed decisioning mechanisms"
              ],
              stats: "8 modular AI systems"
            },
            {
              title: "Uncompromising Security",
              icon: "⚡",
              gradient: "from-yellow-400 to-orange-500",
              description: "Security isn't a layer — it's foundational. Dytallix combines zero-knowledge proofs, multi-sig wallets, and hardware-backed protections to form a next-gen defense stack.",
              highlights: [
                "Zero-knowledge privacy",
                "Multi-signature transaction validation",
                "Hardware-secured key custody",
                "Real-time threat analytics"
              ],
              stats: "Military-grade encryption built in"
            }
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2, duration: 0.6 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="group"
            >
              <Card className="bg-dashboard-card border-dashboard-border shadow-xl dashboard-card hover:bg-dashboard-card-hover hover:border-dashboard-border-hover transition-all duration-500 h-full min-h-[520px] relative overflow-hidden">
                {/* Gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-500`} />
                
                <CardContent className="p-8 h-full flex flex-col justify-center relative z-10">
                  <div className="space-y-6">
                    {/* Icon and title */}
                    <div className="text-center space-y-3">
                      <div className="text-4xl mb-3 transform group-hover:scale-110 transition-transform duration-300">
                        {card.icon}
                      </div>
                      <h3 className="text-xl font-bold text-dashboard-text group-hover:text-primary-400 transition-colors duration-300">
                        {card.title}
                      </h3>
                    </div>

                    {/* Description */}
                    <p className="text-dashboard-text-muted text-sm leading-relaxed text-center">
                      {card.description}
                    </p>

                    {/* Highlights */}
                    <div className="space-y-2">
                      {card.highlights.map((highlight, idx) => (
                        <div key={idx} className="flex items-center space-x-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary-400 group-hover:bg-primary-300 transition-colors duration-300" />
                          <span className="text-dashboard-text-gray">{highlight}</span>
                        </div>
                      ))}
                    </div>

                    {/* Stats */}
                    <div className="pt-4 border-t border-dashboard-border">
                      <div className={`text-center font-semibold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300`}>
                        {card.stats}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-center pt-8"
        >
          <Link to="/about">
            <Button variant="outline" className="text-lg px-8 py-4 rounded-2xl shadow-xl border-dashboard-border-hover text-dashboard-text hover:bg-dashboard-card group">
              Learn More About Our Technology
              <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300">→</span>
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="mt-24 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h3 className="text-2xl font-semibold mb-6 text-dashboard-text">
            Ready to build what’s next?
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/wallet">
              <Button className="text-lg px-8 py-4 rounded-2xl shadow-xl bg-primary-600 hover:bg-primary-700 text-white border-0 glow-green">
                Launch Wallet
              </Button>
            </Link>
            <Link to="/explorer">
              <Button className="text-lg px-8 py-4 rounded-2xl shadow-xl bg-primary-600 hover:bg-primary-700 text-white border-0 glow-green">
                Read the Docs
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Contact */}
      <section className="mt-24 text-center text-dashboard-text-gray text-sm space-y-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="mb-2">
            Interested in partnering to build, promote, or work with us?
          </p>
          <a href="mailto:hello@dytallix.com" className="text-primary-400 hover:text-primary-300 transition-colors">
            hello@dytallix.com
          </a>
          <p className="mt-4">
            © 2025 Dytallix. Quantum-Safe, AI-Enhanced, Future-Ready.
          </p>
        </motion.div>
      </section>
    </main>
  );
};
