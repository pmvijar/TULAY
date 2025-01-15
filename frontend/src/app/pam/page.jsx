"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { point, buffer, featureCollection, union } from "@turf/turf";
import { useMapEvent } from "react-leaflet";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { LayoutDashboard, LogOut, Lightbulb, Footprints } from "lucide-react";

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
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("react-leaflet").then((mod) => mod.Tooltip),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

const GISMapPage = () => {
  const [geoJsonLayers, setGeoJsonLayers] = useState([]);
  const [barangayData, setBarangayData] = useState(null);
  const [stations, setStations] = useState([]);
  const [selectedFeature, setSelectedFeature] = useState(null);

  // Fetch GeoJSON data from backend
  useEffect(() => {
    const fetchGeoJson = async () => {
      try {
        const response = await fetch("http://localhost:3001/get-geounits", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ location: "EDSA" }),
        });
        const data = await response.json();
        setBarangayData(data);
      } catch (error) {
        console.error("Failed to fetch GeoJSON data:", error);
      }
    };

    fetchGeoJson();
  }, []);

  // Fetch station data from backend
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const response = await fetch("http://localhost:3001/get-stations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ location: "EDSA" }),
        });
        const data = await response.json();
        setStations(data);
      } catch (error) {
        console.error("Failed to fetch stations:", error);
      }
    };

    fetchStations();
  }, []);

  // Generate GeoJSON layers
  useEffect(() => {
    if (barangayData) {
      const layers = barangayData.features.map((feature) => ({
        data: feature,
        style: {
          color: feature.properties.color || "black",
          weight: 2,
          fillOpacity: 0.6,
        },
      }));
      setGeoJsonLayers(layers);
    }
  }, [barangayData]);

  const onEachBarangay = (feature, layer) => {
    if (feature.properties && feature.properties.name) {
      layer.bindTooltip(
        `${feature.properties.name} - Accessibility Score: ${feature.properties.accessibilityScore}`
      );

      layer.on("click", () => {
        setSelectedFeature({
          type: "barangay",
          name: feature.properties.name,
          population: feature.properties.population,
          area: feature.properties.area_km2,
        });
      });
    }
  };

  const renderStationMarkers = () => {
    return stations.map((station) => (
      <Marker
        key={station.id}
        position={[station.location.latitude, station.location.longitude]}
        eventHandlers={{
          click: () => {
            setSelectedFeature({
              type: "station",
              name: station.name,
              transportType: station.transport_type.type,
              status: station.transport_type.status,
              latitude: station.location.latitude,
              longitude: station.location.longitude,
            });
          },
        }}
      >
        <Tooltip>{station.name}</Tooltip>
      </Marker>
    ));
  };

  return (
    <div className="min-h-screen flex flex-row">
      <section className="flex flex-col justify-around min-w-56 px-3 bg-white shadow-md rounded-r-3xl">
        <div className="pt-6 pl-3 flex items-center">
          <Image
            src="/lakbai-logo.png"
            alt="LakbAI Logo"
            width={50}
            height={50}
            className="mr-4"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">LakbAI</h1>
            <h2 className="text-xl -mt-2">Analytics</h2>
          </div>
        </div>
        <nav className="my-4 flex flex-col justify-between min-h-[84%]">
          <section>
            <Link href="/dashboard">
              <Button
                variant="ghost"
                className="flex flex-row rounded-lg w-full justify-start px-4 text-left hover:bg-teal-50"
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/recommendations">
              <Button
                variant="ghost"
                className="flex flex-row rounded-lg w-full justify-start px-4 text-left hover:bg-teal-50"
              >
                <Lightbulb className="mr-2 h-4 w-4" />
                Recommendations
              </Button>
            </Link>
            <Link href="/gis-map">
              <Button
                variant="ghost"
                className="flex flex-row rounded-lg w-full justify-start px-4 text-left hover:bg-teal-50"
              >
                <Footprints className="mr-2 h-4 w-4" />
                Pedestrian Mobility Map
              </Button>
            </Link>
          </section>

          <Link href="/">
            <Button
              variant="ghost"
              className="flex flex-row rounded-lg w-full justify-start px-4 text-left text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </Link>
        </nav>
      </section>

      {selectedFeature && (
        <div
          className="absolute top-20 right-10 w-64 bg-white p-4 shadow-lg border border-gray-200 rounded-md"
          style={{
            zIndex: 1000,
          }}
        >
          <h3 className="text-lg font-semibold">{selectedFeature.name}</h3>

          {selectedFeature.type === "barangay" && (
            <>
              <p>Population: {selectedFeature.population || "N/A"}</p>
              <p>Area: {selectedFeature.area || "N/A"} km²</p>
            </>
          )}

          {selectedFeature.type === "station" && (
            <>
              <p>Type: {selectedFeature.transportType}</p>
              <p>Status: {selectedFeature.status}</p>
              <p>
                Coordinates: {selectedFeature.latitude},{" "}
                {selectedFeature.longitude}
              </p>
            </>
          )}

          <button
            className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
            onClick={() => setSelectedFeature(null)} // Close overlay on button click
          >
            Close
          </button>
        </div>
      )}

      <div className="flex-grow">
        <MapContainer
          center={[14.6197, 121.051]}
          zoom={15}
          style={{ height: "100vh", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {geoJsonLayers.map((layer, index) => (
            <GeoJSON
              key={index}
              data={layer.data}
              style={layer.style}
              onEachFeature={onEachBarangay}
            />
          ))}
          {renderStationMarkers()}
        </MapContainer>

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
    </div>
  );
};

export default GISMapPage;
