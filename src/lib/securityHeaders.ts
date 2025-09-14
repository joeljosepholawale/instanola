// Security headers and CSP configuration for production
export const SecurityHeaders = {
  // Content Security Policy
  generateCSP(): string {
    const policies = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://api.qrserver.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob: https://api.qrserver.com https://assets.coingecko.com https://res.cloudinary.com",
      "connect-src 'self' https: wss: https://api.exchangerate-api.com https://daisysms.com https://api.paymentpoint.co https://api.plisio.net https://api.nowpayments.io https://api.allorigins.win https://corsproxy.io https://api.cloudinary.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
      "media-src 'self' data: blob:",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "form-action 'self'"
    ];
    
    return policies.join('; ');
  },

  // Security headers for hosting platforms
  getSecurityHeaders(): Record<string, string> {
    return {
      // Prevent XSS attacks
      'X-XSS-Protection': '1; mode=block',
      
      // Prevent MIME sniffing
      'X-Content-Type-Options': 'nosniff',
      
      // Prevent clickjacking
      'X-Frame-Options': 'DENY',
      
      // Enforce HTTPS (only in production)
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      
      // Content Security Policy
      'Content-Security-Policy': this.generateCSP(),
      
      // Referrer Policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // Permissions Policy
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      
      // Cross-Origin policies
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-site'
    };
  },

  // Generate _headers file for Netlify
  generateNetlifyHeaders(): string {
    const headers = this.getSecurityHeaders();
    let content = '/*\n';
    
    Object.entries(headers).forEach(([key, value]) => {
      content += `  ${key}: ${value}\n`;
    });
    
    // Add CORS headers for API endpoints
    content += '\n/api/*\n';
    content += '  Access-Control-Allow-Origin: *\n';
    content += '  Access-Control-Allow-Methods: GET, POST, OPTIONS\n';
    content += '  Access-Control-Allow-Headers: Content-Type, Authorization\n';
    
    return content;
  },

  // Generate security.txt file
  generateSecurityTxt(): string {
    return `# Security Policy
Contact: security@proxynumsms.com
Expires: 2025-12-31T23:59:59.000Z
Encryption: https://proxynumsms.com/pgp-key.txt
Preferred-Languages: en
Policy: https://proxynumsms.com/security-policy

# Vulnerability Disclosure
# Please report security vulnerabilities to security@proxynumsms.com
# We appreciate responsible disclosure and will respond within 48 hours
`;
  }
};

// Apply security headers in development
export function applyDevelopmentSecurity() {
  if (import.meta.env.DEV) {
    // Add CSP meta tag
    const cspMeta = document.createElement('meta');
    cspMeta.httpEquiv = 'Content-Security-Policy';
    cspMeta.content = SecurityHeaders.generateCSP();
    document.head.appendChild(cspMeta);
    
    // Log security status
    console.log('🔒 Security headers applied for development');
    console.log('CSP:', SecurityHeaders.generateCSP());
  }
}