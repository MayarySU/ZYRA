
"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  ClipboardList,
  Building2,
  Package,
  UserCircle,
  ShieldCheck,
} from "lucide-react";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { useAuth } from "@/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { ZyraLogo } from "@/components/brand/zyra-logo";

export function AppSidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const { t } = useI18n();
  const isAdmin = profile?.rol === 'admin';

  const navItems = isAdmin ? [
    { title: t.nav.dashboard, icon: LayoutDashboard, href: "/dashboard" },
    { title: t.nav.projects, icon: Briefcase, href: "/projects" },
    { title: t.nav.viabilidad, icon: ShieldCheck, href: "/viabilidad" },
    { title: t.nav.clients, icon: Building2, href: "/clients" },
    { title: t.nav.teams, icon: Users, href: "/team" },
    { title: t.nav.employees, icon: UserCircle, href: "/employees" },
    { title: t.nav.reports, icon: ClipboardList, href: "/reports" },
    { title: t.nav.materials, icon: Package, href: "/materials" },
  ] : [
    { title: t.nav.dashboard, icon: LayoutDashboard, href: "/dashboard" },
    { title: t.nav.projects, icon: Briefcase, href: "/projects" },
    { title: t.nav.viabilidad, icon: ShieldCheck, href: "/viabilidad" },
    { title: t.nav.teams, icon: Users, href: "/team" },
    { title: t.nav.reports, icon: ClipboardList, href: "/reports" },
  ];

  const activo = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="h-16 flex flex-col justify-center px-4 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center border-b border-border transition-all">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:justify-center">
          <ZyraLogo className="h-8 w-8 shrink-0 transition-all" />
          <div className="flex flex-col group-data-[collapsible=icon]:hidden overflow-hidden transition-all duration-300">
            <span className="text-xl font-black tracking-tighter text-foreground leading-none">
              ZYRA
            </span>
            <span className="text-[10px] font-black text-accent tracking-[0.2em] leading-none mt-1">
              {isAdmin ? "ADMIN" : "OPERATIVO"}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest group-data-[collapsible=icon]:hidden">
            {isAdmin ? t.nav.admin_panel : t.nav.general}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={activo(item.href)}
                    tooltip={item.title}
                    className="hover:bg-accent/10 active:bg-accent/20"
                  >
                    <a href={item.href} className="flex items-center gap-3">
                      <item.icon className={activo(item.href) ? "text-accent" : "text-muted-foreground"} />
                      <span className="font-medium text-foreground group-data-[collapsible=icon]:hidden">
                        {item.title}
                      </span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
