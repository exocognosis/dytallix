import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, BarChart2, Zap, Lock, Settings, Bell, Search, User } from 'lucide-react';
import clsx from 'clsx';

export default function Layout() {
    return (
        <div className="min-h-screen bg-[#0f1115] text-white flex font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-[#161b22] border-r border-white/5 flex flex-col">
                <div className="p-6 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-primary flex items-center justify-center font-bold text-lg">
                        Q
                    </div>
                    <span className="font-bold text-xl tracking-tight text-white">
                        QuantumVault
                    </span>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-1">
                    <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" />
                    <NavItem to="/assets" icon={<BarChart2 size={20} />} label="Overview" />
                    <NavItem to="/migration" icon={<Zap size={20} />} label="Migration" hasSub />
                    <NavItem to="/encryptions" icon={<Lock size={20} />} label="Encryptions" />
                    <NavItem to="/settings" icon={<Settings size={20} />} label="Settings" />
                </nav>

                <div className="p-4 border-t border-white/5">
                    <div className="bg-white/5 rounded-lg p-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">R</div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">Rick Glenn</span>
                            <span className="text-xs text-textMuted">Admin</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Top Header */}
                <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-[#0f1115]">
                    {/* Search */}
                    <div className="flex items-center gap-2 bg-[#161b22] px-3 py-1.5 rounded-md border border-white/5 text-textMuted w-96">
                        <Search size={16} />
                        <input type="text" placeholder="Search assets, jobs..." className="bg-transparent border-none outline-none text-sm w-full text-white placeholder:text-textMuted/50" />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-4 text-textMuted">
                        <button className="hover:text-white transition-colors"><Bell size={20} /></button>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 ring-2 ring-white/10" />
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

function NavItem({ to, icon, label, hasSub }: any) {
    const location = useLocation();
    const isActive = location.pathname === to;
    return (
        <Link to={to} className={clsx(
            "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative",
            isActive ? "bg-primary/10 text-primary" : "text-textMuted hover:bg-white/5 hover:text-white"
        )}>
            {icon}
            <span className="font-medium text-sm">{label}</span>
            {hasSub && <span className="ml-auto text-xs opacity-50">▼</span>}
            {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />}
        </Link>
    );
}
