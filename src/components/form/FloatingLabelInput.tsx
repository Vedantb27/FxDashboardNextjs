export const FloatingLabelInput = (
    props: any & { label?: string; error?: string }
) => (
    <div className="relative mb-4">
        <input
            {...props}
            placeholder=" "
            className={`peer w-full p-3 pt-5 pb-2 rounded-md border text-sm bg-transparent 
transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none
text-gray-900 dark:text-white
placeholder-transparent
[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
${props.disabled
    ? "bg-gray-950 dark:bg-gray-600 text-gray-400 border-gray-300 cursor-not-allowed"
    : props.error
    ? "border-red-500 focus:border-red-500 focus:ring-red-200 bg-red-50/50 dark:bg-red-900/20"
    : "border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/50 focus:border-blue-400"
  } ${props.className || ""}`}

        />
        {props.label && (
            <label
                className={`absolute left-3 bg-white dark:bg-gray-900 px-2 py-0.1 
    text-gray-500 dark:text-gray-400 text-sm transition-all duration-200 ease-in-out pointer-events-none
    peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-gray-400 peer-placeholder-shown:text-sm
    peer-focus:-top-2 peer-focus:text-xs peer-focus:text-blue-500
    ${props.error ? "text-red-500 peer-focus:text-red-500" : ""}
    rounded-md shadow-sm
  `}
                style={{
                    top: "-0.6rem",
                }}
            >
                {props.label}
            </label>
        )}
        {props.error && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{props.error}</p>
        )}
    </div>
);
