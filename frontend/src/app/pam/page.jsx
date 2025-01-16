"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import L from "leaflet";
import { point, buffer, featureCollection, union } from "@turf/turf";
import { useMapEvent } from "react-leaflet";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  LayoutDashboard,
  LogOut,
  Lightbulb,
  Footprints,
  TrainFront,
} from "lucide-react";
import ReactDOMServer from "react-dom/server";

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

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

const customDivIcon = L.divIcon({
  className: "custom-div-icon", // Add a base class for potential extensions
  html: ReactDOMServer.renderToString(
    <div className="flex items-center justify-center w-10 h-10 bg-white border-2 border-black rounded-full shadow-md">
      <TrainFront className="w-6 h-6 text-black" />
    </div>
  ),
  iconSize: [40, 40], // Size of the outer circle
  iconAnchor: [20, 20], // Anchor point in the center of the circle
});

const GISMapPage = () => {
  const [geoJsonLayers, setGeoJsonLayers] = useState([]);
  const [barangayData, setBarangayData] = useState(null);
  const [selectedBarangay, setSelectedBarangay] = useState(null); // To track the clicked barangay
  const [selectedStation, setSelectedStation] = useState(null); // For clicked station details
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [geoUnits, setGeoUnits] = useState([]);
  const [stations, setStations] = useState([]);
  const [passages, setPassages] = useState([]);
  const [selectedFeature, setSelectedFeature] = useState(null); // Unified state for selected barangay or station

  const renderStationMarkers = () => {
    const renderedNames = new Set();

    return stations
      .filter((station) => station.name && station.name !== "N/A")
      .filter((station) => {
        if (renderedNames.has(station.name)) {
          return false;
        } else {
          renderedNames.add(station.name);
          return true;
        }
      })
      .map((station) => (
        <Marker
          key={station.id}
          position={[
            station.location.coordinates[1],
            station.location.coordinates[0],
          ]}
          icon={customDivIcon}
          eventHandlers={{
            click: () => {
              setSelectedFeature({
                type: "station",
                name: station.name,
                transportType: station.transport_type.type,
                status: station.transport_type.status,
                latitude: station.location.coordinates[1],
                longitude: station.location.coordinates[0],
              });
            },
          }}
        >
          <Tooltip>{station.name}</Tooltip>
        </Marker>
      ));
  };

  const generateColorFromScore = (score) => {
    // Clamp the score between 0 and 1
    score = Math.min(Math.max(score, 0), 1);

    // Calculate the red and green values based on the score
    const red = Math.floor((1 - score) * 255); // Red decreases as score increases
    const green = Math.floor(score * 255); // Green increases as score increases

    // Return the color in RGB format
    return `rgb(${red}, ${green}, 0)`;
  };

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

        const enrichedGeoUnits = geoUnits.map((unit) => ({
          type: "Feature",
          properties: {
            id: unit._id,
            name: unit.name || "Unnamed GeoUnit",
            postalCode: unit.postalCode || "N/A",
            area: unit.area,
            population: unit.population,
            color: generateColorFromScore(unit.proximityScore) || "gray",
            proximityScore: unit.proximityScore || 0,
            fillOpacity: 0.3,
          },
          geometry: unit.location, // Use the location field directly
        }));

        setGeoJsonLayers(
          enrichedGeoUnits.map((feature) => ({
            data: feature,
            style: {
              color: "gray", // Outline color
              weight: 1, // Border thickness
              fillOpacity: 0.5, // Fill transparency
              fillColor: feature.properties.color, // Use generated color
            },
          }))
        );

        setStations(stations);
        setPassages(passages);
        console.log("stations:", stations); // Logs when stations are updated
        console.log("passages:", passages); // Logs when passages are updated
        console.log("geoUnits:", geoUnits); // Logs when geoUnits are updated
      } catch (err) {
        setError("Failed to fetch data. Please try again later.");
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const barangayStyle = (feature) => ({
    color: "black", // Outline color
    weight: 2, // Outline thickness
    fillColor: feature.properties.color, // Color based on accessibility score
    fillOpacity: 0.6, // Transparency of the fill
  });

  const geoUnitStyle = (feature) => ({
    color: "black", // Strong outline color
    weight: 2, // Outline thickness (increase for more visibility)
    opacity: 1, // Fully opaque outline
    fillColor: feature.properties.color || "gray", // Fill color based on property
    fillOpacity: 0.5, // Transparency of the fill
  });

  const onEachBarangay = (feature, layer) => {
    if (feature.properties) {
      // Bind a tooltip to display the name and accessibility score
      layer.bindTooltip(
        `${feature.properties.name} - Accessibility Score: ${feature.properties.proximityScore}`
      );

      // Add a click event listener to the layer
      layer.on("click", () => {
        console.log("Feature:", feature);
        setSelectedFeature({
          type: "barangay",
          name: feature.properties.name,
          population: feature.properties.population || "Unknown",
          area: feature.properties.area || "Unknown",
          proximityScore: feature.properties.proximityScore || "Unknown",
        });
      });
    }
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

  // Function to generate colors based on the proximity score

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg font-semibold">Loading...</p>
      </div>
    );
  }

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
          center={[14.6197, 121.051]} // Coordinates for Cubao, Araneta City
          zoom={15} // Adjusted zoom level for a detailed view of the area
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

          <MapWithTooltip />
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
    </div>
  );
};

export default GISMapPage;
