"use client";

import { Bell, FileText, CheckCircle2, XCircle, Clock, Users, Trophy, Zap, CheckCheck, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, doc, writeBatch, limit } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { useMemo, useState } from "react";

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
  const { user, profile } = useUser();
  const db = useFirestore();
  const isAdmin = profile?.rol === "admin";

  // ── Employee: sus propios reportes ────────────────
  const empReportsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid || isAdmin) return null;
    return query(
      collection(db, "reports"),
      where("employeeId", "==", user.uid)
    );
  }, [db, user?.uid, isAdmin]);

  // ── Admin: TODOS los reportes (sin filtro de estado para evitar index compuesto)
  const adminReportsQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null;
    return collection(db, "reports"); // todos los reportes, sin filtro adicional
  }, [db, isAdmin]);

  const { data: empReports }   = useCollection(empReportsQuery);
  const { data: adminReports } = useCollection(adminReportsQuery);

  // ── Local read-tracking (session only) ───────────
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const markRead  = (id: string) => setReadIds(prev => new Set([...prev, id]));
  const markAll   = () => setReadIds(new Set(notifications.map(n => n.id)));
  const clearAll  = () => setReadIds(new Set(notifications.map(n => n.id)));

  // ── Build notification list ───────────────────────
  const notifications: NotifItem[] = useMemo(() => {
    if (isAdmin) {
      return (adminReports || [])
        .map(r => {
          const status = r.status || "Pendiente";
          const projectName = r.projectName || r.Pry_Nombre_Proyecto || "proyecto";
          const author = r.authorName || r.employeeName || "Un técnico";

          let title = "";
          let message = "";

          if (status === "Pendiente") {
            title = "📄 Nuevo reporte pendiente";
            message = `${author} envió un reporte del proyecto "${projectName}". Requiere tu aprobación.`;
          } else if (status === "EnRevision") {
            title = "🔄 Corrección de reporte recibida";
            message = `${author} corrigió su reporte del proyecto "${projectName}". Lista para revisión.`;
          } else if (status === "Aprobado") {
            title = "✅ Reporte aprobado";
            message = `El reporte de "${projectName}" por ${author} fue aprobado.`;
          } else if (status === "Rechazado") {
            title = "❌ Reporte rechazado";
            message = `El reporte de "${projectName}" por ${author} fue rechazado.`;
          } else {
            title = "📋 Reporte actualizado";
            message = `${author} actualizó su reporte del proyecto "${projectName}".`;
          }

          return {
            id: r.id,
            type: "report" as const,
            title,
            message,
            date: r.timestamp || r.createdAt,
            read: readIds.has(r.id),
          };
        })
        .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
        .slice(0, 40);
    }

    // Employee view: build events from their reports
    const items: NotifItem[] = [];
    for (const r of (empReports || [])) {
      // Report submission confirmation
      items.push({
        id: `sent-${r.id}`,
        type: "report",
        title: "📤 Reporte enviado",
        message: `Enviaste tu reporte del proyecto "${r.projectName || r.Pry_Nombre_Proyecto || "—"}". Espera la revisión del administrador.`,
        date: r.timestamp,
        read: readIds.has(`sent-${r.id}`),
      });
      // Approval / rejection
      if (r.status === "Aprobado") {
        items.push({
          id: `approved-${r.id}`,
          type: "report",
          title: "✅ Reporte aprobado",
          message: `Tu reporte del proyecto "${r.projectName || r.Pry_Nombre_Proyecto || "—"}" fue aprobado. ¡+50 puntos ganados!`,
          date: r.timestamp,
          read: readIds.has(`approved-${r.id}`),
        });
      }
      if (r.status === "Rechazado") {
        items.push({
          id: `rejected-${r.id}`,
          type: "report",
          title: "❌ Reporte rechazado",
          message: `Tu reporte del proyecto "${r.projectName || r.Pry_Nombre_Proyecto || "—"}" fue rechazado. Corrígelo y vuelve a enviarlo.`,
          date: r.timestamp,
          read: readIds.has(`rejected-${r.id}`),
        });
      }
    }
    // Medal events from profile.logros
    for (const logro of (profile?.logros || [])) {
      if (logro.completado && logro.obtainedAt) {
        items.push({
          id: `medal-${logro.id}`,
          type: "achievement",
          title: `${logro.emoji || "🏅"} Medalla Desbloqueada: ${logro.nombre}`,
          message: "¡Felicidades! Conseguiste una nueva medalla en ZYRA.",
          date: logro.obtainedAt,
          read: readIds.has(`medal-${logro.id}`),
        });
      }
    }
    return items
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .slice(0, 30);
  }, [isAdmin, adminReports, empReports, profile, readIds]);

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
          {notifications.length > 0 ? (
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