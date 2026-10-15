"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/** Medalla/logro (gamificación). Opcional hasta migrar la gamificación. */
export interface Logro {
  id: string;
  nombre: string;
  emoji?: string;
  completado?: boolean;
  obtainedAt?: string;
}

/** Perfil de la app (fila de `usuarios` + rol + datos de `empleados`). */
export interface Profile {
  id_usuario: string;
  empleadoId: number | null;
  username: string;
  rol: string;
  nombre: string;
  displayName: string;
  email: string;
  photoURL?: string;
  activo: boolean;
  nivel?: number;
  puntos?: number;
  logros?: Logro[];
}

/** Usuario de Auth expuesto a la UI. */
export interface AuthUser {
  id: string;
  uid: string;
  email: string;
  displayName: string;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  isUserLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => string | null;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function cargarPerfil(userId: string, email: string | undefined): Promise<Profile> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("usuarios")
    .select(
      "id_usuario, empleado_id, username, activo, roles ( nombre_rol ), empleados ( nombre, correo )"
    )
    .eq("id_usuario", userId)
    .maybeSingle();

  if (error) {
    console.error("No se pudo cargar el perfil:", error.message);
  }

  if (!data) {
    // Usuario de Auth sin fila en `usuarios`: sin rol asignado.
    return {
      id_usuario: userId,
      empleadoId: null,
      username: email ?? "",
      rol: "tecnico",
      nombre: email ?? "",
      displayName: email ?? "",
      email: email ?? "",
      activo: true,
    };
  }

  const rol = (data.roles as { nombre_rol?: string } | null)?.nombre_rol ?? "tecnico";
  const empleado = data.empleados as { nombre?: string; correo?: string } | null;
  const nombre = empleado?.nombre ?? data.username ?? email ?? "";

  return {
    id_usuario: data.id_usuario,
    empleadoId: data.empleado_id,
    username: data.username,
    rol,
    nombre,
    displayName: nombre,
    email: empleado?.correo ?? email ?? "",
    activo: data.activo,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const tokenRef = useRef<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let activo = true;

    const aplicar = async (nueva: Session | null) => {
      tokenRef.current = nueva?.access_token ?? null;
      if (nueva?.user) {
        const p = await cargarPerfil(nueva.user.id, nueva.user.email ?? undefined);
        if (!activo) return;
        setProfile(p);
      } else {
        if (!activo) return;
        setProfile(null);
      }
      if (!activo) return;
      setSession(nueva);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => aplicar(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nueva) => {
      // Diferido para no bloquear el lock interno de Supabase.
      setTimeout(() => {
        if (activo) void aplicar(nueva);
      }, 0);
    });

    return () => {
      activo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    tokenRef.current = null;
    setSession(null);
    setProfile(null);
    router.push("/login");
  }, [router]);

  const getToken = useCallback(() => tokenRef.current, []);

  const resetPassword = useCallback(async (email: string) => {
    const supabase = getSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }, []);

  const user = useMemo<AuthUser | null>(() => {
    if (!session?.user) return null;
    return {
      id: session.user.id,
      uid: session.user.id,
      email: session.user.email ?? "",
      displayName: profile?.nombre ?? "",
    };
  }, [session, profile]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      profile,
      loading,
      isUserLoading: loading,
      login,
      logout,
      getToken,
      resetPassword,
      updatePassword,
    }),
    [user, profile, loading, login, logout, getToken, resetPassword, updatePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
