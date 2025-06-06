"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import { useState } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../../components/ui/modal";
import AUD from "../../icons/currencyPairs/AUD.png";
import CAD from "../../icons/currencyPairs/CAD.png";
import GBP from "../../icons/currencyPairs/GBP.png";
import NZD from "../../icons/currencyPairs/NZD.png";
import USD from "../../icons/currencyPairs/USD.png";
import EUR from "../../icons/currencyPairs/EUR.png";
import CHF from "../../icons/currencyPairs/CHF.png";
import USOIL from "../../icons/currencyPairs/USOIL.png";
import XAUUSD from "../../icons/currencyPairs/XAUUSD.png";
import JPY from "../../icons/currencyPairs/JPY.png";
import type { StaticImageData } from "next/image";

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
}

// Icon mappings
const ICONS = {
  AUD,
  CAD,
  GBP,
  NZD,
  USD,
  EUR,
  CHF,
  JPY,
} as const;

interface PairIconProps {
  base: StaticImageData;
  quote?: StaticImageData;
  size?: number; // in px
}

const BASES = ["AUD", "CAD", "GBP", "NZD", "USD", "EUR", "CHF", "JPY"] as const;
const QUOTES = ["AUD", "CAD", "GBP", "NZD", "USD", "EUR", "CHF", "JPY"] as const;

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

export default function RecentOrders({ tradeHistory }: RecentOrdersProps) {
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

  const { isOpen, openModal, closeModal } = useModal();

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Recent Orders
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
            onClick={openModal}
          >
            <svg
              className="stroke-current fill-white dark:fill-gray-800"
              width="20"
              height="20"
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
            Filter
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
            See all
          </button>
        </div>
        <Modal
          isOpen={isOpen}
          onClose={closeModal}
          className="max-w-[700px] p-6 lg:p-10"
        >
          <div className="mt-4">
            <h4 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">
              Toggle Table Columns
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(headersConfig)?.map(([key, config]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200"
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
        </Modal>
      </div>
      <div className="max-w-full overflow-x-auto">
        <Table>
          {/* Table Header */}
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              {Object.entries(headersConfig)?.map(([key, config]) =>
                config.show && (
                  <TableCell
                    key={key}
                    isHeader
                    className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    {config.label}
                  </TableCell>
                )
              )}
            </TableRow>
          </TableHeader>

          {/* Table Body */}
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {tradeHistory?.map((trade, rowIndex) => (
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
                        className="py-3 text-gray-500 text-theme-sm dark:text-gray-400"
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative w-6 h-4">
                            {baseIcon && quoteIcon ? (
                              <>
                                <img
                                  src={quoteIcon.src}
                                  alt={quote}
                                  className="absolute left-0 top-0 h-4 w-4 object-contain z-0"
                                />
                                <img
                                  src={baseIcon.src}
                                  alt={base}
                                  className="absolute left-[-35%] top-[-50%] h-4 w-4 object-contain z-10"
                                />
                              </>
                            ) : (
                              fallbackIcon && (
                                <img
                                  src={fallbackIcon.src}
                                  alt={symbol}
                                  className="h-8 w-8 object-contain"
                                />
                              )
                            )}
                          </div>
                          <span>{symbol}</span>
                        </div>
                      </TableCell>
                    );
                  }

                  if (key === "type") {
                    return (
                      <TableCell
                        key={key}
                        className="py-3 text-gray-500 text-theme-sm dark:text-gray-400"
                      >
                        <Badge
                          size="sm"
                          color={value === "buy" ? "success" : "error"}
                        >
                          {String(value).charAt(0).toUpperCase() +
                            String(value).slice(1)}
                        </Badge>
                      </TableCell>
                    );
                  }

                  // Profit column 
                  if (key === "profit") {
                    const profitNumber = typeof value === "number" ? value : 0;
                    const formattedValue =
                      typeof value === "number" ? profitNumber.toFixed(4) : value ?? "—";

                    // Determine badge color: success for positive, error for negative, warning/neutral for zero
                    const badgeColor:any =
                      profitNumber > 0 ? "success" : profitNumber < 0 ? "error" : "neutral";

                    return (
                      <TableCell
                        key={key}
                        className="py-3 text-gray-500 text-theme-sm dark:text-gray-400"
                      >
                        <Badge size="sm" color={badgeColor}>
                          {formattedValue}
                        </Badge>
                      </TableCell>
                    );
                  }

                  if (key === "open_date" || key === "close_date") {
                    return (
                      <TableCell
                        key={key}
                        className="py-3 text-gray-500 text-theme-sm dark:text-gray-400"
                      >
                        {value}
                      </TableCell>
                    );
                  }

                  if (key === "open_time" || key === "close_time") {
                    return (
                      <TableCell
                        key={key}
                        className="py-3 text-gray-500 text-theme-sm dark:text-gray-400"
                      >
                        {value}
                      </TableCell>
                    );
                  }

                  if (key === "position_id") {
                    return (
                      <TableCell
                        key={key}
                        className="py-3 text-gray-500 text-theme-sm dark:text-gray-400"
                      >
                        {value}
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
                        className="py-3 text-gray-500 text-theme-sm dark:text-gray-400"
                      >
                        {formattedValue}
                      </TableCell>
                    );
                  }

                  return (
                    <TableCell
                      key={key}
                      className="py-3 text-gray-500 text-theme-sm dark:text-gray-400"
                    >
                      {value?.toString() ?? "—"}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}