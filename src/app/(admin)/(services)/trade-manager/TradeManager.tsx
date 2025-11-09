"use client";
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  MouseEvent,
} from "react";
import PageBreadcrumb from "../../../../components/common/PageBreadCrumb";
import Request from "../../../../utils/request";
import { AUTH_STORAGE_KEY } from "../../../../utils/envConfig";
import { toast } from "react-toastify";
import Image from "next/image";
import mt5 from "../../../../icons/mt5.png";
import cTraderIcon from "../../../../icons/ctrader.png";
import { motion, AnimatePresence } from "framer-motion";
import AddPendingModal from "./AddPendingModal";

/* ============================================================================
   Types
=========================================================================== */
interface SpotAdd {
  entry_price: number;
  stoploss: number;
  take_profit?: number;
  risk_percentage: number;
  order_id?: string | null;
}
export interface TradeData {
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
  order_id?: string;
  order_type?: string; // 'limit' | 'stop'
  risk_percentage?: number;
  removalPrice?: number;
  start_time?: string;
  spot_adds?: SpotAdd[];
  slToUpdate?: number;
  tpToUpdate?: number;
  breakevenPrice?: number;
  partialClosePrice?: number;
  lotToClose?: number;
  volumeToClose?: number;
  partiallyClosed?: Array<{ lots: number; price: number }>;
}
interface Account {
  accountNumber: number;
  server: string;
  platform: "MT5" | "cTrader";
  createdAt: string;
  balance?: number;
}
export interface MarketData {
  symbol: string;
  bid: number | null;
  ask: number | null;
  timestamp: string;
}
/* ============================================================================
   Global helpers (used by modals)
=========================================================================== */
let pending: TradeData[] = [];
let running: TradeData[] = [];
let market: MarketData[] = [];
const getCurrentPrice = (
  symbol: string,
  tradeSetup: string
): { bid: number | null; ask: number | null } | null => {
  const m = market.find((mk) => mk.symbol === symbol);
  if (!m || m.bid === null || m.ask === null) return null;
  return { bid: m.bid, ask: m.ask };
};
export const validatePendingPrice = (
  data: Partial<TradeData>
): string | null => {
  if (!data.symbol || !data.trade_setup || !data.order_type || data.price === undefined)
    return "Missing required fields";
  const curr: any = getCurrentPrice(data.symbol, data.trade_setup);
  if (!curr) return "No market data available for symbol";
  const isBuy = data.trade_setup === "buy";
  const isLimit = data.order_type === "limit";
  const price = data.price;
  if (isBuy) {
    if (isLimit && price >= curr.ask) return "Buy limit price must be below current ask";
    if (!isLimit && price <= curr.ask) return "Buy stop price must be above current ask";
  } else {
    if (isLimit && price <= curr.bid) return "Sell limit price must be above current bid";
    if (!isLimit && price >= curr.bid) return "Sell stop price must be below current bid";
  }
  return null;
};
export const validateSpotEntry = (
  setup: string,
  symbol: string,
  entry: number
): string | null => {
  const curr: any = getCurrentPrice(symbol, setup);
  if (!curr) return "No market data available";
  if (setup === "buy" && entry >= curr.ask) return "Buy spot entry must be below current ask";
  if (setup === "sell" && entry <= curr.bid) return "Sell spot entry must be above current bid";
  return null;
};
/* ============================================================================
   Reusable UI Components
=========================================================================== */
const ModalWrapper: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}> = ({ isOpen, onClose, children, wide = false }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={`bg-white/95 dark:bg-gray-900/95 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl mx-4 p-8 max-h-[90vh] overflow-y-auto ${wide ? 'w-full max-w-4xl' : 'w-full max-w-md'}`}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          onClick={(e:any) => e.stopPropagation()}
        >
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
const FloatingLabelInput = (
  props: any & { label?: string; error?: string }
) => (
  <div className="relative mb-3">
    <input
      {...props}
      placeholder={props.label}
      className={`peer w-full p-3 pt-6 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-transparent appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${props.error
          ? "border-red-500 focus:border-red-500 focus:ring-red-200"
          : "border-gray-300 dark:border-gray-600 focus:border-blue-400"
        } ${props.className || ""}`}
    />
    {props.label && (
      <label className={`absolute left-3 top-3 text-sm text-gray-500 transition-all duration-200 ease-in-out pointer-events-none peer-focus:-top-2 peer-focus:text-xs peer:not(:placeholder-shown):-top-2 peer:not(:placeholder-shown):text-xs ${props.error ? 'text-red-500 peer-focus:text-red-500 peer:not(:placeholder-shown):text-red-500' : 'peer-focus:text-blue-400 peer:not(:placeholder-shown):text-blue-400'}`}>
        {props.label}
      </label>
    )}
    {props.error && (
      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{props.error}</p>
    )}
  </div>
);
const FieldSelect = (
  props: any & { label?: string; error?: string }
) => (
  <div className="mb-3">
    {props.label && (
      <label className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 ${props.error ? 'text-red-600 dark:text-red-400' : ''}`}>
        {props.label}
      </label>
    )}
    <select
      {...props}
      className={`w-full p-3 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm appearance-none ${props.error
          ? "border-red-500 focus:border-red-500 focus:ring-red-200 bg-red-50/50 dark:bg-red-900/20"
          : "border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/50 focus:border-blue-400"
        } ${props.className || ""}`}
    />
    {props.error && (
      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{props.error}</p>
    )}
  </div>
);
const PrimaryBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  className,
  children,
  ...rest
}) => (
  <button
    {...rest}
    className={`px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className ||
      ""}`}
  >
    {children}
  </button>
);
const MutedBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  className,
  children,
  ...rest
}) => (
  <button
    {...rest}
    className={`px-6 py-2.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-semibold shadow hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className ||
      ""}`}
  >
    {children}
  </button>
);
const DangerBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  className,
  children,
  ...rest
}) => (
  <button
    {...rest}
    className={`px-6 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className ||
      ""}`}
  >
    {children}
  </button>
);
const SkeletonLoader: React.FC = () => (
  <div className="animate-pulse space-y-6">
    <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60">
      <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
      <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
    {["Pending Orders", "Open Positions", "Closed Trades", "Removed Orders"].map(
      (section) => (
        <div
          key={section}
          className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60 overflow-hidden"
        >
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  {[...Array(7)].map((_, i) => (
                    <th key={i} className="px-6 py-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(3)].map((_, i) => (
                  <tr
                    key={i}
                    className="divide-y divide-gray-200 dark:divide-gray-700"
                  >
                    {[...Array(7)].map((_, j) => (
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
      )
    )}
  </div>
);
/* ============================================================================
   Main Component
=========================================================================== */
export default function TradeManager() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [pendingState, setPending] = useState<TradeData[]>([]);
  const [runningState, setRunning] = useState<TradeData[]>([]);
  const [executed, setExecuted] = useState<TradeData[]>([]);
  const [removed, setRemoved] = useState<TradeData[]>([]);
  const [marketState, setMarket] = useState<MarketData[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  // Sync globals for modals
  useEffect(() => {
    pending = pendingState;
    running = runningState;
    market = marketState;
  }, [pendingState, runningState, marketState]);
  // Modal states
  const [modals, setModals] = useState({
    addPending: false,
    updatePending: false,
    addSpotPending: false,
    updateSpotPending: false,
    addSpotRunning: false,
    updateSpotRunning: false,
    updateSlTpBe: false,
    updatePartialClose: false,
    setVolumeToClose: false,
    queueDelete: false,
  });
  // Action states
  const [currentAction, setCurrentAction] = useState({
    id: "",
    parentId: "",
    index: -1,
    orderTicket: "",
    tradeSetup: "",
  });
  // Loading states
  const [loading, setLoading] = useState({
    addPending: false,
    updatePending: false,
    addSpot: false,
    updateSpot: false,
    updateSlTpBe: false,
    updatePartialClose: false,
    setVolumeToClose: false,
    queueDelete: false,
  });
  /* --------------------------------------------------------------------
     Helper to get current price
  -------------------------------------------------------------------- */
  const getCurrentPrice = (
    symbol: string,
    tradeSetup: string
  ): { bid: number | null; ask: number | null } | null => {
    const m = marketState.find((mk) => mk.symbol === symbol);
    if (!m || m.bid === null || m.ask === null) return null;
    return { bid: m.bid, ask: m.ask };
  };
  /* --------------------------------------------------------------------
     Token handling
  -------------------------------------------------------------------- */
  useEffect(() => {
    const tokenData = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (tokenData) {
      try {
        const parsedToken = JSON.parse(tokenData);
        setToken(parsedToken.token);
      } catch (e:any) {
        console.error("Failed to parse token data:", e);
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } else {
      if (typeof window !== "undefined") {
        window.location.href = "/signin";
      }
    }
  }, []);
  /* --------------------------------------------------------------------
     Fetch accounts
  -------------------------------------------------------------------- */
  useEffect(() => {
    if (!token) return;
    const fetchAccounts = async () => {
      setIsLoadingAccounts(true);
      try {
        const response = await Request({ method: "GET", url: "trading-accounts" });
        if (response) {
          const sortedAccounts = response.sort((a: Account, b: Account) => {
            if (a.platform === b.platform) return a.accountNumber - b.accountNumber;
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
  /* --------------------------------------------------------------------
     Dropdown click-outside
  -------------------------------------------------------------------- */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener(
      "mousedown",
      handleClickOutside as unknown as EventListener
    );
    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside as unknown as EventListener
      );
  }, []);
  /* --------------------------------------------------------------------
     WebSocket
  -------------------------------------------------------------------- */
  useEffect(() => {
    if (!selectedAccount || !token) return;
    const connectWS = () => {
      setIsConnecting(true);
      const wsUrl = `ws://localhost:8000?token=${encodeURIComponent(
        token
      )}&accountNumber=${encodeURIComponent(selectedAccount)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => {
        console.log(`WebSocket connected for account ${selectedAccount}`);
        setIsConnecting(false);
        toast.success(`Connected to live trades for account ${selectedAccount}`);
      };
      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          const { type, data } = parsed;
          if (type === "update") {
            setPending(data.pending || []);
            setRunning(data.running || []);
            setExecuted(data.executed || []);
            setRemoved(data.removed || []);
            setMarket(data.market || []);
          } else if (type === "error") {
            toast.error(data?.message || "Unknown error");
          }
        } catch (err) {
          console.error("WebSocket message parse error:", err);
        }
      };
      ws.onclose = (event) => {
        console.log(
          `WebSocket closed for account ${selectedAccount}:`,
          event.code,
          event.reason
        );
        setIsConnecting(false);
        setTimeout(() => connectWS(), 3000);
      };
      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        setIsConnecting(false);
        toast.error("Connection error; retrying...");
      };
    };
    if (wsRef.current) wsRef.current.close();
    connectWS();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [selectedAccount, token]);
  const handleAccountChange = (accountNumber: string) => {
    const account = accounts.find(
      (acc) => acc.accountNumber.toString() === accountNumber
    );
    if (account) {
      setSelectedAccount(accountNumber);
      setBalance(account.balance || 0);
      setShowDropdown(false);
    }
  };
  /* --------------------------------------------------------------------
     Handlers (API calls)
  -------------------------------------------------------------------- */
  const handleAddPending = async (data: Partial<TradeData>) => {
    if (!selectedAccount) return;
    const priceError = validatePendingPrice(data);
    if (priceError) {
      toast.error(priceError);
      return;
    }
    if (
      data.risk_percentage &&
      (data.risk_percentage < 0 || data.risk_percentage > 100)
    ) {
      toast.error("Risk percentage must be between 0 and 100");
      return;
    }
    setLoading((prev) => ({ ...prev, addPending: true }));
    try {
      await Request({
        method: "POST",
        url: "redis/add-pending",
        data: {
          accountNumber: selectedAccount,
          id: Date.now().toString(),
          ...data,
        },
      });
      toast.success("Pending order added");
      setModals((prev) => ({ ...prev, addPending: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to add pending order");
    } finally {
      setLoading((prev) => ({ ...prev, addPending: false }));
    }
  };
  const openUpdatePending = (id: string, tradeSetup: string) => {
    setCurrentAction((prev) => ({ ...prev, id, tradeSetup }));
    setModals((prev) => ({ ...prev, updatePending: true }));
  };
  const handleUpdatePending = async (data: Partial<TradeData>) => {
    if (!selectedAccount || !currentAction.id) return;
    const priceError = validatePendingPrice(data);
    if (priceError) {
      toast.error(priceError);
      return;
    }
    if (
      data.risk_percentage &&
      (data.risk_percentage < 0 || data.risk_percentage > 100)
    ) {
      toast.error("Risk percentage must be between 0 and 100");
      return;
    }
    setLoading((prev) => ({ ...prev, updatePending: true }));
    try {
      await Request({
        method: "PUT",
        url: `/redis/update-pending/${currentAction.id}`,
        data: { accountNumber: selectedAccount, ...data },
      });
      toast.success("Pending order updated");
      setModals((prev) => ({ ...prev, updatePending: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update pending order");
    } finally {
      setLoading((prev) => ({ ...prev, updatePending: false }));
    }
  };
  const openAddSpotPending = (parentId: string, tradeSetup: string) => {
    setCurrentAction((prev) => ({ ...prev, parentId, tradeSetup }));
    setModals((prev) => ({ ...prev, addSpotPending: true }));
  };
  const handleAddSpotPending = async (spotData: {
    entry_price: number;
    stoploss: number;
    take_profit?: number;
    risk_percentage: number;
  }) => {
    if (!selectedAccount || !currentAction.parentId || !currentAction.tradeSetup)
      return;
    const parent = pendingState.find((p) => p.id === currentAction.parentId);
    if (!parent) return toast.error("Parent order not found");
    const entryError = validateSpotEntry(
      currentAction.tradeSetup,
      parent.symbol,
      spotData.entry_price
    );
    if (entryError) return toast.error(entryError);
    if (
      spotData.risk_percentage < 0 ||
      spotData.risk_percentage > 100 ||
      spotData.entry_price <= 0 ||
      spotData.stoploss <= 0
    ) {
      return toast.error("Invalid spot data");
    }
    setLoading((prev) => ({ ...prev, addSpot: true }));
    try {
      await Request({
        method: "POST",
        url: `/redis/pending/${currentAction.parentId}/add-spot`,
        data: { accountNumber: selectedAccount, ...spotData },
      });
      toast.success("Spot added to pending");
      setModals((prev) => ({ ...prev, addSpotPending: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to add spot");
    } finally {
      setLoading((prev) => ({ ...prev, addSpot: false }));
    }
  };
  const openUpdateSpotPending = (
    parentId: string,
    index: number,
    tradeSetup?: string
  ) => {
    setCurrentAction((prev) => ({
      ...prev,
      parentId,
      index,
      tradeSetup: tradeSetup ?? prev.tradeSetup,
    }));
    setModals((prev) => ({ ...prev, updateSpotPending: true }));
  };
  const handleUpdateSpotPending = async (spotData: SpotAdd) => {
    if (
      !selectedAccount ||
      !currentAction.parentId ||
      currentAction.index < 0 ||
      !currentAction.tradeSetup
    )
      return;
    const parent = pendingState.find((p) => p.id === currentAction.parentId);
    if (!parent) return toast.error("Parent order not found");
    const entryError = validateSpotEntry(
      currentAction.tradeSetup,
      parent.symbol,
      spotData.entry_price
    );
    if (entryError) return toast.error(entryError);
    if (
      spotData.risk_percentage < 0 ||
      spotData.risk_percentage > 100 ||
      spotData.entry_price <= 0 ||
      spotData.stoploss <= 0
    ) {
      return toast.error("Invalid spot data");
    }
    setLoading((prev) => ({ ...prev, updateSpot: true }));
    try {
      await Request({
        method: "PUT",
        url: `/redis/pending/${currentAction.parentId}/spot/${currentAction.index}`,
        data: { accountNumber: selectedAccount, ...spotData },
      });
      toast.success("Spot updated in pending");
      setModals((prev) => ({ ...prev, updateSpotPending: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update spot");
    } finally {
      setLoading((prev) => ({ ...prev, updateSpot: false }));
    }
  };
  const openAddSpotRunning = (parentId: string, tradeSetup: string) => {
    setCurrentAction((prev) => ({ ...prev, parentId, tradeSetup }));
    setModals((prev) => ({ ...prev, addSpotRunning: true }));
  };
  const handleAddSpotRunning = async (spotData: {
    entry_price: number;
    stoploss: number;
    take_profit?: number;
    risk_percentage: number;
  }) => {
    if (!selectedAccount || !currentAction.parentId || !currentAction.tradeSetup)
      return;
    const parent = runningState.find((p) => p.id === currentAction.parentId);
    if (!parent) return toast.error("Parent trade not found");
    const entryError = validateSpotEntry(
      currentAction.tradeSetup,
      parent.symbol,
      spotData.entry_price
    );
    if (entryError) return toast.error(entryError);
    if (
      spotData.risk_percentage < 0 ||
      spotData.risk_percentage > 100 ||
      spotData.entry_price <= 0 ||
      spotData.stoploss <= 0
    ) {
      return toast.error("Invalid spot data");
    }
    setLoading((prev) => ({ ...prev, addSpot: true }));
    try {
      await Request({
        method: "POST",
        url: `/redis/running/${currentAction.parentId}/add-spot`,
        data: { accountNumber: selectedAccount, ...spotData },
      });
      toast.success("Spot added to running");
      setModals((prev) => ({ ...prev, addSpotRunning: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to add spot");
    } finally {
      setLoading((prev) => ({ ...prev, addSpot: false }));
    }
  };
  const openUpdateSpotRunning = (
    parentId: string,
    index: number,
    tradeSetup?: string
  ) => {
    setCurrentAction((prev) => ({
      ...prev,
      parentId,
      index,
      tradeSetup: tradeSetup ?? prev.tradeSetup,
    }));
    setModals((prev) => ({ ...prev, updateSpotRunning: true }));
  };
  const handleUpdateSpotRunning = async (spotData: SpotAdd) => {
    if (
      !selectedAccount ||
      !currentAction.parentId ||
      currentAction.index < 0 ||
      !currentAction.tradeSetup
    )
      return;
    const parent = runningState.find((p) => p.id === currentAction.parentId);
    if (!parent) return toast.error("Parent trade not found");
    const entryError = validateSpotEntry(
      currentAction.tradeSetup,
      parent.symbol,
      spotData.entry_price
    );
    if (entryError) return toast.error(entryError);
    if (
      spotData.risk_percentage < 0 ||
      spotData.risk_percentage > 100 ||
      spotData.entry_price <= 0 ||
      spotData.stoploss <= 0
    ) {
      return toast.error("Invalid spot data");
    }
    setLoading((prev) => ({ ...prev, updateSpot: true }));
    try {
      await Request({
        method: "PUT",
        url: `/redis/running/${currentAction.parentId}/spot/${currentAction.index}`,
        data: { accountNumber: selectedAccount, ...spotData },
      });
      toast.success("Spot updated in running");
      setModals((prev) => ({ ...prev, updateSpotRunning: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update spot");
    } finally {
      setLoading((prev) => ({ ...prev, updateSpot: false }));
    }
  };
  const openUpdateSlTpBe = (id: string) => {
    setCurrentAction((prev) => ({ ...prev, id }));
    setModals((prev) => ({ ...prev, updateSlTpBe: true }));
  };
  const handleUpdateSlTpBe = async (data: {
    slToUpdate?: number;
    tpToUpdate?: number;
    breakevenPrice?: number;
  }) => {
    if (!selectedAccount || !currentAction.id) return;
    if (
      (data.slToUpdate && data.slToUpdate <= 0) ||
      (data.tpToUpdate && data.tpToUpdate <= 0) ||
      (data.breakevenPrice && data.breakevenPrice <= 0)
    ) {
      return toast.error("Update values must be positive");
    }
    setLoading((prev) => ({ ...prev, updateSlTpBe: true }));
    try {
      await Request({
        method: "PUT",
        url: `/redis/running/${currentAction.id}/update-sl-tp-breakeven`,
        data: { accountNumber: selectedAccount, ...data },
      });
      toast.success("SL/TP/Breakeven updated");
      setModals((prev) => ({ ...prev, updateSlTpBe: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update");
    } finally {
      setLoading((prev) => ({ ...prev, updateSlTpBe: false }));
    }
  };
  const openUpdatePartialClose = (id: string) => {
    setCurrentAction((prev) => ({ ...prev, id }));
    setModals((prev) => ({ ...prev, updatePartialClose: true }));
  };
  const handleUpdatePartialClose = async (data: {
    partialClosePrice?: number;
    lotToClose?: number;
  }) => {
    if (!selectedAccount || !currentAction.id) return;
    if (data.lotToClose && data.lotToClose <= 0)
      return toast.error("Lot to close must be positive");
    setLoading((prev) => ({ ...prev, updatePartialClose: true }));
    try {
      await Request({
        method: "PUT",
        url: `/redis/running/${currentAction.id}/update-partial-close`,
        data: { accountNumber: selectedAccount, ...data },
      });
      toast.success("Partial close updated");
      setModals((prev) => ({ ...prev, updatePartialClose: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update");
    } finally {
      setLoading((prev) => ({ ...prev, updatePartialClose: false }));
    }
  };
  const openSetVolumeToClose = (id: string) => {
    setCurrentAction((prev) => ({ ...prev, id }));
    setModals((prev) => ({ ...prev, setVolumeToClose: true }));
  };
  const handleSetVolumeToClose = async (volumeToClose: number) => {
    if (!selectedAccount || !currentAction.id) return;
    if (volumeToClose < 0) return toast.error("Volume to close must be non-negative");
    const trade = runningState.find((t) => t.id === currentAction.id);
    if (trade && volumeToClose > (trade.volume || 0))
      return toast.error("Volume to close exceeds current volume");
    setLoading((prev) => ({ ...prev, setVolumeToClose: true }));
    try {
      await Request({
        method: "PUT",
        url: `/redis/running/${currentAction.id}/set-volume-close`,
        data: { accountNumber: selectedAccount, volumeToClose },
      });
      toast.success("Volume to close set");
      setModals((prev) => ({ ...prev, setVolumeToClose: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to set");
    } finally {
      setLoading((prev) => ({ ...prev, setVolumeToClose: false }));
    }
  };
  const openQueueDelete = (orderTicket: string) => {
    setCurrentAction((prev) => ({ ...prev, orderTicket }));
    setModals((prev) => ({ ...prev, queueDelete: true }));
  };
  const handleQueueDelete = async () => {
    if (!selectedAccount || !currentAction.orderTicket) return;
    setLoading((prev) => ({ ...prev, queueDelete: true }));
    try {
      await Request({
        method: "POST",
        url: "redis/queue-delete",
        data: { accountNumber: selectedAccount, orderTicket: currentAction.orderTicket },
      });
      toast.success("Order queued for deletion");
      setModals((prev) => ({ ...prev, queueDelete: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to queue delete");
    } finally {
      setLoading((prev) => ({ ...prev, queueDelete: false }));
    }
  };
  /* --------------------------------------------------------------------
     Table renderer
  -------------------------------------------------------------------- */
  const renderTable = (
    title: string,
    data: TradeData[],
    isPendingTable = false,
    isRunningTable = false
  ) => {
    const showCurrentColumn = isPendingTable || isRunningTable;
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60 backdrop-blur-md shadow-xl overflow-hidden"
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50/50 to-transparent dark:from-gray-800/50">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {title}
          </h3>
          {title === "Pending Orders" && (
            <PrimaryBtn
              onClick={() =>
                setModals((prev) => ({ ...prev, addPending: true }))
              }
              disabled={isConnecting}
              className="px-4 py-2 text-sm"
            >
              Add Pending
            </PrimaryBtn>
          )}
        </div>
        {data.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No {title.toLowerCase()} available.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200/50 dark:divide-gray-700/50">
              <thead className="bg-gray-50/50 dark:bg-gray-800/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Setup
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Volume
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Price
                  </th>
                  {showCurrentColumn && (
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-35">
                      Current
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-24">
                    Profit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200/30 dark:divide-gray-700/30 dark:bg-gray-900/20">
                {data.map((item) => {
                  const currentPrice = showCurrentColumn
                    ? getCurrentPrice(item.symbol, item.trade_setup)
                    : null;
                  const displayCurrent = currentPrice
                    ? (item.trade_setup === "buy"
                      ? currentPrice.ask?.toFixed(5)
                      : currentPrice.bid?.toFixed(5)) ?? "N/A"
                    : "N/A";
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {item.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-mono">
                        {item.symbol}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${item.trade_setup === "buy"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/80 dark:text-green-100"
                              : "bg-red-100 text-red-800 dark:bg-red-900/80 dark:text-red-100"
                            }`}
                        >
                          {item.trade_setup?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-mono">
                        {item.volume?.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-mono">
                        {item.price?.toFixed(5)}
                      </td>
                      {showCurrentColumn && (
                        <td className="px-6 py-4 whitespace-nowrap w-35 text-sm font-mono text-gray-600 dark:text-gray-300">
                          {displayCurrent}
                        </td>
                      )}
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm font-medium w-24 ${item.profit !== undefined && item.profit >= 0
                            ? "text-green-600"
                            : "text-red-600"
                          }`}
                      >
                        {item.profit !== undefined
                          ? item.profit >= 0
                            ? `+${item.profit.toFixed(2)}`
                            : item.profit.toFixed(2)
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-wrap gap-2">
                          {isPendingTable ? (
                            <>
                              <PrimaryBtn
                                onClick={() =>
                                  openUpdatePending(item.id, item.trade_setup)
                                }
                                className="text-xs px-2 py-1"
                                disabled={loading.updatePending}
                              >
                                Update
                              </PrimaryBtn>
                              <PrimaryBtn
                                onClick={() =>
                                  openAddSpotPending(item.id, item.trade_setup)
                                }
                                className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1"
                                disabled={loading.addSpot}
                              >
                                Spot
                              </PrimaryBtn>
                              {item.spot_adds?.map((_, idx) => (
                                <PrimaryBtn
                                  key={idx}
                                  onClick={() =>
                                    openUpdateSpotPending(item.id, idx, item.trade_setup)
                                  }
                                  className="bg-purple-600 hover:bg-purple-700 text-xs px-2 py-1"
                                  disabled={loading.updateSpot}
                                >
                                  S{idx + 1}
                                </PrimaryBtn>
                              ))}
                              <DangerBtn
                                onClick={() =>
                                  openQueueDelete(item.order_id || item.id)
                                }
                                className="text-xs px-2 py-1"
                                disabled={loading.queueDelete}
                              >
                                Del
                              </DangerBtn>
                            </>
                          ) : isRunningTable ? (
                            <>
                              <PrimaryBtn
                                onClick={() => openUpdateSlTpBe(item.id)}
                                className="bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1"
                                disabled={loading.updateSlTpBe}
                              >
                                SL/TP
                              </PrimaryBtn>
                              <PrimaryBtn
                                onClick={() => openUpdatePartialClose(item.id)}
                                className="bg-orange-600 hover:bg-orange-700 text-xs px-2 py-1"
                                disabled={loading.updatePartialClose}
                              >
                                Partial
                              </PrimaryBtn>
                              <PrimaryBtn
                                onClick={() => openSetVolumeToClose(item.id)}
                                className="bg-yellow-600 hover:bg-yellow-700 text-xs px-2 py-1"
                                disabled={loading.setVolumeToClose}
                              >
                                Vol
                              </PrimaryBtn>
                              <PrimaryBtn
                                onClick={() =>
                                  openAddSpotRunning(item.id, item.trade_setup)
                                }
                                className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1"
                                disabled={loading.addSpot}
                              >
                                Spot
                              </PrimaryBtn>
                              {item.spot_adds?.map((_, idx) => (
                                <PrimaryBtn
                                  key={idx}
                                  onClick={() =>
                                    openUpdateSpotRunning(item.id, idx, item.trade_setup)
                                  }
                                  className="bg-purple-600 hover:bg-purple-700 text-xs px-2 py-1"
                                  disabled={loading.updateSpot}
                                >
                                  S{idx + 1}
                                </PrimaryBtn>
                              ))}
                              <DangerBtn
                                onClick={() =>
                                  openQueueDelete(item.order_id || item.id)
                                }
                                className="text-xs px-2 py-1"
                                disabled={loading.queueDelete}
                              >
                                Close
                              </DangerBtn>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    );
  };
  /* --------------------------------------------------------------------
     Render
  -------------------------------------------------------------------- */
  if (isLoadingAccounts || !token) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="container mx-auto px-4 py-8">
          <PageBreadcrumb pageTitle="Trade Manager" />
          <SkeletonLoader />
        </div>
      </div>
    );
  }
  const availableSymbols = marketState
    .map((m) => m.symbol)
    .filter((s): s is string => !!s)
    .sort();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        <PageBreadcrumb pageTitle="Trade Manager" />
        {/* Account selector */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md p-6 mb-8 shadow-xl"
        >
          <div ref={dropdownRef} className="relative w-full max-w-sm mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Trading Account
            </label>
            <button
              className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/50 hover:ring-2 hover:ring-blue-400 transition-all text-sm text-gray-900 dark:text-white"
              onClick={() => setShowDropdown(!showDropdown)}
              disabled={isConnecting}
            >
              {accounts.length > 0 && selectedAccount ? (
                <>
                  <div className="flex items-center space-x-2">
                    <Image
                      src={
                        accounts.find(
                          (acc) =>
                            acc.accountNumber.toString() === selectedAccount
                        )?.platform === "MT5"
                          ? mt5
                          : cTraderIcon
                      }
                      alt="Platform"
                      width={20}
                      height={20}
                    />
                    <span>
                      {selectedAccount} (
                      {
                        accounts.find(
                          (acc) =>
                            acc.accountNumber.toString() === selectedAccount
                        )?.platform
                      }
                      )
                    </span>
                  </div>
                  {isConnecting && (
                    <div className="animate-ping rounded-full h-3 w-3 bg-blue-500"></div>
                  )}
                </>
              ) : (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
              )}
            </button>
            <AnimatePresence>
              {showDropdown && (
                <motion.ul
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute z-10 w-full mt-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl"
                >
                  {accounts.map((account) => (
                    <li key={account.accountNumber}>
                      <button
                        onClick={() =>
                          handleAccountChange(account.accountNumber.toString())
                        }
                        className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm dark:text-white  text-gray-800 "
                      >
                        <Image
                          src={
                            account.platform === "MT5" ? mt5 : cTraderIcon
                          }
                          alt={account.platform}
                          width={20}
                          height={20}
                        />
                        {account.accountNumber} ({account.platform})
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
          {selectedAccount && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Balance: ${balance.toLocaleString()}
            </p>
          )}
        </motion.div>
        {/* Tables */}
        {selectedAccount ? (
          <div className="space-y-6">
            {renderTable("Pending Orders", pendingState, true, false)}
            {renderTable("Open Positions", runningState, false, true)}
            {renderTable("Closed Trades", executed, false, false)}
            {renderTable("Removed Orders", removed, false, false)}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              Please select a trading account to view live data.
            </p>
          </motion.div>
        )}
        {/* ==================== MODALS ==================== */}
        <AddPendingModal
          isOpen={modals.addPending}
          onClose={() => setModals((p) => ({ ...p, addPending: false }))}
          onSubmit={handleAddPending}
          loading={loading.addPending}
          symbols={availableSymbols}
          marketData={marketState}
        />
        <UpdatePendingModal
          isOpen={modals.updatePending}
          onClose={() => setModals((p) => ({ ...p, updatePending: false }))}
          onSubmit={handleUpdatePending}
          loading={loading.updatePending}
          currentAction={currentAction}
          symbols={availableSymbols}
        />
        <AddSpotModal
          isOpen={modals.addSpotPending}
          onClose={() => setModals((p) => ({ ...p, addSpotPending: false }))}
          onSubmit={handleAddSpotPending}
          loading={loading.addSpot}
          isPending={true}
          currentAction={currentAction}
        />
        <UpdateSpotModal
          isOpen={modals.updateSpotPending}
          onClose={() => setModals((p) => ({ ...p, updateSpotPending: false }))}
          onSubmit={handleUpdateSpotPending}
          loading={loading.updateSpot}
          isPending={true}
          currentAction={currentAction}
        />
        <AddSpotModal
          isOpen={modals.addSpotRunning}
          onClose={() => setModals((p) => ({ ...p, addSpotRunning: false }))}
          onSubmit={handleAddSpotRunning}
          loading={loading.addSpot}
          isPending={false}
          currentAction={currentAction}
        />
        <UpdateSpotModal
          isOpen={modals.updateSpotRunning}
          onClose={() => setModals((p) => ({ ...p, updateSpotRunning: false }))}
          onSubmit={handleUpdateSpotRunning}
          loading={loading.updateSpot}
          isPending={false}
          currentAction={currentAction}
        />
        <UpdateSlTpBeModal
          isOpen={modals.updateSlTpBe}
          onClose={() => setModals((p) => ({ ...p, updateSlTpBe: false }))}
          onSubmit={handleUpdateSlTpBe}
          loading={loading.updateSlTpBe}
          currentAction={currentAction}
        />
        <UpdatePartialCloseModal
          isOpen={modals.updatePartialClose}
          onClose={() =>
            setModals((p) => ({ ...p, updatePartialClose: false }))
          }
          onSubmit={handleUpdatePartialClose}
          loading={loading.updatePartialClose}
          currentAction={currentAction}
        />
        <SetVolumeToCloseModal
          isOpen={modals.setVolumeToClose}
          onClose={() =>
            setModals((p) => ({ ...p, setVolumeToClose: false }))
          }
          onSubmit={handleSetVolumeToClose}
          loading={loading.setVolumeToClose}
          currentAction={currentAction}
        />
        <QueueDeleteConfirm
          isOpen={modals.queueDelete}
          onClose={() => setModals((p) => ({ ...p, queueDelete: false }))}
          onConfirm={handleQueueDelete}
          loading={loading.queueDelete}
          orderTicket={currentAction.orderTicket}
        />
      </div>
    </div>
  );
}
/* ============================================================================
   Other Modal Components (kept inline for now)
=========================================================================== */
const UpdatePendingModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<TradeData>) => void;
  loading: boolean;
  currentAction: { id: string; tradeSetup: string };
  symbols: string[];
}> = ({ isOpen, onClose, onSubmit, loading, currentAction, symbols }) => {
  const [formData, setFormData] = useState<Partial<TradeData>>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [search, setSearch] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const initial:any = pending.find((p) => p.id === currentAction.id) || {};
    setFormData(initial);
    setSearch(initial.symbol || '');
    setErrors({});
    setShowOptions(false);
  }, [isOpen, currentAction.id]);
  useEffect(() => {
    const handleClickOutside:any = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const filteredSymbols = symbols.filter((s) =>
    s.toLowerCase().includes(search.toLowerCase())
  );
  const handleSymbolSelect = (selected: string) => {
    setFormData((prev) => ({ ...prev, symbol: selected }));
    setSearch(selected);
    setShowOptions(false);
  };
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setSearch(value);
    if (!showOptions) setShowOptions(true);
    if (value && !symbols.includes(value)) {
      setFormData((prev) => ({ ...prev, symbol: value }));
    }
  };
  const handleSearchFocus = () => {
    if (search || filteredSymbols.length > 0) setShowOptions(true);
  };
  const validateField = useCallback((field: string, value: any) => {
    const newErrors = { ...errors };
    delete newErrors[field];
    if (field === 'risk_percentage' && (value < 0 || value > 100)) {
      newErrors[field] = 'Must be between 0 and 100';
    }
    if (field === 'symbol' && !value) {
      newErrors[field] = 'Symbol is required';
    }
    if (field === 'trade_setup' && !value) {
      newErrors[field] = 'Trade setup is required';
    }
    if (field === 'price' && (value === undefined || value <= 0)) {
      newErrors[field] = 'Valid entry price is required';
    }
    if (field === 'stopLoss' && (value === undefined || value <= 0)) {
      newErrors[field] = 'Valid stop loss is required';
    }
    if (field === 'order_type' && !value) {
      newErrors[field] = 'Order type is required';
    }
    setErrors(newErrors);
  }, [errors]);
  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    validateField(key, value);
  };
  // Live price validation
  useEffect(() => {
    if (formData.symbol && formData.trade_setup && formData.order_type && formData.price !== undefined) {
      const err = validatePendingPrice(formData);
      setErrors((prev:any) => ({
        ...prev,
        price: err || (formData?.price <= 0 ? 'Valid entry price is required' : undefined),
      }));
    }
  }, [formData.symbol, formData.trade_setup, formData.order_type, formData.price]);
  const currentPrice = getCurrentPrice(formData.symbol || '', formData.trade_setup || '');
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.symbol) newErrors.symbol = 'Symbol is required';
    if (!formData.trade_setup) newErrors.trade_setup = 'Trade setup is required';
    if (!formData.price || formData.price <= 0) newErrors.price = 'Valid entry price is required';
    if (!formData.stopLoss || formData.stopLoss <= 0) newErrors.stopLoss = 'Valid stop loss is required';
    if (!formData.risk_percentage || formData.risk_percentage < 0 || formData.risk_percentage > 100) newErrors.risk_percentage = 'Valid risk percentage (0-100) is required';
    if (!formData.order_type) newErrors.order_type = 'Order type is required';
    const priceError = validatePendingPrice(formData);
    if (priceError) newErrors.price = priceError;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    onSubmit(formData);
  };
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} wide={true}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Update Pending Order
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          disabled={loading}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
        {/* Column 1 */}
        <div className="space-y-4">
          {/* Symbol with Searchable Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Symbol *
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                placeholder="Search symbol (e.g., EURUSD)"
                value={search}
                onChange={handleSearchChange}
                onFocus={handleSearchFocus}
                className={`w-full p-3 pl-10 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm ${errors.symbol
                  ? "border-red-500 focus:border-red-500 focus:ring-red-200 bg-red-50/50 dark:bg-red-900/20"
                  : "border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/50 focus:border-blue-400"
                }`}
              />
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <AnimatePresence>
                {showOptions && (
                  <motion.ul
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                  >
                    {filteredSymbols.length > 0 ? (
                      filteredSymbols.map((sym) => (
                        <li key={sym}>
                          <button
                            type="button"
                            onClick={() => handleSymbolSelect(sym)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition-colors"
                          >
                            {sym}
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="px-3 py-2 text-sm text-gray-500">No symbols found</li>
                    )}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
            {formData.symbol && currentPrice && (
              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs">
                <p className="text-gray-600 dark:text-gray-300">Live Prices:</p>
                <p>Bid: <span className="font-mono text-green-600">{currentPrice.bid?.toFixed(5)}</span></p>
                <p>Ask: <span className="font-mono text-red-600">{currentPrice.ask?.toFixed(5)}</span></p>
              </div>
            )}
            {errors.symbol && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.symbol}</p>
            )}
          </div>
          <FloatingLabelInput
            type="number"
            label="Entry Price *"
            value={formData.price || ""}
            onChange={(e:any) =>
              handleChange("price", parseFloat(e.target.value) || 0)
            }
            error={errors.price}
            step="0.00001"
            min="0"
          />
          <FloatingLabelInput
            type="number"
            label="Stop Loss *"
            value={formData.stopLoss || ""}
            onChange={(e:any) =>
              handleChange("stopLoss", parseFloat(e.target.value) || 0)
            }
            error={errors.stopLoss}
            step="0.00001"
            min="0"
          />
          <FloatingLabelInput
            type="datetime-local"
            label="Start Time (optional)"
            value={formData.start_time || ""}
            onChange={(e:any) => handleChange("start_time", e.target.value)}
          />
        </div>
        {/* Column 2 */}
        <div className="space-y-4">
          <FieldSelect
            label="Trade Setup *"
            value={formData.trade_setup || ""}
            onChange={(e:any) => handleChange("trade_setup", e.target.value)}
            error={errors.trade_setup}
          >
            <option value="">Select Setup</option>
            <option value="buy">Buy ↑</option>
            <option value="sell">Sell ↓</option>
          </FieldSelect>
          <FloatingLabelInput
            type="number"
            label="Take Profit (optional)"
            value={formData.takeProfit || ""}
            onChange={(e:any) =>
              handleChange("takeProfit", parseFloat(e.target.value) || 0)
            }
            step="0.00001"
            min="0"
          />
          <FloatingLabelInput
            type="number"
            label="Risk % *"
            value={formData.risk_percentage || ""}
            onChange={(e:any) =>
              handleChange("risk_percentage", parseFloat(e.target.value) || 0)
            }
            error={errors.risk_percentage}
            min="0"
            max="100"
            step="0.1"
          />
          <FieldSelect
            label="Order Type *"
            value={formData.order_type || ""}
            onChange={(e:any) => handleChange("order_type", e.target.value)}
            error={errors.order_type}
          >
            <option value="">Select Type</option>
            <option value="limit">Limit</option>
            <option value="stop">Stop</option>
          </FieldSelect>
          <FloatingLabelInput
            type="number"
            label="Removal Price (optional)"
            value={formData.removalPrice || ""}
            onChange={(e:any) =>
              handleChange("removalPrice", parseFloat(e.target.value) || 0)
            }
            step="0.00001"
            min="0"
          />
        </div>
        <div className="col-span-2 flex gap-3 pt-6">
          <MutedBtn
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </MutedBtn>
          <PrimaryBtn
            type="submit"
            disabled={loading || Object.keys(errors).length > 0}
            className="flex-1"
          >
            {loading ? "Updating..." : "Update Order"}
          </PrimaryBtn>
        </div>
      </form>
    </ModalWrapper>
  );
};
/* --------------------------------------------------------------------- */
const AddSpotModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    entry_price: number;
    stoploss: number;
    take_profit?: number;
    risk_percentage: number;
  }) => void;
  loading: boolean;
  isPending: boolean;
  currentAction: { parentId: string; tradeSetup: string };
}> = ({
  isOpen,
  onClose,
  onSubmit,
  loading,
  isPending,
  currentAction,
}) => {
    const [formData, setFormData] = useState({
      entry_price: 0,
      stoploss: 0,
      take_profit: 0,
      risk_percentage: 1,
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    useEffect(() => {
      if (isOpen)
        setFormData({ entry_price: 0, stoploss: 0, take_profit: 0, risk_percentage: 1 });
    }, [isOpen]);
    const validateField = (field: string, value: any) => {
      const newErrors = { ...errors };
      delete newErrors[field];
      if (field === "risk_percentage" && (value < 0 || value > 100))
        newErrors[field] = "Must be between 0 and 100";
      if (field === "entry_price" && currentAction.parentId && currentAction.tradeSetup) {
        const source = isPending ? pending : running;
        const parent = source.find((p) => p.id === currentAction.parentId);
        if (parent) {
          const err = validateSpotEntry(currentAction.tradeSetup, parent.symbol, value);
          if (err) newErrors[field] = err;
        }
      }
      setErrors(newErrors);
    };
    const handleChange = (key: string, value: any) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
      validateField(key, value);
    };
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (
        formData.entry_price <= 0 ||
        formData.stoploss <= 0 ||
        formData.risk_percentage < 0 ||
        formData.risk_percentage > 100
      ) {
        toast.error("Valid positive values required");
        return;
      }
      onSubmit(formData);
    };
    return (
      <ModalWrapper isOpen={isOpen} onClose={onClose}>
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Add Spot {isPending ? "to Pending" : "to Running"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <FloatingLabelInput
            type="number"
            placeholder="Entry Price *"
            value={formData.entry_price}
            onChange={(e:any) =>
              handleChange("entry_price", parseFloat(e.target.value) || 0)
            }
            error={errors.entry_price}
            step="0.00001"
            min="0"
            label="Entry Price *"
          />
          <FloatingLabelInput
            type="number"
            placeholder="Stop Loss *"
            value={formData.stoploss}
            onChange={(e:any) =>
              handleChange("stoploss", parseFloat(e.target.value) || 0)
            }
            error={errors.stoploss}
            step="0.00001"
            min="0"
            label="Stop Loss *"
          />
          <FloatingLabelInput
            type="number"
            placeholder="Take Profit (optional)"
            value={formData.take_profit}
            onChange={(e:any) =>
              handleChange("take_profit", parseFloat(e.target.value) || 0)
            }
            step="0.00001"
            min="0"
            label="Take Profit (optional)"
          />
          <FloatingLabelInput
            type="number"
            placeholder="Risk % *"
            value={formData.risk_percentage}
            onChange={(e:any) =>
              handleChange("risk_percentage", parseFloat(e.target.value) || 0)
            }
            error={errors.risk_percentage}
            min="0"
            max="100"
            step="0.1"
            label="Risk % *"
          />
          <div className="flex gap-3 pt-4">
            <MutedBtn
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </MutedBtn>
            <PrimaryBtn
              type="submit"
              disabled={loading || Object.keys(errors).length > 0}
              className="flex-1"
            >
              {loading ? "Adding..." : "Add Spot"}
            </PrimaryBtn>
          </div>
        </form>
      </ModalWrapper>
    );
  };
/* --------------------------------------------------------------------- */
const UpdateSpotModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SpotAdd) => void;
  loading: boolean;
  isPending: boolean;
  currentAction: { parentId: string; index: number; tradeSetup: string };
}> = ({
  isOpen,
  onClose,
  onSubmit,
  loading,
  isPending,
  currentAction,
}) => {
    const [formData, setFormData] = useState<SpotAdd>({
      entry_price: 0,
      stoploss: 0,
      risk_percentage: 1,
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    useEffect(() => {
      if (isOpen) {
        const source = isPending ? pending : running;
        const parent = source.find((p) => p.id === currentAction.parentId);
        const spot = parent?.spot_adds?.[currentAction.index];
        setFormData(
          spot ?? { entry_price: 0, stoploss: 0, risk_percentage: 1 }
        );
        setErrors({});
      }
    }, [isOpen, currentAction, isPending]);
    const validateField = (field: string, value: any) => {
      const newErrors = { ...errors };
      delete newErrors[field];
      if (field === "risk_percentage" && (value < 0 || value > 100))
        newErrors[field] = "Must be between 0 and 100";
      if (field === "entry_price" && currentAction.parentId && currentAction.tradeSetup) {
        const source = isPending ? pending : running;
        const parent = source.find((p) => p.id === currentAction.parentId);
        if (parent) {
          const err = validateSpotEntry(
            currentAction.tradeSetup,
            parent.symbol,
            value
          );
          if (err) newErrors[field] = err;
        }
      }
      setErrors(newErrors);
    };
    const handleChange = (key: string, value: any) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
      validateField(key, value);
    };
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (
        formData.entry_price <= 0 ||
        formData.stoploss <= 0 ||
        formData.risk_percentage < 0 ||
        formData.risk_percentage > 100
      ) {
        toast.error("Valid positive values required");
        return;
      }
      onSubmit(formData);
    };
    return (
      <ModalWrapper isOpen={isOpen} onClose={onClose}>
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Update Spot {currentAction.index + 1}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <FloatingLabelInput
            type="number"
            placeholder="Entry Price *"
            value={formData.entry_price}
            onChange={(e:any) =>
              handleChange("entry_price", parseFloat(e.target.value) || 0)
            }
            error={errors.entry_price}
            step="0.00001"
            min="0"
            label="Entry Price *"
          />
          <FloatingLabelInput
            type="number"
            placeholder="Stop Loss *"
            value={formData.stoploss}
            onChange={(e:any) =>
              handleChange("stoploss", parseFloat(e.target.value) || 0)
            }
            error={errors.stoploss}
            step="0.00001"
            min="0"
            label="Stop Loss *"
          />
          <FloatingLabelInput
            type="number"
            placeholder="Take Profit"
            value={formData.take_profit || ""}
            onChange={(e:any) =>
              handleChange("take_profit", parseFloat(e.target.value) || 0)
            }
            step="0.00001"
            min="0"
            label="Take Profit"
          />
          <FloatingLabelInput
            type="number"
            placeholder="Risk % *"
            value={formData.risk_percentage}
            onChange={(e:any) =>
              handleChange("risk_percentage", parseFloat(e.target.value) || 0)
            }
            error={errors.risk_percentage}
            min="0"
            max="100"
            step="0.1"
            label="Risk % *"
          />
          <div className="flex gap-3 pt-4">
            <MutedBtn
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </MutedBtn>
            <PrimaryBtn
              type="submit"
              disabled={loading || Object.keys(errors).length > 0}
              className="flex-1"
            >
              {loading ? "Updating..." : "Update Spot"}
            </PrimaryBtn>
          </div>
        </form>
      </ModalWrapper>
    );
  };
/* --------------------------------------------------------------------- */
const UpdateSlTpBeModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    slToUpdate?: number;
    tpToUpdate?: number;
    breakevenPrice?: number;
  }) => void;
  loading: boolean;
  currentAction: { id: string };
}> = ({ isOpen, onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    slToUpdate: 0,
    tpToUpdate: 0,
    breakevenPrice: 0,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  useEffect(() => {
    if (isOpen)
      setFormData({ slToUpdate: 0, tpToUpdate: 0, breakevenPrice: 0 });
  }, [isOpen]);
  const validateField = (field: string, value: any) => {
    const newErrors = { ...errors };
    delete newErrors[field];
    if (value <= 0 && value !== 0) newErrors[field] = "Must be positive or 0 to skip";
    setErrors(newErrors);
  };
  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
    validateField(key, value);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = {};
    if (formData.slToUpdate !== 0) data.slToUpdate = formData.slToUpdate;
    if (formData.tpToUpdate !== 0) data.tpToUpdate = formData.tpToUpdate;
    if (formData.breakevenPrice !== 0)
      data.breakevenPrice = formData.breakevenPrice;
    if (Object.keys(data).length === 0) return toast.error("Provide at least one value");
    onSubmit(data);
  };
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Update SL/TP/Breakeven
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <FloatingLabelInput
          type="number"
          label="New SL (0 to skip)"
          value={formData.slToUpdate}
          onChange={(e:any) => handleChange("slToUpdate", e.target.value)}
          error={errors.slToUpdate}
          step="0.00001"
          min="0"
        />
        <FloatingLabelInput
          type="number"
          label="New TP (0 to skip)"
          value={formData.tpToUpdate}
          onChange={(e:any) => handleChange("tpToUpdate", e.target.value)}
          error={errors.tpToUpdate}
          step="0.00001"
          min="0"
        />
        <FloatingLabelInput
          type="number"
          label="Breakeven Price (0 to skip)"
          value={formData.breakevenPrice}
          onChange={(e:any) => handleChange("breakevenPrice", e.target.value)}
          error={errors.breakevenPrice}
          step="0.00001"
          min="0"
        />
        <div className="flex gap-3 pt-4">
          <MutedBtn
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </MutedBtn>
          <PrimaryBtn
            type="submit"
            disabled={loading || Object.keys(errors).length > 0}
            className="flex-1"
          >
            {loading ? "Updating..." : "Update"}
          </PrimaryBtn>
        </div>
      </form>
    </ModalWrapper>
  );
};
/* --------------------------------------------------------------------- */
/* UpdatePartialCloseModal – set price + lots for a future partial close */
const UpdatePartialCloseModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { partialClosePrice?: number; lotToClose?: number }) => void;
  loading: boolean;
  currentAction: { id: string };
}> = ({ isOpen, onClose, onSubmit, loading, currentAction }) => {
  const [formData, setFormData] = useState({
    partialClosePrice: 0,
    lotToClose: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const trade = running.find((t) => t.id === currentAction.id);
      setFormData({
        partialClosePrice: trade?.partialClosePrice ?? 0,
        lotToClose: trade?.lotToClose ?? 0,
      });
      setErrors({});
    }
  }, [isOpen, currentAction.id]);
  const validate = (name: string, value: number) => {
    const newErrors = { ...errors };
    delete newErrors[name];
    if (value < 0) newErrors[name] = "Must be ≥ 0 (0 = clear)";
    else if (name === "lotToClose") {
      const trade = running.find((t) => t.id === currentAction.id);
      if (trade && value > (trade.volume ?? 0))
        newErrors[name] = `Cannot exceed current volume (${trade.volume?.toFixed(2)})`;
    }
    setErrors(newErrors);
  };
  const handleChange = (key: string, value: string) => {
    const num = parseFloat(value) || 0;
    setFormData((prev) => ({ ...prev, [key]: num }));
    validate(key, num);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: { partialClosePrice?: number; lotToClose?: number } = {};
    if (formData.partialClosePrice) payload.partialClosePrice = formData.partialClosePrice;
    if (formData.lotToClose) payload.lotToClose = formData.lotToClose;
    if (Object.keys(payload).length === 0) {
      toast.error("Enter at least one value (0 clears the field)");
      return;
    }
    onSubmit(payload);
  };
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Update Partial Close
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <FloatingLabelInput
          type="number"
          label="Partial-close price (0 = clear)"
          value={formData.partialClosePrice}
          onChange={(e:any) => handleChange("partialClosePrice", e.target.value)}
          error={errors.partialClosePrice}
          step="0.00001"
          min="0"
        />
        <FloatingLabelInput
          type="number"
          label="Lots to close (0 = clear)"
          value={formData.lotToClose}
          onChange={(e:any) => handleChange("lotToClose", e.target.value)}
          error={errors.lotToClose}
          step="0.01"
          min="0"
        />
        <div className="flex gap-3 pt-4">
          <MutedBtn type="button" onClick={onClose} disabled={loading} className="flex-1">
            Cancel
          </MutedBtn>
          <PrimaryBtn
            type="submit"
            disabled={loading || Object.keys(errors).length > 0}
            className="flex-1"
          >
            {loading ? "Saving…" : "Update"}
          </PrimaryBtn>
        </div>
      </form>
    </ModalWrapper>
  );
};
/* --------------------------------------------------------------------- */
/* SetVolumeToCloseModal – directly set the exact volume that will be closed */
const SetVolumeToCloseModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (volume: number) => void;
  loading: boolean;
  currentAction: { id: string };
}> = ({ isOpen, onClose, onSubmit, loading, currentAction }) => {
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | undefined>();
  // Load current value when modal opens
  useEffect(() => {
    if (isOpen) {
      const trade = running.find((t) => t.id === currentAction.id);
      setVolume(trade?.volumeToClose ?? 0);
      setError(undefined);
    }
  }, [isOpen, currentAction.id]);
  const validate = (val: number) => {
    if (val < 0) return "Volume cannot be negative";
    const trade = running.find((t) => t.id === currentAction.id);
    if (trade && val > (trade.volume ?? 0))
      return `Max: ${trade.volume?.toFixed(2)}`;
    return undefined;
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseFloat(e.target.value) || 0;
    setVolume(num);
    setError(validate(num));
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate(volume);
    if (err) {
      toast.error(err);
      return;
    }
    onSubmit(volume);
  };
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Set Volume to Close
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <FloatingLabelInput
          type="number"
          label="Volume (lots)"
          value={volume}
          onChange={handleChange}
          error={error}
          step="0.01"
          min="0"
        />
        <div className="flex gap-3 pt-4">
          <MutedBtn type="button" onClick={onClose} disabled={loading} className="flex-1">
            Cancel
          </MutedBtn>
          <PrimaryBtn type="submit" disabled={loading || !!error} className="flex-1">
            {loading ? "Saving…" : "Set Volume"}
          </PrimaryBtn>
        </div>
      </form>
    </ModalWrapper>
  );
};
/* --------------------------------------------------------------------- */
/* QueueDeleteConfirm – simple confirmation dialog */
const QueueDeleteConfirm: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  orderTicket: string;
}> = ({ isOpen, onClose, onConfirm, loading, orderTicket }) => {
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Confirm Deletion
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
        Are you sure you want to <strong>queue order #{orderTicket}</strong> for deletion?
        This action cannot be undone.
      </p>
      <div className="flex gap-3">
        <MutedBtn onClick={onClose} disabled={loading} className="flex-1">
          Cancel
        </MutedBtn>
        <DangerBtn
          onClick={onConfirm}
          disabled={loading}
          className="flex-1"
        >
          {loading ? "Deleting…" : "Delete"}
        </DangerBtn>
      </div>
    </ModalWrapper>
  );
};