"use client";
import React from "react";
import { ApexOptions } from "apexcharts";
import ChartTab from "../common/ChartTab";
import dynamic from "next/dynamic";

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
  type: 'buy' | 'sell';
  symbol: string;
  volume: number;
  history_from_date: string;
  history_to_date: string;
  createdAt: string;
  updatedAt: string;
}

interface StatisticsChartProps {
  tradeHistory: Trade[];
  balance:number
}

export default function StatisticsChart({ tradeHistory,balance }: StatisticsChartProps) {

  const sorted = [...tradeHistory].sort((a, b) => {
    const tA = new Date(`${a.close_date}T${a.close_time}`).getTime();
    const tB = new Date(`${b.close_date}T${b.close_time}`).getTime();
    return tA - tB;
  });

  const totalProfit = sorted.reduce((sum, t) => sum + t.profit, 0);
  const initialBalance = balance - totalProfit;

  let running = initialBalance;
  const equityData = sorted.map((t) => {
    running += t.profit;
    return {
      x: new Date(`${t.close_date}T${t.close_time}`).getTime(),
      y: Number(running.toFixed(2)),
    };
  });

  const options: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "area",
      toolbar: {
        show: true,
        tools: {
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true,
        },
      },
      zoom: {
        enabled: true,
        type: "x",
        autoScaleYaxis: true,
      },
    },
    legend: {
      show: false,
    },
    colors: ["#465FFF"],
    stroke: {
      curve: "straight",
      width: 2,
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.55,
        opacityTo: 0,
      },
    },
    markers: {
      size: 0,
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: {
        size: 6,
      },
    },
    grid: {
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    dataLabels: { enabled: false },
    tooltip: {
      enabled: true,
      x: { format: "dd MMM yyyy HH:mm" },
      y: {
        formatter: (val) => `$${val.toFixed(2)}`,
      },
    },
    xaxis: {
      type: "datetime",
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      labels: {
        style: { fontSize: "12px", colors: ["#6B7280"] },
      },
      title: { text: "", style: { fontSize: "0px" } },
    },
  };

  const series = [
    {
      name: "Equity",
      data: equityData,
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Statistics
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Detailed Statistics
          </p>
        </div>
        <div className="flex items-start w-full gap-3 sm:justify-end">
          <ChartTab />
        </div>
      </div>
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[1000px] xl:min-w-full">
          <ReactApexChart
            options={options}
            series={series}
            type="area"
            height={310}
          />
        </div>
      </div>
    </div>
  );
}