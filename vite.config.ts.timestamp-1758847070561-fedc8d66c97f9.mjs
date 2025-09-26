// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ["@babel/plugin-syntax-throw-expressions"]
      }
    })
  ],
  build: {
    target: "esnext",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        // Remove console logs in production
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom") || id.includes("react-router")) {
              return "react-vendor";
            }
            if (id.includes("firebase")) {
              return "firebase-vendor";
            }
            if (id.includes("lucide-react")) {
              return "ui-vendor";
            }
            return "vendor";
          }
          if (id.includes("src/pages/admin") || id.includes("src/components/admin")) {
            return "admin";
          }
          if (id.includes("src/pages/auth")) {
            return "auth";
          }
          if (id.includes("src/pages/dashboard")) {
            return "dashboard";
          }
        }
      }
    }
  },
  server: {
    proxy: {
      "/api/stubs/handler_api.php": {
        target: "https://daisysms.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        secure: true,
        timeout: 3e4,
        configure: (proxy, options) => {
          proxy.on("error", (err, req, res) => {
            console.log("Proxy error:", err);
          });
          proxy.on("proxyReq", (proxyReq, req, res) => {
            console.log("Proxying request:", req.url);
            proxyReq.setHeader("User-Agent", "ProxyNumSMS/1.0");
          });
        }
      },
      "/proxynum-paymentpoint-api": {
        target: "https://api.paymentpoint.ng",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxynum-paymentpoint-api/, ""),
        secure: true,
        timeout: 5e3,
        configure: (proxy, options) => {
          proxy.on("error", (err, req, res) => {
            console.log("PaymentPoint proxy error (expected in development):", err.message);
            if (!res.headersSent) {
              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(JSON.stringify({
                error: "PaymentPoint API not accessible in development",
                message: "Service requires Firebase Functions deployment"
              }));
            }
          });
          proxy.on("proxyReqError", (err, req, res) => {
            console.log("PaymentPoint proxy request error:", err.message);
            if (!res.headersSent) {
              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(JSON.stringify({
                error: "PaymentPoint service unavailable",
                message: "Please contact support for assistance"
              }));
            }
          });
          proxy.on("proxyRes", (proxyRes, req, res) => {
            if (proxyRes.statusCode === 530) {
              console.log("PaymentPoint API returned status 530");
              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(JSON.stringify({
                error: "PaymentPoint API service unavailable",
                message: "Service temporarily unavailable. Please contact support.",
                statusCode: 503
              }));
              return;
            }
          });
          proxy.on("proxyReq", (proxyReq, req, res) => {
            console.log("PaymentPoint proxy request:", req.url);
            proxyReq.setHeader("User-Agent", "ProxyNumSMS/1.0");
            proxyReq.setTimeout(3e3, () => {
              console.log("PaymentPoint request timeout");
              proxyReq.destroy();
            });
          });
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ["lucide-react"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3Qoe1xuICAgICAgYmFiZWw6IHtcbiAgICAgICAgcGx1Z2luczogWydAYmFiZWwvcGx1Z2luLXN5bnRheC10aHJvdy1leHByZXNzaW9ucyddXG4gICAgICB9XG4gICAgfSlcbiAgXSxcbiAgYnVpbGQ6IHtcbiAgICB0YXJnZXQ6ICdlc25leHQnLFxuICAgIG1pbmlmeTogJ3RlcnNlcicsXG4gICAgdGVyc2VyT3B0aW9uczoge1xuICAgICAgY29tcHJlc3M6IHtcbiAgICAgICAgZHJvcF9jb25zb2xlOiB0cnVlLCAvLyBSZW1vdmUgY29uc29sZSBsb2dzIGluIHByb2R1Y3Rpb25cbiAgICAgICAgZHJvcF9kZWJ1Z2dlcjogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiAoaWQpID0+IHtcbiAgICAgICAgICAvLyBWZW5kb3IgY2h1bmtzIGZvciBiZXR0ZXIgY2FjaGluZ1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzJykpIHtcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygncmVhY3QnKSB8fCBpZC5pbmNsdWRlcygncmVhY3QtZG9tJykgfHwgaWQuaW5jbHVkZXMoJ3JlYWN0LXJvdXRlcicpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAncmVhY3QtdmVuZG9yJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnZmlyZWJhc2UnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2ZpcmViYXNlLXZlbmRvcic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2x1Y2lkZS1yZWFjdCcpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAndWktdmVuZG9yJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAndmVuZG9yJztcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gU3BsaXQgYWRtaW4gY29tcG9uZW50cyBpbnRvIHNlcGFyYXRlIGNodW5rXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdzcmMvcGFnZXMvYWRtaW4nKSB8fCBpZC5pbmNsdWRlcygnc3JjL2NvbXBvbmVudHMvYWRtaW4nKSkge1xuICAgICAgICAgICAgcmV0dXJuICdhZG1pbic7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIC8vIFNwbGl0IGF1dGggcGFnZXMgaW50byBzZXBhcmF0ZSBjaHVuayAgXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdzcmMvcGFnZXMvYXV0aCcpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2F1dGgnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICAvLyBEYXNoYm9hcmQgcGFnZXMgaW4gc2VwYXJhdGUgY2h1bmtcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3NyYy9wYWdlcy9kYXNoYm9hcmQnKSkge1xuICAgICAgICAgICAgcmV0dXJuICdkYXNoYm9hcmQnO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgcHJveHk6IHtcbiAgICAgICcvYXBpL3N0dWJzL2hhbmRsZXJfYXBpLnBocCc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cHM6Ly9kYWlzeXNtcy5jb20nLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9hcGkvLCAnJyksXG4gICAgICAgIHNlY3VyZTogdHJ1ZSxcbiAgICAgICAgdGltZW91dDogMzAwMDAsXG4gICAgICAgIGNvbmZpZ3VyZTogKHByb3h5LCBvcHRpb25zKSA9PiB7XG4gICAgICAgICAgcHJveHkub24oJ2Vycm9yJywgKGVyciwgcmVxLCByZXMpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdQcm94eSBlcnJvcjonLCBlcnIpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHByb3h5Lm9uKCdwcm94eVJlcScsIChwcm94eVJlcSwgcmVxLCByZXMpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdQcm94eWluZyByZXF1ZXN0OicsIHJlcS51cmwpO1xuICAgICAgICAgICAgcHJveHlSZXEuc2V0SGVhZGVyKCdVc2VyLUFnZW50JywgJ1Byb3h5TnVtU01TLzEuMCcpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgJy9wcm94eW51bS1wYXltZW50cG9pbnQtYXBpJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwczovL2FwaS5wYXltZW50cG9pbnQubmcnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9wcm94eW51bS1wYXltZW50cG9pbnQtYXBpLywgJycpLFxuICAgICAgICBzZWN1cmU6IHRydWUsXG4gICAgICAgIHRpbWVvdXQ6IDUwMDAsXG4gICAgICAgIGNvbmZpZ3VyZTogKHByb3h5LCBvcHRpb25zKSA9PiB7XG4gICAgICAgICAgcHJveHkub24oJ2Vycm9yJywgKGVyciwgcmVxLCByZXMpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdQYXltZW50UG9pbnQgcHJveHkgZXJyb3IgKGV4cGVjdGVkIGluIGRldmVsb3BtZW50KTonLCBlcnIubWVzc2FnZSk7XG4gICAgICAgICAgICAvLyBTZW5kIGEgcHJvcGVyIGVycm9yIHJlc3BvbnNlIGluc3RlYWQgb2YgbGV0dGluZyBpdCBoYW5nXG4gICAgICAgICAgICBpZiAoIXJlcy5oZWFkZXJzU2VudCkge1xuICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDUwMywgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xuICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgXG4gICAgICAgICAgICAgICAgZXJyb3I6ICdQYXltZW50UG9pbnQgQVBJIG5vdCBhY2Nlc3NpYmxlIGluIGRldmVsb3BtZW50JyxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnU2VydmljZSByZXF1aXJlcyBGaXJlYmFzZSBGdW5jdGlvbnMgZGVwbG95bWVudCdcbiAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHByb3h5Lm9uKCdwcm94eVJlcUVycm9yJywgKGVyciwgcmVxLCByZXMpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdQYXltZW50UG9pbnQgcHJveHkgcmVxdWVzdCBlcnJvcjonLCBlcnIubWVzc2FnZSk7XG4gICAgICAgICAgICBpZiAoIXJlcy5oZWFkZXJzU2VudCkge1xuICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDUwMywgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xuICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICBlcnJvcjogJ1BheW1lbnRQb2ludCBzZXJ2aWNlIHVuYXZhaWxhYmxlJyxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnUGxlYXNlIGNvbnRhY3Qgc3VwcG9ydCBmb3IgYXNzaXN0YW5jZSdcbiAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHByb3h5Lm9uKCdwcm94eVJlcycsIChwcm94eVJlcywgcmVxLCByZXMpID0+IHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSB1bmtub3duIHN0YXR1cyBjb2RlIDUzMCBmcm9tIFBheW1lbnRQb2ludCBBUElcbiAgICAgICAgICAgIGlmIChwcm94eVJlcy5zdGF0dXNDb2RlID09PSA1MzApIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1BheW1lbnRQb2ludCBBUEkgcmV0dXJuZWQgc3RhdHVzIDUzMCcpO1xuICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDUwMywgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xuICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICBlcnJvcjogJ1BheW1lbnRQb2ludCBBUEkgc2VydmljZSB1bmF2YWlsYWJsZScsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ1NlcnZpY2UgdGVtcG9yYXJpbHkgdW5hdmFpbGFibGUuIFBsZWFzZSBjb250YWN0IHN1cHBvcnQuJyxcbiAgICAgICAgICAgICAgICBzdGF0dXNDb2RlOiA1MDNcbiAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcHJveHkub24oJ3Byb3h5UmVxJywgKHByb3h5UmVxLCByZXEsIHJlcykgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1BheW1lbnRQb2ludCBwcm94eSByZXF1ZXN0OicsIHJlcS51cmwpO1xuICAgICAgICAgICAgcHJveHlSZXEuc2V0SGVhZGVyKCdVc2VyLUFnZW50JywgJ1Byb3h5TnVtU01TLzEuMCcpO1xuICAgICAgICAgICAgLy8gU2V0IHRpbWVvdXQgZm9yIGRldmVsb3BtZW50XG4gICAgICAgICAgICBwcm94eVJlcS5zZXRUaW1lb3V0KDMwMDAsICgpID0+IHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1BheW1lbnRQb2ludCByZXF1ZXN0IHRpbWVvdXQnKTtcbiAgICAgICAgICAgICAgcHJveHlSZXEuZGVzdHJveSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgfVxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBleGNsdWRlOiBbJ2x1Y2lkZS1yZWFjdCddLFxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlOLFNBQVMsb0JBQW9CO0FBQ3RQLE9BQU8sV0FBVztBQUdsQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsTUFDSixPQUFPO0FBQUEsUUFDTCxTQUFTLENBQUMsd0NBQXdDO0FBQUEsTUFDcEQ7QUFBQSxJQUNGLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixRQUFRO0FBQUEsSUFDUixlQUFlO0FBQUEsTUFDYixVQUFVO0FBQUEsUUFDUixjQUFjO0FBQUE7QUFBQSxRQUNkLGVBQWU7QUFBQSxNQUNqQjtBQUFBLElBQ0Y7QUFBQSxJQUNBLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGNBQWMsQ0FBQyxPQUFPO0FBRXBCLGNBQUksR0FBRyxTQUFTLGNBQWMsR0FBRztBQUMvQixnQkFBSSxHQUFHLFNBQVMsT0FBTyxLQUFLLEdBQUcsU0FBUyxXQUFXLEtBQUssR0FBRyxTQUFTLGNBQWMs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
