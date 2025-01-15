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

const GISMapPage = () => {
  const [geoJsonLayers, setGeoJsonLayers] = useState([]);
  const [barangayData, setBarangayData] = useState(null);
  const [selectedBarangay, setSelectedBarangay] = useState(null); // To track the clicked barangay
  const [selectedStation, setSelectedStation] = useState(null); // For clicked station details
  const [selectedFeature, setSelectedFeature] = useState(null); // Unified state for selected barangay or station

  const renderStationMarkers = (map) => {
    transportStations.forEach((station) => {
      const marker = L.marker([
        station.location.latitude,
        station.location.longitude,
      ])
        .addTo(map)
        .bindPopup(
          `<strong>${station.name}</strong><br/>Type: ${station.transport_type.type}<br/>Status: ${station.transport_type.status}`
        );

      marker.on("click", (event) => {
        // Update state to display the overlay
        const { lat, lng } = marker.getLatLng();
        setSelectedStation({
          name: "Station Name", // Replace with dynamic station name
          type: "bus_stop", // Replace with dynamic transport type
          status: "active", // Replace with dynamic status
          latitude: lat,
          longitude: lng,
        });
      });
    });
  };

  useEffect(() => {
    // Sample points (GeoJSON)
    const points = [
      point([0, 51.505]),
      point([0.01, 51.51]),
      point([0.02, 51.515]),
      point([0.00319, 51.50293]),
    ];

    // Define buffer distances (in kilometers)
    const bufferDistances = {
      green: 0.2, // Near
      yellow: 0.5, // Medium
      red: 1.0, // Far
    };

    // Create buffers for each priority
    const buffers = { green: [], yellow: [], red: [] };

    points.forEach((p) => {
      buffers.green.push(
        buffer(p, bufferDistances.green, { units: "kilometers" })
      );
      buffers.yellow.push(
        buffer(p, bufferDistances.yellow, { units: "kilometers" })
      );
      buffers.red.push(buffer(p, bufferDistances.red, { units: "kilometers" }));
    });

    // Function to safely union multiple buffers
    const unionBuffers = (bufferArray) => {
      if (bufferArray.length > 1) {
        return union(featureCollection([...bufferArray])); // Use imported union and featureCollection
      }
      return bufferArray[0]; // If there's only one buffer, return it as is
    };

    // Apply union for each priority level
    const greenUnion = unionBuffers(buffers.green);
    const yellowUnion = unionBuffers(buffers.yellow);
    const redUnion = unionBuffers(buffers.red);

    const bufferFillOpacity = 0.25;

    // Define buffer layers with the unioned geometries
    const greenBufferLayer = {
      data: greenUnion,
      style: { color: "green", fillOpacity: bufferFillOpacity },
    };

    const yellowBufferLayer = {
      data: yellowUnion,
      style: { color: "yellow", fillOpacity: bufferFillOpacity },
    };

    const redBufferLayer = {
      data: redUnion,
      style: { color: "red", fillOpacity: bufferFillOpacity },
    };

    // Collect all layers
    const layers = [greenBufferLayer, yellowBufferLayer, redBufferLayer];

    // Reverse the layers array
    setGeoJsonLayers([...layers].reverse()); // Reversing before setting state

    fetch("/export.geojson") // Replace with the actual GeoJSON file path
      .then((response) => response.json())
      .then((data) => setBarangayData(data));
  }, []);

  const barangayStyle = (feature) => ({
    color: "black", // Outline color
    weight: 2, // Outline thickness
    fillColor: feature.properties.color, // Color based on accessibility score
    fillOpacity: 0.6, // Transparency of the fill
  });

  const stationData = [
    {
      id: "lrt2_araneta_cubao",
      name: "LRT 2 Araneta-Cubao",
      location: { latitude: 14.619868, longitude: 121.051788 },
      transport_type: { type: "metro_station", status: "active" },
    },
    {
      id: "mrt3_cubao",
      name: "MRT 3 Cubao",
      location: { latitude: 14.61999824231889, longitude: 121.0510807286994 }, // 14.61999824231889, 121.0510807286994
      transport_type: { type: "metro_station", status: "active" },
    },
    {
      id: "ali_mall_bus_stop",
      name: "Bus Stop on Ali Mall",
      location: { latitude: 14.6195, longitude: 121.0537 },
      transport_type: { type: "bus_stop", status: "active" },
    },
    {
      id: "p_tuazon_bus_stop",
      name: "P. Tuazon Bus Stop",
      location: { latitude: 14.6205, longitude: 121.0592 },
      transport_type: { type: "bus_stop", status: "active" },
    },
    {
      id: "lrt2_betty_go_belmonte",
      name: "LRT 2 Betty Go-Belmonte",
      location: { latitude: 14.616297, longitude: 121.048882 },
      transport_type: { type: "metro_station", status: "active" },
    },
  ];

  const barangayDataWithScores = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          name: "Socorro",
          accessibilityScore: 90, // Green
          color: "green",
          population: 30000,
          area_km2: 2.5,
          postal_code: "1109",
        },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [121.0550436, 14.6109072],
              [121.0552177, 14.6109504],
              [121.0552852, 14.6109665],
              [121.0553268, 14.6109763],
              [121.0553659, 14.6109856],
              [121.0555553, 14.6110306],
              [121.0559386, 14.6111215],
              [121.056597, 14.6112811],
              [121.0572248, 14.6114389],
              [121.0574759, 14.6114977],
              [121.0576848, 14.6115467],
              [121.0578829, 14.6115931],
              [121.0585176, 14.6117418],
              [121.0591756, 14.611896],
              [121.0594777, 14.6119668],
              [121.0596846, 14.6120153],
              [121.060171, 14.6121293],
              [121.0606289, 14.6122365],
              [121.0610227, 14.6123337],
              [121.0610757, 14.6123453],
              [121.0614284, 14.6124294],
              [121.0616156, 14.6124761],
              [121.0618918, 14.612545],
              [121.0626436, 14.6127272],
              [121.0627345, 14.6127492],
              [121.0626932, 14.6128605],
              [121.0625488, 14.6131947],
              [121.0621926, 14.6140191],
              [121.0621741, 14.6140647],
              [121.0618879, 14.6147701],
              [121.0618528, 14.6148549],
              [121.0618185, 14.6149421],
              [121.0617291, 14.6151546],
              [121.0616621, 14.6153064],
              [121.0615905, 14.6154668],
              [121.0614708, 14.6157801],
              [121.0614542, 14.6158235],
              [121.0610971, 14.6166946],
              [121.0604683, 14.6180432],
              [121.0594669, 14.6200886],
              [121.0593842, 14.6202546],
              [121.0591552, 14.6207219],
              [121.0590303, 14.620979],
              [121.0589019, 14.6212449],
              [121.0587349, 14.6216008],
              [121.0586586, 14.6217599],
              [121.0585377, 14.6220138],
              [121.0585296, 14.6220342],
              [121.0584756, 14.6221498],
              [121.0583501, 14.6224077],
              [121.0583203, 14.6224687],
              [121.0582929, 14.6225227],
              [121.058217, 14.6226807],
              [121.058126, 14.6228702],
              [121.0580617, 14.6230039],
              [121.0578435, 14.6234582],
              [121.0576299, 14.6239027],
              [121.0574054, 14.6243701],
              [121.0571838, 14.6248314],
              [121.0571547, 14.6248868],
              [121.0531634, 14.6229584],
              [121.0530425, 14.622917],
              [121.0521476, 14.6224881],
              [121.0517909, 14.6223253],
              [121.0501155, 14.6215921],
              [121.0508207, 14.620041],
              [121.0513341, 14.6189039],
              [121.0523435, 14.6167391],
              [121.052484, 14.6164537],
              [121.0550436, 14.6109072],
            ],
          ],
        },
      },
      {
        type: "Feature",
        properties: {
          name: "E. Rodriguez Sr.",
          accessibilityScore: 70, // Yellow-Green
          color: "yellowgreen",
          population: 17363,
          area_km2: 1.8,
          postal_code: "1102",
        },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [121.0501155, 14.6215921],
              [121.0517909, 14.6223253],
              [121.0521476, 14.6224881],
              [121.0530425, 14.622917],
              [121.0531634, 14.6229584],
              [121.0571547, 14.6248868],
              [121.0571305, 14.6249298],
              [121.05703, 14.6251313],
              [121.0563863, 14.6264994],
              [121.056222, 14.6268379],
              [121.0554626, 14.6284967],
              [121.055278, 14.6288387],
              [121.0554436, 14.6290181],
              [121.0552513, 14.6290082],
              [121.0551231, 14.6290681],
              [121.0550202, 14.6291465],
              [121.0548474, 14.629353],
              [121.0547418, 14.629651],
              [121.0548021, 14.6298213],
              [121.0549129, 14.6299977],
              [121.0548816, 14.6301578],
              [121.0546283, 14.6304404],
              [121.0543121, 14.6306704],
              [121.0538535, 14.630582],
              [121.0537329, 14.6304838],
              [121.0536758, 14.6303972],
              [121.0536187, 14.6302765],
              [121.0535451, 14.6302054],
              [121.0532822, 14.6301721],
              [121.0527778, 14.6304621],
              [121.0524496, 14.6302801],
              [121.0520805, 14.6299728],
              [121.0518659, 14.6298399],
              [121.0516514, 14.629923],
              [121.0511707, 14.630031],
              [121.050939, 14.6301057],
              [121.0509049, 14.6300997],
              [121.0506356, 14.6300527],
              [121.0501936, 14.6299199],
              [121.0498602, 14.629836],
              [121.049784, 14.6297733],
              [121.0496191, 14.6294474],
              [121.0493846, 14.629135],
              [121.0491678, 14.6289207],
              [121.0488763, 14.62861],
              [121.0487537, 14.628514],
              [121.0486537, 14.6284626],
              [121.0485709, 14.6284603],
              [121.0484038, 14.6284112],
              [121.0479548, 14.6284533],
              [121.0478232, 14.6284741],
              [121.047734, 14.6285003],
              [121.0475401, 14.6285693],
              [121.0474451, 14.628599],
              [121.0473554, 14.6286158],
              [121.0472533, 14.6286198],
              [121.0471497, 14.6286187],
              [121.0469044, 14.6285633],
              [121.0482313, 14.6256817],
              [121.0501155, 14.6215921],
            ],
          ],
        },
      },
      {
        type: "Feature",
        properties: {
          name: "Immaculate Concepcion",
          accessibilityScore: 50, // Yellow
          color: "yellow",
          population: 25000,
          area_km2: 2.1,
          postal_code: "1111",
        },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [121.0488761, 14.6210549],
              [121.048999, 14.6211066],
              [121.0501155, 14.6215921],
              [121.0482313, 14.6256817],
              [121.0481084, 14.6256225],
              [121.0480439, 14.6255933],
              [121.0475968, 14.6253998],
              [121.0474708, 14.6253453],
              [121.0473963, 14.625313],
              [121.0470301, 14.6249603],
              [121.0464877, 14.6244543],
              [121.0460796, 14.6240722],
              [121.0456655, 14.6236501],
              [121.0452606, 14.6232952],
              [121.0451417, 14.623191],
              [121.045048, 14.6231089],
              [121.0449598, 14.6231549],
              [121.0444916, 14.6233948],
              [121.0443785, 14.6234528],
              [121.044199, 14.6235447],
              [121.043777, 14.623761],
              [121.0432901, 14.6240131],
              [121.0432606, 14.6240308],
              [121.0428284, 14.6242479],
              [121.0425885, 14.6243687],
              [121.0425092, 14.6244073],
              [121.0424314, 14.6244395],
              [121.0423227, 14.6244783],
              [121.0421292, 14.6245474],
              [121.0420877, 14.6245622],
              [121.0419072, 14.6246039],
              [121.0416551, 14.6246535],
              [121.0415164, 14.6246735],
              [121.0413351, 14.6246945],
              [121.0411311, 14.624705],
              [121.0409096, 14.624707],
              [121.0406616, 14.6246917],
              [121.0404032, 14.6246683],
              [121.0402284, 14.6246539],
              [121.0401472, 14.624649],
              [121.0400846, 14.6246462],
              [121.0399379, 14.6246339],
              [121.039841, 14.6246257],
              [121.0397429, 14.6246174],
              [121.0396896, 14.624613],
              [121.0393646, 14.6245856],
              [121.0393352, 14.6245831],
              [121.0390911, 14.6245626],
              [121.0389745, 14.6245528],
              [121.0387579, 14.6245345],
              [121.0387028, 14.6245299],
              [121.0386077, 14.6245219],
              [121.0382839, 14.6244964],
              [121.0378555, 14.6244586],
              [121.0375429, 14.6244323],
              [121.0374542, 14.6244248],
              [121.0374835, 14.6243287],
              [121.0375289, 14.6241835],
              [121.0377442, 14.6235692],
              [121.0378067, 14.6234572],
              [121.0378508, 14.6233931],
              [121.0380279, 14.6231975],
              [121.0381069, 14.6231103],
              [121.0381572, 14.6230548],
              [121.0382596, 14.6229418],
              [121.038731, 14.6224029],
              [121.0388209, 14.6223285],
              [121.0388545, 14.6223179],
              [121.0389586, 14.6223203],
              [121.0390448, 14.6223278],
              [121.0396706, 14.6223599],
              [121.0397433, 14.6223754],
              [121.039834, 14.6223996],
              [121.0399442, 14.622461],
              [121.0403414, 14.6226848],
              [121.0404345, 14.6227366],
              [121.0405455, 14.6225667],
              [121.0407549, 14.6222004],
              [121.0410266, 14.621732],
              [121.041206, 14.6214301],
              [121.0416536, 14.620663],
              [121.0417508, 14.6205016],
              [121.0425724, 14.6191017],
              [121.0429605, 14.6190416],
              [121.0430288, 14.6190157],
              [121.0430583, 14.6189768],
              [121.0430791, 14.6189505],
              [121.0431327, 14.6188713],
              [121.0431542, 14.6188313],
              [121.0440909, 14.6194217],
              [121.044405, 14.6195181],
              [121.0453774, 14.6198167],
              [121.045776, 14.6199558],
              [121.048216, 14.6208075],
              [121.048541, 14.6209209],
              [121.048769, 14.6210104],
              [121.0488761, 14.6210549],
            ],
          ],
        },
      },
      {
        type: "Feature",
        properties: {
          name: "Kaunlaran",
          accessibilityScore: 30, // Orange
          color: "orange",
          population: 18000,
          area_km2: 1.9,
          postal_code: "1111",
        },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [121.036931, 14.6151337],
              [121.0369627, 14.6150792],
              [121.0369883, 14.6150352],
              [121.0373345, 14.6144285],
              [121.0374144, 14.6142926],
              [121.0377564, 14.6137117],
              [121.0378926, 14.6134696],
              [121.0380224, 14.613243],
              [121.0383367, 14.612747],
              [121.0384148, 14.6127856],
              [121.0385066, 14.6128646],
              [121.0387446, 14.6130801],
              [121.0389117, 14.6132183],
              [121.0390309, 14.6133177],
              [121.0393769, 14.6136641],
              [121.0394575, 14.6137925],
              [121.0394995, 14.6139267],
              [121.0395333, 14.6140288],
              [121.0395995, 14.6142146],
              [121.0397043, 14.6144019],
              [121.0397443, 14.6144469],
              [121.0399328, 14.6146593],
              [121.0400632, 14.6147727],
              [121.0400901, 14.6147961],
              [121.0401185, 14.6148197],
              [121.040286, 14.6149592],
              [121.0405206, 14.6151561],
              [121.040612, 14.6152238],
              [121.0409904, 14.6154743],
              [121.041361, 14.6157181],
              [121.0417736, 14.6159753],
              [121.042025, 14.6161212],
              [121.0420957, 14.6161618],
              [121.0421331, 14.6161219],
              [121.0439407, 14.6143521],
              [121.0439084, 14.6142767],
              [121.0433587, 14.6137198],
              [121.043289, 14.6137289],
              [121.0429335, 14.6132942],
              [121.0433139, 14.6129259],
              [121.043835, 14.6125942],
              [121.0437737, 14.6124486],
              [121.0440616, 14.612148],
              [121.0442527, 14.6123048],
              [121.0445276, 14.6123638],
              [121.0447779, 14.6124592],
              [121.0448951, 14.6125751],
              [121.0449338, 14.61268],
              [121.0449793, 14.6130961],
              [121.0449811, 14.6131122],
              [121.0450979, 14.6133231],
              [121.0452384, 14.6136676],
              [121.045393, 14.6140497],
              [121.0455357, 14.6142717],
              [121.0456261, 14.6142933],
              [121.0457185, 14.6142364],
              [121.0458334, 14.6141505],
              [121.0460181, 14.6141582],
              [121.0461935, 14.6142692],
              [121.0463581, 14.6142337],
              [121.0466289, 14.6140369],
              [121.0466449, 14.6140876],
              [121.0467866, 14.6145097],
              [121.0469132, 14.6149071],
              [121.0469203, 14.6149294],
              [121.0469393, 14.6149854],
              [121.0469815, 14.6150452],
              [121.0471094, 14.6152268],
              [121.0471423, 14.6152769],
              [121.0471572, 14.6152997],
              [121.0472659, 14.6154697],
              [121.0473319, 14.6155731],
              [121.047608, 14.6159534],
              [121.048123, 14.6166759],
              [121.0483226, 14.6169546],
              [121.0484766, 14.6171829],
              [121.0485102, 14.6172312],
              [121.0486078, 14.6173832],
              [121.0486762, 14.6175418],
              [121.0488887, 14.6183545],
              [121.0489132, 14.6184482],
              [121.0489767, 14.618714],
              [121.0490021, 14.6189548],
              [121.0489959, 14.619122],
              [121.0489997, 14.6192695],
              [121.0490141, 14.6198326],
              [121.0490181, 14.6202422],
              [121.0489905, 14.6205723],
              [121.0489105, 14.6208898],
              [121.0488934, 14.620961],
              [121.0488761, 14.6210549],
              [121.048769, 14.6210104],
              [121.048541, 14.6209209],
              [121.048216, 14.6208075],
              [121.045776, 14.6199558],
              [121.0453774, 14.6198167],
              [121.044405, 14.6195181],
              [121.0440909, 14.6194217],
              [121.0431542, 14.6188313],
              [121.0427135, 14.6185358],
              [121.0415714, 14.6178685],
              [121.0408993, 14.6174678],
              [121.0382852, 14.6159095],
              [121.036931, 14.6151337],
            ],
          ],
        },
      },
      {
        type: "Feature",
        properties: {
          name: "San Martin de Porres",
          accessibilityScore: 10, // Red
          color: "red",
          population: 22000,
          area_km2: 3.0,
          postal_code: "1111",
        },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [121.0522781, 14.616466],
              [121.052484, 14.6164537],
              [121.0523435, 14.6167391],
              [121.0513341, 14.6189039],
              [121.0508207, 14.620041],
              [121.0501155, 14.6215921],
              [121.048999, 14.6211066],
              [121.0488761, 14.6210549],
              [121.0488934, 14.620961],
              [121.0489105, 14.6208898],
              [121.0489905, 14.6205723],
              [121.0490181, 14.6202422],
              [121.0490141, 14.6198326],
              [121.0489997, 14.6192695],
              [121.0489959, 14.619122],
              [121.0490021, 14.6189548],
              [121.0489767, 14.618714],
              [121.0489132, 14.6184482],
              [121.0488887, 14.6183545],
              [121.0486762, 14.6175418],
              [121.0486078, 14.6173832],
              [121.0485102, 14.6172312],
              [121.0484766, 14.6171829],
              [121.0483226, 14.6169546],
              [121.048123, 14.6166759],
              [121.047608, 14.6159534],
              [121.0473319, 14.6155731],
              [121.0472659, 14.6154697],
              [121.0471572, 14.6152997],
              [121.0471423, 14.6152769],
              [121.0471094, 14.6152268],
              [121.0469815, 14.6150452],
              [121.0469393, 14.6149854],
              [121.0470017, 14.6149581],
              [121.0471144, 14.6149045],
              [121.0472507, 14.6148396],
              [121.0474976, 14.6147221],
              [121.0475461, 14.6147001],
              [121.0475841, 14.6146825],
              [121.0477858, 14.6145912],
              [121.0478223, 14.6145775],
              [121.0478416, 14.6145707],
              [121.0479714, 14.614533],
              [121.0481682, 14.6145005],
              [121.0483612, 14.6144958],
              [121.0483844, 14.614497],
              [121.048623, 14.614532],
              [121.0486506, 14.6145388],
              [121.0487179, 14.6145579],
              [121.0488339, 14.6145997],
              [121.0489735, 14.6146688],
              [121.0491162, 14.6147673],
              [121.0491363, 14.6147838],
              [121.0491579, 14.6148024],
              [121.0494281, 14.6150179],
              [121.0496752, 14.6152046],
              [121.0498378, 14.6153223],
              [121.0499206, 14.6153822],
              [121.0499497, 14.6154049],
              [121.0500843, 14.61551],
              [121.0504014, 14.6157566],
              [121.0506116, 14.6159201],
              [121.0506365, 14.6159386],
              [121.050672, 14.6159632],
              [121.0510157, 14.6162192],
              [121.0512703, 14.6163728],
              [121.0514216, 14.6164373],
              [121.0515593, 14.6164748],
              [121.0516436, 14.6164982],
              [121.051734, 14.6164935],
              [121.0518888, 14.6164843],
              [121.0519213, 14.6164838],
              [121.0521659, 14.6164724],
              [121.0521912, 14.6164712],
              [121.0522781, 14.616466],
            ],
          ],
        },
      },
    ],
  };

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

  // Tooltip on hover to show lat, lon
  function MapWithTooltip() {
    const map = useMapEvent("mousemove", (e) => {
      const { lat, lng } = e.latlng;
      const tooltip = document.getElementById("latlon-tooltip");
      tooltip.innerHTML = `Lat: ${lat.toFixed(5)} | Lng: ${lng.toFixed(5)}`;
      tooltip.style.left = `${e.originalEvent.clientX + 10}px`;
      tooltip.style.top = `${e.originalEvent.clientY + 10}px`;
      tooltip.style.display = "block";
    });

    return null;
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

      {/* <div
        className="absolute top-20 left-20 w-64 bg-white p-4 shadow-lg"
        style={{
          zIndex: 1000,
        }}
      >
        <h3 className="text-lg font-semibold">Left Panel</h3>
        <p>This is a left-side hovering panel</p>
      </div> */}

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
            <GeoJSON key={index} data={layer.data} style={layer.style} />
          ))}
          {stationData.map((station) => (
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
          ))}

          {barangayData && (
            <GeoJSON
              data={barangayDataWithScores}
              style={barangayStyle} // Apply the color-coded style
              onEachFeature={onEachBarangay}
            />
          )}
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
