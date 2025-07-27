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
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-8">
        <PageBreadcrumb pageTitle="Position Size Calculator" />
        
        <div className="mt-6 flex justify-center">
          <div className="w-full max-w-2xl rounded-xl p-6 bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 shadow-2xl shadow-gray-950">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-1 bg-indigo-500 rounded-full"></div>
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                FOREX POSITION SIZE CALCULATOR
              </h2>
            </div>
            
            <div className="flex items-center gap-3 mb-6 p-4 rounded-lg bg-gray-800 border-l-4 border-indigo-500">
              <FiInfo className="flex-shrink-0 text-indigo-400" />
              <p className="text-sm text-gray-300">
                Calculate the optimal position size for your forex trades based on your risk parameters.
              </p>
            </div>

            <form onSubmit={calculatePositionSize} className="w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Symbol Dropdown */}
                 <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-400 uppercase tracking-wider">
          Symbol
        </label>
        <div className="relative">
          <select
            name="symbol"
            value={formData.symbol}
            onChange={handleInputChange}
            disabled={loading}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 hover:border-gray-600 disabled:opacity-50 appearance-none" // Added appearance-none
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

                {/* Account Balance */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Account Balance
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
                      {formData.accountCurrency}
                    </div>
                    <input
                      type="number"
                      name="accountBalance"
                      value={formData.accountBalance}
                      onChange={handleInputChange}
                      disabled={loading}
                      className="w-full pl-12 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 hover:border-gray-600 disabled:opacity-50"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                {/* Risk Percentage */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Risk Percentage
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="riskPercentage"
                      value={formData.riskPercentage}
                      onChange={handleInputChange}
                      disabled={loading}
                      className="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 hover:border-gray-600 disabled:opacity-50"
                      min="0"
                      max="100"
                      step="0.1"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                      %
                    </div>
                  </div>
                </div>

                {/* Account Currency */}
               <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-400 uppercase tracking-wider">
          Account Currency
        </label>
        <div className="relative">
          <select
            name="accountCurrency"
            value={formData.accountCurrency}
            onChange={handleInputChange}
            disabled={loading}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 hover:border-gray-600 disabled:opacity-50 appearance-none" // Added appearance-none
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


                {/* Entry Price */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Entry Price
                  </label>
                  <input
                    type="number"
                    name="entryPrice"
                    value={formData.entryPrice}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 hover:border-gray-600 disabled:opacity-50"
                    min="0"
                    step="0.00001"
                    required
                  />
                </div>

                {/* Stop Loss Price */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Stop Loss Price
                  </label>
                  <input
                    type="number"
                    name="stopLoss"
                    value={formData.stopLoss}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 hover:border-gray-600 disabled:opacity-50"
                    min="0"
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
                      CALCULATE POSITION
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
              <div className="mt-8 p-6 rounded-xl bg-gray-800 border border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-full bg-indigo-500/20">
                    <FiCheckCircle className="text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    POSITION SIZE CALCULATED
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="p-4 rounded-lg bg-gray-700/50 border border-gray-600">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Symbol</p>
                    <p className="mt-1 text-lg font-bold text-white">{result.symbol}</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-gray-700/50 border border-gray-600">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Position Size</p>
                    <p className="mt-1 text-lg font-bold text-white">
                      {result.volume.toFixed(2)} <span className="text-sm text-gray-400">lots</span>
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-gray-700/50 border border-gray-600">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Pips at Risk</p>
                    <p className="mt-1 text-lg font-bold text-white">
                      {result.pipAtRisk.toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-gray-700/50 border border-gray-600">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Money at Risk</p>
                    <p className="mt-1 text-lg font-bold text-white">
                      <span className="text-sm text-gray-400">{formData.accountCurrency}</span> {result.moneyToRisk.toFixed(2)}
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