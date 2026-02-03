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
    Loader2
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
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Protected Route Logic
    useEffect(() => {
        if (isLoaded && !user) {
            router.push("/login");
        }
    }, [user, isLoaded, router]);

    if (!isLoaded || !user) {
        return null; // Or a loading spinner
    }

    const navItems = [
        { label: "Gerenciar Imagens", href: "/dashboard", icon: LayoutDashboard },
        { label: "Redimensionar com IA", href: "/dashboard/resize", icon: Maximize },
    ];

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed top-0 left-0 z-40 h-screen w-64 transition-transform border-r border-border bg-card/50 backdrop-blur-xl",
                    !isSidebarOpen && "-translate-x-full md:translate-x-0" // Mobile responsive logic if needed
                )}
            >
                <div className="flex flex-col h-full px-3 py-4 overflow-y-auto">
                    {/* Logo */}
                    <div className="flex items-center ps-2.5 mb-8 mt-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 mr-3 flex items-center justify-center text-white font-bold">
                            IA
                        </div>
                        <span className="self-center text-xl font-semibold whitespace-nowrap dark:text-white">
                            Artes Design Online
                        </span>
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
                                        className={cn(
                                            "flex items-center p-3 rounded-lg group transition-all duration-200",
                                            isActive
                                                ? "bg-primary/10 text-primary"
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
                        <div className="flex items-center p-2 mb-2 rounded-lg bg-muted/30">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white mr-2">
                                <UserIcon size={14} />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium truncate">{user.email}</p>
                                <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                            </div>
                        </div>
                        <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-500 hover:bg-red-900/10" onClick={() => {
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
            <main className="flex-1 md:ml-64 p-8 min-h-screen relative overflow-x-hidden">
                {/* Top Gradient */}
                <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none -z-10" />

                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
