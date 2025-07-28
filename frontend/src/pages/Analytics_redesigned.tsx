import { 
  ChartBarIcon, 
  BoltIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { motion } from 'framer-motion';
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export function Analytics() {
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
            <ChartBarIcon className="w-12 h-12 mr-4" />
            AI Analytics
          </h1>
          <p className="text-lg text-gray-300">
            Advanced AI-powered analytics for threat detection, market insights, and quantum security monitoring
          </p>
        </motion.div>
      </section>

      {/* AI Health Status */}
      <section className="max-w-6xl mx-auto mb-12">
        <motion.h2 
          initial={{ opacity: 0 }} 
          whileInView={{ opacity: 1 }} 
          viewport={{ once: true }} 
          className="text-2xl font-bold mb-6 text-blue-400"
        >
          AI System Health
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Threat Detection",
              status: "99.7%",
              description: "Active & Monitoring",
              color: "green",
              icon: CheckCircleIcon
            },
            {
              title: "Contract Auditing", 
              status: "100%",
              description: "Real-time Analysis",
              color: "green",
              icon: CheckCircleIcon
            },
            {
              title: "Model Training",
              status: "Training",
              description: "Next-gen algorithms",
              color: "blue",
              icon: BoltIcon
            }
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
            >
              <Card className={`border shadow-lg ${
                item.color === 'green' 
                  ? 'bg-green-900/20 border-green-700' 
                  : 'bg-blue-900/20 border-blue-700'
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-semibold ${
                      item.color === 'green' ? 'text-green-400' : 'text-blue-400'
                    }`}>
                      {item.title}
                    </span>
                    <item.icon className={`w-5 h-5 ${
                      item.color === 'green' ? 'text-green-400' : 'text-blue-400'
                    }`} />
                  </div>
                  <div className="text-2xl font-bold text-white">{item.status}</div>
                  <div className="text-sm text-gray-400">{item.description}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Threat Analytics */}
      <section className="max-w-6xl mx-auto mb-12">
        <motion.h2 
          initial={{ opacity: 0 }} 
          whileInView={{ opacity: 1 }} 
          viewport={{ once: true }} 
          className="text-2xl font-bold mb-6 text-red-400"
        >
          Threat Analytics
        </motion.h2>
        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-gray-900 border-gray-800 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <ShieldCheckIcon className="w-5 h-5 mr-2" />
                  Security Threats Detected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-red-900/20 border border-red-700 rounded-lg">
                    <div>
                      <div className="font-medium text-red-400">Suspicious Transaction Pattern</div>
                      <div className="text-sm text-gray-400">Flagged for manual review</div>
                    </div>
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                    <div>
                      <div className="font-medium text-yellow-400">High-Risk Address Activity</div>
                      <div className="text-sm text-gray-400">Monitoring increased</div>
                    </div>
                    <EyeIcon className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-900/20 border border-green-700 rounded-lg">
                    <div>
                      <div className="font-medium text-green-400">Network Secure</div>
                      <div className="text-sm text-gray-400">All systems normal</div>
                    </div>
                    <CheckCircleIcon className="w-5 h-5 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-gray-900 border-gray-800 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <CpuChipIcon className="w-5 h-5 mr-2" />
                  Smart Contract Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">47</div>
                      <div className="text-sm text-gray-400">Contracts Audited</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">12</div>
                      <div className="text-sm text-gray-400">Vulnerabilities Fixed</div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-sm text-gray-400 mb-2">Security Score Distribution</div>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <div className="w-20 text-sm text-gray-400">High:</div>
                        <div className="flex-1 bg-gray-700 rounded-full h-2">
                          <div className="bg-green-400 h-2 rounded-full" style={{ width: '85%' }}></div>
                        </div>
                        <div className="w-12 text-sm text-gray-400 text-right">85%</div>
                      </div>
                      <div className="flex items-center">
                        <div className="w-20 text-sm text-gray-400">Medium:</div>
                        <div className="flex-1 bg-gray-700 rounded-full h-2">
                          <div className="bg-yellow-400 h-2 rounded-full" style={{ width: '12%' }}></div>
                        </div>
                        <div className="w-12 text-sm text-gray-400 text-right">12%</div>
                      </div>
                      <div className="flex items-center">
                        <div className="w-20 text-sm text-gray-400">Low:</div>
                        <div className="flex-1 bg-gray-700 rounded-full h-2">
                          <div className="bg-red-400 h-2 rounded-full" style={{ width: '3%' }}></div>
                        </div>
                        <div className="w-12 text-sm text-gray-400 text-right">3%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Market Analytics */}
      <section className="max-w-6xl mx-auto mb-12">
        <motion.h2 
          initial={{ opacity: 0 }} 
          whileInView={{ opacity: 1 }} 
          viewport={{ once: true }} 
          className="text-2xl font-bold mb-6 text-cyan-400"
        >
          Market Analytics
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "DYT Price",
              value: "$0.0847",
              change: "+12.5%",
              isPositive: true,
              period: "24h"
            },
            {
              title: "Market Cap", 
              value: "$2.1M",
              change: "+8.3%",
              isPositive: true,
              period: "24h"
            },
            {
              title: "Volume",
              value: "$156K",
              change: "-3.2%",
              isPositive: false,
              period: "24h"
            }
          ].map((metric, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
            >
              <Card className="bg-gray-900 border-gray-800 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">{metric.title}</p>
                      <p className="text-2xl font-bold text-white">{metric.value}</p>
                      <p className={`text-sm ${metric.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {metric.change} ({metric.period})
                      </p>
                    </div>
                    <ArrowTrendingUpIcon className={`w-8 h-8 ${metric.isPositive ? 'text-green-400' : 'text-red-400'}`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Quantum Security Analytics */}
      <section className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Card className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-700/50 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <ShieldCheckIcon className="w-6 h-6 mr-2" />
                Quantum Security Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-400">100%</div>
                  <div className="text-sm text-purple-200">Quantum Resistance</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400">3</div>
                  <div className="text-sm text-blue-200">PQC Algorithms Active</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-cyan-400">0</div>
                  <div className="text-sm text-cyan-200">Quantum Threats Detected</div>
                </div>
              </div>
              <div className="mt-6 text-center">
                <p className="text-purple-200 mb-4">
                  Your network is fully protected against quantum computing threats with advanced PQC algorithms.
                </p>
                <Button variant="outline" className="border-purple-400 text-purple-400 hover:bg-purple-400/10">
                  View Detailed Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </main>
  )
}
