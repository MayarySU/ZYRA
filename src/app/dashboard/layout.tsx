"use client";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { UserNav } from "@/components/layout/user-nav";
import { NotificationCenter } from "@/components/layout/notification-center";
import { GlobalSearch } from "@/components/layout/global-search";
import { useUser } from "@/firebase";
import { useI18n } from "@/components/providers/i18n-provider";
import { ZyraLogo } from "@/components/brand/zyra-logo";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading, user } = useUser();
  const { t } = useI18n();
  const isAdmin = profile?.rol === 'admin';

  // Si no hay usuario autenticado después de cargar, o estamos en el primer check de auth
  if (loading && !user) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-screen bg-background">
        <ZyraLogo className="h-16 w-16 mb-4 animate-pulse" />
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 sticky top-0 bg-background/80 backdrop-blur-md z-40">
          <div className="flex items-center gap-2 flex-1">
            <SidebarTrigger className="hidden md:flex" />
            <div className="h-4 w-px bg-border mx-2 hidden md:block" />
            <div className="flex items-center gap-2 md:hidden">
              <ZyraLogo className="h-7 w-7" />
              <span className="text-sm font-black tracking-tighter text-foreground">ZYRA</span>
            </div>

            {/* Barra de Búsqueda Global */}
            <div className="hidden md:block flex-1 max-w-xl">
              <GlobalSearch />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* <NotificationCenter /> */}
            <UserNav />
          </div>
        </header>

        {/* Buscador móvil (opcional, solo visible en mobile) */}
        <div className="md:hidden p-4 border-b border-border">
          <GlobalSearch />
        </div>

        <main className="flex-1 overflow-auto p-4 md:p-8 pb-24 md:pb-8">
          {loading ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <Loader2 className="h-8 w-8 animate-spin text-accent/20" />
            </div>
          ) : (
            children
          )}
        </main>
        <BottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
