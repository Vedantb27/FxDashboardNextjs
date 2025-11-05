"use client";

import React, { useState, useRef, useEffect } from "react";
import PageBreadcrumb from "../../../../components/common/PageBreadCrumb";
import Request from "../../../../utils/request";
import { AUTH_STORAGE_KEY } from "../../../../utils/envConfig"; // Adjust path as needed
import { toast } from "react-toastify";
import Image from "next/image";
import mt5 from '../../../../icons/mt5.png'; // Adjust path as needed
import cTraderIcon from '../../../../icons/ctrader.png'; // Adjust path as needed

interface Account {
  accountNumber: number;
  server: string;
  platform: "MT5" | "cTrader";
  createdAt: string;
  balance?: number; // Added based on usage in fetch
}

interface TradeData {
  // Common fields; adjust based on actual Redis structure from Python code
  id: string;
  symbol: string;
  trade_setup: string;
  price?: number;
  volume?: number;
  stopLoss?: number;
  takeProfit?: number;
  execution_time?: string;
  closing_time?: string;
  profit?: number;
  // Add more as needed: order_id, order_type, etc.
}

// Skeleton Loader Component (similar to Calendar)
const SkeletonLoader: React.FC = () => {
  return (
    <div className="animate-pulse space-y-4">
      {/* Account Dropdown Skeleton */}
      <div className="p-4">
        <div className="w-64">
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
      {/* Tables Skeleton */}
      <div className="p-4 space-y-6">
        {["Pending Orders", "Open Positions", "Closed Trades", "Removed Orders"].map((section) => (
          <div key={section}>
            <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {[...Array(5)].map((_, i) => (
                      <th key={i} className="px-6 py-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-900">
                  {[...Array(3)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(5)].map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function TradeManager() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [pending, setPending] = useState<TradeData[]>([]);
  const [running, setRunning] = useState<TradeData[]>([]);
  const [executed, setExecuted] = useState<TradeData[]>([]);
  const [removed, setRemoved] = useState<TradeData[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch token from sessionStorage on mount, similar to Request utility
  useEffect(() => {
    const tokenData = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (tokenData) {
      try {
        const parsedToken = JSON.parse(tokenData);
        setToken(parsedToken.token);
      } catch (e) {
        console.error('Failed to parse token data:', e);
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
        // Optionally redirect to login
      }
    } else {
      // No token data, redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/signin';
      }
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    const fetchAccounts = async () => {
      setIsLoadingAccounts(true);
      try {
        const response = await Request({
          method: "GET",
          url: "trading-accounts",
        });
        if (response) {
          // Sort accounts by platform (MT5 first, then cTrader) and account number
          const sortedAccounts = response.sort((a: Account, b: Account) => {
            if (a.platform === b.platform) {
              return a.accountNumber - b.accountNumber;
            }
            return a.platform === "MT5" ? -1 : 1;
          });
          setAccounts(sortedAccounts || []);
          if (sortedAccounts.length > 0) {
            setSelectedAccount(sortedAccounts[0]?.accountNumber.toString());
            setBalance(sortedAccounts[0]?.balance || 0);
          }
        }
      } catch (error) {
        toast.error("Error fetching accounts");
      } finally {
        setIsLoadingAccounts(false);
      }
    };
    fetchAccounts();
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // WebSocket connection logic
  useEffect(() => {
    if (!selectedAccount || !token) return;

    const connectWS = () => {
      setIsConnecting(true);
      const wsUrl = `ws://localhost:8000?token=${encodeURIComponent(token)}&accountNumber=${encodeURIComponent(selectedAccount)}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log(`WebSocket connected for account ${selectedAccount}`);
        setIsConnecting(false);
        toast.success(`Connected to live trades for account ${selectedAccount}`);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          const { type, data } = parsed;
          if (type === 'update') {
            setPending(data.pending || []);
            setRunning(data.running || []);
            setExecuted(data.executed || []);
            setRemoved(data.removed || []);
          } else if (type === 'error') {
            toast.error(data?.message || 'Unknown error');
          }
        } catch (err) {
          console.error('WebSocket message parse error:', err);
        }
      };

      ws.onclose = (event) => {
        console.log(`WebSocket closed for account ${selectedAccount}:`, event.code, event.reason);
        setIsConnecting(false);
        // Optional: Auto-reconnect after 3s
        setTimeout(() => {
          if (selectedAccount === selectedAccount) { // Still same account
            connectWS();
          }
        }, 3000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setIsConnecting(false);
        toast.error('Connection error; retrying...');
      };

      wsRef.current = ws;
    };

    // Disconnect previous if exists
    if (wsRef.current) {
      wsRef.current.close();
    }

    connectWS();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [selectedAccount, token]);

  const handleAccountChange = (accountNumber: string) => {
    const account = accounts.find(acc => acc.accountNumber.toString() === accountNumber);
    if (account) {
      setSelectedAccount(accountNumber);
      setBalance(account.balance || 0);
      setShowDropdown(false);
      // Data will update via WS on account change
    }
  };

  const renderTable = (title: string, data: TradeData[]) => (
    <div>
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{title}</h3>
      {data.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No {title.toLowerCase()} available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Symbol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Setup</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Volume</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Profit</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-900">
              {data.map((item, index) => (
                <tr key={item.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{item.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{item.symbol}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      item.trade_setup === 'buy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                    }`}>
                      {item.trade_setup?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{item.volume}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{item.price}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                    item.profit && item.profit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.profit !== undefined ? (item.profit >= 0 ? `+${item.profit}` : item.profit) : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (isLoadingAccounts || !token) {
    return (
      <div className="min-h-screen dark:bg-gray-900 text-gray-100">
        <div className="container mx-auto px-4 py-8">
          <PageBreadcrumb pageTitle="Trade Manager" />
          <SkeletonLoader />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark:bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-8">
        <PageBreadcrumb pageTitle="Trade Manager" />
        
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-6 mb-6">
          {/* Account Dropdown - Similar to Calendar */}
          <div ref={dropdownRef} className="relative w-full sm:w-96 mb-1 flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0">
            <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-400 flex items-center shrink-0">
              Trading Account
            </label>
            {isLoadingAccounts ? (
              <div className="flex items-center justify-center h-9 sm:h-10 flex-grow rounded-md border border-gray-300 bg-gray-50 dark:bg-gray-800 px-3 sm:px-4 py-2">
                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-t-2 border-b-2 border-brand-500"></div>
              </div>
            ) : (
              <div className="relative w-full flex-grow">
                <button
                  className="h-9 sm:h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-xs sm:text-sm text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                  onClick={() => setShowDropdown(!showDropdown)}
                  disabled={isConnecting}
                >
                  {accounts.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <Image
                        src={
                          accounts.find((acc) => acc.accountNumber.toString() === selectedAccount)?.platform === 'MT5'
                            ? mt5
                            : cTraderIcon
                        }
                        alt="Platform Icon"
                        width={16}
                        height={16}
                      />
                      <span>
                        {selectedAccount} (
                        {accounts.find((acc) => acc.accountNumber.toString() === selectedAccount)?.platform})
                      </span>
                      {isConnecting && (
                        <div className="ml-2 animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
                      )}
                    </div>
                  )}
                </button>
                {showDropdown && (
                  <ul className="absolute z-10 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg dark:bg-gray-800 dark:border-gray-600">
                    {accounts.map((account) => (
                      <li
                        key={account.accountNumber}
                        onClick={() => handleAccountChange(account.accountNumber.toString())}
                        className="cursor-pointer px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-900 dark:text-white"
                      >
                        <Image
                          src={account.platform === 'MT5' ? mt5 : cTraderIcon}
                          alt={`${account.platform} Icon`}
                          width={16}
                          height={16}
                        />
                        {account.accountNumber} ({account.platform})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          {selectedAccount && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Balance: ${balance.toLocaleString()}
            </p>
          )}
        </div>

        {selectedAccount ? (
          <div className="space-y-8">
            {renderTable("Pending Orders", pending)}
            {renderTable("Open Positions", running)}
            {renderTable("Closed Trades", executed)}
            {renderTable("Removed Orders", removed)}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">Please select a trading account to view live data.</p>
          </div>
        )}
      </div>
    </div>
  );
}