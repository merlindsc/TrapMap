// frontend/src/components/map/LayoutImageMap.jsx
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import BoxMarker from "./BoxMarker";

export default function LayoutImageMap({ layout, boxes, onBoxClick, selectedBox }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!layout || !mapRef.current) return;

    const bounds = [[0, 0], [layout.height, layout.width]];

    const map = L.map(mapRef.current, {
      crs: L.CRS.Simple,
      minZoom: -4,
      maxZoom: 4,
      zoomControl: true,
    });

    L.imageOverlay(layout.image_url, bounds).addTo(map);
    map.fitBounds(bounds);

    mapInstanceRef.current = map;
    setIsReady(true);

    return () => map.remove();
  }, [layout]);

  if (!layout) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-400">
        Kein Lageplan ausgewählt
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full bg-gray-900" />

      {isReady &&
        boxes?.map((box) => (
          <BoxMarker
            key={box.id}
            box={box}
            map={mapInstanceRef.current}
            onClick={onBoxClick}
            isSelected={selectedBox?.id === box.id}
          />
        ))}
    </div>
  );
}
