"use client";
import React, {
    useState,
    useRef,
    useEffect,
    useCallback,
    MouseEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { TradeData, MarketData } from "./TradeManager"; // Import types from main file (adjust path if needed)
import FieldSelect from "../../../../components/form/FieldSelect";
import SymbolSelect from "../../../../components/form/SymbolSelect";
import { FloatingLabelInput } from "../../../../components/form/FloatingLabelInput";
/* ============================================================================
   Local Helpers for Modal (duplicated for independence)
=========================================================================== */
const getCurrentPriceLocal = (
    symbol: string,
    tradeSetup: string,
    marketData: MarketData[]
): { bid: number | null; ask: number | null } | null => {
    const m = marketData.find((mk) => mk.symbol === symbol);
    if (!m || m.bid === null || m.ask === null) return null;
    return { bid: m.bid, ask: m.ask };
};
const validateRunningPriceLocal = (
    data: Partial<TradeData>,
    marketData: MarketData[]
): string | null => {
    if (!data.symbol || !data.trade_setup || data.stopLoss === undefined)
        return "Missing required fields";
    const curr: any = getCurrentPriceLocal(data.symbol, data.trade_setup, marketData);
    if (!curr) return "No market data available for symbol";
    const isBuy = data.trade_setup === "buy";
    const entry = isBuy ? curr.ask : curr.bid;
    const sl = data.stopLoss;
    if (isBuy && sl >= entry) return "For Buy, Stop Loss must be below current ask";
    if (!isBuy && sl <= entry) return "For Sell, Stop Loss must be above current bid";
    return null;
};
/* ============================================================================
   Modal Component
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
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-2 sm:p-4 mt-4 sm:mt-16 "
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className={`bg-white/95 dark:bg-gray-900/95 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl ms-0 sm:ms-60 p-4 sm:p-6 lg:p-8 max-h-[90vh] overflow-y-auto ${wide ? 'w-full max-w-4xl' : 'w-full max-w-md'}`}
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
interface AddRunningModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<TradeData>) => void;
    loading: boolean;
    symbols: string[];
    marketData: MarketData[];
}
const AddRunningModal: React.FC<AddRunningModalProps> = ({ isOpen, onClose, onSubmit, loading, symbols, marketData }) => {
    const [formData, setFormData] = useState<Partial<TradeData>>({
        risk_percentage: 1,
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [search, setSearch] = useState('');
    const [showOptions, setShowOptions] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const prevOpenRef = useRef(false);
    useEffect(() => {
        if (!isOpen) {
            prevOpenRef.current = false;
            return;
        }
        if (!prevOpenRef.current) {
            setFormData({ risk_percentage: 1 });
            setSearch('');
            setErrors({});
            setShowOptions(false);
            prevOpenRef.current = true;
        }
    }, [isOpen]);
    useEffect(() => {
        const handleClickOutside: any = (e: MouseEvent) => {
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

        setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors.symbol;
            return newErrors;
        });
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
        setErrors((prev) => {
            const newErrors = { ...prev };

            // Remove previous error for this field by default
            delete newErrors[field];

            switch (field) {
                case 'risk_percentage':
                    if (value < 0 || value > 100)
                        newErrors[field] = 'Must be between 0 and 100';
                    break;

                case 'symbol':
                    if (!value) newErrors[field] = 'Symbol is required';
                    break;

                case 'trade_setup':
                    if (!value) newErrors[field] = 'Trade setup is required';
                    break;

                case 'stopLoss':
                    if (value === undefined || value <= 0)
                        newErrors[field] = 'Valid stop loss is required';
                    break;

                case 'takeProfit':
                    if (value !== undefined && value <= 0)
                        newErrors[field] = 'Take Profit must be positive if provided';
                    break;

                default:
                    break;
            }

            return newErrors;
        });
    }, []);

    const validateStopLossLocal = (data: Partial<TradeData>): string | null => {
        if (!data.trade_setup || !data.stopLoss) return null;
        const curr = getCurrentPriceLocal(data.symbol || '', data.trade_setup, marketData);
        if (!curr) return null;
        const entry: any = data.trade_setup === "buy" ? curr.ask : curr.bid;
        const sl = data.stopLoss;
        const isBuy = data.trade_setup === "buy";
        if (isBuy && sl >= entry)
            return "For Buy setups, Stop Loss must be below current ask.";
        if (!isBuy && sl <= entry)
            return "For Sell setups, Stop Loss must be above current bid.";
        return null;
    };

    const validateTakeProfitLocal = (data: Partial<TradeData>): string | null => {
        if (!data?.takeProfit) {
            return null;
        }
        if (!data.trade_setup || data.takeProfit === undefined || data.takeProfit <= 0) return null;
        const curr = getCurrentPriceLocal(data.symbol || '', data.trade_setup, marketData);
        if (!curr) return null;
        const entry: any = data.trade_setup === "buy" ? curr.ask : curr.bid;
        const tp = data.takeProfit;
        const isBuy = data.trade_setup === "buy";
        if (isBuy && tp <= entry)
            return "For Buy setups, Take Profit must be above current ask.";
        if (!isBuy && tp >= entry)
            return "For Sell setups, Take Profit must be below current bid.";
        return null;
    };

    const handleChange = (key: string, value: any) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
        validateField(key, value);
    };
    // Live price validation
    useEffect(() => {
        if (
            formData.symbol &&
            formData.trade_setup &&
            formData.stopLoss !== undefined
        ) {
            const slErr = validateStopLossLocal(formData);
            const tpErr = validateTakeProfitLocal(formData);

            setErrors((prev: any) => {
                const newErrors = { ...prev };

                if (slErr) newErrors.stopLoss = slErr;
                else delete newErrors.stopLoss;

                if (tpErr) newErrors.takeProfit = tpErr;
                else delete newErrors.takeProfit;

                return newErrors;
            });
        }
    }, [
        formData.symbol,
        formData.trade_setup,
        formData.stopLoss,
        formData.takeProfit,
        marketData?.length,
    ]);

    const currentPrice = getCurrentPriceLocal(formData.symbol || '', formData.trade_setup || '', marketData);
    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};
        if (!formData.symbol) newErrors.symbol = 'Symbol is required';
        if (!formData.trade_setup) newErrors.trade_setup = 'Trade setup is required';

        if (!formData.stopLoss || formData.stopLoss <= 0) newErrors.stopLoss = 'Valid stop loss is required';

        if (!formData.risk_percentage || formData.risk_percentage < 0 || formData.risk_percentage > 100) newErrors.risk_percentage = 'Valid risk percentage (0-100) is required';

        if (formData?.takeProfit) {
            if (formData.takeProfit !== undefined && formData.takeProfit <= 0) newErrors.takeProfit = ' Valid take profit is required';
        }
        const priceError = validateRunningPriceLocal(formData, marketData);
        if (priceError) newErrors.stopLoss = priceError;
        const tpError = validateTakeProfitLocal(formData);
        if (tpError) newErrors.takeProfit = tpError;
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
            <div className="flex items-center justify-between">
                <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    ADD MARKET ORDER
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
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Column 1 */}
                <div className="space-y-4">
                    {/* Symbol with Searchable Dropdown */}
                    <SymbolSelect
                        label="Symbol *"
                        value={formData.symbol || ""}
                        onChange={(selected: any) => handleChange("symbol", selected)}
                        symbols={symbols}
                        marketData={marketData}
                        error={errors.symbol}
                    />
                    <FieldSelect
                        label="Trade Setup *"
                        value={formData.trade_setup || ""}
                        onChange={(e: any) => handleChange("trade_setup", e.target.value)}
                        error={errors.trade_setup}
                    >
                        <option value="">Select Setup</option>
                        <option value="buy">Buy ↑</option>
                        <option value="sell">Sell ↓</option>
                    </FieldSelect>
                    <FloatingLabelInput
                        type="number"
                        label="Stop Loss *"
                        value={formData.stopLoss || ""}
                        onChange={(e: any) =>
                            handleChange("stopLoss", parseFloat(e.target.value) || 0)
                        }
                        error={errors.stopLoss}
                        step="0.00001"
                        min="0"
                    />
                </div>
                {/* Column 2 */}
                <div className="mt-0 md:mt-6 space-y-4">
                    <FloatingLabelInput
                        type="number"
                        label="Take Profit (optional)"
                        value={formData.takeProfit || ""}
                        onChange={(e: any) =>
                            handleChange("takeProfit", parseFloat(e.target.value) || undefined)
                        }
                        error={errors.takeProfit}
                        step="0.00001"
                        min="0"
                    />
                    <FloatingLabelInput
                        type="number"
                        label="Risk % *"
                        value={formData.risk_percentage || ""}
                        onChange={(e: any) =>
                            handleChange("risk_percentage", parseFloat(e.target.value) || 0)
                        }
                        error={errors.risk_percentage}
                        min="0"
                        max="100"
                        step="0.1"
                    />
                    {currentPrice && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                                Current Price: {formData.trade_setup === "buy" ? currentPrice.ask?.toFixed(5) : currentPrice.bid?.toFixed(5)}
                            </p>
                        </div>
                    )}
                </div>
                <div className="col-span-1 md:col-span-2 flex gap-3 pt-6">
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
                        disabled={
                            loading ||
                            Object.keys(errors).length > 0
                        }
                        className="flex-1"
                    >
                        {loading ? "Adding..." : "Add Market Order"}
                    </PrimaryBtn>
                </div>
            </form>
        </ModalWrapper>
    );
};
export default AddRunningModal;