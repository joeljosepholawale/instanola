"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SITE_CONFIGS = void 0;
exports.getSiteConfig = getSiteConfig;
exports.validateSiteId = validateSiteId;
exports.getCollectionName = getCollectionName;
exports.getCompatibleSiteId = getCompatibleSiteId;
exports.generateCustomerId = generateCustomerId;
exports.parseSiteFromCustomerId = parseSiteFromCustomerId;
// Site configurations
exports.SITE_CONFIGS = {
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
function getSiteConfig(siteId) {
    return exports.SITE_CONFIGS[siteId] || null;
}
function validateSiteId(siteId) {
    return siteId in exports.SITE_CONFIGS;
}
function getCollectionName(siteId, collection) {
    if (!validateSiteId(siteId)) {
        throw new Error(`Invalid site ID: ${siteId}`);
    }
    return `${collection}_${siteId}`;
}
// For backward compatibility with InstantNums
function getCompatibleSiteId(siteId) {
    // If no siteId provided, default to instantnums for backward compatibility
    return siteId || 'instantnums';
}
function generateCustomerId(siteId, userId) {
    return `${siteId}_${userId}`;
}
function parseSiteFromCustomerId(customerId) {
    const parts = customerId.split('_');
    if (parts.length >= 2) {
        const siteId = parts[0];
        const userId = parts.slice(1).join('_');
        return { siteId, userId };
    }
    return null;
}
//# sourceMappingURL=multi-tenant-config.js.map