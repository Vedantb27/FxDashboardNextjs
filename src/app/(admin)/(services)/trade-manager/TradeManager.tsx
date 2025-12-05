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
import AddRunningModal from "./AddRunningModal";
import SpotRunningModal from "./SpotRunningModal";
import SpotPendingModal from "./SpotPendingModal";
import UpdateSlTpBeModal from "./UpdateSlTpBeModal";
import UpdatePartialCloseModal from "./UpdatePartialCloseModal";
import SetVolumeToCloseModal from "./SetVolumeToCloseModal";
import { getCurrencySymbol } from "../../../../utils/common";
import DetailsModal from "./DetailsModal";
import { IconRefresh } from "@tabler/icons-react";
import { convertToUserLocal } from "../../../../utils/serverTime";
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
  closing_price?: number;
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
interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
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
interface TableColumn {
  key: string;
  label: string;
  width?: string;
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
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4"
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
          onClick={(e: any) => e.stopPropagation()}
        >
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const PrimaryBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  className,
  children,
  ...rest
}) => (
  <button
    {...rest}
    className={`px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className ||
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
    className={`px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 text-xs font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className ||
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
    className={`px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className ||
      ""}`}
  >
    {children}
  </button>
);
const InfoBtn: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="p-1 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors text-sm font-medium"
    title="View Details"
  >
    ℹ️
  </button>
);
interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}
const Pagination: React.FC<PaginationProps> = ({ page, total, limit, onPageChange, disabled = false }) => {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return (
    <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
      <span className="text-sm text-gray-600 dark:text-gray-300">
        Showing {start} to {end} of {total} results
      </span>
      <div className="flex items-center space-x-2">
        <MutedBtn
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page === 1}
          className="px-3 py-1 text-xs"
        >
          Previous
        </MutedBtn>
        <span className="px-3 py-1 bg-white dark:bg-gray-700 rounded text-xs font-medium text-gray-900 dark:text-white">
          {page} of {totalPages}
        </span>
        <MutedBtn
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page === totalPages}
          className="px-3 py-1 text-xs"
        >
          Next
        </MutedBtn>
      </div>
    </div>
  );
};
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
  const [executedTrades, setExecutedTrades] = useState<TradeData[]>([]);
  const [executedPage, setExecutedPage] = useState(1);
  const [executedTotal, setExecutedTotal] = useState(0);
  const [loadingExecuted, setLoadingExecuted] = useState(false);
  const [removedTrades, setRemovedTrades] = useState<TradeData[]>([]);
  const [removedPage, setRemovedPage] = useState(1);
  const [removedTotal, setRemovedTotal] = useState(0);
  const [loadingRemoved, setLoadingRemoved] = useState(false);
  const [marketState, setMarket] = useState<MarketData[]>([]);
  const [accountInfo, setAccountInfo]: any = useState({});
  const [token, setToken] = useState<string | null>(null);
  const [detailsItem, setDetailsItem] = useState<TradeData | null>(null);
  const [detailsModal, setDetailsModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const LIMIT = 10;
  // Sync globals for modals
  useEffect(() => {
    pending = pendingState;
    running = runningState;
    market = marketState;
  }, [pendingState, runningState, marketState]);
  // Modal states
  const [modals, setModals] = useState({
    addPending: false,
    addRunning: false,
    updatePending: false,
    addSpotPending: false,
    updateSpotPending: false,
    addSpotRunning: false,
    updateSpotRunning: false,
    updateSlTpBe: false,
    updatePartialClose: false,
    setVolumeToClose: false,
    queueDelete: false,
    queueSpotDelete: false,
  });
  // Action states
  const [currentAction, setCurrentAction] = useState({
    id: "",
    parentId: "",
    index: -1,
    orderTicket: "",
    tradeSetup: "",
    order_id: "",
    breakevenPrice: "",
    takeProfit: 0,
    stopLoss: 0,
    spotIndex: -1,
  });
  // Loading states
  const [loading, setLoading] = useState({
    addPending: false,
    addRunning: false,
    updatePending: false,
    addSpot: false,
    updateSpot: false,
    updateSlTpBe: false,
    updatePartialClose: false,
    setVolumeToClose: false,
    queueDelete: false,
    queueSpotDelete: false,
  });
  /* --------------------------------------------------------------------
     Fetch executed and removed
  -------------------------------------------------------------------- */
  const fetchExecuted = useCallback(async (page: number = 1) => {
    if (!selectedAccount) return;
    setLoadingExecuted(true);
    try {
      const response = await Request({
        method: "GET",
        url: `trade-manager/get-executed-order?accountNumber=${selectedAccount}&page=${page}&limit=${LIMIT}`,
      });
      setExecutedTrades(response.trades || []);
      setExecutedTotal(response.pagination?.total || 0);
      setExecutedPage(page);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to fetch executed trades");
    } finally {
      setLoadingExecuted(false);
    }
  }, [selectedAccount]);
  const fetchRemoved = useCallback(async (page: number = 1) => {
    if (!selectedAccount) return;
    setLoadingRemoved(true);
    try {
      const response = await Request({
        method: "GET",
        url: `trade-manager/get-removed-order?accountNumber=${selectedAccount}&page=${page}&limit=${LIMIT}`,
      });
      setRemovedTrades(response.orders || []);
      setRemovedTotal(response.pagination?.total || 0);
      setRemovedPage(page);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to fetch removed orders");
    } finally {
      setLoadingRemoved(false);
    }
  }, [selectedAccount]);
  // MOVED: Page change handlers (must be at top level to avoid conditional hook calls)
  const handleExecutedPageChange = useCallback((p: number) => fetchExecuted(p), [fetchExecuted]);
  const handleRemovedPageChange = useCallback((p: number) => fetchRemoved(p), [fetchRemoved]);
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
      } catch (e: any) {
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
     Fetch executed and removed on account change
  -------------------------------------------------------------------- */
  useEffect(() => {
    if (!selectedAccount) return;
    fetchExecuted(1);
    fetchRemoved(1);
  }, [selectedAccount, fetchExecuted, fetchRemoved]);
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
            setPending(data?.pending || []);
            setRunning(data?.running || []);
            setMarket(data?.market || []);
            setAccountInfo(data?.account || []);
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
  const handleAddPending = useCallback(async (data: Partial<TradeData>) => {
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
        url: "trade-manager/add-pending",
        data: {
          accountNumber: selectedAccount,
          id: Date.now().toString(),
          ...data,
        },
      });
      setModals((prev) => ({ ...prev, addPending: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to add pending order");
    } finally {
      setLoading((prev) => ({ ...prev, addPending: false }));
    }
  }, [selectedAccount]);
  const handleAddRunning = useCallback(async (data: Partial<TradeData>) => {
    if (!selectedAccount) return;
    if (
      data.risk_percentage &&
      (data.risk_percentage < 0 || data.risk_percentage > 100)
    ) {
      toast.error("Risk percentage must be between 0 and 100");
      return;
    }
    setLoading((prev) => ({ ...prev, addRunning: true }));
    try {
      await Request({
        method: "POST",
        url: "trade-manager/add-running",
        data: {
          accountNumber: selectedAccount,
          id: Date.now().toString(),
          ...data,
        },
      });
      setModals((prev) => ({ ...prev, addRunning: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to add running order");
    } finally {
      setLoading((prev) => ({ ...prev, addRunning: false }));
    }
  }, [selectedAccount]);
  const openUpdatePending = useCallback((id: string, tradeSetup: string) => {
    setCurrentAction((prev) => ({ ...prev, id, tradeSetup }));
    setModals((prev) => ({ ...prev, updatePending: true }));
  }, []);
  const handleUpdatePending = useCallback(async (data: Partial<TradeData>) => {
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
        url: `trade-manager/update-pending/${currentAction.id}`,
        data: { accountNumber: selectedAccount, ...data },
      });
      setModals((prev) => ({ ...prev, updatePending: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update pending order");
    } finally {
      setLoading((prev) => ({ ...prev, updatePending: false }));
    }
  }, [selectedAccount, currentAction.id]);
  const openAddSpotPending = useCallback((parentId: string, tradeSetup: string, order_id: any) => {
    setCurrentAction((prev) => ({ ...prev, parentId, tradeSetup, order_id }));
    setModals((prev) => ({ ...prev, addSpotPending: true }));
  }, []);
  const handleAddSpotPending = useCallback(async (spotData: {
    entry_price: number;
    stoploss: number;
    take_profit?: number;
    risk_percentage: number;
  }) => {
    if (!selectedAccount || !currentAction.parentId || !currentAction.tradeSetup)
      return;
    const parent = pendingState.find((p) => p.id === currentAction.parentId);
    if (!parent) return toast.error("Parent order not found");
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
        url: `trade-manager/pending/${currentAction.parentId}/add-spot`,
        data: { accountNumber: selectedAccount, ...spotData },
      });
      setModals((prev) => ({ ...prev, addSpotPending: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to add spot");
    } finally {
      setLoading((prev) => ({ ...prev, addSpot: false }));
    }
  }, [selectedAccount, currentAction.parentId, currentAction.tradeSetup, pendingState]);
  const openUpdateSpotPending = useCallback((
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
  }, []);
  const handleUpdateSpotPending = useCallback(async (spotData: SpotAdd) => {
    if (
      !selectedAccount ||
      !currentAction.parentId ||
      currentAction.index < 0 ||
      !currentAction.tradeSetup
    )
      return;
    const parent = pendingState.find((p) => p.id === currentAction.parentId);
    if (!parent) return toast.error("Parent order not found");
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
        url: `trade-manager/pending/${currentAction.parentId}/spot/${currentAction.index}`,
        data: { accountNumber: selectedAccount, ...spotData },
      });
      setModals((prev) => ({ ...prev, updateSpotPending: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update spot");
    } finally {
      setLoading((prev) => ({ ...prev, updateSpot: false }));
    }
  }, [selectedAccount, currentAction.parentId, currentAction.index, currentAction.tradeSetup, pendingState]);
  const openAddSpotRunning = useCallback((parentId: string, tradeSetup: string, order_id: any) => {
    setCurrentAction((prev) => ({ ...prev, parentId, tradeSetup, order_id }));
    setModals((prev) => ({ ...prev, addSpotRunning: true }));
  }, []);
  const handleAddSpotRunning = useCallback(async (spotData: {
    entry_price: number;
    stoploss: number;
    take_profit?: number;
    risk_percentage: number;
  }) => {
    if (!selectedAccount || !currentAction.parentId || !currentAction.tradeSetup)
      return;
    const parent = runningState.find((p) => p.id === currentAction.parentId);
    if (!parent) return toast.error("Parent trade not found");
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
        url: `trade-manager/running/${currentAction.parentId}/add-spot`,
        data: { accountNumber: selectedAccount, ...spotData },
      });
      setModals((prev) => ({ ...prev, addSpotRunning: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to add spot");
    } finally {
      setLoading((prev) => ({ ...prev, addSpot: false }));
    }
  }, [selectedAccount, currentAction.parentId, currentAction.tradeSetup, runningState]);
  const openUpdateSpotRunning = useCallback((
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
  }, []);
  const handleUpdateSpotRunning = useCallback(async (spotData: SpotAdd) => {
    if (
      !selectedAccount ||
      !currentAction.parentId ||
      currentAction.index < 0 ||
      !currentAction.tradeSetup
    )
      return;
    const parent = runningState.find((p) => p.id === currentAction.parentId);
    if (!parent) return toast.error("Parent trade not found");
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
        url: `trade-manager/running/${currentAction.parentId}/spot/${currentAction.index}`,
        data: { accountNumber: selectedAccount, ...spotData },
      });
      setModals((prev) => ({ ...prev, updateSpotRunning: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update spot");
    } finally {
      setLoading((prev) => ({ ...prev, updateSpot: false }));
    }
  }, [selectedAccount, currentAction.parentId, currentAction.index, currentAction.tradeSetup, runningState]);
  const openUpdateSlTpBe = useCallback((id: string, breakevenPrice: any, stopLoss: any, takeProfit: any) => {
    setCurrentAction((prev) => ({ ...prev, id, breakevenPrice, stopLoss, takeProfit }));
    setModals((prev) => ({ ...prev, updateSlTpBe: true }));
  }, []);
  const handleUpdateSlTpBe = useCallback(async (data: {
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
        url: `trade-manager/running/${currentAction.id}/update-sl-tp-breakeven`,
        data: { accountNumber: selectedAccount, ...data },
      });
      setModals((prev) => ({ ...prev, updateSlTpBe: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update");
    } finally {
      setLoading((prev) => ({ ...prev, updateSlTpBe: false }));
    }
  }, [selectedAccount, currentAction.id]);
  const openUpdatePartialClose = useCallback((id: string) => {
    setCurrentAction((prev) => ({ ...prev, id }));
    setModals((prev) => ({ ...prev, updatePartialClose: true }));
  }, []);
  const handleUpdatePartialClose = useCallback(async (data: {
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
        url: `trade-manager/running/${currentAction.id}/update-partial-close`,
        data: { accountNumber: selectedAccount, ...data },
      });
      setModals((prev) => ({ ...prev, updatePartialClose: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update");
    } finally {
      setLoading((prev) => ({ ...prev, updatePartialClose: false }));
    }
  }, [selectedAccount, currentAction.id]);
  const openSetVolumeToClose = useCallback((id: string) => {
    setCurrentAction((prev) => ({ ...prev, id }));
    setModals((prev) => ({ ...prev, setVolumeToClose: true }));
  }, []);
  const handleSetVolumeToClose = useCallback(async (volumeToClose: number) => {
    if (!selectedAccount || !currentAction.id) return;
    if (volumeToClose < 0) return toast.error("Volume to close must be non-negative");
    const trade = runningState.find((t) => t.id === currentAction.id);
    if (trade && volumeToClose > (trade.volume || 0))
      return toast.error("Volume to close exceeds current volume");
    setLoading((prev) => ({ ...prev, setVolumeToClose: true }));
    try {
      await Request({
        method: "PUT",
        url: `trade-manager/running/${currentAction.id}/set-volume-close`,
        data: { accountNumber: selectedAccount, volumeToClose },
      });
      setModals((prev) => ({ ...prev, setVolumeToClose: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to set");
    } finally {
      setLoading((prev) => ({ ...prev, setVolumeToClose: false }));
    }
  }, [selectedAccount, currentAction.id, runningState]);
  const openQueueDelete = useCallback((orderTicket: string) => {
    setCurrentAction((prev) => ({ ...prev, orderTicket }));
    setModals((prev) => ({ ...prev, queueDelete: true }));
  }, []);
  const handleQueueDelete = useCallback(async () => {
    if (!selectedAccount || !currentAction.orderTicket) return;
    setLoading((prev) => ({ ...prev, queueDelete: true }));
    try {
      await Request({
        method: "POST",
        url: "trade-manager/queue-delete",
        data: { accountNumber: selectedAccount, orderTicket: currentAction.orderTicket },
      });
      setModals((prev) => ({ ...prev, queueDelete: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to queue delete");
    } finally {
      setLoading((prev) => ({ ...prev, queueDelete: false }));
    }
  }, [selectedAccount, currentAction.orderTicket]);
  const handleQueueSpotDelete = useCallback(async () => {
    if (!selectedAccount || !currentAction.parentId || currentAction.index < 0) return;
    setLoading((prev) => ({ ...prev, queueSpotDelete: true }));
    try {
      await Request({
        method: "POST",
        url: "trade-manager/queue-spot-delete",
        data: {
          accountNumber: String(selectedAccount),
          tradeId: String(currentAction.parentId),
          spotIndex: String(currentAction.index)
        },
      });
      setModals((prev) => ({ ...prev, updateSpotPending: false, updateSpotRunning: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to queue spot delete");
    } finally {
      setLoading((prev) => ({ ...prev, queueSpotDelete: false }));
    }
  }, [selectedAccount, currentAction.parentId, currentAction.index]);
  const RenderActions = useCallback(({
    item,
    isPendingTable,
    isRunningTable,
  }: {
    item: TradeData;
    isPendingTable: boolean;
    isRunningTable: boolean;
  }) => {
    if (!isPendingTable && !isRunningTable) return null;
    return (
      <div className="flex flex-wrap gap-1 pt-3 mt-3 border-t border-gray-200/50 dark:border-gray-700/50">
        {isPendingTable ? (
          <>
            <PrimaryBtn
              onClick={() =>
                openUpdatePending(item.id, item.trade_setup)
              }
              disabled={loading.updatePending}
            >
              Update
            </PrimaryBtn>
            <PrimaryBtn
              onClick={() =>
                openAddSpotPending(item.id, item.trade_setup, item?.order_id)
              }
              className="bg-green-600 hover:bg-green-700"
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
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={loading.updateSpot}
              >
                S{idx + 1}
              </PrimaryBtn>
            ))}
            <DangerBtn
              onClick={() =>
                openQueueDelete(item.order_id || item.id)
              }
              disabled={loading.queueDelete}
            >
              Del
            </DangerBtn>
          </>
        ) : (
          <>
            <PrimaryBtn
              onClick={() => openUpdateSlTpBe(item.id, item?.breakevenPrice, item?.stopLoss, item?.takeProfit)}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={loading.updateSlTpBe}
            >
              SL/TP
            </PrimaryBtn>
            <PrimaryBtn
              onClick={() => openUpdatePartialClose(item.id)}
              className="bg-gray-600 hover:bg-gray-700"
              disabled={loading.updatePartialClose}
            >
              Partial
            </PrimaryBtn>
            <PrimaryBtn
              onClick={() => openSetVolumeToClose(item.id)}
              className="bg-amber-600 hover:bg-amber-700"
              disabled={loading.setVolumeToClose}
            >
              Vol
            </PrimaryBtn>
            <PrimaryBtn
              onClick={() =>
                openAddSpotRunning(item.id, item.trade_setup, item?.order_id)
              }
              className="bg-green-600 hover:bg-green-700"
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
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={loading.updateSpot}
              >
                S{idx + 1}
              </PrimaryBtn>
            ))}
            <DangerBtn
              onClick={() =>
                openQueueDelete(item.order_id || item.id)
              }
              disabled={loading.queueDelete}
            >
              Close
            </DangerBtn>
          </>
        )}
      </div>
    );
  }, [loading, openUpdatePending, openAddSpotPending, openUpdateSpotPending, openQueueDelete, openUpdateSlTpBe, openUpdatePartialClose, openSetVolumeToClose, openAddSpotRunning, openUpdateSpotRunning]);
  const openDetails = useCallback((item: TradeData) => {
    setDetailsItem(item);
    setDetailsModal(true);
  }, []);
  /* --------------------------------------------------------------------
     Table renderer
  -------------------------------------------------------------------- */
  const getColumns = useCallback((
    title: string,
    isPendingTable: boolean,
    isRunningTable: boolean
  ): TableColumn[] => {
    let cols: TableColumn[] = [
      { key: 'id', label: 'ID' },
      { key: 'symbol', label: 'Symbol' },
      { key: 'setup', label: 'Setup' },
      { key: 'volume', label: 'Volume' },
      { key: 'price', label: 'Price' },
    ];
    if (isPendingTable || isRunningTable) {
      cols.push({ key: 'current', label: 'Current', width: 'w-40' });
      cols.push({ key: 'profit', label: 'Profit', width: 'w-34' });
    } else if (title === "Closed Trades") {
      cols.splice(5, 0, { key: 'closeTime', label: 'Close Time', width: 'w-48' });
      cols.push({ key: 'profit', label: 'Profit', width: 'w-34' });
    } else if (title === "Removed Orders") {
      // cols.splice(5, 0, { key: 'startTime', label: 'Added Time', width: 'w-48' });
    }
    cols.push({ key: 'actions', label: 'Actions' });
    return cols;
  }, []);
  const renderTable = useCallback((
    title: string,
    data: TradeData[],
    isPendingTable = false,
    isRunningTable = false,
    page = 1,
    total = 0,
    limit = 10,
    onPageChange?: (page: number) => void,
    onRefresh?: () => void,
    loading?: boolean
  ) => {
    const showCurrentColumn = isPendingTable || isRunningTable;
    const columns = getColumns(title, isPendingTable, isRunningTable);
    const handleOpenDetails = (item: TradeData) => openDetails(item);
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
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={!!loading}
              className="
    p-2 rounded-full transition-colors
    bg-gray-200 dark:bg-gray-700
    hover:bg-gray-300 dark:hover:bg-gray-600
    active:bg-gray-400 dark:active:bg-gray-500
    disabled:opacity-50 disabled:cursor-not-allowed
    text-black dark:text-white
  "

              aria-label="Refresh"
            >
              <IconRefresh
                stroke={1.5}
                className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
              />
            </button>


          )}
          {title === "Pending Orders" && (
            <PrimaryBtn
              onClick={() =>
                setModals((prev) => ({ ...prev, addPending: true }))
              }
              disabled={isConnecting}
            >
              Add Pending
            </PrimaryBtn>
          )}
          {title === "Open Positions" && (
            <PrimaryBtn
              onClick={() =>
                setModals((prev) => ({ ...prev, addRunning: true }))
              }
              disabled={isConnecting}
            >
              Add Market
            </PrimaryBtn>
          )}
        </div>
        {loading ? (
          <>
            <div className="md:hidden p-4 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white/80 dark:bg-gray-800/40 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50 shadow-sm animate-pulse"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                      <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    </div>
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                  <div className="space-y-3">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="flex justify-between h-4">
                        <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </div>
                    ))}
                  </div>
                  <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded mt-4"></div>
                </div>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto animate-pulse">
              <table className="min-w-full divide-y divide-gray-200/50 dark:divide-gray-700/50">
                <thead className="bg-gray-50/50 dark:bg-gray-800/30">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className={`px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider ${col.width || ''}`}
                      >
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200/30 dark:divide-gray-700/30 dark:bg-gray-900/20">
                  {[...Array(5)].map((_, i) => (
                    <tr
                      key={i}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      {columns.map((col) => {
                        const tdClass = `px-6 py-4 whitespace-nowrap text-sm ${col.width || ''}`;
                        return (
                          <td key={col.key} className={tdClass}>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full max-w-32"></div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : data.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No {title.toLowerCase()} available.
            </p>
          </div>
        ) : (
          <>
            <div className="md:hidden p-4 space-y-4">
              {data.map((item) => {
                const currentPrice = showCurrentColumn
                  ? getCurrentPrice(item.symbol, item.trade_setup)
                  : null;
                const displayCurrent = currentPrice
                  ? (item.trade_setup === "buy"
                    ? currentPrice.ask?.toFixed(5)
                    : currentPrice.bid?.toFixed(5)) ?? "--"
                  : "--";
                const profitDisplay = item.profit !== undefined
                  ? item.profit >= 0
                    ? `+${item.profit.toFixed(2)}`
                    : item.profit.toFixed(2)
                  : "--";
                const profitClass = item.profit !== undefined && item.profit >= 0
                  ? "text-green-600"
                  : "text-red-600";
                const setupClass = item.trade_setup === "buy"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/80 dark:text-green-100"
                  : "bg-red-100 text-red-800 dark:bg-red-900/80 dark:text-red-100";
                const timeDisplay = title === "Closed Trades"
                  ? item.closing_time ? convertToUserLocal(item.closing_time) : '--'
                  : title === "Removed Orders"
                    ? item.start_time ? convertToUserLocal(item.start_time) : '--'
                    : '';
                const showProfitMobile = title === "Closed Trades" || isRunningTable;
                const showTimeMobile = title === "Closed Trades" || title === "Removed Orders";
                return (
                  <div
                    key={item.id}
                    className="bg-white/80 dark:bg-gray-800/40 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                          {item.symbol}
                        </h4>
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${setupClass}`}
                        >
                          {item.trade_setup?.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {item?.id ? (
                          item.id
                        ) : (
                          <span className="inline-flex items-center">
                            Adding..{" "}
                            <div className="animate-ping rounded-full h-2 w-2 bg-blue-500 ml-1"></div>
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Volume</span>
                        <span className="font-mono text-gray-900 dark:text-white">
                          {item.volume?.toFixed(2) ?? "--"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Price</span>
                        <span className="font-mono text-gray-900 dark:text-white">
                          {item.price?.toFixed(5) ?? "--"}
                        </span>
                      </div>
                      {showCurrentColumn && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Current</span>
                          <span className="font-mono text-gray-600 dark:text-gray-300">
                            {displayCurrent}
                          </span>
                        </div>
                      )}
                      {showTimeMobile && timeDisplay && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">
                            {title === "Closed Trades" ? "Close Time" : "Added Time"}
                          </span>
                          <span className="text-gray-900 dark:text-white text-xs">
                            {timeDisplay}
                          </span>
                        </div>
                      )}
                      {showProfitMobile && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Profit</span>
                          <span
                            className={`font-medium font-mono ${item.profit !== undefined ? profitClass : ""}`}
                          >
                            {profitDisplay}
                          </span>
                        </div>
                      )}
                    </div>
                    {isPendingTable || isRunningTable ? (
                      <RenderActions
                        item={item}
                        isPendingTable={isPendingTable}
                        isRunningTable={isRunningTable}
                      />
                    ) : (
                      <PrimaryBtn
                        onClick={() => handleOpenDetails(item)}
                        className="w-full text-xs"
                      >
                        View Details
                      </PrimaryBtn>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200/50 dark:divide-gray-700/50">
                <thead className="bg-gray-50/50 dark:bg-gray-800/30">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className={`px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider ${col.width || ''}`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200/30 dark:divide-gray-700/30 dark:bg-gray-900/20">
                  {data?.map((item) => {
                    const currentPrice = showCurrentColumn
                      ? getCurrentPrice(item.symbol, item.trade_setup)
                      : null;
                    const displayCurrent = currentPrice
                      ? (item.trade_setup === "buy"
                        ? currentPrice.ask?.toFixed(5)
                        : currentPrice.bid?.toFixed(5)) ?? "--"
                      : "--";
                    const profitDisplay = item.profit !== undefined
                      ? item.profit >= 0
                        ? `+${item.profit.toFixed(2)}`
                        : item.profit.toFixed(2)
                      : "--";
                    const profitClass = item.profit !== undefined && item.profit >= 0
                      ? "text-green-600"
                      : "text-red-600";
                    const setupClass = item.trade_setup === "buy"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/80 dark:text-green-100"
                      : "bg-red-100 text-red-800 dark:bg-red-900/80 dark:text-red-100";
                    const closeTimeDisplay = item.closing_time ? convertToUserLocal(item.closing_time) : '--';
                    const startTimeDisplay = item.start_time ? convertToUserLocal(item.start_time) : '--';
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                      >
                        {columns.map((col) => {
                          let content: React.ReactNode = '--';
                          let tdClass = `px-6 py-4 whitespace-nowrap text-sm`;
                          if (col.width) tdClass += ` ${col.width}`;
                          switch (col.key) {
                            case 'id':
                              content = item?.id ? (
                                item.id
                              ) : (
                                <span className="inline-flex items-center">
                                  Adding.. &nbsp; <div className="animate-ping rounded-full h-3 w-3 bg-blue-500"></div>
                                </span>
                              );
                              tdClass += ` font-medium text-gray-900 dark:text-white`;
                              break;
                            case 'symbol':
                              content = item.symbol;
                              tdClass += ` text-gray-900 dark:text-white font-mono`;
                              break;
                            case 'setup':
                              content = (
                                <span
                                  className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${setupClass}`}
                                >
                                  {item.trade_setup?.toUpperCase()}
                                </span>
                              );
                              break;
                            case 'volume':
                              content = item.volume?.toFixed(2) || '--';
                              tdClass += ` text-gray-900 dark:text-white font-mono`;
                              break;
                            case 'price':
                              content = item.price?.toFixed(5) || '--';
                              tdClass += ` text-gray-900 dark:text-white font-mono`;
                              break;
                            case 'current':
                              content = displayCurrent;
                              tdClass += ` font-mono text-gray-600 dark:text-gray-300`;
                              break;
                            case 'profit':
                              content = profitDisplay;
                              tdClass += ` font-medium font-mono ${profitClass}`;
                              break;
                            case 'closeTime':
                              content = closeTimeDisplay;
                              tdClass += ` text-gray-900 dark:text-white`;
                              break;
                            case 'startTime':
                              content = startTimeDisplay;
                              tdClass += ` text-gray-900 dark:text-white`;
                              break;
                            case 'actions':
                              if (isPendingTable || isRunningTable) {
                                content = <RenderActions item={item} isPendingTable={isPendingTable} isRunningTable={isRunningTable} />;
                              } else {
                                content = <InfoBtn onClick={() => handleOpenDetails(item)} />;
                              }
                              tdClass += ` font-medium`;
                              break;
                            default:
                              content = '--';
                          }
                          return (
                            <td
                              key={col.key}
                              className={tdClass}
                            >
                              {content}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        {total > 0 && (
          <Pagination
            page={page}
            total={total}
            limit={limit}
            onPageChange={onPageChange || (() => { })}
            disabled={!!loading}
          />
        )}
      </motion.div>
    );
  }, [getCurrentPrice, loading, isConnecting, RenderActions, openDetails, getColumns]);
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
                        className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm dark:text-white text-gray-800 "
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
          {selectedAccount && (<div className="flex flex-col sm:flex-row sm:items-center sm:gap-6 bg-white dark:bg-gray-900
                px-4 py-3 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              <span className="text-gray-500 dark:text-gray-400">Balance:</span>{" "}
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {getCurrencySymbol(accountInfo?.currency)}
                {accountInfo?.balance?.toLocaleString()}
              </span>
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mt-1 sm:mt-0">
              <span className="text-gray-500 dark:text-gray-400">Equity:</span>{" "}
              <span className="font-semibold text-green-600 dark:text-green-400">
                {getCurrencySymbol(accountInfo?.currency)}
                {accountInfo?.equity?.toLocaleString()}
              </span>
            </p>
          </div>
          )}
        </motion.div>
        {/* Tables */}
        {selectedAccount ? (
          <div className="space-y-6">
            {renderTable("Pending Orders", pendingState, true, false)}
            {renderTable("Open Positions", runningState, false, true)}
            {renderTable("Closed Trades", executedTrades, false, false, executedPage, executedTotal, LIMIT, handleExecutedPageChange, () => fetchExecuted(executedPage), loadingExecuted)}
            {renderTable("Removed Orders", removedTrades, false, false, removedPage, removedTotal, LIMIT, handleRemovedPageChange, () => fetchRemoved(removedPage), loadingRemoved)}
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
        <AddRunningModal
          isOpen={modals.addRunning}
          onClose={() => setModals((p) => ({ ...p, addRunning: false }))}
          onSubmit={handleAddRunning}
          loading={loading.addRunning}
          symbols={availableSymbols}
          marketData={marketState}
        />
        <AddPendingModal
          isOpen={modals.updatePending}
          onClose={() => setModals((p) => ({ ...p, updatePending: false }))}
          onSubmit={handleUpdatePending}
          loading={loading.updatePending}
          symbols={availableSymbols}
          marketData={marketState}
          initialData={pending.find((p) => p.id === currentAction.id) || {}}
          mode="update"
        />
        <SpotPendingModal
          isOpen={modals.addSpotPending}
          onClose={() => setModals(p => ({ ...p, addSpotPending: false }))}
          onSubmit={handleAddSpotPending}
          loading={loading.addSpot}
          currentAction={currentAction}
          pending={pendingState}
          marketData={marketState}
          mode="add"
        />
        <SpotPendingModal
          isOpen={modals.updateSpotPending}
          onClose={() => setModals(p => ({ ...p, updateSpotPending: false }))}
          onSubmit={handleUpdateSpotPending}
          onDelete={() => handleQueueSpotDelete()}
          isDeleting={loading.queueSpotDelete}
          loading={loading.updateSpot}
          currentAction={currentAction}
          pending={pendingState}
          marketData={marketState}
          mode="update"
        />
        <SpotRunningModal
          isOpen={modals.addSpotRunning}
          onClose={() => setModals(p => ({ ...p, addSpotRunning: false }))}
          onSubmit={handleAddSpotRunning}
          loading={loading.addSpot}
          currentAction={currentAction}
          running={runningState}
          marketData={marketState}
          mode="add"
        />
        <SpotRunningModal
          isOpen={modals.updateSpotRunning}
          onClose={() => setModals(p => ({ ...p, updateSpotRunning: false }))}
          onSubmit={handleUpdateSpotRunning}
          onDelete={() => handleQueueSpotDelete()}
          isDeleting={loading.queueSpotDelete}
          loading={loading.updateSpot}
          currentAction={currentAction}
          running={runningState}
          marketData={marketState}
          mode="update"
        />
        <UpdateSlTpBeModal
          isOpen={modals.updateSlTpBe}
          onClose={() => setModals((p) => ({ ...p, updateSlTpBe: false }))}
          onSubmit={handleUpdateSlTpBe}
          loading={loading.updateSlTpBe}
          currentAction={currentAction}
          running={runningState}
          marketData={marketState}
        />
        <UpdatePartialCloseModal
          isOpen={modals.updatePartialClose}
          onClose={() =>
            setModals((p) => ({ ...p, updatePartialClose: false }))
          }
          onSubmit={handleUpdatePartialClose}
          loading={loading.updatePartialClose}
          currentAction={currentAction}
          running={runningState}
          marketData={marketState}
        />
        <SetVolumeToCloseModal
          isOpen={modals.setVolumeToClose}
          onClose={() =>
            setModals((p) => ({ ...p, setVolumeToClose: false }))
          }
          onSubmit={handleSetVolumeToClose}
          loading={loading.setVolumeToClose}
          currentAction={currentAction}
          running={runningState}
          marketData={marketState}
        />
        <QueueDeleteConfirm
          isOpen={modals.queueDelete}
          onClose={() => setModals((p) => ({ ...p, queueDelete: false }))}
          onConfirm={handleQueueDelete}
          loading={loading.queueDelete}
          orderTicket={currentAction.orderTicket}
        />
        <DetailsModal
          isOpen={detailsModal}
          // TradeData={TradeData}
          onClose={() => setDetailsModal(false)}
          item={detailsItem}
        />
      </div>
    </div>
  );
}
/* --------------------------------------------------------------------- */
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