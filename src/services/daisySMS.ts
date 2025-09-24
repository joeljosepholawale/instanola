// Complete DaisySMS API service - Static hosting with CORS proxy
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../lib/firebase';

export class DaisySMSService {
  private apiKey: string;
  private markupPercentage = 30; // Default 30% markup

  constructor(apiKey: string) {
    this.apiKey = apiKey; // Store placeholder key since we use Firebase proxy
  }

  static async createWithStoredKey(): Promise<DaisySMSService> {
    try {
      // SECURITY: We no longer load API keys client-side
      // All API calls now go through secure Firebase function proxy
      console.log('DaisySMS service initialized with Firebase function proxy (secure mode)');
      
      // Use placeholder API key since all calls go through secure proxy
      const apiKey = 'secure_firebase_proxy_mode';
      
      const service = new DaisySMSService(apiKey);
      
      // Load markup percentage from config
      try {
        const markupDoc = await getDoc(doc(db, 'config', 'pricing'));
        if (markupDoc.exists()) {
          const markupData = markupDoc.data();
          const markup = markupData.markupPercentage;
          if (typeof markup === 'number' && markup >= 0 && markup <= 200) {
            service.markupPercentage = markup;
            console.log('Loaded markup percentage from config:', markup);
          }
        }
      } catch (error) {
        console.warn('Failed to load markup config, using default 30%');
      }
      
      // Force reload of pricing configuration to ensure latest settings
      try {
        const customPricingDoc = await getDoc(doc(db, 'config', 'custom_pricing'));
        if (customPricingDoc.exists()) {
          console.log('Custom pricing configuration loaded successfully');
        }
      } catch (error) {
        console.warn('Custom pricing not available');
      }
      
      return service;
    } catch (error) {
      console.error('Error creating DaisySMS service:', error);
      throw new Error('Failed to initialize DaisySMS service');
    }
  }

  // Helper function to build DaisySMS options from user selections
  static buildDaisyOptions(options: any): string {
    // Add null check to prevent undefined errors
    if (!options) {
      return '';
    }
    
    const params = [];
    
    if (options.areas && typeof options.areas === 'string' && options.areas.trim()) {
      params.push(`areas=${encodeURIComponent(options.areas.trim())}`);
    }
    
    if (options.carriers && typeof options.carriers === 'string' && options.carriers !== 'any') {
      params.push(`carriers=${encodeURIComponent(options.carriers)}`);
    }
    
    if (options.phone && typeof options.phone === 'string' && options.phone.trim()) {
      params.push(`phone=${encodeURIComponent(options.phone.trim())}`);
    }
    
    if (options.duration && options.durationType === 'long-term' && typeof options.duration === 'string') {
      params.push(`duration=${encodeURIComponent(options.duration)}`);
    }
    
    if (options.renewable === true && options.durationType === 'long-term') {
      params.push('renewable=1');
    }
    
    if (options.autoRenew === true && options.durationType === 'long-term') {
      params.push('auto_renew=1');
    }
    
    return params.length > 0 ? '&' + params.join('&') : '';
  }

  // Apply markup to entire pricing structure
  private async applyMarkupToPricing(pricingData: any): Promise<any> {
    const pricingWithMarkup = { ...pricingData };
    
    // Load custom pricing overrides
    let customPricing = {};
    try {
      const customPricingDoc = await getDoc(doc(db, 'config', 'custom_pricing'));
      if (customPricingDoc.exists()) {
        customPricing = customPricingDoc.data();
        console.log('Loaded custom pricing overrides:', Object.keys(customPricing).length, 'items');
      }
    } catch (error) {
      console.warn('Could not load custom pricing:', error);
    }
    
    // Also load current markup percentage to ensure consistency
    try {
      const pricingDoc = await getDoc(doc(db, 'config', 'pricing'));
      if (pricingDoc.exists()) {
        const pricingConfig = pricingDoc.data();
        const configMarkup = pricingConfig.markupPercentage;
        if (typeof configMarkup === 'number' && configMarkup >= 0 && configMarkup <= 200) {
          this.markupPercentage = configMarkup;
          console.log('Updated markup percentage from config:', configMarkup);
        }
      }
    } catch (error) {
      console.warn('Could not load markup config:', error);
    }
    
    Object.keys(pricingWithMarkup).forEach(countryCode => {
      const countryData = pricingWithMarkup[countryCode];
      if (countryData && typeof countryData === 'object') {
        Object.keys(countryData).forEach(serviceCode => {
          const serviceData = countryData[serviceCode];
          if (serviceData && serviceData.cost) {
            const originalCost = parseFloat(serviceData.cost);
            const customKey = `${countryCode}_${serviceCode}`;
            const customPrice = (customPricing as any)[customKey];
            
            let finalPrice: number;
            let isCustom = false;
            
            if (customPrice && !isNaN(parseFloat(customPrice))) {
              finalPrice = parseFloat(customPrice);
              isCustom = true;
              console.log(`Using custom price for ${countryCode}_${serviceCode}: $${finalPrice}`);
            } else {
              // Apply markup correctly - ensure we're using the current markup percentage
              finalPrice = originalCost * (1 + this.markupPercentage / 100);
              finalPrice = Math.round(finalPrice * 100) / 100;
              console.log(`Using markup price for ${countryCode}_${serviceCode}: $${finalPrice} (${this.markupPercentage}% markup)`);
            }
            
            // Update the pricing data with markup
            pricingWithMarkup[countryCode][serviceCode] = {
              ...serviceData,
              cost: finalPrice.toFixed(2),
              originalCost: originalCost.toFixed(2),
              markupPrice: (originalCost * (1 + this.markupPercentage / 100)).toFixed(2),
              customPrice: isCustom ? finalPrice.toFixed(2) : undefined,
              isCustom: isCustom,
              profit: Math.max(0, finalPrice - originalCost).toFixed(2),
              markupPercentage: this.markupPercentage
            };
          }
        });
      }
    });
    
    return pricingWithMarkup;
  }

  // Make API call using secure Firebase function proxy ONLY
  private async makeApiCall(params: Record<string, string>): Promise<string> {
    // Validate and sanitize parameters
    const sanitizedParams = this.sanitizeParams(params);
    
    try {
      console.log('Making secure DaisySMS API call through Firebase function...');
      
      // Use Firebase function proxy for security - ONLY method allowed
      const functions = getFunctions();
      const daisySmsProxy = httpsCallable(functions, 'daisySmsProxy');
      
      // Extract action and other params (don't pass api_key, it's handled server-side)
      const { api_key, action, ...otherParams } = sanitizedParams;
      
      const result = await daisySmsProxy({
        action: action,
        params: otherParams
      });
      
      const data = result.data as any;
      if (data.success && data.result) {
        console.log('Secure Firebase function call successful');
        return data.result;
      } else {
        const errorMsg = data.error || 'Invalid response from secure proxy';
        throw new Error(errorMsg);
      }
      
    } catch (error) {
      console.error('Secure Firebase function failed:', error);
      
      // Check if it's an authentication error
      if (error instanceof Error && error.message.includes('unauthenticated')) {
        throw new Error('Please log in to access DaisySMS services');
      }
      
      // Check if API key is not configured
      if (error instanceof Error && error.message.includes('not configured')) {
        throw new Error('DaisySMS API key not configured. Please contact administrator.');
      }
      
      // Re-throw the error without fallback
      throw new Error(`DaisySMS service unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Sanitize API parameters to prevent injection
  private sanitizeParams(params: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const allowedParams = [
      'api_key', 'action', 'service', 'country', 'max_price', 'id', 'status', 'text',
      'areas', 'carriers', 'number', 'duration', 'renewable', 'auto_renew', 'activationId'
    ];
    
    for (const [key, value] of Object.entries(params)) {
      if (allowedParams.includes(key) && typeof value === 'string') {
        // Remove potential script injections and limit length
        sanitized[key] = value.replace(/[<>'"]/g, '').substring(0, 100);
      }
    }
    
    return sanitized;
  }

  // Get all available services
  async getAllServices(): Promise<any[]> {
    try {
      console.log('Getting all available services from DaisySMS...');
      
      // Try to get services with full names using getPricesVerification
      let pricingData;
      try {
        const response = await this.makeApiCall({
          api_key: this.apiKey,
          action: 'getPricesVerification'
        });

        if (response && response !== 'NO_CONNECTION' && response !== 'BAD_KEY' && response !== 'WRONG_API_KEY' && !response.includes('<?php') && !response.includes('<!DOCTYPE')) {
          pricingData = typeof response === 'string' ? JSON.parse(response) : response;
          console.log('Got services with full names from getPricesVerification');
        } else {
          // Fallback to getPrices if getPricesVerification fails
          const fallbackResponse = await this.makeApiCall({
            api_key: this.apiKey,
            action: 'getPrices'
          });
          
          if (fallbackResponse && fallbackResponse !== 'NO_CONNECTION' && fallbackResponse !== 'BAD_KEY' && fallbackResponse !== 'WRONG_API_KEY' && !fallbackResponse.includes('<?php') && !fallbackResponse.includes('<!DOCTYPE')) {
            pricingData = typeof fallbackResponse === 'string' ? JSON.parse(fallbackResponse) : fallbackResponse;
            console.log('Got pricing data from getPrices fallback');
          } else {
            throw new Error('Failed to get live pricing');
          }
        }
      } catch (error) {
        console.log('Live pricing failed, using fallback for services');
        // Use comprehensive fallback data
        pricingData = this.getStaticPricingData();
      }
      
      if (!pricingData || typeof pricingData !== 'object') {
        console.warn('No pricing data available, using default services');
        // Return default services if no pricing data
        return [
          { code: 'wa', name: 'WhatsApp' },
          { code: 'tg', name: 'Telegram' },
          { code: 'ig', name: 'Instagram' },
          { code: 'fb', name: 'Facebook' },
          { code: 'tw', name: 'Twitter' },
          { code: 'ds', name: 'Discord' },
          { code: 'go', name: 'Google' },
          { code: 'vi', name: 'Viber' },
          { code: 'ot', name: 'Other' }
        ];
      }
      
      // Extract all unique services from all countries
      const allServiceCodes = new Set<string>();
      const serviceNames: { [key: string]: string } = {};
      
      // Check if this is getPricesVerification format (service => country => data)
      const isVerificationFormat = this.isPricesVerificationFormat(pricingData);
      
      if (isVerificationFormat) {
        // Format: service => country => data
        Object.entries(pricingData).forEach(([serviceCode, countryData]: [string, any]) => {
          if (countryData && typeof countryData === 'object') {
            allServiceCodes.add(serviceCode);
            
            // Try to extract full service name from the data
            const firstCountryData = Object.values(countryData)[0] as any;
            if (firstCountryData && typeof firstCountryData === 'object') {
              // Look for service name in various possible fields
              const fullName = firstCountryData.name || 
                              firstCountryData.title || 
                              firstCountryData.service || 
                              firstCountryData.serviceName ||
                              this.getServiceName(serviceCode);
              serviceNames[serviceCode] = fullName;
            } else {
              serviceNames[serviceCode] = this.getServiceName(serviceCode);
            }
          }
        });
      } else {
        // Format: country => service => data (standard getPrices)
        Object.values(pricingData).forEach((countryData: any) => {
          if (countryData && typeof countryData === 'object') {
            Object.entries(countryData).forEach(([serviceCode, serviceData]: [string, any]) => {
              allServiceCodes.add(serviceCode);
              
              // Try to extract full service name from the data
              if (serviceData && typeof serviceData === 'object') {
                const fullName = serviceData.name || 
                               serviceData.title || 
                               serviceData.service || 
                               serviceData.serviceName ||
                               this.getServiceName(serviceCode);
                serviceNames[serviceCode] = fullName;
              } else {
                serviceNames[serviceCode] = this.getServiceName(serviceCode);
              }
            });
          }
        });
      }
      
      // Convert to array format
      const services = Array.from(allServiceCodes).map(code => ({
        code: code,
        name: serviceNames[code] || this.getServiceName(code)
      }));
      
      console.log(`Successfully extracted ${services.length} services from DaisySMS API`);
      return services;
    } catch (error) {
      console.error('DaisySMS getAllServices error:', error);
      // Return fallback services instead of throwing error
      console.log('Returning fallback services due to API error');
      return [
        { code: 'wa', name: 'WhatsApp' },
        { code: 'tg', name: 'Telegram' },
        { code: 'ig', name: 'Instagram' },
        { code: 'fb', name: 'Facebook' },
        { code: 'tw', name: 'Twitter' },
        { code: 'ds', name: 'Discord' },
        { code: 'go', name: 'Google' },
        { code: 'vi', name: 'Viber' },
        { code: 'ot', name: 'Other' }
      ];
    }
  }

  // Check if data is in getPricesVerification format
  private isPricesVerificationFormat(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    
    // In getPricesVerification format, top-level keys are service codes
    // and values are objects with country codes as keys
    const firstKey = Object.keys(data)[0];
    const firstValue = data[firstKey];
    
    if (!firstValue || typeof firstValue !== 'object') return false;
    
    // Check if the first value has country codes as keys (numbers)
    const subKeys = Object.keys(firstValue);
    return subKeys.some(key => /^\d+$/.test(key)); // Contains numeric country codes
  }

  // Get pricing with comprehensive fallback
  async getPrices(): Promise<any> {
    try {
      console.log('Getting DaisySMS prices with markup:', this.markupPercentage);
      
      const response = await this.makeApiCall({
        api_key: this.apiKey,
        action: 'getPrices'
      });

      if (response && response !== 'NO_CONNECTION' && response !== 'BAD_KEY' && response !== 'WRONG_API_KEY' && !response.includes('<?php') && !response.includes('<!DOCTYPE')) {
        const data = typeof response === 'string' ? JSON.parse(response) : response;
        
        // Validate that data is a valid object
        if (!data || typeof data !== 'object' || data === null) {
          throw new Error('Invalid pricing data received');
        }
        
        if (Object.keys(data).length > 0) {
          console.log('Successfully got live DaisySMS pricing');
          
          // Apply markup to all prices
          const pricingWithMarkup = await this.applyMarkupToPricing(data);
          return pricingWithMarkup;
        } else {
          throw new Error('Empty pricing data received');
        }
      }
      
      throw new Error('Failed to fetch live pricing from DaisySMS API');
    } catch (error) {
      console.error('DaisySMS API error:', error);
      throw error;
    }
  }

  // Comprehensive static pricing data
  private getStaticPricingData(): any {
    return {
      '0': { // United States
        'tg': { cost: '0.25', count: '50' },
        'wa': { cost: '0.30', count: '30' },
        'ig': { cost: '0.35', count: '20' },
        'fb': { cost: '0.28', count: '40' },
        'tw': { cost: '0.32', count: '25' },
        'ds': { cost: '0.27', count: '35' },
        'go': { cost: '0.30', count: '45' },
        'li': { cost: '0.40', count: '15' },
        'vi': { cost: '0.28', count: '25' },
        'sc': { cost: '0.33', count: '18' },
        'tt': { cost: '0.35', count: '22' },
        'nf': { cost: '0.45', count: '12' },
        'ya': { cost: '0.20', count: '25' },
        'ma': { cost: '0.15', count: '35' },
        'cl': { cost: '0.10', count: '10' },
        'ot': { cost: '0.10', count: '20' },
        'vk': { cost: '0.22', count: '30' },
        'ok': { cost: '0.24', count: '25' },
        'av': { cost: '0.26', count: '20' },
        'ub': { cost: '0.35', count: '15' },
        'am': { cost: '0.40', count: '12' },
        'ap': { cost: '0.45', count: '10' },
        'ms': { cost: '0.30', count: '18' },
        'ad': { cost: '0.38', count: '14' },
        'sp': { cost: '0.25', count: '22' },
        'yt': { cost: '0.20', count: '35' },
        'gh': { cost: '0.35', count: '16' },
        'dr': { cost: '0.30', count: '20' },
        'sk': { cost: '0.25', count: '25' },
        'zm': { cost: '0.30', count: '18' },
        'sl': { cost: '0.35', count: '15' },
        'rd': { cost: '0.20', count: '30' },
        'pt': { cost: '0.25', count: '20' },
        'tb': { cost: '0.22', count: '18' },
        'wp': { cost: '0.28', count: '25' },
        'sh': { cost: '0.35', count: '12' },
        'py': { cost: '0.40', count: '10' },
        'eb': { cost: '0.30', count: '15' },
        'et': { cost: '0.32', count: '14' },
        'ai': { cost: '0.45', count: '8' },
        'bf': { cost: '0.35', count: '12' },
        'ex': { cost: '0.38', count: '10' },
        'tr': { cost: '0.30', count: '15' },
        'zl': { cost: '0.40', count: '8' },
        'mt': { cost: '0.35', count: '12' },
        'td': { cost: '0.30', count: '18' },
        'bm': { cost: '0.32', count: '16' },
        'hg': { cost: '0.35', count: '14' },
        'gm': { cost: '0.28', count: '20' },
        'wc': { cost: '0.25', count: '25' },
        'ln': { cost: '0.30', count: '20' },
        'kk': { cost: '0.28', count: '22' },
        'qr': { cost: '0.15', count: '40' },
        'bt': { cost: '0.20', count: '30' },
        'mg': { cost: '0.25', count: '25' },
        'mw': { cost: '0.18', count: '35' },
        'jt': { cost: '0.30', count: '15' },
        'rc': { cost: '0.25', count: '20' },
        'el': { cost: '0.35', count: '12' },
        'sg': { cost: '0.40', count: '10' },
        'wk': { cost: '0.45', count: '8' },
        'th': { cost: '0.50', count: '6' },
        'br': { cost: '0.35', count: '10' },
        'ri': { cost: '0.40', count: '8' },
        'ss': { cost: '0.38', count: '9' },
        'st': { cost: '0.35', count: '11' },
        'kp': { cost: '0.42', count: '7' },
        'pr': { cost: '0.30', count: '15' },
        'tm': { cost: '0.32', count: '14' },
        'hm': { cost: '0.35', count: '12' },
        'sm': { cost: '0.38', count: '10' },
        'fm': { cost: '0.30', count: '16' },
        'gw': { cost: '0.10', count: '50' },
        '10m': { cost: '0.08', count: '60' },
        'mm': { cost: '0.12', count: '45' },
        'yp': { cost: '0.11', count: '48' },
        'gt': { cost: '0.13', count: '42' },
        'ml': { cost: '0.10', count: '50' },
        'em': { cost: '0.12', count: '45' },
        'mb': { cost: '0.35', count: '12' },
        'zp': { cost: '0.38', count: '10' },
        'cx': { cost: '0.45', count: '8' },
        'sv': { cost: '0.40', count: '9' },
        'lx': { cost: '0.42', count: '7' },
        'rx': { cost: '0.35', count: '11' }
      },
      '1': { // Russia
        'tg': { cost: '0.20', count: '100' },
        'wa': { cost: '0.25', count: '80' },
        'ig': { cost: '0.30', count: '60' },
        'fb': { cost: '0.23', count: '90' },
        'tw': { cost: '0.28', count: '70' },
        'ds': { cost: '0.22', count: '85' }
      },
      '44': { // United Kingdom
        'tg': { cost: '0.35', count: '25' },
        'wa': { cost: '0.40', count: '20' },
        'ig': { cost: '0.45', count: '15' },
        'fb': { cost: '0.38', count: '30' },
        'tw': { cost: '0.42', count: '18' },
        'ds': { cost: '0.37', count: '22' }
      },
      '49': { // Germany
        'tg': { cost: '0.33', count: '30' },
        'wa': { cost: '0.38', count: '25' },
        'ig': { cost: '0.43', count: '18' },
        'fb': { cost: '0.36', count: '35' },
        'tw': { cost: '0.40', count: '20' },
        'ds': { cost: '0.35', count: '28' }
      },
      '33': { // France
        'tg': { cost: '0.32', count: '28' },
        'wa': { cost: '0.37', count: '22' },
        'ig': { cost: '0.42', count: '16' },
        'fb': { cost: '0.35', count: '32' },
        'tw': { cost: '0.39', count: '19' },
        'ds': { cost: '0.34', count: '26' }
      }
    };
  }

  // Get balance with timeout and security
  async getBalance(): Promise<number> {
    try {
      console.log('Getting DaisySMS balance...');
      
      try {
        const response = await this.makeApiCall({
          api_key: this.apiKey,
          action: 'getBalance'
        });

        if (response && response.startsWith('ACCESS_BALANCE:') && !response.includes('<?php') && !response.includes('<!DOCTYPE')) {
          const balance = parseFloat(response.split(':')[1]);
          if (!isNaN(balance) && balance >= 0) {
            console.log('Got live DaisySMS balance:', balance);
            return balance;
          }
        }
      } catch (error) {
        console.log('Live balance check failed:', error);
      }
      
      // Return 0 to indicate API unavailable
      console.log('DaisySMS API unavailable, returning 0 balance');
      return 0;
    } catch (error) {
      console.error('Error getting balance:', error);
      return 0;
    }
  }

  // Get number - fully functional with Firebase integration
  async getNumber(
    service: string,
    country?: string,
    maxPrice?: number,
    userId?: string,
    options?: {
      areas?: string;
      carriers?: string;
      phone?: string;
      duration?: string;
      renewable?: boolean;
      autoRenew?: boolean;
      serviceName?: string; // Optional display name from UI
    }
  ): Promise<{ 
    number: string; 
    id: string; 
    daisyPrice: number; 
    userPrice: number;
    profit: number;
    isCustomPrice: boolean;
  }> {
    try {
      console.log('Getting number from DaisySMS...');
      
      // Load custom pricing to determine user price
      let customPricing = {};
      try {
        const customPricingDoc = await getDoc(doc(db, 'config', 'custom_pricing'));
        if (customPricingDoc.exists()) {
          customPricing = customPricingDoc.data();
        }
      } catch (error) {
        console.warn('Could not load custom pricing:', error);
      }
      
      // Load current markup percentage
      try {
        const pricingDoc = await getDoc(doc(db, 'config', 'pricing'));
        if (pricingDoc.exists()) {
          const pricingConfig = pricingDoc.data();
          const configMarkup = pricingConfig.markupPercentage;
          if (typeof configMarkup === 'number' && configMarkup >= 0 && configMarkup <= 200) {
            this.markupPercentage = configMarkup;
            console.log('Updated markup percentage for getNumber:', configMarkup);
          }
        }
      } catch (error) {
        console.warn('Could not load markup config for getNumber:', error);
      }
      
      const params: Record<string, string> = {
        api_key: this.apiKey,
        action: 'getNumber',
        service: service,
        areaCodes: options.areas,
        carriers: options.carriers,
        country: country || '0'
      };

      // Add DaisySMS options to API call
      if (options.areas) {
        params.append('areas', options.areas);
      }
      
      if (options.carriers) {
        params.append('carriers', options.carriers);
      }
      
      if (options.duration) {
        params.append('duration', options.duration);
      }
      
      if (options.renewable) {
        params.append('renewable', options.renewable);
      }
      
      if (options.auto_renew) {
        params.append('auto_renew', options.auto_renew);
      }
      
      if (options.max_price) {
        params.append('max_price', options.max_price.toString());
      }
      
      if (maxPrice && typeof maxPrice === 'number') params.max_price = maxPrice.toString();
      if (options?.duration) params.duration = options.duration;
      if (options?.areas) params.areas = options.areas;
      if (options?.carriers) params.carriers = options.carriers;
      if (options?.phone) params.number = options.phone; // Use 'number' parameter as per API docs
      if (options?.renewable) params.renewable = options.renewable ? '1' : '0'; // Use 1/0 as per API docs
      if (options?.autoRenew) params.auto_renew = options.autoRenew ? '1' : '0'; // Correct parameter name

      try {
        const response = await this.makeApiCall(params);
      
        if (response && response.startsWith('ACCESS_NUMBER:') && !response.includes('<?php') && !response.includes('<!DOCTYPE')) {
          const parts = response.split(':');
          const id = parts[1];
          const number = parts[2];
          
          if (!id || !number) {
            throw new Error('Invalid response format from DaisySMS');
          }
          
          // Use fallback price since API docs indicate price comes from X-Price header which CORS proxies may not pass
          const daisyPrice = parseFloat(parts[3] || '0.25');
          
          // Determine user price (custom or markup)
          const customKey = `${country || '0'}_${service}`;
          const customPrice = (customPricing as any)[customKey];
          let userPrice: number;
          let isCustomPrice = false;
          
          if (customPrice && !isNaN(parseFloat(customPrice))) {
            userPrice = parseFloat(customPrice);
            isCustomPrice = true;
            console.log(`Using custom price for rental ${customKey}: $${userPrice}`);
          } else {
            // Apply current markup percentage correctly
            userPrice = daisyPrice * (1 + this.markupPercentage / 100);
            userPrice = Math.round(userPrice * 100) / 100;
            console.log(`Using markup price for rental ${customKey}: $${userPrice} (${this.markupPercentage}% markup on $${daisyPrice})`);
          }
          
          const profit = Math.max(0, userPrice - daisyPrice);

          if (userId) {
            // Use maxPrice if provided (this is the exact price shown to user), otherwise use calculated userPrice
            const exactPriceToCharge = maxPrice || userPrice;
            console.log('Charging exact price:', exactPriceToCharge, 'DaisySMS cost:', daisyPrice, 'User price:', userPrice);
            
            try {
              console.log('🚀 Starting rental record creation with params:', {
                id,
                userId,
                number,
                service,
                country: country || '0',
                daisyPrice,
                userPrice,
                profit,
                isCustomPrice,
                exactPriceToCharge
              });
              
              await this.recordRental(id, userId, number, service, country || '0', daisyPrice, userPrice, profit, isCustomPrice, exactPriceToCharge, options, options?.serviceName);
              console.log('✅ Rental record creation completed successfully');
            } catch (recordError) {
              console.error('❌ CRITICAL: Rental record creation FAILED:', recordError);
              
              // Log additional context for debugging
              console.error('Failed rental context:', {
                rentalId: id,
                userId: userId,
                number: number,
                service: service,
                errorDetails: recordError instanceof Error ? {
                  message: recordError.message,
                  stack: recordError.stack,
                  name: recordError.name
                } : recordError
              });
              
              throw new Error(`Failed to create rental record: ${recordError instanceof Error ? recordError.message : 'Unknown error'}`);
            }
          }

          console.log('Got real number from DaisySMS:', { id, number, daisyPrice, userPrice: maxPrice || userPrice });
          return { id, number, daisyPrice, userPrice: maxPrice || userPrice, profit, isCustomPrice };
        }
        
        // Handle specific API error responses
        if (response === 'MAX_PRICE_EXCEEDED') {
          throw new Error('The cost exceeds your maximum price. Please increase your max price or try a different service.');
        } else if (response === 'NO_NUMBERS') {
          throw new Error('No numbers available for this service and country. Please try again later.');
        } else if (response === 'TOO_MANY_ACTIVE_RENTALS') {
          throw new Error('You have too many active rentals. Please cancel or wait for existing rentals to complete.');
        } else if (response === 'NO_MONEY') {
          throw new Error('Insufficient balance in your DaisySMS account.');
        } else if (response === 'BAD_KEY' || response === 'WRONG_API_KEY') {
          throw new Error('Invalid API key. Please check your configuration.');
        }
        
      } catch (apiError) {
        console.log('DaisySMS API call failed:', apiError);
        if (apiError instanceof Error) {
          throw apiError; // Re-throw specific API errors
        }
      }
      
      // Fallback for demo/testing - only in development
      if (process.env.NODE_ENV === 'production') {
        throw new Error('DaisySMS API is not available. Please try again later.');
      }
      
      console.log('Using fallback number generation (development only)');
      const mockId = `demo_${Date.now()}`;
      const mockNumber = this.generateMockNumber(country || '0');
      const daisyPrice = 0.25;
      
      // Apply same pricing logic for fallback
      const customKey = `${country || '0'}_${service}`;
      const customPrice = (customPricing as any)[customKey];
      let userPrice: number;
      let isCustomPrice = false;
      
      if (customPrice && !isNaN(parseFloat(customPrice))) {
        userPrice = parseFloat(customPrice);
        isCustomPrice = true;
        console.log(`Using custom price for fallback rental ${customKey}: $${userPrice}`);
      } else {
        // Apply current markup percentage correctly
        userPrice = daisyPrice * (1 + this.markupPercentage / 100);
        userPrice = Math.round(userPrice * 100) / 100;
        console.log(`Using markup price for fallback rental ${customKey}: $${userPrice} (${this.markupPercentage}% markup on $${daisyPrice})`);
      }
      
      const profit = Math.max(0, userPrice - daisyPrice);
      
      if (userId) {
        // Use maxPrice if provided (this is the exact price shown to user), otherwise use calculated userPrice
        const exactPriceToCharge = maxPrice || userPrice;
        console.log('Charging exact price (fallback):', exactPriceToCharge, 'DaisySMS cost:', daisyPrice, 'User price:', userPrice);
        
        try {
          await this.recordRental(mockId, userId, mockNumber, service, country || '0', daisyPrice, userPrice, profit, isCustomPrice, exactPriceToCharge, options, options?.serviceName);
          console.log('✅ Fallback rental record creation completed successfully');
        } catch (recordError) {
          console.error('❌ CRITICAL: Fallback rental record creation FAILED:', recordError);
          throw new Error(`Failed to create fallback rental record: ${recordError instanceof Error ? recordError.message : 'Unknown error'}`);
        }
      }
      
      return { id: mockId, number: mockNumber, daisyPrice, userPrice: maxPrice || userPrice, profit, isCustomPrice };
    } catch (error) {
      console.error('Error getting number:', error);
      throw error;
    }
  }

  // Generate mock number for demo/testing
  private generateMockNumber(country: string): string {
    const countryPrefixes: { [key: string]: string } = {
      '0': '+1',
      '1': '+7',
      '44': '+44',
      '49': '+49',
      '33': '+33'
    };
    
    const prefix = countryPrefixes[country] || '+1';
    const randomDigits = Math.floor(Math.random() * 9000000000) + 1000000000;
    return `${prefix}${randomDigits}`;
  }
  // Get status - simulate SMS reception with realistic timing
  async getStatus(id: string, includeText: boolean = false): Promise<{ 
    status: string; 
    code?: string; 
    text?: string;
  }> {
    try {
      console.log('Getting status for rental:', id);
      
      // Try live API first
      try {
        const params: Record<string, string> = {
          api_key: this.apiKey,
          action: 'getStatus',
          id: id
        };
        
        // Request full text if needed
        if (includeText) {
          params.text = '1';
        }
        
        const response = await this.makeApiCall(params);
        
        if (response && response.startsWith('STATUS_OK:') && !response.includes('<?php') && !response.includes('<!DOCTYPE')) {
          const parts = response.split(':');
          const code = parts[1]; // DaisySMS returns code directly after STATUS_OK:
          
          if (code && code.length >= 4) { // Verify we have a valid code
            console.log('Got real SMS code from DaisySMS:', code);
            // Update rental in Firebase
            await updateDoc(doc(db, 'rentals', id), {
              status: 'completed',
              code: code,
              completedAt: new Date(),
              lastChecked: new Date()
            });

            return { 
              status: 'completed', 
              code: code,
              text: includeText ? `Your verification code is: ${code}` : undefined
            };
          }
        }
        
        // Check for other DaisySMS status responses
        if (response && (response === 'STATUS_WAIT_CODE' || response === 'STATUS_WAIT_RETRY')) {
          console.log('DaisySMS status: waiting for SMS');
          return { status: 'waiting' };
        }
        
        if (response && response.startsWith('STATUS_CANCEL')) {
          console.log('DaisySMS returned cancel status');
          return { status: 'cancelled' };
        }
        
        if (response === 'NO_ACTIVATION') {
          console.log('DaisySMS returned NO_ACTIVATION - rental not found');
          return { status: 'error' };
        }
      } catch (error) {
        console.log('Live status check failed:', error);
        // Don't fall back to simulation - return waiting status
        return { status: 'waiting' };
      }
      
      // If no response from DaisySMS, just return waiting
      return { status: 'waiting' };
    } catch (error) {
      console.error('Error getting status:', error);
      return { status: 'waiting' };
    }
  }

  // Cancel activation with refund processing
  async cancelActivation(id: string, userId?: string): Promise<boolean> {
    try {
      console.log('Cancelling activation:', id);
      
      // Try live API cancellation
      try {
        const response = await this.makeApiCall({
          api_key: this.apiKey,
          action: 'setStatus',
          id: id,
          status: '8' // Cancel status
        });
        
        if (response && response.startsWith('ACCESS_CANCEL')) {
          console.log('Live cancellation successful');
        } else if (response === 'ACCESS_READY') {
          console.log('DaisySMS cancellation failed: Rental missing or code already received');
        } else if (response === 'NO_ACTIVATION') {
          console.log('DaisySMS cancellation failed: Activation not found');
        } else {
          console.log('DaisySMS cancellation response:', response);
        }
      } catch (error) {
        console.log('Live cancellation failed, processing refund anyway:', error);
      }
      
      if (userId) {
        // Process refund - add money back to the correct wallet
        try {
          const rental = await getDoc(doc(db, 'rentals', id));
          if (rental.exists()) {
            const rentalData = rental.data();
            console.log('Rental data for refund:', rentalData);
            
            const refundAmount = rentalData.exactPriceCharged || rentalData.actualPrice || rentalData.userPrice || 0;
            const chargedCurrency = rentalData.chargedCurrency || 'USD';
            
            console.log('Refund calculation:', {
              refundAmount,
              chargedCurrency,
              originalChargedAmount: rentalData.chargedAmount
            });
            
            // Add money back to the exact same wallet and amount that was originally charged
            const updateData: any = {};
            
            if (chargedCurrency === 'USD') {
              updateData.walletBalance = increment(refundAmount);
              console.log('Refunding exact amount to USD wallet:', refundAmount);
            } else if (chargedCurrency === 'NGN') {
              // For NGN charges, the refundAmount should already be in NGN
              const ngnRefundAmount = rentalData.chargedAmount || (refundAmount * 1600);
              updateData.walletBalanceNGN = increment(ngnRefundAmount);
              console.log('Refunding exact amount to NGN wallet:', ngnRefundAmount);
            } else {
              // Fallback to USD
              updateData.walletBalance = increment(refundAmount);
              console.log('Fallback refund to USD wallet:', refundAmount);
            }

            await updateDoc(doc(db, 'users', userId), updateData);

            // Update rental status
            const actualRefundAmount = chargedCurrency === 'NGN' ? (rentalData.chargedAmount || (refundAmount * 1600)) : refundAmount;
            await updateDoc(doc(db, 'rentals', id), {
              status: 'cancelled',
              cancelledAt: new Date(),
              refundAmount: actualRefundAmount,
              refundedExactAmount: refundAmount, // Store the exact amount for audit
              lastChecked: new Date()
            });

            // Record refund transaction
            await setDoc(doc(db, 'transactions', `${userId}_refund_${Date.now()}`), {
              userId: userId,
              type: 'refund',
              amount: refundAmount, // Always store the exact refund amount
              amountUSD: chargedCurrency === 'USD' ? refundAmount : (refundAmount),
              amountNGN: chargedCurrency === 'NGN' ? actualRefundAmount : (refundAmount * 1600),
              description: `Refund for cancelled number: ${rentalData.number} - ${formatCurrency(refundAmount)}`,
              rentalId: id,
              exactRefundAmount: refundAmount,
              originalChargedAmount: actualRefundAmount,
              chargedCurrency: chargedCurrency,
              status: 'completed',
              createdAt: new Date()
            });

            const profit = Math.max(0, refundAmount - (rentalData.daisyPrice || 0));
            
            console.log('Refund completed successfully:', {
              refundAmount,
              chargedCurrency,
              profit
            });
          }
        } catch (error) {
          console.warn('Failed to process refund in Firebase:', error);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error cancelling activation:', error);
      return false;
    }
  }

  // Mark rental as done (status 6) - when you no longer need SMS
  async markAsDone(id: string): Promise<boolean> {
    try {
      console.log('Marking rental as done:', id);
      
      const response = await this.makeApiCall({
        api_key: this.apiKey,
        action: 'setStatus',
        id: id,
        status: '6' // Done status
      });
      
      if (response && response.startsWith('ACCESS_ACTIVATION')) {
        console.log('Successfully marked rental as done');
        return true;
      } else if (response === 'NO_ACTIVATION') {
        console.log('Rental not found when marking as done');
        return false;
      } else {
        console.log('Mark as done response:', response);
        return false;
      }
    } catch (error) {
      console.error('Error marking rental as done:', error);
      return false;
    }
  }

  // Get additional activation for same number
  async getExtraActivation(activationId: string): Promise<{ id?: string; number?: string; readyTime?: number } | null> {
    try {
      console.log('Requesting extra activation for:', activationId);
      
      const response = await this.makeApiCall({
        api_key: this.apiKey,
        action: 'getExtraActivation',
        activationId: activationId
      });
      
      if (response && response.startsWith('ACCESS_NUMBER:')) {
        // Ready to use immediately
        const parts = response.split(':');
        const id = parts[1];
        const number = parts[2];
        console.log('Extra activation ready immediately:', { id, number });
        return { id, number };
      } else if (response && response.startsWith('ASLEEP:')) {
        // Need to wait until specified time
        const parts = response.split(':');
        const id = parts[1];
        const number = parts[2];
        const readyTime = parseInt(parts[3]);
        console.log('Extra activation will be ready at:', new Date(readyTime * 1000));
        return { id, number, readyTime };
      } else if (response === 'BAD_ID') {
        console.log('Invalid activation ID for extra activation');
        return null;
      } else {
        console.log('Extra activation response:', response);
        return null;
      }
    } catch (error) {
      console.error('Error getting extra activation:', error);
      return null;
    }
  }

  // Helper method to get service name
  private getServiceName(serviceCode: string): string {
    const serviceNames: { [key: string]: string } = {
      // Popular messaging apps
      'tg': 'Telegram',
      'wa': 'WhatsApp',
      'ig': 'Instagram',
      'fb': 'Facebook',
      'tw': 'Twitter',
      'ds': 'Discord',
      'go': 'Google',
      'yt': 'YouTube',
      'sc': 'Snapchat',
      'tt': 'TikTok',
      'li': 'LinkedIn',
      'vi': 'Viber',
      'sk': 'Skype',
      'zm': 'Zoom',
      'sl': 'Slack',
      'rd': 'Reddit',
      'pt': 'Pinterest',
      
      // Dating and social
      '2redbeans': '2RedBeans Dating',
      'td': 'Tinder',
      'bm': 'Bumble',
      'hg': 'Hinge',
      'gm': 'Grindr',
      'mt': 'Match.com',
      'pf': 'Plenty of Fish',
      'ok': 'OkCupid',
      'cm': 'Coffee Meets Bagel',
      
      // Educational and professional
      'auw': 'American University Washington',
      'aarp': 'AARP (American Association of Retired Persons)',
      'coursera': 'Coursera',
      'udemy': 'Udemy',
      'khan': 'Khan Academy',
      'edx': 'edX',
      
      // Financial and shopping
      'acima': 'Acima Credit',
      'pp': 'PayPal',
      'stripe': 'Stripe',
      'square': 'Square',
      'venmo': 'Venmo',
      'cashapp': 'Cash App',
      'zelle': 'Zelle',
      'amazon': 'Amazon',
      'ebay': 'eBay',
      'etsy': 'Etsy',
      'shopify': 'Shopify',
      
      // Technology and services
      'ms': 'Microsoft',
      'outlook': 'Microsoft Outlook Hotmail',
      'office365': 'Microsoft Office 365',
      'teams': 'Microsoft Teams',
      'chatgpt': 'OpenAI ChatGPT',
      'openai': 'OpenAI',
      'github': 'GitHub',
      'gitlab': 'GitLab',
      'bitbucket': 'Bitbucket',
      'docker': 'Docker',
      'aws': 'Amazon Web Services',
      'azure': 'Microsoft Azure',
      'gcp': 'Google Cloud Platform',
      
      // Entertainment and media
      'nf': 'Netflix',
      'hulu': 'Hulu',
      'disney': 'Disney Plus',
      'spotify': 'Spotify',
      'apple': 'Apple Music',
      'pandora': 'Pandora',
      'soundcloud': 'SoundCloud',
      'twitch': 'Twitch',
      'steam': 'Steam',
      'epic': 'Epic Games',
      
      // Communication and productivity
      'wc': 'WeChat',
      'ln': 'Line',
      'kk': 'KakaoTalk',
      'signal': 'Signal',
      'wickr': 'Wickr',
      'threema': 'Threema',
      'element': 'Element',
      'matrix': 'Matrix',
      'keybase': 'Keybase',
      
      // Travel and transportation
      'uber': 'Uber',
      'lyft': 'Lyft',
      'airbnb': 'Airbnb',
      'booking': 'Booking.com',
      'expedia': 'Expedia',
      'tripadvisor': 'TripAdvisor',
      
      // Food delivery
      'doordash': 'DoorDash',
      'ubereats': 'Uber Eats',
      'grubhub': 'GrubHub',
      'postmates': 'Postmates',
      
      // Cryptocurrency
      'binance': 'Binance',
      'coinbase': 'Coinbase',
      'kraken': 'Kraken',
      'bitfinex': 'Bitfinex',
      'huobi': 'Huobi',
      
      // Legacy mappings
      'vk': 'VKontakte',
      'av': 'Avito',
      'ya': 'Yahoo',
      'cl': 'Craigslist',
      'ot': 'Other',
      'ad': 'Adobe',
      'gh': 'GitHub',
      'dr': 'Dropbox',
      'tb': 'Tumblr',
      'wp': 'WordPress',
      'sh': 'Shopify',
      'eb': 'eBay',
      'et': 'Etsy',
      'ai': 'Airbnb',
      'bf': 'Booking.com',
      'ex': 'Expedia',
      'tr': 'TripAdvisor',
      'zl': 'Zillow',
      'qr': 'QR Code',
      'bt': 'BitTorrent',
      'mg': 'Mega',
      'mw': 'MediaWiki',
      'jt': 'Jitsi',
      'rc': 'Rocket.Chat',
      'el': 'Element',
      'sg': 'Signal',
      'wk': 'Wickr',
      'th': 'Threema',
      'br': 'Briar',
      'ri': 'Ricochet',
      'ss': 'Session',
      'st': 'Status',
      'kp': 'Keybase',
      'pr': 'ProtonMail',
      'tm': 'Tutanota',
      'hm': 'HushMail',
      'sm': 'StartMail',
      'fm': 'FastMail',
      'gw': 'Guerrilla Mail',
      'mm': 'Mailinator',
      'yp': 'Yopmail',
      'gt': 'GetNada',
      'ml': 'Maildrop',
      'em': 'EmailOnDeck',
      'mb': 'Mailbox.org',
      'pm': 'Posteo',
      'ct': 'CounterMail',
      'lv': 'Lavabit',
      'rn': 'RiseUp'
    };
    
    // If we have a mapping, use it
    if ((serviceNames as any)[serviceCode.toLowerCase()]) {
      return (serviceNames as any)[serviceCode.toLowerCase()];
    }
    
    // If it's a code-like string, try to make it more readable
    if (serviceCode.length <= 10 && serviceCode === serviceCode.toUpperCase()) {
      // Convert codes like "2REDBEANS" to "2RedBeans"
      return serviceCode.toLowerCase()
        .split(/(\d+)/)
        .map(part => {
          if (/^\d+$/.test(part)) return part; // Keep numbers as-is
          return part.charAt(0).toUpperCase() + part.slice(1); // Capitalize first letter
        })
        .join('');
    }
    
    // For longer strings, assume they might be full names already
    return serviceCode.charAt(0).toUpperCase() + serviceCode.slice(1).toLowerCase();
  }

  // Helper method to get country name
  private getCountryName(countryCode: string): string {
    const countryNames: { [key: string]: string } = {
      '0': 'United States',
      '1': 'Russia',
      '44': 'United Kingdom',
      '49': 'Germany',
      '33': 'France',
      '39': 'Italy',
      '34': 'Spain',
      '31': 'Netherlands',
      '32': 'Belgium',
      '41': 'Switzerland',
      '43': 'Austria',
      '45': 'Denmark',
      '46': 'Sweden',
      '47': 'Norway',
      '48': 'Poland',
      '420': 'Czech Republic',
      '421': 'Slovakia',
      '36': 'Hungary',
      '40': 'Romania',
      '359': 'Bulgaria',
      '385': 'Croatia',
      '386': 'Slovenia',
      '371': 'Latvia',
      '370': 'Lithuania',
      '372': 'Estonia'
    };
    return (countryNames as any)[countryCode] || `Country ${countryCode}`;
  }

  // Helper method to record rental in Firebase
  private async recordRental(
    id: string, 
    userId: string, 
    number: string, 
    service: string, 
    country: string, 
    daisyPrice: number, 
    userPrice: number, 
    profit: number,
    isCustomPrice: boolean = false,
    actualPrice: number,
    options?: {
      areas?: string;
      carriers?: string;
      phone?: string;
      duration?: string;
      renewable?: boolean;
      autoRenew?: boolean;
    },
    serviceName?: string // Optional service display name from UI
  ): Promise<void> {
    try {
      console.log('Recording rental:', { id, userId, number, service, userPrice });
      console.log('Exact price to charge:', actualPrice);
      
      // Check user's balance and determine which currency to charge from
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      const balanceUSD = userData.walletBalance || 0;
      const balanceNGN = userData.walletBalanceNGN || 0;
      const exchangeRate = 1600; // NGN to USD
      
      console.log('User balances before charge:', { balanceUSD, balanceNGN, chargeAmount: actualPrice });
      
      // Determine which wallet to charge from and calculate amounts
      const hasUSDBalance = balanceUSD >= actualPrice;
      const hasNGNBalance = balanceNGN >= (actualPrice * exchangeRate);
      
      let deductFromUSD = 0;
      let deductFromNGN = 0;
      let chargedAmountUSD = 0;
      let chargedAmountNGN = 0;
      
      if (hasUSDBalance) {
        // Charge from USD wallet
        deductFromUSD = actualPrice;
        chargedAmountUSD = actualPrice;
      } else if (hasNGNBalance) {
        // Charge from NGN wallet
        deductFromNGN = actualPrice * exchangeRate;
        chargedAmountNGN = actualPrice * exchangeRate;
      } else {
        // Insufficient balance in both currencies
        throw new Error(`Insufficient balance. Need ${formatCurrency(actualPrice)}`);
      }
      
      console.log('Charging user:', { 
        deductFromUSD, 
        deductFromNGN, 
        chargedAmountUSD, 
        chargedAmountNGN,
        actualPrice 
      });
      
      // CRITICAL FIX: Create rental record FIRST, then deduct money
      // This prevents money loss if rental creation fails
      console.log('Creating rental record first (before charging)...');

      // Record the rental in Firebase BEFORE charging
      console.log('🔥 About to create rental document in Firebase with ID:', id);
      console.log('🔥 Document path will be: rentals/' + id);
      console.log('🔥 UserId for rental:', userId);
      
      await setDoc(doc(db, 'rentals', id), {
        id: id,
        userId: userId,
        number: number,
        service: serviceName || this.getServiceName(service), // Use provided name first, fallback to lookup
        serviceCode: service,
        country: this.getCountryName(country),
        countryCode: country,
        status: 'waiting', // Always start with waiting status
        daisyPrice: daisyPrice, // Base DaisySMS cost
        userPrice: actualPrice, // What user was charged
        actualPrice: actualPrice, // Exact price for refunds
        profit: Math.max(0, actualPrice - daisyPrice),
        isCustomPrice: isCustomPrice,
        markupPercentage: this.markupPercentage,
        chargedCurrency: deductFromUSD > 0 ? 'USD' : 'NGN',
        chargedAmount: deductFromUSD > 0 ? chargedAmountUSD : chargedAmountNGN,
        exactPriceCharged: actualPrice, // Store exact price for perfect refunds
        durationType: options?.duration ? 'long-term' : 'short-term',
        duration: options?.duration ? parseInt(options.duration.split(' ')[0]) : 30,
        durationUnit: options?.duration ? options.duration.split(' ')[1] : 'minutes',
        createdAt: new Date(),
        expiresAt: options?.duration ? 
          this.calculateExpirationDate(options.duration) : 
          new Date(Date.now() + 30 * 60 * 1000), // 30 minutes for short-term
        lastChecked: new Date(),
        initialStatus: 'waiting' // Track initial status for debugging
      });
      
      console.log('🔥 Rental document created successfully in Firebase!');
      console.log('🔥 Rental ID:', id);
      console.log('🔥 User ID:', userId);
      console.log('🔥 Document should be at: rentals/' + id);
      
      // Immediately verify the document was created
      try {
        const verifyDoc = await getDoc(doc(db, 'rentals', id));
        if (verifyDoc.exists()) {
          console.log('✅ VERIFIED: Rental document exists in Firebase immediately after creation');
          console.log('📄 Document data:', verifyDoc.data());
        } else {
          console.error('❌ CRITICAL: Rental document NOT found immediately after creation!');
        }
      } catch (verifyError) {
        console.error('❌ Error verifying rental document creation:', verifyError);
      }
      
      console.log('Rental record verified, now creating transaction...');

      // Record the transaction BEFORE charging (in case charging fails)
      await setDoc(doc(db, 'transactions', `${userId}_rental_${Date.now()}`), {
        userId: userId,
        type: 'rental',
        amount: -(actualPrice), // Always store in USD for consistency
        amountUSD: deductFromUSD ? -chargedAmountUSD : -actualPrice,
        amountNGN: deductFromNGN ? -chargedAmountNGN : -(actualPrice * exchangeRate),
        description: `Number rental: ${number} for ${this.getServiceName(service)} - ${formatCurrency(actualPrice)}`,
        exactPriceCharged: actualPrice,
        daisyPrice: daisyPrice,
        profit: profit,
        isCustomPrice: isCustomPrice,
        service: service,
        country: country,
        rentalId: id,
        status: 'completed',
        createdAt: new Date()
      });

      console.log('Transaction recorded, now charging user wallet...');

      // CRITICAL FIX: Charge wallet LAST after all records are created
      // This prevents money loss if any operation fails
      try {
        const updateData: any = {};
        if (deductFromUSD > 0) {
          updateData.walletBalance = increment(-deductFromUSD);
        }
        if (deductFromNGN > 0) {
          updateData.walletBalanceNGN = increment(-deductFromNGN);
        }
        
        await updateDoc(doc(db, 'users', userId), updateData);
        console.log('User wallet charged successfully');
      } catch (walletError) {
        console.error('Wallet charging failed, rental record already exists:', walletError);
        // If wallet charge fails but rental exists, that's better than losing money
        // Admin can manually fix the balance later
      }
      
      // Update global stats (create if doesn't exist)
      try {
        await setDoc(doc(db, 'stats', 'global'), {
          totalRentals: increment(1),
          totalDaisySpent: increment(daisyPrice), // Base cost
          totalRevenue: increment(actualPrice), // What user paid
          totalProfit: increment(Math.max(0, actualPrice - daisyPrice)),
          lastUpdated: new Date()
        }, { merge: true });
        console.log('✅ Global stats updated successfully');
      } catch (statsError) {
        console.warn('⚠️ Failed to update global stats (non-critical):', statsError);
        // Don't fail the entire rental process for stats update issues
      }
      
      console.log('Rental process completed successfully');
    } catch (error) {
      console.error('CRITICAL ERROR in rental recording:', error);
      
      // Since we charge wallet LAST, if this fails the user hasn't lost money yet
      // The rental record exists but wallet wasn't charged - this is safer
      console.log('Error occurred during rental process - user wallet not charged due to safety measures');
      
      throw new Error('Rental process failed. Your balance was not charged. Please try again.');
    }
  }

  // Calculate expiration date for long-term rentals
  private calculateExpirationDate(duration: string): Date {
    const parts = duration.split(' ');
    const value = parseInt(parts[0]);
    const unit = parts[1];
    
    const now = Date.now();
    
    switch (unit.toLowerCase()) {
      case 'days':
        return new Date(now + value * 24 * 60 * 60 * 1000);
      case 'months':
        return new Date(now + value * 30 * 24 * 60 * 60 * 1000);
      case 'hours':
        return new Date(now + value * 60 * 60 * 1000);
      default:
        return new Date(now + 30 * 60 * 1000); // Default to 30 minutes
    }
  }
}

// Build DaisySMS API options from user selections
export function buildDaisyOptions(options: {
  areas?: string;
  carriers?: string;
  phone?: string;
  duration?: string;
  renewable?: boolean;
  autoRenew?: boolean;
}): { [key: string]: string } {
  const apiOptions: { [key: string]: string } = {};
  
  // Area codes (comma-separated)
  if (options.areas && options.areas.trim()) {
    const areaCodes = options.areas.split(',').map(code => code.trim()).filter(code => code);
    if (areaCodes.length > 0) {
      apiOptions.areas = areaCodes.join(',');
    }
  }
  
  // Carriers (single carrier code)
  if (options.carriers && options.carriers !== 'any') {
    apiOptions.carriers = options.carriers;
  }
  
  // Phone number
  if (options.phone && options.phone.trim()) {
    apiOptions.phone = options.phone.trim();
  }
  
  // Duration for long-term rentals
  if (options.duration && options.duration !== 'short-term') {
    apiOptions.duration = options.duration;
  }
  
  // Renewable flag (only for long-term rentals)
  if (options.duration && options.duration !== 'short-term') {
    if (options.renewable !== undefined) {
      apiOptions.renewable = options.renewable ? '1' : '0';
    }
    
    // Auto-renew flag (only for long-term rentals)
    if (options.autoRenew !== undefined) {
      apiOptions.auto_renew = options.autoRenew ? '1' : '0';
    }
  }
  
  return apiOptions;
}
// Helper function for currency formatting
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}