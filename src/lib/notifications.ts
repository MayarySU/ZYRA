/**
 * ZYRA — Notification Engine
 * Creates notification documents in Firestore for a given user.
 */

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";

export type NotificationType = "report" | "project" | "team" | "level" | "achievement" | "info";

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
}

export async function sendNotification(
  db: Firestore,
  payload: NotificationPayload
): Promise<void> {
  try {
    await addDoc(collection(db, "notifications"), {
      ...payload,
      read: false,
      createdAt: new Date().toISOString(),
      serverCreatedAt: serverTimestamp(),
    });
  } catch (e) {
    // Fail silently – notifications are non-critical
    console.warn("Notification error:", e);
  }
}

/**
 * Send a notification to multiple users at once.
 */
export async function sendNotificationToMany(
  db: Firestore,
  userIds: string[],
  payload: Omit<NotificationPayload, "userId">
): Promise<void> {
  await Promise.allSettled(
    userIds.map((uid) => sendNotification(db, { ...payload, userId: uid }))
  );
}
