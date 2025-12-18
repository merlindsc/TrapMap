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
          
          // 🗺️ Mapbox Tiles (Hauptkarten: Streets, Satellite, Hybrid)
          {
            urlPattern: /^https:\/\/api\.mapbox\.com\/styles\/v1\/mapbox\/.+\/tiles\/512\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mapbox-tiles',
              expiration: {
                maxEntries: 2000, // Weniger Tiles da 512px = 4x effizienter
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 Tage
              },
              cacheableResponse: {
                statuses: [200]
              },
              // 📴 Offline-Fallback: Leere Response wenn offline
              plugins: [{
                cacheKeyWillBeUsed: async ({request}) => request.url,
                requestWillFetch: async ({request}) => {
                  if (!navigator.onLine) {
                    // Offline: Versuche aus Cache zu laden
                    const cache = await caches.open('mapbox-tiles');
                    const cachedResponse = await cache.match(request);
                    if (!cachedResponse) {
                      // Kein Cache: Transparentes 1x1 Pixel PNG zurückgeben
                      const transparentPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
                      return new Response(await (await fetch(transparentPng)).blob(), {
                        status: 200,
                        statusText: 'OK',
                        headers: {'Content-Type': 'image/png'}
                      });
                    }
                  }
                  return fetch(request);
                }
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