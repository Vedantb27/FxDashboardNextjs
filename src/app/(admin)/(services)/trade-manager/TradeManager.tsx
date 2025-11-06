"use client";

import React, { useState, useRef, useEffect } from "react";
import PageBreadcrumb from "../../../../components/common/PageBreadCrumb";
import Request from "../../../../utils/request";
import { AUTH_STORAGE_KEY } from "../../../../utils/envConfig"; // Adjust path as needed
import { toast } from "react-toastify";
import Image from "next/image";
import mt5 from '../../../../icons/mt5.png'; // Adjust path as needed
import cTraderIcon from '../../../../icons/ctrader.png'; // Adjust path as needed

interface SpotAdd {
  entry_price: number;
  stoploss: number;
  take_profit?: number;
  risk_percentage: number;
  order_id?: string | null;
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
  // Add more as needed
}

interface Account {
  accountNumber: number;
  server: string;
  platform: "MT5" | "cTrader";
  createdAt: string;
  balance?: number; // Added based on usage in fetch
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
                    {[...Array(6)].map((_, i) => (
                      <th key={i} className="px-6 py-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-900">
                  {[...Array(3)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(6)].map((_, j) => (
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



const AddPendingModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<TradeData>) => void;
  loading: boolean;
}> = ({ isOpen, onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState<Partial<TradeData>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.symbol || !formData.trade_setup || !formData.price || !formData.stopLoss || !formData.risk_percentage || !formData.order_type) {
      toast.error('Please fill all required fields');
      return;
    }
    if (formData.risk_percentage && (formData.risk_percentage < 0 || formData.risk_percentage > 100)) {
      toast.error('Risk percentage must be between 0 and 100');
      return;
    }
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0  bg-opacity-20 backdrop-blur-sm bg-transparent flex items-center justify-center z-0">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Add Pending Order</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Symbol *"
            value={formData.symbol || ''}
            onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
            className="w-full p-2 mb-2 border rounded dark:bg-gray-700"
            required
          />
          <select
            value={formData.trade_setup || ''}
            onChange={(e) => setFormData({ ...formData, trade_setup: e.target.value })}
            className="w-full p-2 mb-2 border rounded dark:bg-gray-700"
            required
          >
            <option value="">Trade Setup *</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
          <input
            type="number"
            placeholder="Price *"
            value={formData.price || ''}
            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
            className="w-full p-2 mb-2 border rounded dark:bg-gray-700"
            required
          />
          <input
            type="number"
            placeholder="Stop Loss *"
            value={formData.stopLoss || ''}
            onChange={(e) => setFormData({ ...formData, stopLoss: parseFloat(e.target.value) || 0 })}
            className="w-full p-2 mb-2 border rounded dark:bg-gray-700"
            required
          />
          <input
            type="number"
            placeholder="Take Profit"
            value={formData.takeProfit || ''}
            onChange={(e) => setFormData({ ...formData, takeProfit: parseFloat(e.target.value) || 0 })}
            className="w-full p-2 mb-2 border rounded dark:bg-gray-700"
          />
          <input
            type="number"
            placeholder="Risk Percentage *"
            value={formData.risk_percentage || ''}
            onChange={(e) => setFormData({ ...formData, risk_percentage: parseFloat(e.target.value) || 0 })}
            className="w-full p-2 mb-2 border rounded dark:bg-gray-700"
            required
            min="0"
            max="100"
          />
          <select
            value={formData.order_type || ''}
            onChange={(e) => setFormData({ ...formData, order_type: e.target.value })}
            className="w-full p-2 mb-2 border rounded dark:bg-gray-700"
            required
          >
            <option value="">Order Type *</option>
            <option value="limit">Limit</option>
            <option value="stop">Stop</option>
          </select>
          <input
            type="datetime-local"
            placeholder="Start Time"
            value={formData.start_time || ''}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            className="w-full p-2 mb-2 border rounded dark:bg-gray-700"
          />
          <input
            type="number"
            placeholder="Removal Price"
            value={formData.removalPrice || ''}
            onChange={(e) => setFormData({ ...formData, removalPrice: parseFloat(e.target.value) || 0 })}
            className="w-full p-2 mb-4 border rounded dark:bg-gray-700"
          />
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Similar modals for other actions...
const UpdatePendingModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<TradeData>) => void;
  loading: boolean;
  initialData?: Partial<TradeData>;
}> = ({ isOpen, onClose, onSubmit, loading, initialData }) => {
  const [formData, setFormData] = useState<Partial<TradeData>>(initialData || {});

  useEffect(() => {
    setFormData(initialData || {});
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.symbol || !formData.trade_setup || !formData.price || !formData.stopLoss || !formData.risk_percentage || !formData.order_type) {
      toast.error('Please fill all required fields');
      return;
    }
    if (formData.risk_percentage && (formData.risk_percentage < 0 || formData.risk_percentage > 100)) {
      toast.error('Risk percentage must be between 0 and 100');
      return;
    }
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0  bg-opacity-20 backdrop-blur-sm bg-transparent flex items-center justify-center z-0">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Update Pending Order</h3>
        <form onSubmit={handleSubmit}>
          {/* Same fields as AddPending, but prefilled, no spot_adds */}
          <input
            type="text"
            placeholder="Symbol *"
            value={formData.symbol || ''}
            onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
            className="w-full p-2 mb-2 border rounded dark:bg-gray-700"
            required
          />
          {/* ... other inputs similar to AddPending ... */}
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddSpotModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { entry_price: number; stoploss: number; take_profit?: number; risk_percentage: number }) => void;
  loading: boolean;
  isPending?: boolean;
}> = ({ isOpen, onClose, onSubmit, loading, isPending = true }) => {
  const [formData, setFormData] = useState({ entry_price: 0, stoploss: 0, take_profit: 0, risk_percentage: 1 });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.entry_price <= 0 || formData.stoploss <= 0 || formData.risk_percentage <= 0 || formData.risk_percentage > 100) {
      toast.error('Valid positive entry_price, stoploss, and risk_percentage (0-100) required');
      return;
    }
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0  bg-opacity-20 backdrop-blur-sm bg-transparent flex items-center justify-center z-0">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">{isPending ? 'Add Spot to Pending' : 'Add Spot to Running'}</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="number"
            placeholder="Entry Price *"
            value={formData.entry_price}
            onChange={(e) => setFormData({ ...formData, entry_price: parseFloat(e.target.value) || 0 })}
            className="w-full p-2 mb-2 border rounded dark:bg-gray-700"
            required
            min="0"
          />
          <input
            type="number"
            placeholder="Stop Loss *"
            value={formData.stoploss}
            onChange={(e) => setFormData({ ...formData, stoploss: parseFloat(e.target.value) || 0 })}
            className="w-full p-2 mb-2 border rounded dark:bg-gray-700"
            required
            min="0"
          />
          <input
            type="number"
            placeholder="Take Profit"
            value={formData.take_profit}
            onChange={(e) => setFormData({ ...formData, take_profit: parseFloat(e.target.value) || 0 })}
            className="w-full p-2 mb-2 border rounded dark:bg-gray-700"
            min="0"
          />
          <input
            type="number"
            placeholder="Risk Percentage *"
            value={formData.risk_percentage}
            onChange={(e) => setFormData({ ...formData, risk_percentage: parseFloat(e.target.value) || 0 })}
            className="w-full p-2 mb-4 border rounded dark:bg-gray-700"
            required
            min="0"
            max="100"
          />
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Spot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add more modals for UpdateSpot, UpdateSlTpBe, UpdatePartialClose, SetVolumeClose, QueueDeleteConfirm, AddRunning...

const UpdateSpotModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SpotAdd) => void;
  loading: boolean;
  initialData?: SpotAdd;
}> = ({ isOpen, onClose, onSubmit, loading, initialData }) => {
  const [formData, setFormData] = useState<SpotAdd>(initialData || { entry_price: 0, stoploss: 0, risk_percentage: 1 });

  useEffect(() => {
    setFormData(initialData || { entry_price: 0, stoploss: 0, risk_percentage: 1 });
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.entry_price <= 0 || formData.stoploss <= 0 || formData.risk_percentage <= 0 || formData.risk_percentage > 100) {
      toast.error('Valid positive entry_price, stoploss, and risk_percentage (0-100) required');
      return;
    }
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0  bg-opacity-20 backdrop-blur-sm bg-transparent flex items-center justify-center z-0">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Update Spot Add</h3>
        <form onSubmit={handleSubmit}>
          {/* Same fields as AddSpot, prefilled */}
          <input
            type="number"
            placeholder="Entry Price *"
            value={formData.entry_price}
            onChange={(e) => setFormData({ ...formData, entry_price: parseFloat(e.target.value) || 0 })}
            className="w-full p-2 mb-2 border rounded dark:bg-gray-700"
            required
            min="0"
          />
          {/* ... other inputs ... */}
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UpdateSlTpBeModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { slToUpdate?: number; tpToUpdate?: number; breakevenPrice?: number }) => void;
  loading: boolean;
}> = ({ isOpen, onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState({ slToUpdate: 0, tpToUpdate: 0, breakevenPrice: 0 });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = {};
    if (formData.slToUpdate !== 0) data.slToUpdate = formData.slToUpdate;
    if (formData.tpToUpdate !== 0) data.tpToUpdate = formData.tpToUpdate;
    if (formData.breakevenPrice !== 0) data.breakevenPrice = formData.breakevenPrice;
    if (Object.keys(data).length === 0) {
      toast.error('Provide at least one update value');
      return;
    }
    onSubmit(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0  bg-opacity-20 backdrop-blur-sm bg-transparent flex items-center justify-center z-0">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Update SL/TP/Breakeven</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="number"
            placeholder="SL to Update (0 to skip)"
            value={formData.slToUpdate}
            onChange={(e) => setFormData({ ...formData, slToUpdate: parseFloat(e.target.value) || 0 })}
            className="w-full p-2 mb-2 border rounded dark:bg-gray-700"
          />
          <input
            type="number"
            placeholder="TP to Update (0 to skip)"
            value={formData.tpToUpdate}
            onChange={(e) => setFormData({ ...formData, tpToUpdate: parseFloat(e.target.value) || 0 })}
            className="w-full p-2 mb-2 border rounded dark:bg-gray-700"
          />
          <input
            type="number"
            placeholder="Breakeven Price (0 to skip)"
            value={formData.breakevenPrice}
            onChange={(e) => setFormData({ ...formData, breakevenPrice: parseFloat(e.target.value) || 0 })}
            className="w-full p-2 mb-4 border rounded dark:bg-gray-700"
          />
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded" disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50">
              {loading ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ... Implement similar modals for UpdatePartialClose, SetVolumeClose, AddRunning, QueueDeleteConfirm

const UpdatePartialCloseModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { partialClosePrice?: number; lotToClose?: number }) => void;
  loading: boolean;
}> = ({ isOpen, onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState({ partialClosePrice: 0, lotToClose: 0 });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = {};
    if (formData.partialClosePrice !== 0) data.partialClosePrice = formData.partialClosePrice;
    if (formData.lotToClose > 0) data.lotToClose = formData.lotToClose;
    if (Object.keys(data).length === 0) {
      toast.error('Provide at least one update value');
      return;
    }
    // Client validation for lotToClose > 0 already in state
    onSubmit(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0  bg-opacity-20 backdrop-blur-sm bg-transparent flex items-center justify-center z-0">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Update Partial Close</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="number"
            placeholder="Partial Close Price (0 to skip)"
            value={formData.partialClosePrice}
            onChange={(e) => setFormData({ ...formData, partialClosePrice: parseFloat(e.target.value) || 0 })}
            className="w-full p-2 mb-2 border rounded dark:bg-gray-700"
          />
          <input
            type="number"
            placeholder="Lot to Close (>0)"
            value={formData.lotToClose}
            onChange={(e) => setFormData({ ...formData, lotToClose: parseFloat(e.target.value) || 0 })}
            className="w-full p-2 mb-4 border rounded dark:bg-gray-700"
            min="0"
          />
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded" disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading || formData.lotToClose <= 0} className="px-4 py-2 bg-orange-500 text-white rounded disabled:opacity-50">
              {loading ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SetVolumeToCloseModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (volumeToClose: number) => void;
  loading: boolean;
  currentVolume?: number;
}> = ({ isOpen, onClose, onSubmit, loading, currentVolume }) => {
  const [volumeToClose, setVolumeToClose] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (volumeToClose < 0) {
      toast.error('Volume to close must be non-negative');
      return;
    }
    if (currentVolume && volumeToClose > currentVolume) {
      toast.error('Volume to close exceeds current volume');
      return;
    }
    onSubmit(volumeToClose);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0  bg-opacity-20 backdrop-blur-sm bg-transparent flex items-center justify-center z-0">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Set Volume to Close</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="number"
            placeholder="Volume to Close (>=0)"
            value={volumeToClose}
            onChange={(e) => setVolumeToClose(parseFloat(e.target.value) || 0)}
            className="w-full p-2 mb-4 border rounded dark:bg-gray-700"
            min="0"
          />
          {currentVolume && <p className="text-sm text-gray-500 mb-4">Current Volume: {currentVolume}</p>}
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded" disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading || volumeToClose < 0} className="px-4 py-2 bg-orange-500 text-white rounded disabled:opacity-50">
              {loading ? 'Setting...' : 'Set'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};



const QueueDeleteConfirm: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  orderTicket: string;
}> = ({ isOpen, onClose, onConfirm, loading, orderTicket }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0  bg-opacity-20 backdrop-blur-sm bg-transparent flex items-center justify-center z-0">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
        <p>Queue order {orderTicket} for deletion?</p>
        <div className="flex justify-end space-x-2 mt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded" disabled={loading}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={loading} className="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-50">
            {loading ? 'Deleting...' : 'Confirm'}
          </button>
        </div>
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

  // Modal states
  const [modals, setModals] = useState({
    addPending: false,
    updatePending: false,
    addSpotPending: false,
    updateSpotPending: false,
    addRunning: false,
    updateSlTpBe: false,
    updatePartialClose: false,
    setVolumeToClose: false,
    addSpotRunning: false,
    updateSpotRunning: false,
    queueDelete: false,
  });

  // Action states
  const [currentAction, setCurrentAction] = useState({ id: '', parentId: '', index: -1, orderTicket: '' });

  // Form states (can be consolidated, but separate for clarity)
  const [formAddPending, setFormAddPending] = useState<Partial<TradeData>>({});
  const [formUpdatePending, setFormUpdatePending] = useState<Partial<TradeData>>({});
  const [formAddSpot, setFormAddSpot] = useState({ entry_price: 0, stoploss: 0, take_profit: 0, risk_percentage: 1 });
  const [formUpdateSpot, setFormUpdateSpot] = useState<SpotAdd>({ entry_price: 0, stoploss: 0, risk_percentage: 1 });
  const [formAddRunning, setFormAddRunning] = useState<Partial<TradeData>>({});
  const [formUpdateSlTpBe, setFormUpdateSlTpBe] = useState({ slToUpdate: 0, tpToUpdate: 0, breakevenPrice: 0 });
  const [formUpdatePartialClose, setFormUpdatePartialClose] = useState({ partialClosePrice: 0, lotToClose: 0 });
  const [formSetVolumeClose, setFormSetVolumeClose] = useState(0);

  // Loading states
  const [loading, setLoading] = useState({
    addPending: false,
    updatePending: false,
    addSpot: false,
    updateSpot: false,
    addRunning: false,
    updateSlTpBe: false,
    updatePartialClose: false,
    setVolumeToClose: false,
    queueDelete: false,
  });

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

  // WebSocket connection logic - unchanged
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

  // API Handlers
  const handleAddPending = async (data: Partial<TradeData>) => {
    if (!selectedAccount) return;
    setLoading(prev => ({ ...prev, addPending: true }));
    try {
      await Request({
        method: 'POST',
        url: 'redis/add-pending',
        data: { accountNumber: selectedAccount, id: Date.now().toString(), ...data } // Generate id or from form
      });
      toast.success('Pending order added');
      setModals(prev => ({ ...prev, addPending: false }));
      setFormAddPending({});
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add pending order');
    } finally {
      setLoading(prev => ({ ...prev, addPending: false }));
    }
  };

  const openUpdatePending = (id: string, initialData?: Partial<TradeData>) => {
    setCurrentAction(prev => ({ ...prev, id }));
    setFormUpdatePending(initialData || {});
    setModals(prev => ({ ...prev, updatePending: true }));
  };

  const handleUpdatePending = async (data: Partial<TradeData>) => {
    if (!selectedAccount || !currentAction.id) return;
    setLoading(prev => ({ ...prev, updatePending: true }));
    try {
      await Request({
        method: 'PUT',
        url: `/redis/update-pending/${currentAction.id}`,
        data: { accountNumber: selectedAccount, ...data }
      });
      toast.success('Pending order updated');
      setModals(prev => ({ ...prev, updatePending: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update pending order');
    } finally {
      setLoading(prev => ({ ...prev, updatePending: false }));
    }
  };

  const openAddSpotPending = (parentId: string) => {
    setCurrentAction(prev => ({ ...prev, parentId }));
    setModals(prev => ({ ...prev, addSpotPending: true }));
  };

  const handleAddSpotPending = async (spotData: { entry_price: number; stoploss: number; take_profit?: number; risk_percentage: number }) => {
    if (!selectedAccount || !currentAction.parentId) return;
    setLoading(prev => ({ ...prev, addSpot: true }));
    try {
      await Request({
        method: 'POST',
        url: `/redis/pending/${currentAction.parentId}/add-spot`,
        data: { accountNumber: selectedAccount, ...spotData }
      });
      toast.success('Spot added to pending');
      setModals(prev => ({ ...prev, addSpotPending: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add spot');
    } finally {
      setLoading(prev => ({ ...prev, addSpot: false }));
    }
  };

  const openUpdateSpotPending = (parentId: string, index: number, initialData?: SpotAdd) => {
    setCurrentAction(prev => ({ ...prev, parentId, index }));
    setFormUpdateSpot(initialData || { entry_price: 0, stoploss: 0, risk_percentage: 1 });
    setModals(prev => ({ ...prev, updateSpotPending: true }));
  };

  const handleUpdateSpotPending = async (spotData: SpotAdd) => {
    if (!selectedAccount || !currentAction.parentId || currentAction.index < 0) return;
    setLoading(prev => ({ ...prev, updateSpot: true }));
    try {
      await Request({
        method: 'PUT',
        url: `/redis/pending/${currentAction.parentId}/spot/${currentAction.index}`,
        data: { accountNumber: selectedAccount, ...spotData }
      });
      toast.success('Spot updated in pending');
      setModals(prev => ({ ...prev, updateSpotPending: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update spot');
    } finally {
      setLoading(prev => ({ ...prev, updateSpot: false }));
    }
  };

  // Similar handlers for running actions: addRunning, updateSlTpBe, updatePartialClose, setVolumeToClose, addSpotRunning, updateSpotRunning

  const openUpdateSlTpBe = (id: string) => {
    setCurrentAction(prev => ({ ...prev, id }));
    setFormUpdateSlTpBe({ slToUpdate: 0, tpToUpdate: 0, breakevenPrice: 0 });
    setModals(prev => ({ ...prev, updateSlTpBe: true }));
  };

  const handleUpdateSlTpBe = async (data: { slToUpdate?: number; tpToUpdate?: number; breakevenPrice?: number }) => {
    if (!selectedAccount || !currentAction.id) return;
    setLoading(prev => ({ ...prev, updateSlTpBe: true }));
    try {
      await Request({
        method: 'PUT',
        url: `/redis/running/${currentAction.id}/update-sl-tp-breakeven`,
        data: { accountNumber: selectedAccount, ...data }
      });
      toast.success('SL/TP/Breakeven updated');
      setModals(prev => ({ ...prev, updateSlTpBe: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update');
    } finally {
      setLoading(prev => ({ ...prev, updateSlTpBe: false }));
    }
  };

  const openAddSpotRunning = (parentId: string) => {
    setCurrentAction(prev => ({ ...prev, parentId }));
    setModals(prev => ({ ...prev, addSpotRunning: true }));
  };

  const handleAddSpotRunning = async (spotData: { entry_price: number; stoploss: number; take_profit?: number; risk_percentage: number }) => {
    if (!selectedAccount || !currentAction.parentId) return;
    setLoading(prev => ({ ...prev, addSpot: true }));
    try {
      await Request({
        method: 'POST',
        url: `/redis/running/${currentAction.parentId}/add-spot`,
        data: { accountNumber: selectedAccount, ...spotData }
      });
      toast.success('Spot added to running');
      setModals(prev => ({ ...prev, addSpotRunning: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add spot');
    } finally {
      setLoading(prev => ({ ...prev, addSpot: false }));
    }
  };

  // ... Implement other handlers similarly

  const openQueueDelete = (orderTicket: string) => {
    setCurrentAction(prev => ({ ...prev, orderTicket }));
    setModals(prev => ({ ...prev, queueDelete: true }));
  };

  const handleQueueDelete = async () => {
    if (!selectedAccount || !currentAction.orderTicket) return;
    setLoading(prev => ({ ...prev, queueDelete: true }));
    try {
      await Request({
        method: 'POST',
        url: 'redis/queue-delete',
        data: { accountNumber: selectedAccount, orderTicket: currentAction.orderTicket }
      });
      toast.success('Order queued for deletion');
      setModals(prev => ({ ...prev, queueDelete: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to queue delete');
    } finally {
      setLoading(prev => ({ ...prev, queueDelete: false }));
    }
  };

  const renderTable = (title: string, data: TradeData[], isPendingTable = false) => (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        {title === 'Pending Orders' && (
          <button
            onClick={() => setModals(prev => ({ ...prev, addPending: true }))}
            className="px-4 py-2 bg-green-500 text-white rounded text-sm"
            disabled={isConnecting}
          >
            Add Pending
          </button>
        )}
      </div>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-900">
              {data.map((item, index) => (
                <tr key={item.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="relative px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <span className="absolute inset-0 flex items-center justify-center">
                      {item?.id ? (item.id) : (
                        <> Adding <span className="ml-1 h-4 w-4 animate-ping rounded-full bg-sky-400 opacity-75"></span></>)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{item.symbol}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <span className={`px-2 py-1 rounded-full text-xs ${item.trade_setup === 'buy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                      }`}>
                      {item.trade_setup?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{item.volume}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{item.price}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${item.profit && item.profit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {item.profit !== undefined ? (item.profit >= 0 ? `+${item.profit}` : item.profit) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex flex-wrap gap-1">
                      {isPendingTable ? (
                        <>
                          <button
                            onClick={() => openUpdatePending(item.id, item)}
                            className="text-blue-500 hover:text-blue-700 text-xs"
                            disabled={loading.updatePending}
                          >
                            Update
                          </button>
                          <button
                            onClick={() => openAddSpotPending(item.id)}
                            className="text-green-500 hover:text-green-700 text-xs"
                            disabled={loading.addSpot}
                          >
                            Add Spot
                          </button>
                          {item.spot_adds && item.spot_adds.map((spot, idx) => (
                            <button
                              key={idx}
                              onClick={() => openUpdateSpotPending(item.id, idx, spot)}
                              className="text-purple-500 hover:text-purple-700 text-xs"
                              disabled={loading.updateSpot}
                            >
                              Spot {idx + 1}
                            </button>
                          ))}
                          <button
                            onClick={() => openQueueDelete(item.order_id || item.id)}
                            className="text-red-500 hover:text-red-700 text-xs"
                            disabled={loading.queueDelete}
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => openUpdateSlTpBe(item.id)}
                            className="text-blue-500 hover:text-blue-700 text-xs"
                            disabled={loading.updateSlTpBe}
                          >
                            SL/TP/BE
                          </button>
                          <button
                            onClick={() => {/* open update partial close */ }}
                            className="text-orange-500 hover:text-orange-700 text-xs"
                            disabled={loading.updatePartialClose}
                          >
                            Partial
                          </button>
                          <button
                            onClick={() => {/* open set volume close, pass item.volume */ }}
                            className="text-yellow-500 hover:text-yellow-700 text-xs"
                            disabled={loading.setVolumeToClose}
                          >
                            Vol Close
                          </button>
                          <button
                            onClick={() => openAddSpotRunning(item.id)}
                            className="text-green-500 hover:text-green-700 text-xs"
                            disabled={loading.addSpot}
                          >
                            Add Spot
                          </button>
                          {item.spot_adds && item.spot_adds.map((spot, idx) => (
                            <button
                              key={idx}
                              onClick={() => {/* open update spot running */ }}
                              className="text-purple-500 hover:text-purple-700 text-xs"
                              disabled={loading.updateSpot}
                            >
                              Spot {idx + 1}
                            </button>
                          ))}
                          <button
                            onClick={() => openQueueDelete(item.order_id || item.id)}
                            className="text-red-500 hover:text-red-700 text-xs"
                            disabled={loading.queueDelete}
                          >
                            Close
                          </button>
                        </>
                      )}
                    </div>
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
          {/* Account Dropdown - unchanged */}
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
            {renderTable("Pending Orders", pending, true)}
            {renderTable("Open Positions", running, false)}
            {renderTable("Closed Trades", executed)}
            {renderTable("Removed Orders", removed)}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">Please select a trading account to view live data.</p>
          </div>
        )}

        <AddSpotModal
          isOpen={modals.addSpotRunning}
          onClose={() => setModals(prev => ({ ...prev, addSpotRunning: false }))}
          onSubmit={handleAddSpotRunning}
          loading={loading.addSpot}
          isPending={false}
        />
        <AddPendingModal
          isOpen={modals.addPending}
          onClose={() => setModals(prev => ({ ...prev, addPending: false }))}
          onSubmit={handleAddPending}
          loading={loading.addPending}
        />
        <UpdatePendingModal
          isOpen={modals.updatePending}
          onClose={() => setModals(prev => ({ ...prev, updatePending: false }))}
          onSubmit={handleUpdatePending}
          loading={loading.updatePending}
          initialData={formUpdatePending}
        />
        <AddSpotModal
          isOpen={modals.addSpotPending}
          onClose={() => setModals(prev => ({ ...prev, addSpotPending: false }))}
          onSubmit={handleAddSpotPending}
          loading={loading.addSpot}
          isPending={true}
        />
        <UpdateSpotModal
          isOpen={modals.updateSpotPending}
          onClose={() => setModals(prev => ({ ...prev, updateSpotPending: false }))}
          onSubmit={handleUpdateSpotPending}
          loading={loading.updateSpot}
          initialData={formUpdateSpot}
        />
        <UpdateSlTpBeModal
          isOpen={modals.updateSlTpBe}
          onClose={() => setModals(prev => ({ ...prev, updateSlTpBe: false }))}
          onSubmit={handleUpdateSlTpBe}
          loading={loading.updateSlTpBe}
        />
        {/* ... Render other modals similarly ... */}
        <QueueDeleteConfirm
          isOpen={modals.queueDelete}
          onClose={() => setModals(prev => ({ ...prev, queueDelete: false }))}
          onConfirm={handleQueueDelete}
          loading={loading.queueDelete}
          orderTicket={currentAction.orderTicket}
        />
      </div>
    </div>
  );
}