
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
    <div className="flex min-h-screen font-body bg-[#05020a] relative overflow-hidden">
      {/* Fondo con degradado intenso ZYRA */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[800px] h-[800px] bg-accent/20 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] opacity-40" />
      </div>

      <div className="relative z-10 flex w-full">
        {/* Lado Izquierdo: Branding Minimalista */}
        <div className="hidden lg:flex flex-1 items-center justify-center border-r border-white/5">
          <div className="text-center">
            <h1 className="text-[120px] font-black leading-none tracking-tighter text-accent drop-shadow-[0_0_30px_rgba(138,43,226,0.3)]">
              ZYRA
            </h1>
            <p className="text-muted-foreground font-bold tracking-[0.8em] text-xs mt-4 opacity-40 uppercase">
              Solar Operational Excellence
            </p>
          </div>
        </div>

        {/* Lado Derecho: Formulario Limpio */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-[360px] space-y-10">
            <div className="space-y-3">
              {/* Logo visible en móvil */}
              <div className="lg:hidden mb-8">
                <h1 className="text-5xl font-black tracking-tighter text-accent">ZYRA</h1>
              </div>
              <h2 className="text-4xl font-bold text-white tracking-tight">
                Iniciar Sesión
              </h2>
              <p className="text-zinc-500 text-base">
                Gestiona tu operación solar con ZYRA Command.
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Email Corporativo</label>
                  <Input
                    type="email"
                    placeholder="admin@zyra.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/5 border-white/10 text-white h-12 px-4 rounded-xl focus-visible:ring-accent/50 placeholder:text-zinc-700 transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Contraseña</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/5 border-white/10 text-white h-12 px-4 rounded-xl focus-visible:ring-accent/50 placeholder:text-zinc-700 transition-all"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-accent hover:bg-accent/90 text-white font-bold h-12 text-base rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-accent/20" 
                disabled={loading}
              >
                {loading ? "Autenticando..." : "Acceder al Sistema"}
              </Button>
            </form>

            <div className="pt-4 text-center">
              <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">
                © 2026 ZYRA Command — Todos los derechos reservados
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
