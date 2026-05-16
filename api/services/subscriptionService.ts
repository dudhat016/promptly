import admin from "firebase-admin";
import { initFirebase } from "../lib/firebase.js";
import { sendSuccessEmail } from "../lib/payouts.js";
import { DunningService } from "./dunningService.js";
import { triggerFlow } from "./automationEngine.js";

export class SubscriptionService {

  // ── Cashfree ─────────────────────────────────────────────────────────────────

  static async createCashfreeSubscription(payload: {
    customerId: string;
    customerEmail: string;
    customerPhone: string;
    customerName: string;
    planId: string;
    billingCycle: string;
    amount: number;
    currency: string;
  }) {
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");

    const configSnap = await firebase.db.collection("configs").doc("payment").get();
    const config = configSnap.exists ? configSnap.data() : null;

    const appId = config?.cashfree?.appId || process.env.CASHFREE_APP_ID;
    const secretKey = config?.cashfree?.secretKey || process.env.CASHFREE_SECRET_KEY;

    if (!appId || !secretKey) throw new Error("Cashfree credentials missing");

    const subApiBase = "https://api.cashfree.com/api/v2";
    const headers: Record<string, string> = {
      'x-client-id': appId,
      'x-client-secret': secretKey,
      'Content-Type': 'application/json'
    };

    // Ensure plan exists (idempotent by planId)
    const cashfreePlanId = `PROMPTLY_${payload.planId.toUpperCase()}_${payload.billingCycle.toUpperCase()}`;

    const planCheckRes = await fetch(`${subApiBase}/subscriptions/plans/${cashfreePlanId}`, { headers });
    if (!planCheckRes.ok) {
      const planRes = await fetch(`${subApiBase}/subscriptions/plans`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          planId: cashfreePlanId,
          planName: `Promptly ${payload.planId} ${payload.billingCycle}`,
          type: "PERIODIC",
          maxCycles: 0,
          amount: payload.amount,
          currency: payload.currency,
          intervals: 1,
          intervalType: payload.billingCycle === 'yearly' ? 'YEAR' : 'MONTH',
          description: `Promptly ${payload.planId} - ${payload.billingCycle}`
        })
      });
      if (!planRes.ok) {
        const planErr = await planRes.json().catch(() => ({}));
        const detail = planErr.message || planErr.error || planErr.type || JSON.stringify(planErr);
        console.error('[Cashfree] plan creation failed', planRes.status, detail);
        throw new Error(`Cashfree plan error (${planRes.status}): ${detail}`);
      }
    }

    // Create subscription
    const subscriptionId = `SUB_${payload.customerId}_${Date.now()}`;
    const appUrl = (process.env.APP_URL || 'http://localhost:5173').replace('http://', 'https://');
    const expiresOn = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000)
      .toISOString().replace('T', ' ').slice(0, 19);

    const subRes = await fetch(`${subApiBase}/subscriptions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subscriptionId,
        planId: cashfreePlanId,
        customerDetails: {
          customerId: payload.customerId,
          customerName: payload.customerName || 'Creator',
          customerEmail: payload.customerEmail,
          customerPhone: payload.customerPhone || '9999999999'
        },
        authAmount: 1,
        returnUrl: `${appUrl}/checkout/verify?subscription_id=${subscriptionId}`,
        expiresOn
      })
    });

    const subData: any = await subRes.json();
    if (!subRes.ok) {
      const detail = subData.message || subData.error || subData.type || JSON.stringify(subData);
      console.error('[Cashfree] subscription creation failed', subRes.status, detail);
      throw new Error(`Cashfree subscription error (${subRes.status}): ${detail}`);
    }

    // Mark pending subscription in Firestore
    await firebase.db.collection("users").doc(payload.customerId).update({
      pendingSubscriptionId: subscriptionId,
      pendingPlanId: payload.planId,
      pendingBillingCycle: payload.billingCycle,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      subscriptionId,
      authLink: subData.authLink || subData.authUrl,
      subReferenceId: subData.subReferenceId
    };
  }

  static async verifyCashfreeSubscription(subscriptionId: string) {
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");

    const configSnap = await firebase.db.collection("configs").doc("payment").get();
    const config = configSnap.exists ? configSnap.data() : null;

    const appId = config?.cashfree?.appId || process.env.CASHFREE_APP_ID;
    const secretKey = config?.cashfree?.secretKey || process.env.CASHFREE_SECRET_KEY;

    const res = await fetch(`https://api.cashfree.com/api/v2/subscriptions/${subscriptionId}`, {
      headers: { 'x-client-id': appId!, 'x-client-secret': secretKey! }
    });

    const data: any = await res.json();

    if (data.status === 'ACTIVE' || data.status === 'INITIALIZED') {
      const usersSnap = await firebase.db.collection("users")
        .where('pendingSubscriptionId', '==', subscriptionId)
        .limit(1).get();

      if (usersSnap.empty) throw new Error("User not found for subscription");

      const userDoc = usersSnap.docs[0];
      const userData = userDoc.data();
      const planId = userData.pendingPlanId || 'pro_plan';
      const billingCycle = userData.pendingBillingCycle || 'monthly';

      const planSnap = await firebase.db.collection("plans").doc(planId).get();
      const planData = planSnap.exists ? planSnap.data() : { monthlyCredits: 500, name: 'Pro' };
      const planCredits = planData!.monthlyCredits ?? planData!.credits ?? 500;

      const expiryDate = new Date();
      if (billingCycle === 'yearly') expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      else expiryDate.setMonth(expiryDate.getMonth() + 1);

      await userDoc.ref.update({
        subscriptionStatus: planId === 'free' ? 'free' : 'pro',
        activePlanId: planId,
        subscriptionId,
        subscriptionGateway: 'cashfree',
        billingCycle,
        autoPayEnabled: true,
        cancelAtPeriodEnd: false,
        credits: planCredits,
        monthlyLimit: planCredits,
        currentPeriodEnd: admin.firestore.Timestamp.fromDate(expiryDate),
        pendingSubscriptionId: admin.firestore.FieldValue.delete(),
        pendingPlanId: admin.firestore.FieldValue.delete(),
        pendingBillingCycle: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      await firebase.db.collection("orders").doc(subscriptionId).set({
        orderId: subscriptionId,
        userId: userDoc.id,
        userEmail: userData.email || userData.userEmail,
        planId,
        planName: planData!.name,
        amount: data.authAmount || 1,
        currency: 'INR',
        status: 'active',
        billingCycle,
        gateway: 'cashfree',
        type: 'subscription',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      sendSuccessEmail(
        userData.email || userData.userEmail || '',
        userData.displayName || 'Creator',
        planData!.name as string,
        subscriptionId,
        data.authAmount || 0,
        'INR'
      );

      triggerFlow(firebase.db, 'subscription_payment_received', userDoc.id, {
        plan: planData!.name as string, planId, amount: String(data.authAmount || 0), currency: 'INR'
      }).catch(err => console.error('[Automation] subscription trigger failed:', err.message));

      return {
        status: 'PAID',
        orderId: subscriptionId,
        planName: planData!.name,
        amount: data.authAmount || 0,
        currency: 'INR',
        type: 'subscription'
      };
    }

    return { status: data.status, message: "Subscription not yet active" };
  }

  static async cancelCashfreeSubscription(subscriptionId: string, userId: string) {
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");

    const configSnap = await firebase.db.collection("configs").doc("payment").get();
    const config = configSnap.exists ? configSnap.data() : null;

    const appId = config?.cashfree?.appId || process.env.CASHFREE_APP_ID;
    const secretKey = config?.cashfree?.secretKey || process.env.CASHFREE_SECRET_KEY;

    const res = await fetch(`https://api.cashfree.com/api/v2/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: {
        'x-client-id': appId!,
        'x-client-secret': secretKey!,
        'Content-Type': 'application/json'
      }
    });

    const data: any = await res.json();

    // Mark cancel at period end regardless of gateway response
    const userSnap = await firebase.db.collection("users").doc(userId).get();
    await firebase.db.collection("users").doc(userId).update({
      cancelAtPeriodEnd: true,
      autoPayEnabled: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    triggerFlow(firebase.db, 'subscription_cancelled', userId, {
      plan: userSnap.exists ? (userSnap.data()?.activePlanId || '') : '',
    }).catch(() => {});

    return { success: true, data };
  }

  static async handleCashfreeWebhook(payload: any) {
    const firebase = await initFirebase();
    if (!firebase) return { received: true };

    const eventType = payload.type || payload.event;

    if (eventType === 'SUBSCRIPTION_PAYMENT_SUCCESS') {
      const sub = payload.data?.subscription || payload.subscription;
      const payment = payload.data?.payment || payload.payment;
      const subscriptionId = sub?.subscriptionId || sub?.subReferenceId;

      if (!subscriptionId) return { error: "No subscription ID in webhook" };

      // Idempotency: check if we already processed this payment
      const paymentId = payment?.paymentId || `${subscriptionId}_${Date.now()}`;
      const paymentRef = firebase.db.collection("subscription_payments").doc(paymentId);
      if ((await paymentRef.get()).exists) return { already: true };

      const usersSnap = await firebase.db.collection("users")
        .where('subscriptionId', '==', subscriptionId)
        .limit(1).get();

      if (!usersSnap.empty) {
        const userDoc = usersSnap.docs[0];
        const userData = userDoc.data();

        const expiryDate = userData.currentPeriodEnd?.toDate
          ? new Date(userData.currentPeriodEnd.toDate())
          : new Date();

        if (userData.billingCycle === 'yearly') expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        else expiryDate.setMonth(expiryDate.getMonth() + 1);

        await userDoc.ref.update({
          subscriptionStatus: 'pro',
          currentPeriodEnd: admin.firestore.Timestamp.fromDate(expiryDate),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await paymentRef.set({
          subscriptionId,
          userId: userDoc.id,
          amount: payment?.amount || 0,
          currency: 'INR',
          gateway: 'cashfree',
          type: 'renewal',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Clear dunning state on successful renewal
        if (userDoc.data().dunningStatus === 'failing') {
          await DunningService.handlePaymentRecovery(userDoc.id);
        }

        triggerFlow(firebase.db, 'subscription_renewed', userDoc.id, {
          plan: userData.activePlanId || '', amount: String(payment?.amount || 0), currency: 'INR'
        }).catch(err => console.error('[Automation] subscription_renewed trigger failed:', err.message));
      }
    }

    // Failed payment — trigger dunning
    if (eventType === 'SUBSCRIPTION_PAYMENT_FAILED' || eventType === 'failed_payment' || eventType === 'instrument_failed') {
      const sub = payload.data?.subscription || payload.subscription;
      const subscriptionId = sub?.subscriptionId || sub?.subReferenceId;
      if (subscriptionId) {
        const usersSnap = await firebase.db.collection("users")
          .where('subscriptionId', '==', subscriptionId).limit(1).get();
        if (!usersSnap.empty) {
          const userDoc = usersSnap.docs[0];
          const currentAttempt = (userDoc.data().dunningAttempt || 0) + 1;
          await DunningService.handlePaymentFailure(userDoc.id, 'cashfree', currentAttempt);
        }
      }
    }

    if (eventType === 'SUBSCRIPTION_CANCELLED' || eventType === 'SUBSCRIPTION_STATUS_CHANGE') {
      const sub = payload.data?.subscription || payload.subscription;
      const subscriptionId = sub?.subscriptionId || sub?.subReferenceId;

      if (subscriptionId && (sub?.status === 'CANCELLED' || sub?.status === 'EXPIRED')) {
        const usersSnap = await firebase.db.collection("users")
          .where('subscriptionId', '==', subscriptionId)
          .limit(1).get();

        if (!usersSnap.empty) {
          const userDoc = usersSnap.docs[0];
          await userDoc.ref.update({
            cancelAtPeriodEnd: true,
            autoPayEnabled: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          triggerFlow(firebase.db, 'subscription_cancelled', userDoc.id, {
            plan: userDoc.data().activePlanId || '',
          }).catch(() => {});
        }
      }
    }

    return { received: true };
  }

  // ── PayPal ────────────────────────────────────────────────────────────────────

  private static async getPaypalToken(baseUrl: string, clientId: string, clientSecret: string) {
    const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    const { access_token } = await res.json();
    return access_token as string;
  }

  private static async ensurePaypalPlan(
    baseUrl: string, token: string, firebase: any,
    planId: string, billingCycle: string, amount: number
  ): Promise<string> {
    const planKey = `${planId}_${billingCycle}`;
    const metaSnap = await firebase.db.collection("configs").doc("paypal_plans").get();
    const existing = metaSnap.exists ? metaSnap.data()?.[planKey] : null;
    if (existing) return existing;

    // Create product
    const productRes = await fetch(`${baseUrl}/v1/catalogs/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: `Promptly ${planId}`, type: 'SERVICE', category: 'SOFTWARE' })
    });
    const product: any = await productRes.json();

    // Create plan
    const planRes = await fetch(`${baseUrl}/v1/billing/plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        product_id: product.id,
        name: `Promptly ${planId} ${billingCycle}`,
        status: 'ACTIVE',
        billing_cycles: [{
          frequency: {
            interval_unit: billingCycle === 'yearly' ? 'YEAR' : 'MONTH',
            interval_count: 1
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: { value: String(amount), currency_code: 'USD' }
          }
        }],
        payment_preferences: {
          auto_bill_outstanding: true,
          payment_failure_threshold: 3
        }
      })
    });
    const plan: any = await planRes.json();

    await firebase.db.collection("configs").doc("paypal_plans").set(
      { [planKey]: plan.id },
      { merge: true }
    );

    return plan.id as string;
  }

  static async createPaypalSubscription(payload: {
    customerId: string;
    customerEmail: string;
    planId: string;
    billingCycle: string;
    amount: number;
  }) {
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");

    const configSnap = await firebase.db.collection("configs").doc("payment").get();
    const config = configSnap.exists ? configSnap.data() : null;

    const clientId = config?.paypal?.clientId || process.env.VITE_PAYPAL_CLIENT_ID;
    const clientSecret = config?.paypal?.clientSecret || process.env.PAYPAL_CLIENT_SECRET;
    const environment = config?.paypal?.environment || 'sandbox';
    const baseUrl = environment === 'production'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    const token = await SubscriptionService.getPaypalToken(baseUrl, clientId!, clientSecret!);

    const paypalPlanId = await SubscriptionService.ensurePaypalPlan(
      baseUrl, token, firebase,
      payload.planId, payload.billingCycle, payload.amount
    );

    const appUrl = (process.env.APP_URL || 'http://localhost:5173').replace('http://', 'https://');

    const subRes = await fetch(`${baseUrl}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        plan_id: paypalPlanId,
        subscriber: { email_address: payload.customerEmail },
        application_context: {
          brand_name: 'Promptly',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
          },
          return_url: `${appUrl}/checkout/verify?subscription_id=PP_${payload.customerId}&paypal_sub_id={subscriptionId}`,
          cancel_url: `${appUrl}/pricing`
        },
        custom_id: `${payload.customerId}|${payload.planId}|${payload.billingCycle}`
      })
    });

    const subData: any = await subRes.json();
    if (!subRes.ok) throw new Error(subData.message || "Failed to create PayPal subscription");

    const approveLink = subData.links?.find((l: any) => l.rel === 'approve')?.href;

    // Store pending subscription
    await firebase.db.collection("users").doc(payload.customerId).update({
      pendingSubscriptionId: `PP_${payload.customerId}`,
      pendingPaypalSubId: subData.id,
      pendingPlanId: payload.planId,
      pendingBillingCycle: payload.billingCycle,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { subscriptionId: subData.id, approveUrl: approveLink };
  }

  static async activatePaypalSubscription(paypalSubId: string, userId: string) {
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");

    const configSnap = await firebase.db.collection("configs").doc("payment").get();
    const config = configSnap.exists ? configSnap.data() : null;

    const clientId = config?.paypal?.clientId || process.env.VITE_PAYPAL_CLIENT_ID;
    const clientSecret = config?.paypal?.clientSecret || process.env.PAYPAL_CLIENT_SECRET;
    const environment = config?.paypal?.environment || 'sandbox';
    const baseUrl = environment === 'production'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    const token = await SubscriptionService.getPaypalToken(baseUrl, clientId!, clientSecret!);

    const res = await fetch(`${baseUrl}/v1/billing/subscriptions/${paypalSubId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const subData: any = await res.json();

    if (subData.status === 'ACTIVE' || subData.status === 'APPROVED') {
      const userRef = firebase.db.collection("users").doc(userId);
      const userSnap = await userRef.get();
      const userData = userSnap.exists ? userSnap.data() : {};

      const planId = userData!.pendingPlanId || 'pro_plan';
      const billingCycle = userData!.pendingBillingCycle || 'monthly';

      const planSnap = await firebase.db.collection("plans").doc(planId).get();
      const planData = planSnap.exists ? planSnap.data() : { monthlyCredits: 500, name: 'Pro' };
      const planCredits = planData!.monthlyCredits ?? planData!.credits ?? 500;

      const expiryDate = new Date();
      if (billingCycle === 'yearly') expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      else expiryDate.setMonth(expiryDate.getMonth() + 1);

      const subscriptionId = `PP_${userId}`;

      await userRef.update({
        subscriptionStatus: planId === 'free' ? 'free' : 'pro',
        activePlanId: planId,
        subscriptionId,
        paypalSubscriptionId: paypalSubId,
        subscriptionGateway: 'paypal',
        billingCycle,
        autoPayEnabled: true,
        cancelAtPeriodEnd: false,
        credits: planCredits,
        monthlyLimit: planCredits,
        currentPeriodEnd: admin.firestore.Timestamp.fromDate(expiryDate),
        pendingSubscriptionId: admin.firestore.FieldValue.delete(),
        pendingPaypalSubId: admin.firestore.FieldValue.delete(),
        pendingPlanId: admin.firestore.FieldValue.delete(),
        pendingBillingCycle: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      await firebase.db.collection("orders").doc(subscriptionId).set({
        orderId: subscriptionId,
        userId,
        userEmail: userData!.email || '',
        planId,
        planName: planData!.name,
        amount: subData.billing_info?.last_payment?.amount?.value || 0,
        currency: 'USD',
        status: 'active',
        billingCycle,
        gateway: 'paypal',
        type: 'subscription',
        paypalSubscriptionId: paypalSubId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      sendSuccessEmail(
        userData!.email || '',
        userData!.displayName || 'Creator',
        planData!.name as string,
        subscriptionId,
        subData.billing_info?.last_payment?.amount?.value || 0,
        'USD'
      );

      return {
        status: 'PAID',
        orderId: subscriptionId,
        planName: planData!.name,
        amount: subData.billing_info?.last_payment?.amount?.value || 0,
        currency: 'USD',
        type: 'subscription'
      };
    }

    return { status: subData.status, message: "PayPal subscription not active" };
  }

  static async cancelPaypalSubscription(paypalSubId: string, userId: string) {
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");

    const configSnap = await firebase.db.collection("configs").doc("payment").get();
    const config = configSnap.exists ? configSnap.data() : null;

    const clientId = config?.paypal?.clientId || process.env.VITE_PAYPAL_CLIENT_ID;
    const clientSecret = config?.paypal?.clientSecret || process.env.PAYPAL_CLIENT_SECRET;
    const environment = config?.paypal?.environment || 'sandbox';
    const baseUrl = environment === 'production'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    const token = await SubscriptionService.getPaypalToken(baseUrl, clientId!, clientSecret!);

    await fetch(`${baseUrl}/v1/billing/subscriptions/${paypalSubId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ reason: 'User requested cancellation' })
    });

    const ppUserSnap = await firebase.db.collection("users").doc(userId).get();
    await firebase.db.collection("users").doc(userId).update({
      cancelAtPeriodEnd: true,
      autoPayEnabled: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    triggerFlow(firebase.db, 'subscription_cancelled', userId, {
      plan: ppUserSnap.exists ? (ppUserSnap.data()?.activePlanId || '') : '',
    }).catch(() => {});

    return { success: true };
  }

  static async handlePaypalWebhook(payload: any) {
    const firebase = await initFirebase();
    if (!firebase) return { received: true };

    const eventType = payload.event_type;
    const resource = payload.resource;

    if (eventType === 'BILLING.SUBSCRIPTION.ACTIVATED' || eventType === 'PAYMENT.SALE.COMPLETED') {
      const paypalSubId = resource.billing_agreement_id || resource.id;
      if (!paypalSubId) return { received: true };

      const paymentId = resource.id;
      const paymentRef = firebase.db.collection("subscription_payments").doc(paymentId);
      if ((await paymentRef.get()).exists) return { already: true };

      const usersSnap = await firebase.db.collection("users")
        .where('paypalSubscriptionId', '==', paypalSubId)
        .limit(1).get();

      if (!usersSnap.empty) {
        const userDoc = usersSnap.docs[0];
        const userData = userDoc.data();

        const expiryDate = userData.currentPeriodEnd?.toDate
          ? new Date(userData.currentPeriodEnd.toDate())
          : new Date();

        if (userData.billingCycle === 'yearly') expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        else expiryDate.setMonth(expiryDate.getMonth() + 1);

        await userDoc.ref.update({
          subscriptionStatus: 'pro',
          currentPeriodEnd: admin.firestore.Timestamp.fromDate(expiryDate),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await paymentRef.set({
          paypalSubscriptionId: paypalSubId,
          userId: userDoc.id,
          amount: resource.amount?.total || resource.amount?.value || 0,
          currency: resource.amount?.currency || 'USD',
          gateway: 'paypal',
          type: 'renewal',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        triggerFlow(firebase.db, 'subscription_renewed', userDoc.id, {
          plan: userData.activePlanId || '', amount: String(resource.amount?.total || 0), currency: resource.amount?.currency || 'USD'
        }).catch(err => console.error('[Automation] PayPal renewal trigger failed:', err.message));
      }
    }

    if (eventType === 'BILLING.SUBSCRIPTION.CANCELLED' || eventType === 'BILLING.SUBSCRIPTION.EXPIRED') {
      const paypalSubId = resource.id;
      const usersSnap = await firebase.db.collection("users")
        .where('paypalSubscriptionId', '==', paypalSubId)
        .limit(1).get();

      if (!usersSnap.empty) {
        const userDoc = usersSnap.docs[0];
        await userDoc.ref.update({
          cancelAtPeriodEnd: true,
          autoPayEnabled: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        triggerFlow(firebase.db, 'subscription_cancelled', userDoc.id, {
          plan: userDoc.data().activePlanId || '',
        }).catch(() => {});
      }
    }

    return { received: true };
  }
}
