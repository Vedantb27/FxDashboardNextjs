"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SymbolSelectProps {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  symbols: string[];
  marketData: any; // Live market data prop
  error?: string;
}

const SymbolSelect: React.FC<SymbolSelectProps> = React.memo(
  ({ label, value, onChange, symbols, marketData, error }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState(value || "");
    const wrapperRef = useRef<HTMLDivElement>(null);

    /* ---------------------------------------------------------------------------
       Close dropdown when clicked outside
    --------------------------------------------------------------------------- */
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    /* ---------------------------------------------------------------------------
       Filter available symbols efficiently
    --------------------------------------------------------------------------- */
    const filteredSymbols = useMemo(() => {
      return symbols.filter((s) =>
        s.toLowerCase().includes(search.toLowerCase())
      );
    }, [symbols, search]);

    /* ---------------------------------------------------------------------------
       Get Bid/Ask for a given symbol (live updates)
    --------------------------------------------------------------------------- */
    const getPrices = useCallback(
      (symbol: string) => {
        const m = marketData.find((d: any) => d.symbol === symbol);
        if (!m || m.bid == null || m.ask == null) return null;
        return { bid: m.bid, ask: m.ask };
      },
      [marketData]
    );

    // Get live prices for the currently selected symbol
    const selectedPrices = useMemo(() => {
      return value ? getPrices(value) : null;
    }, [value, marketData, getPrices]);

    /* ---------------------------------------------------------------------------
       Handle selection
    --------------------------------------------------------------------------- */
    const handleSelect = (sym: string) => {
      setSearch(sym);
      setIsOpen(false);
      onChange(sym);
    };

    useEffect(() => {
      if (value) setSearch(value);
    }, [value]);

    return (
      <div className="relative mb-5" ref={wrapperRef}>
        {/* Label */}
        {label && (
          <label
            className={`block text-sm font-semibold mb-2 ${error
                ? "text-red-600 dark:text-red-400"
                : "text-gray-700 dark:text-gray-300"
              }`}
          >
            {label}
          </label>
        )}

        {/* Input */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value.toUpperCase());
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search symbol (e.g., EURUSD)"
            className={`w-full p-3 pl-10 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-400
              text-gray-900 dark:text-white
              ${error
                ? "border-red-500 focus:border-red-500 focus:ring-red-200 bg-red-50/50 dark:bg-red-900/20"
                : "border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-800/70 focus:border-blue-400"
              }`}
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>

          {/* Dropdown */}
          <AnimatePresence>
            {isOpen && (
              <motion.ul
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="absolute z-40 w-full mt-1 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 
    bg-white dark:bg-gray-800 overflow-hidden text-sm max-h-56 overflow-y-auto
    scrollbar-thin scrollbar-thumb-gray-400/50 scrollbar-track-transparent hover:scrollbar-thumb-gray-500/70"
              >

                {filteredSymbols.length > 0 ? (
                  filteredSymbols.map((sym) => {
                    const prices = getPrices(sym);
                    const isSelected = value === sym;

                    return (
                      <li
                        key={sym}
                        className={`px-4 py-2 flex justify-between items-center cursor-pointer transition-colors
                          ${isSelected
                            ? "bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                            : "text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/40 dark:hover:bg-gray-700/50"
                          }`}
                        onClick={() => handleSelect(sym)}
                      >
                        <span className="font-medium">{sym}</span>
                        {prices ? (
                          <span className="text-xs text-gray-600 dark:text-gray-300">
                            <span className="text-green-500">
                              Bid: {prices.bid.toFixed(5)}
                            </span>
                            <span className="text-red-500 ml-2">
                              Ask: {prices.ask.toFixed(5)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            No data
                          </span>
                        )}
                      </li>
                    );
                  })
                ) : (
                  <li className="px-4 py-2 text-gray-500 dark:text-gray-400 text-sm">
                    No symbols found
                  </li>
                )}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        {/* 🟢 Show selected symbol live Bid/Ask */}
        {selectedPrices && (
          <div className="mt-2 p-2 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300">
            <div className="flex justify-between">
              <span>Live Price for {value}</span>
              <span className="flex gap-2">
                <span className="text-green-500 font-semibold">
                  Bid: {selectedPrices.bid.toFixed(5)}
                </span>
                <span className="text-red-500 font-semibold">
                  Ask: {selectedPrices.ask.toFixed(5)}
                </span>
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);
SymbolSelect.displayName = "SymbolSelect";
export default SymbolSelect;