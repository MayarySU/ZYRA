-- =====================================================================
-- ZYRA — 0010_viabilidad_evidencias_rls.sql
-- Lectura de evidencias por participantes de viabilidad (off-team).
--
-- La política `evidencias_select` (0003) solo permite admin o miembro del
-- proyecto. Un inspector/especialista de viabilidad puede NO ser miembro del
-- equipo, así que no podría:
--   - ver el objeto `evidencias` embebido en el detalle de la revisión, ni
--   - obtener una URL prefirmada (la ruta /api/upload/download autoriza por
--     esta misma RLS).
--
-- Solución acotada: una política adicional `for select` que permite leer una
-- evidencia SOLO si está enlazada (`viabilidad_evidencias`) a una revisión de
-- la que el usuario es participante (`es_participante_viabilidad`). No amplía
-- la escritura ni concede membresía general del proyecto.
--
-- Las políticas permisivas se combinan con OR, por lo que la política
-- existente sigue vigente.
-- =====================================================================
begin;

drop policy if exists evidencias_viabilidad_participante on public.evidencias;
create policy evidencias_viabilidad_participante on public.evidencias
  for select to authenticated
  using (
    exists (
      select 1
        from public.viabilidad_evidencias ve
        join public.viabilidad_revisiones r
          on r.id_revision_viabilidad = ve.revision_id
       where ve.evidencia_id = public.evidencias.id_evidencia
         and public.es_participante_viabilidad(r.id_revision_viabilidad)
    )
  );

commit;
