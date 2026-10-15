// =====================================================================
// ZYRA — scripts/db/apply.mjs
// Aplica las migraciones SQL a la base Supabase (PostgreSQL directo).
// Uso:  node scripts/db/apply.mjs [--seed]
// Lee DATABASE_URL de .env.local. SSL con rejectUnauthorized:false
// (certificado de Supabase no validable desde Node local).
// =====================================================================
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(__dirname, '..', '..');

dotenv.config({ path: join(raiz, '.env.local') });

const { Client } = pg;

const conSeed = process.argv.includes('--seed');

function listarMigraciones() {
  const dir = join(raiz, 'supabase', 'migrations');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => join(dir, f));
}

async function ejecutarArchivo(client, ruta) {
  const sql = readFileSync(ruta, 'utf8');
  const nombre = ruta.split(/[\\/]/).pop();
  const inicio = Date.now();
  await client.query('begin');
  try {
    await client.query(sql);
    await client.query('commit');
    console.log(`  ok  ${nombre} (${Date.now() - inicio} ms)`);
  } catch (err) {
    await client.query('rollback');
    console.error(`  FALLO ${nombre}: ${err.message}`);
    throw err;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('Falta DATABASE_URL en .env.local');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Conectado a la base de datos.');

  try {
    const migraciones = listarMigraciones();
    console.log(`Aplicando ${migraciones.length} migración(es):`);
    for (const ruta of migraciones) {
      await ejecutarArchivo(client, ruta);
    }

    if (conSeed) {
      console.log('Aplicando seed:');
      await ejecutarArchivo(client, join(raiz, 'supabase', 'seed.sql'));
    }

    console.log('Listo.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
