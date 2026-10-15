"use client";

import { useState, useRef } from "react";
import DashboardLayout from "../dashboard/layout";
import { useAuth } from "@/providers/auth-provider";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Star
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { profile, loading: userLoading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUpdating, setIsUpdating] = useState(false);
  const [newPhoto, setNewPhoto] = useState<string | null>(null);

  const isAdmin = profile?.rol === 'admin';

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
    setIsUpdating(true);
    try {
      // Simulación de guardado en SQL (esto se conectaría a un PUT /api/users/profile)
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({ title: "Perfil actualizado localmente" });
      setNewPhoto(null);
    } catch {
      toast({ variant: "destructive", title: "Error al actualizar" });
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
            <User className="h-8 w-8 text-accent" /> Mi Perfil
          </h2>
          <p className="text-muted-foreground">Gestiona tu identidad y visualiza tus progresos en ZYRA.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6">
            <Card className="border-border overflow-hidden flex flex-col items-center p-8 bg-card shadow-xl">
              <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
                <Avatar className="h-32 w-32 border-4 border-accent/20">
                  <AvatarImage src={newPhoto || undefined} alt="" className="object-cover" />
                  <AvatarFallback className="bg-accent text-accent-foreground text-4xl font-black">
                    {profile?.nombre?.charAt(0) || "Z"}
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
                  {isAdmin ? "Administrador" : "Técnico"}
                </p>
              </div>
              
              {!isAdmin && (
                <div className="mt-8 w-full space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/50">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-accent" />
                      <span className="text-[10px] font-bold text-foreground uppercase tracking-widest">Nivel</span>
                    </div>
                    <span className="text-lg font-black text-accent">{profile?.nivel || 1}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/50">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-[10px] font-bold text-foreground uppercase tracking-widest">Puntos</span>
                    </div>
                    <span className="text-lg font-black text-yellow-500">{profile?.puntos || 0}</span>
                  </div>
                </div>
              )}
            </Card>

            {!isAdmin && (
              <Card className="border-border bg-card shadow-lg p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Award className="h-5 w-5 text-accent" />
                  <h3 className="text-sm font-bold uppercase tracking-widest">Logros SQL</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-3 py-8 text-center bg-muted/10 rounded-xl border border-dashed border-border">
                      <Trophy className="h-8 w-8 text-muted-foreground opacity-20 mx-auto mb-2" />
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">Sincronizado con SQL</p>
                    </div>
                </div>
              </Card>
            )}
          </div>

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
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Nombre Completo</Label>
                    <Input value={profile?.nombre || ""} readOnly className="bg-muted/50 border-border text-sm h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Email Corporativo</Label>
                    <Input value={profile?.email || "N/A"} readOnly className="bg-muted/50 border-border text-sm h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Rol del Sistema</Label>
                    <div className="h-11 px-3 flex items-center bg-muted/50 border border-border rounded-md text-sm text-foreground font-bold uppercase">
                      {isAdmin ? "Administrador" : "Técnico"}
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
                  Guardar Cambios
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-border shadow-lg overflow-hidden">
              <CardHeader className="bg-muted/10 border-b border-border">
                  <CardTitle className="text-foreground text-lg flex items-center gap-2">
                    <HistoryIcon className="h-4 w-4 text-accent" /> Actividad Reciente
                  </CardTitle>
              </CardHeader>
              <CardContent className="p-10 text-center">
                  <p className="text-sm text-muted-foreground">Tus actividades se registrarán aquí conforme uses el sistema SQL.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
