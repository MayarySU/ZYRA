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
