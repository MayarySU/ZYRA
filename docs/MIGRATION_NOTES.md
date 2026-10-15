# ZYRA — Notas de migración a Supabase

> Documento de trabajo generado durante la migración. Registra el estado previo
> (red de seguridad) y, a medida que avanza, las decisiones tomadas.

## 0. Baseline (estado previo a la migración)

Rama de trabajo: `feat/supabase-migration` (partiendo de `master`).

### Comprobaciones ejecutadas

| Comando | Resultado |
|---|---|
| `npm run typecheck` | 2 errores preexistentes en `src/app/login/page.tsx` (L26-27: `response` es `unknown`). Corregido como parte del baseline (cast tipado). Ahora limpio. |
| `npm run lint` | No existe configuración ESLint (`eslint.config.*` / `.eslintrc*`). `next lint` es interactivo y está deprecado. El build ignora ESLint (`eslint.ignoreDuringBuilds: true`). |
| `npm run build` | Correcto. 18 rutas generadas. Warnings preexistentes: `themeColor` en el export `metadata` (debe ir en `viewport`). |

### Endpoints actuales (Express) → páginas que los usan

Backend `backend/` (Express + Prisma). Consumido por `src/lib/api-client.ts` (`NEXT_PUBLIC_API_URL`).

| Endpoint | Recurso | Páginas |
|---|---|---|
| `POST /auth/login` | login | `login` |
| `GET/POST/PUT/DELETE /clientes` | clientes | `clients` |
| `GET/POST/PUT/DELETE /empleados` | empleados | `employees`, `dashboard`, `team` |
| `POST /empleados/:id/puntos` | puntos | `gamification.ts` |
| `GET/POST/PUT/DELETE /equipos` | equipos | `team`, `projects`, `reports` |
| `GET/POST/PUT/DELETE /materiales` | materiales | `materials`, `projects`, `dashboard` |
| `GET/POST/PUT/DELETE /servicios` | servicios | `settings/services` |
| `GET/PUT /checklists-servicio` | plantillas checklist | `materials`, `projects`, `settings/checklists` |
| `GET/POST/PUT/DELETE /proyectos` | proyectos | `projects`, `reports`, `dashboard` |
| `GET/POST/PUT/DELETE /reports` | reportes | `reports`, `projects`, `dashboard` |
| `GET/POST/PUT/DELETE /users` | usuarios | `profile` (indirecto) |

### Esquema Prisma existente (resumen)

`Roles, Empresa, Empleados, Usuarios, Equipos, Empleado_Equipo, Clientes,
Servicios, Proyectos, Reportes, Materiales, Checklist_Servicio,
Checklist_Servicio_Detalle, Checklist, Checklist_Detalle, Puntos_Historial`.

Detalle del esquema en `backend/prisma/schema.prisma` (se eliminará al final).

### Firebase residual (a eliminar)

- Dependencia `firebase` en `package.json` (frontend).
- `firebase.json`, `firestore.rules` en la raíz.
- `firebase-admin` en `backend/package.json` + inicialización en `backend/src/index.ts`.
- Comentarios/strings en `src/app/actions/email-actions.ts` y `usersAPI.getByFirebaseUid`.

### Sistemas offline existentes (a reemplazar)

1. `src/lib/api-client.ts` — intercepta mutaciones sin conexión y las encola en
   `localStorage['zyra_offline_queue']`.
2. `src/components/providers/sync-provider.tsx` — reintenta la cola al recuperar
   conexión (mapeo parcial por patrón de endpoint).
3. `src/hooks/use-offline-sync.ts` — implementación paralela, incompleta.

### Bug preexistente documentado (puntos)

`src/app/reports/page.tsx`: en la aprobación de reportes se llama
`employeesAPI.getAll()`, pero `employeesAPI` **no está importado** (solo
`projectsAPI, reportesAPI, equiposAPI`). El `ReferenceError` es atrapado por un
`try/catch` interno, por lo que la asignación de puntos nunca se completa aunque
la UI muestra el toast "+50 puntos". Se resolverá al centralizar puntos en la RPC
`otorgar_puntos`.

### Estado de entidades respecto al spec

Faltan en el modelo actual: `evidencias` (hoy es el string `Evidencias_URL`),
`recordatorios`, `recordatorio_destinatarios`, `avances/actividades`,
`audit_log`, `proyecto_materiales` (hoy dentro de checklist) y `progreso`
(usado en UI, ausente en Prisma). Se agregarán en Fase 2.

## Decisiones de arquitectura (confirmadas)

- Backend: **Supabase directo + Route Handlers** para secretos. Se eliminará Express/Prisma.
- Base de datos nueva desde cero (sin migración de datos reales), con seed.
- Nombres en PostgreSQL: **español snake_case minúsculas** (`proyectos.id_proyecto`, `reportes.evidencias` ya no como string).
- Offline-First **real** con Dexie + outbox.
- R2 privado; en PostgreSQL solo `object_key`.

## 2. Backend de datos (Supabase) — COMPLETADO

### Migraciones aplicadas (`supabase/migrations/`)

| Archivo | Contenido |
|---|---|
| `0001_schema.sql` | 23 tablas + índices/constraints + trigger `set_actualizado_en`. |
| `0002_views.sql` | `calcular_progreso()`, vistas `v_proyectos` y `v_checklist_detalle` (`security_invoker=true`). |
| `0003_rls.sql` | Helpers (`mi_empleado_id`, `mi_empresa_id`, `es_admin`, `es_miembro_equipo`, `es_miembro_proyecto`) + RLS en las 23 tablas. |
| `0004_functions.sql` | RPCs transaccionales + idempotencia. |

### RPC (autoridad de negocio en la BD)

`generar_checklist`, `validar_checklist`, `iniciar_proyecto`, `reportar_avance`,
`registrar_evidencia`, `enviar_reporte`, `aprobar_reporte`, `rechazar_reporte`,
`avanzar_estado`, `finalizar_proyecto`. Internas (sin `EXECUTE` para
`authenticated`): `_otorgar_puntos`, `_idempotente_leer`, `_idempotente_guardar`.

- Idempotencia: cada RPC mutadora acepta `p_operation_id uuid`; el resultado se
  guarda en `operaciones_procesadas` y se devuelve en reintentos.
- Puntos: `_otorgar_puntos` escribe en `puntos_historial` con índice único
  parcial `(empleado_id, proyecto_id, tipo_evento) WHERE proyecto_id IS NOT NULL`.
- Auditoría: cada RPC escribe en `audit_log`.
- Estados de proyecto: `borrador, preparacion, checklist_pendiente,
  listo_para_iniciar, en_proceso, pendiente_de_cierre, finalizado, cancelado,
  rechazado`.

### Scripts (`scripts/`)

| Script | Uso | Descripción |
|---|---|---|
| `db/apply.mjs` | `npm run db:apply` / `db:seed` | Aplica migraciones (y seed con `--seed`) vía `pg` directo. |
| `db/gen-types.mjs` | `npm run db:types` | Regenera `src/lib/supabase/types.generated.ts`. |
| `db/inspect.mjs` | `npm run db:inspect` | Verificación de tablas/vistas/RLS/funciones/seed. |
| `db/smoke.mjs` | `npm run db:smoke` | Ciclo de vida completo por RPC con RLS real. |
| `seed-admin.mjs` | `npm run seed:admin -- <correo> <pass> [nombre]` | Crea usuario Auth + `empleados` + `usuarios` (rol admin). |

### Verificación ejecutada

- 4 migraciones aplicadas sin error; seed idempotente.
- `db:inspect`: 23 tablas, 2 vistas, RLS 23/23, RPC `security definer`.
- `db:smoke`: **19/19 PASS** (login → generar/marcar/validar checklist →
  iniciar (descuento de stock) → avance → evidencia → reporte → aprobar →
  finalizar → puntos → idempotencia → `_otorgar_puntos` bloqueado).
- `npm run typecheck` limpio con tipos reales generados.

### Tipos

`src/lib/supabase/types.generated.ts` (autogenerado). `types.ts` reexpone
`Database`, `Tables<T>`, `TablesInsert<T>`, `TablesUpdate<T>`, `Views<T>`,
`ProyectoVista`, `ChecklistDetalleVista`.

### Cuenta admin de desarrollo

`admin@essesolar.com` (contraseña temporal `ZyraAdmin2026!`, cambiar en
producción). Se crea con `npm run seed:admin`.

## 3. Autenticación (Supabase Auth) — COMPLETADO

### Archivos

| Archivo | Rol |
|---|---|
| `src/lib/supabase/middleware.ts` | `updateSession()`: refresca la sesión (cookies) y protege rutas. |
| `src/middleware.ts` | Aplica `updateSession` con matcher (excluye API y estáticos). |
| `src/providers/auth-provider.tsx` | Reescrito: sesión Supabase + perfil desde `usuarios`/`roles`/`empleados`. |
| `src/app/login/page.tsx` | Usa `auth.login(email, password)` (Supabase) y respeta `?redirect`. |

### Comportamiento

- Sin sesión, toda ruta protegida redirige a `/login?redirect=<ruta>`; con
  sesión, `/login` redirige a `/dashboard`; `/` redirige según sesión.
- `AuthProvider` mantiene la interfaz previa (`user`, `profile`, `loading`,
  `isUserLoading`, `login`, `logout`, `getToken`) para no romper a los
  consumidores. `profile.rol` (`admin`/`tecnico`), `profile.empleadoId`,
  `nombre`, `email` se cargan vía RLS (el usuario lee su propia fila).
- `login`/`logout` ahora son asíncronos; `getToken()` devuelve el access token
  de la sesión (compatibilidad temporal con `api-client.ts`).
- Se eliminó el uso de `localStorage['zyra_token'/'zyra_user']` y de `authAPI`.

### Verificación

- `npm run typecheck` limpio; `npm run build` OK (18 rutas, middleware 93.7 kB).
- Runtime (`next start`): `/` → 307 `/login`; `/dashboard` → 307
  `/login?redirect=%2Fdashboard`; `/login` → 200.
- El camino de datos (login + consulta de perfil bajo RLS) ya quedó validado por
  `db:smoke`.
- Corregido `npm run build` (usaba `NODE_ENV=production`, sintaxis Unix que
  fallaba en Windows; `next build` lo fija solo).

## 4. Capa de datos (repositorios + TanStack Query) — COMPLETADO

### Repositorios (`src/lib/data/`)

| Archivo | Contenido |
|---|---|
| `util.ts` | `db()` (cliente Supabase navegador), `unwrap`/`unwrapMaybe` (respuesta tipada o error legible), `nuevoOperationId()`. |
| `rpc.ts` | Envolturas tipadas de las 10 RPC + tipos de resultado. |
| `catalogos.ts` | Clientes, servicios, materiales, equipos (con miembros), empleados, roles, empresa. |
| `proyectos.ts` | CRUD de proyectos (vista `v_proyectos`), checklist y `v_checklist_detalle`, avances, evidencias, `crearProyecto` (genera checklist vía RPC). |
| `reportes.ts` | Reportes con proyecto/empleado embebidos. |
| `checklists-servicio.ts` | Plantillas de checklist y sus materiales. |
| `recordatorios.ts` | Recordatorios + destinatarios + usuarios. |

### Hooks (`src/hooks/queries/`)

`keys.ts` (`qk`), `use-catalogos.ts`, `use-proyectos.ts` (incluye hooks de ciclo de
vida que llaman a las RPC e invalidan caché), `use-otros.ts`, `index.ts`.
Todas las mutaciones invalidan las claves afectadas.

### R2 (evidencias)

`src/lib/r2.ts` (cliente S3 + URLs prefirmadas, solo servidor) y los Route
Handlers `POST /api/upload/url` (valida sesión, key `proyectos/{id}/{ts}-{name}`)
y `GET /api/upload/download`. En PostgreSQL solo se guarda `object_key`.

## 5. Migración de páginas — COMPLETADO

Reescritas para usar los hooks/repositorios Supabase (snake_case) eliminando el
`api-client` Express: `dashboard`, `projects`, `reports`, `team`, `employees`,
`materials`, `clients`, `settings/services`, `settings/checklists` y los
componentes `global-search` y `notification-center`.

- `projects`: el ciclo de vida usa RPC (`iniciar_proyecto` descuenta stock en el
  servidor; `enviar_reporte`; `generar_checklist`). Las evidencias se suben a R2
  con URL prefirmada y se registran con `registrar_evidencia`.
- Estados canónicos de proyecto → etiquetas de UI: `en_proceso`→EnProceso,
  `pendiente_de_cierre`→Revisión, `finalizado`, `rechazado`, `cancelado`,
  resto→Pendiente.
- Eliminados: `src/lib/api-client.ts`, `src/hooks/use-api.ts`,
  `src/hooks/use-offline-sync.ts` (ya no se importaban en ningún sitio).
- `gamification.ts` conserva solo utilidades de presentación (`calcLevel`,
  `getRankByPoints`); los puntos los otorga el servidor vía RPC.

### Verificación

`npm run typecheck` limpio y `npm run build` correcto (18 rutas + 2 handlers R2).

## 6/7. Offline-First real — COMPLETADO

| Archivo | Rol |
|---|---|
| `src/lib/offline/db.ts` | Base Dexie `zyra-offline` (tabla `kv`) en IndexedDB. |
| `src/lib/offline/persister.ts` | `Persister` de TanStack Query respaldado por Dexie. |
| `src/components/providers/query-provider.tsx` | `PersistQueryClientProvider`: `maxAge` 24h, `buster`, queries en `offlineFirst`, cache en IndexedDB y persistencia de las mutaciones pausadas (outbox). Al reconectar se reanudan las mutaciones (`resumePausedMutations`). |

La idempotencia de reintentos la garantiza `p_operation_id` en cada RPC.
`SyncProvider` queda como indicador de conectividad hasta integrarse con la cola.

## 8. PWA — COMPLETADO

Se reemplazó `@ducanh2912/next-pwa` por **Serwist** (`@serwist/next`):
`src/app/sw.ts` con `defaultCache` y precache del manifest; `next.config.ts` con
`withSerwistInit({ swSrc, swDest, disable: dev })` y `outputFileTracingRoot`.
Se eliminaron las dependencias y artefactos de workbox; la salida del SW
(`public/sw.js`, `public/swe-worker-*.js`) queda en `.gitignore`.

## 9. Limpieza final — EN CURSO

- Eliminados: `backend/` (Express + Prisma + Railway), `firebase.json`,
  `firestore.rules`, `scratch/`, `.idx/`, `ACTION_PLAN.md` (obsoleto).
- `README.md` reescrito para el stack Supabase.

