import React, { useEffect, useState, useRef } from "react";

const SearchBar = ({
  className = "",
  placeholder = "Search",
  onSearch = null,
  value = undefined,
  debounceMs = 300,
}) => {
  const [internalValue, setInternalValue] = useState(value ?? "");
  const timerRef = useRef(null);

  useEffect(() => {
    if (value !== undefined && value !== internalValue) {
      setInternalValue(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    setInternalValue(v);

    if (onSearch) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          onSearch(v);
        } catch (err) {
          // swallow
          console.error('SearchBar onSearch error:', err);
        }
      }, debounceMs);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && onSearch) {
      if (timerRef.current) clearTimeout(timerRef.current);
      onSearch(internalValue);
    }
  };

  return (
    <div className={`relative flex-grow max-w-xl ${className}`}>
      {/* Search Icon (Left) */}
      <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-[#B0BAFF] text-xl">
        search
      </span>

      {/* Input */}
      <input
        type="text"
        placeholder={placeholder}
        value={internalValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="bg-transparent border border-[#393B5A] text-white 
                   rounded-[8px] h-[49px] pl-12 pr-4 w-full text-base 
                   focus:outline-none"
      />
    </div>
  );
};

export default SearchBar;
