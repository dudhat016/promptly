import { useState, useEffect } from 'react';

// Common currency symbols
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
};

// Mock exchange rates (In production, you'd fetch these from an API)
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  INR: 83.50,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
};

export function useCurrency() {
  const [currency, setCurrency] = useState('USD');
  const [symbol, setSymbol] = useState('$');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function detectCurrency() {
      try {
        const res = await fetch('/api/location');
        const data = await res.json();
        if (data.localCurrency) {
          setCurrency(data.localCurrency);
          setSymbol(CURRENCY_SYMBOLS[data.localCurrency] || data.localCurrency);
        }
      } catch (err) {
        console.error("Currency detection failed:", err);
      } finally {
        setLoading(false);
      }
    }
    detectCurrency();
  }, []);

  const convertPrice = (usdAmount: number) => {
    const rate = EXCHANGE_RATES[currency] || 1;
    return (usdAmount * rate).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return { currency, symbol, convertPrice, loading };
}
