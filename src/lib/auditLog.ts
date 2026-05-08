import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface AuditEvent {
  action: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  actorEmail?: string;
  details?: Record<string, unknown>;
}

export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      ...event,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Audit logging is non-critical — never throw
  }
}
