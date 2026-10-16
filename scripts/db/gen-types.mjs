// =====================================================================
// ZYRA — scripts/db/gen-types.mjs
// Regenera src/lib/supabase/types.generated.ts desde la base de datos.
// Uso: node scripts/db/gen-types.mjs  (o npm run db:types)
// =====================================================================
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(__dirname, '..', '..');
dotenv.config({ path: join(raiz, '.env.local') });

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL en .env.local');
  process.exit(1);
}

const salida = join(raiz, 'src', 'lib', 'supabase', 'types.generated.ts');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

console.log('Generando tipos...');
const stdout = execFileSync(
  npx,
  ['--yes', 'supabase@latest', 'gen', 'types', 'typescript', '--db-url', process.env.DATABASE_URL, '--schema', 'public'],
  {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: 64 * 1024 * 1024,
    // Windows: Node 24 ya no permite spawnear .cmd sin shell (EINVAL).
    shell: process.platform === 'win32',
  }
);

writeFileSync(salida, stdout, 'utf8');
console.log(`Escrito ${salida} (${stdout.length} bytes)`);
