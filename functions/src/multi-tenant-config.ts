// Multi-tenant configuration for PaymentPoint functions
export interface SiteConfig {
  siteId: string;
  siteName: string;
  firebaseConfig: {
    projectId: string;
    authDomain: string;
    apiKey: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
  };
  webhookUrl?: string;
  supportEmail: string;
  branding: {
    primaryColor: string;
    logoUrl?: string;
  };
}

// Site configurations
export const SITE_CONFIGS: { [siteId: string]: SiteConfig } = {
  instantnums: {
    siteId: 'instantnums',
    siteName: 'InstantNums',
    firebaseConfig: {
      projectId: 'instantnums-48c6e',
      authDomain: 'instantnums-48c6e.firebaseapp.com',
      apiKey: 'AIzaSyDjMt3RrBjBqctXZ9UxdriQDfSgFS4HMRE',
      storageBucket: 'instantnums-48c6e.firebasestorage.app',
      messagingSenderId: '647968972152',
      appId: '1:647968972152:web:c9a9518c832ecff9aafc8d',
      measurementId: 'G-TX0EJ98S8T'
    },
    supportEmail: 'support@instantnums.com',
    branding: {
      primaryColor: '#059669',
      logoUrl: 'https://instantnums.com/logo.png'
    }
  },
  engrowz: {
    siteId: 'engrowz',
    siteName: 'Engrowz',
    firebaseConfig: {
      projectId: 'engrowz-6db2c',
      authDomain: 'engrowz-6db2c.firebaseapp.com',
      apiKey: 'AIzaSyCG_Oy84AuMQKRL1YpBPtN2PWqKYuTdUnk',
      storageBucket: 'engrowz-6db2c.firebasestorage.app',
      messagingSenderId: '164077045782',
      appId: '1:164077045782:web:f5ebbc102278b545ad8d37',
      measurementId: 'G-H'
    },
    supportEmail: 'support@engrowz.com',
    branding: {
      primaryColor: '#3B82F6',
      logoUrl: 'https://engrowz.com/logo.png'
    }
  }
};

// Helper functions
export function getSiteConfig(siteId: string): SiteConfig | null {
  return SITE_CONFIGS[siteId] || null;
}

export function validateSiteId(siteId: string): boolean {
  return siteId in SITE_CONFIGS;
}

export function getCollectionName(siteId: string, collection: string): string {
  if (!validateSiteId(siteId)) {
    throw new Error(`Invalid site ID: ${siteId}`);
  }
  return `${collection}_${siteId}`;
}

// For backward compatibility with InstantNums
export function getCompatibleSiteId(siteId?: string): string {
  // If no siteId provided, default to instantnums for backward compatibility
  return siteId || 'instantnums';
}

export function generateCustomerId(siteId: string, userId: string): string {
  return `${siteId}_${userId}`;
}

export function parseSiteFromCustomerId(customerId: string): { siteId: string; userId: string } | null {
  const parts = customerId.split('_');
  if (parts.length >= 2) {
    const siteId = parts[0];
    const userId = parts.slice(1).join('_');
    return { siteId, userId };
  }
  return null;
}