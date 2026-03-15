
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { useAuth, useFirestore } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const auth = useAuth();
  const db = useFirestore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          nombre: name,
          rol: "employee",
          nivel: 1,
          puntos: 0,
          racha: 0,
          logros: [],
        });
        toast({ title: "Cuenta creada", description: "Bienvenido a ZYRA" });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "Sesión iniciada", description: "Cargando panel de control..." });
      }
      router.push("/dashboard");
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Error de autenticación", 
        description: error.message 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-zyra-gradient overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[10%] left-[10%] w-[400px] h-[400px] bg-accent blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] bg-primary blur-[120px] rounded-full" />
      </div>

      <Card className="w-full max-w-md border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl relative z-10">
        <CardHeader className="space-y-4 items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent shadow-[0_0_20px_rgba(138,43,226,0.5)]">
            <Zap className="h-7 w-7 text-white" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold tracking-tight">
              ZYRA<span className="text-accent">COMMAND</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground text-lg mt-1">
              {isRegistering ? "Crea tu perfil de operación" : "Acceso seguro a la plataforma"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {isRegistering && (
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input
                  id="name"
                  placeholder="Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/5 border-white/10 focus:border-accent transition-all"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="nombre@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-accent transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-accent transition-all"
                required
              />
            </div>
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-white font-bold h-12 text-lg shadow-lg" disabled={loading}>
              {loading ? "Procesando..." : isRegistering ? "Registrarse" : "Entrar al Sistema"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 text-center">
          <button
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-sm text-muted-foreground hover:text-accent transition-colors"
          >
            {isRegistering ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate aquí"}
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
