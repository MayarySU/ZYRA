/**
 * Sistema de Gamificación - Versión SQL
 * Los puntos se otorgan en el servidor mediante las RPC transaccionales
 * (`finalizar_proyecto`, `aprobar_reporte`, etc.). Estas utilidades son
 * únicamente de presentación (rango y nivel a partir de los puntos).
 */

export const calcLevel = (points: number): number => {
  return Math.max(1, Math.floor(points / 200) + 1);
};
