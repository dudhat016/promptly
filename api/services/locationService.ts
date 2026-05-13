import { getFirestore } from "firebase-admin/firestore";

export class LocationService {
  /**
   * Detects user location and currency based on IP
   */
  static async detectLocation() {
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const data: any = await response.json();
        return {
          ...data,
          country: data.country_code,
          localCurrency: data.currency || "USD"
        };
      }
      throw new Error(`Primary Location API failed: ${response.status}`);
    } catch (err) {
      console.warn("⚠️ [Location Service] Primary API failed, trying fallback...");
      try {
        const fbResponse = await fetch('http://ip-api.com/json/');
        if (fbResponse.ok) {
          const fbData: any = await fbResponse.json();
          return {
            ...fbData,
            country: fbData.countryCode,
            city: fbData.city,
            localCurrency: fbData.currency || "USD",
            ip: fbData.query
          };
        }
      } catch (fbErr) {
        console.error("❌ [Location Service] All location APIs failed.");
      }
      
      return {
        country: "US",
        localCurrency: "USD",
        fallback: true
      };
    }
  }
}
