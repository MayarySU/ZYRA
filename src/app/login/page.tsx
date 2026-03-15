
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useAuth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

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
    <div className="flex min-h-screen font-body bg-gradient-to-r from-[#0a0514] via-[#05020a] to-black overflow-hidden">
      {/* Lado Izquierdo: Branding */}
      <div className="hidden lg:flex flex-1 items-center justify-center">
        <div className="text-center">
          <h1 className="text-[100px] font-black leading-none tracking-tighter text-accent">
            ZYRA
          </h1>
          <p className="text-muted-foreground font-bold tracking-[0.6em] text-sm mt-4 opacity-50 uppercase">
            ESSE SOLAR
          </p>
        </div>
      </div>

      {/* Lado Derecho: Formulario */}
      <div className="flex-1 flex items-center justify-center p-8 bg-black/40 lg:bg-transparent">
        <div className="w-full max-w-[380px] space-y-10">
          <div className="space-y-2">
            {/* Logo visible en móvil */}
            <div className="lg:hidden mb-6">
              <h1 className="text-5xl font-black tracking-tighter text-accent">ZYRA</h1>
            </div>
            <h2 className="text-5xl font-bold text-white tracking-tight">
              ¡Hola!
            </h2>
            <p className="text-zinc-500 text-lg">
              Accede con tus credenciales guardadas.
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-4">
              <Input
                type="email"
                placeholder="admin@zyra.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-900/50 border-zinc-800 text-white h-14 px-6 text-base rounded-xl focus-visible:ring-accent/50 placeholder:text-zinc-700"
                required
              />
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-zinc-900/50 border-zinc-800 text-white h-14 px-6 text-base rounded-xl focus-visible:ring-accent/50 placeholder:text-zinc-700"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-accent hover:bg-accent/90 text-white font-bold h-14 text-lg rounded-xl transition-all active:scale-[0.98]" 
              disabled={loading}
            >
              {loading ? "Cargando..." : "Iniciar Sesión"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
