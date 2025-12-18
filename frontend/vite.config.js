import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Enable automatic JSX runtime (no need to import React)
      jsxRuntime: 'automatic'
    }),
    
    // PWA Plugin für Offline-Funktionalität
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      
      // Service Worker Konfiguration
      workbox: {
        // Cache-Strategien
        runtimeCaching: [
          // App Shell - Network First (schnell bei Verbindung, Fallback auf Cache)
          {
            urlPattern: /^https:\/\/.*\.(js|css|html)$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-shell',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 7 * 24 * 60 * 60 // 7 Tage
              }
            }
          },
          
          // API Calls - Network First mit Cache Fallback
          {
            urlPattern: /\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 24 * 60 * 60 // 24 Stunden
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          
          // Statische Assets (Bilder, Fonts) - Cache First
          {
            urlPattern: /\.(png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|eot)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 Tage
              }
            }
          },
          
          // Map Tiles - Cache First (sehr wichtig für Offline-Karten!)
          {
            urlPattern: /^https:\/\/.*tile.*\.png$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 Tage
              }
            }
          },
          
          // OpenStreetMap Tiles
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: {
                maxEntries: 1000,
                maxAgeSeconds: 30 * 24 * 60 * 60
              }
            }
          },
          
          // MapTiler Tiles
          {
            urlPattern: /^https:\/\/api\.maptiler\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'maptiler-tiles',
              expiration: {
                maxEntries: 1000,
                maxAgeSeconds: 30 * 24 * 60 * 60
              }
            }
          },
          
          // 🆕 Mapbox Tiles (Streets, Satellite, Hybrid)
          {
            urlPattern: /^https:\/\/api\.mapbox\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mapbox-tiles',
              expiration: {
                maxEntries: 2000, // Mehr wegen Streets + Satellite
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 Tage
              }
            }
          }
        ],
        
        // Dateien die sofort gecached werden sollen
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,woff,woff2}'
        ],
        
        // Navigation Fallback für SPA
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//]
      },
      
      // Manifest für "Add to Homescreen"
      manifest: {
        name: 'TrapMap - Schädlingsmonitoring',
        short_name: 'TrapMap',
        description: 'Digitales Schädlingsmonitoring System',
        theme_color: '#0d1117',
        background_color: '#0d1117',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      
      // Dev Options
      devOptions: {
        enabled: true, // PWA auch im Dev-Mode testen
        type: 'module'
      }
    })
  ],
  
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  
  build: {
    // Optimierungen für Production
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Console logs behalten für Debugging
        drop_debugger: true
      }
    }
  }
});