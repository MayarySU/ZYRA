// =====================================================================
// ZYRA — scripts/db/inspect.mjs
// Verificación rápida del esquema/datos aplicados. Solo lectura.
// Uso: node scripts/db/inspect.mjs
// =====================================================================
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(__dirname, '..', '..');
dotenv.config({ path: join(raiz, '.env.local') });

const { Client } = pg;

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const tablas = await client.query(
    `select tablename from pg_tables where schemaname = 'public' order by tablename`
  );
  console.log('Tablas:', tablas.rows.map((r) => r.tablename).join(', '));

  const vistas = await client.query(
    `select viewname from pg_views where schemaname = 'public' order by viewname`
  );
  console.log('Vistas:', vistas.rows.map((r) => r.viewname).join(', '));

  const rls = await client.query(
    `select relname, relrowsecurity from pg_class
     where relnamespace = 'public'::regnamespace and relkind = 'r'
     order by relname`
  );
  console.log('RLS habilitado:', rls.rows.filter((r) => r.relrowsecurity).length, '/', rls.rows.length);

  const funcs = await client.query(
    `select proname, prosecdef from pg_proc
     where pronamespace = 'public'::regnamespace and proname like '%' || $1 || '%'
     order by proname`,
    ['_']
  );
  console.log('Funciones:', funcs.rows.map((r) => `${r.proname}${r.prosecdef ? '(definer)' : ''}`).join(', '));

  console.log('Roles:', (await client.query(`select nombre_rol from roles order by id_rol`)).rows.map((r) => r.nombre_rol).join(', '));
  console.log('Empresas:', (await client.query(`select id_empresa, nombre from empresas`)).rows);
  console.log('Servicios:', (await client.query(`select count(*)::int n from servicios`)).rows[0].n);
  console.log('Materiales:', (await client.query(`select count(*)::int n from materiales`)).rows[0].n);
  console.log('Plantillas:', (await client.query(
    `select cs.nombre, count(d.id_checklist_servicio_detalle)::int items
     from checklist_servicio cs
     left join checklist_servicio_detalle d on d.checklist_servicio_id = cs.id_checklist_servicio
     group by cs.nombre order by cs.nombre`
  )).rows);

  await client.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
