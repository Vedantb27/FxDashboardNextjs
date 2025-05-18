import React, { FC } from "react";

interface InputProps {
  type?: string;
  placeholder?: string;
  error?: boolean;
  hint?: string;
  disabled?: boolean;
  className?: string;
  [key: string]: any; // Allow react-hook-form props (value, onChange, etc.)
}

const Input: FC<InputProps> = ({
  type = "text",
  placeholder,
  error = false,
  hint,
  disabled = false,
  className = "",
  ...rest // Spread react-hook-form props (value, onChange, name, etc.)
}) => {
  const baseStyles = `
    h-11 w-full rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs
    placeholder:text-gray-400 focus:outline-none focus:ring-3
    dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30
    dark:focus:border-brand-800
  `;

  const stateStyles = disabled
    ? `text-gray-500 border-gray-300 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700`
    : error
    ? `text-error-800 border-error-500 focus:ring-error-500/10 dark:text-error-400 dark:border-error-500`
    : `text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800`;

  const inputClasses = `${baseStyles} ${stateStyles} ${className}`.trim();

  return (
    <div className="relative">
      <input
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClasses}
        autoComplete={type === "email" ? "email" : type === "password" ? "current-password" : "off"}
        {...rest} // Spread react-hook-form props directly
      />
      {hint && (
        <p
          className={`mt-1.5 text-xs ${
            error ? "text-error-500" : "text-gray-500"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
};

export default Input;