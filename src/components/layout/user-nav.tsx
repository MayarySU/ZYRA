
"use client";

import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser, useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Settings, LogOut, User, Zap, Trophy } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/components/providers/i18n-provider";

export function UserNav() {
  const { profile } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { t } = useI18n();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const isAdmin = profile?.rol === 'admin';
  const nameInitial = profile?.nombre?.substring(0, 1).toUpperCase() || "Z";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full border border-border hover:bg-muted p-0 overflow-hidden">
          <Avatar className="h-full w-full">
            <AvatarImage src={profile?.photoURL} alt={profile?.nombre} />
            <AvatarFallback className="bg-accent text-accent-foreground font-bold text-xs">{nameInitial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-card border-border shadow-2xl" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-bold leading-none text-foreground">{profile?.nombre}</p>
            <p className="text-[10px] font-medium leading-none text-muted-foreground uppercase tracking-widest mt-1">
              {isAdmin ? "ADMIN" : "TÉCNICO OPERATIVO"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer py-2 flex items-center w-full">
              <User className="mr-2 h-4 w-4 text-accent" />
              <span className="text-xs font-bold text-foreground">{t.nav.profile}</span>
            </Link>
          </DropdownMenuItem>
          {!isAdmin && (
            <>
              <DropdownMenuItem className="py-2">
                <Zap className="mr-2 h-4 w-4 text-accent" />
                <span className="text-xs font-bold text-foreground">{t.dashboard.level} {profile?.nivel || 1}</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="py-2">
                <Trophy className="mr-2 h-4 w-4 text-accent" />
                <span className="text-xs font-bold text-foreground">{profile?.puntos || 0} {t.dashboard.points}</span>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer py-2 flex items-center w-full">
              <Settings className="mr-2 h-4 w-4 text-accent" />
              <span className="text-xs font-bold text-foreground">{t.nav.settings}</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="text-destructive cursor-pointer py-2 font-bold"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span className="text-xs">{t.nav.logout}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
