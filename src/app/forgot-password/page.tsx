"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await auth.resetPassword(email);
      setEnviado(true);
    } catch {
      toast({
        variant: "destructive",
        title: "No se pudo enviar",
        description: "Verifica el correo e inténtalo de nuevo.",
      });
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
            Recuperar acceso
          </p>
        </div>

        {enviado ? (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
              <MailCheck className="h-8 w-8 text-accent" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Revisa tu correo</h2>
              <p className="text-sm text-zinc-400">
                Si <span className="font-semibold text-zinc-200">{email}</span> está registrado,
                recibirás un enlace para restablecer tu contraseña.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-bold text-accent hover:text-accent/80"
            >
              <ArrowLeft className="h-4 w-4" /> Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-center text-sm text-zinc-500">
              Escribe tu correo de acceso y te enviaremos un enlace de recuperación.
            </p>
            <Input
              type="email"
              placeholder="correo@essesolar.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 rounded-xl border-zinc-800 bg-zinc-900/50 px-4 text-white placeholder:text-zinc-700 focus-visible:ring-accent/50"
            />
            <Button
              type="submit"
              disabled={loading || !email}
              className="w-full h-12 rounded-xl bg-accent text-sm font-bold text-white hover:bg-accent/90"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Enviar enlace"}
            </Button>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-xs font-bold text-zinc-500 hover:text-accent"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio de sesión
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
