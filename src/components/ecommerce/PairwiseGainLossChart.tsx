"use client";
import { useState, useEffect, useMemo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { getCurrencySymbol } from "../../utils/common";
import { Modal } from "../../components/ui/modal";
import { useModal } from "../../hooks/useModal";
import type { StaticImageData } from "next/image";
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

interface ChartData {
    symbol: string;
    profit: number;
    tradeCount: number;
    fill: string;
}

interface PairwiseGainLossChartProps {
    tradeHistory: Trade[];
    isLoadingTrades: boolean;
    currency: string;
}

// Icon mappings (reused from RecentOrders)
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
    BTC,
} as const;

const BASES = ["AUD", "CAD", "GBP", "NZD", "USD", "EUR", "CHF", "JPY", "BTC", "CNH"] as const;
const QUOTES = ["AUD", "CAD", "GBP", "NZD", "USD", "EUR", "CHF", "JPY", "BTC", "CNH"] as const;

type Base = typeof BASES[number];
type Quote = typeof QUOTES[number];

const pairIconMap: Record<string, StaticImageData> = {};

for (const base of BASES) {
    for (const quote of QUOTES) {
        if (base === quote) continue;
        const symbol = `${base}${quote}`;
        pairIconMap[symbol] = ICONS[base as keyof typeof ICONS];
    }
}

pairIconMap["USOIL"] = USOIL;
pairIconMap["XAUUSD"] = XAUUSD;

export function getIconForSymbol(symbol: string): StaticImageData | undefined {
    return pairIconMap[symbol.toUpperCase()];
}

// Custom Tooltip for chart with icons and currency
const CustomTooltip = ({
    active,
    payload,
    label,
}: {
    active?: any;
    payload?: any;
    label?: string;
}) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload as ChartData;
        const symbol = label;
        const profit = data.profit;
        const icon = getIconForSymbol(symbol || "");
        const currencySymbol = getCurrencySymbol("USD"); // Assuming default, adjust as needed

        return (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                    {icon && (
                        <img
                            src={icon.src}
                            alt={symbol}
                            className="h-4 w-4 object-contain"
                        />
                    )}
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">{symbol}</span>
                </div>
                <div className="text-sm">
                    <p className={`font-medium ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        Profit: {profit.toFixed(2)} {currencySymbol}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">
                        Total Trades: {data.tradeCount || 0}
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

// Custom XAxis Tick with Icon
const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const symbol = payload.value;
    const icon = getIconForSymbol(symbol);

    return (
        <g transform={`translate(${x}, ${y})`}>
            {icon && (
                <image
                    xlinkHref={icon.src}
                    x={-8}
                    y={-24}
                    width={16}
                    height={16}
                    style={{ pointerEvents: 'none' }}
                />
            )}
            <text
                x={0}
                y={0}
                dy={16}
                textAnchor="middle"
                fill="#666"
                fontSize={12}
                transform="rotate(-45 0 0)"
            >
                {symbol}
            </text>
        </g>
    );
};

export default function PairwiseGainLossChart({ tradeHistory, isLoadingTrades, currency }: PairwiseGainLossChartProps) {
    const { isOpen, openModal, closeModal } = useModal();

    // Compute aggregated data for chart
    const chartData = useMemo((): ChartData[] => {
        if (!tradeHistory || tradeHistory.length === 0) return [];

        const aggregated = tradeHistory.reduce((acc: Record<string, { profit: number; tradeCount: number }>, trade) => {
            const symbol = trade.symbol.toUpperCase();
            if (!acc[symbol]) {
                acc[symbol] = { profit: 0, tradeCount: 0 };
            }
            acc[symbol].profit += trade.profit;
            acc[symbol].tradeCount += 1;
            return acc;
        }, {});

        return Object.entries(aggregated)
            .map(([symbol, data]) => ({
                symbol,
                profit: data.profit,
                tradeCount: data.tradeCount,
                fill: data.profit >= 0 ? "#10B981" : "#EF4444",
            }))
            .sort((a, b) => b.profit - a.profit) // Sort by profit descending
        //   .slice(0, 10); // Top 10 pairs for chart
    }, [tradeHistory]);

    // Loading skeleton
    if (isLoadingTrades) {
        return (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-3 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-4 md:px-6">
                <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-10 w-20 sm:w-24 bg-gray-200 rounded-lg animate-pulse"></div>
                    </div>
                </div>
                <div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
        );
    }
    return (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-3 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-4 md:px-6">
            <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
                        Pairwise Gain/Loss
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 sm:text-sm">
                        Net profit in {getCurrencySymbol(currency)}
                    </p>
                </div>
            </div>
            {chartData.length === 0 ? (
                <div className="py-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                        No trade history available for chart.
                    </p>
                </div>
            ) : (
                <div className="relative h-80 sm:h-96 overflow-x-auto">
                    <div
                        className="h-full"
                        style={{
                            minWidth:
                                chartData.length > 6
                                    ? chartData.length * 80 // each bar ~80px on mobile
                                    : "100%",
                        }}
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                            >
                                {/* <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /> */}
                                <XAxis
                                    dataKey="symbol"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={<CustomXAxisTick />}
                                    height={60}
                                    interval={0}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(value) => `${value.toFixed(0)}${getCurrencySymbol(currency)}`}
                                    tick={{ fontSize: 12, fill: "#6b7280" }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="profit" fill="#10B981" />

                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}