export interface OrderBreakdown {
  productPrice: number;
  couponDiscount: number;
  discountedPrice: number;
  taxRate: number;
  taxAmount: number;
  buyerTotal: number;
  gatewayFeePercent: number;
  gatewayFlatFee: number;
  gatewayFee: number;
  netAfterGateway: number;
  netRevenue: number;
  commissionRate: number;
  platformFeePercent: number;
  commissionAmount: number;
  platformFeeAmount: number;
  affiliatePayout: number;
  adminKeeps: number;
  hasAffiliate: boolean;
}

export function calculateOrderBreakdown(params: {
  productPrice: number;
  couponDiscount?: number;
  taxRate?: number;
  gatewayFeePercent?: number;
  gatewayFlatFee?: number;
  commissionRate?: number;
  platformFeePercent?: number;
  hasAffiliate?: boolean;
}): OrderBreakdown {
  const taxRate            = params.taxRate            ?? 0;
  const gatewayFeePercent  = params.gatewayFeePercent  ?? 2.9;
  const gatewayFlatFee     = params.gatewayFlatFee     ?? 0.30;
  const commissionRate     = params.commissionRate     ?? 0;
  const platformFeePercent = params.platformFeePercent ?? 0;
  const hasAffiliate       = params.hasAffiliate       ?? commissionRate > 0;
  const couponDiscount     = params.couponDiscount     ?? 0;

  const r = (n: number) => parseFloat(n.toFixed(4));

  const discountedPrice  = r(Math.max(0, params.productPrice - couponDiscount));
  const taxAmount        = r(discountedPrice * taxRate / 100);
  const buyerTotal       = r(discountedPrice + taxAmount);
  const gatewayFee       = r(buyerTotal * gatewayFeePercent / 100 + gatewayFlatFee);
  const netAfterGateway  = r(buyerTotal - gatewayFee);
  const netRevenue       = r(netAfterGateway - taxAmount);

  const commissionAmount  = hasAffiliate ? r(netRevenue * commissionRate / 100) : 0;
  const platformFeeAmount = r(commissionAmount * platformFeePercent / 100);
  const affiliatePayout   = r(Math.max(0, commissionAmount - platformFeeAmount));
  const adminKeeps        = r(netRevenue - affiliatePayout);

  return {
    productPrice:      r(params.productPrice),
    couponDiscount:    r(couponDiscount),
    discountedPrice,
    taxRate,
    taxAmount,
    buyerTotal,
    gatewayFeePercent,
    gatewayFlatFee,
    gatewayFee,
    netAfterGateway,
    netRevenue,
    commissionRate:    hasAffiliate ? commissionRate : 0,
    platformFeePercent,
    commissionAmount,
    platformFeeAmount,
    affiliatePayout,
    adminKeeps,
    hasAffiliate,
  };
}
