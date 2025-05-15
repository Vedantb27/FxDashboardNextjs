"use client";
import React from "react";
import Badge from "../ui/badge/Badge";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { ArrowDownIcon, BoxIconLine } from "../../icons";

// Dynamically import to avoid SSR issues
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface Trade {
  sr_no: number;
  position_id: number;
  open_date: string;
  open_time: string;
  close_date: string;
  close_time: string;
  trade_duration: string;
  trade_duration_seconds: string;
  open_price: number;
  close_price: number;
  no_of_deals: number;
  profit: number;
  sl_price: number | null;
  tp_price: number | null;
  type: "buy" | "sell";
  symbol: string;
  volume: number;
  history_from_date: string;
  history_to_date: string;
  createdAt: string;
  updatedAt: string;
}

interface EcommerceMetricsProps {
  tradeHistory: Trade[];
}

export const EcommerceMetrics = ({ tradeHistory }: EcommerceMetricsProps) => {
  // Compute win-rate
  const wins = tradeHistory.filter((t) => t.profit > 0).length;
  const totalClosed = tradeHistory.filter((t) => t.profit !== 0).length;
  const winRate = totalClosed > 0 ? (wins / totalClosed) * 100 : 0;
  const winRateSeries = [parseFloat(winRate.toFixed(2))];

  const totalOrders = tradeHistory.length;

  // Compute net P&L
  const netPL = tradeHistory.reduce((sum, t) => sum + t.profit, 0);
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
      <div className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col items-center justify-between dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <h4 className="text-gray-500 mb-2">Win Rate</h4>
        <ReactApexChart
          options={winRateOptions}
          series={winRateSeries}
          type="radialBar"
          height={200}
        />
        {/* Commented-out section preserved for potential future use */}
        {/* <div className="mt-4">
          <Badge color={netPLIsPositive ? "success" : "error"}>
            <span>Total gain</span>
            {netPLIsPositive ? (
              <ArrowUpIcon className="text-success-500" />
            ) : (
              <ArrowDownIcon className="text-error-500" />
            )}
            {netPLFormatted}
          </Badge>
        </div> */}
      </div>

      {/* Orders */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <BoxIconLine className="text-gray-800 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total Orders
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {totalOrders}
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