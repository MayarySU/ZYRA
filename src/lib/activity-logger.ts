import { collection, addDoc, serverTimestamp, Firestore } from "firebase/firestore";

export type ActivityType = 
  | 'project_started' 
  | 'project_finished' 
  | 'report_submitted' 
  | 'material_used' 
  | 'level_up' 
  | 'achievement_earned'
  | 'project_assigned';

export interface ActivityLog {
  userId: string;
  userName: string;
  type: ActivityType;
  title: string;
  description: string;
  projectId?: string;
  projectName?: string;
  metadata?: any;
  timestamp: string;
  createdAt: any;
}

export async function logActivity(
  db: Firestore, 
  activity: Omit<ActivityLog, 'timestamp' | 'createdAt'>
) {
  if (!db) return;
  
  try {
    const logsCol = collection(db, "activity_logs");
    await addDoc(logsCol, {
      ...activity,
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error logging activity:", error);
  }
}
