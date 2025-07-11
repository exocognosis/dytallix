import { 
  CurrencyDollarIcon, 
  ChartPieIcon,
  LockClosedIcon,
  UserGroupIcon,
  TrophyIcon,
  FireIcon,
  GiftIcon,
  ShieldCheckIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline'

export function Tokenomics() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-700 pb-6">
        <h1 className="text-3xl font-bold text-white flex items-center">
          <CurrencyDollarIcon className="w-8 h-8 mr-3" />
          Dytallix Dual-Token System
        </h1>
        <p className="mt-2 text-gray-400">
          DGT (Governance) and DRT (Reward) - A comprehensive dual-token economy for the post-quantum era
        </p>
      </div>

      {/* Dual Token Overview */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* DGT Token */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-bold text-blue-400 mb-4 flex items-center">
            <UserGroupIcon className="w-6 h-6 mr-2" />
            DGT (Governance Token)
          </h2>
          <div className="space-y-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">1B DGT</div>
              <div className="text-sm text-gray-400">Fixed Total Supply</div>
              <div className="text-xs text-green-400 mt-1">No Inflation</div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Primary Function</span>
                <span className="text-blue-400">Governance & Voting</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Supply Model</span>
                <span className="text-white">Fixed Supply</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Voting Power</span>
                <span className="text-green-400">1 DGT = 1 Vote</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Current Price</span>
                <span className="text-white">$1.82</span>
              </div>
            </div>
          </div>
        </div>

        {/* DRT Token */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-bold text-purple-400 mb-4 flex items-center">
            <TrophyIcon className="w-6 h-6 mr-2" />
            DRT (Reward Token)
          </h2>
          <div className="space-y-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">Adaptive</div>
              <div className="text-sm text-gray-400">Emission Rate</div>
              <div className="text-xs text-purple-400 mt-1">DGT-Governed</div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Primary Function</span>
                <span className="text-purple-400">Staking Rewards</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Supply Model</span>
                <span className="text-white">Adaptive Emission</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Burn Mechanism</span>
                <span className="text-red-400">Deflationary</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Current Rate</span>
                <span className="text-white">2.3M/day</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DGT Distribution */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-xl font-bold text-blue-400 mb-4 flex items-center">
          <ChartPieIcon className="w-6 h-6 mr-2" />
          DGT Distribution (1 Billion Fixed Supply)
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-900/30 border border-blue-700 rounded">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-400 rounded mr-3"></div>
                <span className="text-white">Ecosystem Development</span>
              </div>
              <span className="text-blue-400 font-semibold">35% (350M)</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-900/30 border border-green-700 rounded">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-400 rounded mr-3"></div>
                <span className="text-white">Community Incentives</span>
              </div>
              <span className="text-green-400 font-semibold">25% (250M)</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-yellow-900/30 border border-yellow-700 rounded">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-400 rounded mr-3"></div>
                <span className="text-white">Team & Advisors</span>
              </div>
              <span className="text-yellow-400 font-semibold">20% (200M)</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-purple-900/30 border border-purple-700 rounded">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-purple-400 rounded mr-3"></div>
                <span className="text-white">Strategic Partnerships</span>
              </div>
              <span className="text-purple-400 font-semibold">10% (100M)</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-orange-900/30 border border-orange-700 rounded">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-orange-400 rounded mr-3"></div>
                <span className="text-white">Liquidity & Exchange</span>
              </div>
              <span className="text-orange-400 font-semibold">10% (100M)</span>
            </div>
            
            <div className="p-3 bg-gray-700 rounded">
              <div className="text-sm text-gray-400 mb-1">Vesting Schedule</div>
              <div className="text-white text-sm">Team: 4 years linear • Advisors: 2 years</div>
            </div>
          </div>
        </div>
      </div>

      {/* DRT Emission & Rewards */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-xl font-bold text-purple-400 mb-4 flex items-center">
          <GiftIcon className="w-6 h-6 mr-2" />
          DRT Emission & Reward System
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Current Emission</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Daily Emission</span>
                <span className="text-white">2.3M DRT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Annual Rate</span>
                <span className="text-purple-400">8.4%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Circulating</span>
                <span className="text-white">97.2M DRT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Burned (Total)</span>
                <span className="text-red-400">12.8M DRT</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Reward Distribution</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Validator Rewards</span>
                <span className="text-white">60%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Delegator Rewards</span>
                <span className="text-white">30%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Community Pool</span>
                <span className="text-white">8%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Bug Bounties</span>
                <span className="text-white">2%</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Governance Controls</h3>
            <div className="space-y-3">
              <div className="text-sm text-gray-300">
                • DGT holders vote on emission rates
              </div>
              <div className="text-sm text-gray-300">
                • Quarterly adjustment proposals
              </div>
              <div className="text-sm text-gray-300">
                • Automatic halving triggers
              </div>
              <div className="text-sm text-gray-300">
                • Emergency burn mechanisms
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Staking & Governance */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-bold text-green-400 mb-4 flex items-center">
            <LockClosedIcon className="w-6 h-6 mr-2" />
            Staking Program
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-gray-700 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-semibold">DRT Rewards APY</span>
                <span className="text-green-400 text-xl font-bold">15.2%</span>
              </div>
              <div className="text-sm text-gray-400">Adaptive rate based on network participation</div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Total DGT Staked</span>
                <span className="text-white">421M DGT (42.1%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Active Validators</span>
                <span className="text-white">1,847</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Minimum Stake</span>
                <span className="text-white">50,000 DGT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Unbonding Period</span>
                <span className="text-white">21 days</span>
              </div>
            </div>
            
            <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors">
              Stake DGT → Earn DRT
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-bold text-blue-400 mb-4 flex items-center">
            <UserGroupIcon className="w-6 h-6 mr-2" />
            DGT Governance
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-gray-700 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-semibold">Voting Power</span>
                <span className="text-blue-400 text-xl font-bold">1 DGT = 1 Vote</span>
              </div>
              <div className="text-sm text-gray-400">Linear voting with delegation support</div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Active Proposals</span>
                <span className="text-white">5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Participation Rate</span>
                <span className="text-green-400">78.3%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Quorum Required</span>
                <span className="text-white">20%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Proposal Threshold</span>
                <span className="text-white">1M DGT</span>
              </div>
            </div>
            
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors">
              View Active Proposals
            </button>
          </div>
        </div>
      </div>

      {/* Token Utility */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-xl font-bold text-blue-400 mb-4 flex items-center">
          <ArrowsRightLeftIcon className="w-6 h-6 mr-2" />
          Token Utility & Flow
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-blue-400 mb-3">DGT Use Cases</h3>
            <div className="space-y-3">
              <div className="flex items-center p-3 bg-gray-700 rounded">
                <UserGroupIcon className="w-5 h-5 text-blue-400 mr-3" />
                <span className="text-white">Protocol governance and voting</span>
              </div>
              <div className="flex items-center p-3 bg-gray-700 rounded">
                <LockClosedIcon className="w-5 h-5 text-green-400 mr-3" />
                <span className="text-white">Validator staking (earn DRT)</span>
              </div>
              <div className="flex items-center p-3 bg-gray-700 rounded">
                <CurrencyDollarIcon className="w-5 h-5 text-yellow-400 mr-3" />
                <span className="text-white">Treasury fund allocation</span>
              </div>
              <div className="flex items-center p-3 bg-gray-700 rounded">
                <ShieldCheckIcon className="w-5 h-5 text-purple-400 mr-3" />
                <span className="text-white">Premium platform features</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-purple-400 mb-3">DRT Use Cases</h3>
            <div className="space-y-3">
              <div className="flex items-center p-3 bg-gray-700 rounded">
                <TrophyIcon className="w-5 h-5 text-green-400 mr-3" />
                <span className="text-white">Staking and participation rewards</span>
              </div>
              <div className="flex items-center p-3 bg-gray-700 rounded">
                <CurrencyDollarIcon className="w-5 h-5 text-blue-400 mr-3" />
                <span className="text-white">Transaction fee payments</span>
              </div>
              <div className="flex items-center p-3 bg-gray-700 rounded">
                <FireIcon className="w-5 h-5 text-red-400 mr-3" />
                <span className="text-white">Burn to reduce circulating supply</span>
              </div>
              <div className="flex items-center p-3 bg-gray-700 rounded">
                <GiftIcon className="w-5 h-5 text-orange-400 mr-3" />
                <span className="text-white">Community incentives & airdrops</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Economic Model */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-xl font-bold text-blue-400 mb-4">Economic Model & Sustainability</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">DGT Economics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Market Cap</span>
                <span className="text-white">$1.82B</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Circulating</span>
                <span className="text-white">650M DGT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Staking Rate</span>
                <span className="text-green-400">64.7%</span>
              </div>
              <div className="text-sm text-gray-400 pt-2">
                Deflationary through staking lock-up
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">DRT Economics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Current Supply</span>
                <span className="text-white">97.2M DRT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Monthly Burn</span>
                <span className="text-red-400">800K DRT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Net Inflation</span>
                <span className="text-yellow-400">+6.8%</span>
              </div>
              <div className="text-sm text-gray-400 pt-2">
                Moving toward deflationary as usage grows
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Network Health</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Security Budget</span>
                <span className="text-white">$15.2M/year</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Revenue (Fees)</span>
                <span className="text-white">$4.7M/month</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Sustainability</span>
                <span className="text-green-400">Profitable</span>
              </div>
              <div className="text-sm text-gray-400 pt-2">
                Self-sustaining through fee revenue
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
