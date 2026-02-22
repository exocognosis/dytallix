import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, CreditCard, Store, RefreshCcw, Wallet, Building2, Menu, X, ChevronLeft, Info } from 'lucide-react';
import Overview from './pages/Overview';
import Payments from './pages/Payments';
import Merchants from './pages/Merchants';
import TestCheckout from './pages/TestCheckout';
import WalletPage from './pages/Wallet';
import BankingPage from './pages/Banking';
import About from './pages/About';
import { sdk } from '@dytallixpay/sdk';

sdk.setBaseUrl(import.meta.env.VITE_API_URL || '/api/dytallixpay/v1');

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/payments', icon: CreditCard, label: 'Payments' },
  { to: '/merchants', icon: Store, label: 'Merchants' },
  { to: '/wallet', icon: Wallet, label: 'Wallet' },
  { to: '/banking', icon: Building2, label: 'Banking' },
  { to: '/test-checkout', icon: RefreshCcw, label: 'Test Checkout' },
  { to: '/about', icon: Info, label: 'About DytallixPay' },
];

const SidebarItem = ({
  to, icon: Icon, label, collapsed, onClick
}: { to: string; icon: any; label: string; collapsed: boolean; onClick?: () => void }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  return (
    <Link
      to={to}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${collapsed ? 'justify-center' : ''
        } ${isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
        }`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {!collapsed && <span className="text-sm">{label}</span>}
    </Link>
  );
};

function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change
  const location = useLocation();
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Auto-collapse sidebar on small screens
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setCollapsed(true);
    };
    if (mq.matches) setCollapsed(true);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const sidebarWidth = collapsed ? 'w-16' : 'w-56';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Mobile overlay backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-40
          ${sidebarWidth}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          transition-all duration-300 ease-in-out
          border-r border-border bg-card/50 backdrop-blur-xl flex flex-col
          ${mobileOpen ? 'w-56' : ''}
        `}
      >
        {/* Logo / header */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-border flex-shrink-0">
          {!collapsed && (
            <Link to="/" className="font-bold text-base tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 truncate hover:opacity-80 transition-opacity">
              Dytallix Pay
            </Link>
          )}
          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="hidden md:flex p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors ml-auto flex-shrink-0"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {NAV_ITEMS.map(item => (
            <SidebarItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              collapsed={collapsed && !mobileOpen}
              onClick={() => setMobileOpen(false)}
            />
          ))}
        </nav>

        {/* Collapse hint at bottom */}
        {!collapsed && (
          <div className="px-3 pb-4 text-xs text-muted-foreground/40 text-center">
            Dytallix Pay v1.0
          </div>
        )}
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto relative min-w-0">
        {/* Top bar */}
        <div className="h-16 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between px-4 md:px-6">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5"
          >
            <Menu className="w-5 h-5" />
          </button>
          {/* Mobile brand */}
          <Link to="/" className="md:hidden font-bold text-sm bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 hover:opacity-80 transition-opacity">
            Dytallix Pay
          </Link>
          {/* Right side */}
          <div className="flex items-center gap-3 ml-auto">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-background shadow-sm flex-shrink-0" />
          </div>
        </div>

        {/* Page content */}
        <div className="p-4 md:p-8 pb-24">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/dytallixpay">
      <Layout>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/merchants" element={<Merchants />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/banking" element={<BankingPage />} />
          <Route path="/test-checkout/*" element={<TestCheckout />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
