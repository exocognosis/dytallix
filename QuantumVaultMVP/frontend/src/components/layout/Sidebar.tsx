'use client';

import * as React from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Database,
  FileCheck,
  Info,
  Key,
  Lock,
  LogOut,
  Menu,
  Route,
  Settings,
  Shield,
  ShieldCheck,
  type LucideIcon,
  Upload,
  X,
} from 'lucide-react';

import { authAPI } from '@/lib/api';
import { withBasePath } from '@/lib/base-path';
import { cn } from '@/utils/cn';
import { useSidebar } from './SidebarContext';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'command-center',
    label: 'Command Center',
    items: [
      { id: 'overview', label: 'Overview', href: '/dashboard', icon: Activity },
      { id: 'threats', label: 'Threat Mapping', href: '/dashboard/threats', icon: AlertTriangle },
      { id: 'compliance', label: 'Compliance & Standards', href: '/dashboard/compliance', icon: FileCheck },
    ],
  },
  {
    id: 'protection',
    label: 'Protection Stack',
    items: [
      { id: 'key-management', label: 'Key Management', href: '/dashboard/key-management', icon: Key },
      { id: 'storage', label: 'Storage Encryption', href: '/dashboard/storage', icon: Database },
      { id: 'transport', label: 'Secure Transport', href: '/dashboard/transport', icon: Lock },
      { id: 'access', label: 'Internal Access', href: '/dashboard/access', icon: ShieldCheck },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { id: 'asset-intake', label: 'Single Asset Intake', href: '/dashboard/asset-intake', icon: Upload },
      { id: 'policies', label: 'Policy Orchestrator', href: '/dashboard/policies', icon: Shield },
      { id: 'pipeline', label: 'PQC Pipeline', href: '/dashboard/pipeline', icon: Route },
    ],
  },
  {
    id: 'planning',
    label: 'Planning',
    items: [
      { id: 'timeline', label: 'Implementation Timeline', href: '/dashboard/timeline', icon: Calendar },
      { id: 'use-cases', label: 'Use Cases', href: '/dashboard/use-cases', icon: Building2 },
      { id: 'about', label: 'About QuantumVault', href: '/dashboard/about', icon: Info },
    ],
  },
];

const UTILITY_ITEMS: NavItem[] = [
  { id: 'admin', label: 'Administrator', href: '/dashboard/admin', icon: Settings },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar();

  const isItemActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname?.startsWith(href);

  const logout = async () => {
    try {
      await authAPI.logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      router.push('/login');
    }
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = isItemActive(item.href);

    return (
      <Link
        key={item.id}
        href={item.href}
        onClick={() => setIsMobileOpen(false)}
        className={cn(
          'sidebar-nav-item group',
          isActive && 'active',
          isCollapsed && 'justify-center px-2',
        )}
        title={isCollapsed ? item.label : undefined}
      >
        {!isCollapsed && (
          <span
            aria-hidden="true"
            className={cn(
              'absolute left-0 top-1/2 h-7 w-0.5 -translate-y-1/2 rounded-r-full bg-cyan-300 opacity-0 transition-opacity duration-200',
              isActive ? 'opacity-100' : 'group-hover:opacity-40',
            )}
          />
        )}
        <item.icon className={cn('w-5 h-5 shrink-0 nav-icon', isCollapsed && 'w-6 h-6')} />
        {!isCollapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  const SidebarContent = () => (
    <>
      <div
        className={cn(
          'flex items-center gap-3 border-b border-white/10 bg-gradient-to-b from-cyan-400/10 to-transparent px-4 py-5',
          isCollapsed && 'justify-center px-2',
        )}
      >
        <Image
          src={withBasePath('/DytallixLogo.png')}
          alt="Dytallix"
          width={isCollapsed ? 32 : 42}
          height={isCollapsed ? 32 : 42}
          className="shrink-0 object-contain"
          unoptimized
          priority
        />
        {!isCollapsed && (
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-300/70">
              Security Workspace
            </p>
            <h1 className="text-lg font-bold text-white tracking-tight">QuantumVault</h1>
            <p className="text-xs text-white/50">PQC Enterprise Security</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className={cn('space-y-4', isCollapsed && 'space-y-3')}>
          {NAV_SECTIONS.map((section, index) => (
            <div
              key={section.id}
              className={cn(
                'sidebar-nav-section',
                isCollapsed && 'border-transparent bg-transparent p-0',
              )}
            >
              {!isCollapsed ? (
                <p className="sidebar-section-label">{section.label}</p>
              ) : (
                index > 0 && <div className="mx-auto mb-2 h-px w-8 bg-white/10" />
              )}
              <div className="space-y-1">{section.items.map(renderNavItem)}</div>
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t border-white/10 p-3 space-y-3">
        {!isCollapsed && <p className="sidebar-section-label pb-0">System</p>}
        <div
          className={cn(
            'sidebar-nav-section',
            isCollapsed && 'border-transparent bg-transparent p-0',
          )}
        >
          <div className="space-y-1">{UTILITY_ITEMS.map(renderNavItem)}</div>
        </div>
        <button
          onClick={logout}
          className={cn(
            'sidebar-nav-item w-full text-red-300/80 hover:bg-red-500/10 hover:text-red-200',
            isCollapsed && 'justify-center px-2',
          )}
          title={isCollapsed ? 'Log Out' : undefined}
        >
          <LogOut className={cn('w-5 h-5 shrink-0', isCollapsed && 'w-6 h-6')} />
          {!isCollapsed && <span>Log Out</span>}
        </button>
      </div>

      <div className="hidden lg:block border-t border-white/10 p-3">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors text-sm"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10"
      >
        <Menu className="w-5 h-5 text-white" />
      </button>

      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'lg:hidden fixed top-0 left-0 z-50 h-full w-64 glass-sidebar flex flex-col transform transition-transform duration-300',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <button
          onClick={() => setIsMobileOpen(false)}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5 text-white/60" />
        </button>
        <SidebarContent />
      </aside>

      <aside
        className={cn(
          'hidden lg:flex fixed top-0 left-0 z-40 h-full glass-sidebar flex-col transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-64',
          className,
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
