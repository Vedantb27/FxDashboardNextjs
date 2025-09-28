"use client";

import { EcommerceMetrics } from "../../components/ecommerce/EcommerceMetrics";
import React, { useState, useEffect, useRef } from "react";
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
  balance: number;
  platform: "MT5" | "cTrader";
  createdAt: string;
}

export default function EcommerceClient() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { state, dispatch } = useGlobalState();
  const dropdownRef = useRef<HTMLDivElement>(null);

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
            setBalance(sortedAccounts[0]?.balance);
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
      <div ref={dropdownRef} className="relative w-full sm:w-96 mb-4 flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0">
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
          <div className="relative w-full flex-grow">
            <button
              className="h-9 sm:h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-xs sm:text-sm text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              onClick={() => setShowDropdown(!showDropdown)}
            >{accounts?.length>0 &&
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
              </div>}
            </button>
            {showDropdown && (
              <ul className="absolute z-10 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg dark:bg-gray-800 dark:border-gray-600">
                {accounts.map((account) => (
                  <li
                    key={account.accountNumber}
                    onClick={() => {
                      setSelectedAccount(account.accountNumber.toString());
                      setBalance(account?.balance);
                      setShowDropdown(false);
                    }}
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
            <MonthlyTarget tradeHistory={tradeHistory} balance={balance}/>
          </div>
          <div className="col-span-12">
            <StatisticsChart tradeHistory={tradeHistory} balance={balance}/>
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