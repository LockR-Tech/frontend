import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
  ],
  // Development server and proxy: same-origin dev server proxies /api to gateway.
  // Default target is the deployed API (Azure VM behind Nginx/TLS) so the whole team
  // hits the server (and its database) without running docker locally. Override
  // VITE_API_BASE_URL / this target to run the backend locally on http://localhost:18080.
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'https://api.locker-drone.tech',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-core': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-redux': ['@reduxjs/toolkit', 'react-redux'],
          'vendor-ui': ['lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge'],
          'vendor-animation': ['framer-motion'],
          'vendor-chart': ['recharts'],
          'vendor-table': ['@tanstack/react-table'],
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name || '';
          if (info.endsWith('.css')) {
            return 'assets/css/[name]-[hash][extname]';
          }
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(info)) {
            return 'assets/images/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    cssCodeSplit: true,
    sourcemap: false,
    target: 'esnext',
    chunkSizeWarningLimit: 500,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      '@reduxjs/toolkit',
      'react-redux',
      'recharts',
      'es-toolkit',
      'es-toolkit/compat',
    ],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  css: {
    devSourcemap: true,
  },
})
