"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Alta de empleado con acceso a la plataforma (solo administradores).
 *
 * Crea un usuario en Supabase Auth con la Admin API (service key), y registra
 * las filas correspondientes en `empleados` y `usuarios`. Si algo falla tras
 * crear el usuario de Auth, se revierte (rollback) para no dejar cuentas
 * huérfanas.
 *
 * Devuelve un resultado discriminado (en lugar de lanzar) para poder mostrar
 * mensajes claros al cliente también en producción.
 */

const EsquemaCrearEmpleado = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  correo: z.string().trim().email("Correo electrónico inválido"),
  telefono: z.string().trim().max(30).optional().or(z.literal("")),
  rol: z.string().trim().min(1, "Selecciona un rol"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .optional()
    .or(z.literal("")),
});

export interface CrearEmpleadoConAccesoInput {
  nombre: string;
  correo: string;
  telefono?: string;
  rol: string;
  password?: string;
}

export type CrearEmpleadoConAccesoResult =
  | {
      ok: true;
      id_usuario: string;
      id_empleado: number;
      email: string;
      password: string;
    }
  | { ok: false; error: string };

/** Genera una contraseña temporal aleatoria y legible. */
function generarPasswordTemporal(): string {
  const mayus = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const minus = "abcdefghijkmnpqrstuvwxyz";
  const nums = "23456789";
  const simbolos = "!@#$%&*";
  const todos = mayus + minus + nums + simbolos;
  const tomar = (conjunto: string) => conjunto[Math.floor(Math.random() * conjunto.length)];

  let pass = tomar(mayus) + tomar(minus) + tomar(nums) + tomar(simbolos);
  while (pass.length < 12) pass += tomar(todos);

  return pass
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

export async function crearEmpleadoConAcceso(
  input: CrearEmpleadoConAccesoInput
): Promise<CrearEmpleadoConAccesoResult> {
  try {
    const datos = EsquemaCrearEmpleado.parse(input);

    // 1) Autorización: solo un administrador puede crear cuentas.
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const { data: perfil, error: errPerfil } = await supabase
      .from("usuarios")
      .select("roles ( nombre_rol )")
      .eq("id_usuario", user.id)
      .maybeSingle();
    if (errPerfil) throw new Error(errPerfil.message);

    const rolSolicitante = (perfil?.roles as { nombre_rol?: string } | null)?.nombre_rol;
    if (rolSolicitante !== "admin") {
      throw new Error("No autorizado: se requiere rol de administrador");
    }

    const admin = createAdminClient();
    const password =
      datos.password && datos.password.length >= 8 ? datos.password : generarPasswordTemporal();

    // 2) Usuario de Auth (correo confirmado para permitir el primer acceso).
    const { data: creado, error: errAuth } = await admin.auth.admin.createUser({
      email: datos.correo,
      password,
      email_confirm: true,
    });
    if (errAuth || !creado?.user) {
      throw new Error(errAuth?.message ?? "No se pudo crear el usuario de Auth");
    }
    const idUsuario = creado.user.id;

    let idEmpleado: number | null = null;
    try {
      // 3) Rol
      const { data: rol, error: errRol } = await admin
        .from("roles")
        .select("id_rol")
        .eq("nombre_rol", datos.rol)
        .maybeSingle();
      if (errRol) throw new Error(errRol.message);
      if (!rol) throw new Error(`El rol "${datos.rol}" no existe`);

      // 4) Empresa por defecto (única en esta instalación).
      const { data: empresa, error: errEmpresa } = await admin
        .from("empresas")
        .select("id_empresa")
        .order("id_empresa")
        .limit(1)
        .maybeSingle();
      if (errEmpresa) throw new Error(errEmpresa.message);
      if (!empresa) throw new Error("No hay empresa configurada (ejecuta el seed)");

      // 5) Empleado
      const { data: empleado, error: errEmpleado } = await admin
        .from("empleados")
        .insert({
          empresa_id: empresa.id_empresa,
          nombre: datos.nombre,
          correo: datos.correo,
          telefono: datos.telefono || null,
        })
        .select("id_empleado")
        .single();
      if (errEmpleado || !empleado) {
        throw new Error(errEmpleado?.message ?? "No se pudo crear el empleado");
      }
      idEmpleado = empleado.id_empleado;

      // 6) Usuario de la app
      const { error: errUsuario } = await admin.from("usuarios").insert({
        id_usuario: idUsuario,
        empleado_id: empleado.id_empleado,
        rol_id: rol.id_rol,
        username: datos.correo,
        activo: true,
      });
      if (errUsuario) throw new Error(errUsuario.message);

      return {
        ok: true,
        id_usuario: idUsuario,
        id_empleado: empleado.id_empleado,
        email: datos.correo,
        password,
      };
    } catch (err) {
      // Rollback: eliminar lo creado para no dejar cuentas huérfanas.
      if (idEmpleado !== null) {
        await admin.from("empleados").delete().eq("id_empleado", idEmpleado);
      }
      await admin.auth.admin.deleteUser(idUsuario);
      throw err;
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}
