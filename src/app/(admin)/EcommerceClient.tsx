"use client";

import { EcommerceMetrics } from "../../components/ecommerce/EcommerceMetrics";
import React, { useState, useEffect, useRef } from "react";
import MonthlyTarget from "../../components/ecommerce/MonthlyTarget";
import MonthlySalesChart from "../../components/ecommerce/MonthlySalesChart";
import StatisticsChart from "../../components/ecommerce/StatisticsChart";
import RecentOrders from "../../components/ecommerce/RecentOrders";
import Request from "../../utils/request";
import { useGlobalState } from "../../context/GlobalStateContext";
import mt5 from '../../icons/mt5.png';
import Image from "next/image";
import cTraderIcon from '../../icons/ctrader.png';
import PairwiseGainLossChart from "../../components/ecommerce/PairwiseGainLossChart";

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
  accountNumber?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Account {
  depositCurrency: string;
  accountNumber: number;
  server: string;
  balance: number;
  platform: "MT5" | "cTrader";
  createdAt: string;
}

// DST calculation functions (adapted for MT5 server time offset: UTC+2 standard, UTC+3 DST)
function getDstStartUTC(year: number): Date {
  // 2nd Sunday of March at 2:00 AM UTC (DST start)
  const march = new Date(Date.UTC(year, 2, 1));
  const firstSundayOffset = (7 - march.getUTCDay()) % 7;
  const secondSunday = 1 + firstSundayOffset + 7;
  return new Date(Date.UTC(year, 2, secondSunday, 2, 0, 0));
}

function getDstEndUTC(year: number): Date {
  // 1st Sunday of November at 2:00 AM UTC (DST end)
  const november = new Date(Date.UTC(year, 10, 1));
  const firstSundayOffset = (7 - november.getUTCDay()) % 7;
  const firstSunday = 1 + firstSundayOffset;
  return new Date(Date.UTC(year, 10, firstSunday, 2, 0, 0));
}

function getMt5OffsetHours(dateUTC: Date): number {
  const year = dateUTC.getUTCFullYear();
  const dstStart = getDstStartUTC(year);
  const dstEnd = getDstEndUTC(year);
  return (dateUTC >= dstStart && dateUTC < dstEnd) ? 3 : 2;
}

function adjustTimeToLocal(dateStr: string, timeStr: string): { date: string; time: string } {
  const year = parseInt(dateStr.substring(0, 4));
  const dstStart = getDstStartUTC(year);
  const dstEnd = getDstEndUTC(year);

  // Parse server time string as if it were UTC (temporary)
  let tempDate = new Date(`${dateStr}T${timeStr}Z`);
  let utcTimestamp = tempDate.getTime();

  // Initial assumption: standard offset (UTC+2)
  utcTimestamp -= 2 * 60 * 60 * 1000;
  let candidateDate = new Date(utcTimestamp);

  // Compute offset based on candidate UTC
  let offset = getMt5OffsetHours(candidateDate);

  // If DST offset applies, subtract the additional hour
  if (offset === 3) {
    utcTimestamp -= 60 * 60 * 1000;
    candidateDate = new Date(utcTimestamp);
    // Double-check offset (handles edge cases near transitions)
    offset = getMt5OffsetHours(candidateDate);
  }

  // Now convert UTC timestamp to user's local time
  const localDate = new Date(utcTimestamp);
  const localYear = localDate.getFullYear();
  const localMonth = String(localDate.getMonth() + 1).padStart(2, '0');
  const localDay = String(localDate.getDate()).padStart(2, '0');
  const localHours = String(localDate.getHours()).padStart(2, '0');
  const localMinutes = String(localDate.getMinutes()).padStart(2, '0');
  const localSeconds = String(localDate.getSeconds()).padStart(2, '0');

  return {
    date: `${localYear}-${localMonth}-${localDay}`,
    time: `${localHours}:${localMinutes}:${localSeconds}`,
  };
}

function adjustTrade(trade: Trade): Trade {
  const openAdjusted = adjustTimeToLocal(trade.open_date, trade.open_time);
  const closeAdjusted = adjustTimeToLocal(trade.close_date, trade.close_time);

  return {
    ...trade,
    open_date: openAdjusted.date,
    open_time: openAdjusted.time,
    close_date: closeAdjusted.date,
    close_time: closeAdjusted.time,
  };
}

export default function EcommerceClient() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState("");
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
            setCurrency(sortedAccounts[0]?.depositCurrency);
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
          // console.log(tradeResponse,"tradeResponse")
          if (tradeResponse) {
            // Adjust times: subtract MT5 offset to get UTC, then format to user's local time
            const adjustedTrades = (tradeResponse as Trade[]).map(adjustTrade);
            dispatch({
              type: "SET_TRADE_HISTORY",
              payload: {
                accountNumber: selectedAccount,
                trades: adjustedTrades,
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
            >{accounts?.length > 0 &&
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
                      setCurrency(account?.depositCurrency);
                      setShowDropdown(false);
                    }}
                    className={`cursor-pointer px-3 py-2 flex items-center text-sm
    ${selectedAccount === account.accountNumber.toString()
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"

                      }
  `}
                  >

                    <Image
                      src={account.platform === 'MT5' ? mt5 : cTraderIcon}
                      alt={`${account.platform} Icon`}
                      width={16}
                      height={16}
                    />&nbsp;
                    {account.accountNumber}&nbsp;({account.platform})
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>


      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 space-y-6 xl:col-span-7">
          <EcommerceMetrics tradeHistory={tradeHistory} isLoadingTrades={isLoadingTrades} currency={currency} />
          <MonthlySalesChart tradeHistory={tradeHistory} isLoadingTrades={isLoadingTrades} />
        </div>
        <div className="col-span-12 xl:col-span-5">
          <MonthlyTarget tradeHistory={tradeHistory} balance={balance} isLoadingTrades={isLoadingTrades} currency={currency} />
        </div>
        <div className="col-span-12">
          <StatisticsChart tradeHistory={tradeHistory} balance={balance} isLoadingTrades={isLoadingTrades} currency={currency} />
        </div>
        {/* <div className="col-span-12">
            <PairwiseGainLossChart tradeHistory={tradeHistory} isLoadingTrades={isLoadingTrades} currency={currency}/>
          </div> */}
        <div className="col-span-12 xl:col-span-5">
          {/* <DemographicCard isLoadingTrades={isLoadingTrades} /> */}
        </div>
        <div className="col-span-12">
          <RecentOrders tradeHistory={tradeHistory} isLoadingTrades={isLoadingTrades} currency={currency} />
        </div>
      </div>

    </div>
  );
}