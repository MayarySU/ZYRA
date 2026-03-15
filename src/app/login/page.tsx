
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
  // Se establecen las credenciales solicitadas como valores iniciales
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
        description: "Credenciales inválidas. Asegúrese de que el usuario exista en su consola de Firebase Auth." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen font-body overflow-hidden">
      {/* Lado Izquierdo: Branding */}
      <div className="hidden lg:flex flex-1 bg-[#0d041a] items-center justify-center relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-accent/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 blur-[150px] rounded-full" />
        
        <div className="text-center z-10">
          <h1 className="text-[120px] font-bold leading-none tracking-tighter text-[#8A2BE2]">
            ZYRA
          </h1>
          <p className="text-gray-400 tracking-[0.8em] text-sm mt-2 ml-4">
            ESSE SOLAR
          </p>
        </div>
      </div>

      {/* Lado Derecho: Formulario */}
      <div className="flex-1 bg-black flex items-center justify-center p-8">
        <div className="w-full max-w-[400px] space-y-8">
          <div className="space-y-2">
            <h2 className="text-5xl font-bold text-white">
              ¡Hola!
            </h2>
            <p className="text-gray-500 text-lg">
              Accede con tus credenciales administrativas.
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-4">
              <Input
                type="email"
                placeholder="admin@zyra.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#121212] border-none text-white h-[60px] px-6 text-lg rounded-xl focus-visible:ring-1 focus-visible:ring-accent/50 placeholder:text-gray-700"
                required
              />
              <Input
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#121212] border-none text-white h-[60px] px-6 text-lg rounded-xl focus-visible:ring-1 focus-visible:ring-accent/50 placeholder:text-gray-700"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[#8A2BE2] hover:bg-[#7a25c9] text-white font-bold h-[60px] text-lg rounded-xl transition-all shadow-lg shadow-accent/20" 
              disabled={loading}
            >
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
