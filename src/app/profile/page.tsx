"use client";

import { useState, useRef, useMemo } from "react";
import DashboardLayout from "../dashboard/layout";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, updateDoc } from "firebase/firestore";
import { updatePassword } from "firebase/auth";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Camera, User, Shield, Zap, Trophy, Save, Loader2,
  Activity, Award, CheckCircle2, XCircle, Clock,
  Star, Flame, FileText, Wrench, Users, Phone, Mail, Lock, Settings2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/components/providers/i18n-provider";
import { cn } from "@/lib/utils";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { calcLevel } from "@/lib/gamification";

// ─── helpers ──────────────────────────────────────
function safeDate(v: any): string {
  if (!v) return "—";
  try {
    const d = typeof v?.toDate === "function" ? v.toDate() : new Date(v);
    return isValid(d) ? format(d, "d MMM yyyy, HH:mm", { locale: es }) : "—";
  } catch { return "—"; }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; icon: React.ReactNode }> = {
    Aprobado:   { color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: <CheckCircle2 className="h-3 w-3" /> },
    Rechazado:  { color: "text-red-400 bg-red-500/10 border-red-500/20",             icon: <XCircle className="h-3 w-3" /> },
    Pendiente:  { color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",    icon: <Clock className="h-3 w-3" /> },
    EnRevision: { color: "text-blue-400 bg-blue-500/10 border-blue-500/20",          icon: <Activity className="h-3 w-3" /> },
  };
  const s = map[status] || map["Pendiente"];
  return (
    <span className={cn("flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border", s.color)}>
      {s.icon} {status}
    </span>
  );
}

const MEDAL_COLORS: Record<string, string> = {
  "Proyecto Completado": "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  "Experto":             "text-purple-400 bg-purple-500/10 border-purple-500/20",
  "Veterano":            "text-amber-400 bg-amber-500/10 border-amber-500/20",
  "Primer Reporte":      "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "Fotógrafo":           "text-pink-400 bg-pink-500/10 border-pink-500/20",
  "Corrector":           "text-orange-400 bg-orange-500/10 border-orange-500/20",
  "Reportero Activo":    "text-green-400 bg-green-500/10 border-green-500/20",
  "Super Camarógrafo":   "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
};

export default function ProfilePage() {
  const { profile, user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUpdating, setIsUpdating]   = useState(false);
  const [newPhoto, setNewPhoto]       = useState<string | null>(null);
  const [editPhone, setEditPhone]     = useState("");
  const [editingPhone, setEditingPhone] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const isAdmin  = profile?.rol === "admin";
  const puntos   = profile?.puntos || 0;
  const nivel    = calcLevel(puntos);
  const racha    = profile?.racha  || 0;
  const logros   = (profile?.logros || []).filter((l: any) => l.completado);
  const targetPts = nivel * 200;
  const pct = Math.min(((puntos % 200) / 200) * 100, 100);

  // My reports
  const reportsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, "reports"), where("employeeId", "==", user.uid));
  }, [db, user?.uid]);
  const { data: myReports, isLoading: reportsLoading } = useCollection(reportsQuery);

  // My teams
  const teamsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, "teams"), where("members", "array-contains", user.uid));
  }, [db, user?.uid]);
  const { data: myTeams } = useCollection(teamsQuery);

  // Stats
  const stats = useMemo(() => ({
    total:    (myReports || []).length,
    approved: (myReports || []).filter((r: any) => r.status === "Aprobado").length,
    rejected: (myReports || []).filter((r: any) => r.status === "Rechazado").length,
    pending:  (myReports || []).filter((r: any) => r.status === "Pendiente" || !r.status).length,
  }), [myReports]);

  // Historial — mismo formato que el dashboard del empleado
  const historial = useMemo(() => {
    return (myReports || [])
      .map((r: any) => ({
        id:    r.id,
        label:
          r.status === "Aprobado"   ? "✅ Reporte aprobado"   :
          r.status === "Rechazado"  ? "❌ Reporte rechazado"  :
          r.status === "EnRevision" ? "🔄 Corrección enviada" :
                                      "📤 Reporte enviado",
        sub:   r.projectName || r.Pry_Nombre_Proyecto || "Sin proyecto",
        date:  r.timestamp,
        pts:   r.status === "Aprobado" ? "+50 pts" : r.status === "Pendiente" ? "+10 pts" : null,
        color:
          r.status === "Aprobado"   ? "text-emerald-400" :
          r.status === "Rechazado"  ? "text-red-400"     :
          r.status === "EnRevision" ? "text-blue-400"    :
                                      "text-yellow-400",
      }))
      .sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .slice(0, 30);
  }, [myReports]);

  const handlePhotoClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setNewPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSavePhoto = async () => {
    if (!db || !user || !newPhoto) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { photoURL: newPhoto });
      toast({ title: "Foto actualizada correctamente." });
      setNewPhoto(null);
    } catch {
      toast({ variant: "destructive", title: t.common.error });
    } finally { setIsUpdating(false); }
  };

  const handleSavePhone = async () => {
    if (!db || !user) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { telefono: editPhone });
      toast({ title: "Teléfono actualizado." });
      setEditingPhone(false);
    } catch {
      toast({ variant: "destructive", title: t.common.error });
    } finally { setIsUpdating(false); }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    if (!newPassword || newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Error", description: "Las contraseñas no coinciden." });
      return;
    }
    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "Error", description: "La contraseña debe tener al menos 6 caracteres." });
      return;
    }
    setIsChangingPassword(true);
    try {
      await updatePassword(user, newPassword);
      toast({ title: "Éxito", description: "Contraseña actualizada correctamente." });
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      if (e.code === 'auth/requires-recent-login') {
        toast({ variant: "destructive", title: "Error de Seguridad", description: "Debes cerrar sesión y volver a entrar para cambiar tu contraseña." });
      } else {
        toast({ variant: "destructive", title: "Error", description: "Ocurrió un problema al cambiar la contraseña." });
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleToggleNotifications = async (val: boolean) => {
    if (!user || !db) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { notificacionesEmail: val });
      toast({ title: "Preferencias guardadas." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error al actualizar preferencias." });
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
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <User className="h-8 w-8 text-accent" /> Mi Perfil
          </h2>
          <p className="text-sm text-muted-foreground">Tu identidad, progreso y actividad en ZYRA.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* ── LEFT COLUMN ─────────────────────────── */}
          <div className="space-y-6">
            {/* Avatar */}
            <Card className="border-border overflow-hidden flex flex-col items-center p-8 bg-card shadow-xl">
              <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
                <Avatar className="h-28 w-28 border-4 border-accent/30 shadow-xl shadow-accent/10">
                  <AvatarImage src={newPhoto || profile?.photoURL} alt="" className="object-cover" />
                  <AvatarFallback className="bg-accent/20 text-accent text-4xl font-black">
                    {profile?.nombre?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "Z"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-7 w-7 text-white" />
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              </div>
              <div className="mt-5 text-center">
                <h3 className="text-xl font-black text-foreground">{profile?.nombre || "Usuario ZYRA"}</h3>
                <p className="text-xs text-accent font-black uppercase tracking-widest mt-1">
                  {isAdmin ? t.common.admin : t.common.employee}
                </p>
                {profile?.emailAcceso && (
                  <p className="text-[10px] text-muted-foreground mt-1 truncate max-w-[200px]">{profile.emailAcceso}</p>
                )}
              </div>
              {newPhoto && (
                <Button className="mt-4 w-full bg-accent text-white font-bold h-10 gap-2" onClick={handleSavePhoto} disabled={isUpdating}>
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar Foto
                </Button>
              )}
            </Card>

            {/* Gamification */}
            {!isAdmin && (
              <Card className="border-border bg-card shadow-lg p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-accent" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Progresión</h3>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-foreground">Nivel {nivel}</span>
                    <span className="text-muted-foreground font-bold">{puntos} / {targetPts} pts</span>
                  </div>
                  <Progress value={pct} className="h-2.5 rounded-full" />
                  <p className="text-[9px] text-muted-foreground uppercase font-bold">{Math.round(pct)}% para el siguiente nivel</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: <Star className="h-3.5 w-3.5" />, label: "Puntos", value: puntos, color: "text-yellow-400" },
                    { icon: <Flame className="h-3.5 w-3.5" />, label: "Racha", value: `${racha}d`, color: "text-orange-400" },
                    { icon: <Trophy className="h-3.5 w-3.5" />, label: "Medallas", value: logros.length, color: "text-amber-400" },
                  ].map((s) => (
                    <div key={s.label} className="flex flex-col items-center p-2 rounded-xl bg-muted/30 border border-border/50">
                      <div className={cn("mb-1", s.color)}>{s.icon}</div>
                      <span className="text-sm font-black text-foreground">{s.value}</span>
                      <span className="text-[8px] font-bold uppercase text-muted-foreground">{s.label}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Mis reportes</p>
                  {[
                    { label: "Total",      value: stats.total,    color: "bg-accent" },
                    { label: "Aprobados",  value: stats.approved, color: "bg-emerald-500" },
                    { label: "Rechazados", value: stats.rejected, color: "bg-red-500" },
                    { label: "Pendientes", value: stats.pending,  color: "bg-yellow-500" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full", s.color)} />
                        <span className="text-muted-foreground">{s.label}</span>
                      </div>
                      <span className="font-black text-foreground">{s.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* My Teams */}
            {!isAdmin && myTeams && myTeams.length > 0 && (
              <Card className="border-border bg-card shadow-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-4 w-4 text-accent" />
                  <h3 className="text-xs font-black uppercase tracking-widest">Mis Equipos</h3>
                </div>
                <div className="space-y-2">
                  {myTeams.map((team: any) => (
                    <div key={team.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/50">
                      <div className="p-2 rounded-lg bg-accent/10">
                        {team.type === "Mantenimiento" ? <Wrench className="h-4 w-4 text-accent" /> : <Users className="h-4 w-4 text-accent" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">{team.name}</p>
                        <p className="text-[9px] text-muted-foreground uppercase font-bold">{team.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* ── RIGHT COLUMN ─────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Info */}
            <Card className="border-border shadow-lg">
              <CardHeader className="bg-muted/10 border-b border-border">
                <CardTitle className="text-foreground text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-accent" /> Información de Cuenta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Nombre Completo</Label>
                    <Input value={profile?.nombre || "—"} readOnly className="bg-muted/50 border-border text-sm h-11 font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">ID de Empleado</Label>
                    <Input value={user?.uid?.substring(0, 12).toUpperCase() || "—"} readOnly className="bg-muted/50 border-border font-mono text-sm text-accent h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">
                      <Mail className="inline h-3 w-3 mr-1" />Email Corporativo
                    </Label>
                    <Input value={profile?.emailAcceso || profile?.email || user?.email || "N/A"} readOnly className="bg-muted/50 border-border text-sm h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Rol del Sistema</Label>
                    <div className="h-11 px-3 flex items-center bg-muted/50 border border-border rounded-md text-sm text-accent font-black uppercase">
                      {isAdmin ? t.common.admin : t.common.employee}
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">
                      <Phone className="inline h-3 w-3 mr-1" />Teléfono Personal
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={editingPhone ? editPhone : (profile?.telefono || "")}
                        readOnly={!editingPhone}
                        placeholder={editingPhone ? "Ej: +52 55 1234 5678" : (profile?.telefono ? undefined : "Sin teléfono registrado")}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="bg-muted/50 border-border text-sm h-11 flex-1"
                      />
                      {!editingPhone ? (
                        <Button variant="outline" className="h-11 px-4 font-bold text-xs border-accent/30 text-accent"
                          onClick={() => { setEditPhone(profile?.telefono || ""); setEditingPhone(true); }}>
                          Editar
                        </Button>
                      ) : (
                        <div className="flex gap-1">
                          <Button className="h-11 px-4 bg-accent text-white font-bold" onClick={handleSavePhone} disabled={isUpdating}>
                            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" className="h-11 px-3 text-xs" onClick={() => setEditingPhone(false)}>
                            {t.common.cancel}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configuración y Preferencias */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-border shadow-lg">
                <CardHeader className="bg-muted/10 border-b border-border">
                  <CardTitle className="text-foreground text-base flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-accent" /> Preferencias
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold text-foreground">Notificaciones por Email</Label>
                      <p className="text-[10px] text-muted-foreground max-w-[200px]">Recibir alertas sobre asignaciones y reportes nuevos.</p>
                    </div>
                    <Switch
                      checked={profile?.notificacionesEmail ?? true}
                      onCheckedChange={handleToggleNotifications}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border shadow-lg">
                <CardHeader className="bg-muted/10 border-b border-border">
                  <CardTitle className="text-foreground text-base flex items-center gap-2">
                    <Lock className="h-4 w-4 text-accent" /> Cambiar Contraseña
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <Input
                      type="password"
                      placeholder="Nueva contraseña"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-muted/50 border-border text-sm"
                    />
                    <Input
                      type="password"
                      placeholder="Confirmar contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-muted/50 border-border text-sm"
                    />
                  </div>
                  <Button
                    className="w-full bg-accent hover:bg-accent/90 text-white font-bold gap-2"
                    disabled={!newPassword || newPassword !== confirmPassword || isChangingPassword}
                    onClick={handleChangePassword}
                  >
                    {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Actualizar Contraseña
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Medals */}
            {!isAdmin && (
              <Card className="border-border shadow-lg">
                <CardHeader className="bg-muted/10 border-b border-border">
                  <CardTitle className="text-foreground text-base flex items-center gap-2">
                    <Award className="h-4 w-4 text-accent" /> Medallas Obtenidas
                    <Badge variant="outline" className="ml-auto border-accent/30 text-accent text-[9px] font-black">{logros.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                  {logros.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {logros.map((logro: any) => {
                        const colorClass = MEDAL_COLORS[logro.nombre] || "text-accent bg-accent/10 border-accent/20";
                        return (
                          <div key={logro.id} className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border text-center", colorClass)}>
                            <span className="text-3xl">{logro.emoji || "🏅"}</span>
                            <p className="text-[9px] font-black uppercase tracking-wider text-foreground leading-tight">{logro.nombre}</p>
                            {logro.obtainedAt && (
                              <p className="text-[8px] text-muted-foreground">{format(new Date(logro.obtainedAt), "dd MMM", { locale: es })}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-10 gap-3 text-center">
                      <Trophy className="h-10 w-10 text-muted-foreground opacity-15" />
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Sin medallas aún</p>
                      <p className="text-[10px] text-muted-foreground/60 max-w-[200px]">Completa proyectos y envía reportes para desbloquearlas.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Historial — mismo formato que el dashboard */}
            {!isAdmin && (
              <Card className="border-border shadow-lg overflow-hidden">
                <CardHeader className="bg-muted/10 border-b border-border flex flex-row items-center justify-between">
                  <CardTitle className="text-foreground text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-accent" /> Historial de Acciones
                  </CardTitle>
                  <Badge variant="outline" className="text-[9px] border-accent/20 text-accent font-black">{historial.length} eventos</Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[440px]">
                    {reportsLoading ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-accent" />
                      </div>
                    ) : historial.length > 0 ? (
                      <div className="space-y-0">
                        {historial.map((item: any) => (
                          <div key={item.id} className="flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 hover:bg-muted/10 transition-colors">
                            <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0 bg-accent" />
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-xs font-bold", item.color)}>{item.label}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{item.sub}</p>
                            </div>
                            <div className="text-right shrink-0">
                              {item.pts && <p className="text-[9px] font-black text-emerald-400">{item.pts}</p>}
                              <p className="text-[9px] text-muted-foreground">
                                {item.date ? format(new Date(item.date), "dd MMM HH:mm", { locale: es }) : "—"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                        <Activity className="h-10 w-10 text-muted-foreground opacity-10" />
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Sin actividad registrada</p>
                        <p className="text-[10px] text-muted-foreground/60 max-w-[200px]">Tus acciones aparecerán aquí conforme envíes reportes.</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
