import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { getLayout, updateLayout } from "../../api/layouts";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function LayoutEditor() {
  const { id } = useParams();
  const mapRef = useRef(null);
  const [layout, setLayout] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const data = await getLayout(id);
    setLayout(data);
  };

  useEffect(() => {
    if (!layout) return;

    const map = L.map("layoutMap", {
      crs: L.CRS.Simple,
      minZoom: -4,
      maxZoom: 4,
    });

    mapRef.current = map;

    const imgWidth = layout.width;
    const imgHeight = layout.height;

    const bounds = [
      [0, 0],
      [imgHeight, imgWidth],
    ];

    const image = L.imageOverlay(layout.image_url, bounds).addTo(map);

    map.fitBounds(bounds);

  }, [layout]);

  if (!layout) return <div className="text-white dark:text-gray-100">Lade...</div>;

  return (
    <div className="text-white dark:text-gray-100">
      <h1 className="text-3xl font-bold mb-4">{layout.name}</h1>

      <div
        id="layoutMap"
        style={{
          height: "80vh",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      ></div>
    </div>
  );
}
