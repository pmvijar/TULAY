"use client";
import dynamic from 'next/dynamic';
import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  LogOut,
  NotebookPen,
  Lightbulb,
  ScrollText,
  Loader,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Chatbot from "./chatbot";
import 'leaflet/dist/leaflet.css'

const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });

export default function Recommendations() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const initialInsights = [
    {
      title: "Main Insights 1",
      description:
        "Click on the See Insights button to view the insights generated from the statistical data.",
    },
    {
      title: "Main Insights 2",
      description:
        "This represents the second main insight regarding the statistical data.",
    },
    {
      title: "Main Insights 3",
      description:
        "This represents the third main insight regarding the statistical data.",
    },
  ];

  const statisticalData = {
    averageSpeed: 45.3,
    peakHours: [7, 8, 17, 18],
    passengerCountDistribution: {
      morning: 1500,
      afternoon: 1000,
      evening: 2000,
    },
    correlationVehSpeedFuelRate: -0.65,
    correlationPassengerSpeed: 0.4,
    mostCommonEvent: "Boarding",
    fuelEfficiencyTrend: {
      lowLoad: 5.5,
      highLoad: 7.8,
    },
    top5RoutesByUsage: ["Route A", "Route B", "Route C", "Route D", "Route E"],
  };

  const [insights, setInsights] = useState(initialInsights);
  const [isLoading, setIsLoading] = useState(false);
  const [isInsightsGenerated, setIsInsightsGenerated] = useState(false);

  const getInsights = async (statisticalData) => {
    try {
      setIsLoading(true); // Set loading state to true
      const response = await fetch("http://localhost:3001/insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ statisticalData }),
      });
      const data = await response.json();
      console.log(data);
      setInsights(data.insights);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false); // Set loading state to false
      setIsInsightsGenerated(true);
    }
  };

  useEffect(() => {
    setActiveTab("recommendations");
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <section className="flex flex-col justify-around min-w-56 px-3 bg-white shadow-md rounded-r-3xl">
        <div className="pt-6 pl-3 flex items-center">
          <Image
            src="/lakbai-logo.png"
            alt="LakbAI Logo"
            width={50}
            height={50}
            className="mr-4"
          />
          {/* Text Content */}
          <div>
            <h1 className="text-2xl font-bold text-gray-800">LakbAI</h1>
            <h2 className="text-xl -mt-2">Analytics</h2>
          </div>
        </div>
        <nav className="my-4 flex flex-col justify-between min-h-[84%]">
          <section>
            <Link href="/dashboard">
              <Button
                variant={activeTab === "dashboard" ? "default" : "ghost"}
                className="flex flex-row rounded-lg w-full justify-start px-4 text-left hover:bg-teal-50"
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/recommendations">
              <Button
                variant={activeTab === "recommendations" ? "default" : "ghost"}
                className={`flex flex-row rounded-lg w-full justify-start px-4 text-left ${activeTab === "recommendations" ? "" : "hover:bg-teal-50"
                  }`}
              >
                <Lightbulb className="mr-2 h-4 w-4" />
                Recommendations
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
      <div className="flex flex-col md:flex-row w-full h-screen bg-gradient-to-br from-transparent to-cyan-50/50">
        {/* Insights and Map */}
        <div className="w-full md:w-2/3 flex flex-col justify-between m-6">
          <h1 className="flex flex-row items-center gap-2 font-bold text-xl">
            <ScrollText color="teal" /> Recommendations
          </h1>
          <div className="p-2">
            <MapContainer center={[14.5872, 121.0557]} zoom={11} style={{ height: '380px', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
            </MapContainer>
          </div>

          <div className="h-3/4">
            <div className="flex flex-row gap-2 items-center pb-2">
              <h2 className="flex flex-row items-center gap-2 text-lg font-semibold my-2">
                <NotebookPen color="teal" /> Map Insights{" "}
              </h2>{" "}
              <Button
                size="sm"
                className="bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800 px-2 text-[0.75rem]"
                onClick={() => getInsights(statisticalData)}
              >
                See Insights
              </Button>
            </div>
            {isLoading ? (
              <div className="flex min-h-52 gap-2 items-center justify-center">
                <Loader
                  color="teal"
                  className="flex justify-center items-center animate-spin"
                />
                Loading insights...
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {insights.map((insight, index) => (
                  <Card
                    className="flex flex-col min-h-52 bg-gradient-to-br from-white from-80% via-white to-teal-500/10"
                    key={index}
                  >
                    <CardHeader className="pt-4 pl-6 pb-2">
                      <CardTitle className="text-md font-bold">
                        {insight.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm">{insight.description}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chatbot */}
        <Chatbot
          insights={insights}
          isInsightsGenerated={isInsightsGenerated}
        />
      </div>
    </div>
  );
}
