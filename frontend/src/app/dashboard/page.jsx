"use client";
import dynamic from 'next/dynamic';
import React, { useState, useEffect } from "react";
import { LayoutDashboard, LogOut, Lightbulb, Calendar, Loader } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
// import HeatmapLayer from "react-leaflet-heatmap-layer-v3";

import Link from "next/link";
import 'leaflet/dist/leaflet.css'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
import edsaData from "./response.json";

const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((mod) => mod.Polyline), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then((mod) => mod.CircleMarker), { ssr: false });
const HeatmapLayer = dynamic(() => import('react-leaflet-heatmap-layer-v3').then((mod) => mod.HeatmapLayer), { ssr:false} );


export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedCard, setSelectedCard] = useState(null);
  const [showBoardingAlighting, setShowBoardingAlighting] = useState(false);
  const [showSpeed, setShowSpeed] = useState(false);
  const [startDate, setStartDate] = useState("2023-07-07");
  const [endDate, setEndDate] = useState("2023-07-28");
  
  const [allData, setAllData] = useState({
    passengerLoad: [],
    boardingAlightingHeatmap: [],
    boardingAlightingBar: [],
    gps: [],
    gpsLineMap: []
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setActiveTab("dashboard");
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [passengerLoad, boardingAlightingHeatmap, boardingAlightingBar, gps, gpsLineMap] = await Promise.all([
          fetch('http://localhost:3001/passenger-load', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({location: "EDSA"}), // Include body
          }).then(res => res.json()),
          
          fetch('http://localhost:3001/boarding-alighting-heatmap', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({location: "EDSA"}), // Include body
          }).then(res => res.json()),
          
          fetch('http://localhost:3001/boarding-alighting-stacked-bar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({location: "EDSA"}), // Include body
          }).then(res => res.json()),
          
          fetch('http://localhost:3001/gps-data', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({location: "EDSA"}), // Include body
          }).then(res => res.json()),

          fetch('http://localhost:3001/get-GPS-speed-line-chart', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({location: "EDSA"}), // Include body
          }).then(res => res.json()),
        ]);

        setAllData({
          passengerLoad,
          boardingAlightingHeatmap,
          boardingAlightingBar,
          gps,
          gpsLineMap
        });
      } catch (err) {
        setError("Failed to fetch data. Please try again later.");
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filterDataByDateRange = (data) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Set to end of day

    return data.filter(item => {
      if(item.timestamp){
        const itemDate = new Date(item.timestamp);
        return itemDate >= start && itemDate <= end;
      }

    });
  };

  const filteredData = {
    passengerLoad: filterDataByDateRange(allData.passengerLoad),
    boardingAlightingHeatmap: filterDataByDateRange(allData.boardingAlightingHeatmap),
    boardingAlightingBar: filterDataByDateRange(allData.boardingAlightingBar),
    gps: filterDataByDateRange(allData.gps),
    gpsLineMap: filterDataByDateRange(allData.gpsLineMap)
  };

  // EDSA route coordinates (simplified)
  const edsaRoute = edsaData.map(({ latitude, longitude }) => [latitude, longitude]);


  // transforms passenger load data
  function transformData(data) {
    const groupedData = {};
  
    data.forEach(({ timestamp, passengerLoad, route }) => {
      const date = new Date(timestamp).toISOString().split('T')[0].replace(/-/g, ' '); // Extracts the date in "YYYY-MM-DD" format
  
      if (!groupedData[date]) {
        groupedData[date] = { date, Northbound: 0, Southbound: 0 };
      }
  
      if (route === 'Northbound' || route === 'Southbound') {
        groupedData[date][route] += passengerLoad;
      }
    });
  
    return Object.values(groupedData);
  }


  const passengerLoadData = transformData(filteredData.passengerLoad)
  const boardingCoords = allData.boardingAlightingHeatmap.filter(point => point.boarding).map(point => [point.latitude, point.longitude]);
  const alightingCoords = allData.boardingAlightingHeatmap.filter(point => point.alighting).map(point => [point.latitude, point.longitude]);
  const processedData = filteredData.boardingAlightingBar
  .map(({ totalBoarding, totalAlighting, timestamp }) => {
    const date = new Date(timestamp);
    const day = date.toISOString().split('T')[0]; // Extract YYYY-MM-DD
    const hour = date.toISOString().split('T')[1].split(':')[0] + ':00'; // Extract hour (e.g., 20:00)
    return {
      timestamp: `${hour} ${day}`, // Combine hour and day
      boarding: totalBoarding,
      alighting: totalAlighting
    };
  })
  .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); 
  const heatmapData = allData.gps.map(({ latitude, longitude, gpsSpeed }) => ({
    lat: latitude,
    lng: longitude,
    intensity: gpsSpeed / 20, // Normalize intensity based on max speed
  }));

  const sidePanel = [
    {
      chart: "Bus Route",
      overview: [
       "The context depicts a geographic map illustrating the EDSA Busway Route in Metro Manila. The blue line represents the path of the busway, spanning approximately 21 kilometers from the northern to the southern part of the city. It starts at Monumento in Caloocan City and ends at PITX/MOA in Parañaque City. This route traverses key areas within Metro Manila, connecting major cities and business districts.",
      ],
      mainInsight: [
        "The EDSA Busway Route fulfils a critical role in urban transportation within Metro Manila, serving as a major artery for commuting. This route enhances accessibility to crucial business and commercial areas, offering an efficient alternative for daily travelers looking to circumvent congested roadways. By linking key districts through numerous strategically located stations, the busway facilitates ease of movement for thousands of passengers daily. Moreover, it emphasizes the importance of comprehensive public transport systems in addressing urban mobility concerns, potentially reducing traffic congestion and promoting sustainable travel practices."
      ],
      overviewHet: ["The image depicts a geographic heatmap illustrating the EDSA Busway Route in Metro Manila. This route stretches approximately 21 kilometers, starting from Monumento in Caloocan City and ending at PITX/MOA in Parañaque. The line representing the route is colored blue, with a heatmap overlay indicating varying speeds in different segments."],      
      mainInsightHeat : [
        "The image depicts a geographic heatmap illustrating the EDSA Busway Route in Metro Manila. This route stretches approximately 21 kilometers, starting from Monumento in Caloocan City and ending at PITX/MOA in Parañaque. The line representing the route is colored blue, with a heatmap overlay indicating varying speeds in different segments.",
      ]
    }, 

  ]

  const dashboard = [
    {
      title: "Bus Route",
      preview: "Bus Route Preview",
      content:         
      <MapContainer center={[14.5872, 121.0557]} zoom={11} style={{ height: '377px', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Polyline positions={edsaRoute} color="blue" weight={7} />
        {showBoardingAlighting && 
            boardingCoords.map((coord, index) => (
              <CircleMarker
                key={`boarding-${index}`}
                center={coord}
                radius={2}
                color="lime"
                fillColor="lime"
                fillOpacity={0.8}
              />
        ))}
          
        {showBoardingAlighting &&
        alightingCoords.map((coord, index) => (
          <CircleMarker
            key={`alighting-${index}`}
            center={coord}
            radius={2}
            color="red"
            fillColor="red"
            fillOpacity={0.8}
          />
        ))}

        {showSpeed && 
              <HeatmapLayer
              fitBoundsOnLoad
              fitBoundsOnUpdate
              points={heatmapData}
              longitudeExtractor={(point) => point.lng}
              latitudeExtractor={(point) => point.lat}
              intensityExtractor={(point) => point.intensity}
              radius={20} // Adjust the radius
              blur={15} // Adjust the blur for smoothing
              max={1.0} // Maximum intensity
            />
        }
        
      </MapContainer>,
      details: "Longitude + Latitude + Altitude"
    },
    {
      title: "Passenger Load",
      preview: "Passenger Load Preview",
      content:           
      <ChartContainer
        config={{
          'Northbound': {
            label: "Northbound",
            color: "#8884d8",
          },
          'Southbound': {
            label: "Southbound",
            color: "#82ca9d",
          },
        }}
        className="h-[400px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={passengerLoadData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
            />
            <YAxis />
            <Tooltip 
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="Northbound"
              stroke="#8884d8"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 8 }}
            />
            <Line
              type="monotone"
              dataKey="Southbound"
              stroke="#82ca9d"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>,
      details: "y: Passenger Load, x: Time, g: Route"
    },
    {
      title: "Boarding Alighting",
      preview: "Boarding Alighting Preview",
      content: 
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={processedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp" 
          />
          <YAxis />
          <Tooltip 
          />
          <Legend />
          <Bar dataKey="boarding" fill="hsl(var(--chart-2))" stackId="a" />
          <Bar dataKey="alighting" fill="hsl(var(--chart-1))" stackId="a" />
        </BarChart>
      </ResponsiveContainer>,
      details: "y: Boarding/Alighting, x: Timestamp, 0 to 1"
    },
    {
      title: "GPS Speed",
      preview: "GPS Speed Preview",
      content: 
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={filteredData.gpsLineMap} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(value) => new Date(value).toLocaleDateString()}
          />
          <YAxis />
          <Tooltip 
            labelFormatter={(value) => new Date(value).toLocaleDateString()}
          />
          <Legend />
          <Line type="monotone" dataKey="speed" stroke="hsl(var(--chart-1))" />
        </LineChart>
      </ResponsiveContainer>,
      details: "y: Speed, x: Time, Speed on Map"
    },
  ];

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isLoading){
    console.log()
  }

  if (error) {
    return <div>Error: {error}</div>;
  }
  return (
    <div className='flex min-h-screen bg-gray-100'>
      {/* Sidebar */}
      <section className='flex flex-col justify-around min-w-56 px-3 bg-white shadow-md rounded-r-3xl'>
        <div className='pt-6 pl-3 flex items-center'>
          <Image
            src='/lakbai-logo.png'
            alt='LakbAI Logo'
            width={50}
            height={50}
            className='mr-4'
          />
          {/* Text Content */}
          <div>
            <h1 className='text-2xl font-bold text-gray-800'>LakbAI</h1>
            <h2 className='text-xl -mt-2'>Analytics</h2>
          </div>
        </div>
        <nav className='my-4 flex flex-col justify-between min-h-[84%]'>
          <section>
            <Link href='/dashboard'>
              <Button
                variant={activeTab === "dashboard" ? "default" : "ghost"}
                className='flex flex-row rounded-lg w-full justify-start px-4 text-left hover:bg-teal-50'
              >
                <LayoutDashboard className='mr-2 h-4 w-4' />
                Dashboard
              </Button>
            </Link>
            <Link href='/recommendations'>
              <Button
                variant={activeTab === "recommendations" ? "default" : "ghost"}
                className={`flex flex-row rounded-lg w-full justify-start px-4 text-left ${activeTab === "recommendations" ? "" : "hover:bg-teal-50"
                  }`}
              >
                <Lightbulb className='mr-2 h-4 w-4' />
                Recommendations
              </Button>
            </Link>
          </section>

          <Link href='/'>
            <Button
              variant='ghost'
              className='flex flex-row rounded-lg w-full justify-start px-4 text-left text-red-600 hover:text-red-700 hover:bg-red-50'
            >
              <LogOut className='mr-2 h-4 w-4' />
              Logout
            </Button>
          </Link>
        </nav>
      </section>
  
      {/* Main Content */}
      <div className='min-w-[80%] p-8 flex flex-col gap-6'>
        <div className="flex justify-between items-center">
          <h1 className='font-bold text-xl'>Dashboard</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              <div className="flex items-center space-x-2">
                <Label htmlFor="start-date" className="sr-only">
                  Start Date
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min="2023-07-07"
                  max="2023-07-28"
                className="w-40"
                />
                <span>-</span>
                <Label htmlFor="end-date" className="sr-only">
                  End Date
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min="2023-07-07"
                  max="2023-07-28"
                  className="w-40"
                />
              </div>
            </div>
          </div>
        </div>
  
        {/* Grid displaying cards */}
        <div className='grid grid-cols-2 gap-6'>
          {dashboard.map((d, index) => (
            <div key={index} className={`col-span-${d.title === 'Bus Route' ? '2' : '1'}`}>
              <Card>
                <CardHeader className='flex flex-row'>
                  <CardTitle>{d.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {d.title === "Bus Route" && (
                    <div className="flex gap-4 mb-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="boarding-alighting" 
                          checked={showBoardingAlighting}
                          onCheckedChange={setShowBoardingAlighting}
                        />
                        <label
                          htmlFor="boarding-alighting"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Boarding & Alighting
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="speed" 
                          checked={showSpeed}
                          onCheckedChange={setShowSpeed}
                        />
                        <label
                          htmlFor="speed"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Speed
                        </label>
                      </div>
                    </div>
                  )}
                  <div className="h-full flex border-2" onClick={() => setSelectedCard(d.title)}>
                    {d.content}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
  
      {/* Modal (Sliding from Right) */}
      {selectedCard == "Bus Route" && (
        <div className='fixed right-0 top-0 h-full bg-white shadow-lg transition-transform transform translate-x-0 max-w-[25%]'>
          <div className='p-6'>
            {/* Close Button */}
            <button
              className='mb-4 text-gray-500 hover:text-gray-700'
              onClick={() => setSelectedCard(null)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className='font-bold text-xl'>{selectedCard}</h1>
            <div className='mt-4'>
              <Card>
               
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  {!showSpeed
                  ?<p>The context depicts a geographic map illustrating the EDSA Busway Route in Metro Manila. The blue line represents the path of the busway, spanning approximately 21 kilometers from the northern to the southern part of the city. It starts at Monumento in Caloocan City and ends at PITX/MOA in Parañaque City. This route traverses key areas within Metro Manila, connecting major cities and business districts.</p>
                  :<>The image depicts a geographic heatmap illustrating the EDSA Busway Route in Metro Manila. This route stretches approximately 21 kilometers, starting from Monumento in Caloocan City and ending at PITX/MOA in Parañaque. The line representing the route is colored blue, with a heatmap overlay indicating varying speeds in different segments.</>
                  
                  }
                  
                </CardContent>
              </Card>
              <Card className='mt-6'>
                <CardHeader>
                  <CardTitle>Main Insights</CardTitle>
                </CardHeader>
                <CardContent>
                {!showSpeed
                  ?
                  <div className='flex flex-col gap-2 text-justify '>
                    <p>The EDSA Busway Route fulfils a critical role in urban transportation within Metro Manila, serving as a major artery for commuting. This route enhances accessibility to crucial business and commercial areas, offering an efficient alternative for daily travelers looking to circumvent congested roadways. By linking key districts through numerous strategically located stations, the busway facilitates ease of movement for thousands of passengers daily. Moreover, it emphasizes the importance of comprehensive public transport systems in addressing urban mobility concerns, potentially reducing traffic congestion and promoting sustainable travel practices.</p>
                  </div>
                  :
                  <div className='flex flex-col gap-2 text-justify'>
                  <p>The heatmap overlays indicate varying speeds along the route, with colors representing speed intensity:</p>
                  <li><b>Red:</b> High speed areas, found predominantly at the northern start (Caloocan area) and southern end (Parańaque)</li>
                  <li><b>Yellow:</b> Moderate speed sections, scattered throughout the route, particularly noticeable in central segments.</li>
                  <li><b>Green:</b> Low speed areas, indicating potentially high traffic congestion or stops, primarily in mid-route within densely populated districts.</li>
                  <p>This data suggest that the EDSA Busway experiences varying traffic conditions, with smoother flows at the edges and potential congestion points in central parts. This could be due to high vehicular density or intersections in key areas like Makati. Understanding these patterns is crucial for optimizing transit schedules and infrastructure planning.</p>                  
                  </div>
        
                  }
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}