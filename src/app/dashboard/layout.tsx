"use client";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { UserNav } from "@/components/layout/user-nav";
import { useUser } from "@/firebase";
import { Zap } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile } = useUser();
  const { t } = useI18n();
  const isAdmin = profile?.rol === 'admin';

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/5 px-4 sticky top-0 bg-background/80 backdrop-blur-md z-40">
          <div className="flex items-center gap-2">
            <SidebarTrigger className={isAdmin ? "flex" : "hidden md:flex"} />
            <div className="h-4 w-px bg-white/10 mx-2 hidden md:block" />
            <div className="flex items-center gap-2 md:hidden">
              <Zap className="h-5 w-5 text-accent" />
              <span className="text-sm font-black tracking-tighter">ZYRA</span>
            </div>
            <h1 className="text-xs md:text-sm font-semibold text-muted-foreground truncate hidden md:block">
              {isAdmin ? `ZYRA COMMAND - ${t.common.admin}` : `ZYRA OPERATIVO - ${profile?.nombre || t.common.employee}`}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <UserNav />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8 pb-24 md:pb-8">
          {children}
        </main>
        <BottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
