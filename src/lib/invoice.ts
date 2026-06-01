import jsPDF from 'jspdf';

export interface InvoiceData {
  orderId: string;
  date: string;
  planName: string;
  billingCycle?: string;
  buyerName?: string;
  buyerEmail?: string;
  productPrice: number;
  couponDiscount?: number;
  couponCode?: string;
  taxAmount: number;
  taxRate: number;
  buyerTotal: number;
  currency?: string;
  gateway?: string;
}

function fmt(n: number) {
  return `$${n.toFixed(2)}`;
}

export function generateInvoicePDF(data: InvoiceData): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const currency = data.currency || 'USD';

  // ── Brand header ──────────────────────────────────────────────────────────
  doc.setFillColor(99, 91, 255);
  doc.rect(0, 0, W, 72, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22).setFont('helvetica', 'bold');
  doc.text('Promptly', 40, 44);

  doc.setFontSize(10).setFont('helvetica', 'normal');
  doc.text('AI Prompt Marketplace', 40, 60);

  doc.setFontSize(11).setFont('helvetica', 'bold');
  doc.text('INVOICE', W - 40, 44, { align: 'right' });
  doc.setFont('helvetica', 'normal').setFontSize(9);
  doc.text(`#${data.orderId}`, W - 40, 58, { align: 'right' });

  // ── Meta row ──────────────────────────────────────────────────────────────
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9).setFont('helvetica', 'normal');
  let y = 104;

  doc.text('DATE', 40, y);
  doc.text('PLAN', 180, y);
  doc.text('BILLING', 340, y);
  doc.text('PAYMENT', 460, y);

  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold').setFontSize(10);
  doc.text(data.date, 40, y + 16);
  doc.text(data.planName, 180, y + 16);
  doc.text(data.billingCycle || 'One-time', 340, y + 16);
  doc.text((data.gateway || 'Stripe').charAt(0).toUpperCase() + (data.gateway || 'Stripe').slice(1), 460, y + 16);

  // ── Divider ───────────────────────────────────────────────────────────────
  y += 44;
  doc.setDrawColor(220, 220, 220);
  doc.line(40, y, W - 40, y);

  // ── Billed to ─────────────────────────────────────────────────────────────
  if (data.buyerName || data.buyerEmail) {
    y += 28;
    doc.setTextColor(100, 100, 100).setFont('helvetica', 'normal').setFontSize(9);
    doc.text('BILLED TO', 40, y);
    y += 16;
    doc.setTextColor(30, 30, 30).setFont('helvetica', 'bold').setFontSize(10);
    if (data.buyerName) { doc.text(data.buyerName, 40, y); y += 15; }
    doc.setFont('helvetica', 'normal');
    if (data.buyerEmail) { doc.text(data.buyerEmail, 40, y); y += 15; }
    y += 10;
    doc.setDrawColor(220, 220, 220);
    doc.line(40, y, W - 40, y);
  }

  // ── Line items ────────────────────────────────────────────────────────────
  y += 28;
  doc.setFillColor(248, 248, 252);
  doc.rect(40, y - 14, W - 80, 24, 'F');
  doc.setTextColor(80, 80, 80).setFont('helvetica', 'bold').setFontSize(9);
  doc.text('DESCRIPTION', 52, y);
  doc.text('AMOUNT', W - 52, y, { align: 'right' });

  const addRow = (label: string, value: string, bold = false, color?: [number, number, number]) => {
    y += 30;
    doc.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(10);
    doc.setTextColor(...(color ?? ([30, 30, 30] as [number, number, number])));
    doc.text(label, 52, y);
    doc.text(value, W - 52, y, { align: 'right' });
  };

  addRow(`${data.planName} Subscription`, fmt(data.productPrice));

  if (data.couponDiscount && data.couponDiscount > 0) {
    const label = data.couponCode ? `Coupon (${data.couponCode})` : 'Coupon discount';
    addRow(label, `- ${fmt(data.couponDiscount)}`, false, [22, 163, 74]);
  }

  if (data.taxAmount > 0) {
    addRow(`Tax (${data.taxRate}%)`, `+ ${fmt(data.taxAmount)}`, false, [100, 100, 100]);
  }

  // ── Total ─────────────────────────────────────────────────────────────────
  y += 20;
  doc.setDrawColor(99, 91, 255);
  doc.setLineWidth(1.5);
  doc.line(40, y, W - 40, y);

  y += 24;
  doc.setFont('helvetica', 'bold').setFontSize(13);
  doc.setTextColor(30, 30, 30);
  doc.text('Total Charged', 52, y);
  doc.setTextColor(99, 91, 255);
  doc.text(`${fmt(data.buyerTotal)} ${currency}`, W - 52, y, { align: 'right' });

  // ── Note ──────────────────────────────────────────────────────────────────
  y += 50;
  doc.setDrawColor(220, 220, 220).setLineWidth(0.5);
  doc.line(40, y, W - 40, y);
  y += 20;
  doc.setTextColor(150, 150, 150).setFont('helvetica', 'normal').setFontSize(8);
  doc.text('Thank you for your purchase. This is a valid receipt for your records.', 40, y);
  y += 14;
  doc.text('For support: support@promptly.ai', 40, y);

  // ── Save ──────────────────────────────────────────────────────────────────
  doc.save(`invoice-${data.orderId}.pdf`);
}
