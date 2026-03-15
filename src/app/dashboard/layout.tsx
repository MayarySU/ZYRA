"use client";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-white/5 px-4 sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <SidebarTrigger />
          <div className="h-4 w-px bg-white/10 mx-2" />
          <h1 className="text-sm font-semibold text-muted-foreground">Sistema de Gestión Operativa ZYRA</h1>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
