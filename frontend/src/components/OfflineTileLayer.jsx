/* ============================================================
   TRAPMAP – OFFLINE TILE LAYER
   Custom Leaflet TileLayer der gecachte Tiles nutzt
   
   FEATURES:
   - Prüft erst IndexedDB Cache
   - Fallback auf Online wenn nicht gecacht
   - Unterstützt digitalen Zoom über Max-Zoom
   - Zeigt Platzhalter wenn offline und nicht gecacht
   ============================================================ */

import { useEffect, useRef, useCallback } from 'react';
import { TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { offlineMapService } from '../services/OfflineMapService';

// ============================================
// CUSTOM TILE LAYER CLASS
// ============================================

const createOfflineTileLayerClass = () => {
  return L.TileLayer.extend({
    // Override createTile
    createTile: function(coords, done) {
      const tile = document.createElement('img');
      
      tile.alt = '';
      tile.setAttribute('role', 'presentation');
      
      // Event Handler
      L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile));
      L.DomEvent.on(tile, 'error', L.Util.bind(this._tileOnError, this, done, tile));
      
      if (this.options.crossOrigin || this.options.crossOrigin === '') {
        tile.crossOrigin = this.options.crossOrigin === true ? '' : this.options.crossOrigin;
      }
      
      // Custom Tile Loading
      this._loadTile(tile, coords, done);
      
      return tile;
    },
    
    _loadTile: async function(tile, coords, done) {
      const { x, y } = coords;
      const z = this._getZoomForUrl();
      
      try {
        // 1. Versuche aus Cache zu laden
        const cachedUrl = await offlineMapService.getCachedTile(x, y, z);
        
        if (cachedUrl) {
          tile.src = cachedUrl;
          tile._cachedUrl = cachedUrl; // Für Cleanup
          return;
        }
        
        // 2. Online? → Normal laden
        if (navigator.onLine) {
          tile.src = this.getTileUrl(coords);
          return;
        }
        
        // 3. Offline und nicht gecacht → Platzhalter
        tile.src = 'data:image/svg+xml,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
            <rect width="256" height="256" fill="#1a1a2e"/>
            <text x="128" y="128" text-anchor="middle" fill="#4a4a6a" font-family="system-ui" font-size="12">
              Offline
            </text>
          </svg>
        `);
        
        if (done) done(null, tile);
        
      } catch (error) {
        console.warn('Tile load error:', error);
        
        // Fallback auf normale URL wenn möglich
        if (navigator.onLine) {
          tile.src = this.getTileUrl(coords);
        } else {
          this._tileOnError(done, tile, error);
        }
      }
    },
    
    // Cleanup beim Entfernen von Tiles
    _removeTile: function(key) {
      const tile = this._tiles[key];
      if (tile && tile.el && tile.el._cachedUrl) {
        URL.revokeObjectURL(tile.el._cachedUrl);
      }
      L.TileLayer.prototype._removeTile.call(this, key);
    }
  });
};

// ============================================
// REACT COMPONENT
// ============================================

const OfflineTileLayer = ({ 
  url,
  maxNativeZoom = 18,
  maxZoom = 22,
  ...props 
}) => {
  const map = useMap();
  const tileLayerRef = useRef(null);
  const OfflineTileLayerClass = useRef(null);
  
  useEffect(() => {
    // Custom TileLayer Class erstellen
    if (!OfflineTileLayerClass.current) {
      OfflineTileLayerClass.current = createOfflineTileLayerClass();
    }
    
    // Bestehende Layer entfernen
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    
    // Neue Layer hinzufügen
    const layer = new OfflineTileLayerClass.current(url, {
      maxNativeZoom,
      maxZoom,
      tileSize: 256,
      zoomOffset: 0,
      ...props
    });
    
    layer.addTo(map);
    tileLayerRef.current = layer;
    
    return () => {
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
      }
    };
  }, [map, url, maxNativeZoom, maxZoom]);
  
  return null;
};

export default OfflineTileLayer;

// ============================================
// SIMPLE VERSION (wenn idb nicht verfügbar)
// ============================================

export const SimpleFallbackTileLayer = ({ url, ...props }) => {
  const handleTileError = useCallback((error) => {
    const tile = error.target;
    if (!navigator.onLine) {
      // Offline-Platzhalter
      tile.src = 'data:image/svg+xml,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
          <rect width="256" height="256" fill="#1a1a2e"/>
          <text x="128" y="120" text-anchor="middle" fill="#4a4a6a" font-family="system-ui" font-size="14">
            📍
          </text>
          <text x="128" y="145" text-anchor="middle" fill="#4a4a6a" font-family="system-ui" font-size="11">
            Offline
          </text>
        </svg>
      `);
    }
  }, []);
  
  return (
    <TileLayer 
      url={url}
      eventHandlers={{
        tileerror: handleTileError
      }}
      {...props}
    />
  );
};