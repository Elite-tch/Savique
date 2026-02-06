"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { subscribeToAuth, logoutAdmin } from "@/lib/authService";
import {
    Loader2,
    Shield,
    LayoutDashboard,
    Users,
    Wallet,
    XCircle,
    CheckCircle2,
    LogOut,
    Menu,
    X
} from "lucide-react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const unsubscribe = subscribeToAuth((user) => {
            if (user) {
                setAuthorized(true);
                if (pathname === "/admin/login") {
                    router.push("/admin/dashboard");
                }
            } else {
                setAuthorized(false);
                if (pathname !== "/admin/login") {
                    router.push("/admin/login");
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [pathname, router]);

    const [sidebarOpen, setSidebarOpen] = useState(false);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            </div>
        );
    }

    const isLoginPage = pathname === "/admin/login";

    if (isLoginPage) {
        return <div className="bg-black min-h-screen text-white">{children}</div>;
    }

    return (
        <div className="flex min-h-screen bg-[#050505] text-white">
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-black/50 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 z-40">
                <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden">
                        <Image src="/logo3.png" alt="Logo" fill className="object-contain" />
                    </div>
                    <span className="font-bold text-lg">Savique</span>
                </div>
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                    {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Backdrop for mobile */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                w-64 border-r border-white/5 bg-black/50 backdrop-blur-xl flex flex-col fixed h-full z-40 transition-transform duration-300
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="p-6">
                    <Link href="/" onClick={() => setSidebarOpen(false)}>
                        <div className="h-20 flex items-center gap-3 px-2 border-b border-white/5 mb-6">
                            <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                                <Image
                                    src="/logo3.png"
                                    alt="Savique Logo"
                                    fill
                                    className="object-contain"
                                />
                            </div>
                            <span className="text-xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                                Savique
                            </span>
                        </div>
                    </Link>

                    <nav className="space-y-1">
                        <SidebarLink
                            href="/admin/dashboard"
                            icon={<LayoutDashboard size={20} />}
                            label="Overview"
                            active={pathname === '/admin/dashboard'}
                            onClick={() => setSidebarOpen(false)}
                        />
                        <SidebarLink
                            href="/admin/users"
                            icon={<Users size={20} />}
                            label="User Directory"
                            active={pathname === '/admin/users'}
                            onClick={() => setSidebarOpen(false)}
                        />
                        <SidebarLink
                            href="/admin/active"
                            icon={<Wallet size={20} />}
                            label="Active Savings"
                            active={pathname === '/admin/active'}
                            onClick={() => setSidebarOpen(false)}
                        />
                        <SidebarLink
                            href="/admin/broken"
                            icon={<XCircle size={20} />}
                            label="Broken Savings"
                            active={pathname === '/admin/broken'}
                            onClick={() => setSidebarOpen(false)}
                        />
                        <SidebarLink
                            href="/admin/completed"
                            icon={<CheckCircle2 size={20} />}
                            label="Completed Goals"
                            active={pathname === '/admin/completed'}
                            onClick={() => setSidebarOpen(false)}
                        />
                    </nav>
                </div>

                <div className="mt-auto p-6 border-t border-white/5">
                    <button onClick={logoutAdmin} className="flex items-center gap-3 text-gray-400 hover:text-red-500 transition-colors w-full py-2">
                        <LogOut size={20} />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-20 lg:pt-8 transition-all">
                {children}
            </main>
        </div>
    );
}

function SidebarLink({ href, icon, label, active, onClick }: { href: string, icon: React.ReactNode, label: string, active: boolean, onClick?: () => void }) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full ${active ? 'bg-red-600/10 text-red-500 border border-red-600/20 shadow-[0_0_20px_rgba(220,38,38,0.1)]' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
        >
            {icon}
            <span className="font-medium">{label}</span>
        </Link>
    );
}

