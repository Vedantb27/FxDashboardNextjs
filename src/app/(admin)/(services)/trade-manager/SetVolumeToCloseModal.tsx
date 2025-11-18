"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { FloatingLabelInput } from "../../../../components/form/FloatingLabelInput";

interface TradeData {
  id: string;
  symbol: string;
  trade_setup: string;
  price?: number;
  volume?: number;
  volumeToClose?: number;
  stopLoss?: number;
  takeProfit?: number;
  risk_percentage?: number;
  order_id?: string;
}

interface MarketData {
  symbol: string;
  bid: number | null;
  ask: number | null;
}

interface SetVolumeToCloseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (volume: number) => void;
  loading: boolean;
  currentAction: any;
  running: TradeData[];
  marketData: MarketData[];
}

const ModalWrapper: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ isOpen, onClose, children }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-20 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white/95 dark:bg-gray-900/95 rounded-2xl shadow-2xl p-8 w-120  max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800"
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
    className={`px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 ${props.className || ""}`}
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

export default function SetVolumeToCloseModal({
  isOpen,
  onClose,
  onSubmit,
  loading,
  currentAction,
  running,
  marketData,
}: SetVolumeToCloseModalProps) {
  const [form, setForm] = useState<number>(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    const parent: any = running.find((p) => p.id === currentAction.id);
    if (!parent) {
      toast.error("Running trade not found");
      onClose();
      return;
    }
    // Reset to current value on open
    setForm(parent?.volumeToClose ?? 0);
    setErrors({});
  }, [isOpen]);

  const validate = () => {
    const e: Record<string, string> = {};
    const parent = running.find((p) => p.id === currentAction.id);
    if (!parent || !parent.volume) return e;

    const volume = parent.volume;

    if (form < 0) {
      e.volumeToClose = "Volume cannot be negative";
    } else if (form > volume) {
      e.volumeToClose = `Cannot exceed current volume (${volume.toFixed(2)})`;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  useEffect(() => {
    validate();
  }, [form]);

  const handleChange = (value: string) => {
    const num = value === "" ? 0 : parseFloat(value) || 0;
    setForm(num);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const parent = running.find((p) => p.id === currentAction.id);
    const currentVolumeToClose = parent?.volumeToClose ?? 0;

    // Check for no changes
    if (form === currentVolumeToClose) {
      toast.error("No changes detected");
      return;
    }

    onSubmit(form);
  };

  if (!isOpen) return null;

  const parent: any = running.find((p) => p.id === currentAction.id);
  if (!parent) return null;

  const market = marketData.find((m) => m.symbol === parent.symbol);
  const bid = market?.bid ? market.bid.toFixed(5) : "-";
  const ask = market?.ask ? market.ask.toFixed(5) : "-";

  const currentVolumeToClose = parent?.volumeToClose ?? 0;

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
        SET VOLUME TO CLOSE FOR #{currentAction.id}
      </h3>
      <div className="mb-5 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
          <span className="font-medium">
            {parent.symbol} ({parent.trade_setup?.toUpperCase()})
          </span>
          <div className="flex items-center font-mono">
            <span className="font-bold min-w-19">Live Price:</span>
            <span className="text-green-500">{bid}</span>
            <span className="mx-1 text-gray-400">/</span>
            <span className="text-red-500">{ask}</span>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-500">
          <div>
            Entry: <span className="font-mono">{parent.price?.toFixed(5) ?? "-"}</span>
          </div>
          <div>
            Volume: <span className="font-mono">{parent.volume?.toFixed(2) ?? "-"}</span>
          </div>
          {parent.stopLoss && (
            <div>
              SL: <span className="font-mono">{parent.stopLoss.toFixed(5)}</span>
            </div>
          )}
          {parent.takeProfit && (
            <div>
              TP: <span className="font-mono">{parent.takeProfit.toFixed(5)}</span>
            </div>
          )}
          {parent.risk_percentage && (
            <div>
              Risk: <span className="font-mono">{parent.risk_percentage}%</span>
            </div>
          )}
         
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FloatingLabelInput 
          key="volume"
          type="number"
          label="Volume to Close"
          value={form === 0 ? 0 : form}
          onChange={(e: any) => handleChange(e.target.value)}
          error={errors.volumeToClose}
          step="0.01"
          min="0"
        />
        {currentVolumeToClose > 0 && (
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
            Current Volume to Close: <span className="font-mono font-medium">{currentVolumeToClose.toFixed(2)}</span>
          </p>
        )}
        <div className="flex gap-3 pt-4">
          <MutedBtn type="button" onClick={onClose} disabled={loading} className="flex-1">
            Cancel
          </MutedBtn>
          <PrimaryBtn
            type="submit"
            disabled={
              loading ||
              Object.keys(errors).length > 0 ||
              form === currentVolumeToClose
            }
            className="flex-1"
          >
            {loading ? "Setting…" : "Set Volume"}
          </PrimaryBtn>
        </div>
      </form>
    </ModalWrapper>
  );
}