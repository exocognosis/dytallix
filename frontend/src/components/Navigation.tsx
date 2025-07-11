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
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import { useWalletStore } from '../store/wallet'
import { useBlockchainStats } from '../hooks/useAPI'

const navigation = [
  { name: 'Home', href: '/', icon: HomeIcon },
  { name: 'About', href: '/about', icon: InformationCircleIcon },
  { name: 'Dashboard', href: '/dashboard', icon: ChartBarIcon },
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
    <Disclosure as="nav" className="bg-gray-800 border-b border-gray-700">
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Link to="/" className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">D</span>
                    </div>
                    <span className="text-white font-bold text-xl">Dytallix</span>
                  </Link>
                </div>
                <div className="hidden md:block">
                  <div className="ml-10 flex items-baseline space-x-4">
                    {navigation.map((item) => {
                      const isActive = location.pathname === item.href
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={classNames(
                            isActive
                              ? 'bg-gray-900 text-white'
                              : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                            'rounded-md px-3 py-2 text-sm font-medium flex items-center space-x-1'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Right side - Status and Account */}
              <div className="hidden md:block">
                <div className="ml-4 flex items-center md:ml-6 space-x-4">
                  {/* Network Status */}
                  <div className="flex items-center space-x-2 text-sm">
                    <div className={classNames(
                      "w-2 h-2 rounded-full",
                      !statsLoading && stats?.success ? "bg-green-400" : "bg-red-400"
                    )} />
                    <span className="text-gray-300">
                      {!statsLoading && stats?.success ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>

                  {/* Block Height */}
                  {stats?.data?.block_height && (
                    <div className="text-sm text-gray-300">
                      Block: #{stats.data.block_height.toLocaleString()}
                    </div>
                  )}

                  {/* Account Menu */}
                  <Menu as="div" className="relative ml-3">
                    <div>
                      <Menu.Button className="relative flex max-w-xs items-center rounded-full bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800">
                        <span className="sr-only">Open user menu</span>
                        <div className="flex items-center space-x-2 px-3 py-2 rounded-md border border-gray-600">
                          <WalletIcon className="w-4 h-4 text-gray-300" />
                          <span className="text-gray-300">
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
                      <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        {isConnected ? (
                          <>
                            <Menu.Item>
                              {({ active }) => (
                                <Link
                                  to="/wallet"
                                  className={classNames(
                                    active ? 'bg-gray-100' : '',
                                    'block px-4 py-2 text-sm text-gray-700'
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
                                    active ? 'bg-gray-100' : '',
                                    'block px-4 py-2 text-sm text-gray-700 w-full text-left'
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
                                  active ? 'bg-gray-100' : '',
                                  'block px-4 py-2 text-sm text-gray-700'
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
                <Disclosure.Button className="relative inline-flex items-center justify-center rounded-md bg-gray-800 p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800">
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
            <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={classNames(
                      isActive
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                      'block rounded-md px-3 py-2 text-base font-medium flex items-center space-x-2'
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
