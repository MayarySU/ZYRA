
"use client";

import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { StatCard } from "@/components/dashboard/stat-card";
import { 
  Trophy, 
  Flame, 
  Star, 
  Zap, 
  Briefcase,
  Camera,
  Users,
  Loader2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useI18n } from "@/components/providers/i18n-provider";
import { collection, query, where } from "firebase/firestore";
import { startOfDay, subWeeks, isAfter, format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";

export default function DashboardPage() {
  const { profile, loading: userLoading, user } = useUser();
  const db = useFirestore();
  const { t } = useI18n();
  const isAdmin = profile?.rol === 'admin';

  // Admin Queries - Solo se activan si el usuario es administrador y está autenticado
  const projectsQuery = useMemoFirebase(() => (db && isAdmin) ? collection(db, "proyectos") : null, [db, isAdmin]);
  const reportsQuery = useMemoFirebase(() => (db && isAdmin) ? collection(db, "reports") : null, [db, isAdmin]);
  const usersQuery = useMemoFirebase(() => (db && isAdmin) ? collection(db, "users") : null, [db, isAdmin]);

  const { data: projects, isLoading: projectsLoading } = useCollection(projectsQuery);
  const { data: reports, isLoading: reportsLoading } = useCollection(reportsQuery);
  const { data: allUsers, isLoading: usersLoading } = useCollection(usersQuery);

  // Statistics Calculation
  const stats = useMemo(() => {
    if (!projects || !reports || !allUsers) return { activeProjects: 0, dailyReports: 0, activeEmployees: 0 };
    
    const activeProjects = projects.filter(p => p.Pry_Estado !== 'Finalizado').length;
    
    const today = startOfDay(new Date());
    const dailyReports = reports.filter(r => {
      const reportDate = r.timestamp ? new Date(r.timestamp) : null;
      return reportDate && isAfter(reportDate, today);
    }).length;

    const activeEmployees = allUsers.filter(u => u.rol === 'employee').length;

    return { 
      activeProjects, 
      dailyReports, 
      activeEmployees,
      totalProjects: projects.length,
      totalEmployees: allUsers.length
    };
  }, [projects, reports, allUsers]);

  // Project Progress Data (Pie Chart)
  const projectProgressData = useMemo(() => {
    if (!projects) return [];
    const finished = projects.filter(p => p.Pry_Estado === 'Finalizado').length;
    const inProgress = projects.length - finished;
    return [
      { name: t.reports.approved, value: finished, color: 'hsl(var(--primary))' },
      { name: t.reports.pending, value: inProgress, color: 'hsl(var(--secondary))' },
    ];
  }, [projects, t]);

  // Weekly Reports Data (Bar Chart)
  const weeklyData = useMemo(() => {
    if (!reports) return [];
    const weeks = [3, 2, 1, 0].map(offset => {
      const date = subWeeks(new Date(), offset);
      const start = startOfWeek(date, { weekStartsOn: 1 });
      const label = `Sem ${format(start, "dd/MM")}`;
      return { name: label, total: 0, start };
    });

    reports.forEach(r => {
      const reportDate = r.timestamp ? new Date(r.timestamp) : null;
      if (reportDate) {
        const weekIndex = weeks.findIndex((w, i) => {
          const nextWeek = i < 3 ? weeks[i+1].start : new Date();
          return isAfter(reportDate, w.start) && (i === 3 || !isAfter(reportDate, nextWeek));
        });
        if (weekIndex !== -1) weeks[weekIndex].total++;
      }
    });

    return weeks;
  }, [reports]);

  if (userLoading || (isAdmin && (projectsLoading || reportsLoading || usersLoading))) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto font-body">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            {t.common.welcome}, <span className="text-accent">{t.common.admin}.</span>
          </h2>
          <p className="text-muted-foreground">{t.dashboard.admin_subtitle}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <StatCard
            title={t.dashboard.active_projects}
            value={stats.activeProjects}
            icon={Briefcase}
            description={`${t.dashboard.of} ${stats.totalProjects} ${t.dashboard.total}`}
          />
          <StatCard
            title={t.dashboard.daily_reports}
            value={`+${stats.dailyReports}`}
            icon={Camera}
            description={`${reports?.length || 0} en ${t.dashboard.total}`}
          />
          <StatCard
            title={t.dashboard.active_employees}
            value={stats.activeEmployees}
            icon={Users}
            description={`${stats.totalEmployees} miembros en ${t.dashboard.total}`}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-lg">{t.dashboard.weekly_reports}</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ChartContainer config={{ total: { label: t.nav.reports, color: "hsl(var(--accent))" } }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="currentColor" 
                      opacity={0.5}
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="currentColor"
                      opacity={0.5}
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      dataKey="total" 
                      fill="hsl(var(--accent))" 
                      radius={[4, 4, 0, 0]} 
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-lg">{t.dashboard.work_progress}</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] flex flex-col items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectProgressData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {projectProgressData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 mt-4 w-full">
                {projectProgressData.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">{entry.name}</span>
                    </div>
                    <span className="text-[10px] font-bold text-foreground">{entry.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Employee View
  const puntos = profile?.puntos || 0;
  const nivel = profile?.nivel || 1;
  const racha = profile?.racha || 0;
  const targetPoints = nivel * 200;
  const progressPercentage = (puntos / targetPoints) * 100;
  const logros = profile?.logros || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-body">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          {t.dashboard.op_panel}
        </h2>
        <p className="text-xs md:text-sm text-muted-foreground">{t.dashboard.op_subtitle}</p>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden relative border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-accent/20">
                <Zap className="h-4 w-4 text-accent" />
              </div>
              <Badge variant="outline" className="text-[10px] border-accent/30 text-accent font-bold">{t.dashboard.level} {nivel}</Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <h3 className="text-2xl font-bold text-foreground">{Math.floor(progressPercentage)}%</h3>
                <span className="text-[10px] text-muted-foreground font-bold">{t.dashboard.points}: {puntos} / {targetPoints}</span>
              </div>
              <Progress value={progressPercentage} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:contents">
          <Card className="flex flex-col items-center justify-center p-4 border-border">
            <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center mb-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
            </div>
            <h3 className="text-xl font-bold text-foreground">{logros.filter((l: any) => l.completado).length}</h3>
            <p className="text-[9px] font-bold text-yellow-500 uppercase tracking-tighter">{t.dashboard.achievements}</p>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
          <Star className="h-4 w-4 text-accent" /> {t.dashboard.badges}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {logros.length > 0 ? logros.map((logro: any) => {
            const isCompletado = logro.completado;
            const colors: Record<string, string> = {
              'Novato': 'text-blue-500 bg-blue-500/10 border-blue-500/20',
              'Experto': 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
              'Elite': 'text-purple-500 bg-purple-500/10 border-purple-500/20',
              'Leyenda': 'text-amber-500 bg-amber-500/10 border-amber-500/20',
            };
            const medalColor = colors[logro.nombre as string] || 'text-accent bg-accent/10 border-accent/20';
            
            return (
              <div 
                key={logro.id}
                className={cn(
                  "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all duration-300",
                  isCompletado 
                    ? `bg-card ${medalColor.split(' ').slice(1).join(' ')} shadow-lg shadow-black/5 scale-100` 
                    : "bg-muted/10 border-border text-muted-foreground opacity-30 grayscale blur-[0.5px] scale-95"
                )}
              >
                <div className={cn(
                  "h-12 w-12 rounded-full flex items-center justify-center shadow-inner transition-transform duration-500",
                  isCompletado ? "bg-white/80 dark:bg-black/20 rotate-0" : "bg-muted rotate-12"
                )}>
                  <Trophy className={cn("h-6 w-6", isCompletado ? medalColor.split(' ')[0] : "text-muted-foreground")} />
                </div>
                <div className="text-center">
                  <p className={cn("font-black text-[10px] uppercase tracking-widest", isCompletado ? "text-foreground" : "text-muted-foreground")}>
                    {logro.nombre}
                  </p>
                  {isCompletado && (
                    <span className="text-[8px] font-bold text-accent uppercase opacity-70">Obtenido</span>
                  )}
                </div>
              </div>
            );
          }) : (
            <div className="col-span-full py-12 text-center bg-muted/20 border border-dashed border-border rounded-2xl flex flex-col items-center">
              <Trophy className="h-8 w-8 text-muted-foreground opacity-20 mb-2" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t.dashboard.op_subtitle}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
