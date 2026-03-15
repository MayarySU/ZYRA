"use client";

import { useState, useRef } from "react";
import DashboardLayout from "../dashboard/layout";
import { useUser, useFirestore } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Mail, User, Hash, Shield, Zap, Trophy, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/components/providers/i18n-provider";

export default function ProfilePage() {
  const { profile, user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { t } = useI18n();
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
        <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8 font-body">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2"><User className="h-8 w-8 text-accent" /> {t.nav.profile}</h2>
          <p className="text-muted-foreground">{t.settings.acc_desc}</p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <Card className="md:col-span-1 bg-card border-white/10 overflow-hidden flex flex-col items-center p-8">
            <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
              <Avatar className="h-32 w-32 border-4 border-accent/20">
                <AvatarImage src={newPhoto || profile?.photoURL} alt="" className="object-cover" />
                <AvatarFallback className="bg-accent text-white text-4xl font-black">{profile?.nombre?.charAt(0) || "Z"}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="h-8 w-8 text-white" /></div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
            <div className="mt-6 text-center">
              <h3 className="text-xl font-bold text-white">{profile?.nombre}</h3>
              <p className="text-xs text-accent font-black uppercase tracking-widest mt-1">{isAdmin ? t.common.admin : t.common.employee}</p>
            </div>
            {!isAdmin && (
              <div className="mt-8 w-full space-y-4">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5"><div className="flex items-center gap-2"><Zap className="h-4 w-4 text-accent" /><span className="text-xs font-bold text-white">{t.dashboard.level}</span></div><span className="text-sm font-black text-accent">{profile?.nivel || 1}</span></div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5"><div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-yellow-500" /><span className="text-xs font-bold text-white">{t.dashboard.points}</span></div><span className="text-sm font-black text-yellow-500">{profile?.puntos || 0}</span></div>
              </div>
            )}
          </Card>

          <Card className="md:col-span-2 bg-card border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">{t.employees.payroll}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2"><Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{t.employees.full_name}</Label><Input value={profile?.nombre || ""} readOnly className="bg-white/5 border-white/5 text-sm" /></div>
                <div className="space-y-2"><Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">ID</Label><Input value={user?.uid?.substring(0, 12).toUpperCase()} readOnly className="bg-white/5 border-white/5 font-mono text-sm text-accent" /></div>
                <div className="space-y-2"><Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">EMAIL</Label><Input value={profile?.emailAcceso || profile?.email || "N/A"} readOnly className="bg-white/5 border-white/5 text-sm" /></div>
                <div className="space-y-2"><Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">ROLE</Label><div className="h-10 px-3 flex items-center bg-white/5 border border-white/5 rounded-md text-sm text-white font-bold uppercase">{isAdmin ? t.common.admin : t.common.employee}</div></div>
              </div>
            </CardContent>
            <CardFooter className="border-t border-white/5 pt-6 bg-white/2">
              <Button className="w-full bg-accent hover:bg-accent/90 text-white font-bold h-12 gap-2" onClick={handleSaveProfile} disabled={!newPhoto || isUpdating}>
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {t.common.save}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
