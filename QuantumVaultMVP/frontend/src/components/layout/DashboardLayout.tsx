'use client';

import * as React from 'react';
import { Sidebar } from './Sidebar';
import { SidebarProvider, useSidebar } from './SidebarContext';
import { cn } from '@/utils/cn';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

function DashboardContent({ children }: DashboardLayoutProps) {
    const { isCollapsed } = useSidebar();

    return (
        <div className="min-h-screen">
            <Sidebar />
            {/* Main content with responsive left margin based on sidebar state */}
            <main className={cn(
                "min-h-screen transition-all duration-300",
                isCollapsed ? "lg:ml-16" : "lg:ml-64"
            )}>
                {children}
            </main>
        </div>
    );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    return (
        <SidebarProvider>
            <DashboardContent>{children}</DashboardContent>
        </SidebarProvider>
    );
}
