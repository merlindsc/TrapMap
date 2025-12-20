/* ============================================================
   TRAPMAP - MAP CONTROLS CONTEXT
   Shared state for map controls (satellite toggle, object creation)
   between Maps page and DashboardLayout navbar
   ============================================================ */

import React, { createContext, useContext, useState } from "react";

const MapControlsContext = createContext({
  mapStyle: "streets",
  setMapStyle: () => {},
  objectPlacingMode: false,
  setObjectPlacingMode: () => {},
  isMapView: false,
  setIsMapView: () => {},
});

export function useMapControls() {
  return useContext(MapControlsContext);
}

export function MapControlsProvider({ children }) {
  const [mapStyle, setMapStyle] = useState("streets");
  const [objectPlacingMode, setObjectPlacingMode] = useState(false);
  const [isMapView, setIsMapView] = useState(false);

  return (
    <MapControlsContext.Provider 
      value={{ 
        mapStyle, 
        setMapStyle, 
        objectPlacingMode, 
        setObjectPlacingMode,
        isMapView,
        setIsMapView
      }}
    >
      {children}
    </MapControlsContext.Provider>
  );
}
