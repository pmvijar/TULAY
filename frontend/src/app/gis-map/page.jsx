"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import * as turf from "@turf/turf";
import { useMapEvent } from "react-leaflet";

import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import("react-leaflet").then((mod) => mod.GeoJSON),
  {
    ssr: false,
  }
);
const Tooltip = dynamic(
  () => import("react-leaflet").then((mod) => mod.Tooltip),
  {
    ssr: false,
  }
);

const GISMapPage = () => {
  const [geoJsonLayers, setGeoJsonLayers] = useState([]);

  useEffect(() => {
    // Sample points (GeoJSON)
    const points = [
      turf.point([0, 51.505]),
      turf.point([0.01, 51.51]),
      turf.point([0.02, 51.515]),
      turf.point([0.00319, 51.50293]),
    ];

    // Define buffer distances (in kilometers)
    const bufferDistances = {
      green: 0.4, // Near
      yellow: 0.8, // Medium
      red: 1.2, // Far
    };

    // Create buffers for each priority
    const buffers = { green: [], yellow: [], red: [] };

    points.forEach((point) => {
      buffers.green.push(
        turf.buffer(point, bufferDistances.green, { units: "kilometers" })
      );
      buffers.yellow.push(
        turf.buffer(point, bufferDistances.yellow, { units: "kilometers" })
      );
      buffers.red.push(
        turf.buffer(point, bufferDistances.red, { units: "kilometers" })
      );
    });

    console.log("hey:", buffers.green);

    // Function to safely union multiple buffers
    const unionBuffers = (bufferArray) => {
      if (bufferArray.length > 1) {
        return turf.union(turf.featureCollection([...bufferArray])); // Union all buffers
      }
      return bufferArray[0]; // If there's only one buffer, return it as is
    };

    // Apply union for each priority level
    const greenUnion = unionBuffers(buffers.green);
    const yellowUnion = unionBuffers(buffers.yellow);
    const redUnion = unionBuffers(buffers.red);

    const bufferFillOpacity = 0.45;
    const lineOpacity = 0;

    // Define buffer layers with the unioned geometries
    const greenBufferLayer = {
      data: greenUnion,
      style: {
        color: "green",
        fillOpacity: bufferFillOpacity,
        opacity: lineOpacity,
      },
    };

    const yellowBufferLayer = {
      data: yellowUnion,
      style: {
        color: "yellow",
        fillOpacity: bufferFillOpacity,
        opacity: lineOpacity,
      },
    };

    const redBufferLayer = {
      data: redUnion,
      style: {
        color: "red",
        fillOpacity: bufferFillOpacity,
        opacity: lineOpacity,
      },
    };

    const barangayBoundaryLayer = geoUnits.map((geoUnit) => ({
      data: geoUnit.location,
      style: { color: "black", weight: 2, opacity: 1, fillOpacity: 0 },
    }));

    const barangayFillShape = geoUnits.map((geoUnit) => ({
      data: geoUnit.location,
      style: {
        color: generateColorFromScore(geoUnit.proximityScore),
        weight: 2,
        opacity: 1,
        fillOpacity: 0.5,
      },
    }));

    const bufferLayers = [greenBufferLayer, yellowBufferLayer, redBufferLayer];

    // Reverse the layers array
    setGeoJsonLayers([...layers].reverse()); // Reversing before setting state
  }, []);

  // Tooltip on hover to show lat, lon
  function MapWithTooltip() {
    const map = useMapEvent("mousemove", (e) => {
      const { lat, lng } = e.latlng;
      const tooltip = document.getElementById("latlon-tooltip");
      tooltip.innerHTML = `Lat: ${lat.toFixed(6)} | Lng: ${lng.toFixed(6)}`;
      tooltip.style.left = `${e.originalEvent.clientX + 10}px`;
      tooltip.style.top = `${e.originalEvent.clientY + 10}px`;
      tooltip.style.display = "block";
    });

    return null;
  }

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <div
        className="absolute top-20 left-0 w-64 bg-white p-4 shadow-lg"
        style={{
          zIndex: 1000,
        }}
      >
        <h3 className="text-lg font-semibold">Left Panel</h3>
        <p>This is a left-side hovering panel</p>
      </div>

      <div
        className="absolute top-20 right-0 w-64 bg-white p-4 shadow-lg"
        style={{
          zIndex: 1000,
        }}
      >
        <h3 className="text-lg font-semibold">Right Panel</h3>
        <p>This is a right-side hovering panel</p>
      </div>
      <MapContainer
        center={[51.505, -0.09]}
        zoom={13}
        style={{ height: "100vh", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {geoJsonLayers.map((layer, index) => (
          <GeoJSON key={index} data={layer.data} style={layer.style} />
        ))}
        <MapWithTooltip />
        {/* This is the event listener to show the tooltip */}
      </MapContainer>

      {/* Tooltip HTML element */}
      <div
        id="latlon-tooltip"
        style={{
          position: "absolute",
          background: "white",
          padding: "5px",
          borderRadius: "5px",
          pointerEvents: "none",
          display: "none",
          zIndex: 1000,
        }}
      >
        Lat: -- | Lng: --
      </div>
    </div>
  );
};

export default GISMapPage;
