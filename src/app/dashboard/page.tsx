
"use client";

import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import {
  Trophy,
  Star,
  Zap,
  Briefcase,
  FileText,
  Users,
  Loader2,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  Award,
  Flame,
  Shield,
  ChevronRight,
  Activity,
  BarChart2,
  Package,
  Wrench,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useMemo, useEffect, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Tooltip,
} from "recharts";
import { useI18n } from "@/components/providers/i18n-provider";
import { collection, query, where } from "firebase/firestore";
import { startOfDay, subWeeks, isAfter, format, startOfWeek, subDays } from "date-fns";
import { es } from "date-fns/locale";

// ─────────────────────────────────────────────────
// MEDAL CONFIG
// ─────────────────────────────────────────────────
const MEDAL_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  Novato:   { color: "text-blue-400 bg-blue-500/10 border-blue-500/20",    icon: "🥉", label: "Novato" },
  Experto:  { color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: "🥈", label: "Experto" },
  Elite:    { color: "text-purple-400 bg-purple-500/10 border-purple-500/20",   icon: "🥇", label: "Elite" },
  Leyenda:  { color: "text-amber-400 bg-amber-500/10 border-amber-500/20",      icon: "👑", label: "Leyenda" },
};

// ─────────────────────────────────────────────────
// STATUS STYLE HELPERS
// ─────────────────────────────────────────────────
function statusStyle(status: string) {
  switch (status) {
    case "Finalizado":  return { color: "text-emerald-400", bg: "bg-emerald-500/10", icon: <CheckCircle2 className="h-3 w-3" /> };
    case "EnProceso":   return { color: "text-blue-400",    bg: "bg-blue-500/10",    icon: <Activity className="h-3 w-3" /> };
    case "EnRevision":  return { color: "text-yellow-400",  bg: "bg-yellow-500/10",  icon: <Clock className="h-3 w-3" /> };
    case "Rechazado":   return { color: "text-red-400",     bg: "bg-red-500/10",     icon: <XCircle className="h-3 w-3" /> };
    default:            return { color: "text-muted-foreground", bg: "bg-muted/20",  icon: <Clock className="h-3 w-3" /> };
  }
}

// ─────────────────────────────────────────────────
// ADMIN DASHBOARD
// ─────────────────────────────────────────────────
function AdminDashboard({ projects, reports, allUsers, materials }: any) {
  const { t } = useI18n();

  const stats = useMemo(() => {
    const activeProjects  = (projects || []).filter((p: any) => p.Pry_Estado !== "Finalizado").length;
    const finishedProjects = (projects || []).filter((p: any) => p.Pry_Estado === "Finalizado").length;
    const pendingReports  = (reports  || []).filter((r: any) => r.status === "Pendiente").length;
    const approvedReports = (reports  || []).filter((r: any) => r.status === "Aprobado").length;
    const employees       = (allUsers || []).filter((u: any) => u.rol === "employee");
    const criticalMats    = (materials || []).filter((m: any) => (m.Mat_Stock_Disponible || 0) <= 5).length;

    const today = startOfDay(new Date());
    const todayReports = (reports || []).filter((r: any) =>
      r.timestamp && isAfter(new Date(r.timestamp), today)
    ).length;

    return { activeProjects, finishedProjects, pendingReports, approvedReports, employees, todayReports, criticalMats,
      totalProjects: (projects || []).length, totalReports: (reports || []).length };
  }, [projects, reports, allUsers, materials]);

  // Weekly bar chart
  const weeklyData = useMemo(() => {
    const weeks = [6, 5, 4, 3, 2, 1, 0].map(offset => {
      const date  = subDays(new Date(), offset);
      const label = format(date, "EEE", { locale: es });
      return { name: label, reportes: 0, proyectos: 0, date };
    });
    (reports || []).forEach((r: any) => {
      if (!r.timestamp) return;
      const d = new Date(r.timestamp);
      const idx = weeks.findIndex(w => format(w.date, "yyyyMMdd") === format(d, "yyyyMMdd"));
      if (idx !== -1) weeks[idx].reportes++;
    });
    return weeks;
  }, [reports]);

  // Pie chart: project states
  const pieData = useMemo(() => [
    { name: "Activos",    value: stats.activeProjects,   color: "hsl(var(--accent))" },
    { name: "Finalizados",value: stats.finishedProjects, color: "hsl(142 71% 45%)" },
  ], [stats]);

  // Report status breakdown
  const reportStatusData = useMemo(() => [
    { name: "Pendiente", value: stats.pendingReports,  color: "#f59e0b" },
    { name: "Aprobado",  value: stats.approvedReports, color: "#10b981" },
    { name: "Rechazado", value: (reports || []).filter((r: any) => r.status === "Rechazado").length, color: "#ef4444" },
  ], [reports, stats]);

  // Top employees by points
  const topEmployees = useMemo(() =>
    [...(stats.employees || [])]
      .sort((a: any, b: any) => (b.puntos || 0) - (a.puntos || 0))
      .slice(0, 5),
    [stats.employees]
  );

  // Recent projects
  const recentProjects = useMemo(() =>
    [...(projects || [])].slice(-5).reverse(),
    [projects]
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-body">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-black tracking-tight text-foreground">
          Panel <span className="text-accent">Administrativo</span>
        </h2>
        <p className="text-sm text-muted-foreground">Resumen operativo en tiempo real de todos los equipos y proyectos.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Proyectos Activos",  value: stats.activeProjects,  icon: <Briefcase className="h-5 w-5" />,  delta: `${stats.totalProjects} en total`, color: "text-accent bg-accent/10" },
          { label: "Reportes Hoy",       value: stats.todayReports,    icon: <FileText className="h-5 w-5" />,   delta: `${stats.pendingReports} pendientes`, color: "text-yellow-400 bg-yellow-500/10" },
          { label: "Empleados",          value: stats.employees.length, icon: <Users className="h-5 w-5" />,     delta: "en nómina activa", color: "text-blue-400 bg-blue-500/10" },
          { label: "Stock Crítico",      value: stats.criticalMats,     icon: <Package className="h-5 w-5" />,   delta: "materiales ≤ 5 unidades", color: "text-red-400 bg-red-500/10" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-border bg-card hover:border-accent/30 transition-all">
            <CardContent className="p-5">
              <div className={cn("inline-flex p-2 rounded-xl mb-3", kpi.color)}>
                {kpi.icon}
              </div>
              <div className="text-3xl font-black text-foreground">{kpi.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">{kpi.label}</div>
              <div className="text-[10px] text-muted-foreground/60 mt-0.5">{kpi.delta}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Bar chart - Weekly reports */}
        <Card className="md:col-span-2 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-accent" /> Reportes – Últimos 7 días
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.07} vertical={false} />
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} stroke="currentColor" opacity={0.4} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="currentColor" opacity={0.4} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 11 }}
                  labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 700 }}
                  itemStyle={{ color: "hsl(var(--accent))" }}
                />
                <Bar dataKey="reportes" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie – Project states */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" /> Estado Proyectos
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-[220px]">
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 11 }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5 w-full px-2">
              {pieData.map((e, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: e.color }} />
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">{e.name}</span>
                  </div>
                  <span className="text-[10px] font-black text-foreground">{e.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Report Status Breakdown */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent" /> Estado de Reportes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {reportStatusData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-bold text-muted-foreground">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        backgroundColor: item.color,
                        width: stats.totalReports > 0 ? `${(item.value / stats.totalReports) * 100}%` : "0%"
                      }}
                    />
                  </div>
                  <span className="text-xs font-black text-foreground w-6 text-right">{item.value}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Employees */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4 text-accent" /> Ranking de Empleados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topEmployees.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sin datos aún</p>
            ) : topEmployees.map((emp: any, i: number) => (
              <div key={emp.id} className="flex items-center gap-3">
                <div className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0",
                  i === 0 ? "bg-amber-500/20 text-amber-400" :
                  i === 1 ? "bg-slate-400/20 text-slate-300" :
                  i === 2 ? "bg-orange-700/20 text-orange-500" : "bg-muted text-muted-foreground"
                )}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{emp.nombre || "—"}</p>
                  <p className="text-[9px] text-muted-foreground">Nv. {emp.nivel || 1}</p>
                </div>
                <Badge variant="outline" className="text-[9px] font-black border-accent/30 text-accent shrink-0">
                  {emp.puntos || 0} pts
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Projects */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-accent" /> Proyectos Recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentProjects.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sin proyectos</p>
            ) : recentProjects.map((proj: any) => {
              const s = statusStyle(proj.Pry_Estado);
              return (
                <div key={proj.id} className="flex items-center gap-3">
                  <div className={cn("p-1.5 rounded-lg shrink-0", s.bg, s.color)}>{s.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{proj.Pry_Nombre_Proyecto}</p>
                    <p className="text-[9px] text-muted-foreground truncate">{proj.clientName || "Sin cliente"}</p>
                  </div>
                  <Badge variant="outline" className={cn("text-[8px] font-black shrink-0 border-0", s.bg, s.color)}>
                    {proj.Pry_Estado || "—"}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// EMPLOYEE DASHBOARD
// ─────────────────────────────────────────────────
function EmployeeDashboard({ profile, reports, projects }: any) {
  const puntos   = profile?.puntos  || 0;
  const nivel    = profile?.nivel   || 1;
  const racha    = profile?.racha   || 0;
  const logros   = profile?.logros  || [];
  const targetPts = nivel * 200;
  const pct      = Math.min((puntos / targetPts) * 100, 100);

  // Level-up celebration
  const prevNivelRef = useRef<number>(nivel);
  const { toast } = useToast();
  useEffect(() => {
    if (nivel > prevNivelRef.current) {
      toast({
        title: `🎉 ¡Subiste al Nivel ${nivel}!`,
        description: `Felicidades, ahora eres Nivel ${nivel}. ¡Sigue así!`,
      });
    }
    prevNivelRef.current = nivel;
  }, [nivel]);

  // History feed: combine my reports + project events
  const historial = useMemo(() => {
    const uid = profile?.uid;
    const myReports = (reports || [])
      .filter((r: any) => r.employeeId === uid || r.authorName === profile?.nombre)
      .map((r: any) => ({
        id: r.id,
        type: "report" as const,
        label: r.status === "Aprobado" ? "✅ Reporte aprobado" : r.status === "Rechazado" ? "❌ Reporte rechazado" : "📤 Reporte enviado",
        sub: r.projectName || "Sin proyecto",
        date: r.timestamp,
        pts: r.status === "Aprobado" ? "+50 pts" : null,
        color: r.status === "Aprobado" ? "text-emerald-400" : r.status === "Rechazado" ? "text-red-400" : "text-yellow-400",
      }));
    return myReports
      .sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .slice(0, 8);
  }, [reports, profile]);

  const completedLogros = logros.filter((l: any) => l.completado);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-body">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tight text-foreground">
          ¡Hola, <span className="text-accent">{profile?.nombre?.split(" ")[0] || "Técnico"}</span>! 👋
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Tu progreso y actividad reciente.</p>
      </div>

      {/* Level + Streak + Medals KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Level progress */}
        <Card className="col-span-2 border-border bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-accent/20"><Zap className="h-5 w-5 text-accent" /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nivel actual</p>
                  <p className="text-2xl font-black text-foreground">Nivel {nivel}</p>
                </div>
              </div>
              <Badge variant="outline" className="border-accent/30 text-accent font-black text-xs">
                {puntos} / {targetPts} pts
              </Badge>
            </div>
            <Progress value={pct} className="h-2.5 rounded-full" />
            <p className="text-[9px] text-muted-foreground mt-2 font-bold">{Math.round(pct)}% al siguiente nivel</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card flex flex-col items-center justify-center p-5">
          <div className="p-3 rounded-full bg-orange-500/10 mb-2">
            <Flame className="h-6 w-6 text-orange-400" />
          </div>
          <p className="text-3xl font-black text-foreground">{racha}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-orange-400 mt-0.5">Días de Racha</p>
        </Card>

        <Card className="border-border bg-card flex flex-col items-center justify-center p-5">
          <div className="p-3 rounded-full bg-yellow-500/10 mb-2">
            <Trophy className="h-6 w-6 text-yellow-400" />
          </div>
          <p className="text-3xl font-black text-foreground">{completedLogros.length}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-yellow-400 mt-0.5">Logros</p>
        </Card>
      </div>

      {/* Medals + History */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Medals */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Award className="h-4 w-4 text-accent" /> Medallas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logros.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <Shield className="h-10 w-10 text-muted-foreground/20" />
                <p className="text-xs text-muted-foreground font-bold">Completa proyectos para ganar medallas</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {logros.map((logro: any) => {
                  const cfg = MEDAL_CONFIG[logro.nombre as string] || { color: "text-accent bg-accent/10 border-accent/20", icon: "⭐", label: logro.nombre };
                  const done = logro.completado;
                  return (
                    <div
                      key={logro.id}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all",
                        done ? cn("bg-card", cfg.color) : "bg-muted/10 border-border grayscale opacity-30"
                      )}
                    >
                      <span className="text-3xl">{cfg.icon}</span>
                      <div className="text-center">
                        <p className={cn("text-[10px] font-black uppercase tracking-widest", done ? "text-foreground" : "text-muted-foreground")}>
                          {cfg.label}
                        </p>
                        {done && <span className="text-[8px] text-accent font-bold uppercase">Obtenida</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity History */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent" /> Historial de Acciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historial.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <Activity className="h-10 w-10 text-muted-foreground/20" />
                <p className="text-xs text-muted-foreground font-bold">Sin actividad registrada aún</p>
              </div>
            ) : (
              <div className="space-y-1">
                {historial.map((item: any) => (
                  <div key={item.id} className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-accent" />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-bold", item.color)}>{item.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{item.sub}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {item.pts && <p className="text-[9px] font-black text-emerald-400">{item.pts}</p>}
                      <p className="text-[9px] text-muted-foreground">
                        {item.date ? format(new Date(item.date), "dd MMM", { locale: es }) : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────
export default function DashboardPage() {
  const { profile, loading: userLoading, user } = useUser();
  const db      = useFirestore();
  const isAdmin = profile?.rol === "admin";

  const projectsQuery  = useMemoFirebase(() => (db && isAdmin)   ? collection(db, "proyectos")  : null, [db, isAdmin]);
  const reportsQuery   = useMemoFirebase(() => {
    if (!db || !user) return null;
    if (isAdmin) return collection(db, "reports");
    // Employees can only read their own reports (Firestore rules)
    return query(collection(db, "reports"), where("employeeId", "==", user.uid));
  }, [db, isAdmin, user]);
  const usersQuery     = useMemoFirebase(() => (db && isAdmin)   ? collection(db, "users")      : null, [db, isAdmin]);
  const materialsQuery = useMemoFirebase(() => (db && isAdmin)   ? collection(db, "materiales") : null, [db, isAdmin]);

  const { data: projects,  isLoading: projectsLoading  } = useCollection(projectsQuery);
  const { data: reports,   isLoading: reportsLoading   } = useCollection(reportsQuery);
  const { data: allUsers,  isLoading: usersLoading     } = useCollection(usersQuery);
  const { data: materials, isLoading: materialsLoading } = useCollection(materialsQuery);

  const isLoading = userLoading || reportsLoading || (isAdmin && (projectsLoading || usersLoading || materialsLoading));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (isAdmin) {
    return <AdminDashboard projects={projects} reports={reports} allUsers={allUsers} materials={materials} />;
  }

  return <EmployeeDashboard profile={profile} reports={reports} projects={projects} />;
}
