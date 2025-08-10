"use client";

import React, { useState } from "react";
import PageBreadcrumb from "../../../../components/common/PageBreadCrumb";
import Request from "../../../../utils/request";
import { FiLoader, FiAlertCircle, FiCheckCircle, FiInfo } from "react-icons/fi";

const FOREX_SYMBOLS = [
      "EURUSD",
      "USDJPY",
      "GBPUSD",
      "AUDUSD",
      "USDCAD",
      "USDCHF",
      "NZDUSD",

      // Minor/Cross Pairs
      "EURJPY",
      "GBPJPY",
      "EURGBP",
      "EURCHF",
      "AUDJPY",
      "CADJPY",
      "CHFJPY",
      "AUDNZD",
      "EURAUD",
      "GBPAUD",
      "GBPCAD",
      "GBPCHF",
      "NZDJPY",
      "AUDCAD",
      "AUDCHF",
      "CADCHF",
      "EURNZD",
      "GBPNZD",
      "NZDCAD",
      "NZDCHF",

      // Additional Minor/Cross Pairs
      "EURCAD",
      "EURSEK",
      "EURNOK",
      "USDSEK",
      "USDNOK",
      "USDHKD",
      "USDSGD",
      "EURPLN",
      "USDPLN",
      "USDDKK",
      "EURDKK",
      "AUDGBP",
      "CADSGD",
      "CHFSGD",
      "EURSGD",
      "GBPSGD",
      "NZDSGD",

      // Exotic Pairs
      "USDTRY",
      "USDMXN",
      "USDZAR",
      "USDRUB",
      "USDINR",
      "USDBRL",
      "USDCZK",
      "USDHUF",
      "EURTRY",
      "EURMXN",
      "EURZAR",
      "EURRUB",
      "EURHUF",
      "GBPRUB",
      "GBPZAR",
      "GBPTRY",
      "AUDMXN",
      "AUDZAR",
      "CADMXN",
      "CADZAR",
      "NZDMXN",
      "NZDZAR",

      // Precious Metal Pairs (often included in MT5 forex brokers)
      "XAUUSD", // Gold vs. USD
      "XAGUSD", // Silver vs. USD
      "XAUEUR", // Gold vs. EUR
      "XAGEUR", // Silver vs. EUR
      "XTIUSD",
      "BTCUSD",
];
export default function ProfitCalculator() {
  const [formData, setFormData] = useState({
    symbol: "AUDUSD",
    accountCurrency: "USD",
    buyOrSell: 1,
    lots: 1,
    openPrice: 0,
    closePrice: 0,
  });
  const [result, setResult] = useState<{
    profit: number;
    profitPips: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "symbol"
        ? value.toUpperCase()
        : name === "buyOrSell"
        ? parseInt(value)
        : parseFloat(value) || value,
    }));
  };

  const calculateProfit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const { symbol, accountCurrency, buyOrSell, lots, openPrice, closePrice } = formData;

    if (
      !symbol ||
      lots <= 0 ||
      openPrice <= 0 ||
      closePrice <= 0 ||
      accountCurrency === ""
    ) {
      setError("Please fill all fields with valid values.");
      setLoading(false);
      return;
    }

    if (openPrice === closePrice) {
      setError("Open and close price cannot be the same.");
      setLoading(false);
      return;
    }

    try {
      // Get symbol meta info (pip size, lot size, quote currency)
      const symbolResponse = await Request({
        method: "GET",
        url: `position-size/symbol?symbol=${symbol}`,
      });

      const onePipSize = symbolResponse.onePipSize || 0.0001;
      const lotSize = symbolResponse.lotSize || 100000;
      const quoteCurrency = symbolResponse.quoteCurrency || "USD";

      let rate = 1.0;
      if (accountCurrency !== quoteCurrency) {
        const exchangeResponse = await Request({
          method: "GET",
          url: `position-size/exchange-rate?from=${accountCurrency}&to=${quoteCurrency}`,
        });
        rate = exchangeResponse?.rate || 1.0;
      }

      // Calculate pips
      const pipAmount = Math.round(
        (closePrice - openPrice) / onePipSize
      );

      const profitResponse = await Request({
        method: "POST",
        url: "position-size/calculate-profit", 
        data: {
          buyOrSell:buyOrSell?buyOrSell:-1,
          lots,
          pipAmount,
          onePipSize,
          lotSize,
          rate,
        },
      });

      // Extract result
      if (profitResponse) {
        setResult({
          profit: parseFloat(profitResponse.result?.toFixed(2) || "0"),
          profitPips: profitResponse?.pipResult,
        });
      } else {
        setError(profitResponse.message || "Profit calculation failed.");
      }
    } catch (err: any) {
      setError(err.message || "Error calculating profit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen dark:bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-8">
        <PageBreadcrumb pageTitle="Profit Calculator" />

        <div className="mt-6 flex justify-center">
          <div className="w-full max-w-2xl rounded-xl p-6 dark:bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 shadow-2xl shadow-gray-950">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-1 bg-indigo-500 rounded-full"></div>
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                FOREX PROFIT CALCULATOR
              </h2>
            </div>

            <div className="flex items-center gap-3 mb-6 p-4 rounded-lg bg-gray-800 border-l-4 border-indigo-500">
              <FiInfo className="flex-shrink-0 text-indigo-400" />
              <p className="text-sm text-gray-300">
                Calculate profit or loss for your forex trades based on your trade size, direction, and price.
              </p>
            </div>

            <form onSubmit={calculateProfit} className="w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Symbol */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-400 uppercase tracking-wider">Symbol</label>
                  <div className="relative">
                    <select
                      name="symbol"
                      value={formData.symbol}
                      onChange={handleInputChange}
                      disabled={loading}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 hover:border-gray-600 disabled:opacity-50 appearance-none"
                      required
                    >
                      {FOREX_SYMBOLS.map(symbol => (
                        <option key={symbol} value={symbol}>{symbol}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                {/* Account Currency */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-400 uppercase tracking-wider">Deposit Currency</label>
                  <div className="relative">
                    <select
                      name="accountCurrency"
                      value={formData.accountCurrency}
                      onChange={handleInputChange}
                      disabled={loading}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 hover:border-gray-600 disabled:opacity-50 appearance-none"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="JPY">JPY</option>
                      <option value="AUD">AUD</option>
                      <option value="CAD">CAD</option>
                      <option value="CHF">CHF</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                {/* Buy/Sell */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-400 uppercase tracking-wider">Buy or Sell</label>
                  <select
                    name="buyOrSell"
                    value={formData.buyOrSell}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 hover:border-gray-600 disabled:opacity-50 appearance-none"
                  >
                    <option value={1}>Buy</option>
                    <option value={0}>Sell</option>
                  </select>
                </div>
                {/* Lots (Trade Size) */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-400 uppercase tracking-wider">Lots (trade size)</label>
                  <input
                    type="number"
                    name="lots"
                    value={formData.lots}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 hover:border-gray-600 disabled:opacity-50"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
                {/* Open Price */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-400 uppercase tracking-wider">Open price</label>
                  <input
                    type="number"
                    name="openPrice"
                    value={formData.openPrice}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 hover:border-gray-600 disabled:opacity-50"
                    step="0.00001"
                    required
                  />
                </div>
                {/* Close Price */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-400 uppercase tracking-wider">Close price</label>
                  <input
                    type="number"
                    name="closePrice"
                    value={formData.closePrice}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 hover:border-gray-600 disabled:opacity-50"
                    step="0.00001"
                    required
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-8 py-3 rounded-lg flex items-center gap-2 font-bold tracking-wide transition-all duration-300 ${
                    loading 
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-indigo-500/20'
                  }`}
                >
                  {loading ? (
                    <>
                      <FiLoader className="animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      CALCULATE PROFIT
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Error Message */}
            {error && (
              <div className="mt-6 p-4 rounded-lg flex items-start gap-3 bg-red-900/50 border-l-4 border-red-500">
                <FiAlertCircle className="flex-shrink-0 mt-0.5 text-red-400" />
                <div className="text-red-200">{error}</div>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="mt-8 p-6 rounded-xl bg-gray-800 border border-gray-700 font-mono">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-full bg-indigo-500/20">
                    <FiCheckCircle className="text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    PROFIT CALCULATED
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="p-4 rounded-lg bg-gray-700/50 border border-gray-600">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Profit in Money</p>
                    <p className="mt-1 text-lg font-bold text-white">
                      {formData.accountCurrency} {result.profit.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-700/50 border border-gray-600">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Profit in Pips</p>
                    <p className="mt-1 text-lg font-bold text-white">
                      {result.profitPips}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
