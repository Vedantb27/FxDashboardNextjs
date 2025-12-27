"use client";
import React, { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  EventInput,
  DateSelectArg,
  EventClickArg,
  EventContentArg,
} from "@fullcalendar/core";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../../components/ui/modal";
import Request from "../../utils/request";
import { toast } from "react-toastify";
import { formatDateToYYYYMMDD } from "../../utils/common";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Badge from "../ui/badge/Badge";
import { useGlobalState } from "../../context/GlobalStateContext";
import mt5 from '../../icons/mt5.png';
import Image from "next/image";
import cTraderIcon from '../../icons/ctrader.png';
import ProfitabilityAnalytics from "./ProfitabilityAnalytics";

interface CalendarEvent extends EventInput {
  id?: string;
  title: string;
  start: string;
  extendedProps: {
    calendar: string;
  };
}

interface TradeHistory {
  sr_no: number;
  position_id: number;
  open_date: string;
  close_date: string;
  profit: number;
  type: "buy" | "sell";
}

interface Account {
  accountNumber: number;
  server: string;
  platform: "MT5" | "cTrader";
  createdAt: string;
}

interface ShortData {
  profit: number;
  wins: number;
  losses: number;
  winAmount: number;
  lossAmount: number;
  winRate: number;
}

interface ProfitabilityData {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
}

interface LongData {
  profit: number;
  wins: number;
  losses: number;
  winAmount: number;
  lossAmount: number;
  winRate: number;
}



// Skeleton Loader Component
const SkeletonLoader: React.FC = () => {
  return (
    <div className="animate-pulse">
      {/* Trading Account Selector Skeleton */}
      <div className="p-4">
        <div className="w-64">
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
      {/* Calendar Grid Skeleton */}
      <div className="p-4">
        <div className="flex justify-between mb-4">
          <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {[...Array(7)]?.map((_, i) => (
            <div key={i} className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
          {[...Array(35)]?.map((_, i) => (
            <div
              key={i}
              className="h-20 bg-gray-200 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600"
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};
const weeks = [
  {
    id: 1,
    title: 'Week One',
    dateRange: 'Sep 28 - Oct 4',
    trades: 'No trades',
    pnl: '0',
    days: '0',
    pnlColor: 'text-white',
  },
  {
    id: 2,
    title: 'Week Two',
    dateRange: 'Oct 5 - Oct 11',
    trades: 'No trades',
    pnl: '0',
    days: '0',
    pnlColor: 'text-white',
  },
  {
    id: 3,
    title: 'Week Three',
    dateRange: 'Oct 12 - Oct 18',
    trades: 'No trades',
    pnl: '0',
    days: '0',
    pnlColor: 'text-white',
  },
  {
    id: 4,
    title: 'Week Four',
    dateRange: 'Oct 19 - Oct 25',
    trades: null,
    pnl: '+$225.15',
    days: '1',
    pnlColor: 'text-green-400',
  },
  {
    id: 5,
    title: 'Week Five',
    dateRange: 'Oct 26 - Nov 1',
    trades: null,
    pnl: '-$81.64',
    days: '2',
    pnlColor: 'text-red-400',
  },
];

const shortData2 = {
  profit: 0,
  wins: 0,
  losses: 0,
  winAmount: 0,
  lossAmount: 0,
  winRate: 0
};

const profitabilityData2 = {
  totalTrades: 14,
  wins: 4,
  losses: 10,
  winRate: 28.57
};

const longData2 = {
  profit: 319.08,
  wins: 3,
  losses: 7,
  winAmount: 260.29,
  lossAmount: 579.37,
  winRate: 30
};

const Calendar: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartDate, setEventStartDate] = useState<Date | null>(null);
  const [eventLevel, setEventLevel] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [disableDatePicker, setDisableDatePicker] = useState(false);
  const [dailyProfits, setDailyProfits] = useState<{ [date: string]: number }>({});
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [balance, setBalance]: any = useState(0);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [shortData, setShortData] = useState<ShortData>({ profit: 0, wins: 0, losses: 0, winAmount: 0, lossAmount: 0, winRate: 0 });
  const [profitabilityData, setProfitabilityData] = useState<ProfitabilityData >({ totalTrades: 0, wins: 0, losses: 0, winRate: 0 });
  const [longData, setLongData] = useState<LongData>({ profit: 0, wins: 0, losses: 0, winAmount: 0, lossAmount: 0, winRate: 0 })
  const [currentMonth, setCurrentMonth] = useState({
    month: new Date().getMonth(),
    year: new Date().getFullYear()
  });
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();
  const { state, dispatch } = useGlobalState();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const calendarsEvents = {
    Danger: "danger",
    Success: "success",
    Primary: "primary",
    Warning: "warning",
  };

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

  function adjustTrade(trade: any) {
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

  function calculateshortData(trades: any[], currentMonth: { month: number; year: number }) {
    let sortTrades: any[] = [];
    trades.map((trade) => {
      let month = new Date(trade.close_date).getMonth();
      let year = new Date(trade.close_date).getFullYear();
      if (month === currentMonth.month && year === currentMonth.year && trade.type === 'sell') {
        sortTrades.push(trade);
      }
    });
    const short = {
      profit: 0,
      wins: 0,
      losses: 0,
      winAmount: 0,
      lossAmount: 0,
      winRate: 0
    }
    sortTrades.forEach((trade) => {
      short.profit += trade.profit;
      if (trade.profit > 0) {
        short.wins += 1;
        short.winAmount += trade.profit;
      } else {
        short.losses += 1;
        short.lossAmount += Math.abs(trade.profit);
      }
    });
    short.profit = Number(short.profit.toFixed(2));
    short.winAmount = Number(short.winAmount.toFixed(2));
    short.lossAmount = Number(short.lossAmount.toFixed(2));
    let winRate = short.wins > 0 ? (short.wins / (short.wins + short.losses) * 100) : 0;
    short.winRate = Number(winRate.toFixed(2));
    console.log("short", short);
    setShortData(short);
  }
  useEffect(() => {
    console.log("UPDATED shortData", shortData);
  }, [shortData]);

  function calculateprofitabilityData(trades: any[], currentMonth: { month: number; year: number }) {
    let sortTrades: any[] = [];
    trades.map((trade) => {
      let month = new Date(trade.close_date).getMonth();
      let year = new Date(trade.close_date).getFullYear();
      if (month === currentMonth.month && year === currentMonth.year) {
        sortTrades.push(trade);
      }
    });
    const profitability ={ totalTrades: 0, wins: 0, losses: 0, winRate: 0 }
    sortTrades.forEach((trade) => {
      profitability.totalTrades +=1;
      if (trade.profit > 0) {
        profitability.wins += 1;
      } else {
        profitability.losses += 1;
      }
    });
    let winRate = profitability.wins > 0 ? (profitability.wins / (profitability.wins + profitability.losses) * 100) : 0;
    profitability.winRate = Number(winRate.toFixed(2));
    console.log("short", profitability);
    setProfitabilityData(profitability);
  }

  function calculatelongData(trades: any[], currentMonth: { month: number; year: number }) {
    let sortTrades: any[] = [];
    trades.map((trade) => {
      let month = new Date(trade.close_date).getMonth();
      let year = new Date(trade.close_date).getFullYear();
      if (month === currentMonth.month && year === currentMonth.year && trade.type === 'buy') {
        sortTrades.push(trade);
      }
    });
    const longs = {
      profit: 0,
      wins: 0,
      losses: 0,
      winAmount: 0,
      lossAmount: 0,
      winRate: 0
    }
    sortTrades.forEach((trade) => {
      longs.profit += trade.profit;
      if (trade.profit > 0) {
        longs.wins += 1;
        longs.winAmount += trade.profit;
      } else {
        longs.losses += 1;
        longs.lossAmount += Math.abs(trade.profit);
      }
    });
    longs.profit = Number(longs.profit.toFixed(2));
    longs.winAmount = Number(longs.winAmount.toFixed(2));
    longs.lossAmount = Number(longs.lossAmount.toFixed(2));
    let winRate = longs.wins > 0 ? (longs.wins / (longs.wins + longs.losses) * 100) : 0;
    longs.winRate = Number(winRate.toFixed(2));
    console.log("longs", longs);
    setLongData(longs);

  }

  useEffect(() => {
    console.log("event hit");
    console.log("currentMonth", currentMonth);
    if (!selectedAccount) return;
    const tradeHistory = state.tradeHistory[selectedAccount] || [];
    calculateshortData(tradeHistory, currentMonth);
    calculateprofitabilityData(tradeHistory, currentMonth);
    calculatelongData(tradeHistory, currentMonth);
  }, [currentMonth, selectedAccount]);


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
            const first = sortedAccounts[0];

            setSelectedAccount(first?.accountNumber?.toString() ?? "");

            setBalance(first?.balance != null ? String(first.balance) : "0");
          }

        }
      } catch (error) {
        console.log(error)
        toast.error("Error fetching accounts");
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

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch notes
        const notesResponse = await Request({
          method: "GET",
          url: "get-notes",
          params: { accountNumber: selectedAccount },
        });
        if (notesResponse?.data) {
          const fetchedEvents = notesResponse?.data?.map((item: any) => ({
            id: item.date,
            title: item.notes,
            start: item.date,
            extendedProps: { calendar: item.color },
          }));
          setEvents(fetchedEvents);
        }

        // Fetch trade history only if not already present
        if (!state.tradeHistory[selectedAccount]) {
          const tradeResponse = await Request({
            method: "GET",
            url: "trade-history",
            params: { accountNumber: selectedAccount },
          });
          if (tradeResponse) {
            const adjustedTrades = (tradeResponse).map(adjustTrade);
            dispatch({
              type: "SET_TRADE_HISTORY",
              payload: {
                accountNumber: selectedAccount,
                trades: adjustedTrades,
              },
            });
            // Calculate daily profits locally
            const dailyProfitMap: { [date: string]: number } = {};
            adjustedTrades.forEach((trade: any) => {
              const date = trade?.close_date;
              if (!dailyProfitMap[date]) {
                dailyProfitMap[date] = 0;
              }
              dailyProfitMap[date] += trade?.profit;
            });
            setDailyProfits(dailyProfitMap);
          }
        } else {
          // Use existing trade history for daily profits
          const trades = state.tradeHistory[selectedAccount] || [];
          const dailyProfitMap: { [date: string]: number } = {};
          trades.forEach((trade) => {
            const date = trade.close_date;
            if (!dailyProfitMap[date]) {
              dailyProfitMap[date] = 0;
            }
            dailyProfitMap[date] += trade.profit;
          });
          setDailyProfits(dailyProfitMap);
        }
      } catch (error) {
        // toast.error("Error fetching data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [dispatch, state.tradeHistory, selectedAccount]);

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    resetModalFields();
    setEventStartDate(new Date(selectInfo.startStr));
    setDisableDatePicker(true);
    openModal();
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event as unknown as CalendarEvent;
    setSelectedEvent(event);
    setEventTitle(event.title);
    setEventStartDate(new Date(event.start));
    setEventLevel(event.extendedProps.calendar);
    setDisableDatePicker(true);
    openModal();
  };

  const handleAddOrUpdateEvent = async () => {
    if (!eventTitle || !eventStartDate || !eventLevel) {
      toast.error("Please fill in all required fields");
      return;
    }

    const formattedDate = formatDateToYYYYMMDD(eventStartDate.toISOString());

    setIsSaving(true);
    try {
      const response = await Request({
        method: "POST",
        url: "add-notes",
        data: {
          date: formattedDate,
          notes: eventTitle,
          color: eventLevel,
          accountNumber: selectedAccount,
        },
      });

      if (response?.message) {
        const updatedEvent: CalendarEvent = {
          id: formattedDate,
          title: eventTitle,
          start: formattedDate,
          extendedProps: { calendar: eventLevel },
        };

        if (selectedEvent) {
          setEvents((prevEvents) =>
            prevEvents?.map((event) =>
              event.id === selectedEvent.id ? updatedEvent : event
            )
          );
        } else {
          setEvents((prevEvents) => [...prevEvents, updatedEvent]);
        }

        toast.success(response.message);
        closeModal();
        resetModalFields();
      } else {
        toast.error("Failed to save event");
      }
    } catch (error) {
      toast.error("Error saving event");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    setIsDeleting(true);
    try {
      const response = await Request({
        method: "DELETE",
        url: "delete-notes",
        data: { date: formatDateToYYYYMMDD(selectedEvent.start), accountNumber: selectedAccount },
      });

      if (response?.message) {
        setEvents((prevEvents) =>
          prevEvents.filter((event) => event.id !== selectedEvent.id)
        );
        toast.success(response.message);
        closeModal();
        resetModalFields();
      } else {
        toast.error("Failed to delete event");
      }
    } catch (error) {
      toast.error("Error deleting event");
    } finally {
      setIsDeleting(false);
    }
  };

  const resetModalFields = () => {
    setEventTitle("");
    setEventStartDate(null);
    setEventLevel("");
    setSelectedEvent(null);
    setDisableDatePicker(false);
  };

  // Custom day cell rendering
  const renderDayCellContent = (arg: { date: Date; isOther: boolean }) => {
    const dateStr = formatDateToYYYYMMDD(arg.date.toISOString());
    const profit = dailyProfits[dateStr];
    if (profit !== undefined) {
      const percentage = ((profit / balance) * 100).toFixed(2);
      const isPositive = profit >= 0;
      return (
        <div className="flex flex-col items-center max-h-[150px] ">
          <span className={arg.isOther ? "opacity-50" : ""}>
            <span className="text-blue-600 "> {arg.date.getDate()}</span>
            <span
              className={`text-xs ml-5 ${isPositive ? "text-green-600" : "text-red-600"
                }`}
            >
              {isPositive ? "+" : ""}{percentage}%
            </span>
          </span>
        </div>
      );
    }
    return arg.date.getDate();
  };

  // Custom day cell class names
  const dayCellClassNames = (arg: { date: Date }) => {
    const dateStr = formatDateToYYYYMMDD(arg.date.toISOString());
    const profit = dailyProfits[dateStr];
    if (profit !== undefined) {
      return profit >= 0 ? "bg-success-500/15" : "bg-error-500/15 ";
    }
    return "";
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {isLoading ? (
        <SkeletonLoader />
      ) : (
        <>
          <div className="p-4">
            <div ref={dropdownRef} className="relative w-full sm:w-96 mb-1 flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0">
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
                  >
                    {accounts?.length > 0 && <div className="flex items-center space-x-2">
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
                      {accounts.map((account: any) => (
                        <li
                          key={account.accountNumber}
                          onClick={() => {
                            setSelectedAccount(account.accountNumber.toString());
                            setBalance(account?.balance.toString());
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
          </div>
          <div className="custom-calendar ">

            <FullCalendar
              ref={calendarRef}
              datesSet={(dateInfo) => {
                const currentDate = dateInfo.view.currentStart;
                setCurrentMonth({
                  month: currentDate.getMonth(),
                  year: currentDate.getFullYear()
                });
              }}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: "prev,next addEventButton",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              events={events}
              selectable={true}
              select={handleDateSelect}
              eventClick={handleEventClick}
              eventContent={renderEventContent}
              customButtons={{
                addEventButton: {
                  text: "Add Event +",
                  click: () => {
                    if (!selectedAccount) {
                      toast.error("Please select a trading account first");
                      return;
                    }
                    resetModalFields();
                    setDisableDatePicker(false);
                    openModal();
                  },
                },
              }}
              dayCellContent={renderDayCellContent}
              dayCellClassNames={dayCellClassNames}
            />
          </div>
        </>
      )}
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-[700px] p-6 lg:p-10"
      >
        <div className="flex flex-col px-2 overflow-y-auto custom-scrollbar">
          <div>
            <h5 className="mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
              {selectedEvent ? "Edit Event" : "Add Event"}
            </h5>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Plan your next big moment: schedule or edit an event to stay on track
            </p>
          </div>
          <div className="mt-8">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Event Title
              </label>
              <input
                id="event-title"
                type="text"
                autoComplete="off"
                maxLength={100}
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
            </div>
            <div className="mt-6">
              <label className="block mb-4 text-sm font-medium text-gray-700 dark:text-gray-400">
                Event Color
              </label>
              <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                {Object.entries(calendarsEvents)?.map(([key, value]: any) => (
                  <div key={key} className="n-chk">
                    <div
                      className={`form-check form-check-${value} form-check-inline`}
                    >
                      <label
                        className="flex items-center text-sm text-gray-700 form-check-label dark:text-gray-400"
                        htmlFor={`modal${key}`}
                      >
                        <span className="relative">
                          <input
                            className="sr-only form-check-input"
                            type="radio"
                            name="event-level"
                            value={key}
                            id={`modal${key}`}
                            checked={eventLevel === key}
                            onChange={() => setEventLevel(key)}
                          />
                          <span className="flex items-center justify-center w-5 h-5 mr-2 border border-gray-300 rounded-full box dark:border-gray-700">
                            <span
                              className={`h-2 w-2 rounded-full bg-white ${eventLevel === key ? "block" : "hidden"
                                }`}
                            ></span>
                          </span>
                        </span>
                        <Badge
                          variant="light"
                          color={value == "danger" ? "error" : value}
                        >
                          {key}
                        </Badge>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Event Date
              </label>
              <div className="relative">
                <DatePicker
                  selected={eventStartDate}
                  onChange={(date: any) => setEventStartDate(date)}
                  disabled={disableDatePicker}
                  dateFormat="yyyy-MM-dd"
                  className={`dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 ${disableDatePicker ? "cursor-not-allowed opacity-50" : ""
                    }`}
                  placeholderText="Select date"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-6 modal-footer sm:justify-end">
            {selectedEvent && (
              <button
                onClick={handleDeleteEvent}
                type="button"
                disabled={isDeleting}
                className="flex w-full justify-center rounded-lg border border-red-500 bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50 sm:w-auto"
              >
                {isDeleting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                ) : (
                  "Delete Event"
                )}
              </button>
            )}
            <button
              onClick={closeModal}
              type="button"
              disabled={isSaving || isDeleting}
              className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto"
            >
              Close
            </button>
            <button
              onClick={handleAddOrUpdateEvent}
              type="button"
              disabled={isSaving || isDeleting}
              className="flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 sm:w-auto"
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              ) : selectedEvent ? (
                "Update Changes"
              ) : (
                "Add Event"
              )}
            </button>
          </div>
        </div>
      </Modal>
      <div className=" bg-slate-900 p-6 md:p-8">
        <h1 className="text-2xl font-bold text-white mb-8">Weekly Summary</h1>

        {/* Desktop: Horizontal Grid */}
        <div className="hidden lg:grid lg:grid-cols-5 gap-4 mb-8">
          {weeks.map((week) => (
            <div
              key={week.id}
              className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-colors"
            >
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-white mb-1">
                  {week.title}
                </h2>
                <p className="text-sm text-slate-400">{week.dateRange}</p>
              </div>



              {week.pnl && (
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">PnL</p>
                    <p className={`text-lg font-semibold ${week.pnlColor}`}>
                      {week.pnl}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-1">Trading Days</p>
                    <p className="text-lg font-semibold text-white">
                      {week.days}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Tablet: 2 Columns */}
        <div className="hidden md:grid lg:hidden grid-cols-2 gap-4 mb-8">
          {weeks.map((week) => (
            <div
              key={week.id}
              className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-colors"
            >
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-white mb-1">
                  {week.title}
                </h2>
                <p className="text-sm text-slate-400">{week.dateRange}</p>
              </div>
              {week.pnl && (
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">PnL</p>
                    <p className={`text-lg font-semibold ${week.pnlColor}`}>
                      {week.pnl}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-1">Trading Days</p>
                    <p className="text-lg font-semibold text-white">
                      {week.days}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Mobile: Vertical Stack */}
        <div className="md:hidden space-y-4">
          {weeks.map((week) => (
            <div
              key={week.id}
              className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-colors"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {week.title}
                  </h2>
                  <p className="text-sm text-slate-400">{week.dateRange}</p>
                </div>
              </div>

              {week.pnl && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">PnL</p>
                    <p className={`text-lg font-semibold ${week.pnlColor}`}>
                      {week.pnl}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Trading Days</p>
                    <p className="text-lg font-semibold text-white">
                      {week.days}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <ProfitabilityAnalytics shortData={shortData} profitabilityData={profitabilityData} longData={longData} />
    </div>
  );
};

const renderEventContent = (eventInfo: EventContentArg) => {
  const colorClass = `fc-bg-${eventInfo.event.extendedProps.calendar.toLowerCase()}`;
  return (
    <div
      className={`event-fc-color flex fc-event-main ${colorClass} p-1 rounded-sm `}
    >
      <div className="fc-daygrid-event-dot"></div>
      <div className="fc-event-time">{eventInfo.timeText}</div>
      <div className="fc-event-title">{eventInfo.event.title}</div>
    </div>
  );
};

export default Calendar;