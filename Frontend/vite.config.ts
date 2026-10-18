import { defineConfig } from 'vite'; 
import react from '@vitejs/plugin-react'; 
import tailwindcss from '@tailwindcss/vite'; 
import { fileURLToPath, URL } from 'node:url'; 
import { VitePWA } from 'vite-plugin-pwa'; 

export default defineConfig({ 
  plugins: [ 
    react(), 
    tailwindcss(), 
    VitePWA({ 
      registerType: 'prompt', 
      includeAssets: ['favicon.ico'], 
      manifest: { 
        id: '/', 
        name: 'Sprintive - AI Scrum Automation', 
        short_name: 'Sprintive', 
        description: 'AI-powered Scrum automation platform for meetings, transcription, and sprint management.', 
        theme_color: '#ffffff', 
        background_color: '#ffffff', 
        display: 'standalone', 
        orientation: 'portrait', 
        start_url: '/', 
        scope: '/', 
        icons: [ 
          { 
            src: '/pwa-192x192.png', 
            sizes: '192x192', 
            type: 'image/png', 
            purpose: 'any', 
          }, 
          { 
            src: '/pwa-512x512.png', 
            sizes: '512x512', 
            type: 'image/png', 
            purpose: 'any', 
          }, 
          { 
            src: '/pwa-512x512.png', 
            sizes: '512x512', 
            type: 'image/png', 
            purpose: 'maskable', 
          }, 
        ], 
      }, 
    }), 
  ], 
  resolve: { 
    alias: { 
      '@': fileURLToPath(new URL('./src', import.meta.url)), 
    }, 
  }, 
  server: { 
    proxy: { 
      '/uploads': { 
        target: 'http://localhost:5000', 
        changeOrigin: true, 
      }, 
    }, 
  }, 
});
