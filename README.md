# ZYRA — Command

Plataforma de gestión operativa para ESSE Solar: clientes, proyectos,
equipos, materiales, checklists y reportes, con **Offline-First** y PWA.

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript
- **Supabase** (PostgreSQL + Auth + RLS) como backend
- **TanStack Query** para estado de servidor, con persistencia offline en
  **Dexie** (IndexedDB) y cola de mutaciones (outbox)
- **Cloudflare R2** para evidencias (URLs prefirmadas, bucket privado)
- **Serwist** (service worker / PWA)
- **Tailwind CSS** + componentes shadcn/ui

## Requisitos

- Node 20+ (probado con Node 24) y npm.

## Configuración

1. Copia `.env.example` a `.env.local` y rellena los valores:

   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY` (solo servidor)
   - `DATABASE_URL` (conexión directa a PostgreSQL, para scripts)
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
   - `NEXT_PUBLIC_APP_URL`

2. Aplica el esquema y el seed a tu proyecto Supabase:

   ```bash
   npm run db:apply        # migraciones
   npm run db:seed         # datos base (empresa, roles, servicios, materiales, plantillas)
   npm run seed:admin -- admin@tudominio.com "TuPasswordSegura" "Nombre Admin"
   ```

   Otros scripts útiles: `npm run db:types` (regenera tipos), `npm run db:inspect`
   (verifica tablas/RLS/RPC), `npm run db:smoke` (ciclo de vida completo por RPC).

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:9002
npm run typecheck  # tsc --noEmit
npm run build      # build de producción (incluye el service worker)
npm run start
```

## Arquitectura de datos

- El esquema vive en `supabase/migrations/` (tablas, vistas, RLS y RPC
  transaccionales con idempotencia por `p_operation_id`).
- El frontend habla **directo con Supabase** bajo RLS. Los secretos (R2) se
  usan únicamente en Route Handlers (`src/app/api/upload/*`).
- Acceso a datos: `src/lib/data/*` (repositorios) + `src/hooks/queries/*`
  (hooks de TanStack Query).
- Offline: `src/lib/offline/*` (Dexie) + `query-provider.tsx`.

Ver `docs/MIGRATION_NOTES.md` para el detalle de la migración.
