"use client";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { MoreDotIcon } from "@/icons";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { useState, useEffect } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import axios from 'axios';

// Dynamically import the ReactApexChart component
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

export default function MonthlySalesChart() {

  const [tradingHistory, setTradingHistory] = useState<Trade[]>([]);
  const [initialBalance, setInitialBalance] = useState<number>(5000);
  const [currentMonthProfit, setCurrentMonthProfit] = useState<number>(0);
  const [monthlyProfits, setMonthlyProfits] = useState<number[]>(new Array(12).fill(0));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [barColor, setBarColor] = useState<string>("#465fff"); // default blue

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get<Trade[]>(
          'https://mocki.io/v1/95248ed5-b09a-4b76-8f67-cebc4c29b4b3'
        );
        setTradingHistory(response.data);
      } catch (error) {
        console.error('Error fetching trade history:', error);
      }
    };

    fetchHistory();
    //console.log(tradingHistory)
  }, []);

  // Compute profits for all months in selected year
  useEffect(() => {
    if (tradingHistory.length === 0) return;

    const profitsByMonth = new Array(12).fill(0);

    tradingHistory.forEach((trade) => {
      const closeDate = new Date(trade.close_date);
      const year = closeDate.getFullYear();
      const month = closeDate.getMonth(); // 0 to 11

      if (year === selectedYear) {
        profitsByMonth[month] += trade.profit;
      }
    });

    setMonthlyProfits(profitsByMonth);
  }, [tradingHistory, selectedYear]);

  // Update chart bar color based on total profit
  useEffect(() => {
    const total = monthlyProfits.reduce((acc, val) => acc + val, 0);
    setBarColor(total >= 0 ? "#465fff" : "#ff4560");
  }, [monthlyProfits]);

  // Series with all months' data
  const series = [
    {
      name: "Profit",
      data: monthlyProfits.map((p) => parseFloat(p.toFixed(2))),
    },
  ];
  const options: ApexOptions = {
    colors: ["#465fff"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 180,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "39%",
        borderRadius: 5,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 4,
      colors: ["transparent"],
    },
    xaxis: {
      categories: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit",
    },
    yaxis: {
      title: {
        text: undefined,
      },
    },
    grid: {
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    fill: {
      opacity: 1,
    },

    tooltip: {
      x: {
        show: false,
      },
      y: {
        formatter: (val: number) => `${val}`,
      },
    },
  };

  const now = new Date();


  const [isOpen, setIsOpen] = useState(false);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Monthly P&L
        </h3>

        <div className="flex gap-2 items-center">
          <button
            onClick={() => setSelectedYear((prev) => prev - 1)}
            className="text-sm px-3 py-1 bg-white dark:bg-white/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white"
          >
            ←
          </button>
          <span className="text-gray-700 dark:text-white text-sm font-medium">
            {selectedYear}
          </span>
          <button
            onClick={() => setSelectedYear((prev) => prev + 1)}
            className="text-sm px-3 py-1 bg-gray-100 dark:bg-white/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white"
          >
            →
          </button>
        </div>

      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="-ml-5 min-w-[650px] xl:min-w-full pl-2">
          <ReactApexChart
            options={options}
            series={series}
            type="bar"
            height={180}
          />
        </div>
      </div>
    </div>
  );
}
