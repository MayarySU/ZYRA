import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Firestore } from "firebase/firestore";

export interface Achievement {
  id: string;
  nombre: string;
  descripcion: string;
  completado: boolean;
  fecha?: string;
}

const ACHIEVEMENTS_TEMPLATE: Achievement[] = [
  { id: 'novato', nombre: 'Novato', descripcion: 'Finaliza tu primer proyecto', completado: false },
  { id: 'experto', nombre: 'Experto', descripcion: 'Finaliza 5 proyectos', completado: false },
  { id: 'elite', nombre: 'Elite', descripcion: 'Finaliza 10 proyectos', completado: false },
  { id: 'leyenda', nombre: 'Leyenda', descripcion: 'Finaliza 25 proyectos', completado: false },
  { id: 'puntual', nombre: 'Puntualidad', descripcion: 'Inicia 5 proyectos a tiempo', completado: false },
  { id: 'maestro_material', nombre: 'Maestro de Materiales', descripcion: 'Registra materiales en 10 reportes', completado: false },
  { id: 'comunicador', nombre: 'Comunicador', descripcion: 'Redacta 15 reportes detallados', completado: false },
];

export async function checkAndAwardAchievements(db: Firestore, userId: string, profile: any) {
  // ALWAYS return an array to avoid crashes in ProjectsPage
  if (!db || !userId) return [];

  try {
    // 1. Obtener conteo de reportes del usuario
    const reportsQuery = query(collection(db, "reports"), where("employeeId", "==", userId));
    const reportsSnap = await getDocs(reportsQuery);
    const finishCount = reportsSnap.size;

    let currentLogros = profile?.logros || [...ACHIEVEMENTS_TEMPLATE];
    let changed = false;

    const checkAchievement = (id: string, condition: boolean) => {
      const index = currentLogros.findIndex((a: any) => a.id === id);
      if (index !== -1 && !currentLogros[index].completado && condition) {
        currentLogros[index].completado = true;
        currentLogros[index].fecha = new Date().toISOString();
        changed = true;
        return true;
      }
      return false;
    };

    // Evaluar condiciones
    const newlyAwarded: string[] = [];
    const reportsWithMaterials = reportsSnap.docs.filter(d => (d.data().usedMaterials?.length || 0) > 0).length;
    const longReports = reportsSnap.docs.filter(d => (d.data().content?.length || 0) > 100).length;

    if (checkAchievement('novato', finishCount >= 1)) newlyAwarded.push('Novato');
    if (checkAchievement('experto', finishCount >= 5)) newlyAwarded.push('Experto');
    if (checkAchievement('elite', finishCount >= 10)) newlyAwarded.push('Elite');
    if (checkAchievement('leyenda', finishCount >= 25)) newlyAwarded.push('Leyenda');
    if (checkAchievement('maestro_material', reportsWithMaterials >= 10)) newlyAwarded.push('Maestro de Materiales');
    if (checkAchievement('comunicador', longReports >= 15)) newlyAwarded.push('Comunicador');

    if (changed) {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { logros: currentLogros });
      return newlyAwarded;
    }
  } catch (e) {
    console.error("Error evaluating achievements:", e);
  }

  return [];
}
