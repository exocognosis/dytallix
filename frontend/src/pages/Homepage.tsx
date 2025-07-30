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
          Quantum Secure. AI Enhanced. Future Ready.
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-lg md:text-xl text-dashboard-text-muted"
        >
          Dytallix is a next-generation cryptocurrency architected for resilience against quantum computing threats.
        </motion.p>
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.4, duration: 0.6 }}
          className="flex flex-wrap justify-center gap-4"
        >
          <Link to="/dashboard">
            <Button className="text-lg px-8 py-4 rounded-2xl shadow-xl bg-primary-600 hover:bg-primary-700 text-white border-0 glow-green">
              Join the Testnet
            </Button>
          </Link>
          <Link to="/explorer">
            <Button variant="outline" className="text-lg px-8 py-4 rounded-2xl shadow-xl border-dashboard-border-hover text-dashboard-text hover:bg-dashboard-card">
              Explore Blockchain
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto mt-24 grid md:grid-cols-3 gap-6">
        {[
          {
            title: "Post-Quantum Cryptography",
            text: "Implements NIST-approved PQC algorithms (Dilithium, Falcon, SPHINCS+) for digital signatures and key exchange, ensuring resistance to both classical and quantum attacks.",
            color: "text-quantum-400"
          },
          {
            title: "AI Autonomous Modules",
            text: "Employs machine learning for real-time anomaly detection, on-chain fraud analytics, and automated smart contract auditing to proactively mitigate evolving threats.",
            color: "text-primary-400"
          },
          {
            title: "Cross-Chain Bridge",
            text: "Features a modular, crypto-agile architecture supporting seamless algorithm upgrades and integration of emerging cryptographic primitives as new standards evolve.",
            color: "text-primary-500"
          },
        ].map((item, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.6 + i * 0.2, duration: 0.6 }}
          >
            <Card className="bg-dashboard-card border-dashboard-border shadow-lg dashboard-card hover:bg-dashboard-card-hover hover:border-dashboard-border-hover transition-all duration-300">
              <CardContent className="p-6 space-y-3">
                <h3 className={`text-xl font-semibold ${item.color}`}>
                  {item.title}
                </h3>
                <p className="text-dashboard-text-muted">
                  {item.text}
                </p>
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
            { title: "Digital Wallet", link: "/wallet", desc: "Secure quantum-resistant wallet for managing your digital assets", color: "text-primary-400" },
            { title: "Blockchain Explorer", link: "/explorer", desc: "Explore transactions, blocks, and network activity in real-time", color: "text-quantum-400" },
            { title: "Enterprise AI", link: "/enterprise-ai", desc: "8 specialized AI modules for automation and optimization", color: "text-primary-500" },
            { title: "Analytics Dashboard", link: "/analytics", desc: "Advanced market analytics and trading insights", color: "text-quantum-500" },
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

      {/* About Section */}
      <section className="max-w-4xl mx-auto mt-32 text-center space-y-6">
        <motion.h2 
          initial={{ opacity: 0 }} 
          whileInView={{ opacity: 1 }} 
          viewport={{ once: true }} 
          className="text-3xl md:text-4xl font-bold text-dashboard-text"
        >
          Why Dytallix?
        </motion.h2>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="space-y-4"
        >
          <p className="text-dashboard-text-gray text-lg">
            Dytallix is the answer to a looming threat: quantum decryption. We future-proof digital assets through advanced PQC, zero-knowledge systems, and decentralized AI decisioning.
          </p>
          <p className="text-dashboard-text-muted text-lg">
            Our mission is to evolve blockchain before it becomes obsolete.
          </p>
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
            Ready to build the future?
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/wallet">
              <Button className="text-lg px-8 py-4 rounded-2xl shadow-xl bg-primary-600 hover:bg-primary-700 text-white border-0 glow-green">
                Open Wallet
              </Button>
            </Link>
            <Link to="/explorer">
              <Button variant="outline" className="text-lg px-8 py-4 rounded-2xl shadow-xl border-dashboard-border-hover text-dashboard-text hover:bg-dashboard-card">
                Explore the Docs
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
