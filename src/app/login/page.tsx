
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useAuth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ZyraLogo } from "@/components/brand/zyra-logo";

export default function LoginPage() {
  const auth = useAuth();
  const [email, setEmail] = useState("admin@zyra.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Sesión iniciada", description: "Cargando panel de control..." });
      router.push("/dashboard");
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Error de autenticación", 
        description: "Credenciales inválidas. Verifique su usuario y contraseña." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen font-body overflow-hidden bg-[#05020a] relative">
      {/* Elementos de Fondo: Orbes de Luz para el Degradado Global */}
      <div className="absolute top-[-10%] left-[-5%] w-[800px] h-[800px] bg-accent/15 blur-[120px] rounded-full animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] bg-secondary/5 blur-[150px] rounded-full pointer-events-none" />

      {/* Lado Izquierdo: Branding (Oculto en móvil) */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative z-10">
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <div className="p-4 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
              <ZyraLogo className="h-24 w-24" />
            </div>
          </div>
          <h1 className="text-[100px] font-black leading-none tracking-tighter text-white drop-shadow-[0_0_30px_rgba(138,43,226,0.3)]">
            ZYRA
          </h1>
          <p className="text-accent font-black tracking-[0.8em] text-sm mt-4 opacity-80">
            ESSE SOLAR
          </p>
          <div className="mt-12 h-1 w-24 bg-gradient-to-r from-transparent via-accent to-transparent mx-auto rounded-full" />
        </div>
      </div>

      {/* Lado Derecho: Formulario con Glassmorphism */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-20">
        <div className="w-full max-w-[450px] bg-white/[0.02] backdrop-blur-2xl border border-white/10 p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="space-y-2 mb-10">
            <div className="lg:hidden flex justify-center mb-6">
              <ZyraLogo className="h-12 w-12" />
            </div>
            <h2 className="text-4xl font-bold text-white tracking-tight">
              Bienvenido
            </h2>
            <p className="text-muted-foreground text-lg">
              Inicia sesión en ZYRA Command
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-accent tracking-[0.2em] ml-1">E-mail Corporativo</label>
                <Input
                  type="email"
                  placeholder="admin@zyra.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/5 border-white/10 text-white h-14 px-6 text-base rounded-2xl focus-visible:ring-accent/50 placeholder:text-gray-600 focus:bg-white/[0.08] transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-accent tracking-[0.2em] ml-1">Contraseña Privada</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/5 border-white/10 text-white h-14 px-6 text-base rounded-2xl focus-visible:ring-accent/50 placeholder:text-gray-600 focus:bg-white/[0.08] transition-all"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-accent hover:bg-accent/90 text-white font-black h-14 text-lg rounded-2xl transition-all shadow-lg shadow-accent/20 active:scale-[0.98]" 
              disabled={loading}
            >
              {loading ? "CONECTANDO..." : "ACCEDER AL SISTEMA"}
            </Button>
          </form>

          <p className="mt-8 text-center text-[10px] text-muted-foreground uppercase tracking-widest opacity-50">
            &copy; 2026 ZYRA Command — Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  );
}
