"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import Request from "../../../../utils/request";
import { IconPlus, IconTrash, IconEdit, IconPlayerPause, IconPlayerPlay, IconDeviceFloppy, IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight } from "@tabler/icons-react";
import PageBreadcrumb from "../../../../components/common/PageBreadCrumb";
import { FloatingLabelInput } from "../../../../components/form/FloatingLabelInput";
import FieldSelect from "../../../../components/form/FieldSelect";
import Select from "react-select";
import { formatToLocalTime } from "../../../../utils/common";
import Image from "next/image";
import mt5 from "../../../../icons/mt5.png";
import cTraderIcon from "../../../../icons/ctrader.png";

/* ============================================================================
   Types
=========================================================================== */
interface Account {
  accountNumber: string;
  server: string;
  platform: "MT5" | "cTrader";
  balance: number;
  depositCurrency: string;
  isActive: boolean;
  creditExpiryTime: string | null;
  masterAccountID: string | null;
  role: string | null;
  createdAt: string;
}

interface SlaveConfig {
  paused: boolean;
  multiplier: number;
}

interface SymbolMap {
  [baseSymbol: string]: string;
}

interface SlaveLog {
  timestamp: string;
  symbol: string;
  order_type: string;
  trade_setup: string | null;
  status: string;
  master_account: string;
  master_trade_id: string;
  slave_trade_id: string | null;
  reason: string | null;
}

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
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 flex items-center justify-center p-4 sm:p-6 overflow-y-hidden overflow-x-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >

        <motion.div
          className={`bg-white/95 dark:bg-slate-950/95
    border border-slate-300/30 dark:border-slate-700/30
    rounded-xl shadow-xl mx-auto p-4 sm:p-8
    max-h-[85vh] overflow-y-auto scrollbar-stable
    ${wide ? 'w-full max-w-5xl' : 'w-full max-w-md'}
  `}
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.97, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          onMouseDown={(e: any) => e.stopPropagation()}

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
    className={`px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed ${className || ""}`}
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
    className={`px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed ${className || ""}`}
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
    className={`px-4 py-2 rounded-xl bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 text-slate-800 dark:text-slate-200 text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed ${className || ""}`}
  >
    {children}
  </button>
);

const PaginationBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  className,
  children,
  ...rest
}) => (
  <button
    {...rest}
    className={`px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${className || ""}`}
  >
    {children}
  </button>
);

const SkeletonBox: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={`animate-pulse bg-slate-200/80 dark:bg-slate-700/80 rounded 
    max-w-full overflow-hidden ${className || ""}`}
  />
);


const SkeletonTable: React.FC<{ cols: number; rows: number }> = ({ cols, rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full table-fixed divide-y divide-slate-300/50 dark:divide-slate-700/50">
      <thead className="bg-slate-100/80 dark:bg-slate-800/80">
        <tr>
          {Array(cols).fill(0).map((_, i) => (
            <th key={i} className="px-4 sm:px-8 py-3 sm:py-4 text-left">
              <SkeletonBox className="h-4 w-full" />

            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-300/50 dark:divide-slate-700/50">
        {Array(rows).fill(0).map((_, r) => (
          <tr key={r}>
            {Array(cols).fill(0).map((_, c) => (
              <td key={c} className="px-4 sm:px-8 py-4 sm:py-5">
                <SkeletonBox className="h-4 w-3/4" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const SkeletonMobileSlaves: React.FC<{ count: number }> = ({ count }) => (
  <div className="divide-y divide-slate-300/50 dark:divide-slate-700/50">
    {Array(count).fill(0).map((_, i) => (
      <div key={i} className="p-4 space-y-4 bg-white/90 dark:bg-slate-950/90 shadow-md rounded-lg m-2">
        <SkeletonBox className="h-4 w-40" />
        <SkeletonBox className="h-4 w-32" />
        <SkeletonBox className="h-4 w-48" />
        <div className="flex items-center justify-between">
          <SkeletonBox className="h-4 w-20" />
          <SkeletonBox className="h-8 w-28 rounded-xl" />
        </div>
        <div className="flex items-center justify-between">
          <SkeletonBox className="h-4 w-full" />

          <div className="flex gap-3">
            <SkeletonBox className="h-10 w-20 rounded" />
            <SkeletonBox className="h-10 w-10 rounded-xl" />
          </div>
        </div>
        <div className="flex justify-end">
          <SkeletonBox className="h-8 w-24 rounded-xl" />
        </div>
      </div>
    ))}
  </div>
);

const SkeletonMobileSymbols: React.FC<{ count: number }> = ({ count }) => (
  <div className="divide-y divide-slate-300/50 dark:divide-slate-700/50">
    {Array(count).fill(0).map((_, i) => (
      <div key={i} className="p-4 space-y-4 bg-white/90 dark:bg-slate-950/90 shadow-md rounded-lg m-2">
        <SkeletonBox className="h-4 w-40" />
        <SkeletonBox className="h-4 w-32" />
        <div className="flex justify-end gap-3">
          <SkeletonBox className="h-8 w-20 rounded-xl" />
          <SkeletonBox className="h-8 w-20 rounded-xl" />
        </div>
      </div>
    ))}
  </div>
);

const SkeletonMobileLogs: React.FC<{ count: number }> = ({ count }) => (
  <div className="divide-y divide-slate-300/50 dark:divide-slate-700/50">
    {Array(count).fill(0).map((_, i) => (
      <div key={i} className="p-4 space-y-2 bg-white/90 dark:bg-slate-950/90 shadow-md rounded-lg m-2">
        {Array(9).fill(0).map((_, l) => (
          <div key={l} className="text-sm">
            <SkeletonBox className="h-4 w-48" />
          </div>
        ))}
      </div>
    ))}
  </div>
);

/* ============================================================================
   Main Component: CopyTradeManager
=========================================================================== */
export default function CopyTradeManager() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountSymbols, setAccountSymbols] = useState<Record<string, string[]>>({});
  const [selectedMaster, setSelectedMaster] = useState<string | null>(null);
  const [slaves, setSlaves] = useState<string[]>([]);
  const [currentSlaveConfigs, setCurrentSlaveConfigs] = useState<Record<string, SlaveConfig>>({});
  const [selectedSlave, setSelectedSlave] = useState<string | null>(null);
  const [symbolMaps, setSymbolMaps] = useState<Record<string, SymbolMap>>({});
  const [slaveLogs, setSlaveLogs] = useState<Record<string, SlaveLog[]>>({});
  const [pendingMultipliers, setPendingMultipliers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({ accounts: true, slaves: false, configs: false, symbols: false, logs: false });
  const [showMasterDropdown, setShowMasterDropdown] = useState(false);
  const [showSlaveDropdown, setShowSlaveDropdown] = useState(false);
  const masterDropdownRef = useRef<HTMLDivElement>(null);
  const slaveDropdownRef = useRef<HTMLDivElement>(null);
  const [showLinkSlaveDropdown, setShowLinkSlaveDropdown] = useState(false);
  const linkSlaveDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (masterDropdownRef.current && !masterDropdownRef.current.contains(event.target as Node)) {
        setShowMasterDropdown(false);
      }
      if (slaveDropdownRef.current && !slaveDropdownRef.current.contains(event.target as Node)) {
        setShowSlaveDropdown(false);
      }
      if (linkSlaveDropdownRef.current && !linkSlaveDropdownRef.current.contains(event.target as Node)) {
        setShowLinkSlaveDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const [modals, setModals] = useState({
    linkSlave: false,
    unlinkSlave: false,
    addSymbolMap: false,
    editSymbolMap: false,
    removeMaster: false,
  });
  const [currentModalData, setCurrentModalData] = useState({
    slave: "",
    baseSymbol: "",
    slaveSymbol: "",
  });
  const [logsCurrentPage, setLogsCurrentPage] = useState(1);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const logsPerPage = 10;

  const masterSymbols = useMemo(() => accountSymbols[selectedMaster ?? ""] ?? [], [accountSymbols, selectedMaster]);
  const slaveSymbols = useMemo(() => accountSymbols[selectedSlave ?? ""] ?? [], [accountSymbols, selectedSlave]);

  // Filtered accounts for selects
  const potentialMasters = useMemo(() => accounts.filter(acc => acc.isActive && (acc.role === 'Master' || acc.role === null)), [accounts]);
  const potentialSlaves = useMemo(() => accounts.filter(acc => slaves.includes(acc.accountNumber)), [accounts, slaves]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (masterDropdownRef.current && !masterDropdownRef.current.contains(event.target as Node)) {
        setShowMasterDropdown(false);
      }
      if (slaveDropdownRef.current && !slaveDropdownRef.current.contains(event.target as Node)) {
        setShowSlaveDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Custom styles for react-select based on dark mode
  const customStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: isDarkMode ? '#020617' : '#ffffff',
      color: isDarkMode ? '#e2e8f0' : '#020617',
      borderColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(203,213,225,0.5)',
      '&:hover': {
        borderColor: isDarkMode ? 'rgba(51,65,85,0.7)' : 'rgba(203,213,225,0.7)',
      },
      boxShadow: state.isFocused ? `0 0 0 1px ${isDarkMode ? '#059669' : '#10b981'}` : 'none',
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: isDarkMode ? '#94a3b8' : '#64748b',
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: isDarkMode ? '#e2e8f0' : '#020617',
    }),
    menu: (provided: any) => ({
      ...provided,
      backgroundColor: isDarkMode ? '#020617' : '#ffffff',
      border: `1px solid ${isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(203,213,225,0.5)'}`,
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? (isDarkMode ? '#059669' : '#10b981')
        : (state.isFocused ? (isDarkMode ? '#1e293b' : '#f1f5f9') : 'transparent'),
      color: state.isSelected ? '#ffffff' : (isDarkMode ? '#e2e8f0' : '#020617'),
      '&:active': {
        backgroundColor: isDarkMode ? '#047857' : '#059669',
      },
    }),
  };

  // Fetch accounts and their symbols
  useEffect(() => {
    const fetchAccounts = async () => {
      setLoading(prev => ({ ...prev, accounts: true }));
      try {
        const response = await Request({ method: "GET", url: "trading-accounts" });
        if (response) {
          const sortedAccounts = response?.sort((a: Account, b: Account) => parseInt(a.accountNumber) - parseInt(b.accountNumber));
          setAccounts(sortedAccounts || []);
          const activeAccounts = sortedAccounts.filter((acc: Account) => acc.isActive);
          if (activeAccounts.length > 0) {
            const firstPotentialMaster = activeAccounts.find((acc:any) => acc.role === 'Master' || acc.role === null);
            if (firstPotentialMaster) setSelectedMaster(firstPotentialMaster.accountNumber);
          }
          // Fetch symbols only for active accounts
          const symbolsPromises = activeAccounts.map((acc: Account) =>
            Request({
              method: "GET",
              url: `trade-copier/get-account-symbols?accountNumber=${acc.accountNumber}`,
            }).then((res) => ({ accountNumber: acc.accountNumber, symbols: res.symbols || [] }))
          );
          const symbolsList = await Promise.all(symbolsPromises);
          const newAccountSymbols: Record<string, string[]> = {};
          symbolsList.forEach(({ accountNumber, symbols }) => {
            newAccountSymbols[accountNumber] = symbols;
          });
          setAccountSymbols(newAccountSymbols);
        }
      } catch (error) {
      } finally {
        setLoading(prev => ({ ...prev, accounts: false }));
      }
    };
    fetchAccounts();
  }, []);

  // Fetch slaves for selected master only if it's a master
  const fetchSlavesForMaster = useCallback(async () => {
    if (!selectedMaster) return;
    const masterAccount = accounts.find(acc => acc.accountNumber === selectedMaster);
    if (!masterAccount?.isActive || masterAccount.role !== 'Master') {
      setSlaves([]);
      setSelectedSlave(null);
      return;
    }
    setLoading(prev => ({ ...prev, slaves: true }));
    try {
      const response = await Request({
        method: "GET",
        url: `trade-copier/get-slaves?masterAccount=${selectedMaster}`,
      });
      const fetchedSlaves = response?.slaves || [];
      setSlaves(fetchedSlaves);
      if (fetchedSlaves.length > 0 && !fetchedSlaves.includes(selectedSlave ?? "")) {
        setSelectedSlave(fetchedSlaves[0]);
      } else if (fetchedSlaves.length === 0) {
        setSelectedSlave(null);
      }
    } catch (err: any) {
    } finally {
      setLoading(prev => ({ ...prev, slaves: false }));
    }
  }, [selectedMaster, accounts, selectedSlave]);

  useEffect(() => {
    fetchSlavesForMaster();
  }, [fetchSlavesForMaster]);

  // Fetch configs for all slaves under the selected master
  useEffect(() => {
    if (!selectedMaster || slaves.length === 0) return;
    const masterAccount = accounts.find(acc => acc.accountNumber === selectedMaster);
    if (!masterAccount?.isActive || masterAccount.role !== 'Master') return;
    setLoading(prev => ({ ...prev, configs: true }));
    const fetchConfigs = async () => {
      try {
        const configsPromises = slaves.map((slave) =>
          Request({
            method: "GET",
            url: `trade-copier/get-slave-config?slaveAccount=${slave}&masterAccount=${selectedMaster}`,
          }).then((res) => ({ slave, config: res.config || { paused: false, multiplier: 1.0 } }))
        );
        const configsList = await Promise.all(configsPromises);
        const newConfigs: Record<string, SlaveConfig> = {};
        configsList.forEach(({ slave, config }) => {
          newConfigs[slave] = config;
        });
        setCurrentSlaveConfigs(newConfigs);
      } catch (err: any) {
      } finally {
        setLoading(prev => ({ ...prev, configs: false }));
      }
    };
    fetchConfigs();
  }, [slaves, selectedMaster, accounts]);

  // Fetch symbol map for selected slave only if it's a slave
  const fetchSymbolMap = useCallback(async (slave: string) => {
    if (!slave) return;
    const slaveAccount = accounts.find(acc => acc.accountNumber === slave);
    if (!slaveAccount?.isActive || slaveAccount.role !== 'Slave') {
      setSymbolMaps(prev => ({ ...prev, [slave]: {} }));
      return;
    }
    setLoading(prev => ({ ...prev, symbols: true }));
    try {
      const response = await Request({
        method: "GET",
        url: `trade-copier/get-symbol-map?slaveAccount=${slave}`,
      });
      setSymbolMaps((prev) => ({ ...prev, [slave]: response?.symbolMap || {} }));
    } catch (err: any) {
    } finally {
      setLoading(prev => ({ ...prev, symbols: false }));
    }
  }, [accounts]);

  // Fetch slave logs for selected slave
  const fetchSlaveLogs = useCallback(async (slave: string) => {
    if (!slave) return;
    const slaveAccount = accounts.find(acc => acc.accountNumber === slave);
    if (!slaveAccount?.isActive || slaveAccount.role !== 'Slave') {
      setSlaveLogs(prev => ({ ...prev, [slave]: [] }));
      return;
    }
    setLoading(prev => ({ ...prev, logs: true }));
    try {
      const response = await Request({
        method: "GET",
        url: `trade-copier/get-slave-logs?slaveAccount=${slave}&limit=1000`,
      });
      setSlaveLogs((prev) => ({ ...prev, [slave]: response?.logs || [] }));
    } catch (err: any) {
    } finally {
      setLoading(prev => ({ ...prev, logs: false }));
    }
  }, [accounts]);
  useEffect(() => {
    if (selectedSlave) {
      fetchSymbolMap(selectedSlave);
      fetchSlaveLogs(selectedSlave);
      setLogsCurrentPage(1); // Reset page on slave/master change
    }
  }, [selectedSlave, selectedMaster, fetchSymbolMap, fetchSlaveLogs]);

  /* --------------------------------------------------------------------
     Handlers
  -------------------------------------------------------------------- */
  const handleCreateMaster = async (account: string) => {
    if (!account) return;
    const selectedAccount = accounts.find(acc => acc.accountNumber === account);
    if (!selectedAccount?.isActive || selectedAccount.role !== null) return;
    try {
      await Request({
        method: "POST",
        url: "trade-copier/create-master",
        data: { accountNumber: account },
      });
      // Refresh accounts to update role
      const response = await Request({ method: "GET", url: "trading-accounts" });
      const sortedAccounts = response?.sort((a: Account, b: Account) => parseInt(a.accountNumber) - parseInt(b.accountNumber));
      setAccounts(sortedAccounts || []);
      fetchSlavesForMaster();
    } catch (err: any) {
    }
  };

  const handleRemoveMaster = async (account: string) => {
    if (!account) return;
    try {
      await Request({
        method: "POST",
        url: "trade-copier/remove-master",
        data: { accountNumber: account },
      });
      // Refresh accounts to update role
      const response = await Request({ method: "GET", url: "trading-accounts" });
      const sortedAccounts = response?.sort((a: Account, b: Account) => parseInt(a.accountNumber) - parseInt(b.accountNumber));
      setAccounts(sortedAccounts || []);
      fetchSlavesForMaster();
    } catch (err: any) {
    }
  };

  const handleLinkSlave = async (slaveAccount: string) => {
    if (!selectedMaster || !slaveAccount) return;
    const masterAccount = accounts.find(acc => acc.accountNumber === selectedMaster);
    if (masterAccount?.role !== 'Master') return;
    const slaveToLink = accounts.find(acc => acc.accountNumber === slaveAccount);
    if (!slaveToLink?.isActive || slaveToLink.role !== null) return;
    try {
      await Request({
        method: "POST",
        url: "trade-copier/link-slave",
        data: { masterAccount: selectedMaster, slaveAccount },
      });
      fetchSlavesForMaster();
      // Refresh accounts to update role
      const response = await Request({ method: "GET", url: "trading-accounts" });
      const sortedAccounts = response?.sort((a: Account, b: Account) => parseInt(a.accountNumber) - parseInt(b.accountNumber));
      setAccounts(sortedAccounts || []);
    } catch (err: any) {
    }
  };

  const handleUnlinkSlave = async (slaveAccount: string) => {
    if (!selectedMaster || !slaveAccount) return;
    try {
      await Request({
        method: "POST",
        url: "trade-copier/unlink-slave",
        data: { masterAccount: selectedMaster, slaveAccount },
      });
      fetchSlavesForMaster();
      // Refresh accounts to update role
      const response = await Request({ method: "GET", url: "trading-accounts" });
      const sortedAccounts = response?.sort((a: Account, b: Account) => parseInt(a.accountNumber) - parseInt(b.accountNumber));
      setAccounts(sortedAccounts || []);
    } catch (err: any) {
    }
  };

  const handleSetPaused = async (slaveAccount: string, paused: boolean) => {
    if (!selectedMaster) return;
    try {
      await Request({
        method: "POST",
        url: "trade-copier/set-paused",
        data: { masterAccount: selectedMaster, slaveAccount, paused },
      });
      // Update local config
      setCurrentSlaveConfigs((prev) => ({
        ...prev,
        [slaveAccount]: { ...prev[slaveAccount], paused },
      }));
    } catch (err: any) {
    }
  };

  const handleSetMultiplier = async (slaveAccount: string, multiplier: number) => {
    if (!selectedMaster) return;
    try {
      await Request({
        method: "POST",
        url: "trade-copier/set-multiplier",
        data: { masterAccount: selectedMaster, slaveAccount, multiplier: multiplier ? multiplier : 1 },
      });
      // Update local config
      setCurrentSlaveConfigs((prev) => ({
        ...prev,
        [slaveAccount]: { ...prev[slaveAccount], multiplier },
      }));
    } catch (err: any) {
    }
  };

  const handleSetSymbolMap = async (slaveAccount: string, baseSymbol: string, slaveSymbol: string) => {
    try {
      await Request({
        method: "POST",
        url: "trade-copier/set-symbol-map",
        data: { slaveAccount, baseSymbol, slaveSymbol, masterAccount: selectedMaster || undefined },
      });
      fetchSymbolMap(slaveAccount);
    } catch (err: any) {
    }
  };

  const handleEditSymbolMap = async (slaveAccount: string, baseSymbol: string, slaveSymbol: string) => {
    try {
      await Request({
        method: "POST",
        url: "trade-copier/edit-symbol-map",
        data: { slaveAccount, baseSymbol, slaveSymbol, masterAccount: selectedMaster || undefined },
      });
      fetchSymbolMap(slaveAccount);
    } catch (err: any) {
    }
  };

  const handleDeleteSymbolMap = async (slaveAccount: string, baseSymbol: string) => {
    try {
      await Request({
        method: "POST",
        url: "trade-copier/delete-symbol-map",
        data: { slaveAccount, baseSymbol },
      });
      fetchSymbolMap(slaveAccount);
    } catch (err: any) {
    }
  };

  // Pagination for logs
  const currentLogs = useMemo(() => {
    if (!selectedSlave || !selectedMaster) return [];
    let logs = slaveLogs[selectedSlave] || [];


    logs = logs.filter((log) => log.master_account === selectedMaster);

    const startIndex = (logsCurrentPage - 1) * logsPerPage;
    return logs.slice(startIndex, startIndex + logsPerPage);
  }, [selectedSlave, selectedMaster, slaveLogs, logsCurrentPage]);

  const totalLogsPages = useMemo(() => {
    if (!selectedSlave || !selectedMaster) return 0;
    let logs = slaveLogs[selectedSlave] || [];
    logs = logs.filter((log) => log.master_account === selectedMaster);

    return Math.ceil(logs.length / logsPerPage);
  }, [selectedSlave, selectedMaster, slaveLogs]);

  const handleLogsPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalLogsPages) {
      setLogsCurrentPage(newPage);
    }
  };

  /* --------------------------------------------------------------------
     Render Sections
  -------------------------------------------------------------------- */
  const renderMasterSlaves = () => {
    if (loading.slaves || loading.configs) return (
      <div className="rounded-xl border border-slate-300/50 dark:border-slate-700/50 bg-white/90 dark:bg-slate-950/90 overflow-hidden shadow-lg">
        <div className="p-8 border-b border-slate-300/50 dark:border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
          <SkeletonBox className="h-6 w-64" />
          <div className="flex gap-3">
            <SkeletonBox className="h-9 w-28 rounded-xl" />
            <SkeletonBox className="h-9 w-40 rounded-xl" />
          </div>
        </div>
        <div className="hidden sm:block">
          <SkeletonTable cols={6} rows={5} />
        </div>
        <div className="block sm:hidden">
          <SkeletonMobileSlaves count={3} />
        </div>
      </div>
    );
    const masterAccount = accounts.find(acc => acc.accountNumber === selectedMaster);
    if (!masterAccount) return null;
    if (masterAccount.role === null) {
      return (
        <div className="rounded-xl border border-slate-300/50 dark:border-slate-700/50 bg-white/90 dark:bg-slate-950/90 p-8 text-center shadow-lg">
          <p className="text-xl font-bold text-slate-900 dark:text-white mb-4">This account is not yet a master.</p>
          <PrimaryBtn onClick={() => handleCreateMaster(selectedMaster || "")}>
            Create as Master
          </PrimaryBtn>
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-slate-300/50 dark:border-slate-700/50 bg-white/90 dark:bg-slate-950/90 overflow-hidden shadow-lg">
        <div className="p-8 border-b border-slate-300/50 dark:border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span>Slaves for Master</span>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Image
                src={masterAccount.platform === "MT5" ? mt5 : cTraderIcon}
                alt="Platform"
                width={19}
                height={19}
                className="flex-shrink-0 opacity-90"
              />
              <span className="font-mono text-lg tracking-tight">{selectedMaster}</span>
              <span className="text-slate-500 dark:text-slate-400 text-sm sm:text-base whitespace-nowrap">
                ({masterAccount.balance} {masterAccount.depositCurrency})
              </span>
            </div>
          </h3>
          <div className="flex gap-3">
            <PrimaryBtn onClick={() => setModals((prev) => ({ ...prev, linkSlave: true }))}>
              <IconPlus size={16} className="mr-2 inline" /> Link Slave
            </PrimaryBtn>
            {slaves.length === 0 && (
              <DangerBtn onClick={() => setModals((prev) => ({ ...prev, removeMaster: true }))}>
                <IconTrash size={16} className="mr-2 inline" /> Remove Master Role
              </DangerBtn>
            )}
          </div>
        </div>
        {slaves.length === 0 ? (
          <p className="p-8 text-center text-slate-600 dark:text-slate-400 text-lg">No slaves linked yet.</p>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full table-auto divide-y divide-slate-300/50 dark:divide-slate-700/50">
                <thead className="bg-slate-100/80 dark:bg-slate-800/80">
                  <tr>
                    <th className="px-4 sm:px-8 py-3 sm:py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-200">Slave Account</th>
                    <th className="px-4 sm:px-8 py-3 sm:py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-200">Platform</th>
                    <th className="px-4 sm:px-8 py-3 sm:py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-200">Balance</th>
                    <th className="px-4 sm:px-8 py-3 sm:py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-200">Paused</th>
                    <th className="px-4 sm:px-8 py-3 sm:py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-200">Multiplier</th>
                    <th className="px-4 sm:px-8 py-3 sm:py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-200">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300/50 dark:divide-slate-700/50">
                  {slaves.map((slave) => {
                    const slaveAccount = accounts.find(acc => acc.accountNumber === slave);
                    const config = currentSlaveConfigs[slave] || { paused: false, multiplier: 1.0 };
                    const pendingMultiplier = pendingMultipliers[slave] ?? config.multiplier;
                    return (
                      <tr key={slave} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 sm:px-8 py-4 sm:py-5 text-sm text-slate-900 dark:text-slate-200">{slave}</td>
                        <td className="px-4 sm:px-8 py-4 sm:py-5 text-sm text-slate-900 dark:text-slate-200">  <div className="flex items-center gap-2">
                          <span>{slaveAccount?.platform}</span>
                          <Image
                            src={slaveAccount?.platform === "MT5" ? mt5 : cTraderIcon}
                            alt="Platform"
                            width={20}
                            height={20}
                          />
                        </div></td>
                        <td className="px-4 sm:px-8 py-4 sm:py-5 text-sm text-slate-900 dark:text-slate-200">{slaveAccount?.balance} {slaveAccount?.depositCurrency}</td>
                        <td className="px-4 sm:px-8 py-4 sm:py-5">
                          <PrimaryBtn
                            onClick={() => handleSetPaused(slave, !config.paused)}
                            className={`${config.paused ? "bg-rose-500 hover:bg-rose-600" : "bg-emerald-500 hover:bg-emerald-600"} px-4 py-2 text-sm`}
                          >
                            {config.paused ? <IconPlayerPlay size={16} className="inline mr-2" /> : <IconPlayerPause size={16} className="inline mr-2" />}
                            {config.paused ? "Resume" : "Pause"}
                          </PrimaryBtn>
                        </td>
                        <td className="px-4 sm:px-8 py-4 sm:py-5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                          <FloatingLabelInput
                            className="h-9 mt-4 text-center flex items-center leading-none"
                            type="number"
                            value={pendingMultiplier}
                            onChange={(e:any) => {
                              const raw = e.target.value;

                              // allow empty value while typing
                              if (raw === "") {
                                setPendingMultipliers(prev => ({
                                  ...prev,
                                  [slave]: raw as any,
                                }));
                                return;
                              }

                              const val = Number(raw);

                              if (!isNaN(val)) {
                                setPendingMultipliers(prev => ({
                                  ...prev,
                                  [slave]: val,
                                }));
                              }
                            }}
                            step="0.01"
                            min="0.01"
                            max="100"
                          />

                          <PrimaryBtn
                            onClick={() => {
                              handleSetMultiplier(slave, pendingMultiplier);
                              setPendingMultipliers((prev) => {
                                const newPrev = { ...prev };
                                delete newPrev[slave];
                                return newPrev;
                              });
                            }}
                            disabled={pendingMultiplier === config.multiplier}
                            className="h-9 px-3 mt-0.5"
                          >
                            <IconDeviceFloppy size={16} className="inline" />
                          </PrimaryBtn>
                        </td>
                        <td className="px-4 sm:px-8 py-4 sm:py-5">
                          <DangerBtn
                            onClick={() => {
                              setCurrentModalData((prev) => ({ ...prev, slave }));
                              setModals((prev) => ({ ...prev, unlinkSlave: true }));
                            }}
                          >
                            <IconTrash size={16} className="inline mr-2" /> Unlink
                          </DangerBtn>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Mobile Box View */}
            <div className="block sm:hidden divide-y divide-slate-300/50 dark:divide-slate-700/50">
              {slaves.map((slave) => {
                const slaveAccount = accounts.find(acc => acc.accountNumber === slave);
                const config = currentSlaveConfigs[slave] || { paused: false, multiplier: 1.0 };
                const pendingMultiplier = pendingMultipliers[slave] ?? config.multiplier;
                return (
                  <div
                    key={slave}
                    className="p-4 bg-white/90 dark:bg-slate-950/90 shadow-md rounded-lg m-2 space-y-4"
                  >
                    {/* Header */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs uppercase tracking-wide text-slate-500">
                        Slave Account
                      </span>
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-200">
                        {slave}
                      </span>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-y-3 text-sm">
                      {/* Platform */}
                      <span className="text-slate-500">Platform</span>
                      <div className="flex items-center justify-end gap-2 text-slate-900 dark:text-slate-200">
                        <span>{slaveAccount?.platform}</span>
                        <Image
                          src={slaveAccount?.platform === "MT5" ? mt5 : cTraderIcon}
                          alt="Platform"
                          width={18}
                          height={18}
                        />
                      </div>

                      {/* Balance */}
                      <span className="text-slate-500">Balance</span>
                      <span className="text-right font-medium text-slate-900 dark:text-slate-200">
                        {slaveAccount?.balance} {slaveAccount?.depositCurrency}
                      </span>
                    </div>

                    <hr className="border-slate-200 dark:border-slate-800" />

                    {/* Paused */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-900 dark:text-slate-200">
                        Status
                      </span>
                      <PrimaryBtn
                        onClick={() => handleSetPaused(slave, !config.paused)}
                        className={`${config.paused
                          ? "bg-rose-500 hover:bg-rose-600"
                          : "bg-emerald-500 hover:bg-emerald-600"
                          } px-4 py-2 text-sm`}
                      >
                        {config.paused ? (
                          <IconPlayerPlay size={16} className="inline mr-2" />
                        ) : (
                          <IconPlayerPause size={16} className="inline mr-2" />
                        )}
                        {config.paused ? "Resume" : "Pause"}
                      </PrimaryBtn>
                    </div>

                    {/* Multiplier */}
                    <div className="space-y-2">
                      <span className="text-sm text-slate-900 dark:text-slate-200">
                        Multiplier
                      </span>

                      <div className="flex items-end gap-2">
                        <FloatingLabelInput
                          type="number"
                          className="flex-1 h-9"
                          value={pendingMultiplier}
                          step="0.01"
                          min="0.01"
                          max="100"
                          onChange={(e:any) => {
                            const raw = e.target.value;

                            if (raw === "") {
                              setPendingMultipliers((prev) => ({
                                ...prev,
                                [slave]: raw as any,
                              }));
                              return;
                            }

                            const val = Number(raw);
                            if (!isNaN(val)) {
                              setPendingMultipliers((prev) => ({
                                ...prev,
                                [slave]: val,
                              }));
                            }
                          }}
                        />

                        <PrimaryBtn
                          onClick={() => {
                            handleSetMultiplier(slave, pendingMultiplier);
                            setPendingMultipliers((prev) => {
                              const copy = { ...prev };
                              delete copy[slave];
                              return copy;
                            });
                          }}
                          disabled={pendingMultiplier === config.multiplier}
                          className="h-9 px-3 mb-4 text-center flex items-center leading-none"

                        >
                          <IconDeviceFloppy size={14} />
                        </PrimaryBtn>
                      </div>

                    </div>

                    <hr className="border-slate-200 dark:border-slate-800" />

                    {/* Unlink */}
                    <DangerBtn
                      onClick={() => {
                        setCurrentModalData((prev) => ({ ...prev, slave }));
                        setModals((prev) => ({ ...prev, unlinkSlave: true }));
                      }}
                      className="w-full"
                    >
                      <IconTrash size={16} className="inline mr-2" />
                      Unlink Account
                    </DangerBtn>
                  </div>

                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderSlaveSettings = () => {
    if (!selectedSlave) return (
      <div className="rounded-xl border border-slate-300/50 dark:border-slate-700/50 bg-white/90 dark:bg-slate-950/90 p-8 text-center shadow-lg">
        <p className="text-xl font-bold text-slate-900 dark:text-white">Select a slave account to configure settings.</p>
      </div>
    );
    const slaveAccount = accounts.find(acc => acc.accountNumber === selectedSlave);
    if (!slaveAccount || slaveAccount.role !== 'Slave') return null;
    if (loading.symbols || loading.logs) return (
      <div className="space-y-10">
        <div className="rounded-xl border border-slate-300/50 dark:border-slate-700/50 bg-white/90 dark:bg-slate-950/90 overflow-hidden shadow-lg">
          <div className="p-8 border-b border-slate-300/50 dark:border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
            <SkeletonBox className="h-6 w-72" />
            <SkeletonBox className="h-9 w-32 rounded-xl" />
          </div>
          <div className="hidden sm:block">
            <SkeletonTable cols={3} rows={5} />
          </div>
          <div className="block sm:hidden">
            <SkeletonMobileSymbols count={3} />
          </div>
        </div>
        <div className="rounded-xl border border-slate-300/50 dark:border-slate-700/50 bg-white/90 dark:bg-slate-950/90 overflow-hidden shadow-lg">
          <div className="p-8 border-b border-slate-300/50 dark:border-slate-700/50">
            <SkeletonBox className="h-6 w-64" />
          </div>
          <div className="hidden sm:block">
            <SkeletonTable cols={9} rows={5} />
          </div>
          <div className="block sm:hidden">
            <SkeletonMobileLogs count={3} />
          </div>
          <div className="p-8 flex justify-center items-center gap-2">
            {Array(5).fill(0).map((_, i) => (
              <SkeletonBox key={i} className="h-6 w-10 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
    return (
      <div className="space-y-10">
        <div className="rounded-xl border border-slate-300/50 dark:border-slate-700/50 bg-white/90 dark:bg-slate-950/90 overflow-hidden shadow-lg">
          <div className="p-8 border-b border-slate-300/50 dark:border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span>Symbol Mappings for Slave</span>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Image
                  src={slaveAccount.platform === "MT5" ? mt5 : cTraderIcon}
                  alt="Platform"
                  width={19}
                  height={19}
                  className="flex-shrink-0 opacity-90"
                />
                <span className="font-mono text-lg tracking-tight">{selectedSlave}</span>
                <span className="text-slate-500 dark:text-slate-400 text-sm sm:text-base whitespace-nowrap">
                  ({slaveAccount.balance} {slaveAccount.depositCurrency})
                </span>
              </div>
            </h3>
            <PrimaryBtn onClick={() => setModals((prev) => ({ ...prev, addSymbolMap: true }))}>
              <IconPlus size={16} className="mr-2 inline" /> Add Mapping
            </PrimaryBtn>
          </div>
          {Object.entries(symbolMaps[selectedSlave] || {}).length === 0 ? (
            <p className="p-8 text-center text-slate-600 dark:text-slate-400 text-lg">No symbol mappings yet.</p>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full table-auto divide-y divide-slate-300/50 dark:divide-slate-700/50">
                  <thead className="bg-slate-100/80 dark:bg-slate-800/80">
                    <tr>
                      <th className="px-4 sm:px-8 py-3 sm:py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-200">Master Symbol</th>
                      <th className="px-4 sm:px-8 py-3 sm:py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-200">Slave Symbol</th>
                      <th className="px-4 sm:px-8 py-3 sm:py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-200">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300/50 dark:divide-slate-700/50">
                    {Object.entries(symbolMaps[selectedSlave] || {}).map(([base, slaveSym]) => (
                      <tr key={base} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 sm:px-8 py-4 sm:py-5 text-sm text-slate-900 dark:text-slate-200">{base}</td>
                        <td className="px-4 sm:px-8 py-4 sm:py-5 text-sm text-slate-900 dark:text-slate-200">{slaveSym}</td>
                        <td className="px-4 sm:px-8 py-4 sm:py-5 flex flex-col sm:flex-row gap-3">
                          <PrimaryBtn
                            onClick={() => {
                              setCurrentModalData((prev) => ({ ...prev, baseSymbol: base, slaveSymbol: slaveSym }));
                              setModals((prev) => ({ ...prev, editSymbolMap: true }));
                            }}
                          >
                            <IconEdit size={16} className="inline" />
                          </PrimaryBtn>
                          <DangerBtn onClick={() => handleDeleteSymbolMap(selectedSlave, base)}>
                            <IconTrash size={16} className="inline" />
                          </DangerBtn>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile Box View */}
              <div
                className="
    block sm:hidden
    max-h-[60vh]
    overflow-y-auto
    pr-1
    divide-y divide-slate-300/50 dark:divide-slate-700/50
    scrollbar-thin
    scrollbar-thumb-slate-400/60
    dark:scrollbar-thumb-slate-600/60
    scrollbar-track-transparent
  "
              >
                {Object.entries(symbolMaps[selectedSlave] || {}).map(([base, slaveSym]) => (
                  <div
                    key={base}
                    className="p-4 space-y-4 bg-white/90 dark:bg-slate-950/90 shadow-md rounded-lg m-2"
                  >
                    <div className="font-bold text-sm text-slate-900 dark:text-slate-200">
                      Master Symbol: {base}
                    </div>

                    <div className="text-sm text-slate-900 dark:text-slate-200">
                      Slave Symbol: {slaveSym}
                    </div>

                    <div className="flex justify-end gap-3">
                      <PrimaryBtn
                        onClick={() => {
                          setCurrentModalData((prev) => ({
                            ...prev,
                            baseSymbol: base,
                            slaveSymbol: slaveSym,
                          }));
                          setModals((prev) => ({ ...prev, editSymbolMap: true }));
                        }}
                      >
                        <IconEdit size={16} />
                      </PrimaryBtn>

                      <DangerBtn
                        onClick={() => handleDeleteSymbolMap(selectedSlave, base)}
                      >
                        <IconTrash size={16} />
                      </DangerBtn>
                    </div>
                  </div>
                ))}
              </div>

            </>
          )}
        </div>
        <div className="rounded-xl border border-slate-300/50 dark:border-slate-700/50 bg-white/90 dark:bg-slate-950/90 overflow-hidden shadow-lg">
          <div className="p-8 border-b border-slate-300/50 dark:border-slate-700/50">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-x-3 gap-y-1.5">  <span>Execution Logs for Slave</span>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Image
                  src={slaveAccount.platform === "MT5" ? mt5 : cTraderIcon}
                  alt="Platform"
                  width={19}
                  height={19}
                  className="flex-shrink-0 opacity-90"
                />
                <span className="font-mono text-lg tracking-tight">{selectedSlave}</span>
                <span className="text-slate-500 dark:text-slate-400 text-sm sm:text-base whitespace-nowrap">
                  ({slaveAccount.balance} {slaveAccount.depositCurrency})
                </span>
              </div></h3>
          </div>
          {currentLogs.length === 0 ? (
            <p className="p-8 text-center text-slate-600 dark:text-slate-400 text-lg">No execution logs available.</p>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full table-auto divide-y divide-slate-300/50 dark:divide-slate-700/50">
                  <thead className="bg-slate-100/80 dark:bg-slate-800/80">
                    <tr>
                      <th className="px-4 sm:px-8 py-3 sm:py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-200">Timestamp</th>
                      <th className="px-4 sm:px-8 py-3 sm:py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-200">Symbol</th>
                      <th className="px-4 sm:px-8 py-3 sm:py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-200">Order Type</th>
                      <th className="px-4 sm:px-8 py-3 sm:py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-200">Trade Setup</th>
                      <th className="px-4 sm:px-8 py-3 sm:py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-200">Status</th>
                      <th className="px-4 sm:px-8 py-3 sm:py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-200">Master Account</th>
                      <th className="px-4 sm:px-8 py-3 sm:py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-200">Master Trade ID</th>
                      <th className="px-4 sm:px-8 py-3 sm:py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-200">Slave Trade ID</th>
                      <th className="px-4 sm:px-8 py-3 sm:py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-200">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300/50 dark:divide-slate-700/50">
                    {currentLogs.map((log, index) => (
                      <tr key={index} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 sm:px-8 py-4 sm:py-5 text-sm text-slate-900 dark:text-slate-200">
                          {formatToLocalTime(log.timestamp)}
                        </td>
                        <td className="px-4 sm:px-8 py-4 sm:py-5 text-sm text-slate-900 dark:text-slate-200">{log.symbol}</td>
                        <td className="px-4 sm:px-8 py-4 sm:py-5 text-sm text-slate-900 dark:text-slate-200">{log.order_type}</td>
                        <td className="px-4 sm:px-8 py-4 sm:py-5 text-sm text-slate-900 dark:text-slate-200">{log.trade_setup || 'N/A'}</td>
                        <td className="px-4 sm:px-8 py-4 sm:py-5 text-sm text-slate-900 dark:text-slate-200">{log.status}</td>
                        <td className="px-4 sm:px-8 py-4 sm:py-5 text-sm text-slate-900 dark:text-slate-200">{log.master_account}</td>
                        <td className="px-4 sm:px-8 py-4 sm:py-5 text-sm text-slate-900 dark:text-slate-200">{log.master_trade_id}</td>
                        <td className="px-4 sm:px-8 py-4 sm:py-5 text-sm text-slate-900 dark:text-slate-200">{log.slave_trade_id || 'N/A'}</td>
                        <td className="px-4 sm:px-8 py-4 sm:py-5 text-sm text-slate-900 dark:text-slate-200">{log.reason || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile Box View */}
              <div className="block sm:hidden divide-y divide-slate-300/50 dark:divide-slate-700/50">
                {currentLogs.map((log, index) => (
                  <div key={index} className="p-4 space-y-2 bg-white/90 dark:bg-slate-950/90 shadow-md rounded-lg m-2">
                    <div className="text-sm text-slate-900 dark:text-slate-200">
                      <span className="font-bold">Timestamp:</span> {formatToLocalTime(log.timestamp)}
                    </div>
                    <div className="text-sm text-slate-900 dark:text-slate-200"><span className="font-bold">Symbol:</span> {log.symbol}</div>
                    <div className="text-sm text-slate-900 dark:text-slate-200"><span className="font-bold">Order Type:</span> {log.order_type}</div>
                    <div className="text-sm text-slate-900 dark:text-slate-200"><span className="font-bold">Trade Setup:</span> {log.trade_setup || 'N/A'}</div>
                    <div className="text-sm text-slate-900 dark:text-slate-200"><span className="font-bold">Status:</span> {log.status}</div>
                    <div className="text-sm text-slate-900 dark:text-slate-200"><span className="font-bold">Master Account:</span> {log.master_account}</div>
                    <div className="text-sm text-slate-900 dark:text-slate-200"><span className="font-bold">Master Trade ID:</span> {log.master_trade_id}</div>
                    <div className="text-sm text-slate-900 dark:text-slate-200"><span className="font-bold">Slave Trade ID:</span> {log.slave_trade_id || 'N/A'}</div>
                    <div className="text-sm text-slate-900 dark:text-slate-200"><span className="font-bold">Reason:</span> {log.reason || 'N/A'}</div>
                  </div>
                ))}
              </div>
              <div className="p-8 flex justify-center items-center gap-2">
                <PaginationBtn onClick={() => handleLogsPageChange(1)} disabled={logsCurrentPage === 1}>
                  <IconChevronsLeft size={14} />
                </PaginationBtn>
                <PaginationBtn onClick={() => handleLogsPageChange(logsCurrentPage - 1)} disabled={logsCurrentPage === 1}>
                  <IconChevronLeft size={14} />
                </PaginationBtn>
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  Page {logsCurrentPage} of {totalLogsPages}
                </span>
                <PaginationBtn onClick={() => handleLogsPageChange(logsCurrentPage + 1)} disabled={logsCurrentPage === totalLogsPages}>
                  <IconChevronRight size={14} />
                </PaginationBtn>
                <PaginationBtn onClick={() => handleLogsPageChange(totalLogsPages)} disabled={logsCurrentPage === totalLogsPages}>
                  <IconChevronsRight size={14} />
                </PaginationBtn>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  /* --------------------------------------------------------------------
     Modals
  -------------------------------------------------------------------- */









  if (loading.accounts) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-emerald-100 dark:from-slate-950 dark:to-emerald-950 text-slate-900 dark:text-slate-200">
        <div className="container overflow-x-hidden mx-auto px-4 sm:px-6 py-16">
          <SkeletonBox className="h-6 w-48 mb-8" />
          <section className="mb-16">
            <SkeletonBox className="h-8 w-64 mb-8" />
            <div className="flex items-center gap-6 mb-8">
              <div className="w-48">
                <SkeletonBox className="h-10 w-full rounded" />
              </div>
            </div>
            <div className="rounded-xl border border-slate-300/50 dark:border-slate-700/50 bg-white/90 dark:bg-slate-950/90 overflow-hidden shadow-lg">
              <div className="p-8 border-b border-slate-300/50 dark:border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
                <SkeletonBox className="h-6 w-64" />
                <div className="flex gap-3">
                  <SkeletonBox className="h-9 w-28 rounded-xl" />
                  <SkeletonBox className="h-9 w-40 rounded-xl" />
                </div>
              </div>
              <div className="overflow-x-auto overflow-y-hidden">
                <SkeletonTable cols={6} rows={5} />
              </div>
              <div className="block sm:hidden">
                <SkeletonMobileSlaves count={3} />
              </div>
            </div>
          </section>
          <section>
            <SkeletonBox className="h-8 w-64 mb-8" />
            <div className="flex items-center gap-6 mb-8">
              <div className="w-48">
                <SkeletonBox className="h-10 w-full rounded" />
              </div>
            </div>
            <div className="space-y-10">
              <div className="rounded-xl border border-slate-300/50 dark:border-slate-700/50 bg-white/90 dark:bg-slate-950/90 overflow-hidden shadow-lg">
                <div className="p-8 border-b border-slate-300/50 dark:border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
                  <SkeletonBox className="h-6 w-72" />
                  <SkeletonBox className="h-9 w-32 rounded-xl" />
                </div>
                <div className="hidden sm:block">
                  <SkeletonTable cols={3} rows={5} />
                </div>
                <div className="block sm:hidden">
                  <SkeletonMobileSymbols count={3} />
                </div>
              </div>
              <div className="rounded-xl border border-slate-300/50 dark:border-slate-700/50 bg-white/90 dark:bg-slate-950/90 overflow-hidden shadow-lg">
                <div className="p-8 border-b border-slate-300/50 dark:border-slate-700/50">
                  <SkeletonBox className="h-6 w-64" />
                </div>
                <div className="hidden sm:block">
                  <SkeletonTable cols={9} rows={5} />
                </div>
                <div className="block sm:hidden">
                  <SkeletonMobileLogs count={3} />
                </div>
                <div className="p-8 flex justify-center items-center gap-2">
                  {Array(5).fill(0).map((_, i) => (
                    <SkeletonBox key={i} className="h-6 w-10 rounded-lg" />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (

    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-emerald-100 dark:from-slate-950 dark:to-emerald-950 text-slate-900 dark:text-slate-200">
      <div className="container mx-auto px-4 sm:px-6 py-16">
        <PageBreadcrumb pageTitle="Copy Trade Manager" />
        {/* Master Management Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-extrabold mb-8">Master Account Management</h2>
          <div className="flex items-center gap-6 mb-8">
            <div className="w-full max-w-sm">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Select Master Account
              </label>
              <div ref={masterDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowMasterDropdown(!showMasterDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:border-emerald-400 focus:border-emerald-500 transition-all"
                >
                  {selectedMaster ? (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl">
                        <Image
                          src={
                            accounts.find(a => a.accountNumber === selectedMaster)?.platform === "MT5"
                              ? mt5
                              : cTraderIcon
                          }
                          alt="Platform"
                          width={26}
                          height={26}
                          className="object-contain"
                        />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white text-left">
                          {selectedMaster}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 text-left">
                          {accounts.find(a => a.accountNumber === selectedMaster)?.server} •{" "}
                          {accounts.find(a => a.accountNumber === selectedMaster)?.balance}{" "}
                          {accounts.find(a => a.accountNumber === selectedMaster)?.depositCurrency}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-500">Select Master Account</span>
                  )}
                  <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 text-slate-400 transition-transform ${showMasterDropdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <AnimatePresence>
                  {showMasterDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute z-50 mt-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[340px] overflow-y-auto"
                    >
                      {potentialMasters.map((acc) => (
                        <button
                          key={acc.accountNumber}
                          onClick={() => {
                            setSelectedMaster(acc.accountNumber);
                            setShowMasterDropdown(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${selectedMaster === acc.accountNumber ? "bg-emerald-50 dark:bg-emerald-950/50" : ""}`}
                        >
                          <div className="w-9 h-9 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl">
                            <Image
                              src={acc.platform === "MT5" ? mt5 : cTraderIcon}
                              alt={acc.platform}
                              width={28}
                              height={28}
                              className="object-contain"
                            />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-medium text-slate-900 dark:text-white">
                              {acc.accountNumber}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {acc.server} • {acc.balance || "0"} {acc.depositCurrency}
                            </div>
                          </div>
                          {selectedMaster === acc.accountNumber && (
                            <div className="ml-auto w-2 h-2 bg-emerald-500 rounded-full"></div>
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          {selectedMaster && renderMasterSlaves()}
        </section>
        {/* Slave Settings Section */}
        {potentialSlaves.length > 0 && <section>
          <h2 className="text-3xl font-extrabold mb-8">Slave Account Settings</h2>
          <div className="flex items-center gap-6 mb-8">
            <div className="w-full max-w-sm">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Select Slave Account
              </label>

              <div ref={slaveDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowSlaveDropdown(!showSlaveDropdown)}
                  disabled={!selectedMaster || slaves.length === 0 || loading.slaves}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all
                  ${!selectedMaster || slaves.length === 0
                      ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed"
                      : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 hover:border-emerald-400 focus:border-emerald-500"
                    }`}
                >
                  {selectedSlave ? (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl">
                        <Image
                          src={
                            accounts.find(a => a.accountNumber === selectedSlave)?.platform === "MT5"
                              ? mt5
                              : cTraderIcon
                          }
                          alt="Platform"
                          width={26}
                          height={26}
                          className="object-contain"
                        />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white text-left">
                          {selectedSlave}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {accounts.find(a => a.accountNumber === selectedSlave)?.server} •{" "}
                          {accounts.find(a => a.accountNumber === selectedSlave)?.balance}{" "}
                          {accounts.find(a => a.accountNumber === selectedSlave)?.depositCurrency}

                          
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-500">Select Slave Account</span>
                  )}

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`w-5 h-5 text-slate-400 transition-transform ${showSlaveDropdown ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <AnimatePresence>
                  {showSlaveDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute z-50 mt-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[340px] overflow-y-auto"
                    >
                      {potentialSlaves.length === 0 ? (
                        <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
                          No available slave accounts
                        </div>
                      ) : (
                        potentialSlaves.map((acc) => (
                          <button
                            key={acc.accountNumber}
                            onClick={() => {
                              setSelectedSlave(acc.accountNumber);
                              setShowSlaveDropdown(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${selectedSlave === acc.accountNumber ? "bg-emerald-50 dark:bg-emerald-950/50" : ""}`}
                          >
                            <div className="w-9 h-9 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl">
                              <Image
                                src={acc.platform === "MT5" ? mt5 : cTraderIcon}
                                alt={acc.platform}
                                width={28}
                                height={28}
                                className="object-contain"
                              />
                            </div>
                            <div className="flex-1 text-left">
                              <div className="font-medium text-slate-900 dark:text-white">
                                {acc.accountNumber}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                               {acc.server} • {acc.balance || "0"} {acc.depositCurrency}
                              </div>
                            </div>
                            {selectedSlave === acc.accountNumber && (
                              <div className="ml-auto w-2 h-2 bg-emerald-500 rounded-full"></div>
                            )}
                          </button>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          {renderSlaveSettings()}
        </section>}
        {/* Modals */}
        {modals.linkSlave && (
          <ModalWrapper
            isOpen
            onClose={() => setModals((prev) => ({ ...prev, linkSlave: false }))}
          >
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 flex-wrap">
              <span>Link Slave to Master</span>
              <div className="flex items-center gap-2">
                <Image
                  src={
                    accounts.find(a => a.accountNumber === selectedMaster)?.platform === "MT5"
                      ? mt5
                      : cTraderIcon
                  }
                  alt="Platform"
                  width={20}
                  height={20}
                  className="flex-shrink-0 opacity-90"
                />
                <span className="text-base font-mono text-gray-600 dark:text-blue-400">
                  {selectedMaster}
                </span>
              </div>
            </h3>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Select Slave Account to Link
              </label>

              <div ref={linkSlaveDropdownRef} className="relative">
                {/* Trigger Button */}
                <button
                  type="button"
                  onClick={() => setShowLinkSlaveDropdown(!showLinkSlaveDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:border-emerald-400 focus:border-emerald-500 transition-all"
                >
                  {currentModalData.slave ? (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl">
                        <Image
                          src={
                            accounts.find(a => a.accountNumber === currentModalData.slave)?.platform === "MT5"
                              ? mt5
                              : cTraderIcon
                          }
                          alt="Platform"
                          width={26}
                          height={26}
                          className="object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white truncate text-left">
                          {currentModalData.slave}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate text-left">
                          {accounts.find(a => a.accountNumber === currentModalData.slave)?.server} •{" "}
                          {accounts.find(a => a.accountNumber === currentModalData.slave)?.balance || "0"}{" "}
                          {accounts.find(a => a.accountNumber === currentModalData.slave)?.depositCurrency}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-500">Select available slave account</span>
                  )}

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${showLinkSlaveDropdown ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {showLinkSlaveDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute z-50 mt-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[340px] overflow-y-auto"
                    >
                      {accounts.filter(
                        (acc) =>
                          acc.accountNumber !== selectedMaster &&
                          !slaves.includes(acc.accountNumber) &&
                          acc.isActive &&
                          acc.role === null
                      ).length === 0 ? (
                        <div className="p-5 text-center text-sm text-slate-500 dark:text-slate-400">
                          No available slave accounts to link
                        </div>
                      ) : (
                        accounts
                          .filter(
                            (acc) =>
                              acc.accountNumber !== selectedMaster &&
                              !slaves.includes(acc.accountNumber) &&
                              acc.isActive &&
                              acc.role === null
                          )
                          .map((acc) => (
                            <button
                              key={acc.accountNumber}
                              type="button"
                              onClick={() => {
                                setCurrentModalData((prev) => ({ ...prev, slave: acc.accountNumber }));
                                setShowLinkSlaveDropdown(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors
                        ${currentModalData.slave === acc.accountNumber ? "bg-emerald-50 dark:bg-emerald-950/40" : ""}
                      `}
                            >
                              <div className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl flex-shrink-0">
                                <Image
                                  src={acc.platform === "MT5" ? mt5 : cTraderIcon}
                                  alt={acc.platform}
                                  width={28}
                                  height={28}
                                  className="object-contain"
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className={`font-medium truncate ${currentModalData.slave === acc.accountNumber ? "text-emerald-700 dark:text-emerald-400" : "text-slate-900 dark:text-white"}`}>
                                  {acc.accountNumber}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                  {acc.server} • {acc.balance || "0"} {acc.depositCurrency}
                                </div>
                              </div>

                              {currentModalData.slave === acc.accountNumber && (
                                <div className="ml-auto">
                                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                                </div>
                              )}
                            </button>
                          ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <MutedBtn
                onClick={() => {
                  setModals((prev) => ({ ...prev, linkSlave: false }));
                  setCurrentModalData((prev) => ({ ...prev, slave: "" }));
                }}
              >
                Cancel
              </MutedBtn>
              <PrimaryBtn
                onClick={() => {
                  handleLinkSlave(currentModalData.slave);
                  setModals((prev) => ({ ...prev, linkSlave: false }));
                  setCurrentModalData((prev) => ({ ...prev, slave: "" }));
                }}
                disabled={!currentModalData.slave}
              >
                Link
              </PrimaryBtn>
            </div>
          </ModalWrapper>
        )}
        {modals.unlinkSlave && <ModalWrapper isOpen={modals.unlinkSlave} onClose={() => setModals((prev) => ({ ...prev, unlinkSlave: false }))}>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Confirm Unlink</h3>
          <p className="mb-6 text-lg text-slate-900 dark:text-slate-200">Are you sure you want to unlink slave {currentModalData.slave} from master {selectedMaster}?</p>
          <div className="flex justify-end gap-3">
            <MutedBtn onClick={() => setModals((prev) => ({ ...prev, unlinkSlave: false }))}>Cancel</MutedBtn>
            <DangerBtn
              onClick={() => {
                handleUnlinkSlave(currentModalData.slave);
                setModals((prev) => ({ ...prev, unlinkSlave: false }));
                setCurrentModalData((prev) => ({ ...prev, slave: "" }));
              }}
            >
              Unlink
            </DangerBtn>
          </div>
        </ModalWrapper>}
        {modals.removeMaster && <ModalWrapper isOpen={modals.removeMaster} onClose={() => setModals((prev) => ({ ...prev, removeMaster: false }))}>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Confirm Remove Master Role</h3>
          <p className="mb-6 text-lg text-slate-900 dark:text-slate-200">Are you sure you want to remove the master role from account {selectedMaster}?</p>
          <div className="flex justify-end gap-3">
            <MutedBtn onClick={() => setModals((prev) => ({ ...prev, removeMaster: false }))}>Cancel</MutedBtn>
            <DangerBtn
              onClick={() => {
                if (selectedMaster) {
                  handleRemoveMaster(selectedMaster);
                }
                setModals((prev) => ({ ...prev, removeMaster: false }));
              }}
            >
              Remove
            </DangerBtn>
          </div>
        </ModalWrapper>}
        {modals.addSymbolMap && <ModalWrapper isOpen={modals.addSymbolMap} onClose={() => setModals((prev) => ({ ...prev, addSymbolMap: false }))}>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Add Symbol Mapping</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">Master Symbol</label>
            <Select
              value={currentModalData.baseSymbol ? { value: currentModalData.baseSymbol, label: currentModalData.baseSymbol } : null}
              onChange={(option) => setCurrentModalData((prev) => ({ ...prev, baseSymbol: option?.value || "" }))}
              options={masterSymbols.map((sym) => ({ value: sym, label: sym }))}
              isSearchable={true}
              placeholder="Select Master Symbol"
              classNamePrefix="react-select"
              styles={customStyles}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">Slave Symbol</label>
            <Select
              value={currentModalData.slaveSymbol ? { value: currentModalData.slaveSymbol, label: currentModalData.slaveSymbol } : null}
              onChange={(option) => setCurrentModalData((prev) => ({ ...prev, slaveSymbol: option?.value || "" }))}
              options={slaveSymbols.map((sym) => ({ value: sym, label: sym }))}
              isSearchable={true}
              placeholder="Select Slave Symbol"
              classNamePrefix="react-select"
              styles={customStyles}
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <MutedBtn onClick={() => setModals((prev) => ({ ...prev, addSymbolMap: false }))}>Cancel</MutedBtn>
            <PrimaryBtn
              onClick={() => {
                if (selectedSlave && currentModalData.baseSymbol && currentModalData.slaveSymbol) {
                  handleSetSymbolMap(selectedSlave, currentModalData.baseSymbol, currentModalData.slaveSymbol);
                  setModals((prev) => ({ ...prev, addSymbolMap: false }));
                  setCurrentModalData((prev) => ({ ...prev, baseSymbol: "", slaveSymbol: "" }));
                }
              }}
              disabled={!currentModalData.baseSymbol || !currentModalData.slaveSymbol}
            >
              Add
            </PrimaryBtn>
          </div>
        </ModalWrapper>}
        {modals.editSymbolMap && <ModalWrapper isOpen={modals.editSymbolMap} onClose={() => setModals((prev) => ({ ...prev, editSymbolMap: false }))}>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Edit Symbol Mapping</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">Master Symbol</label>
            <Select
              value={currentModalData.baseSymbol ? { value: currentModalData.baseSymbol, label: currentModalData.baseSymbol } : null}
              onChange={(option) => setCurrentModalData((prev) => ({ ...prev, baseSymbol: option?.value || "" }))}
              options={masterSymbols.map((sym) => ({ value: sym, label: sym }))}
              isSearchable={true}
              placeholder="Select Master Symbol"
              classNamePrefix="react-select"
              styles={customStyles}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">Slave Symbol</label>
            <Select
              value={currentModalData.slaveSymbol ? { value: currentModalData.slaveSymbol, label: currentModalData.slaveSymbol } : null}
              onChange={(option) => setCurrentModalData((prev) => ({ ...prev, slaveSymbol: option?.value || "" }))}
              options={slaveSymbols.map((sym) => ({ value: sym, label: sym }))}
              isSearchable={true}
              placeholder="Select Slave Symbol"
              classNamePrefix="react-select"
              styles={customStyles}
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <MutedBtn onClick={() => setModals((prev) => ({ ...prev, editSymbolMap: false }))}>Cancel</MutedBtn>
            <PrimaryBtn
              onClick={() => {
                if (selectedSlave && currentModalData.baseSymbol && currentModalData.slaveSymbol) {
                  handleEditSymbolMap(selectedSlave, currentModalData.baseSymbol, currentModalData.slaveSymbol);
                  setModals((prev) => ({ ...prev, editSymbolMap: false }));
                  setCurrentModalData((prev) => ({ ...prev, baseSymbol: "", slaveSymbol: "" }));
                }
              }}
              disabled={!currentModalData.baseSymbol || !currentModalData.slaveSymbol}
            >
              Save
            </PrimaryBtn>
          </div>
        </ModalWrapper>}
      </div>
    </div>
  );
}