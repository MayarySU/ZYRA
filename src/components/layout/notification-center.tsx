"use client";

import { Bell, FileText, CheckCircle2, XCircle, Users, Trophy, Zap, CheckCheck, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMemo, useState } from "react";
import { useReportes } from "@/hooks/queries";
import { cn } from "@/lib/utils";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";

interface NotifItem {
  id: string;
  type: "report" | "team" | "level" | "achievement";
  title: string;
  message: string;
  date: string | undefined;
  read: boolean;
}

// ─── Icon per type ────────────────────────────────
function NotifIcon({ type, status }: { type: string; status?: string }) {
  if (type === "team")        return <Users className="h-4 w-4 text-blue-400" />;
  if (type === "level")       return <Zap className="h-4 w-4 text-yellow-400" />;
  if (type === "achievement") return <Trophy className="h-4 w-4 text-amber-400" />;
  if (status === "Aprobado")  return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === "Rechazado") return <XCircle className="h-4 w-4 text-red-400" />;
  return <FileText className="h-4 w-4 text-accent" />;
}

function formatDate(dateStr: string | undefined) {
  if (!dateStr) return "Recientemente";
  const d = new Date(dateStr);
  if (!isValid(d)) return "Recientemente";
  return format(d, "d MMM, HH:mm", { locale: es });
}

export function NotificationCenter() {
  const { data: reportes = [], isLoading } = useReportes();

  // ── Local read-tracking (session only) ───────────
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const markRead  = (id: string) => setReadIds(prev => new Set([...prev, id]));
  const markAll   = () => setReadIds(new Set(notifications.map(n => n.id)));
  const clearAll  = () => setReadIds(new Set(notifications.map(n => n.id)));

  // ── Build notification list ───────────────────────
  const notifications: NotifItem[] = useMemo(() => {
    return (reportes || [])
      .filter(r => r.estado === "pendiente")
      .map(r => {
        const id = String(r.id_reporte);
        const projectName = r.proyectos?.nombre_proyecto || "proyecto";
        const author = r.empleados?.nombre || "Un técnico";

        const message = r.comentarios
          ? `${author} envió un reporte del proyecto "${projectName}": "${r.comentarios}". Requiere tu aprobación.`
          : `${author} envió un reporte del proyecto "${projectName}". Requiere tu aprobación.`;

        return {
          id,
          type: "report" as const,
          title: "📄 Nuevo reporte pendiente",
          message,
          date: r.fecha_reporte,
          read: readIds.has(id),
        };
      })
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .slice(0, 40);
  }, [reportes, readIds]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-white/10 transition-colors">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0 bg-card border-white/10 shadow-2xl mr-4 overflow-hidden rounded-xl" align="end">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">Notificaciones</h3>
            {unreadCount > 0 && (
              <span className="text-[9px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={markAll} title="Marcar todo como leído">
                <CheckCheck className="h-3.5 w-3.5" />
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={clearAll} title="Limpiar todo">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* List */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <div className="h-12 w-12 rounded-full bg-muted/10 flex items-center justify-center mb-4">
                <Bell className="h-6 w-6 text-muted-foreground opacity-20 animate-pulse" />
              </div>
            </div>
          ) : notifications.length > 0 ? (
            <div className="divide-y divide-white/5">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    "p-4 transition-all cursor-pointer",
                    !notif.read ? "bg-accent/5 hover:bg-accent/10" : "opacity-60 hover:opacity-90 hover:bg-white/5"
                  )}
                  onClick={() => markRead(notif.id)}
                >
                  <div className="flex gap-3">
                    <div className={cn("mt-0.5 p-2 rounded-lg shrink-0", !notif.read ? "bg-accent/10" : "bg-muted/20")}>
                      <NotifIcon type={notif.type} status={
                        notif.title.includes("aprobado") ? "Aprobado" :
                        notif.title.includes("rechazado") ? "Rechazado" : undefined
                      } />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-xs font-bold leading-snug", !notif.read ? "text-foreground" : "text-foreground/60")}>
                          {notif.title}
                        </p>
                        {!notif.read && <span className="h-1.5 w-1.5 bg-accent rounded-full mt-1 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-[9px] text-muted-foreground uppercase font-medium mt-1">
                        {formatDate(notif.date)}
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
              <p className="text-[10px] text-muted-foreground/60 mt-1 max-w-[160px]">
                Te avisaremos cuando haya novedades importantes.
              </p>
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-3 border-t border-white/5 bg-muted/10 text-center">
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">
              {notifications.length} notificacion{notifications.length !== 1 ? "es" : ""}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
