"use client";

import * as React from "react";
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  ClipboardList, 
  Building2,
  Package,
  Settings, 
  LogOut,
  Zap,
  UserCircle
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUser, useAuth } from "@/firebase";
import { signOut } from "firebase/auth";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { profile } = useUser();
  const isAdmin = profile?.rol === 'admin';

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const navItems = isAdmin ? [
    { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { title: "Proyectos", icon: Briefcase, href: "/projects" },
    { title: "Clientes", icon: Building2, href: "/clients" },
    { title: "Equipos", icon: Users, href: "/team" },
    { title: "Empleados", icon: UserCircle, href: "/employees" },
    { title: "Reportes", icon: ClipboardList, href: "/reports" },
    { title: "Materiales", icon: Package, href: "/materials" },
  ] : [
    { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { title: "Proyectos", icon: Briefcase, href: "/projects" },
    { title: "Equipo", icon: Users, href: "/team" },
    { title: "Reportes", icon: ClipboardList, href: "/reports" },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white group-data-[collapsible=icon]:hidden">
            ZYRA<span className="text-accent">COMMAND</span>
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground">
            {isAdmin ? "Panel de Administración" : "General"}
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
      <SidebarFooter className="border-t border-white/5 p-4">
        <SidebarMenu>
          <SidebarMenuItem className="space-y-4">
            <div className="flex items-center gap-3 px-2 py-2 group-data-[collapsible=icon]:hidden">
              <Avatar className="h-9 w-9 border-2 border-accent">
                <AvatarFallback className="bg-muted text-xs">
                  {profile?.nombre?.substring(0, 2).toUpperCase() || "ZY"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold truncate text-white">{profile?.nombre}</span>
                <span className="text-[10px] text-muted-foreground truncate uppercase font-bold tracking-widest">{profile?.rol}</span>
              </div>
            </div>
            <SidebarMenuButton 
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              tooltip="Cerrar Sesión"
            >
              <LogOut className="h-4 w-4" />
              <span className="font-medium group-data-[collapsible=icon]:hidden">Cerrar Sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
