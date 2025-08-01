import { Fragment } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Disclosure, Menu, Transition } from '@headlessui/react'
import { 
  Bars3Icon, 
  XMarkIcon,
  HomeIcon,
  InformationCircleIcon,
  WalletIcon,
  ChartBarIcon,
  CubeIcon,
  CommandLineIcon,
  Cog6ToothIcon,
  BoltIcon,
  CurrencyDollarIcon,
  CpuChipIcon,
  BeakerIcon
} from '@heroicons/react/24/outline'
import { useWalletStore } from '../store/wallet'
import { useBlockchainStats } from '../hooks/useAPI'

const navigation = [
  { name: 'Home', href: '/', icon: HomeIcon },
  { name: 'About', href: '/about', icon: InformationCircleIcon },
  { name: 'Dashboard', href: '/dashboard', icon: ChartBarIcon },
  { name: 'Testnet', href: '/testnet', icon: BeakerIcon },
  { name: 'Enterprise AI', href: '/enterprise-ai', icon: CpuChipIcon },
  { name: 'Wallet', href: '/wallet', icon: WalletIcon },
  { name: 'Explorer', href: '/explorer', icon: CubeIcon },
  { name: 'Analytics', href: '/analytics', icon: BoltIcon },
  { name: 'Contracts', href: '/contracts', icon: CommandLineIcon },
  { name: 'Tokenomics', href: '/tokenomics', icon: CurrencyDollarIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export function Navigation() {
  const location = useLocation()
  const { activeAccount, isConnected } = useWalletStore()
  const { data: stats, isLoading: statsLoading } = useBlockchainStats()

  return (
    <Disclosure as="nav" className="bg-dashboard-bg border-b border-dashboard-border">
      {({ open }) => (
        <>
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              {/* Left: Logo */}
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Link to="/" className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-quantum-600 rounded-lg flex items-center justify-center glow-green">
                      <span className="text-white font-bold text-sm">D</span>
                    </div>
                    <span className="text-dashboard-text font-bold text-xl">Dytallix</span>
                  </Link>
                </div>
              </div>

              {/* Center: Navigation Links */}
              <div className="hidden md:block">
                <div className="flex items-baseline space-x-4">
                  {navigation.map((item) => {
                    const isActive = location.pathname === item.href
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={classNames(
                          isActive
                            ? 'bg-dashboard-card-hover text-dashboard-text border-dashboard-border-hover border'
                            : 'text-dashboard-text-muted hover:bg-dashboard-card hover:text-dashboard-text',
                          'rounded-md px-3 py-2 text-sm font-medium flex items-center space-x-1 transition-all duration-200 whitespace-nowrap'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Right: Status and Account */}

              {/* Right side - Status and Account */}
              <div className="hidden md:block">
                <div className="ml-4 flex items-center md:ml-6 space-x-4">
                  {/* Network Status */}
                  <div className="flex items-center space-x-2 text-sm">
                    <div className={classNames(
                      "w-2 h-2 rounded-full",
                      !statsLoading && stats?.success ? "bg-dashboard-success pulse-green" : "bg-red-400"
                    )} />
                    <span className="text-dashboard-text-muted">
                      {!statsLoading && stats?.success ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>

                  {/* Block Height */}
                  {stats?.data?.block_height && (
                    <div className="text-sm text-dashboard-text-muted">
                      Block: #{stats.data.block_height.toLocaleString()}
                    </div>
                  )}

                  {/* Account Menu */}
                  <Menu as="div" className="relative ml-3">
                    <div>
                      <Menu.Button className="relative flex max-w-xs items-center rounded-full bg-dashboard-bg text-sm focus:outline-none focus:ring-2 focus:ring-dashboard-border-hover focus:ring-offset-2 focus:ring-offset-dashboard-bg">
                        <span className="sr-only">Open user menu</span>
                        <div className="flex items-center space-x-2 px-3 py-2 rounded-md border border-dashboard-border hover:border-dashboard-border-hover transition-all duration-200">
                          <WalletIcon className="w-4 h-4 text-dashboard-text-muted" />
                          <span className="text-dashboard-text-muted">
                            {isConnected && activeAccount 
                              ? `${activeAccount.address.slice(0, 6)}...${activeAccount.address.slice(-4)}`
                              : 'Connect Wallet'
                            }
                          </span>
                        </div>
                      </Menu.Button>
                    </div>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-dashboard-card border border-dashboard-border py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        {isConnected ? (
                          <>
                            <Menu.Item>
                              {({ active }) => (
                                <Link
                                  to="/wallet"
                                  className={classNames(
                                    active ? 'bg-dashboard-card-hover' : '',
                                    'block px-4 py-2 text-sm text-dashboard-text'
                                  )}
                                >
                                  View Wallet
                                </Link>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  className={classNames(
                                    active ? 'bg-dashboard-card-hover' : '',
                                    'block px-4 py-2 text-sm text-dashboard-text w-full text-left'
                                  )}
                                  onClick={() => {
                                    // Handle disconnect
                                  }}
                                >
                                  Disconnect
                                </button>
                              )}
                            </Menu.Item>
                          </>
                        ) : (
                          <Menu.Item>
                            {({ active }) => (
                              <Link
                                to="/wallet"
                                className={classNames(
                                  active ? 'bg-dashboard-card-hover' : '',
                                  'block px-4 py-2 text-sm text-dashboard-text'
                                )}
                              >
                                Connect Wallet
                              </Link>
                            )}
                          </Menu.Item>
                        )}
                      </Menu.Items>
                    </Transition>
                  </Menu>
                </div>
              </div>

              {/* Mobile menu button */}
              <div className="-mr-2 flex md:hidden">
                <Disclosure.Button className="relative inline-flex items-center justify-center rounded-md bg-dashboard-bg p-2 text-dashboard-text-muted hover:bg-dashboard-card hover:text-dashboard-text focus:outline-none focus:ring-2 focus:ring-dashboard-border-hover focus:ring-offset-2 focus:ring-offset-dashboard-bg">
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          <Disclosure.Panel className="md:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3 bg-dashboard-bg border-t border-dashboard-border">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={classNames(
                      isActive
                        ? 'bg-dashboard-card-hover text-dashboard-text border border-dashboard-border-hover'
                        : 'text-dashboard-text-muted hover:bg-dashboard-card hover:text-dashboard-text',
                      'block rounded-md px-3 py-2 text-base font-medium flex items-center space-x-2 transition-all duration-200 whitespace-nowrap'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  )
}
