"use client";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { MoreDotIcon } from "../../icons";
import { useEffect, useState } from "react";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { getCurrencySymbol } from "../../utils/common";


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

interface OverallTargetProps {
  tradeHistory: Trade[];
  balance: number;
  isLoadingTrades: Boolean;
  currency:string
}

export default function OverallTarget({ tradeHistory, balance, isLoadingTrades,currency }: OverallTargetProps) {
  const [series, setSeries] = useState<number[]>([0]);
  const [weeklyProfit, setWeeklyProfit] = useState<number>(0);
  const [totalProfit, setTotalProfit] = useState<number>(0);
  const [monthlyProfit, setMonthlyProfit] = useState<number>(0);
  const [dailyProfit, setDailyProfit] = useState<number>(0);
  const [dailyPercent, setDailyPercent] = useState<number>(0);
  const [weeklyPercent, setWeeklyPercent] = useState<number>(0);
  const [totalPercent, setTotalPercent] = useState<number>(0);
  const [monthlyPercent, setMonthlyPercent] = useState<number>(0);

  useEffect(() => {
    if (isLoadingTrades) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const todayDate = now.getDate();
    const todayString = now.toISOString().split('T')[0];

    const startOfWeek = new Date(now);
    startOfWeek.setDate(todayDate - now.getDay());

    const dailyTrades = tradeHistory.filter(trade => trade.close_date === todayString);

    const weeklyTrades = tradeHistory.filter(trade => {
      const close = new Date(trade.close_date);
      return close >= startOfWeek && close <= now;
    });

    const monthlyTrades = tradeHistory.filter(trade => {
      const close = new Date(trade.close_date);
      return close.getMonth() === currentMonth && close.getFullYear() === currentYear;
    });

    const totalTrades = tradeHistory;

    const dailyProfit = dailyTrades.reduce((acc, trade) => acc + trade.profit, 0);
    const weeklyProfit = weeklyTrades.reduce((acc, trade) => acc + trade.profit, 0);
    const monthlyProfit = monthlyTrades.reduce((acc, trade) => acc + trade.profit, 0);
    const totalProfit = totalTrades.reduce((acc, trade) => acc + trade.profit, 0);

    // Calculate percentages safely (avoid NaN if balance=0)
    const safePercent = (profit: number) => (balance !== 0 ? (profit / balance) * 100 : 0);

    // Set state
    setSeries([parseFloat(safePercent(totalProfit).toFixed(2))]);

    // Set profits in USD
    setDailyProfit(dailyProfit);
    setWeeklyProfit(weeklyProfit);
    setMonthlyProfit(monthlyProfit);
    setTotalProfit(totalProfit);

    setDailyPercent(safePercent(dailyProfit));
    setWeeklyPercent(safePercent(weeklyProfit));
    setMonthlyPercent(safePercent(monthlyProfit));
    setTotalPercent(safePercent(totalProfit));
  }, [tradeHistory, balance, isLoadingTrades]);

  const UpArrow = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.60141 2.33683C7.73885 2.18084 7.9401 2.08243 8.16435 2.08243C8.16475 2.08243 8.16516 2.08243 8.16556 2.08243C8.35773 2.08219 8.54998 2.15535 8.69664 2.30191L12.6968 6.29924C12.9898 6.59203 12.9899 7.0669 12.6971 7.3599C12.4044 7.6529 11.9295 7.65306 11.6365 7.36027L8.91435 4.64004V13.5C8.91435 13.9142 8.57856 14.25 8.16435 14.25C7.75013 14.25 7.41435 13.9142 7.41435 13.5V4.64442L4.69679 7.36025C4.4038 7.65305 3.92893 7.6529 3.63613 7.35992C3.34333 7.06693 3.34348 6.59206 3.63646 6.29926L7.60141 2.33683Z"
        fill="#039855"
      />
    </svg>
  );

  const DownArrow = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.26816 13.6632C7.4056 13.8192 7.60686 13.9176 7.8311 13.9176C7.83148 13.9176 7.83187 13.9176 7.83226 13.9176C8.02445 13.9178 8.21671 13.8447 8.36339 13.6981L12.3635 9.70076C12.6565 9.40797 12.6567 8.9331 12.3639 8.6401C12.0711 8.34711 11.5962 8.34694 11.3032 8.63973L8.5811 11.36V2.5C8.5811 2.08579 8.24531 1.75 7.8311 1.75C7.41688 1.75 7.0811 2.08579 7.0811 2.5V11.3556L4.36354 8.63975C4.07055 8.34695 3.59568 8.3471 3.30288 8.64009C3.01008 8.93307 3.01023 9.40794 3.30321 9.70075L7.26816 13.6632Z"
        fill="#D92D20"
      />
    </svg>
  );

  const options: ApexOptions = {
    colors: ["#465FFF"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "radialBar",
      height: 300, // Increased height for loaded content
      sparkline: {
        enabled: true,
      },
    },
    plotOptions: {
      radialBar: {
        startAngle: -85,
        endAngle: 85,
        hollow: {
          size: "70%",
        },
        track: {
          background: "#E4E7EC",
          strokeWidth: "100%",
          margin: 5,
        },
        dataLabels: {
          name: {
            show: false,
          },
          value: {
            fontSize: "32px",
            fontWeight: "600",
            offsetY: -35,
            color: "#0000FF",
            formatter: function (val) {
              return val + "%";
            },
          },
        },
      },
    },
    fill: {
      type: "solid",
      colors: ["#465FFF"],
    },
    stroke: {
      lineCap: "round",
    },
    labels: ["Progress"],
  };

  const [isOpen, setIsOpen] = useState(false);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="px-5 pt-5 bg-white shadow-default rounded-2xl pb-8 dark:bg-gray-900 sm:px-6 sm:pt-6">
        <div className="flex justify-between">
          {isLoadingTrades ? (
            <>
              <div>
                <div className="h-5 w-40 bg-gray-200 rounded animate-pulse"></div>
                <div className="mt-1 h-4 w-60 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="h-6 w-6 bg-gray-200 rounded-full animate-pulse"></div>
            </>
          ) : (
            <>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Performance Matrix
                </h3>
                <p className="mt-1 font-normal text-gray-500 text-theme-sm dark:text-gray-400">
                  Percentage you’ve achieved till now
                </p>
              </div>
              <div className="relative inline-block">
                <button onClick={toggleDropdown} className="dropdown-toggle">
                  <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
                </button>
                <Dropdown
                  isOpen={isOpen}
                  onClose={closeDropdown}
                  className="w-40 p-2"
                >
                  <DropdownItem
                    tag="a"
                    onItemClick={closeDropdown}
                    className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                  >
                    SetTarget
                  </DropdownItem>
                  <DropdownItem
                    tag="a"
                    onItemClick={closeDropdown}
                    className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                  >
                    Set Default Target
                  </DropdownItem>
                </Dropdown>
              </div>
            </>
          )}
        </div>
        <div className="relative">
          {isLoadingTrades ? (
            <div className="h-[250px] w-full flex items-center justify-center"> {/* Reduced height for skeleton */}
              <div className="h-28 w-28 bg-gray-200 rounded-full animate-pulse"></div> {/* Smaller skeleton size */}
            </div>
          ) : (
            <div className="max-h-[460px]"> 
              <ReactApexChart
                options={options}
                series={series}
                type="radialBar"
                height={470} // Increased height for loaded content
              />
            </div>
          )}
        </div>
        {isLoadingTrades ? (
          <div className="mx-auto mt-8 w-full max-w-[380px] h-4 bg-gray-200 rounded animate-pulse"></div>
        ) : (
          <p className="mx-auto mt-8 w-full max-w-[380px] text-center text-sm text-gray-500 sm:text-base">
            You earn {getCurrencySymbol(currency)}{totalProfit.toFixed(2)} till now, keep up your good work!
          </p>
        )}
      </div>
      <div className="flex items-center justify-center gap-5 px-6 py-3.5 sm:gap-8 sm:py-5">
        {isLoadingTrades ? (
          <>
            <div>
              <div className="mb-1 h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
              <div className="flex items-center justify-center gap-1">
                <div className="h-5 w-16 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="w-px bg-gray-200 h-7 animate-pulse"></div>
            <div>
              <div className="mb-1 h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
              <div className="flex items-center justify-center gap-1">
                <div className="h-5 w-16 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="w-px bg-gray-200 h-7 animate-pulse"></div>
            <div>
              <div className="mb-1 h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
              <div className="flex items-center justify-center gap-1">
                <div className="h-5 w-16 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="mb-1 text-center text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">
                Monthly gain
              </p>
              <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
                {monthlyProfit.toFixed(2)}{getCurrencySymbol(currency)}
                {monthlyProfit >= 0 ? <UpArrow /> : <DownArrow />}
              </p>
            </div>
            <div className="w-px bg-gray-200 h-7 dark:bg-gray-800"></div>
            <div>
              <p className="mb-1 text-center text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">
                Weekly gain
              </p>
              <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
                {weeklyProfit.toFixed(2)}{getCurrencySymbol(currency)}
                {weeklyProfit >= 0 ? <UpArrow /> : <DownArrow />}
              </p>
            </div>
            <div className="w-px bg-gray-200 h-7 dark:bg-gray-800"></div>
            <div>
              <p className="mb-1 text-center text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">
                Daily gain
              </p>
              <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
                {dailyProfit.toFixed(2)}{getCurrencySymbol(currency)}
                {dailyProfit >= 0 ? <UpArrow /> : <DownArrow />}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}