"use client";

import { EcommerceMetrics } from "../../components/ecommerce/EcommerceMetrics";
import React, { useState, useEffect } from "react";
import MonthlyTarget from "../../components/ecommerce/MonthlyTarget";
import MonthlySalesChart from "../../components/ecommerce/MonthlySalesChart";
import StatisticsChart from "../../components/ecommerce/StatisticsChart";
import RecentOrders from "../../components/ecommerce/RecentOrders";
import Request from "../../utils/request";
import { useGlobalState } from "../../context/GlobalStateContext";
import { toast } from "react-toastify";
import mt5 from '../../icons/mt5.png';
import Image from "next/image";
import cTraderIcon from '../../icons/ctrader.png'; 

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

interface Account {
  accountNumber: number;
  server: string;
  platform: "MT5" | "cTrader";
  createdAt: string;
}

export default function EcommerceClient() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const { state, dispatch } = useGlobalState();

  useEffect(() => {
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
          }
        }
      } catch (error) {
        // toast.error("Error fetching accounts");
      } finally {
        setIsLoadingAccounts(false);
      }
    };
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (!selectedAccount) return;

    const fetchTradeHistory = async () => {
      setIsLoadingTrades(true);
      try {
        if (!state.tradeHistory[selectedAccount]) {
          const tradeResponse = await Request({
            method: "GET",
            url: "trade-history",
            params: { accountNumber: selectedAccount },
          });
          if (tradeResponse) {
            dispatch({
              type: "SET_TRADE_HISTORY",
              payload: {
                accountNumber: selectedAccount,
                trades: tradeResponse,
              },
            });
          }
        }
      } catch (error) {
        // toast.error("Error fetching trade history");
      } finally {
        setIsLoadingTrades(false);
      }
    };
    fetchTradeHistory();
  }, [selectedAccount, dispatch, state.tradeHistory]);

  const tradeHistory: any = selectedAccount
    ? state.tradeHistory[selectedAccount] || []
    : [];

  return (
    <div className="p-4">
      {/* Trading Accounts Dropdown */}
      <div className="relative w-full sm:w-96 mb-4 flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0">
        <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-400 flex items-center shrink-0">
          Trading Account
        </label>
        {isLoadingAccounts ? (
          <div
            className="flex items-center justify-center h-9 sm:h-10 flex-grow rounded-md border border-gray-300 bg-gray-50 dark:bg-gray-800 px-3 sm:px-4 py-2"
          >
            <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-t-2 border-b-2 border-brand-500"></div>
          </div>
        ) : (
          <select
            value={selectedAccount || ""}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="appearance-none h-9 sm:h-10 flex-grow rounded-md border border-gray-300 bg-white px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors duration-200 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M6%208L10%2012L14%208%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center] sm:bg-[right_0.75rem_center] bg-[length:14px_14px] sm:bg-[length:16px_16px] disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={accounts.length === 0}
          >
            {accounts.length === 0 ? (
              <option value="">No accounts available</option>
            ) : (
              accounts.map((account) => (
                <option
                  key={account.accountNumber}
                  value={account.accountNumber.toString()}
                  data-platform={account.platform}
                >
                  {account.accountNumber} ({account.platform})
                </option>
              ))
            )}
          </select>
        )}
      </div>
      {/* Dropdown Styling for Logos */}
      <style jsx>{`
        select option {
          padding-right: 2rem;
          background-size: 16px 16px;
          background-position: right 0.5rem center;
          background-repeat: no-repeat;
        }
        select option[data-platform="MT5"] {
          background-image: url(${mt5.src});
        }
        select option[data-platform="cTrader"] {
          background-image: url(${cTraderIcon.src});
        }
      `}</style>
      {/* Dashboard Content */}
      {isLoadingTrades ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-12 space-y-6 xl:col-span-7">
            <EcommerceMetrics tradeHistory={tradeHistory} />
            <MonthlySalesChart tradeHistory={tradeHistory} />
          </div>
          <div className="col-span-12 xl:col-span-5">
            <MonthlyTarget tradeHistory={tradeHistory} />
          </div>
          <div className="col-span-12">
            <StatisticsChart tradeHistory={tradeHistory} />
          </div>
          <div className="col-span-12 xl:col-span-5">
            {/* <DemographicCard /> */}
          </div>
          <div className="col-span-12">
            <RecentOrders tradeHistory={tradeHistory} />
          </div>
        </div>
      )}
    </div>
  );
}