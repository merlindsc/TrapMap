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
          // App Shell - StaleWhileRevalidate (schneller Start, dann Update)
          {
            urlPattern: /^https:\/\/.*\.(js|css|html)$/,
            handler: 'StaleWhileRevalidate',
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
                maxAgeSeconds: 6 * 60 * 60 // 6 Stunden (kürzer für frischere Daten)
              },
              networkTimeoutSeconds: 15,
              cacheableResponse: {
                statuses: [0, 200, 201, 204]
              },
              plugins: [{
                cacheKeyWillBeUsed: async ({request}) => {
                  // Remove auth headers from cache key
                  const url = new URL(request.url);
                  return url.href;
                }
              }]
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
          
          // 🗺️ Mapbox Tiles (alle Tile-Varianten, inkl. digitaler Zoom)
          {
            urlPattern: /^https:\/\/api\.mapbox\.com\/styles\/v1\/mapbox\/.+\/tiles\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mapbox-tiles',
              expiration: {
                maxEntries: 2000, // 512px und 256px Tiles, digitaler Zoom
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 Tage
              },
              cacheableResponse: {
                statuses: [200]
              },
              plugins: [{
                cacheKeyWillBeUsed: async ({request}) => request.url
              }]
            }
          },
          
          // 🌍 OSM Tiles (nur für Mini-Karten in Dialogen)
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: {
                maxEntries: 500, // Weniger, da nur Mini-Karten
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
      
      // Dev Options - SERVICE WORKER DEAKTIVIERT FÜR DEBUGGING
      devOptions: {
        enabled: false, // PWA im Dev-Mode deaktiviert
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
        drop_console: true, // Console logs entfernen für Production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      },
      mangle: true,
      format: {
        comments: false
      }
    },
    
    // Chunk Splitting für besseres Caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-leaflet': ['leaflet', 'react-leaflet'],
          'vendor-icons': ['lucide-react', '@heroicons/react'],
          'vendor-utils': ['axios']
        },
        // Asset Naming für besseres Caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const ext = assetInfo.name.split('.').pop();
          if (/png|jpe?g|svg|gif|webp|ico/i.test(ext)) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          if (ext === 'css') {
            return 'assets/css/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },
    
    // Chunk Size Warnung
    chunkSizeWarningLimit: 500,
    
    // CSS Code Splitting
    cssCodeSplit: true,
    
    // Target für moderne Browser
    target: 'es2020'
  }
});