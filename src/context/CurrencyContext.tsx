import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrencyInfo, Currency, LocationInfo, getExchangeRate } from '../utils/currencyUtils';

interface CurrencyContextType {
  currency: Currency;
  symbol: string;
  countryCode: string;
  exchangeRate: number;
  setCurrency: (currency: Currency) => void;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locInfo, setLocInfo] = useState<LocationInfo>({ country_code: 'US', currency: 'USD', symbol: '$' });
  const [exchangeRate, setExchangeRate] = useState<number>(83.5);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial load from IP detection or localStorage
    const savedCurrency = localStorage.getItem('userCurrency') as Currency;
    
    async function initCurrency() {
      try {
        const [info, rate] = await Promise.all([
          getCurrencyInfo(),
          getExchangeRate()
        ]);
        
        setExchangeRate(rate);
        
        if (savedCurrency) {
          setLocInfo({
            ...info,
            currency: savedCurrency,
            symbol: savedCurrency === 'INR' ? '₹' : '$'
          });
        } else {
          setLocInfo(info);
        }
      } catch (err) {
        console.error("Failed to initialize currency:", err);
      } finally {
        setIsLoading(false);
      }
    }

    initCurrency();
  }, []);

  const setCurrency = (newCurrency: Currency) => {
    setLocInfo(prev => ({
      ...prev,
      currency: newCurrency,
      symbol: newCurrency === 'INR' ? '₹' : '$'
    }));
    localStorage.setItem('userCurrency', newCurrency);
  };

  return (
    <CurrencyContext.Provider value={{ 
      currency: locInfo.currency, 
      symbol: locInfo.symbol, 
      countryCode: locInfo.country_code,
      exchangeRate,
      setCurrency,
      isLoading 
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
