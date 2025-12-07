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
}

interface Account {
  accountNumber: number;
  server: string;
  platform: "MT5" | "cTrader";
  createdAt: string;
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
            const trades: TradeHistory[] = tradeResponse;
            dispatch({
              type: "SET_TRADE_HISTORY",
              payload: {
                accountNumber: selectedAccount,
                trades,
              },
            });
            // Calculate daily profits locally
            const dailyProfitMap: { [date: string]: number } = {};
            trades.forEach((trade) => {
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
        <div className="flex flex-col items-center max-h-[150px]">
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
      return profit >= 0 ? "bg-success-500/15" : "bg-error-500/15";
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
          <div className="custom-calendar">
            <FullCalendar
              ref={calendarRef}
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
    </div>
  );
};

const renderEventContent = (eventInfo: EventContentArg) => {
  const colorClass = `fc-bg-${eventInfo.event.extendedProps.calendar.toLowerCase()}`;
  return (
    <div
      className={`event-fc-color flex fc-event-main ${colorClass} p-1 rounded-sm`}
    >
      <div className="fc-daygrid-event-dot"></div>
      <div className="fc-event-time">{eventInfo.timeText}</div>
      <div className="fc-event-title">{eventInfo.event.title}</div>
    </div>
  );
};

export default Calendar;