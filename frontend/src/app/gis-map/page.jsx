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

  const [geoUnits, setGeoUnits] = useState([]);
  const [stations, setStations] = useState([]);
  const [passages, setPassages] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  function generateColorFromScore(score) {
    // Clamp the score between 0 and 1
    score = Math.min(Math.max(score, 0), 1);

    // Calculate the red and green values based on the score
    const red = Math.floor((1 - score) * 255); // Red decreases as score increases
    const green = Math.floor(score * 255); // Green increases as score increases

    // Return the color in RGB format
    return `rgb(${red}, ${green}, 0)`;
  }

  useEffect(() => {
    console.log("stations:", stations); // Logs when stations are updated
  }, [stations]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      try {
        const [geoUnits, stations, passages] = await Promise.all([
          fetch("http://localhost:3001/get-geounits", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ location: "EDSA" }), // Include body
          }).then((res) => res.json()),

          fetch("http://localhost:3001/get-stations", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ location: "EDSA" }), // Include body
          }).then((res) => res.json()),

          fetch("http://localhost:3001/get-passages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ location: "EDSA" }), // Include body
          }).then((res) => res.json()),
        ]);

        setGeoUnits(geoUnits);
        setStations(stations);
        setPassages(passages);
      } catch (err) {
        setError("Failed to fetch data. Please try again later.");
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    // Define buffer distances (in kilometers)
    const bufferDistances = {
      green: 0.4, // Near
      yellow: 0.8, // Medium
      red: 1.2, // Far
    };

    // Create buffers for each priority
    const buffers = { green: [], yellow: [], red: [] };

    stations.forEach((station) => {
      if (station.location && station.location.coordinates) {
        // Proceed with buffer creation
        buffers.green.push(
          turf.buffer(
            turf.point(station.location.coordinates),
            bufferDistances.green,
            { units: "kilometers" }
          )
        );

        buffers.yellow.push(
          turf.buffer(
            turf.point(station.location.coordinates),
            bufferDistances.yellow,
            { units: "kilometers" }
          )
        );

        buffers.red.push(
          turf.buffer(
            turf.point(station.location.coordinates),
            bufferDistances.red,
            { units: "kilometers" }
          )
        );
        // Do the same for yellow and red buffers
      } else {
        console.warn(`Invalid station data: ${station._id}`);
      }
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

    // Collect all layers (buffers + GeoJSON)
    const layers = [
      ...barangayBoundaryLayer,
      /*...bufferLayers,*/
      ...barangayFillShape,
    ];

    setGeoJsonLayers([...layers].reverse());
  }, [geoUnits, stations, passages]);

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
