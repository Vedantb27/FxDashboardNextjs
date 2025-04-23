"use client";
import React, { useState, useEffect } from "react";
import Badge from "../ui/badge/Badge";
import dynamic from "next/dynamic";
import axios from "axios";
import { ApexOptions } from "apexcharts";
import { ArrowDownIcon, ArrowUpIcon, BoxIconLine, GroupIcon } from "@/icons";

// Dynamically import to avoid SSR issues
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface Trade {
  profit: number;
  // (other fields omitted)
}

export const EcommerceMetrics = () => {
  const [tradingHistory, setTradingHistory] = useState<Trade[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await axios.get<Trade[]>(
          "https://mocki.io/v1/95248ed5-b09a-4b76-8f67-cebc4c29b4b3"
        );
        setTradingHistory(data);
      } catch (err) {
        console.error("Error fetching trade history:", err);
      }
    };
    fetchHistory();
  }, []);

  // Compute win-rate
  const wins = tradingHistory.filter((t) => t.profit > 0).length;
  const totalClosed = tradingHistory.filter((t) => t.profit !== 0).length;
  const winRate = totalClosed > 0 ? (wins / totalClosed) * 100 : 0;
  const winRateSeries = [parseFloat(winRate.toFixed(2))];

   // 2. Compute net P&L
   const netPL = tradingHistory.reduce((sum, t) => sum + t.profit, 0);
   const netPLFormatted = `${netPL >= 0 ? "+" : ""}${netPL.toFixed(2)}$`;
   const netPLIsPositive = netPL >= 0;

  // Apex radial-bar options
  const winRateOptions: ApexOptions = {
    chart: {
      type: "radialBar",
      height: 200,
      sparkline: { enabled: true },
      fontFamily: "Outfit, sans-serif",
    },
    plotOptions: {
      radialBar: {
        startAngle: -85,
        endAngle: 85,
        hollow: { size: "70%" },
        track: { background: "#E4E7EC", strokeWidth: "100%", margin: 5 },
        dataLabels: {
          name: { show: false },
          value: {
            fontSize: "28px",
            fontWeight: 600,
            offsetY: -10,
            formatter: (val) => `${val}%`,
          },
        },
      },
    },
    fill: { type: "solid", colors: ["#465FFF"] },
    labels: ["Win Rate"],
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
     
        {/* Win Rate Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col items-center justify-center dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <h4 className="text-gray-500 mb-2">Win Rate</h4>
        <ReactApexChart
          options={winRateOptions}
          series={winRateSeries}
          type="radialBar"
          height={200}
        />
        <div className="mt-4">
          <Badge color={netPLIsPositive ? "success" : "error"}>
            {netPLIsPositive ? (
              <ArrowUpIcon className="text-success-500" />
            ) : (
              <ArrowDownIcon className="text-error-500" />
            )}
            {netPLFormatted}
          </Badge>
        </div>
      </div>

      {/* Orders */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <BoxIconLine className="text-gray-800 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Orders
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              5,359
            </h4>
          </div>
          <Badge color="error">
            <ArrowDownIcon className="text-error-500" />
            9.05%
          </Badge>
        </div>
      </div>
    </div>
  );
};
