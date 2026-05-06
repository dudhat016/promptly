export type Currency = 'INR' | 'USD';

export interface LocationInfo {
  country_code: string;
  currency: Currency;
  symbol: string;
}

export const getCurrencyInfo = async (): Promise<LocationInfo> => {
  try {
    const response = await fetch('/api/location');
    const data = await response.json();
    
    const isIndia = data.country === 'IN';
    
    return {
      country_code: data.country || 'US',
      currency: isIndia ? 'INR' : 'USD',
      symbol: isIndia ? '₹' : '$'
    };
  } catch (err) {
    console.error("Location detection failed:", err);
    // Fallback to USD
    return {
      country_code: 'US',
      currency: 'USD',
      symbol: '$'
    };
  }
};

export const getExchangeRate = async (): Promise<number> => {
  const APIS = [
    'https://open.er-api.com/v6/latest/USD',
    'https://api.exchangerate-api.com/v4/latest/USD'
  ];

  for (const url of APIS) {
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && data.rates && data.rates.INR) {
        console.log(`🌍 [Currency API] Rate Synchronized via ${new URL(url).hostname}: 1 USD = ${data.rates.INR} INR`);
        return data.rates.INR;
      }
    } catch (err) {
      console.warn(`⚠️ [Currency API] ${new URL(url).hostname} failed, trying next...`);
    }
  }

  console.error("❌ [Currency API] All exchange rate APIs failed. Using hardcoded fallback.");
  return 83.50; // Final fallback
};

export const formatPrice = (amount: number, currency: Currency) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0
  }).format(amount);
};
