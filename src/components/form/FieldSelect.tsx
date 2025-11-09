import { motion, AnimatePresence } from "framer-motion";
import React, { useState, useRef, useEffect } from "react";

const FieldSelect = ({
  label,
  value,
  onChange,
  error,
  children,
}: {
  label?: string;
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement> | { target: { value: string } }) => void;
  error?: string;
  children: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update selected label text
  useEffect(() => {
    const selectedOption = React.Children.toArray(children).find(
      (child: any) => child?.props?.value === value
    ) as any;
    setSelectedText(selectedOption ? selectedOption.props.children : "Select option");
  }, [value, children]);

  return (
    <div className="mb-4 relative" ref={wrapperRef}>
      {label && (
        <label
          className={`block text-sm font-semibold mb-2 ${
            error ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"
          }`}
        >
          {label}
        </label>
      )}

      {/* Select Box */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-3 flex items-center justify-between rounded-lg text-sm
          transition-all duration-200
          border focus:outline-none 
          ${error
            ? "border-red-500 bg-red-50/50 dark:bg-red-900/20"
            : "border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-800/70"
          }
          ${isOpen ? "ring-2 ring-blue-400 border-blue-400" : "hover:border-blue-400"}
          text-gray-900 dark:text-white
        `}
      >
        <span className={`${!value ? "text-gray-400 dark:text-gray-500" : ""}`}>
          {selectedText}
        </span>
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="w-4 h-4 text-gray-500 dark:text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6" />
        </motion.svg>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="absolute z-40 w-full mt-1 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 
              bg-white dark:bg-gray-800 overflow-hidden text-sm max-h-48 overflow-y-auto"
          >
            {React.Children.map(children, (child: any) => {
              if (!child?.props?.value) return null;
              const isSelected = value === child.props.value;
              return (
                <motion.li
                  key={child.props.value}
                  onClick={() => {
                    onChange({ target: { value: child.props.value } });
                    setIsOpen(false);
                  }}
                  whileHover={{ backgroundColor: "rgba(59,130,246,0.1)" }} // blue hover
                  className={`px-4 py-2 cursor-pointer transition-colors 
                    ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium"
                        : "text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400"
                    }`}
                >
                  {child.props.children}
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>

      {/* Error Text */}
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};

export default FieldSelect;
