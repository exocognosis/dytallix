'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
    Activity,
    Key,
    Database,
    Route,
    Shield,
    FileCheck,
    AlertTriangle,
    Calendar,
    Building2,
    Menu,
    X,
    Lock,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Settings,
    Info
} from 'lucide-react';
import { authAPI } from '@/lib/api';
import { cn } from '@/utils/cn';
import { useSidebar } from './SidebarContext';

const NAV_ITEMS = [
    { id: 'overview', label: 'Overview', href: '/dashboard', icon: Activity },
    { id: 'key-management', label: 'Key Management', href: '/dashboard/key-management', icon: Key },
    { id: 'storage', label: 'Storage Encryption', href: '/dashboard/storage', icon: Database },
    { id: 'pqc-pipeline', label: 'PQC Asset Pipeline', href: '/dashboard/pipeline', icon: Route },
    { id: 'transport', label: 'Secure Transport', href: '/dashboard/transport', icon: Lock },
    { id: 'policies', label: 'Policy Orchestrator', href: '/dashboard/policies', icon: Shield },
    { id: 'compliance', label: 'Compliance & Standards', href: '/dashboard/compliance', icon: FileCheck },
    { id: 'threats', label: 'Threat Mapping', href: '/dashboard/threats', icon: AlertTriangle },
    { id: 'timeline', label: 'Implementation Timeline', href: '/dashboard/timeline', icon: Calendar },
    { id: 'use-cases', label: 'Use Cases', href: '/dashboard/use-cases', icon: Building2 },
    { id: 'about', label: 'About QuantumVault', href: '/dashboard/about', icon: Info },
    { id: 'admin', label: 'Administrator', href: '/dashboard/admin', icon: Settings },
];

interface SidebarProps {
    className?: string;
}

function resolveBrowserBasePath() {
    const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH || '/QuantumVaultMVP';
    return configuredBasePath === '/' ? '' : configuredBasePath.replace(/\/$/, '');
}

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar();

    const handleLogout = async () => {
        try {
            await authAPI.logout();
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
            router.push('/login');
        }
    };

    const isActive = (href: string) => {
        if (href === '/dashboard') {
            return pathname === '/dashboard';
        }
        return pathname?.startsWith(href);
    };

    const SidebarContent = () => (
        <>
            {/* Logo */}
            <div className={cn(
                "flex items-center gap-3 px-4 py-5 border-b border-white/10",
                isCollapsed && "justify-center px-2"
            )}>
                <Image
                    src={`${resolveBrowserBasePath()}/DytallixLogo.png`}
                    alt="Dytallix"
                    width={isCollapsed ? 32 : 42}
                    height={isCollapsed ? 32 : 42}
                    className="shrink-0 object-contain"
                    unoptimized
                    priority
                />
                {!isCollapsed && (
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-tight">QuantumVault</h1>
                        <p className="text-xs text-white/50">PQC Enterprise Security</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => (
                    <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={cn(
                            'sidebar-nav-item',
                            isActive(item.href) && 'active',
                            isCollapsed && 'justify-center px-2'
                        )}
                        title={isCollapsed ? item.label : undefined}
                    >
                        <item.icon className={cn("w-5 h-5 shrink-0 nav-icon", isCollapsed && "w-6 h-6")} />
                        {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                ))}
            </nav>

            {/* Logout Button */}
            <div className="p-3">
                <button
                    onClick={handleLogout}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-sm font-medium",
                        isCollapsed && "justify-center px-2"
                    )}
                    title={isCollapsed ? "Log Out" : undefined}
                >
                    <LogOut className={cn("w-5 h-5 shrink-0", isCollapsed && "w-6 h-6")} />
                    {!isCollapsed && <span>Log Out</span>}
                </button>
            </div>

            {/* Collapse Toggle - Desktop Only */}
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
            {/* Mobile Toggle Button */}
            <button
                onClick={() => setIsMobileOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10"
            >
                <Menu className="w-5 h-5 text-white" />
            </button>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside
                className={cn(
                    "lg:hidden fixed top-0 left-0 z-50 h-full w-64 glass-sidebar flex flex-col transform transition-transform duration-300",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full"
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

            {/* Desktop Sidebar */}
            <aside
                className={cn(
                    "hidden lg:flex fixed top-0 left-0 z-40 h-full glass-sidebar flex-col transition-all duration-300",
                    isCollapsed ? "w-16" : "w-64",
                    className
                )}
            >
                <SidebarContent />
            </aside>
        </>
    );
}
