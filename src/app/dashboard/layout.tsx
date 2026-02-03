"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStore } from "@/lib/store-context";
import {
    LayoutDashboard,
    Calendar,
    LogOut,
    User as UserIcon,
    Settings,
    Maximize,
    Loader2,
    Menu,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoaded, logout } = useStore();
    const router = useRouter();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Default closed on mobile-first approach
    const [isMobile, setIsMobile] = useState(false);

    // Protected Route Logic
    useEffect(() => {
        if (isLoaded && !user) {
            router.push("/login");
        }
    }, [user, isLoaded, router]);

    // Handle Resize & Initial Mobile Check
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768; // md breakpoint
            setIsMobile(mobile);
            if (!mobile) {
                setIsSidebarOpen(true); // Always open on desktop
            } else {
                setIsSidebarOpen(false); // Default closed on mobile
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!isLoaded || !user) {
        return <div className="flex items-center justify-center min-h-screen bg-background"><Loader2 className="animate-spin text-primary" /></div>;
    }

    const navItems = [
        { label: "Gerenciar Imagens", href: "/dashboard", icon: LayoutDashboard },
        { label: "Redimensionar com IA", href: "/dashboard/resize", icon: Maximize },
    ];

    return (
        <div className="flex min-h-screen bg-background text-foreground relative">
            {/* Mobile Backdrop */}
            {isMobile && isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 animate-in fade-in"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed top-0 left-0 z-40 h-screen w-64 transition-transform duration-300 ease-in-out border-r border-border bg-card/95 backdrop-blur-xl shadow-2xl md:shadow-none",
                    !isSidebarOpen && "-translate-x-full md:translate-x-0"
                )}
            >
                <div className="flex flex-col h-full px-3 py-4 overflow-y-auto">
                    {/* Header with Close Button */}
                    <div className="flex items-center justify-between mb-8 mt-2 px-2.5">
                        <div className="flex items-center">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 mr-3 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                                IA
                            </div>
                            <span className="self-center text-xl font-semibold whitespace-nowrap dark:text-white tracking-tight">
                                Artes Design
                            </span>
                        </div>
                        {/* Close Button (Mobile Only) */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden text-muted-foreground hover:text-white"
                            onClick={() => setIsSidebarOpen(false)}
                        >
                            <X size={20} />
                        </Button>
                    </div>

                    {/* Navigation */}
                    <ul className="space-y-2 font-medium flex-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;
                            return (
                                <li key={item.label}>
                                    <a
                                        href={item.href}
                                        onClick={() => isMobile && setIsSidebarOpen(false)} // Auto-close on mobile nav
                                        className={cn(
                                            "flex items-center p-3 rounded-lg group transition-all duration-200",
                                            isActive
                                                ? "bg-primary/10 text-primary font-semibold"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        <Icon className={cn("w-5 h-5 transition duration-75", isActive ? "text-primary" : "text-gray-400 group-hover:text-foreground")} />
                                        <span className="ms-3">{item.label}</span>
                                    </a>
                                </li>
                            );
                        })}
                    </ul>

                    {/* User & Logout */}
                    <div className="mt-auto border-t border-border pt-4">
                        <div className="flex items-center p-2 mb-2 rounded-lg bg-muted/30 border border-white/5">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white mr-2 ring-2 ring-white/10">
                                <UserIcon size={14} />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium truncate">{user.email}</p>
                                <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                            </div>
                        </div>
                        <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors" onClick={() => {
                            logout();
                            router.push("/login");
                        }}>
                            <LogOut className="w-5 h-5 mr-2" />
                            Sair
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className={cn(
                "flex-1 min-h-screen relative overflow-x-hidden transition-all duration-300",
                "md:ml-64", // Always offset on desktop
                "p-4 md:p-8" // Smaller padding on mobile
            )}>
                {/* Mobile Header / Menu Button */}
                <div className="md:hidden mb-6 flex items-center justify-between">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setIsSidebarOpen(true)}
                        className="bg-background/50 backdrop-blur border-white/10 text-muted-foreground hover:text-foreground"
                    >
                        <Menu size={20} />
                    </Button>
                    <span className="font-semibold text-sm text-muted-foreground">Artes Design Online</span>
                </div>

                {/* Top Gradient */}
                <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none -z-10" />

                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
