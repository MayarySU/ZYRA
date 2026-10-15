"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const MIN_PASSWORD = 8;

export default function ResetPasswordPage() {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      toast({ variant: "destructive", title: "Contraseña muy corta", description: `Usa al menos ${MIN_PASSWORD} caracteres.` });
      return;
    }
    if (password !== confirm) {
      toast({ variant: "destructive", title: "No coinciden", description: "Las contraseñas no son iguales." });
      return;
    }
    setLoading(true);
    try {
      await auth.updatePassword(password);
      toast({ title: "Contraseña actualizada", description: "Ya puedes usar tu nueva contraseña." });
      router.push("/dashboard");
    } catch {
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar la contraseña." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-6 font-body text-white">
      <div className="w-full max-w-[380px] space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black tracking-tighter text-accent">ZYRA</h1>
          <p className="text-[10px] font-medium tracking-[0.6em] text-zinc-500 uppercase">
            Nueva contraseña
          </p>
        </div>

        {auth.loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : !auth.user ? (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Enlace inválido o expirado</h2>
              <p className="text-sm text-zinc-400">
                Solicita un nuevo enlace de recuperación para continuar.
              </p>
            </div>
            <Link
              href="/forgot-password"
              className="inline-flex items-center gap-2 text-sm font-bold text-accent hover:text-accent/80"
            >
              Solicitar nuevo enlace
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
              <ShieldCheck className="h-8 w-8 text-accent" />
            </div>
            <Input
              type="password"
              placeholder="Nueva contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 rounded-xl border-zinc-800 bg-zinc-900/50 px-4 text-white placeholder:text-zinc-700 focus-visible:ring-accent/50"
            />
            <Input
              type="password"
              placeholder="Confirmar contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="h-12 rounded-xl border-zinc-800 bg-zinc-900/50 px-4 text-white placeholder:text-zinc-700 focus-visible:ring-accent/50"
            />
            <Button
              type="submit"
              disabled={loading || !password || !confirm}
              className="w-full h-12 rounded-xl bg-accent text-sm font-bold text-white hover:bg-accent/90"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Actualizar contraseña"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
