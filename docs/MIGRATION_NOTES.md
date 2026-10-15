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

## 9. Limpieza final — COMPLETADO

- Eliminados: `backend/` (Express + Prisma + Railway), `firebase.json`,
  `firestore.rules`, `scratch/`, `.idx/`, `ACTION_PLAN.md` (obsoleto).
- `README.md` reescrito para el stack Supabase.
- Eliminada la función experimental de **redacción de reportes con IA**
  (`src/ai/*`, flujo Genkit). Dependía del antiguo backend Express y no se
  volvió a conectar tras la migración, por lo que quedaba sin uso. Se retiraron
  junto con ella las dependencias (`genkit`, `@genkit-ai/google-genai`,
  `genkit-cli`), los scripts `genkit:dev`/`genkit:watch` y la entrada `.genkit/*`
  del `.gitignore`.
  - **Mejora futura:** si se recupera esta función, debe reimplementarse sobre la
    arquitectura actual (Supabase + Route Handlers + R2), no restaurando el
    flujo antiguo. La generación "normal" (manual) de reportes vía RPC
    `enviar_reporte` no se ve afectada.

## 10. ESLint (flat config) — COMPLETADO

Antes no existía configuración de ESLint; `next lint` estaba deprecado y era
interactivo. Se añadió **ESLint 9** con *flat config* (`eslint.config.mjs`) que
extiende `next/core-web-vitals` y `next/typescript` mediante `FlatCompat`, y el
script pasó a `"lint": "eslint ."`.

- **Errores reales corregidos** (sin refactors funcionales):
  - `prefer-const` en `src/app/materials/page.tsx` (`let` → `const`).
  - `@typescript-eslint/no-require-imports` en `tailwind.config.ts`
    (`require('tailwindcss-animate')` → `import`).
- **Reglas configuradas y advertencias aceptadas** (documentadas aquí):
  - `@typescript-eslint/no-explicit-any` degradada a *warning*: el código
    heredado usa `any` en filas de Supabase y componentes shadcn/ui; corregirlo
    sería un refactor masivo ajeno a la migración.
  - `@typescript-eslint/no-unused-vars` (*warning*, regla recomendada): señala
    código muerto heredado (imports/estados sin usar) pendiente de limpieza
    incremental.
  - `@next/next/no-page-custom-font` desactivada **solo** para
    `src/app/layout.tsx`: la regla apunta al Pages Router; en el App Router el
    `<link>` de fuentes del layout raíz se aplica globalmente (falso positivo).

Resultado de `npm run lint`: **0 errores**, 116 advertencias de las reglas
anteriores (aceptadas y justificadas). `tsc`, `build` y `db:smoke` permanecen
limpios. Orden de comprobación: `lint` → `typecheck` → `build` → `db:smoke`.

## 11. Fase 3 — Auth Supabase: reset de contraseña y alta de empleado — COMPLETADO

Se completaron los dos puntos que faltaban de la Fase 3 (auth).

### 11.1 Recuperación de contraseña (email nativo de Supabase)

Flujo PKCE con `@supabase/ssr`:

- `AuthProvider`: nuevos métodos `resetPassword(email)` (llama a
  `supabase.auth.resetPasswordForEmail` con `redirectTo = <origin>/auth/callback?next=/reset-password`)
  y `updatePassword(newPassword)` (`supabase.auth.updateUser`).
- `src/app/forgot-password/page.tsx`: solicita el correo y dispara el envío.
- `src/app/auth/callback/route.ts`: intercambia el `code` por una sesión
  (`exchangeCodeForSession`) y redirige a `next`.
- `src/app/reset-password/page.tsx`: formulario de nueva contraseña (valida
  longitud ≥ 8 y coincidencia); si no hay sesión de recuperación muestra "enlace
  inválido o expirado".
- Login: enlace "¿Olvidaste tu contraseña?" y aviso de errores del callback
  (`?error=`).
- Middleware: rutas separadas en "solo anónimas" (`/login`, `/forgot-password`)
  y "acceso libre con o sin sesión" (`/auth`, `/reset-password`), para que un
  usuario con sesión de recuperación no sea redirigido fuera de `/reset-password`.

> **Requisito de configuración (dashboard de Supabase):** añadir
> `<APP_URL>/auth/callback` a *Authentication → URL Configuration → Redirect
> URLs* (y fijar el *Site URL*). Sin esto, el enlace del correo no redirige.

### 11.2 Alta de empleado vía Admin API

`src/app/actions/empleados.ts` (Server Action, solo servidor):

- Verifica que el **llamador** tenga sesión y rol `admin` (si no, no autorizado).
- Crea el usuario de Auth con la **Admin API** (`auth.admin.createUser`,
  `email_confirm: true`) usando `createAdminClient()` (service key, nunca en el
  cliente).
- Inserta las filas `empleados` y `usuarios` (rol, `username = correo`).
- Genera una **contraseña temporal** si el admin no especifica una.
- **Rollback** ante fallos: elimina el empleado creado y el usuario de Auth para
  no dejar cuentas huérfanas.
- Devuelve un resultado discriminado (`{ ok: true, ... } | { ok: false, error }`)
  para mostrar mensajes claros también en producción (donde los errores lanzados
  se ocultan).

Conexión con la UI: la página `employees` usa la acción (con selector de rol de
`useRoles()` y campo de contraseña opcional) y muestra el diálogo de "Registro
Exitoso" con el correo de acceso real y la contraseña temporal. Se muestran los
correos reales (antes la UI mostraba `usuario@zyra.com` sintético, incorrecto
porque el acceso es por correo real).

### 11.3 Verificación

- `npm run typecheck` limpio; `npm run build` OK (rutas `/forgot-password`,
  `/reset-password`, `/auth/callback` generadas).
- Prueba del mecanismo Admin API (script autolimpiante): `createUser` + lookup de
  rol + `insert empleados` + `insert usuarios` → **ALL PASS**, con limpieza.
- `npm run lint`: 0 errores.

## 12. Fase 4 — Capa de datos y limpieza de la capa anterior — COMPLETADO

### 12.1 Auditoría

Se auditó todo `src/` y la configuración en busca de dependencias de la capa
anterior (Firebase / Express / Prisma) y de código muerto. Resultado:

- **Sin dependencias funcionales reales**: no quedan `import` de `firebase`,
  `prisma`, `express`, `genkit` ni `nodemailer`; no hay `fetch` al backend
  anterior; la capa de datos (`src/lib/data/*`), los hooks (`src/hooks/queries/*`),
  el cliente Supabase (browser/server/admin/middleware) y TanStack Query están
  completos y en uso. Los campos de datos usan **snake_case** de PostgreSQL.
- **Residuos detectados y eliminados** (abajo).

### 12.2 Código muerto / de la capa anterior eliminado

- `src/app/actions/email-actions.ts` — Server Action huérfano con `nodemailer`
  (correo de la era Firebase). El reset ahora lo envía Supabase Auth.
- `src/lib/notifications.ts`, `src/lib/activity-logger.ts` — stubs que apuntaban a
  `POST /api/notifications` y `POST /api/activity-logs` del backend anterior; sin
  importadores.
- `src/lib/placeholder-images.ts` + `.json`, `src/app/lib/placeholder-images.json`
  — datos placeholder vacíos, sin importadores.
- `src/components/dashboard/stat-card.tsx` (y el directorio, ya vacío).
- `docs/backend.json` (blueprint Firebase: `auth.providers`, `firestore.structure`,
  entidades camelCase) y `docs/blueprint.md` (Firebase Storage / Cloud Functions).
- Dependencia **`nodemailer`** desinstalada de `package.json`.

### 12.3 Limpieza de la capa de Firebase en el perfil (`auth-provider`)

El `Profile` conservaba campos de la era Firebase que nunca se poblaban:
`displayName`, `photoURL`, `logros` y el tipo `Logro`. Se eliminaron y se
actualizaron sus consumidores:
- `src/app/dashboard/page.tsx`: `profile?.displayName` → `profile?.nombre`.
- `src/components/layout/user-nav.tsx`: sin `AvatarImage` (no había foto); solo
  `AvatarFallback`.
- `src/app/profile/page.tsx`: `photoURL` → solo `newPhoto` local; y se quitó el
  chequeo legado `user?.email === 'admin@zyra.com'` (el rol se lee de la BD).
- `src/lib/gamification.ts`: export sin uso `getRankByPoints` eliminado.

### 12.4 Config / entorno

- `NEXT_PUBLIC_APP_URL`: pasa a usarse como **URL base** del enlace de
  recuperación en `AuthProvider.resetPassword` (con *fallback* a
  `window.location.origin` solo si la variable no está definida). En
  `.env.local` se corrigió el puerto a **9002** (el script `dev` usa
  `-p 9002`) y se eliminó el obsoleto `NEXT_PUBLIC_API_URL`.
- `.gitignore`: eliminado el bloque `# firebase (heredado)`.
- `tailwind.config.ts`: eliminado el glob `./src/pages/**` (no existe; App Router).

### 12.5 Verificación

- `npm run typecheck` limpio · `npm run lint` **0 errores** · `npm run build` OK ·
  `npm run db:smoke` **19/19 PASS**.
- Arranque de producción: rutas públicas (`/login`, `/forgot-password`,
  `/reset-password`) → 200; módulos protegidos (`/dashboard`, `/employees`,
  `/projects`, `/reports`, `/profile`, `/settings`, `/team`, `/clients`,
  `/materials`) → 307 (redirección a login vía middleware).
- Flujo de recuperación probado contra Supabase: `redirectTo =
  http://localhost:9002/auth/callback?next=/reset-password` aceptado por la API.

## 13. Fase 5 — Máquina de estados y reglas en PostgreSQL — COMPLETADO

La autoridad del ciclo de vida vive en la base de datos, no en React. La Fase 5
auditó el estado previo, encontró tres huecos reales y los cerró.

### 13.1 Huecos encontrados en la auditoría

1. **La UI escribía `proyectos.estado` directamente.** El diálogo "Gestionar"
   (`src/app/projects/page.tsx`) hacía `update({ estado: managedStatus, ... })`
   desde el cliente (vía `useActualizarProyecto`). Cualquier administrador podía
   saltarse las RPC y cerrar/finalizar sin requisitos.
2. **`avanzar_estado` permitía saltarse las RPC dedicadas:** permitía
   `listo_para_iniciar → en_proceso` (sin descontar stock ni validar checklist
   de nuevo), `en_proceso → pendiente_de_cierre` (sin crear reporte) y
   `pendiente_de_cierre → finalizado` (sin checklist completo, sin evidencias,
   sin reporte aprobado y **sin otorgar puntos**).
3. **`anon` podía ejecutar todas las RPC.** `create or replace function` resetea
   el ACL a los *default privileges* de Supabase, que incluyen `anon`; el
   `revoke ... from public` de la 0004 no quitaba el grant explícito a `anon`.

### 13.2 Cambios (`supabase/migrations/0005_hardening.sql`)

- **Guardia de estado (trigger).** `_proteger_estado_proyecto()` (BEFORE UPDATE
  en `proyectos`) lanza excepción si `estado` cambia y la transacción **no** trae
  la señal `set_config('zyra.rpc_estado','on',true)`. Solo las RPC de negocio la
  activan; un `UPDATE ... SET estado` directo desde PostgREST/React falla a nivel
  de base de datos, incluso para el admin.
- **`avanzar_estado` limitado a override seguro.** Transiciones permitidas ahora:
  `borrador→preparacion|cancelado`, `preparacion→borrador|checklist_pendiente|cancelado`,
  `checklist_pendiente→preparacion|listo_para_iniciar|cancelado`,
  `listo_para_iniciar→checklist_pendiente|cancelado`, `en_proceso→cancelado`,
  `pendiente_de_cierre→en_proceso|cancelado`, `rechazado→en_proceso|cancelado`.
  Ya **no** puede alcanzar `en_proceso`, `pendiente_de_cierre` ni `finalizado`:
  esas transiciones exigen `iniciar_proyecto` / `enviar_reporte` /
  `finalizar_proyecto`, que aplican stock, reportes, evidencias, puntos y auditoría.
- **ACL reafirmado.** Las RPC se recrean en 0005 y se hace
  `revoke all ... from public, anon` + `grant execute ... to authenticated` para
  todas (`generar_checklist`, `validar_checklist`, `iniciar_proyecto`,
  `reportar_avance`, `registrar_evidencia`, `enviar_reporte`, `aprobar_reporte`,
  `rechazar_reporte`, `avanzar_estado`, `finalizar_proyecto`) y para el trigger.
  `_otorgar_puntos` sigue sin EXECUTE para `anon/authenticated`.

### 13.3 UI (`src/app/projects/page.tsx`)

El diálogo "Gestionar" ya **no** envía `estado` en el `update`. Los campos no
críticos (`equipo_id`, `ubicacion`) se siguen actualizando directo (RLS admin),
y el estado se cambia con un selector de **acciones válidas** para el estado
actual (`accionesDesdeEstado`) que despacha a la RPC correcta:
- `iniciar` → `rpcIniciarProyecto`
- `enviar_reporte` → `rpcEnviarReporte`
- `finalizar` → `rpcFinalizarProyecto`
- resto → `rpcAvanzarEstado`

`fecha_fin` dejó de fijarse en el cliente: la pone `finalizar_proyecto`.

### 13.4 Verificación

- `npm run db:apply` (5 migraciones) OK; `npm run db:smoke` **25/25 PASS**.
  Casos inválidos nuevos que pasan (deben **fallar**): `update` directo de estado
  bloqueado, `avanzar_estado → finalizado` bloqueado, `avanzar_estado → en_proceso`
  desde `listo_para_iniciar` bloqueado, `iniciar_proyecto` sin checklist completo
  bloqueado, `insert` directo en `puntos_historial` bloqueado (RLS), RPC como
  `anon` bloqueada (`permission denied for function`).
- ACL verificado contra `pg_proc`: `has_function_privilege('anon', ...)` = `false`
  en todas las RPC.
- `npm run typecheck` limpio · `npm run lint` 0 errores (113 warnings preexistentes).

## 14. Fase 6 — Evidencias en Cloudflare R2 — COMPLETADO

### 14.1 Modelo

- Bucket **privado**; en PostgreSQL solo se guarda `evidencias.object_key` (nunca
  una URL firmada persistente). La URL de lectura se firma bajo demanda y caduca.
- Metadata por evidencia: `proyecto_id`, `empleado_id` (`mi_empleado_id()`),
  `avance_id` (actividad), `descripcion`, `tipo` (`foto|documento|video`),
  `content_type`, `size_bytes`, `fecha`. La escribe `registrar_evidencia`.

### 14.2 Huecos encontrados

Los Route Handlers `api/upload/url` y `api/upload/download` **solo comprobaban
que hubiera sesión**, no la pertenencia al proyecto: un técnico podía pedir una
URL prefirmada de subida para cualquier `proyectoId` (manipulando el ID) y firmar
la descarga de **cualquier** `object_key`, incluidas evidencias de otros equipos.

### 14.3 Cambios

- `api/upload/url` (POST): además de sesión, **verifica acceso al proyecto**
  consultando `proyectos` con el cliente del usuario (RLS `proyectos_select` =
  admin o miembro). Valida `contentType` contra una **lista blanca** de MIME
  (imagen, PDF, MP4) → `415` si no. La clave usa `crypto.randomUUID()` y saneo
  del nombre (sin path traversal): `proyectos/{id}/{uuid}-{nombre}`.
- `api/upload/download` (POST): firma solo si existe una fila de `evidencias`
  visible para el usuario con ese `object_key` (RLS `evidencias_select` = admin o
  miembro del proyecto) y no está eliminada → `403` en caso contrario.
- `api/upload/delete` (POST, **nuevo, solo admin**): comprueba `es_admin()`,
  marca `eliminado = true` (borrado lógico, conserva auditoría) y borra el objeto
  de R2 (best-effort). Tras esto la descarga se rechaza.
- `src/lib/r2.ts`: se añade `deleteObject(key)`.
- `src/lib/evidencias-client.ts` (nuevo): API de cliente
  `subirEvidencia` (presign → `PUT` directo navegador→R2 → `registrar_evidencia`),
  `urlEvidencia` (firma temporal de lectura) y `eliminarEvidencia`.
- La optimización de imágenes ya se hacía en el cliente (redimensión a 400×300
  JPEG q0.3 antes de subir); `projects/page.tsx` ahora usa el helper centralizado.

### 14.4 Verificación

- `npm run db:smoke` **26/26 PASS** (nuevo caso: `anon` no puede leer
  `evidencias` por RLS; la pertenencia se evalúa con `es_miembro_proyecto`, la
  misma función que usan los Route Handlers vía RLS).
- `npm run typecheck` limpio · `npm run build` OK (rutas
  `/api/upload/url`, `/api/upload/download`, `/api/upload/delete` generadas).

## 15. Fase 7 — Offline-First real — COMPLETADO

### 15.1 Huecos encontrados

La base previa solo persistía la caché de TanStack Query. Dos problemas reales:

1. **Idempotencia rota en reintentos.** Cada hook generaba el `p_operation_id`
   *dentro* del `mutationFn`; al reintentar una mutación pausada se generaba uno
   nuevo, por lo que el servidor **duplicaba** la operación.
2. **No había outbox de fotos.** Una evidencia capturada sin red se perdía
   (solo se subía si había conexión en el momento).
3. Las acciones del operador (`await mutateAsync`) se **colgaban** sin conexión.

### 15.2 Cambios

- **Dexie v2** (`src/lib/offline/db.ts`): además de `kv`, tablas
  `evidencias_pendientes` (blobs) y `outbox` (cola lógica).
- **Idempotencia estable** (`src/hooks/queries/use-proyectos.ts`): nuevo helper
  `useIdempotente` que genera **un `operation_id` único por invocación del
  usuario** y lo guarda en las variables de la mutación, de modo que se
  **reutiliza en cada reintento** y sobrevive a la persistencia. Reenviar tras
  reconectar no duplica (`operaciones_procesadas` lo deduplica).
- **Outbox de evidencias** (`src/lib/offline/evidencias-queue.ts` +
  `src/lib/evidencias-client.ts`): `subirEvidencia` sube directo a R2 si hay red;
  si no, guarda el blob en IndexedDB. `flushEvidenciasPendientes()` reintenta la
  cola. Los errores de validación (MIME/permiso) **no** se encolan.
- **`SyncProvider` real** (`src/components/providers/sync-provider.tsx`): al
  reconectar reanuda mutaciones pausadas → vacía la cola de evidencias →
  invalida la caché (reconciliación). Expone `isOnline` y `pending`.
- **Indicador** (`src/components/layout/sync-status.tsx`): badge en el header con
  estado de conexión y nº de operaciones pendientes.
- **Checklist optimista** (`projects/page.tsx`): marcar/actualizar materiales
  actualiza la caché al instante (`setQueryData`) y encola la mutación; sin red
  la UI responde igual y sincroniza al volver. "Iniciar jornada" y "Enviar
  reporte" usan `mutate` (no bloquean) con aviso cuando están offline.

### 15.3 Política de conflictos (sin Last-Write-Wins global)

El **servidor es la autoridad** de los estados y de los puntos: la máquina de
estados de la Fase 5 rechaza transiciones inválidas y las RPC devuelven error,
que se muestra al usuario. No se aplican escrituras "el último gana" sobre
`proyectos.estado`: los cambios pasan por RPC que validan versión/estado y
registran auditoría. Las mutaciones en conflicto permanecen en la cola y fallan
de forma visible (estado de error de la mutación) sin sobrescribir el servidor.

### 15.4 Protocolo E2E (manual, navegador)

No hay runner de navegador en el repo; el flujo se verifica manualmente con
DevTools → Network → *Offline*:

1. Login como técnico → abrir un proyecto asignado.
2. Poner *Offline* → marcar el checklist (responde al instante) →
   "Iniciar jornada" → añadir una/otra evidencia y observaciones →
   "Enviar reporte". Aparecen avisos de "se iniciará/enviará al reconectar".
3. Cerrar la pestaña/app; reabrir **sin conexión** → los datos siguen (caché
   persistida) y el badge muestra pendientes.
4. Volver *Online* → se reanudan las mutaciones y se sube la evidencia; el admin
   ve los cambios. Repetir el disparo de la misma operación (o reenvío) **no**
   duplica (idempotencia por `operation_id`).
5. Casos: sincronización interrumpida (se reintenta), operación duplicada
   (deduplicada), conflicto de versión/estado (RPC rechaza), fallo de foto
   (queda en cola con `ultimoError` e `intentos`).

### 15.5 Verificación

- `npm run typecheck` limpio · `npm run build` OK · `npm run db:smoke`
  **26/26 PASS** (la idempotencia por `operation_id` está cubierta a nivel DB:
  `generar_checklist`, `reportar_avance` y `finalizar_proyecto` idempotentes).

## 16. Fase 8 — PWA instalable y offline — COMPLETADO

### 16.1 Huecos encontrados

Serwist ya estaba cableado (`withSerwist`, `src/app/sw.ts`, registro automático
en el bundle cliente), pero faltaba lo que hace a una PWA realmente instalable y
resiliente:

1. **Sin fallback offline.** Una navegación a una ruta nunca visitada sin red
   mostraba el error del navegador.
2. **Manifest mínimo.** Sin `id`, `scope`, icono `maskable`, accesos directos ni
   idioma.
3. **Middleware interceptaba la página offline** (`/offline.html` no estaba
   excluido del `matcher`), redirigiendo a `/login` en precache/visita directa.

### 16.2 Cambios

- **Fallback offline nativo** (`src/app/sw.ts`): se usa la opción `fallbacks`
  de Serwist, que inyecta un `PrecacheFallbackPlugin` (`handlerDidError`) en las
  estrategias de `runtimeCaching`. Para `request.destination === "document"` se
  sirve `/offline.html` precacheado cuando ni la red ni la caché responden.
- **`public/offline.html`**: página autocontenida (CSS inline, sin dependencias)
  con la identidad ZYRA y botón de reintento; se precachea automáticamente al ser
  un archivo de `public/` (el plugin de Next incluye `public/` en `__SW_MANIFEST`).
- **Manifest** (`public/manifest.json`): `id`, `scope`, `display_override`,
  `orientation`, `lang: "es"`, `categories`, icono `purpose: "maskable"` y
  accesos directos a `/projects` y `/reports`.
- **Middleware** (`src/middleware.ts`): el `matcher` excluye `offline.html`,
  `sw.js`, `swe-worker-*.js`, `workbox-*.js` y `manifest.json`.

### 16.3 Nota técnica (por qué no se cachean evidencias/mutaciones)

Las rutas de Serwist se indexan por método HTTP y **por defecto `GET`**
(`Route` usa `method || "GET"`). Por eso las **subidas `PUT` a R2** y las
**RPC `POST`** no son interceptadas ni cacheadas por el SW. El fallback offline
solo aplica a navegaciones de documento; los binarios de evidencia y las RPC
siguen yendo directos a la red (o a la cola de la Fase 7 si no hay red).

### 16.4 Verificación

- `npm run typecheck` limpio · `npm run build` OK.
- `public/sw.js` (generado) contiene `/offline.html` en la lista de precache y
  `fallbacks:{entries:[{url:"/offline.html",matcher:…"document"…}]}`.
- Registro del SW presente en el bundle cliente (`serviceWorker.register`).
- `manifest.json` válido (3 iconos, 2 atajos).

## 17. Fase 9 — Cableado de UI y limpieza de ESLint — COMPLETADO

### 17.1 Objetivo

Alcance elegido por el usuario: **"Wire existing UI + clean all warnings"** — hacer
funcionar controles ya presentes en la interfaz que no tenían acción, eliminar
código muerto y llevar ESLint a **0 errores / 0 warnings**. Sin nuevas tablas de
base de datos.

Punto de partida: 16 archivos con **113 warnings** (0 errores). Predominaban
imports/iconos sin usar, `any` explícitos y `catch (e: any)` con `e` sin usar.

### 17.2 UI cableada (funcionalidad real)

- **`src/app/team/page.tsx`**: existía el estado `searchTerm`/`filteredTeams` pero
  **no había input**. Se añadió la barra de búsqueda de equipos (icono `Search`).
  Se tiparon `selectedTeam` (`EquipoConMiembros | null`), `editTeamData`
  (`EditTeamData`) y todos los `MiembroEquipo` en los mapas.
- **`src/app/settings/checklists/page.tsx`**: era una vista **solo-lectura** con
  botones inertes. Se reescribió como CRUD funcional sobre las tablas existentes
  (`checklist_servicio` / `checklist_servicio_detalle`, RLS admin):
  - **Editar** materiales y cantidades con `useActualizarPlantilla` + `useMateriales`.
  - **Crear** plantilla (`nombre` + servicio opcional) con `useCrearPlantilla`.
  - **Eliminar** plantilla con `useEliminarPlantilla` (AlertDialog de confirmación).
- **`src/app/settings/services/page.tsx`**: mostraba `service.empresa?.…` que
  nunca existió en el `select("*")` (siempre caía a "Empresa 1"). Ahora usa el hook
  `useEmpresa()` para mostrar el nombre real de la empresa.
- **`src/app/projects/page.tsx`**: la query `useReportes()` estaba sin usar. Se
  muestran el **conteo de reportes por proyecto** en la tarjeta (solo admin).
- **`src/app/dashboard/page.tsx`**: `myReports` se calculaba pero se descartaba.
  Ahora se **fusiona con el historial** (`[...ptsHistory, ...myReports].slice(0,8)`)
  como fallback de reportes sin puntos. Se eliminó la constante `MEDAL_CONFIG`
  (muerta) y el `t` sin uso.

### 17.3 Capa de datos / hooks añadidos

- `src/lib/data/checklists-servicio.ts`: `crearPlantilla({nombre, servicio_id, empresa_id?})`
  y `eliminarPlantilla(id)`.
- `src/hooks/queries/use-otros.ts`: `useCrearPlantilla` y `useEliminarPlantilla`
  (invalidan `qk.plantillas`).

### 17.4 Errores de tipos corregidos (`strict`)

- `src/hooks/use-toast.ts`: se reemplazó el objeto `actionTypes` por una unión de
  literales; el tipo `Action` ahora usa `type: "ADD_TOAST" | …` directamente, lo
  que restaura la unión discriminada del reducer (antes el `any` implícito rompía
  el `switch`).
- `src/components/ui/calendar.tsx`: los iconos pasan de `any` a
  `React.SVGProps<SVGSVGElement>` y el objeto `components` se castea a
  `React.ComponentProps<typeof DayPicker>["components"]` (react-day-picker v9).
- `src/app/dashboard/page.tsx`: `EmployeeDashboard` deja de ser `any`; se tipan
  `EmpleadoConPuntos`, `PuntoHistorial` e `HistItem`.
- `src/app/clients/page.tsx`, `reports`, `employees`, `materials`, `profile`,
  `team`, `settings/services`: `catch (e: any)` → `catch` / `e instanceof Error`,
  y estado `any` → tipos reales (`Cliente`, `Servicio`).

### 17.5 Verificación

- `npm run lint` → **0 errores, 0 warnings** (`npx eslint .` sin salida, exit 0).
- `npm run typecheck` limpio · `npm run build` OK (24 rutas generadas).
- `npm run db:smoke` → **26/26 PASS** (sin cambios de esquema).
- Sin nuevas migraciones ni tablas; solo inserciones/borrados sobre tablas ya
  existentes protegidas por RLS admin.

