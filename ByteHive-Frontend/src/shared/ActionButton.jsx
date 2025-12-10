import React from "react";

const ActionButton = ({ children, variant = "primary", ...props }) => {
  const base = "px-5 py-2 rounded-lg font-lato transition-colors";
  const styles =
    variant === "primary"
      ? "bg-medium-slate-blue text-white hover:bg-medium-slate-blue-dark"
      : "bg-transparent border border-navbar-border text-periwinkle hover:text-white hover:border-periwinkle";

  return (
    <button className={`${base} ${styles}`} {...props}>
      {children}
    </button>
  );
};

export default ActionButton;
