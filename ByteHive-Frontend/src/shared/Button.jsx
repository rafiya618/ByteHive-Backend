// src/components/Button.jsx
const Button = ({ onClick, type = "button", children, className = "" }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`w-full py-2.5 rounded-md font-semibold transition duration-200 cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
