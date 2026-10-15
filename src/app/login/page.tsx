
"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await auth.login(email, password);
      toast({ title: "Sesión iniciada", description: "Cargando panel de control..." });
      const redirect = searchParams.get("redirect");
      router.push(redirect && redirect.startsWith("/") ? redirect : "/dashboard");
    } catch {
      toast({
        variant: "destructive",
        title: "Error de autenticación",
        description: "Credenciales inválidas. Verifique su usuario y contraseña.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen font-body bg-black text-white selection:bg-accent/30">
      <div className="flex w-full flex-col lg:flex-row">
        
        {/* Lado Izquierdo: Branding (Logo y Eslogan) */}
        <div className="relative flex-1 flex items-center justify-center p-12 overflow-hidden border-b lg:border-b-0 lg:border-r border-white/5 bg-[#0a0514]">
          {/* Resplandor radial púrpura profundo y elegante */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-accent/25 via-accent/5 to-transparent opacity-100" />
          
          <div className="relative z-10 text-center">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-accent leading-none mb-2 drop-shadow-[0_0_25px_rgba(138,43,226,0.5)]">
              ZYRA
            </h1>
            <p className="text-[10px] md:text-xs font-medium tracking-[0.8em] text-zinc-400 uppercase ml-2">
              ESSE SOLAR
            </p>
          </div>
        </div>

        {/* Lado Derecho: Formulario de Acceso */}
        <div className="flex-1 flex items-center justify-center p-8 bg-black">
          <div className="w-full max-w-[340px] space-y-8">
            <div className="space-y-2">
              <h2 className="text-4xl font-bold tracking-tight text-white">
                ¡Hola!
              </h2>
              <p className="text-zinc-500 text-sm font-medium">
                Accede con tus credenciales guardadas.
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-3">
                <Input
                  type="email"
                  placeholder="admin@essesolar.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-900/50 border-zinc-800 text-white h-12 px-4 rounded-xl focus-visible:ring-accent/50 placeholder:text-zinc-700 transition-all"
                  required
                />
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-zinc-900/50 border-zinc-800 text-white h-12 pl-4 pr-12 rounded-xl focus-visible:ring-accent/50 placeholder:text-zinc-700 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-accent transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-accent hover:bg-accent/90 text-white font-bold h-12 text-sm rounded-xl transition-all active:scale-[0.98] mt-2 shadow-lg shadow-accent/20" 
                disabled={loading}
              >
                {loading ? "Cargando..." : "Iniciar Sesión"}
              </Button>
            </form>

            <div className="pt-8 text-center">
              <p className="text-[9px] text-zinc-700 uppercase font-bold tracking-[0.2em]">
                © 2026 ZYRA Command
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
