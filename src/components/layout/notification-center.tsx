"use client";

import { Bell, Check, Info, Zap, Briefcase, Users, CheckCheck, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, doc, updateDoc, writeBatch, getDocs, deleteDoc, limit } from "firebase/firestore";
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
      where("userId", "==", user.uid),
      limit(50)
    );
  }, [db, user?.uid]);

  const { data: notifications, isLoading } = useCollection(notificationsQuery);
  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  const markAsRead = async (id: string) => {
    if (!db) return;
    const notifRef = doc(db, "notifications", id);
    updateDoc(notifRef, { read: true });
  };

  const markAllAsRead = async () => {
    if (!db || !notifications) return;
    const batch = writeBatch(db);
    notifications.forEach(n => {
      if (!n.read) {
        const ref = doc(db, "notifications", n.id);
        batch.update(ref, { read: true });
      }
    });
    await batch.commit();
  };

  const clearNotifications = async () => {
    if (!db || !notifications) return;
    const batch = writeBatch(db);
    notifications.forEach(n => {
      const ref = doc(db, "notifications", n.id);
      batch.delete(ref);
    });
    await batch.commit();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'team': return <Users className="h-4 w-4 text-blue-500" />;
      case 'project': return <Briefcase className="h-4 w-4 text-emerald-500" />;
      case 'report': return <Check className="h-4 w-4 text-accent" />;
      case 'level': return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'achievement': return <Zap className="h-4 w-4 text-yellow-500" />;
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
        <Button variant="ghost" size="icon" className="relative hover:bg-white/10 transition-colors">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-card border-white/10 shadow-2xl mr-4 overflow-hidden rounded-xl" align="end">
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest">Notificaciones</h3>
            {unreadCount > 0 && (
              <span className="text-[9px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-white" onClick={markAllAsRead} title="Marcar todo como leído">
                <CheckCheck className="h-3.5 w-3.5" />
              </Button>
            )}
            {notifications && notifications.length > 0 && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={clearNotifications} title="Limpiar todo">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-accent"></div>
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="divide-y divide-white/5">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    "p-4 transition-all cursor-pointer relative group",
                    !notif.read ? "bg-accent/5" : "bg-transparent opacity-70 hover:opacity-100 hover:bg-white/2"
                  )}
                  onClick={() => !notif.read && markAsRead(notif.id)}
                >
                  <div className="flex gap-3">
                    <div className="mt-1 flex-shrink-0">
                      <div className={cn("p-2 rounded-lg", !notif.read ? "bg-accent/10" : "bg-muted/10")}>
                        {getIcon(notif.type)}
                      </div>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("text-xs font-bold leading-none truncate", !notif.read ? "text-white" : "text-white/60")}>
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <span className="h-1.5 w-1.5 bg-accent rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-[9px] text-muted-foreground uppercase font-medium mt-1">
                        {formatNotifDate(notif.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <div className="h-12 w-12 rounded-full bg-muted/10 flex items-center justify-center mb-4">
                <Bell className="h-6 w-6 text-muted-foreground opacity-20" />
              </div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Sin notificaciones</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1 max-w-[150px]">Te avisaremos cuando haya novedades importantes.</p>
            </div>
          )}
        </ScrollArea>
        {notifications && notifications.length > 0 && (
          <div className="p-3 border-t border-white/5 bg-muted/10 text-center">
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Fin de las notificaciones</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}