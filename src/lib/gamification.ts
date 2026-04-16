/**
 * ZYRA — Gamification Engine
 * Handles points, level calculation, and medal awarding.
 */

import { doc, getDoc, updateDoc, increment, collection, query, where, getDocs } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";

// ─────────────────────────────────────────────────
// LEVEL FORMULA: every 200 pts = 1 level, starts at 1
// ─────────────────────────────────────────────────
export function calcLevel(puntos: number): number {
  return Math.floor(puntos / 200) + 1;
}

export function pointsForNextLevel(nivel: number): number {
  return nivel * 200;
}

// ─────────────────────────────────────────────────
// MEDAL DEFINITIONS
// ─────────────────────────────────────────────────
export interface MedalDef {
  id: string;
  nombre: string;
  descripcion: string;
  emoji: string;
  triggers: ActionType[];
  condition: (stats: EmployeeStats) => boolean;
}

export type ActionType =
  | "report_submitted"
  | "photo_uploaded"
  | "correction_submitted"
  | "project_approved";

export interface EmployeeStats {
  totalReportsSubmitted: number;
  totalPhotosUploaded: number;
  totalCorrections: number;
  totalApprovedProjects: number;
}

export const MEDALS: MedalDef[] = [
  {
    id: "primer_reporte",
    nombre: "Primer Reporte",
    descripcion: "Enviaste tu primer reporte de avance.",
    emoji: "📋",
    triggers: ["report_submitted"],
    condition: (s) => s.totalReportsSubmitted >= 1,
  },
  {
    id: "fotografo",
    nombre: "Fotógrafo",
    descripcion: "Subiste evidencia fotográfica en un reporte.",
    emoji: "📸",
    triggers: ["photo_uploaded"],
    condition: (s) => s.totalPhotosUploaded >= 1,
  },
  {
    id: "corrector",
    nombre: "Corrector",
    descripcion: "Corregiste exitosamente un reporte rechazado.",
    emoji: "🔧",
    triggers: ["correction_submitted"],
    condition: (s) => s.totalCorrections >= 1,
  },
  {
    id: "proyecto_completado",
    nombre: "Proyecto Completado",
    descripcion: "Tu primer proyecto fue aprobado.",
    emoji: "🏆",
    triggers: ["project_approved"],
    condition: (s) => s.totalApprovedProjects >= 1,
  },
  {
    id: "experto",
    nombre: "Experto",
    descripcion: "Completaste 5 proyectos aprobados.",
    emoji: "⭐",
    triggers: ["project_approved"],
    condition: (s) => s.totalApprovedProjects >= 5,
  },
  {
    id: "veterano",
    nombre: "Veterano",
    descripcion: "Completaste 10 proyectos aprobados.",
    emoji: "🎖️",
    triggers: ["project_approved"],
    condition: (s) => s.totalApprovedProjects >= 10,
  },
  {
    id: "super_fotografo",
    nombre: "Super Camarógrafo",
    descripcion: "Subiste 10 fotos de evidencia en distintos reportes.",
    emoji: "🎥",
    triggers: ["photo_uploaded"],
    condition: (s) => s.totalPhotosUploaded >= 10,
  },
  {
    id: "reportero",
    nombre: "Reportero Activo",
    descripcion: "Enviaste 10 reportes de avance.",
    emoji: "📰",
    triggers: ["report_submitted"],
    condition: (s) => s.totalReportsSubmitted >= 10,
  },
];

// ─────────────────────────────────────────────────
// RECORD ACTION: update stats, award medals,
// recalculate level, and return change summary.
// ─────────────────────────────────────────────────
export async function recordAction(
  db: Firestore,
  uid: string,
  action: ActionType,
  extraPuntos = 0
): Promise<{ leveledUp: boolean; newMedals: MedalDef[]; newNivel: number }> {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return { leveledUp: false, newMedals: [], newNivel: 1 };

  const data = snap.data();
  const prevNivel: number = data.nivel || 1;

  // Build cumulative stats AFTER this action
  const stats: EmployeeStats = {
    totalReportsSubmitted: (data.totalReportsSubmitted || 0) + (action === "report_submitted" ? 1 : 0),
    totalPhotosUploaded:   (data.totalPhotosUploaded   || 0) + (action === "photo_uploaded"   ? 1 : 0),
    totalCorrections:      (data.totalCorrections      || 0) + (action === "correction_submitted" ? 1 : 0),
    totalApprovedProjects: (data.totalApprovedProjects || 0) + (action === "project_approved" ? 1 : 0),
  };

  // Calculate new points + level
  const newPuntos = (data.puntos || 0) + extraPuntos;
  const newNivel  = calcLevel(newPuntos);
  const leveledUp = newNivel > prevNivel;

  // Find medals to award (not already earned)
  const existingMedalIds: string[] = (data.logros || [])
    .filter((l: any) => l.completado)
    .map((l: any) => l.id);

  const newMedals = MEDALS.filter(
    (m) => m.triggers.includes(action) && m.condition(stats) && !existingMedalIds.includes(m.id)
  );

  // Merge into logros array
  const currentLogros: any[] = data.logros || [];
  const updatedLogros = [...currentLogros];

  for (const medal of newMedals) {
    const idx = updatedLogros.findIndex((l: any) => l.id === medal.id);
    const entry = {
      id: medal.id,
      nombre: medal.nombre,
      emoji: medal.emoji,
      completado: true,
      obtainedAt: new Date().toISOString(),
    };
    if (idx !== -1) {
      updatedLogros[idx] = entry;
    } else {
      updatedLogros.push(entry);
    }
  }

  // Persist
  const update: Record<string, any> = {
    nivel: newNivel,
    logros: updatedLogros,
  };
  if (extraPuntos > 0) update.puntos = increment(extraPuntos);

  // Increment stat counters
  if (action === "report_submitted")     update.totalReportsSubmitted = stats.totalReportsSubmitted;
  if (action === "photo_uploaded")       update.totalPhotosUploaded   = stats.totalPhotosUploaded;
  if (action === "correction_submitted") update.totalCorrections      = stats.totalCorrections;
  if (action === "project_approved")     update.totalApprovedProjects = stats.totalApprovedProjects;

  await updateDoc(userRef, update);

  return { leveledUp, newMedals, newNivel };
}

// Legacy compat – kept so existing callers don't break
export interface Achievement {
  id: string;
  nombre: string;
  descripcion: string;
  completado: boolean;
  fecha?: string;
}

export async function checkAndAwardAchievements(db: Firestore, userId: string, profile: any): Promise<string[]> {
  return [];
}
