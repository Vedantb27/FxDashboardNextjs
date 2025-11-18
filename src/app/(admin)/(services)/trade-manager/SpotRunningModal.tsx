"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { FloatingLabelInput } from "../../../../components/form/FloatingLabelInput";

interface SpotAdd {
  entry_price: number;
  stoploss: number;
  take_profit?: number;
  risk_percentage: number;
}
interface TradeData {
  id: string;
  symbol: string;
  trade_setup: string;
  spot_adds?: SpotAdd[];
}
interface MarketData {
  symbol: string;
  bid: number | null;
  ask: number | null;
}

interface SpotRunningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SpotAdd) => void;
  onDelete?: () => void;
  loading: boolean;
  currentAction: { parentId: string; tradeSetup: string; index?: number, orderTicket: any, order_id: any };
  running: TradeData[];
  marketData: MarketData[];
  mode: "add" | "update";
  isDeleting?: boolean;
}

const ModalWrapper: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ isOpen, onClose, children }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-20 flex items-center justify-center p-4 mt-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white/95 dark:bg-gray-900/95 rounded-2xl shadow-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const PrimaryBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (
  props
) => (
  <button
    {...props}
    className={`px-6 py-2.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 ${props.className || ""}`}
  />
);
const MutedBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (
  props
) => (
  <button
    {...props}
    className={`px-6 py-2.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-semibold shadow hover:shadow-md transition-all disabled:opacity-50 ${props.className || ""}`}
  />
);

const DangerBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (
  props
) => (
  <button
    {...props}
    className={`px-6 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 ${props.className || ""}`}
  />
);


export default function SpotRunningModal({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  loading,
  currentAction,
  running,
  marketData,
  mode,
  isDeleting
}: SpotRunningModalProps) {
  const [form, setForm] = useState<SpotAdd>({
    entry_price: 0,
    stoploss: 0,
    take_profit: undefined,
    risk_percentage: 1,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [spotData, setSpotData]: any = useState({})

  useEffect(() => {
    if (!isOpen) return;
    const parent = running.find((p) => p.id === currentAction.parentId);
    if (!parent) {
      toast.error("Parent running trade not found");
      onClose();
      return;
    }

    if (mode === "update" && currentAction.index !== undefined) {
      const spot = parent.spot_adds?.[currentAction.index];
      if (!spot) {
        toast.error("Spot not found");
        onClose();
        return;
      }
      setSpotData(spot)

      setForm({
        entry_price: spot.entry_price,
        stoploss: spot.stoploss,
        take_profit: spot.take_profit,
        risk_percentage: spot.risk_percentage,
      });
    } else {
      setForm({ entry_price: 0, stoploss: 0, take_profit: undefined, risk_percentage: 1 });
    }
    setErrors({});
  }, [isOpen]);

  const validate = () => {
    const e: Record<string, string> = {};
    const parent: any = running.find((p) => p.id === currentAction.parentId);
    if (!parent) return e;

    const tradeSetup = parent.trade_setup || currentAction.tradeSetup;

    if (form.entry_price === null || form.entry_price <= 0) {
      e.entry_price = "Required";
    } else {


      if (!e.entry_price && parent.price != null) {
        const parentPrice = parent.price;
        if (tradeSetup === "buy" && form.entry_price <= parentPrice) {
          e.entry_price = `Entry must be ABOVE parent price (${parentPrice.toFixed(5)})`;
        }
        if (tradeSetup === "sell" && form.entry_price >= parentPrice) {
          e.entry_price = `Entry must be BELOW parent price (${parentPrice.toFixed(5)})`;
        }
      }
    }

    if (form.stoploss === null || form.stoploss <= 0) {
      e.stoploss = "Required";
    } else if (!e.entry_price && form.entry_price != null) {
      if (tradeSetup === "buy") {
        if (form.stoploss >= form.entry_price) {
          e.stoploss = "SL must be BELOW Entry for (BUY)";
        }
      }
      if (tradeSetup === "sell") {
        if (form.stoploss <= form.entry_price) {
          e.stoploss = "SL must be ABOVE Entry for (SELL)";
        }
      }
    }

    if (form.take_profit !== undefined && form.take_profit !== null) {
      if (form.take_profit <= 0) {
        e.take_profit = "TP must be positive";
      } else if (!e.entry_price && form.entry_price != null) {
        if (tradeSetup === "buy") {
          if (form.take_profit <= form.entry_price) {
            e.take_profit = "TP must be ABOVE Entry for (BUY)";
          }
        }
        if (tradeSetup === "sell") {
          if (form.take_profit >= form.entry_price) {
            e.take_profit = "TP must be BELOW Entry for (SELL)";
          }
        }
      }
    }

    if (form.risk_percentage === null || form.risk_percentage < 0 || form.risk_percentage > 100)
      e.risk_percentage = "0-100";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  useEffect(() => {
    validate();
  }, [form, marketData]);

  const handleChange = (key: keyof SpotAdd, value: string) => {
    const num =
      key === "take_profit" && value === ""
        ? undefined
        : parseFloat(value) || null;

    setForm((p) => ({
      ...p,
      [key]: num,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(form);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
        {mode === "update"
          ? `UPDATE SPOT ${currentAction.index! + 1}`
          : `ADD SPOT FOR  (Running #${currentAction?.order_id})`}
      </h3>

      {(() => {
        const parent: any = running.find((p) => p.id === currentAction.parentId);
        if (!parent) return null;

        const market = marketData.find((m) => m.symbol === parent.symbol);
        const bid = market?.bid ? market.bid.toFixed(5) : "-";
        const ask = market?.ask ? market.ask.toFixed(5) : "-";

        return (
          <div className="mb-5 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium">{parent.symbol} ({parent?.trade_setup?.toUpperCase()})</span>
              <div className="flex items-center font-mono">
                <span className="font-bold min-w-19">Live Price:</span>
                <span className="text-green-500">{bid}</span>
                <span className="mx-1 text-gray-400">/</span>
                <span className="text-red-500">{ask}</span>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-500">
              <div>Entry: <span className="font-mono">{parent?.price?.toFixed(5) ?? "-"}</span></div>
              {parent?.stopLoss && <div>SL: <span className="font-mono">{parent?.stopLoss?.toFixed(5) ?? "-"}</span></div>}
              {parent?.takeProfit && <div>TP: <span className="font-mono">{parent?.takeProfit?.toFixed(5) ?? "-"}</span></div>}
              {parent?.risk && <div>Risk: <span className="font-mono">{parent?.risk ?? "-"}%</span></div>}
            </div>

            {spotData?.order_id && <div className=" text-xs text-amber-600 mt-2">This spot order is already executed with order Id {spotData?.order_id}.</div>}
          </div>
        );
      })()}

      <form onSubmit={handleSubmit} className="space-y-4">
        <FloatingLabelInput
          type="number"
          label="Entry Price *"
          value={form.entry_price ?? ""}
          onChange={(e: any) => handleChange("entry_price", e.target.value)}
          error={errors.entry_price}
          step="0.00001"
          min="0"
          disabled={loading || spotData?.order_id}
        />
        <FloatingLabelInput
          type="number"
          label="Stop Loss *"
          value={form.stoploss ?? ""}
          onChange={(e: any) => handleChange("stoploss", e.target.value)}
          error={errors.stoploss}
          step="0.00001"
          min="0"
          disabled={loading || spotData?.order_id}
        />
        <FloatingLabelInput
          type="number"
          label="Take Profit (optional)"
          value={form.take_profit ?? ""}
          onChange={(e: any) => handleChange("take_profit", e.target.value)}
          error={errors.take_profit}
          step="0.00001"
          min="0"
          disabled={loading || spotData?.order_id}
        />
        <FloatingLabelInput
          type="number"
          label="Risk % *"
          value={form.risk_percentage ?? ""}
          onChange={(e: any) => handleChange("risk_percentage", e.target.value)}
          error={errors.risk_percentage}
          min="0"
          max="100"
          step="0.1"
          disabled={loading || spotData?.order_id}
        />

        <div className="flex gap-3 pt-4">
          {mode === "update" && onDelete && (
            <DangerBtn
              type="button"
              onClick={handleDelete}
              disabled={loading || isDeleting || spotData?.order_id}
              className="flex-1"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </DangerBtn>
          )}
          <MutedBtn type="button" onClick={onClose} disabled={loading} className="flex-1">
            Cancel
          </MutedBtn>
          <PrimaryBtn type="submit" disabled={loading || spotData?.order_id || isDeleting} className="flex-1">
            {loading
              ? mode === "update"
                ? "Updating…"
                : "Adding…"
              : mode === "update"
                ? "Update"
                : "Add"}
          </PrimaryBtn>
        </div>
      </form>
    </ModalWrapper>
  );
}