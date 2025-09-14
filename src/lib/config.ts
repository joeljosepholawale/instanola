// Environment configuration for production deployment
export const config = {
  // Firebase
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  },
  
  // DaisySMS
  daisySMS: {
    apiKey: import.meta.env.VITE_DAISYSMS_API_KEY,
    baseUrl: import.meta.env.VITE_DAISYSMS_BASE_URL || 'https://daisysms.com/stubs/handler_api.php'
  },
  
  // Payments
  payments: {
    paymentPoint: {
      apiKey: import.meta.env.VITE_PAYMENTPOINT_API_KEY,
      baseUrl: 'https://api.paymentpoint.com/v1'
    },
    plisio: {
      apiKey: import.meta.env.VITE_PLISIO_API_KEY,
      baseUrl: 'https://api.plisio.net/api/v1'
    }
  },
  
  // App
  app: {
    name: import.meta.env.VITE_APP_NAME || 'InstantNums',
    url: import.meta.env.VITE_APP_URL || window.location.origin,
    supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'support@instantnums.com',
    environment: import.meta.env.VITE_NODE_ENV || 'development'
  },
  
  // API Configuration
  api: {
    timeout: 45000, // 45 seconds for production
    retries: 3,
    corsMode: 'cors', // Always use CORS for hosted environment
    sandboxUrl: 'https://api-sandbox.nowpayments.io/v1'
  }
};

// Validation function to check required environment variables
export function validateConfig(): { valid: boolean; missing: string[] } {
  const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_DAISYSMS_API_KEY'
  ];
  
  const missing = required.filter(key => !import.meta.env[key]);
  
  return {
    valid: missing.length === 0,
    missing
  };
}

// Get environment-specific settings
export function getEnvironmentConfig() {
  const isDevelopment = import.meta.env.DEV;
  const isProduction = import.meta.env.PROD;
  const isHosted = typeof window !== 'undefined' && 
    window.location.hostname !== 'localhost' && 
    window.location.hostname !== '127.0.0.1' && 
    !window.location.hostname.includes('webcontainer');
  
  return {
    isDevelopment,
    isProduction,
    isHosted,
    apiUrl: isHosted ? 'https://daisysms.com/stubs/handler_api.php' : '/api/daisysms-proxy.php',
    corsMode: 'cors',
    enableDebugLogs: isDevelopment,
    enableAnalytics: isProduction,
  };
}