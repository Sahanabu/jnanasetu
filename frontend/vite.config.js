// Path: frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        runtimeCaching: [
          {
            urlPattern: /\/api\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', networkTimeoutSeconds: 3 }
          }
        ]
      },
      manifest: {
        name: 'JnanaSetu',
        short_name: 'JnanaSetu',
        theme_color: '#7C3AED',
        background_color: '#F5F3FF',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icons/icon-512x512.svg', sizes: '512x512', type: 'image/svg+xml' },
          { src: '/icons/icon-512x512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      }
    })
  ]
})
