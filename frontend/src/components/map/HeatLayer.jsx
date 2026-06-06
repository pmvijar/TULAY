"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

// Priority heat layer over barangay centroids. Dynamically imported (ssr:false)
// so leaflet + leaflet.heat never load during SSR. points: [lat, lon, weight].
export default function HeatLayer({ points }) {
  const map = useMap();
  useEffect(() => {
    let layer;
    let cancelled = false;
    (async () => {
      const Lmod = await import("leaflet");
      await import("leaflet.heat");
      const L = Lmod.default || Lmod;
      if (cancelled || !points?.length) return;
      layer = L.heatLayer(points, {
        radius: 16,
        blur: 20,
        maxZoom: 13,
        minOpacity: 0.25,
        gradient: {
          0.0: "#1e9e6a",
          0.4: "#d9c23a",
          0.7: "#e07a2e",
          1.0: "#d13b2a",
        },
      }).addTo(map);
    })();
    return () => {
      cancelled = true;
      if (layer && map) map.removeLayer(layer);
    };
  }, [points, map]);
  return null;
}
