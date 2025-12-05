"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { convertToUserLocal } from "../../../../utils/serverTime";

interface DetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item:any;
}

const ModalWrapper: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}> = ({ isOpen, onClose, children, wide = false }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4 ms-0 sm:ms-65 mt-16"
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
const DetailsModal: React.FC<DetailsModalProps> = ({ isOpen, onClose, item }) => {
  if (!item) return null;
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} wide={true}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          Trade Details: {item.symbol}
        </h3>
        <MutedBtn onClick={onClose}>Close</MutedBtn>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="text-gray-900 dark:text-white">
          <strong>Setup:</strong> <span className={item.trade_setup === "buy" ? "text-green-800 dark:text-green-100" : "text-red-800 dark:text-red-100"}>{item.trade_setup.toUpperCase()}</span>
        </div>
        <div className="text-gray-900 dark:text-white"><strong>Volume:</strong> {item.volume?.toFixed(2) || '--'}</div>
        <div className="text-gray-900 dark:text-white"><strong>Price:</strong> {item.price?.toFixed(5) || '--'}</div>
        {item.closing_price && <div className="text-gray-900 dark:text-white"><strong>Close Price:</strong> {item.closing_price.toFixed(5)}</div>}
        {item.removalPrice && <div className="text-gray-900 dark:text-white"><strong>Removal Price:</strong> {item.removalPrice.toFixed(5)}</div>}
        {item.closing_time && <div className="text-gray-900 dark:text-white"><strong>Closed:</strong> {convertToUserLocal(item.closing_time)}</div>}
        {/* {item.start_time && <div className="text-gray-900 dark:text-white"><strong>Started:</strong> {getFormattedUserLocalTime(item.start_time)}</div>} */}
        {item.execution_time && <div className="text-gray-900 dark:text-white"><strong>Executed:</strong> {convertToUserLocal(item.execution_time)}</div>}
        {item.profit !== undefined && (
          <div className={item.profit >= 0 ? "text-green-600" : "text-red-600"}>
            <strong>Profit:</strong> {item.profit >= 0 ? `+${item.profit.toFixed(2)}` : item.profit.toFixed(2)}
          </div>
        )}
      </div>
      {item.spot_adds && item.spot_adds.length > 0 && (
       <div className="mb-6">
  <h4 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Spot Adds</h4>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {item.spot_adds.map((spot:any, idx:any) => (
      <div
        key={idx}
        className="border border-gray-200 dark:border-gray-700 p-3 rounded-lg bg-white dark:bg-gray-800 shadow-sm"
      >
        <strong className="text-gray-900 dark:text-white">Spot {idx + 1}:</strong>
        <div className="ml-4 mt-1 text-sm text-gray-900 dark:text-white space-y-1">
          <div>Entry Price: {spot.entry_price.toFixed(5)}</div>
          <div>Stop Loss: {spot.stoploss.toFixed(5)}</div>
          {spot.take_profit && <div>Take Profit: {spot.take_profit.toFixed(5)}</div>}
          <div>Risk : {spot.risk_percentage}%</div>
          <div>Order ID: {spot.order_id || 'Pending'}</div>
        </div>
      </div>
    ))}
  </div>
</div>

      )}
     {item.partiallyClosed && item.partiallyClosed.length > 0 && (
  <div className="mb-6">
    <h4 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
      Partial Closes
    </h4>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {item.partiallyClosed?.map((close:any, idx:any) => (
        <div
          key={idx}
          className="border border-gray-200 dark:border-gray-700 p-3 rounded-lg bg-white dark:bg-gray-800 shadow-sm"
        >
          <strong className="text-gray-900 dark:text-white">
            Partial Close {idx + 1}:
          </strong>
          <div className="ml-4 mt-1 text-sm text-gray-900 dark:text-white space-y-1">
            <div>Lots: {close.lots.toFixed(2)}</div>
            <div>Price: {close.price.toFixed(5)}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}

      {(!item.spot_adds || item.spot_adds.length === 0) && (!item.partiallyClosed || item.partiallyClosed.length === 0) && (
        <p className="text-gray-500 dark:text-gray-400 text-center py-4">No additional details available.</p>
      )}
    </ModalWrapper>
  );
};

export default DetailsModal;