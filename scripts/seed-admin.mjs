// =====================================================================
// ZYRA — scripts/seed-admin.mjs
// Crea (o reutiliza) un usuario en Supabase Auth y lo registra como admin
// en empleados + usuarios.
//
// Uso:
//   node scripts/seed-admin.mjs admin@essesolar.com "Contraseña123" "Admin General"
//
// Requiere: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY y DATABASE_URL
// en .env.local.
// =====================================================================
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(__dirname, '..');

dotenv.config({ path: join(raiz, '.env.local') });

const { Client } = pg;

const [correo, password, nombre, usernameArg] = process.argv.slice(2);

async function obtenerOCrearUsuario(supabase, email, pass) {
  const creado = await supabase.auth.admin.createUser({
    email,
    password: pass,
    email_confirm: true,
  });
  if (!creado.error) return creado.data.user;

  if (creado.error.message?.toLowerCase().includes('already')) {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;
    const existente = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (existente) return existente;
  }
  throw creado.error;
}

async function main() {
  if (!correo || !password) {
    console.error('Uso: node scripts/seed-admin.mjs <correo> <password> [nombre] [username]');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret || !process.env.DATABASE_URL) {
    console.error('Faltan NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY o DATABASE_URL en .env.local');
    process.exit(1);
  }

  const supabase = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const user = await obtenerOCrearUsuario(supabase, correo, password);
  console.log(`Usuario Auth: ${user.id} (${user.email})`);

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    await client.query('begin');

    const empresa = await client.query(
      `select id_empresa from empresas order by id_empresa limit 1`
    );
    if (empresa.rowCount === 0) {
      throw new Error('No hay empresa. Ejecuta primero: node scripts/db/apply.mjs --seed');
    }
    const empresaId = empresa.rows[0].id_empresa;

    const nombreFinal = nombre || correo.split('@')[0];
    const usernameFinal = usernameArg || correo;

    const empleado = await client.query(
      `insert into empleados (empresa_id, nombre, correo)
       values ($1, $2, $3) returning id_empleado`,
      [empresaId, nombreFinal, correo]
    );
    const empleadoId = empleado.rows[0].id_empleado;

    const rol = await client.query(
      `select id_rol from roles where lower(nombre_rol) = 'admin' limit 1`
    );
    if (rol.rowCount === 0) throw new Error('No existe el rol admin (ejecuta el seed)');

    await client.query(
      `insert into usuarios (id_usuario, empleado_id, rol_id, username, activo)
       values ($1, $2, $3, $4, true)
       on conflict (id_usuario) do update
         set empleado_id = excluded.empleado_id,
             rol_id = excluded.rol_id,
             username = excluded.username,
             activo = true`,
      [user.id, empleadoId, rol.rows[0].id_rol, usernameFinal]
    );

    await client.query('commit');
    console.log(`Admin listo: ${usernameFinal} (empleado ${empleadoId})`);
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
