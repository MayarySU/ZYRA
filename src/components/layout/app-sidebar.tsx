
"use client";

import * as React from "react";
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  ClipboardList, 
  Building2,
  Package,
  UserCircle
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
import { useUser } from "@/firebase";
import { useI18n } from "@/components/providers/i18n-provider";
import { ZyraLogo } from "@/components/brand/zyra-logo";

export function AppSidebar() {
  const pathname = usePathname();
  const { profile } = useUser();
  const { t } = useI18n();
  const isAdmin = profile?.rol === 'admin';

  const navItems = isAdmin ? [
    { title: t.nav.dashboard, icon: LayoutDashboard, href: "/dashboard" },
    { title: t.nav.projects, icon: Briefcase, href: "/projects" },
    { title: t.nav.clients, icon: Building2, href: "/clients" },
    { title: t.nav.teams, icon: Users, href: "/team" },
    { title: t.nav.employees, icon: UserCircle, href: "/employees" },
    { title: t.nav.reports, icon: ClipboardList, href: "/reports" },
    { title: t.nav.materials, icon: Package, href: "/materials" },
  ] : [
    { title: t.nav.dashboard, icon: LayoutDashboard, href: "/dashboard" },
    { title: t.nav.projects, icon: Briefcase, href: "/projects" },
    { title: t.nav.teams, icon: Users, href: "/team" },
    { title: t.nav.reports, icon: ClipboardList, href: "/reports" },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4 border-b border-border">
        <div className="flex items-center gap-3 px-1">
          <ZyraLogo className="h-9 w-9 shrink-0" />
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
                    isActive={pathname === item.href}
                    tooltip={item.title}
                    className="hover:bg-accent/10 active:bg-accent/20"
                  >
                    <a href={item.href} className="flex items-center gap-3">
                      <item.icon className={pathname === item.href ? "text-accent" : "text-muted-foreground"} />
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
