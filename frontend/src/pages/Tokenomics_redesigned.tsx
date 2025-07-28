import { 
  CurrencyDollarIcon, 
  ChartPieIcon,
  LockClosedIcon,
  UserGroupIcon,
  TrophyIcon,
  FireIcon,
  ScaleIcon
} from '@heroicons/react/24/outline'
import { motion } from 'framer-motion';
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export function Tokenomics() {
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
            <CurrencyDollarIcon className="w-12 h-12 mr-4" />
            Dual-Token Economy
          </h1>
          <p className="text-lg text-gray-300">
            DGT (Governance) and DRT (Reward) - A comprehensive dual-token economy for the post-quantum era
          </p>
        </motion.div>
      </section>

      {/* Dual Token Overview */}
      <section className="max-w-6xl mx-auto mb-12">
        <div className="grid md:grid-cols-2 gap-6">
          {/* DGT Token */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-gradient-to-br from-blue-900/50 to-blue-700/30 border-blue-700/50 shadow-lg">
              <CardHeader>
                <CardTitle className="text-blue-400 flex items-center">
                  <UserGroupIcon className="w-6 h-6 mr-2" />
                  DGT (Governance Token)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-700/30">
                  <div className="text-3xl font-bold text-white">1B DGT</div>
                  <div className="text-sm text-blue-200">Fixed Total Supply</div>
                  <div className="text-xs text-green-400 mt-1">No Inflation</div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-blue-200">Primary Function</span>
                    <span className="text-blue-400 font-semibold">Governance & Voting</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-200">Supply Model</span>
                    <span className="text-white font-semibold">Fixed Supply</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-200">Voting Power</span>
                    <span className="text-green-400 font-semibold">1 DGT = 1 Vote</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-200">Staking Rewards</span>
                    <span className="text-purple-400 font-semibold">DRT Tokens</span>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-blue-300 font-semibold mb-2">Utility:</h4>
                  <ul className="space-y-1 text-sm text-blue-200">
                    <li>• Protocol governance voting</li>
                    <li>• Validator staking</li>
                    <li>• Treasury allocation decisions</li>
                    <li>• Parameter adjustments</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* DRT Token */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-gradient-to-br from-green-900/50 to-green-700/30 border-green-700/50 shadow-lg">
              <CardHeader>
                <CardTitle className="text-green-400 flex items-center">
                  <TrophyIcon className="w-6 h-6 mr-2" />
                  DRT (Reward Token)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-900/30 rounded-lg p-4 border border-green-700/30">
                  <div className="text-3xl font-bold text-white">∞ DRT</div>
                  <div className="text-sm text-green-200">Inflationary Supply</div>
                  <div className="text-xs text-yellow-400 mt-1">~5% Annual Inflation</div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-green-200">Primary Function</span>
                    <span className="text-green-400 font-semibold">Rewards & Incentives</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-200">Supply Model</span>
                    <span className="text-white font-semibold">Inflationary</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-200">Distribution</span>
                    <span className="text-blue-400 font-semibold">Automated</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-200">Burn Mechanism</span>
                    <span className="text-red-400 font-semibold">Transaction Fees</span>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-green-300 font-semibold mb-2">Utility:</h4>
                  <ul className="space-y-1 text-sm text-green-200">
                    <li>• Staking rewards</li>
                    <li>• Validator incentives</li>
                    <li>• AI service payments</li>
                    <li>• Transaction fee discounts</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Token Distribution */}
      <section className="max-w-6xl mx-auto mb-12">
        <motion.h2 
          initial={{ opacity: 0 }} 
          whileInView={{ opacity: 1 }} 
          viewport={{ once: true }} 
          className="text-2xl font-bold mb-6 text-center"
        >
          DGT Token Distribution
        </motion.h2>
        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-gray-900 border-gray-800 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <ChartPieIcon className="w-5 h-5 mr-2" />
                  Allocation Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: "Community Treasury", percentage: 40, color: "bg-blue-500" },
                    { label: "Staking Rewards", percentage: 25, color: "bg-green-500" },
                    { label: "Development Team", percentage: 15, color: "bg-purple-500" },
                    { label: "Initial Validators", percentage: 10, color: "bg-yellow-500" },
                    { label: "Ecosystem Fund", percentage: 10, color: "bg-cyan-500" }
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1, duration: 0.6 }}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded ${item.color}`}></div>
                        <span className="text-gray-300">{item.label}</span>
                      </div>
                      <span className="text-white font-semibold">{item.percentage}%</span>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <Card className="bg-gray-900 border-gray-800 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <LockClosedIcon className="w-5 h-5 mr-2" />
                  Vesting Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { category: "Community Treasury", vesting: "Unlocked", color: "text-green-400" },
                    { category: "Staking Rewards", vesting: "Linear 4 years", color: "text-blue-400" },
                    { category: "Development Team", vesting: "1 year cliff, 3 year linear", color: "text-purple-400" },
                    { category: "Initial Validators", vesting: "6 month cliff, 2 year linear", color: "text-yellow-400" },
                    { category: "Ecosystem Fund", vesting: "Linear 5 years", color: "text-cyan-400" }
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1, duration: 0.6 }}
                      className="flex flex-col space-y-1"
                    >
                      <div className="text-gray-300 font-medium">{item.category}</div>
                      <div className={`text-sm ${item.color}`}>{item.vesting}</div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Economic Mechanisms */}
      <section className="max-w-6xl mx-auto mb-12">
        <motion.h2 
          initial={{ opacity: 0 }} 
          whileInView={{ opacity: 1 }} 
          viewport={{ once: true }} 
          className="text-2xl font-bold mb-6 text-center"
        >
          Economic Mechanisms
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Staking Mechanism",
              icon: LockClosedIcon,
              color: "blue",
              features: [
                "Lock DGT to secure network",
                "Earn DRT rewards",
                "Validator participation",
                "Slashing protection"
              ]
            },
            {
              title: "Burn Mechanism",
              icon: FireIcon,
              color: "red",
              features: [
                "DRT burned via transaction fees",
                "Deflationary pressure on DRT",
                "Network usage correlation",
                "Automatic burn process"
              ]
            },
            {
              title: "Governance Process",
              icon: ScaleIcon,
              color: "purple",
              features: [
                "DGT holders propose & vote",
                "Quadratic voting system",
                "Minimum quorum requirements",
                "Time-locked execution"
              ]
            }
          ].map((mechanism, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
            >
              <Card className="bg-gray-900 border-gray-800 shadow-lg hover:bg-gray-800 transition-colors">
                <CardHeader>
                  <CardTitle className={`flex items-center ${
                    mechanism.color === 'blue' ? 'text-blue-400' :
                    mechanism.color === 'red' ? 'text-red-400' :
                    'text-purple-400'
                  }`}>
                    <mechanism.icon className="w-5 h-5 mr-2" />
                    {mechanism.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {mechanism.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <div className={`w-2 h-2 rounded-full mt-2 mr-3 ${
                          mechanism.color === 'blue' ? 'bg-blue-400' :
                          mechanism.color === 'red' ? 'bg-red-400' :
                          'bg-purple-400'
                        }`}></div>
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Card className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-blue-700/50 shadow-lg">
            <CardContent className="p-8 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <h3 className="text-2xl font-bold text-white mb-4">
                  Join the Quantum-Safe Economy
                </h3>
                <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                  Participate in governance, earn rewards, and help secure the future of blockchain technology with Dytallix's dual-token system.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Button className="px-8 py-3 text-lg rounded-xl">
                    Start Staking
                  </Button>
                  <Button variant="outline" className="px-8 py-3 text-lg rounded-xl border-blue-400 text-blue-400 hover:bg-blue-400/10">
                    Learn More
                  </Button>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </main>
  )
}
