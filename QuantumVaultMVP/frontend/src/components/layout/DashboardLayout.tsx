'use client';

import * as React from 'react';
import { Sidebar } from './Sidebar';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    return (
        <div className="min-h-screen">
            <Sidebar />
            {/* Main content with responsive left margin */}
            <main className="lg:ml-64 min-h-screen transition-all duration-300">
                {children}
            </main>
        </div>
    );
}
