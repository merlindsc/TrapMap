// Offline-freundlicher Tile Layer für Maps
import { TileLayer } from 'react-leaflet';
import { useEffect, useRef } from 'react';

const OfflineFriendlyTileLayer = ({ url, ...props }) => {
  const tileLayerRef = useRef();

  useEffect(() => {
    const tileLayer = tileLayerRef.current;
    if (!tileLayer) return;

    const leafletLayer = tileLayer.getLayer ? tileLayer.getLayer() : tileLayer._layer;
    if (!leafletLayer) return;

    // Originale createTile Funktion überschreiben
    const originalCreateTile = leafletLayer.createTile;
    
    leafletLayer.createTile = function(coords, done) {
      const tile = originalCreateTile.call(this, coords, done);
      
      // Fehlerbehandlung für Offline-Situationen
      const originalOnError = tile.onerror;
      tile.onerror = function(e) {
        if (!navigator.onLine) {
          // Offline: Transparentes Bild setzen und Fehler nicht weiterleiten
          tile.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
          if (done) done(null, tile);
          return;
        }
        
        // Online aber Fehler: Normal behandeln
        if (originalOnError) {
          originalOnError.call(this, e);
        }
      };
      
      return tile;
    };
  }, []);

  return <TileLayer ref={tileLayerRef} url={url} {...props} />;
};

export default OfflineFriendlyTileLayer;