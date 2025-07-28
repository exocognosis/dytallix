import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "../components/ui/card";
import {
  ShieldCheckIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  CogIcon
} from "@heroicons/react/24/outline";

const aiModules = [
  {
    id: "sentinel",
    name: "Network Sentinel",
    icon: ShieldCheckIcon,
    tagline: "Advanced Anomaly Detection & Fraud Prevention",
    description: "Real-time network monitoring using Isolation Forest and Autoencoder models for comprehensive threat detection.",
    functions: [
      "Real-time fraud detection and prevention",
      "Bot identification and behavioral analysis", 
      "Transaction pattern anomaly detection",
      "Network security monitoring"
    ],
    industries: [
      {
        name: "Financial Services",
        useCases: ["Credit card fraud detection", "Money laundering prevention", "High-frequency trading monitoring"]
      },
      {
        name: "E-commerce",
        useCases: ["Payment fraud prevention", "Account takeover detection", "Suspicious user behavior analysis"]
      },
      {
        name: "Gaming & Digital Assets",
        useCases: ["Bot detection in games", "Virtual asset theft prevention", "Account security monitoring"]
      }
    ],
    metrics: "63% accuracy on synthetic data • 10-50 epochs training",
    color: "from-red-500 to-orange-500"
  },
  {
    id: "feeflow",
    name: "FeeFlow Optimizer", 
    icon: ChartBarIcon,
    tagline: "Intelligent Gas Fee Prediction & Network Optimization",
    description: "LSTM and Reinforcement Learning models provide multi-horizon fee predictions and dynamic network optimization.",
    functions: [
      "Gas fee prediction across multiple time horizons",
      "Network congestion analysis and forecasting",
      "Dynamic fee optimization strategies",
      "Transaction timing recommendations"
    ],
    industries: [
      {
        name: "DeFi Platforms",
        useCases: ["Optimal transaction timing", "Yield farming optimization", "MEV protection strategies"]
      },
      {
        name: "Enterprise Blockchain",
        useCases: ["Cost-effective batch processing", "Supply chain transaction optimization", "Smart contract deployment timing"]
      },
      {
        name: "NFT Marketplaces",
        useCases: ["Minting cost optimization", "Trading fee minimization", "Auction timing strategies"]
      }
    ],
    metrics: "MSE 43.10 • 100-300 epochs • 180 days synthetic data",
    color: "from-blue-500 to-cyan-500"
  },
  {
    id: "wallet_classifier",
    name: "Wallet Classifier",
    icon: UserGroupIcon,
    tagline: "Advanced User Behavior Analysis & Risk Profiling",
    description: "XGBoost and Multi-Layer Perceptron models classify user behavior across 7 wallet categories with 90% accuracy.",
    functions: [
      "User behavior classification and profiling",
      "Risk assessment and compliance scoring", 
      "Behavioral pattern analysis",
      "Regulatory compliance automation"
    ],
    industries: [
      {
        name: "Banking & Finance",
        useCases: ["KYC/AML compliance", "Customer risk assessment", "Suspicious activity reporting"]
      },
      {
        name: "Insurance",
        useCases: ["Fraud detection", "Policy risk assessment", "Claims processing automation"]
      },
      {
        name: "Regulatory Compliance",
        useCases: ["Automated compliance monitoring", "Risk-based transaction monitoring", "Regulatory reporting"]
      }
    ],
    metrics: "90% accuracy • 20-100 epochs • 7 wallet categories",
    color: "from-purple-500 to-pink-500"
  },
  {
    id: "stake_balancer",
    name: "Stake Balancer",
    icon: CurrencyDollarIcon,
    tagline: "Dynamic Staking Reward Optimization",
    description: "Fuzzy Logic and Reinforcement Learning optimize stake rewards through dynamic rate adjustments and validator performance evaluation.",
    functions: [
      "Dynamic stake reward rate optimization",
      "Validator performance evaluation and ranking",
      "Economic incentive balancing",
      "Network participation optimization"
    ],
    industries: [
      {
        name: "Proof-of-Stake Networks",
        useCases: ["Validator selection optimization", "Delegation strategies", "Network security maximization"]
      },
      {
        name: "DeFi Yield Farming",
        useCases: ["Liquidity pool optimization", "Reward token distribution", "Staking pool management"]
      },
      {
        name: "Enterprise Consortiums",
        useCases: ["Consortium member incentives", "Resource allocation optimization", "Governance participation rewards"]
      }
    ],
    metrics: "0.59 avg reward • 1000 episodes • DQN/PPO models",
    color: "from-green-500 to-emerald-500"
  },
  {
    id: "govsim",
    name: "GovSim",
    icon: UserGroupIcon,
    tagline: "Governance Simulation & Democratic Prediction",
    description: "Bayesian Networks and Agent-Based Modeling predict governance outcomes with 80% historical accuracy.",
    functions: [
      "Proposal outcome prediction and analysis",
      "Voter behavior modeling and simulation",
      "Coalition formation analysis",
      "Democratic process optimization"
    ],
    industries: [
      {
        name: "DAO Governance",
        useCases: ["Proposal success prediction", "Voter engagement optimization", "Governance token distribution"]
      },
      {
        name: "Corporate Governance",
        useCases: ["Shareholder voting prediction", "Board decision modeling", "Stakeholder analysis"]
      },
      {
        name: "Public Policy",
        useCases: ["Policy impact simulation", "Public opinion modeling", "Election outcome prediction"]
      }
    ],
    metrics: "80% prediction accuracy • 100 Monte Carlo iterations • 1000 voters",
    color: "from-indigo-500 to-blue-500"
  },
  {
    id: "eco_sentinel",
    name: "Economic Sentinel",
    icon: ExclamationTriangleIcon,
    tagline: "Economic Risk Forecasting & Market Intelligence",
    description: "Random Forest and ARIMA time series models provide comprehensive economic risk assessment and volatility prediction.",
    functions: [
      "Economic risk assessment and forecasting",
      "Market volatility prediction and analysis",
      "Cross-market correlation monitoring",
      "Systemic risk early warning system"
    ],
    industries: [
      {
        name: "Hedge Funds & Trading",
        useCases: ["Risk management", "Portfolio optimization", "Market crash prediction"]
      },
      {
        name: "Central Banking",
        useCases: ["Monetary policy impact assessment", "Economic stability monitoring", "Crisis prediction"]
      },
      {
        name: "Corporate Treasury",
        useCases: ["Treasury risk management", "Currency hedging strategies", "Economic exposure assessment"]
      }
    ],
    metrics: "MAE 0.59 • 365 days synthetic data • Random Forest + ARIMA",
    color: "from-yellow-500 to-orange-500"
  },
  {
    id: "quantum_shield",
    name: "Quantum Shield", 
    icon: LockClosedIcon,
    tagline: "Post-Quantum Cryptography Management",
    description: "Rule-based systems and Reinforcement Learning manage cryptographic transitions and quantum threat assessment.",
    functions: [
      "Post-quantum algorithm selection and optimization",
      "Cryptographic migration planning and execution",
      "Quantum threat assessment and monitoring",
      "Security protocol recommendations"
    ],
    industries: [
      {
        name: "Cybersecurity",
        useCases: ["Quantum-safe encryption deployment", "Security audit automation", "Threat assessment"]
      },
      {
        name: "Government & Defense",
        useCases: ["National security communications", "Classified data protection", "Infrastructure hardening"]
      },
      {
        name: "Healthcare",
        useCases: ["Patient data protection", "Medical device security", "Compliance automation"]
      }
    ],
    metrics: "85% entropy quality • 1000 episodes • Rule-based + RL",
    color: "from-gray-500 to-slate-500"
  },
  {
    id: "proto_tuner",
    name: "Protocol Tuner",
    icon: CogIcon,
    tagline: "Multi-Objective Protocol Optimization",
    description: "Bayesian Optimization and Multi-Objective Learning find optimal protocol parameters across complex trade-offs.",
    functions: [
      "Multi-objective protocol parameter optimization",
      "Pareto frontier analysis and solution ranking",
      "Implementation planning and rollout strategies",
      "Performance vs. security trade-off optimization"
    ],
    industries: [
      {
        name: "Blockchain Infrastructure",
        useCases: ["Consensus mechanism optimization", "Network parameter tuning", "Scalability improvements"]
      },
      {
        name: "IoT & Edge Computing",
        useCases: ["Protocol efficiency optimization", "Power consumption balancing", "Latency minimization"]
      },
      {
        name: "Telecommunications",
        useCases: ["Network protocol optimization", "QoS parameter tuning", "Bandwidth allocation"]
      }
    ],
    metrics: "87% convergence • 200 trials • 9 Pareto solutions",
    color: "from-teal-500 to-cyan-500"
  }
];

export const EnterpriseAI: React.FC = () => {
  return (
    <main className="bg-black text-white min-h-screen px-6 py-12">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto text-center space-y-6">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-bold tracking-tight"
        >
          Enterprise AI Modules
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-lg md:text-xl text-gray-300 max-w-4xl mx-auto"
        >
          Dytallix's comprehensive suite of 8 specialized AI modules provides advanced automation, 
          optimization, and intelligence capabilities for blockchain networks and enterprise applications.
        </motion.p>
      </section>

      {/* AI Modules Grid */}
      <section className="max-w-7xl mx-auto mt-16">
        <div className="space-y-16">
          {aiModules.map((module, index) => (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              className="relative"
            >
              <Card className="bg-gray-900 border-gray-800 shadow-2xl overflow-hidden">
                <CardContent className="p-8">
                  <div className="grid lg:grid-cols-2 gap-8">
                    {/* Module Info */}
                    <div className="space-y-6">
                      <div className="flex items-center space-x-4">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${module.color} flex items-center justify-center`}>
                          <module.icon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-white">{module.name}</h2>
                          <p className="text-gray-400">{module.tagline}</p>
                        </div>
                      </div>
                      
                      <p className="text-gray-300 leading-relaxed">{module.description}</p>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Core Functions</h3>
                        <ul className="space-y-2">
                          {module.functions.map((func, i) => (
                            <li key={i} className="flex items-start space-x-3">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                              <span className="text-gray-300">{func}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="bg-gray-800 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">Performance Metrics</h4>
                        <p className="text-sm text-gray-300">{module.metrics}</p>
                      </div>
                    </div>

                    {/* Industry Applications */}
                    <div className="space-y-6">
                      <h3 className="text-xl font-semibold text-white">Industry Applications</h3>
                      <div className="space-y-6">
                        {module.industries.map((industry, i) => (
                          <div key={i} className="bg-gray-800 rounded-lg p-5">
                            <h4 className="text-lg font-semibold text-white mb-3">{industry.name}</h4>
                            <ul className="space-y-2">
                              {industry.useCases.map((useCase, j) => (
                                <li key={j} className="flex items-start space-x-3">
                                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                  <span className="text-gray-300 text-sm">{useCase}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Integration Section */}
      <section className="max-w-7xl mx-auto mt-24">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center space-y-8"
        >
          <h2 className="text-3xl md:text-4xl font-bold">Integrated AI Ecosystem</h2>
          <p className="text-lg text-gray-300 max-w-4xl mx-auto">
            Our AI modules work together as a cohesive system, sharing insights and optimizing 
            performance across the entire blockchain network. Modular architecture allows 
            selective deployment based on your specific enterprise needs.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {[
              { title: "Real-time Processing", desc: "Sub-second response times for critical decisions" },
              { title: "Scalable Architecture", desc: "Handles enterprise-grade transaction volumes" },
              { title: "Quantum-Safe Security", desc: "Post-quantum cryptography integration" },
              { title: "Cross-Module Intelligence", desc: "Modules share insights for enhanced performance" }
            ].map((feature, i) => (
              <Card key={i} className="bg-gray-900 border-gray-800">
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto mt-24 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8"
        >
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Deploy Enterprise AI?</h2>
          <p className="text-blue-100 mb-6">
            Contact our team to discuss how Dytallix's AI modules can optimize your blockchain infrastructure 
            and provide advanced automation for your enterprise applications.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a 
              href="mailto:enterprise@dytallix.com" 
              className="bg-white text-blue-600 px-8 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
            >
              Contact Enterprise Team
            </a>
            <a 
              href="/docs" 
              className="border border-white text-white px-8 py-3 rounded-xl font-semibold hover:bg-white hover:text-blue-600 transition-colors"
            >
              View Documentation
            </a>
          </div>
        </motion.div>
      </section>
    </main>
  );
};
