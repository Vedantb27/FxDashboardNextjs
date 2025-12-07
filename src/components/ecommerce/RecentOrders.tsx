"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import { useState, useEffect } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../../components/ui/modal";
import AUD from "../../icons/currencyPairs/AUD.png";
import CNH from "../../icons/currencyPairs/CNH.png";
import CAD from "../../icons/currencyPairs/CAD.png";
import GBP from "../../icons/currencyPairs/GBP.png";
import NZD from "../../icons/currencyPairs/NZD.png";
import USD from "../../icons/currencyPairs/USD.png";
import EUR from "../../icons/currencyPairs/EUR.png";
import CHF from "../../icons/currencyPairs/CHF.png";
import USOIL from "../../icons/currencyPairs/USOIL.png";
import XAUUSD from "../../icons/currencyPairs/XAUUSD.png";
import JPY from "../../icons/currencyPairs/JPY.png";
import BTC from "../../icons/currencyPairs/BTC.png";
import type { StaticImageData } from "next/image";
import { getCurrencySymbol } from "../../utils/common";

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

interface RecentOrdersProps {
  tradeHistory: Trade[];
  isLoadingTrades: Boolean;
  currency: string;
}

// Icon mappings
const ICONS = {
  AUD,
  CNH,
  CAD,
  GBP,
  NZD,
  USD,
  EUR,
  CHF,
  JPY,
  BTC
} as const;

interface PairIconProps {
  base: StaticImageData;
  quote?: StaticImageData;
  size?: number; // in px
}

const BASES = ["AUD", "CAD", "GBP", "NZD", "USD", "EUR", "CHF", "JPY","BTC","CNH"] as const;
const QUOTES = ["AUD", "CAD", "GBP", "NZD", "USD", "EUR", "CHF", "JPY","BTC","CNH"] as const;

type Base = typeof BASES[number];
type Quote = typeof QUOTES[number];

const pairIconMap: Record<string, StaticImageData> = {};

for (const base of BASES) {
  for (const quote of QUOTES) {
    if (base === quote) continue;
    const symbol = `${base}${quote}`;
    pairIconMap[symbol] = ICONS[base];
  }
}

pairIconMap["USOIL"] = USOIL;
pairIconMap["XAUUSD"] = XAUUSD;

export function getIconForSymbol(symbol: string): StaticImageData | undefined {
  return pairIconMap[symbol.toUpperCase()];
}

export default function RecentOrders({ tradeHistory, isLoadingTrades, currency }: RecentOrdersProps) {
  const [headersConfig, setHeadersConfig] = useState<{
    [key in keyof Trade]?: {
      label: string;
      show: boolean;
    };
  }>({
    sr_no: { label: "Sr No", show: true },
    symbol: { label: "Symbol", show: true },
    position_id: { label: "Position ID", show: false },
    open_date: { label: "Open Date", show: true },
    open_time: { label: "Open Time", show: false },
    close_date: { label: "Close Date", show: true },
    close_time: { label: "Close Time", show: false },
    type: { label: "Type", show: true },
    trade_duration: { label: "Duration", show: false },
    trade_duration_seconds: { label: "Duration (s)", show: false },
    open_price: { label: "Open Price", show: true },
    close_price: { label: "Close Price", show: true },
    no_of_deals: { label: "Deals", show: false },
    profit: { label: "Profit", show: true },
    sl_price: { label: "SL", show: true },
    tp_price: { label: "TP", show: true },
    volume: { label: "Volume", show: false },
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  
  const { isOpen, openModal, closeModal } = useModal();

  // Calculate pagination values
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = tradeHistory?.slice(indexOfFirstItem, indexOfLastItem) || [];

  // Update total pages when tradeHistory changes
  useEffect(() => {
    if (tradeHistory?.length > 0) {
      setTotalPages(Math.ceil(tradeHistory.length / itemsPerPage));
    } else {
      setTotalPages(1);
    }
  }, [tradeHistory, itemsPerPage]);

  // Reset to first page when tradeHistory changes
  useEffect(() => {
    setCurrentPage(1);
  }, [tradeHistory]);

  // Handle page change
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newItemsPerPage = parseInt(e.target.value);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      const halfVisible = Math.floor(maxVisiblePages / 2);
      let start = Math.max(1, currentPage - halfVisible);
      let end = Math.min(totalPages, start + maxVisiblePages - 1);
      
      if (end - start + 1 < maxVisiblePages) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }
      
      if (start > 1) {
        pageNumbers.push(1);
        if (start > 2) pageNumbers.push('...');
      }
      
      for (let i = start; i <= end; i++) {
        pageNumbers.push(i);
      }
      
      if (end < totalPages) {
        if (end < totalPages - 1) pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-3 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-4 md:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        {isLoadingTrades ? (
          <>
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-10 w-20 sm:w-24 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-10 w-20 sm:w-24 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </>
        ) : (
          <>
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
                Recent Orders
              </h3>
              <p className="text-xs text-gray-500 mt-1 sm:text-sm">
                Showing {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, tradeHistory?.length || 0)} of {tradeHistory?.length || 0} trades
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                className="inline-flex items-center gap-1 sm:gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 sm:px-4 sm:py-2.5 sm:text-theme-sm"
                onClick={openModal}
              >
                <svg
                  className="stroke-current fill-white dark:fill-gray-800"
                  width="18"
                  height="18"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2.29004 5.90393H17.7067"
                    stroke=""
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M17.7075 14.0961H2.29085"
                    stroke=""
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12.0826 3.33331C13.5024 3.33331 14.6534 4.48431 14.6534 5.90414C14.6534 7.32398 13.5024 8.47498 12.0826 8.47498C10.6627 8.47498 9.51172 7.32398 9.51172 5.90415C9.51172 4.48432 10.6627 3.33331 12.0826 3.33331Z"
                    fill=""
                    stroke=""
                    strokeWidth="1.5"
                  />
                  <path
                    d="M7.91745 11.525C6.49762 11.525 5.34662 12.676 5.34662 14.0959C5.34661 15.5157 6.49762 16.6667 7.91745 16.6667C9.33728 16.6667 10.4883 15.5157 10.4883 14.0959C10.4883 12.676 9.33728 11.525 7.91745 11.525Z"
                    fill=""
                    stroke=""
                    strokeWidth="1.5"
                  />
                </svg>
                <span className="hidden sm:inline">Filter</span>
              </button>
              {/* <button className="inline-flex items-center gap-1 sm:gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 sm:px-4 sm:py-2.5 sm:text-theme-sm">
                <span className="hidden sm:inline">See all</span>
                <span className="sm:hidden">All</span>
              </button> */}
            </div>
          </>
        )}
        <Modal
          isOpen={isOpen}
          onClose={closeModal}
          className="max-w-[700px] p-4 sm:p-6 lg:p-10"
        >
          {isLoadingTrades ? (
            <div className="mt-4">
              <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {Array(8).fill(0).map((_, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300 sm:text-md">
                Toggle Table Columns
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {Object.entries(headersConfig)?.map(([key, config]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 text-xs text-gray-800 dark:text-gray-200 sm:text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={config.show}
                      onChange={() => {
                        setHeadersConfig((prev) => ({
                          ...prev,
                          [key]: {
                            ...config,
                            show: !config.show,
                          },
                        }));
                      }}
                      className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                    />
                    {config.label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </Modal>
      </div>
      
      {/* Items per page selector */}
      {!isLoadingTrades && tradeHistory?.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 px-1 sm:px-0">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
              Show:
            </label>
            <select
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1 text-xs sm:text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray dark:text-white"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
            <span className="text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
              items per page
            </span>
          </div>
          
          {/* Pagination info */}
          <div className="text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      )}
      
      <div className="max-w-full overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
        <Table>
          {/* Table Header */}
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              {Object.entries(headersConfig)?.map(([key, config]) =>
                config.show && (
                  <TableCell
                    key={key}
                    isHeader
                    className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-500 text-start text-xs sm:text-theme-xs dark:text-gray-400"
                  >
                    {isLoadingTrades ? (
                      <div className="h-3 sm:h-4 w-16 sm:w-20 bg-gray-200 rounded animate-pulse"></div>
                    ) : (
                      config.label
                    )}
                  </TableCell>
                )
              )}
            </TableRow>
          </TableHeader>

          {/* Table Body */}
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoadingTrades ? (
              Array(5).fill(0).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {Object.entries(headersConfig)?.map(([key, config]) => {
                    if (!config.show) return null;
                    return (
                      <TableCell
                        key={key}
                        className="py-2 sm:py-3 px-2 sm:px-4 text-gray-500 text-xs sm:text-theme-sm dark:text-gray-400"
                      >
                        {key === "symbol" ? (
                          <div className="flex items-center gap-2">
                            <div className="relative w-5 h-3 sm:w-6 sm:h-4">
                              <div className="absolute left-0 top-0 h-3 w-3 sm:h-4 sm:w-4 bg-gray-200 rounded-full animate-pulse"></div>
                              <div className="absolute left-[-35%] top-[-50%] h-3 w-3 sm:h-4 sm:w-4 bg-gray-200 rounded-full animate-pulse"></div>
                            </div>
                            <div className="h-3 w-12 sm:h-4 sm:w-16 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        ) : key === "type" || key === "profit" ? (
                          <div className="h-4 w-12 sm:h-6 sm:w-16 bg-gray-200 rounded animate-pulse"></div>
                        ) : (
                          <div className="h-3 w-16 sm:h-4 sm:w-24 bg-gray-200 rounded animate-pulse"></div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              currentItems?.map((trade, rowIndex) => (
                <TableRow key={rowIndex}>
                  {Object.entries(headersConfig)?.map(([key, config]) => {
                    if (!config.show) return null;

                    const value = trade[key as keyof Trade];

                    if (key === "symbol") {
                      const symbol = trade.symbol.toUpperCase();
                      const base = symbol.substring(0, 3);
                      const quote = symbol.substring(3);

                      const baseIcon = ICONS[base as keyof typeof ICONS];
                      const quoteIcon = ICONS[quote as keyof typeof ICONS];
                      const fallbackIcon = getIconForSymbol(symbol);

                      return (
                        <TableCell
                          key={key}
                          className="py-2 sm:py-3 px-2 sm:px-4 text-gray-500 text-xs sm:text-theme-sm dark:text-gray-400"
                        >
                          <div className="flex items-center gap-1 sm:gap-2">
                            <div className="relative w-5 h-3 sm:w-6 sm:h-4">
                              {baseIcon && quoteIcon ? (
                                <>
                                  <img
                                    src={quoteIcon.src}
                                    alt={quote}
                                    className="absolute left-0 top-0 h-3 w-3 sm:h-4 sm:w-4 object-contain z-0"
                                  />
                                  <img
                                    src={baseIcon.src}
                                    alt={base}
                                    className="absolute left-[-35%] top-[-50%] h-3 w-3 sm:h-4 sm:w-4 object-contain z-10"
                                  />
                                </>
                              ) : (
                                fallbackIcon && (
                                  <img
                                    src={fallbackIcon.src}
                                    alt={symbol}
                                    className="h-5 w-5 sm:h-6 sm:w-6 object-contain"
                                  />
                                )
                              )}
                            </div>
                            <span className="truncate max-w-[60px] sm:max-w-none">{symbol}</span>
                          </div>
                        </TableCell>
                      );
                    }

                    if (key === "type") {
                      return (
                        <TableCell
                          key={key}
                          className="py-2 sm:py-3 px-2 sm:px-4 text-gray-500 text-xs sm:text-theme-sm dark:text-gray-400"
                        >
                          <Badge
                            size="sm"
                            color={value === "buy" ? "success" : "error"}
                          >
                            <span className="text-xs">
                              {String(value).charAt(0).toUpperCase() +
                                String(value).slice(1)}
                            </span>
                          </Badge>
                        </TableCell>
                      );
                    }

                    // Profit column 
                    if (key === "profit") {
                      const profitNumber = typeof value === "number" ? value : 0;
                      const formattedValue =
                        typeof value === "number" ? profitNumber.toFixed(3) : value ?? "—";

                      // Determine badge color: success for positive, error for negative, warning/neutral for zero
                      const badgeColor:any =
                        profitNumber > 0 ? "success" : profitNumber < 0 ? "error" : "neutral";

                      return (
                        <TableCell
                          key={key}
                          className="py-2 sm:py-3 px-2 sm:px-4 text-gray-500 text-xs sm:text-theme-sm dark:text-gray-400"
                        >
                          <Badge size="sm" color={badgeColor}>
                            <span className="text-xs">
                              {formattedValue} {getCurrencySymbol(currency)}
                            </span>
                          </Badge>
                        </TableCell>
                      );
                    }

                    if (key === "open_date" || key === "close_date") {
                      return (
                        <TableCell
                          key={key}
                          className="py-2 sm:py-3 px-2 sm:px-4 text-gray-500 text-xs sm:text-theme-sm dark:text-gray-400"
                        >
                          <span className="text-xs">{value}</span>
                        </TableCell>
                      );
                    }

                    if (key === "open_time" || key === "close_time") {
                      return (
                        <TableCell
                          key={key}
                          className="py-2 sm:py-3 px-2 sm:px-4 text-gray-500 text-xs sm:text-theme-sm dark:text-gray-400"
                        >
                          <span className="text-xs">{value}</span>
                        </TableCell>
                      );
                    }

                    if (key === "position_id") {
                      return (
                        <TableCell
                          key={key}
                          className="py-2 sm:py-3 px-2 sm:px-4 text-gray-500 text-xs sm:text-theme-sm dark:text-gray-400"
                        >
                          <span className="text-xs">{value}</span>
                        </TableCell>
                      );
                    }
if (key === "sr_no") {
  const sequentialNumber = indexOfFirstItem + rowIndex + 1;
  return (
    <TableCell
      key={key}
      className="py-2 sm:py-3 px-2 sm:px-4 text-gray-500 text-xs sm:text-theme-sm dark:text-gray-400"
    >
      <span className="text-xs">{sequentialNumber}</span>
    </TableCell>
  );
}
                    if (
                      key === "sl_price" ||
                      key === "tp_price" ||
                      key === "open_price" ||
                      key === "close_price"
                    ) {
                      const formattedValue =
                        typeof value === "number" ? value.toFixed(4) : value ?? "—";
                      return (
                        <TableCell
                          key={key}
                          className="py-2 sm:py-3 px-2 sm:px-4 text-gray-500 text-xs sm:text-theme-sm dark:text-gray-400"
                        >
                          <span className="text-xs">{formattedValue}</span>
                        </TableCell>
                      );
                    }

                    return (
                      <TableCell
                        key={key}
                        className="py-2 sm:py-3 px-2 sm:px-4 text-gray-500 text-xs sm:text-theme-sm dark:text-gray-400"
                      >
                        <span className="text-xs">{value?.toString() ?? "—"}</span>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination Controls */}
      {!isLoadingTrades && tradeHistory?.length > 0 && totalPages > 1 && (
        <div className="mt-4 sm:mt-6 px-1 sm:px-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Previous Button */}
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm ${
                currentPage === 1
                  ? "border-gray-300 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:text-gray-600"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              }`}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span className="hidden sm:inline">Previous</span>
            </button>
            
            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {getPageNumbers().map((page, index) => (
                <button
                  key={index}
                  onClick={() => typeof page === 'number' && handlePageChange(page)}
                  disabled={page === '...'}
                  className={`min-w-[32px] h-8 rounded-lg text-xs font-medium sm:min-w-[36px] sm:h-9 sm:text-sm ${
                    page === currentPage
                      ? "bg-indigo-600 text-white"
                      : page === '...'
                      ? "text-gray-400 cursor-default"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            
            {/* Next Button */}
            <button
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm ${
                currentPage === totalPages
                  ? "border-gray-300 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:text-gray-600"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              }`}
            >
              <span className="hidden sm:inline">Next</span>
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {!isLoadingTrades && tradeHistory?.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
            No trade history available.
          </p>
        </div>
      )}
    </div>
  );
}