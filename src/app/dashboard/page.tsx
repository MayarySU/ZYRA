"use client";

import { useUser } from "@/firebase";
import { StatCard } from "@/components/dashboard/stat-card";
import { 
  Trophy, 
  Flame, 
  Star, 
  Zap, 
  CheckCircle2, 
  TrendingUp,
  Briefcase,
  Camera,
  Users
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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

const weeklyData = [
  { name: 'Sem 16/02', total: 1 },
  { name: 'Sem 23/02', total: 0 },
  { name: 'Sem 02/03', total: 0 },
  { name: 'Sem 09/03', total: 0 },
];

const projectProgressData = [
  { name: 'Finalizado', value: 1, color: '#8A2BE2' },
  { name: 'En progreso', value: 4, color: '#63D9F0' },
];

export default function DashboardPage() {
  const { profile, loading } = useUser();
  const { t } = useI18n();
  const isAdmin = profile?.rol === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto font-body">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            {t.common.welcome}, <span className="text-accent">{t.common.admin}.</span>
          </h2>
          <p className="text-muted-foreground">{t.dashboard.admin_subtitle}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <StatCard
            title={t.dashboard.active_projects}
            value="3"
            icon={Briefcase}
            description={`de 5 ${t.dashboard.total}`}
            className="border-white/10"
          />
          <StatCard
            title={t.dashboard.daily_reports}
            value="+0"
            icon={Camera}
            description={`5 en ${t.dashboard.total}`}
            className="border-white/10"
          />
          <StatCard
            title={t.dashboard.active_employees}
            value="6"
            icon={Users}
            description={`7 miembros en ${t.dashboard.total}`}
            className="border-white/10"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="lg:col-span-2 bg-card border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">{t.dashboard.weekly_reports}</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ChartContainer config={{ total: { label: t.nav.reports, color: "#8A2BE2" } }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#ffffff50" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="#ffffff50" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      dataKey="total" 
                      fill="#8A2BE2" 
                      radius={[4, 4, 0, 0]} 
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="bg-card border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">{t.dashboard.work_progress}</CardTitle>
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
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-4">
                {projectProgressData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs text-muted-foreground">{entry.name}: {entry.value}</span>
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
  const progressPercentage = (puntos / (nivel * 200)) * 100;
  const logrosMock = profile?.logros || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-body">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
          {t.dashboard.op_panel}
        </h2>
        <p className="text-xs md:text-sm text-muted-foreground">{t.dashboard.op_subtitle}</p>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-white/10 overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-accent/20">
                <Zap className="h-4 w-4 text-accent" />
              </div>
              <Badge variant="outline" className="text-[10px] border-accent/30 text-accent font-bold">{t.dashboard.level} {nivel}</Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <h3 className="text-2xl font-bold text-white">{Math.floor(progressPercentage)}%</h3>
                <span className="text-[10px] text-muted-foreground font-bold">{t.dashboard.points}: {puntos} / {nivel * 200}</span>
              </div>
              <Progress value={progressPercentage} className="h-1.5 bg-white/5" />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4 md:contents">
          <Card className="bg-card border-white/10 flex flex-col items-center justify-center p-4">
            <div className="h-10 w-10 rounded-full bg-[#FF4500]/10 flex items-center justify-center mb-2 shadow-[0_0_10px_rgba(255,69,0,0.2)]">
              <Flame className="h-5 w-5 text-[#FF4500]" />
            </div>
            <h3 className="text-xl font-bold text-white">{racha}</h3>
            <p className="text-[9px] font-bold text-[#FF4500] uppercase tracking-tighter">{t.dashboard.streak}</p>
          </Card>

          <Card className="bg-card border-white/10 flex flex-col items-center justify-center p-4">
            <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center mb-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
            </div>
            <h3 className="text-xl font-bold text-white">{logrosMock.filter((l: any) => l.completado).length}</h3>
            <p className="text-[9px] font-bold text-yellow-500 uppercase tracking-tighter">{t.dashboard.achievements}</p>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
          <Star className="h-4 w-4 text-accent" /> {t.dashboard.badges}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {logrosMock.length > 0 ? logrosMock.map((logro: any) => (
            <div 
              key={logro.id}
              className={cn(
                "flex items-center gap-2 p-3 rounded-xl border transition-all",
                logro.completado 
                  ? "bg-accent/5 border-accent/20 text-white" 
                  : "bg-white/2 border-white/5 text-muted-foreground opacity-30"
              )}
            >
              <div className={cn(
                "h-6 w-6 rounded-md flex items-center justify-center",
                logro.completado ? "bg-accent text-white" : "bg-muted"
              )}>
                <Star className="h-3 w-3" />
              </div>
              <span className="font-bold text-[10px] truncate">{logro.nombre}</span>
            </div>
          )) : (
            <div className="col-span-2 py-8 text-center bg-white/2 border border-dashed border-white/5 rounded-2xl">
              <p className="text-xs text-muted-foreground">{t.dashboard.op_subtitle}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
