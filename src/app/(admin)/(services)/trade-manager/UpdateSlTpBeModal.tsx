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

interface UpdateSlTpBeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        slToUpdate?: number;
        tpToUpdate?: number;
        breakevenPrice?: number;
    }) => void;
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
                    className="bg-white/95 dark:bg-gray-900/95 rounded-2xl shadow-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800"
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

export default function UpdateSlTpBeModal({
    isOpen,
    onClose,
    onSubmit,
    loading,
    currentAction,
    running,
    marketData,
}: UpdateSlTpBeModalProps) {
    const [form, setForm] = useState<{
        slToUpdate: number;
        tpToUpdate: number;
        breakevenPrice: number;
    }>({
        slToUpdate: 0,
        tpToUpdate: 0,
        breakevenPrice: 0,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!isOpen) return;
        const parent: any = running.find((p) => p.id === currentAction.id);
        if (!parent) {
            toast.error("Running trade not found");
            onClose();
            return;
        }
        // Reset to 0 for new values (init only on open)
        setForm({ slToUpdate: 0, tpToUpdate: 0, breakevenPrice: parent?.breakevenPrice || 0 });
        setErrors({});
    }, [isOpen]); // Removed running, currentAction.id, onClose from deps
    const validate = () => {
        const e: Record<string, string> = {};
        const parent = running.find((p) => p.id === currentAction.id);
        if (!parent || !parent.price) return e;

        const entry = parent.price;
        const setup = parent.trade_setup;

        // SL validation
        if (form.slToUpdate > 0) {
            if (setup === "buy" && form.slToUpdate >= entry) {
                e.slToUpdate = "SL must be BELOW entry for BUY";
            }
            if (setup === "sell" && form.slToUpdate <= entry) {
                e.slToUpdate = "SL must be ABOVE entry for SELL";
            }
        }

        // TP validation
        if (form.tpToUpdate > 0) {
            if (setup === "buy" && form.tpToUpdate <= entry) {
                e.tpToUpdate = "TP must be ABOVE entry for BUY";
            }
            if (setup === "sell" && form.tpToUpdate >= entry) {
                e.tpToUpdate = "TP must be BELOW entry for SELL";
            }
        }

        // Breakeven trigger validation (assuming it's a profit target to move SL to entry)
        if (form.breakevenPrice > 0) {
            if (setup === "buy" && form.breakevenPrice <= entry) {
                e.breakevenPrice = "Breakeven price must be ABOVE entry for BUY";
            }
            if (setup === "sell" && form.breakevenPrice >= entry) {
                e.breakevenPrice = "Breakeven price must be BELOW entry for SELL";
            }
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleChange = (key: "slToUpdate" | "tpToUpdate" | "breakevenPrice", value: string) => {
        const num = value === "" ? 0 : parseFloat(value) || 0;
        setForm((prev) => ({ ...prev, [key]: num }));
    };
    useEffect(() => {
        validate();
    }, [form]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        const data: {
            slToUpdate?: number;
            tpToUpdate?: number;
            breakevenPrice?: number;
        } = {};
        if (form.slToUpdate > 0) data.slToUpdate = form.slToUpdate;
        if (form.tpToUpdate > 0) data.tpToUpdate = form.tpToUpdate;
        if (form.breakevenPrice > 0) data.breakevenPrice = form.breakevenPrice;

        if (Object.keys(data).length === 0) {
            toast.error("Provide at least one positive value");
            return;
        }

        onSubmit(data);
    };

    if (!isOpen) return null;

    const parent: any = running.find((p) => p.id === currentAction.id);
    if (!parent) return null;

    const market = marketData.find((m) => m.symbol === parent.symbol);
    const bid = market?.bid ? market.bid.toFixed(5) : "-";
    const ask = market?.ask ? market.ask.toFixed(5) : "-";

    return (
        <ModalWrapper isOpen={isOpen} onClose={onClose}>
            <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                UPDATE SL/TP/BE FOR #{currentAction.id}
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
                    key="sl" // Optional: Helps React track input identity
                    type="number"
                    label="New Stop Loss*"
                    value={form.slToUpdate === 0 ? "" : form.slToUpdate}
                    onChange={(e: any) => handleChange("slToUpdate", e.target.value)}
                    error={errors.slToUpdate}
                    step="0.00001"
                    min="0"
                />
                {currentAction?.stopLoss && (
                    <p className="mb-7 text-xs text-gray-500 dark:text-gray-400">
                        Current stop Loss: <span className="font-mono font-medium">{currentAction?.stopLoss.toFixed(5)}</span>
                    </p>
                )}
                <FloatingLabelInput
                    key="tp" // Optional: Helps React track input identity
                    type="number"
                    label="New Take Profit"
                    value={form.tpToUpdate === 0 ? "" : form.tpToUpdate}
                    onChange={(e: any) => handleChange("tpToUpdate", e.target.value)}
                    error={errors.tpToUpdate}
                    step="0.00001"
                    min="0"
                />
                {currentAction?.takeProfit && (
                    <p className="mb-7 text-xs text-gray-500 dark:text-gray-400">
                        Current Take Profit: <span className="font-mono font-medium">{currentAction?.takeProfit.toFixed(5)}</span>
                    </p>
                )}
                <FloatingLabelInput
                    key="be" // Optional: Helps React track input identity
                    type="number"
                    label="Breakeven Price "
                    value={form.breakevenPrice === 0 ? "" : form.breakevenPrice}
                    onChange={(e: any) => handleChange("breakevenPrice", e.target.value)}
                    error={errors.breakevenPrice}
                    step="0.00001"
                    min="0"
                />
                <div className="flex gap-3 pt-4">
                    <MutedBtn type="button" onClick={onClose} disabled={loading} className="flex-1">
                        Cancel
                    </MutedBtn>
                    <PrimaryBtn type="submit" disabled={loading || Object.keys(errors).length > 0||(form.breakevenPrice==parent?.breakevenPrice&&!form.tpToUpdate&&!form.slToUpdate)} className="flex-1">
                        {loading ? "Updating…" : "Update"}
                    </PrimaryBtn>
                </div>
            </form>
        </ModalWrapper>
    );
}