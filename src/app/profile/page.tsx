"use client";

import { useState, useRef } from "react";
import DashboardLayout from "../dashboard/layout";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, limit, doc, updateDoc } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Camera,
  User,
  Shield,
  Zap,
  Trophy,
  Save,
  Loader2,
  History as HistoryIcon,
  Award,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  Star
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/components/providers/i18n-provider";
import { cn } from "@/lib/utils";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";

export default function ProfilePage() {
  const { profile, user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUpdating, setIsUpdating] = useState(false);
  const [newPhoto, setNewPhoto] = useState<string | null>(null);

  const isAdmin = profile?.rol === 'admin' || user?.email === 'admin@zyra.com';

  // Helper for safe date formatting
  const formatDate = (dateValue: any) => {
    if (!dateValue) return "Reciente";
    try {
      let date;
      if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      } else if (dateValue && typeof dateValue.toDate === 'function') {
        date = dateValue.toDate();
      } else {
        date = new Date(dateValue);
      }

      if (!isValid(date)) return "Reciente";
      return format(date, "d MMM, HH:mm", { locale: es });
    } catch (e) {
      return "Reciente";
    }
  };

  // Query for activity logs — desactivado: la colección activity_logs no tiene permisos configurados
  const logsQuery = null;

  const { data: activities, isLoading: logsLoading } = useCollection(logsQuery);

  const handlePhotoClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!db || !user) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { photoURL: newPhoto });
      toast({ title: t.common.success });
      setNewPhoto(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: t.common.error });
    } finally {
      setIsUpdating(false);
    }
  };

  if (userLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 font-body pb-12">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <User className="h-8 w-8 text-accent" /> {t.nav.profile}
          </h2>
          <p className="text-muted-foreground">Gestiona tu identidad y visualiza tus progresos en ZYRA.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column: Avatar & Basic Stats */}
          <div className="space-y-6">
            <Card className="border-border overflow-hidden flex flex-col items-center p-8 bg-card shadow-xl">
              <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
                <Avatar className="h-32 w-32 border-4 border-accent/20">
                  <AvatarImage src={newPhoto || profile?.photoURL} alt="" className="object-cover" />
                  <AvatarFallback className="bg-accent text-accent-foreground text-4xl font-black">
                    {profile?.nombre?.charAt(0) || user?.email?.charAt(0).toUpperCase() || "Z"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-8 w-8 text-white" />
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              </div>
              <div className="mt-6 text-center">
                <h3 className="text-xl font-bold text-foreground">{profile?.nombre || "Usuario ZYRA"}</h3>
                <p className="text-xs text-accent font-black uppercase tracking-widest mt-1">
                  {isAdmin ? t.common.admin : t.common.employee}
                </p>
              </div>
              {!isAdmin && (
                <div className="mt-8 w-full space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/50">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-accent" />
                      <span className="text-[10px] font-bold text-foreground uppercase tracking-widest">{t.dashboard.level}</span>
                    </div>
                    <span className="text-lg font-black text-accent">{profile?.nivel || 1}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/50">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-[10px] font-bold text-foreground uppercase tracking-widest">{t.dashboard.points}</span>
                    </div>
                    <span className="text-lg font-black text-yellow-500">{profile?.puntos || 0}</span>
                  </div>
                </div>
              )}
            </Card>

            {/* Medals/Achievements Section */}
            {!isAdmin && (
              <Card className="border-border bg-card shadow-lg p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Award className="h-5 w-5 text-accent" />
                  <h3 className="text-sm font-bold uppercase tracking-widest">Medallas y Logros</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {profile?.logros && profile.logros.length > 0 ? (
                    profile.logros.map((logro: any, idx: number) => (
                      <div
                        key={idx}
                        className={cn(
                          "aspect-square rounded-xl flex flex-col items-center justify-center p-2 text-center transition-all",
                          "bg-accent/10 border border-accent/20"
                        )}
                        title={typeof logro === 'string' ? logro : (logro.nombre || logro.id || '')}
                      >
                        <span className="text-2xl mb-1">{typeof logro === 'string' ? '🏆' : (logro.emoji || '🏆')}</span>
                        <span className="text-[8px] font-bold uppercase leading-tight line-clamp-2">{typeof logro === 'string' ? logro : (logro.nombre || logro.id)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 py-8 text-center bg-muted/10 rounded-xl border border-dashed border-border">
                      <Trophy className="h-8 w-8 text-muted-foreground opacity-20 mx-auto mb-2" />
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">Sin logros aún</p>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Right Column: Profile Form & History */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border shadow-lg">
              <CardHeader className="bg-muted/10 border-b border-border">
                <CardTitle className="text-foreground text-lg flex items-center gap-2">
                  <Shield className="h-4 w-4 text-accent" /> Información de Cuenta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{t.employees.full_name}</Label>
                    <Input value={profile?.nombre || ""} readOnly className="bg-muted/50 border-border text-sm h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">ID de Empleado</Label>
                    <Input value={user?.uid?.substring(0, 12).toUpperCase() || ""} readOnly className="bg-muted/50 border-border font-mono text-sm text-accent h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Email Corporativo</Label>
                    <Input value={profile?.emailAcceso || profile?.email || user?.email || "N/A"} readOnly className="bg-muted/50 border-border text-sm h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Rol del Sistema</Label>
                    <div className="h-11 px-3 flex items-center bg-muted/50 border border-border rounded-md text-sm text-foreground font-bold uppercase">
                      {isAdmin ? t.common.admin : t.common.employee}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border py-4 bg-muted/5">
                <Button
                  className="w-full bg-accent hover:bg-accent/90 text-white font-bold h-11 gap-2 rounded-xl transition-all shadow-lg shadow-accent/20"
                  onClick={handleSaveProfile}
                  disabled={!newPhoto || isUpdating}
                >
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {t.common.save} Cambios de Perfil
                </Button>
              </CardFooter>
            </Card>

            {/* Activity History Section */}
            <Card className="border-border shadow-lg overflow-hidden">
              <CardHeader className="bg-muted/10 border-b border-border flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-foreground text-lg flex items-center gap-2">
                    <HistoryIcon className="h-4 w-4 text-accent" /> Historial de Actividad
                  </CardTitle>
                </div>
                <Badge variant="outline" className="text-[10px] border-accent/20 text-accent uppercase font-black tracking-tighter">Últimos eventos</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  {logsLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <Loader2 className="h-6 w-6 animate-spin text-accent" />
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Cargando bitácora...</p>
                    </div>
                  ) : activities && activities.length > 0 ? (
                    <div className="divide-y divide-border/30">
                      {activities.map((log: any) => (
                        <div key={log.id} className="p-4 hover:bg-muted/5 transition-colors group">
                          <div className="flex gap-4">
                            <div className="mt-1">
                              <div className="p-2 rounded-lg bg-accent/10 border border-accent/20 group-hover:scale-110 transition-transform">
                                {log.type === 'project_started' && <Zap className="h-4 w-4 text-yellow-500" />}
                                {log.type === 'project_finished' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                                {log.type === 'report_submitted' && <LayoutDashboard className="h-4 w-4 text-purple-500" />}
                                {log.type === 'achievement_earned' && <Trophy className="h-4 w-4 text-yellow-500" />}
                                {log.type === 'level_up' && <Star className="h-4 w-4 text-orange-500" />}
                                {!['project_started', 'project_finished', 'report_submitted', 'achievement_earned', 'level_up'].includes(log.type) && <ActivityIcon className="h-4 w-4 text-muted-foreground" />}
                              </div>
                            </div>
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-bold text-foreground">{log.title}</p>
                                <span className="text-[9px] text-muted-foreground font-medium uppercase">
                                  {formatDate(log.timestamp)}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground leading-snug">{log.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                      <HistoryIcon className="h-10 w-10 text-muted-foreground opacity-10 mb-4" />
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Sin registros de actividad</h4>
                      <p className="text-[10px] text-muted-foreground mt-2 max-w-[200px]">Tus acciones importantes aparecerán aquí conforme uses el sistema.</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
