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
];

export async function checkAndAwardAchievements(db: Firestore, userId: string, profile: any) {
  if (!db || !userId) return;

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
  if (checkAchievement('novato', finishCount >= 1)) newlyAwarded.push('Novato');
  if (checkAchievement('experto', finishCount >= 5)) newlyAwarded.push('Experto');
  if (checkAchievement('elite', finishCount >= 10)) newlyAwarded.push('Elite');
  if (checkAchievement('leyenda', finishCount >= 25)) newlyAwarded.push('Leyenda');

  if (changed) {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { logros: currentLogros });
    return newlyAwarded;
  }

  return [];
}
