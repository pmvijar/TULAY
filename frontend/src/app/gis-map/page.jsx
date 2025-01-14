"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import * as turf from "@turf/turf";
import { useMapEvent } from "react-leaflet";
import qcBarangays from "@/geojson/qc_barangays.geojson";
import qcTrainStations from "@/geojson/qc_train_stations.geojson";

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
  const [selectedBarangay, setSelectedBarangay] = useState(null);

  const createPolygonLayer = (geoJsonData) => {
    return geoJsonData.features; // Return GeoJSON features directly without transformation
  };

  useEffect(() => {
    // Sample points (GeoJSON)
    const points = qcTrainStations.features
      .map((feature) => {
        const { geometry } = feature;

        if (geometry.type === "Point") {
          // Use the coordinates directly
          return turf.point(geometry.coordinates);
        } else if (
          geometry.type === "Polygon" ||
          geometry.type === "LineString"
        ) {
          // Calculate centroid
          const centroid = turf.centroid(geometry);
          return turf.point(centroid.geometry.coordinates);
        }

        // Ignore unsupported geometry types
        return null;
      })
      .filter(Boolean); // Remove null values

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

    const barangayPolygonLayer = createPolygonLayer(qcBarangays);

    const barangayBoundaryLayer = barangayPolygonLayer.map((feature) => ({
      data: feature,
      style: { color: "black", weight: 2, opacity: 1, fillOpacity: 0 },
    }));

    const barangayFillShape = barangayPolygonLayer.map((feature) => ({
      data: feature,
      style: { color: "gray", weight: 2, opacity: 1, fillOpacity: 0.5 },
    }));

    // Collect all layers (buffers + GeoJSON)
    const layers = [
      ...barangayBoundaryLayer,
      greenBufferLayer,
      yellowBufferLayer,
      redBufferLayer,
      ...barangayFillShape,
    ];

    setGeoJsonLayers([...layers].reverse());
  }, []);

  const onBarangayClick = (e) => {
    const { properties } = e.target.feature;
    setSelectedBarangay(properties);
  };

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
      {/* Display selected barangay info if exists */}
      {selectedBarangay && (
        <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-white p-4 shadow-lg z-50">
          <h3 className="text-xl font-semibold">{selectedBarangay.name}</h3>
          <p>Proximity Score: {selectedBarangay.proximityScore}</p>
        </div>
      )}
      <MapContainer
        center={[14.651675, 121.049444]}
        zoom={13}
        style={{ height: "100vh", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          zIndex={100000}
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
