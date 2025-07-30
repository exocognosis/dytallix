import "keen-slider/keen-slider.min.css";
import React, { useState } from "react";
import { useKeenSlider } from "keen-slider/react";
import { motion } from "framer-motion";
import { Card, CardContent } from "../components/ui/card";
import {
  ShieldCheckIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  CogIcon,
  ChevronLeftIcon,
  ChevronRightIcon
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
  const [currentSlide, setCurrentSlide] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>({
    initial: 0,
    slideChanged(slider) {
      setCurrentSlide(slider.track.details.rel)
    },
    created() {
      setLoaded(true)
    },
    loop: true,
    slides: { perView: 1, spacing: 10 },
  });
  return (
    <main className="bg-black text-white min-h-screen">
      {/* Hero Section - Enterprise AI Ecosystem */}
      <section className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-12">
          {/* Main Hero Content */}
          <div className="space-y-6">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-6xl font-bold tracking-tight"
            >
              Enterprise AI Ecosystem
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-xl md:text-2xl text-gray-300 max-w-5xl mx-auto leading-relaxed"
            >
              Dytallix's intelligent infrastructure deploys 8 specialized AI modules as an interconnected ecosystem, 
              delivering post-quantum security, real-time optimization, and autonomous governance for next-generation blockchain networks.
            </motion.p>
          </div>

          {/* Ecosystem Overview */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="grid lg:grid-cols-2 gap-12 items-start text-left"
          >
            {/* Left - Core Capabilities */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-4">Unified Intelligence Architecture</h2>
                <p className="text-lg text-gray-300 leading-relaxed">
                  Each AI module operates as both an independent specialist and a collaborative participant in Dytallix's 
                  distributed intelligence network. Cross-module data sharing and consensus mechanisms enable emergent 
                  behaviors that exceed the sum of individual components.
                </p>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white">Enterprise-Grade Performance</h3>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-300">Sub-second response times for mission-critical decisions</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-300">Quantum-resistant cryptographic foundation</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-300">Autonomous scaling for enterprise transaction volumes</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-300">Modular deployment for selective enterprise integration</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right - Intelligence Modules Grid */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white text-center lg:text-left">Cross-Module Intelligence Matrix</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { 
                    title: "Threat Intelligence", 
                    desc: "Network Sentinel + Economic Sentinel collaborative risk assessment",
                    color: "from-red-500 to-orange-500"
                  },
                  { 
                    title: "Optimization Engine", 
                    desc: "FeeFlow + Protocol Tuner dynamic parameter adjustment",
                    color: "from-blue-500 to-cyan-500"
                  },
                  { 
                    title: "Governance Nexus", 
                    desc: "GovSim + Stake Balancer democratic consensus optimization",
                    color: "from-purple-500 to-pink-500"
                  },
                  { 
                    title: "Security Protocol", 
                    desc: "Quantum Shield + Wallet Classifier identity verification",
                    color: "from-gray-500 to-slate-500"
                  }
                ].map((module, i) => (
                  <Card key={i} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
                    <CardContent className="p-4">
                      <div className={`w-full h-2 rounded-full bg-gradient-to-r ${module.color} mb-3`}></div>
                      <h4 className="text-sm font-semibold text-white mb-2">{module.title}</h4>
                      <p className="text-gray-400 text-xs leading-relaxed">{module.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-4 border border-blue-800/50">
                <h4 className="text-sm font-semibold text-blue-300 mb-2">Autonomous Intelligence</h4>
                <p className="text-blue-200 text-xs">
                  Real-time module orchestration enables predictive threat mitigation, 
                  adaptive resource allocation, and self-optimizing network parameters 
                  without human intervention.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <hr className="border-gray-800 my-16" />

      {/* AI Modules Grid */}
      <section className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">AI Modules Overview</h2>
        <p className="text-lg text-gray-300 text-center mb-12 max-w-3xl mx-auto">
          Explore Dytallix's modular AI components designed to address security, optimization, compliance, and governance in decentralized networks.
        </p>
        
        <div className="text-center mb-6">
          <span className="text-gray-400 text-sm">
            {currentSlide + 1} of {aiModules.length} AI Modules
          </span>
        </div>
        
        {/* Container with padding for external arrows */}
        <div className="px-12 md:px-16">
          <div className="relative">
          {/* Navigation Arrows - Outside the slider */}
          {loaded && instanceRef.current && (
            <>
              <button
                onClick={(e: any) =>
                  e.stopPropagation() || instanceRef.current?.prev()
                }
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 md:-translate-x-12 text-gray-500 hover:text-gray-300 transition-colors duration-200 z-10"
                aria-label="Previous slide"
              >
                <ChevronLeftIcon className="w-6 h-6 md:w-8 md:h-8" />
              </button>
              <button
                onClick={(e: any) =>
                  e.stopPropagation() || instanceRef.current?.next()
                }
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 md:translate-x-12 text-gray-500 hover:text-gray-300 transition-colors duration-200 z-10"
                aria-label="Next slide"
              >
                <ChevronRightIcon className="w-6 h-6 md:w-8 md:h-8" />
              </button>
            </>
          )}
          
          <div className="keen-slider" ref={sliderRef}>
            {aiModules.map((module, index) => (
              <div className="keen-slider__slide" key={module.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                  className="relative px-4"
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
                            <h2 className="text-3xl font-bold text-white">{module.name}</h2>
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
            </div>
          ))}
        </div>
        
        {/* Dots Indicator */}
        {loaded && instanceRef.current && (
          <div className="flex justify-center mt-8 space-x-3">
            {aiModules.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  instanceRef.current?.moveToIdx(idx)
                }}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  currentSlide === idx 
                    ? "bg-blue-500 scale-125 shadow-lg" 
                    : "bg-gray-600 hover:bg-gray-500 hover:scale-110"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
        </div>
      </section>

      <hr className="border-gray-800 my-16" />

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto text-center py-16 px-4 sm:px-6 lg:px-8">
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

      <hr className="border-gray-800 my-16" />
    </main>
  );
};
