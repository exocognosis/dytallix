import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { 
  XMarkIcon, 
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { motion } from 'framer-motion'

interface AIAuditModalProps {
  isOpen: boolean
  onClose: () => void
  contractAddress?: string
  contractCode?: string
}

interface AuditResult {
  overall_score: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  summary: string
  risks: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical'
    title: string
    description: string
    recommendation: string
    line?: number
  }>
  suggestions: Array<{
    type: 'security' | 'optimization' | 'best_practice'
    title: string
    description: string
    impact: string
  }>
  quantum_safety: {
    score: number
    algorithms_detected: string[]
    compliance: boolean
    recommendations: string[]
  }
}

export function AIAuditModal({ isOpen, onClose, contractAddress, contractCode }: AIAuditModalProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'risks' | 'suggestions' | 'quantum'>('overview')

  useEffect(() => {
    if (isOpen && (contractAddress || contractCode)) {
      performAudit()
    }
  }, [isOpen, contractAddress, contractCode])

  const performAudit = async () => {
    setIsAnalyzing(true)
    setAuditResult(null)

    try {
      // Simulate AI audit process
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Mock audit result
      const mockResult: AuditResult = {
        overall_score: 85,
        risk_level: 'medium',
        summary: 'This smart contract shows good security practices with post-quantum cryptography implementation. Some areas for improvement have been identified, particularly around access control and input validation.',
        risks: [
          {
            severity: 'medium',
            title: 'Insufficient Access Control',
            description: 'Some functions lack proper access control mechanisms which could lead to unauthorized access.',
            recommendation: 'Implement role-based access control using OpenZeppelin AccessControl.',
            line: 45
          },
          {
            severity: 'low',
            title: 'Missing Event Emissions',
            description: 'Critical state changes are not properly logged through events.',
            recommendation: 'Add event emissions for all state-changing functions.',
            line: 78
          },
          {
            severity: 'low',
            title: 'Potential Integer Overflow',
            description: 'Arithmetic operations without proper overflow checks detected.',
            recommendation: 'Use SafeMath library or Solidity 0.8+ built-in overflow protection.',
            line: 102
          }
        ],
        suggestions: [
          {
            type: 'security',
            title: 'Implement Circuit Breaker Pattern',
            description: 'Add emergency pause functionality to halt contract operations if needed.',
            impact: 'Significantly improves contract security and risk management'
          },
          {
            type: 'optimization',
            title: 'Gas Optimization Opportunities',
            description: 'Several functions can be optimized to reduce gas consumption.',
            impact: 'Can reduce transaction costs by approximately 15-20%'
          },
          {
            type: 'best_practice',
            title: 'Enhanced Documentation',
            description: 'Add comprehensive NatSpec documentation for all public functions.',
            impact: 'Improves code maintainability and developer experience'
          }
        ],
        quantum_safety: {
          score: 95,
          algorithms_detected: ['Dilithium', 'SPHINCS+'],
          compliance: true,
          recommendations: [
            'Consider implementing hybrid classical-quantum signatures for backward compatibility',
            'Ensure key rotation mechanisms are in place',
            'Regular quantum resistance audits recommended'
          ]
        }
      }

      setAuditResult(mockResult)
    } catch (error) {
      console.error('Audit failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getRiskColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-900/20 border-red-700'
      case 'high': return 'text-orange-400 bg-orange-900/20 border-orange-700'
      case 'medium': return 'text-yellow-400 bg-yellow-900/20 border-yellow-700'
      case 'low': return 'text-blue-400 bg-blue-900/20 border-blue-700'
      default: return 'text-gray-400 bg-gray-900/20 border-gray-700'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400'
    if (score >= 70) return 'text-yellow-400'
    if (score >= 50) return 'text-orange-400'
    return 'text-red-400'
  }

  const resetModal = () => {
    setIsAnalyzing(false)
    setAuditResult(null)
    setSelectedTab('overview')
  }

  const handleClose = () => {
    onClose()
    resetModal()
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-gray-900 p-6 text-left align-middle shadow-xl transition-all border border-gray-800">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-white flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <SparklesIcon className="w-6 h-6 mr-2 text-green-400" />
                    AI-Powered Smart Contract Audit
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-white"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </Dialog.Title>

                <div className="mt-6">
                  {isAnalyzing && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-12"
                    >
                      <SparklesIcon className="w-16 h-16 mx-auto text-green-400 animate-pulse mb-6" />
                      <h3 className="text-2xl font-semibold text-white mb-4">Analyzing Smart Contract...</h3>
                      <p className="text-gray-400 mb-6">Our AI is performing a comprehensive security audit</p>
                      <div className="max-w-md mx-auto">
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                          <span>Scanning for vulnerabilities</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500 mt-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          <span>Checking quantum safety</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500 mt-2">
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                          <span>Generating recommendations</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {auditResult && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {/* Audit Score Overview */}
                      <Card className="bg-gray-800 border-gray-700 mb-6">
                        <CardContent className="p-6">
                          <div className="grid md:grid-cols-3 gap-6">
                            <div className="text-center">
                              <div className={`text-4xl font-bold ${getScoreColor(auditResult.overall_score)}`}>
                                {auditResult.overall_score}/100
                              </div>
                              <div className="text-gray-400">Overall Security Score</div>
                            </div>
                            <div className="text-center">
                              <div className={`text-4xl font-bold ${getScoreColor(auditResult.quantum_safety.score)}`}>
                                {auditResult.quantum_safety.score}/100
                              </div>
                              <div className="text-gray-400">Quantum Safety Score</div>
                            </div>
                            <div className="text-center">
                              <div className={`text-2xl font-bold ${getRiskColor(auditResult.risk_level).split(' ')[0]}`}>
                                {auditResult.risk_level.toUpperCase()}
                              </div>
                              <div className="text-gray-400">Risk Level</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Tab Navigation */}
                      <div className="border-b border-gray-700 mb-6">
                        <nav className="flex space-x-8">
                          {[
                            { id: 'overview', label: 'Overview', icon: InformationCircleIcon },
                            { id: 'risks', label: 'Security Risks', icon: ExclamationTriangleIcon },
                            { id: 'suggestions', label: 'Suggestions', icon: CheckCircleIcon },
                            { id: 'quantum', label: 'Quantum Safety', icon: ShieldCheckIcon }
                          ].map((tab) => (
                            <button
                              key={tab.id}
                              onClick={() => setSelectedTab(tab.id as any)}
                              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                                selectedTab === tab.id
                                  ? 'border-green-400 text-green-400'
                                  : 'border-transparent text-gray-400 hover:text-gray-300'
                              }`}
                            >
                              <tab.icon className="w-4 h-4" />
                              <span>{tab.label}</span>
                            </button>
                          ))}
                        </nav>
                      </div>

                      {/* Tab Content */}
                      <div className="min-h-[300px]">
                        {selectedTab === 'overview' && (
                          <Card className="bg-gray-800 border-gray-700">
                            <CardHeader>
                              <CardTitle className="text-white">Audit Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-gray-300 leading-relaxed">{auditResult.summary}</p>
                              <div className="mt-6 grid md:grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-semibold text-white mb-2">Key Findings</h4>
                                  <ul className="space-y-1">
                                    <li className="text-green-400 text-sm">✓ Quantum-safe cryptography implemented</li>
                                    <li className="text-green-400 text-sm">✓ No critical vulnerabilities detected</li>
                                    <li className="text-yellow-400 text-sm">⚠ {auditResult.risks.length} security issues identified</li>
                                    <li className="text-blue-400 text-sm">ℹ {auditResult.suggestions.length} optimization opportunities</li>
                                  </ul>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-white mb-2">Quick Stats</h4>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Contract Address:</span>
                                      <span className="text-gray-300 font-mono">
                                        {contractAddress ? `${contractAddress.slice(0, 10)}...` : 'N/A'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">PQC Algorithms:</span>
                                      <span className="text-green-400">{auditResult.quantum_safety.algorithms_detected.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Compliance:</span>
                                      <span className={auditResult.quantum_safety.compliance ? 'text-green-400' : 'text-red-400'}>
                                        {auditResult.quantum_safety.compliance ? 'Compliant' : 'Non-compliant'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {selectedTab === 'risks' && (
                          <div className="space-y-4">
                            {auditResult.risks.map((risk, index) => (
                              <Card key={index} className={`border-2 ${getRiskColor(risk.severity)}`}>
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <h4 className="font-semibold text-white">{risk.title}</h4>
                                    <span className={`px-2 py-1 rounded text-xs ${getRiskColor(risk.severity)}`}>
                                      {risk.severity.toUpperCase()}
                                    </span>
                                  </div>
                                  <p className="text-gray-300 mb-3">{risk.description}</p>
                                  <div className="bg-gray-800 p-3 rounded">
                                    <p className="text-sm text-green-400 font-medium mb-1">Recommendation:</p>
                                    <p className="text-sm text-gray-300">{risk.recommendation}</p>
                                    {risk.line && (
                                      <p className="text-xs text-gray-500 mt-2">Line: {risk.line}</p>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}

                        {selectedTab === 'suggestions' && (
                          <div className="space-y-4">
                            {auditResult.suggestions.map((suggestion, index) => (
                              <Card key={index} className="bg-gray-800 border-gray-700">
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <h4 className="font-semibold text-white">{suggestion.title}</h4>
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      suggestion.type === 'security' ? 'bg-red-900 text-red-400' :
                                      suggestion.type === 'optimization' ? 'bg-blue-900 text-blue-400' :
                                      'bg-green-900 text-green-400'
                                    }`}>
                                      {suggestion.type}
                                    </span>
                                  </div>
                                  <p className="text-gray-300 mb-3">{suggestion.description}</p>
                                  <div className="bg-gray-700 p-3 rounded">
                                    <p className="text-sm text-blue-400 font-medium mb-1">Expected Impact:</p>
                                    <p className="text-sm text-gray-300">{suggestion.impact}</p>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}

                        {selectedTab === 'quantum' && (
                          <Card className="bg-gray-800 border-gray-700">
                            <CardHeader>
                              <CardTitle className="text-white flex items-center">
                                <ShieldCheckIcon className="w-5 h-5 mr-2" />
                                Quantum Safety Analysis
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-6">
                                <div>
                                  <h4 className="font-semibold text-white mb-3">Detected PQC Algorithms</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {auditResult.quantum_safety.algorithms_detected.map((algo, index) => (
                                      <span 
                                        key={index}
                                        className="px-3 py-1 bg-green-900 text-green-400 rounded-full text-sm"
                                      >
                                        {algo}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                
                                <div>
                                  <h4 className="font-semibold text-white mb-3">Recommendations</h4>
                                  <ul className="space-y-2">
                                    {auditResult.quantum_safety.recommendations.map((rec, index) => (
                                      <li key={index} className="flex items-start space-x-2">
                                        <CheckCircleIcon className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                        <span className="text-gray-300 text-sm">{rec}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-end space-x-4 mt-6">
                        <Button variant="outline" onClick={handleClose}>
                          Close
                        </Button>
                        <Button className="flex items-center">
                          <SparklesIcon className="w-4 h-4 mr-2" />
                          Generate Report
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}