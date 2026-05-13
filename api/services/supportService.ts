import admin from "firebase-admin";
import { initFirebase } from "../lib/firebase";

export class SupportService {
  /**
   * Creates a new support ticket
   */
  static async createTicket(payload: {
    userId: string;
    userEmail: string;
    subject: string;
    message: string;
    priority?: string;
  }) {
    const { userId, userEmail, subject, message, priority } = payload;
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");

    const ticketData = {
      userId,
      userEmail,
      subject,
      status: 'open',
      priority: priority || 'medium',
      messages: [{
        senderId: userId,
        senderRole: 'user',
        text: message,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }],
      lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await firebase.db.collection("tickets").add(ticketData);
    return { ticketId: docRef.id };
  }

  /**
   * Gets tickets for a specific user
   */
  static async getUserTickets(userId: string) {
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");

    const snap = await firebase.db.collection("tickets")
      .where("userId", "==", userId)
      .orderBy("updatedAt", "desc")
      .get();
    
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Adds a message to an existing ticket
   */
  static async addTicketMessage(ticketId: string, payload: {
    senderId: string;
    senderRole: string;
    text: string;
  }) {
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");

    const message = {
      ...payload,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await firebase.db.collection("tickets").doc(ticketId).update({
      messages: admin.firestore.FieldValue.arrayUnion(message),
      lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  }

  /**
   * Admin: Gets all tickets
   */
  static async getAllTickets() {
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");

    const snap = await firebase.db.collection("tickets")
      .orderBy("updatedAt", "desc")
      .get();
    
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Admin: Updates ticket status
   */
  static async updateTicketStatus(ticketId: string, status: string) {
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");

    await firebase.db.collection("tickets").doc(ticketId).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  }
}
