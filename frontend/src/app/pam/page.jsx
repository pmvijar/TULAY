"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import L from "leaflet";
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
  BusFront,
  X,
  Rows4,
  TriangleAlert,
  Move,
  PersonStanding,
} from "lucide-react";
import ReactDOMServer from "react-dom/server";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import * as RadioGroup from "@radix-ui/react-radio-group";
import "react-circular-progressbar/dist/styles.css";
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

const TrainIcon = L.divIcon({
  className: "custom-div-icon", // Add a base class for potential extensions
  html: ReactDOMServer.renderToString(
    <div className="flex items-center justify-center w-10 h-10 bg-white opacity-80 border-1 border-gray-600 rounded-full shadow-md">
      <TrainFront className="w-6 h-6 text-blue-600" />
    </div>
  ),
  iconSize: [40, 40], // Size of the outer circle
  iconAnchor: [20, 20], // Anchor point in the center of the circle
});

const BusIcon = L.divIcon({
  className: "custom-div-icon", // Add a base class for potential extensions
  html: ReactDOMServer.renderToString(
    <div className="flex items-center justify-center w-10 h-10 bg-white opacity-50 border-1 border-gray-600 rounded-full shadow-md">
      <BusFront className="w-6 h-6 text-blue-600" />
    </div>
  ),
  iconSize: [40, 40], // Size of the outer circle
  iconAnchor: [20, 20], // Anchor point in the center of the circle
});

const PassageIcon = L.divIcon({
  className: "custom-div-icon", // Base class for styling
  html: ReactDOMServer.renderToString(
    <div className="flex items-center justify-center w-6 h-6 bg-gray-800 opacity-80 border-1 border-gray-500 rounded-full shadow-md">
      <Rows4 className="w-4 h-4 text-white" />
    </div>
  ),
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const LayerSelector = ({ activeLayer, setActiveLayer }) => {
  const layers = [
    {
      label: "Mobility",
      value: "mobility",
      icon: <Move className="w-4 h-4 text-blue-500" />,
      // description: "Tracks stations and routes.",
    },
    {
      label: "Safety",
      value: "safety",
      icon: <TriangleAlert className="w-4 h-4 text-yellow-300" />,
      // description: "Tracks passages and incidents.",
    },
    {
      label: "Accessibility",
      value: "accessibility",
      icon: <PersonStanding className="w-4 h-4 text-green-500" />,
      // description: "Tracks roads and sidewalks.",
    },
  ];

  return (
    <div
      className="absolute left-80 transform bottom-20 bg-white opacity-95 shadow-lg rounded-md p-3"
      style={{
        zIndex: 1000, // Ensure it appears above the map
        width: "200px", // Adjust width if needed
      }}
    >
      <RadioGroup.Root
        value={activeLayer}
        onValueChange={(value) => setActiveLayer(value)}
        className="space-y-2 flex flex-col"
      >
        {layers.map((layer) => (
          <RadioGroup.Item
            key={layer.value}
            value={layer.value}
            className={`cursor-pointer border border-gray-300 rounded-md py-3 px-4 flex items-center space-x-3 ${
              activeLayer === layer.value
                ? "bg-blue-50 border-blue-400"
                : "hover:border-gray-400"
            }`}
          >
            {layer.icon} {/* Render the icon */}
            <div className="flex flex-col text-gray-600">
              <span className="text-sm font-semibold">{layer.label}</span>
            </div>
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </div>
  );
};

const GISMapPage = () => {
  const [geoJsonLayers, setGeoJsonLayers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [geoUnits, setGeoUnits] = useState([]);
  const [stations, setStations] = useState([]);
  const [passages, setPassages] = useState([]);
  const [selectedFeature, setSelectedFeature] = useState(null); // Unified state for selected barangay or station
  const [activeLayers, setActiveLayers] = useState({
    mobility: true,
    safety: false,
    accessibility: false,
  });
  const [activeLayer, setActiveLayer] = useState("accessibility");

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
          icon={station.transportType[0] === "train" ? TrainIcon : BusIcon} // Conditional icon
          eventHandlers={{
            click: () => {
              const updatedStation = { ...station, type: "station" }; // Add type: "station"
              console.log("Selected Station:", updatedStation);
              setSelectedFeature(updatedStation);
            },
          }}
        >
          <Tooltip>{station.name}</Tooltip>
        </Marker>
      ));
  };

  const renderPassageMarkers = () => {
    const renderedPassages = new Set();

    return passages
      .filter((passage) => passage.osm_id && passage.osm_id !== "N/A")
      .filter((passage) => {
        if (renderedPassages.has(passage.osm_id)) {
          return false;
        } else {
          renderedPassages.add(passage.osm_id);
          return true;
        }
      })
      .map((passage) => (
        <Marker
          key={passage.osm_id}
          position={[
            passage.location.coordinates[1],
            passage.location.coordinates[0],
          ]}
          icon={PassageIcon}
          eventHandlers={{
            click: () => {
              // const updatedPassage = { ...passage, type: "passage" };
              // console.log("Selected Passage:", updatedPassage);
              // setSelectedFeature(updatedPassage);
            },
          }}
        >
          <Tooltip>
            {passage.type.charAt(0).toUpperCase() + passage.type.slice(1)}
          </Tooltip>
        </Marker>
      ));
  };

  const generateColorFromScore = (score) => {
    // Clamp the score between 0 and 1
    score = Math.min(Math.max(score, 0), 1);

    let red, green;

    if (score < 0.5) {
      // Transition from red to yellow
      red = 255;
      green = Math.floor(score * 2 * 255);
    } else {
      // Transition from yellow to green
      red = Math.floor((1 - score) * 2 * 255);
      green = 255;
    }

    // Return the color in RGB format
    return `rgb(${red}, ${green}, 0)`;
  };

  const getRoadColor = (hasSidewalk) => (hasSidewalk ? "green" : "red");

  const getSidewalkColor = (sidewalkType) => {
    switch (sidewalkType) {
      case "both":
        return "green";
      case "separate":
        return "yellow";
      case "none":
      case "unknown":
      default:
        return "gray"; // Optional for visualization
    }
  };

  const renderGeoJsonLayers = () => {
    return geoUnits.map((geoUnit) => {
      // Select the score based on the active layer
      const score =
        activeLayer === "accessibility"
          ? geoUnit.properties.accessibilityScore
          : activeLayer === "safety"
          ? geoUnit.properties.safetyScore
          : geoUnit.properties.mobilityScore;

      // Generate color based on the selected score
      const color = generateColorFromScore(score);

      return (
        <GeoJSON
          key={geoUnit.properties.id}
          data={geoUnit} // GeoJSON data
          style={{
            color: "gray", // Outline color
            weight: 1.3, // Border thickness
            fillOpacity: 0.2, // Transparency
            fillColor: color, // Use the dynamically generated color
          }}
          onEachFeature={onEachBarangay} // Pass the function here
        />
      );
    });
  };

  const ProgressIndicator = ({ score, label }) => {
    return (
      <div
        style={{
          position: "relative",
          width: 120,
          height: 120,
          textAlign: "center",
        }}
      >
        <CircularProgressbar
          value={score}
          text={``} // Remove the percentage text from CircularProgressbar
          styles={buildStyles({
            pathColor:
              score > 90
                ? "#4CAF50" // Green
                : score > 80
                ? "#8BC34A" // Light Green
                : score > 60
                ? "#FFC107" // Yellow
                : score > 40
                ? "#FF9800" // Orange
                : score > 20
                ? "#F44336" // Red
                : "#D32F2F", // Dark Red
            textColor: "#3A3D46", // Text color
            trailColor: "#d6d6d6", // Gray background trail
            textSize: "16px", // Adjust font size
          })}
        />
        {/* Custom text and label inside the circle */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "#3A3D46",
            fontSize: "18px",
            fontWeight: "bold",
            lineHeight: "1.2",
          }}
        >
          <div>{`${score}%`}</div> {/* Score */}
          <div
            style={{
              fontSize: "10px",
              fontWeight: "bold",
              marginTop: "4px",
              opacity: "0.6",
            }}
          >
            {label}
          </div>{" "}
          {/* Label */}
        </div>
      </div>
    );
  };

  const renderRoads = () => {
    console.log("Geo Units Before:", geoUnits);
    return geoUnits.flatMap((geoUnit) =>
      geoUnit.properties.roadsWithin.roads
        .filter((road) => !road.hasSidewalk) // Only render roads without sidewalks
        .map((road) => (
          <GeoJSON
            key={road.osm_id}
            data={{
              type: "Feature",
              properties: { hasSidewalk: road.hasSidewalk },
              geometry: road.location,
            }}
            style={{
              color: "red", // Red for roads without sidewalks
              weight: 4,
              opacity: 0.6,
            }}
            onEachFeature={(feature, layer) => {
              const label = "Missing sidewalks on both sides";
              layer.bindTooltip(label);
            }}
          />
        ))
    );
  };

  const renderSidewalks = () => {
    return geoUnits.flatMap((geoUnit) =>
      geoUnit.properties.sidewalksWithin.sidewalks.map((sidewalk) => (
        <GeoJSON
          key={sidewalk.osm_id}
          data={{
            type: "Feature",
            properties: { sidewalkType: sidewalk.sidewalkType },
            geometry: sidewalk.location,
          }}
          style={{
            color: sidewalk.sidewalkType === "both" ? "green" : "yellow", // Green for both, yellow for others
            weight: 4,
            opacity: 0.6,
          }}
          onEachFeature={(feature, layer) => {
            const label =
              sidewalk.sidewalkType === "both"
                ? "Has sidewalks on both sides"
                : "Missing sidewalk on one side";
            layer.bindTooltip(label);
          }}
        />
      ))
    );
  };

  const getSidewalkLabel = (sidewalkType) => {
    switch (sidewalkType) {
      case "both":
        return "Has sidewalks on both sides";
      case "left":
      case "right":
        return "Missing sidewalk on one side";
      case "none":
      case "unknown":
      default:
        return "Missing sidewalks on both sides";
    }
  };

  const getRoadLabel = (hasSidewalk) =>
    hasSidewalk
      ? "Has sidewalks on both sides"
      : "Missing sidewalks on both sides";

  const onEachRoad = (feature, layer) => {
    const label = getRoadLabel(feature.properties.hasSidewalk);
    layer.bindTooltip(label);
  };

  const onEachSidewalk = (feature, layer) => {
    const label = getSidewalkLabel(feature.properties.sidewalkType);
    layer.bindTooltip(label);
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

        // setGeoUnits(geoUnits);

        const enrichedGeoUnits = geoUnits.map((unit) => {
          const sidewalkRatio =
            unit.roadsWithin.roadLength !== 0
              ? unit.sidewalksWithin.sidewalkLength /
                unit.roadsWithin.roadLength
              : undefined;

          return {
            type: "Feature",
            properties: {
              id: unit._id,
              name: unit.name || "Unnamed GeoUnit",
              postalCode: unit.postalCode || "N/A",
              area: unit.area,
              population: unit.population,
              roadsWithin: unit.roadsWithin,
              sidewalksWithin: unit.sidewalksWithin,
              // color: generateColorFromScore(unit.proximityScore) || "gray",
              proximityScore: unit.proximityScore || 0,
              fillOpacity: 0.4,
              ...(sidewalkRatio !== undefined && { sidewalkRatio }), // Add sidewalkRatio only if it's defined
              ...(unit.injuryRate !== undefined && {
                injuryRate: unit.injuryRate,
              }), // Add injuryRate only if it exists
              ...(unit.fatalityRate !== undefined && {
                fatalityRate: unit.fatalityRate,
              }), // Add fatalityRate only if it exists
              // accessibilityScore: 0.6, // Placeholder value
              accessibilityScore: unit.accessibilityScore,
              mobilityScore: unit.mobilityScore,
              safetyScore: unit.safetyScore,
              // mobilityScore: 0.4, // Placeholder value
              // safetyScore: 0.2, // Placeholder value
            },
            geometry: unit.location, // Use the location field directly
          };
        });

        setGeoUnits(enrichedGeoUnits);

        // setGeoJsonLayers(
        //   console.log("Enriched Geo Units:", enrichedGeoUnits) ||
        //     enrichedGeoUnits.map((geoUnit) => ({
        //       data: geoUnit,
        //       style: {
        //         color: "gray", // Outline color
        //         weight: 1.3, // Border thickness
        //         fillOpacity: 0.2, // Fill transparency
        //         fillColor: generateColorFromScore(
        //           geoUnit.properties.proximityScore
        //         ), // Use generated color
        //       },
        //     }))
        // );

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

  const onEachBarangay = (feature, layer) => {
    if (feature.properties) {
      // Bind a tooltip to display the name and accessibility score
      layer.bindTooltip(`${feature.properties.name}`);

      // Add a click event listener to the layer
      layer.on("click", () => {
        const updatedProperties = { ...feature.properties, type: "geounit" };
        console.log("Selected Geo Unit:", updatedProperties);
        setSelectedFeature(updatedProperties);
      });
    }
  };

  // Tooltip on hover to show lat, long
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
    <div className="min-h-screen flex flex-row relative">
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
                Pedestrian Accessibility Map
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
          className="absolute top-20 right-10 w-48 bg-white p-4 shadow-lg border border-gray-200 rounded-md"
          style={{
            zIndex: 1000,
          }}
        >
          <h1 className="font-bold text-xs text-gray-500">
            {selectedFeature.type === "geounit"
              ? "Barangay"
              : "Station - " +
                selectedFeature.transportType[0].charAt(0).toUpperCase() +
                selectedFeature.transportType[0].slice(1)}
          </h1>

          <div className="flex flex-col">
            <div className="flex flex-row justify-between">
              <h3 className="text-lg font-semibold">{selectedFeature.name}</h3>
              <button
                className=" text-gray flex flex-col items-start"
                onClick={() => setSelectedFeature(null)}
              >
                <X />
              </button>
            </div>

            {selectedFeature.type === "geounit" && (
              <div classname="flex flex-col">
                {/* <div
                  style={{ color: selectedFeature.color }}
                  className="text-sm"
                >
                  {selectedFeature.proximityScore > 0.7 ? (
                    <h1 className="text-sm">Highly Accessible</h1>
                  ) : selectedFeature.proximityScore > 0.5 ? (
                    <h1>Moderately Accessible</h1>
                  ) : selectedFeature.proximityScore > 0.2 ? (
                    <h1>Less Accessible</h1>
                  ) : (
                    <h1>Not Accessible</h1>
                  )}
                </div> */}
                <div className="flex flex-col my-4 space-y-4 items-center">
                  <ProgressIndicator
                    score={Math.round(selectedFeature.accessibilityScore * 100)}
                    label="Accessibility"
                  />
                  <ProgressIndicator
                    score={Math.round(selectedFeature.mobilityScore * 100)}
                    label="Mobility"
                  />
                  <ProgressIndicator
                    score={Math.round(selectedFeature.safetyScore * 100)}
                    label="Safety"
                  />
                </div>
              </div>
            )}

            {selectedFeature.type === "station" && <></>}
          </div>
        </div>
      )}
      <LayerSelector
        activeLayer={activeLayer}
        setActiveLayer={setActiveLayer}
      />

      <div className="flex-grow">
        <MapContainer
          center={[14.6197, 121.051]} // Coordinates for Cubao, Araneta City
          zoom={15} // Adjusted zoom level for a detailed view of the area
          style={{ height: "100vh", width: "100%", zIndex: 1 }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {renderGeoJsonLayers()}
          {activeLayer == "mobility" && renderStationMarkers()}
          {activeLayer == "safety" && renderPassageMarkers()}
          {activeLayer == "accessibility" && renderRoads()}
          {activeLayer == "accessibility" && renderSidewalks()}

          {/* <MapWithTooltip /> */}
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
