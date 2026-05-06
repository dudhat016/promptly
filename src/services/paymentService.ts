import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

declare const Cashfree: any;

export const PaymentService = {
  async getPaymentConfig() {
    try {
      const docSnap = await getDoc(doc(db, 'configs', 'payment'));
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (err) {
      console.error("Error fetching payment config:", err);
      return null;
    }
  },

  async initiateCashfreePayment(orderData: { 
    amount: number; 
    currency: string; 
    customerId: string; 
    customerEmail: string; 
    customerPhone: string;
    planId: string;
    billingCycle: string;
  }) {
    try {
      // 1. Call your backend to create a Cashfree Order and get payment_session_id
      const response = await fetch('/api/payments/cashfree/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to create Cashfree order");

      const { payment_session_id, environment } = data;

      // 2. Initialize Cashfree
      const cashfree = Cashfree({
        mode: environment === 'production' ? 'production' : 'sandbox'
      });

      // 3. Trigger Checkout
      await cashfree.checkout({
        paymentSessionId: payment_session_id,
        returnUrl: `${window.location.origin}/checkout/verify?order_id={order_id}`
      });

      return { success: true };
    } catch (err: any) {
      console.error("Cashfree Payment Error:", err);
      throw err;
    }
  }
};
