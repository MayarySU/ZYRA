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
  Zap
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
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white group-data-[collapsible=icon]:hidden">
            ZYRA <span className="text-accent">{isAdmin ? "COMMAND" : "OPERATIVO"}</span>
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground">
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
                      <item.icon className={pathname === item.href ? "text-accent" : ""} />
                      <span className="font-medium">{item.title}</span>
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
