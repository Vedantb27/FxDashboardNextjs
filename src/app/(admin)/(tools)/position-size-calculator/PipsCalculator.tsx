"use client";

import React, { useState } from "react";
import PageBreadcrumb from "../../../../components/common/PageBreadCrumb";
import Request from "../../../../utils/request";
import { FiLoader, FiAlertCircle, FiCheckCircle, FiInfo } from "react-icons/fi";

const FOREX_SYMBOLS = [
  "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", 
  "USDCAD", "NZDUSD", "EURGBP", "EURJPY", "GBPJPY",
  "EURCHF", "AUDJPY", "AUDNZD", "AUDCAD", "CADJPY"
];

export default function PositionSizeCalculator() {
  const [formData, setFormData] = useState({
    symbol: "EURUSD",
    accountBalance: 10000,
    riskPercentage: 1,
    entryPrice: 0,
    stopLoss: 0,
    accountCurrency: "USD",
  });
  const [result, setResult] = useState<{
    volume: number;
    symbol: string;
    pipAtRisk: number;
    moneyToRisk: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "symbol" ? value.toUpperCase() : parseFloat(value) || value,
    }));
  };

  const calculatePositionSize = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const { symbol, accountBalance, riskPercentage, entryPrice, stopLoss, accountCurrency } = formData;

    if (!symbol || accountBalance <= 0 || riskPercentage <= 0 || entryPrice <= 0 || stopLoss <= 0) {
      setError("Please fill all fields with valid values.");
      setLoading(false);
      return;
    }

    if (stopLoss === entryPrice) {
      setError("Stop loss price cannot be equal to entry price.");
      setLoading(false);
      return;
    }

    try {
      const symbolResponse = await Request({
        method: "GET",
        url: `position-size/symbol?symbol=${symbol}`,
      });

      const symbolData = symbolResponse;
      const onePipSize = symbolData.onePipSize || 0.0001;
      const lotSize = symbolData.lotSize || 100000;
      const quoteCurrency = symbolData.quoteCurrency || "USD";

      let rate = 1.0;
      if (accountCurrency !== quoteCurrency) {
        const exchangeResponse = await Request({
          method: "GET",
          url: `position-size/exchange-rate?from=${accountCurrency}&to=${quoteCurrency}`,
        });
        rate = exchangeResponse.rate || 1.0;
      }

      const moneyToRisk = accountBalance * (riskPercentage / 100);
      const pipAtRisk = Math.abs(entryPrice - stopLoss) / onePipSize;

      const response = await Request({
        method: "POST",
        url: "position-size/calculate",
        data: {
          moneyToRisk,
          pipAtRisk,
          lotSize,
          onePipSize,
          rate,
        },
      });

      if (response.success) {
        const volume = response.lots;
        setResult({ 
          volume, 
          symbol, 
          pipAtRisk: parseFloat(pipAtRisk.toFixed(2)), 
          moneyToRisk: parseFloat(moneyToRisk.toFixed(2)) 
        });
      } else {
        setError(response.message || "Failed to calculate position size. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Error calculating position size");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <div className="container mx-auto px-4 py-8">
        <PageBreadcrumb pageTitle="Position Size Calculator" />
        
        <div className="mt-6 flex justify-center">
          <div className="w-full max-w-2xl rounded-lg p-6 shadow-lg bg-white dark:bg-gray-800 shadow-gray-200 dark:shadow-gray-950">
            <h2 className="mb-4 text-xl font-semibold text-indigo-700 dark:text-indigo-300">
              Forex Position Size Calculator
            </h2>
            
            <div className="flex items-center gap-2 mb-4 p-3 rounded-md bg-indigo-50 text-indigo-800 dark:bg-gray-700 dark:text-indigo-100">
              <FiInfo className="flex-shrink-0" />
              <p className="text-sm">
                Calculate the optimal position size for your forex trades based on your risk parameters.
              </p>
            </div>

            <form onSubmit={calculatePositionSize} className="w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Symbol Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Symbol
                  </label>
                  <select
                    name="symbol"
                    value={formData.symbol}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="mt-1 block w-full rounded-md shadow-sm border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-500"
                    required
                  >
                    {FOREX_SYMBOLS.map(symbol => (
                      <option key={symbol} value={symbol}>{symbol}</option>
                    ))}
                  </select>
                </div>

                {/* Account Balance */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Account Balance
                  </label>
                  <div className="relative mt-1">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500 dark:text-gray-400">
                      {formData.accountCurrency}
                    </div>
                    <input
                      type="number"
                      name="accountBalance"
                      value={formData.accountBalance}
                      onChange={handleInputChange}
                      disabled={loading}
                      className="block w-full pl-12 rounded-md shadow-sm border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-500"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                {/* Risk Percentage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Risk Percentage
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      name="riskPercentage"
                      value={formData.riskPercentage}
                      onChange={handleInputChange}
                      disabled={loading}
                      className="block w-full pr-12 rounded-md shadow-sm border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-500"
                      min="0"
                      max="100"
                      step="0.1"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500 dark:text-gray-400">
                      %
                    </div>
                  </div>
                </div>

                {/* Account Currency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Account Currency
                  </label>
                  <select
                    name="accountCurrency"
                    value={formData.accountCurrency}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="mt-1 block w-full rounded-md shadow-sm border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-500"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="JPY">JPY</option>
                    <option value="AUD">AUD</option>
                    <option value="CAD">CAD</option>
                    <option value="CHF">CHF</option>
                  </select>
                </div>

                {/* Entry Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Entry Price
                  </label>
                  <input
                    type="number"
                    name="entryPrice"
                    value={formData.entryPrice}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="mt-1 block w-full rounded-md shadow-sm border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-500"
                    min="0"
                    step="0.00001"
                    required
                  />
                </div>

                {/* Stop Loss Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Stop Loss Price
                  </label>
                  <input
                    type="number"
                    name="stopLoss"
                    value={formData.stopLoss}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="mt-1 block w-full rounded-md shadow-sm border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-500"
                    min="0"
                    step="0.00001"
                    required
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-2 rounded-md flex items-center gap-2 ${
                    loading 
                      ? 'bg-gray-300 text-gray-600 dark:bg-gray-600 dark:text-gray-400'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 dark:hover:bg-indigo-500'
                  }`}
                >
                  {loading ? (
                    <>
                      <FiLoader className="animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    'Calculate Position Size'
                  )}
                </button>
              </div>
            </form>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 rounded-md flex items-start gap-2 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                <FiAlertCircle className="flex-shrink-0 mt-0.5" />
                <div>{error}</div>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="mt-6 p-4 rounded-md bg-gray-100 dark:bg-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <FiCheckCircle className="flex-shrink-0 text-green-600 dark:text-green-300" />
                  <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">
                    Position Size Calculated
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div className="p-3 rounded bg-white dark:bg-gray-600">
                    <p className="text-sm text-gray-500 dark:text-gray-300">Symbol</p>
                    <p className="font-medium text-gray-900 dark:text-white">{result.symbol}</p>
                  </div>
                  
                  <div className="p-3 rounded bg-white dark:bg-gray-600">
                    <p className="text-sm text-gray-500 dark:text-gray-300">Position Size</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {result.volume.toFixed(2)} lots
                    </p>
                  </div>
                  
                  <div className="p-3 rounded bg-white dark:bg-gray-600">
                    <p className="text-sm text-gray-500 dark:text-gray-300">Pips at Risk</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {result.pipAtRisk.toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="p-3 rounded bg-white dark:bg-gray-600">
                    <p className="text-sm text-gray-500 dark:text-gray-300">Money at Risk</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formData.accountCurrency} {result.moneyToRisk.toFixed(2)}
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