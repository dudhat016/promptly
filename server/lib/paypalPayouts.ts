const PAYPAL_BASE = process.env.PAYPAL_ENV === 'sandbox'
  ? 'https://api.sandbox.paypal.com'
  : 'https://api.paypal.com';

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret   = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error('PayPal credentials not configured');

  const credentials = Buffer.from(`${clientId}:${secret}`).toString('base64');
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const data = await res.json() as any;
  return data.access_token;
}

export interface PayPalPayoutItem {
  payoutId: string;
  recipientEmail: string;
  amount: number;
  currency?: string;
  note?: string;
}

export interface PayPalPayoutResult {
  success: boolean;
  batchId?: string;
  status?: string;
  error?: string;
}

export async function sendPayPalPayout(item: PayPalPayoutItem): Promise<PayPalPayoutResult> {
  try {
    const token = await getAccessToken();

    const body = {
      sender_batch_header: {
        sender_batch_id: `promptly_${item.payoutId}_${Date.now()}`,
        email_subject:   'Your Promptly Affiliate Payout',
        email_message:   item.note || 'Your affiliate commission has been processed.',
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: {
            value:    item.amount.toFixed(2),
            currency: item.currency || 'USD',
          },
          note:           item.note || 'Affiliate commission from Promptly',
          sender_item_id: item.payoutId,
          receiver:       item.recipientEmail,
        },
      ],
    };

    const res = await fetch(`${PAYPAL_BASE}/v1/payments/payouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json() as any;
    if (!res.ok) {
      return { success: false, error: data.message || `PayPal error ${res.status}` };
    }

    return {
      success: true,
      batchId: data.batch_header?.payout_batch_id,
      status:  data.batch_header?.batch_status,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
