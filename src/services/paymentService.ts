import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

declare const Cashfree: any;

export const PaymentService = {
  async getPaymentConfig() {
    try {
      const docSnap = await getDoc(doc(db, 'configs', 'payment'));
      if (docSnap.exists()) return docSnap.data();
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
    couponId?: string;
    couponCode?: string;
    couponDiscount?: number;
    originalAmount?: number;
  }) {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error('Not authenticated');

    const response = await fetch('/api/payments/cashfree/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body: JSON.stringify(orderData)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || "Failed to create Cashfree order");

    const { payment_session_id, environment } = data;

    const cashfree = Cashfree({ mode: environment === 'production' ? 'production' : 'sandbox' });
    const lng = window.location.pathname.split('/')[1] || 'en';
    await cashfree.checkout({
      paymentSessionId: payment_session_id,
      returnUrl: `${window.location.origin}/${lng}/checkout/verify?order_id={order_id}`
    });

    return { success: true };
  },

  async initiateCashfreeSubscription(orderData: {
    amount: number;
    currency: string;
    customerId: string;
    customerEmail: string;
    customerPhone: string;
    customerName: string;
    planId: string;
    billingCycle: string;
    couponId?: string;
    couponCode?: string;
    couponDiscount?: number;
    originalAmount?: number;
  }) {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error('Not authenticated');

    const response = await fetch('/api/payments/cashfree/create-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body: JSON.stringify(orderData)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || "Failed to create subscription");

    // Redirect to Cashfree mandate authorization URL
    if (data.authLink) {
      window.location.href = data.authLink;
    }

    return { success: true, subscriptionId: data.subscriptionId };
  },

  async initiatePaypalSubscription(payload: {
    customerId: string;
    customerEmail: string;
    planId: string;
    billingCycle: string;
    amount: number;
  }) {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error('Not authenticated');

    const response = await fetch('/api/payments/paypal/create-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || "Failed to create PayPal subscription");

    // Redirect to PayPal approval page
    if (data.approveUrl) {
      window.location.href = data.approveUrl;
    }

    return { success: true, subscriptionId: data.subscriptionId };
  },

  async initiateStripeTrialCheckout(params: {
    planId: string;
    planName: string;
    billingCycle: string;
    amount: number;
    trialDays: number;
    originalAmount?: number;
    couponDiscount?: number;
    couponCode?: string;
    couponId?: string;
  }) {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error('Not authenticated');
    const userId = auth.currentUser!.uid;
    const userEmail = auth.currentUser!.email || '';

    const response = await fetch('/api/payments/stripe/create-trial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body: JSON.stringify({ ...params, userId, userEmail }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to create Stripe trial checkout");

    if (data.url) {
      window.location.href = data.url;
    }
    return { success: true };
  },

  async initiateStripeCheckout(params: {
    planId: string;
    planName: string;
    billingCycle: string;
    amount: number;
    originalAmount?: number;
    couponDiscount?: number;
    couponCode?: string;
    referralCode?: string;
    couponId?: string;
  }) {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error('Not authenticated');
    const userId = auth.currentUser!.uid;
    const userEmail = auth.currentUser!.email || '';

    const response = await fetch('/api/payments/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body: JSON.stringify({ ...params, userId, userEmail }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to create Stripe checkout");

    if (data.url) {
      window.location.href = data.url;
    }
    return { success: true };
  },

  async cancelSubscription(payload: {
    customerId: string;
    subscriptionGateway?: string;
    subscriptionId?: string;
    paypalSubscriptionId?: string;
  }) {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error('Not authenticated');

    const response = await fetch('/api/payments/cancel-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || "Cancellation failed");
    return data;
  }
};
