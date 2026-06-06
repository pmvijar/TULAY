"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

// Pans/zooms the map to a selected feature's bounds. Rendered inside
// MapContainer and dynamically imported (ssr:false) so react-leaflet's hooks
// never run during SSR.
export default function FlyToSelected({ geometry, id }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !geometry?.coordinates) return;
    let minX = 180,
      minY = 90,
      maxX = -180,
      maxY = -90;
    const walk = (a) => {
      if (typeof a[0] === "number") {
        minX = Math.min(minX, a[0]);
        maxX = Math.max(maxX, a[0]);
        minY = Math.min(minY, a[1]);
        maxY = Math.max(maxY, a[1]);
      } else a.forEach(walk);
    };
    walk(geometry.coordinates);
    if (maxX < minX) return;
    map.flyToBounds(
      [
        [minY, minX],
        [maxY, maxX],
      ],
      { padding: [80, 80], duration: 0.6, maxZoom: 15 }
    );
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
