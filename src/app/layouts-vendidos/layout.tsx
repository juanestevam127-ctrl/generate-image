"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStore } from "@/lib/store-context";
import { Loader2, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/Sidebar";

export default function LayoutsVendidosLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoaded } = useStore();
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) {
                setIsSidebarOpen(true);
            } else {
                setIsSidebarOpen(false);
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!isLoaded || !user) {
        return <div className="flex items-center justify-center min-h-screen bg-background"><Loader2 className="animate-spin text-primary" /></div>;
    }

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
            <Sidebar
                isMobile={isMobile}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
            />

            {/* Main Content */}
            <main className={cn(
                "flex-1 min-h-screen relative overflow-x-hidden transition-all duration-300",
                "md:ml-64",
                "p-4 md:p-8"
            )}>
                {/* Mobile Header */}
                <div className="md:hidden mb-6 flex items-center justify-between">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setIsSidebarOpen(true)}
                        className="bg-background/50 backdrop-blur border-white/10 text-muted-foreground hover:text-foreground"
                    >
                        <Menu size={20} />
                    </Button>
                    <span className="font-semibold text-sm text-muted-foreground">Layouts Vendidos</span>
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
