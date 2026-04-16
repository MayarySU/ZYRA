"use client";

import { Bell, Check, Info, Zap, Briefcase, Users } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, doc, updateDoc, limit } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";

export function NotificationCenter() {
  const { user } = useUser();
  const db = useFirestore();

  const notificationsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "notifications"),
      where("userId", "==", user.uid)
    );
  }, [db, user?.uid]);

  const { data: notifications, isLoading } = useCollection(notificationsQuery);
  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  const markAsRead = async (id: string) => {
    if (!db) return;
    const notifRef = doc(db, "notifications", id);
    updateDoc(notifRef, { read: true });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'team': return <Users className="h-4 w-4 text-blue-500" />;
      case 'project': return <Briefcase className="h-4 w-4 text-emerald-500" />;
      case 'report': return <Check className="h-4 w-4 text-accent" />;
      case 'level': return <Zap className="h-4 w-4 text-yellow-500" />;
      default: return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatNotifDate = (dateStr: string | undefined) => {
    if (!dateStr) return "Recientemente";
    const date = new Date(dateStr);
    if (!isValid(date)) return "Recientemente";
    return format(date, "d 'de' MMMM, HH:mm", { locale: es });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-white/10">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-card border-white/10 shadow-2xl mr-4" align="end">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Notificaciones</h3>
          {unreadCount > 0 && (
            <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full font-bold">
              {unreadCount} nuevas
            </span>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-accent"></div>
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="divide-y divide-white/5">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    "p-4 transition-colors cursor-pointer hover:bg-white/2",
                    !notif.read && "bg-accent/5"
                  )}
                  onClick={() => !notif.read && markAsRead(notif.id)}
                >
                  <div className="flex gap-3">
                    <div className="mt-1">{getIcon(notif.type)}</div>
                    <div className="space-y-1">
                      <p className={cn("text-xs font-bold leading-none", notif.read ? "text-white/70" : "text-white")}>
                        {notif.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {notif.message}
                      </p>
                      <p className="text-[9px] text-muted-foreground uppercase font-medium">
                        {formatNotifDate(notif.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Bell className="h-8 w-8 text-muted-foreground opacity-20 mb-2" />
              <p className="text-xs text-muted-foreground">Sin notificaciones nuevas</p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}