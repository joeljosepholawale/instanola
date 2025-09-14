import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs in production
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks for better caching
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('firebase')) {
              return 'firebase-vendor';
            }
            if (id.includes('lucide-react')) {
              return 'ui-vendor';
            }
            return 'vendor';
          }
          
          // Split admin components into separate chunk
          if (id.includes('src/pages/admin') || id.includes('src/components/admin')) {
            return 'admin';
          }
          
          // Split auth pages into separate chunk  
          if (id.includes('src/pages/auth')) {
            return 'auth';
          }
          
          // Dashboard pages in separate chunk
          if (id.includes('src/pages/dashboard')) {
            return 'dashboard';
          }
        },
      },
    },
  },
  server: {
    proxy: {
      '/api/stubs/handler_api.php': {
        target: 'https://daisysms.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: true,
        timeout: 30000,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying request:', req.url);
            proxyReq.setHeader('User-Agent', 'ProxyNumSMS/1.0');
          });
        }
      },
      '/proxynum-paymentpoint-api': {
        target: 'https://api.paymentpoint.ng',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxynum-paymentpoint-api/, ''),
        secure: true,
        timeout: 10000,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('PaymentPoint proxy error (this is expected in development):', err.message);
            // Send a proper error response instead of letting it hang
            if (!res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                error: 'PaymentPoint API not accessible in development environment',
                message: 'Please use manual payment method for testing'
              }));
            }
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Attempting PaymentPoint request:', req.url);
            proxyReq.setHeader('User-Agent', 'ProxyNumSMS/1.0');
            // Set shorter timeout for development
            proxyReq.setTimeout(5000, () => {
              console.log('PaymentPoint request timeout (expected in development)');
              proxyReq.destroy();
            });
          });
        }
      },
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
