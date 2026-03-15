"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  ClipboardList
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/firebase";
import { useI18n } from "@/components/providers/i18n-provider";

export function BottomNav() {
  const pathname = usePathname();
  const { profile } = useUser();
  const { t } = useI18n();
  const isAdmin = profile?.rol === 'admin';

  if (isAdmin) return null;

  const navItems = [
    { title: t.nav.dashboard, icon: LayoutDashboard, href: "/dashboard" },
    { title: t.nav.projects, icon: Briefcase, href: "/projects" },
    { title: t.nav.teams, icon: Users, href: "/team" },
    { title: t.nav.reports, icon: ClipboardList, href: "/reports" },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-white/5 pb-safe">
      <nav className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-full h-full transition-all",
                isActive ? "text-accent" : "text-muted-foreground hover:text-white"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "scale-110")} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">
                {item.title}
              </span>
              {isActive && (
                <div className="absolute bottom-1 h-1 w-1 rounded-full bg-accent" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
