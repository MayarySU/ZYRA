-- =====================================================================
-- ZYRA — 0006_checklist_detalle_actualizado.sql
-- La tabla `checklist_detalle` tiene columna `actualizado_en` pero (a
-- diferencia del resto de tablas) no tenía trigger que la mantuviera. Se
-- añade para soportar el control de versión optimista del outbox offline:
-- cada UPDATE avanza la versión y el ejecutor puede detectar ediciones
-- concurrentes (conflicto) en lugar de sobrescribirlas.
-- Idempotente: se puede reaplicar sin efectos secundarios.
-- =====================================================================

drop trigger if exists trg_checklist_detalle_actualizado on public.checklist_detalle;
create trigger trg_checklist_detalle_actualizado
  before update on public.checklist_detalle
  for each row execute function public.set_actualizado_en();
