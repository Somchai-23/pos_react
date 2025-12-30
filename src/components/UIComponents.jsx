import React from 'react';

export const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', disabled = false }) => {
  const baseStyle = "px-4 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 text-sm";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:bg-blue-300 disabled:shadow-none",
    secondary: "bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 disabled:bg-gray-50",
    danger: "bg-red-50 text-red-500 hover:bg-red-100",
    ghost: "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
  };

  return (
    <button 
      type={type} 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export const Input = ({ label, value, onChange, placeholder, type = "text", icon: Icon, onIconClick, readOnly, className = "" }) => (
  <div className={`mb-4 ${className}`}>
    {label && <label className="block text-xs font-semibold text-gray-500 mb-2 ml-1 tracking-wide">{label}</label>}
    <div className="relative group">
      <input
        type={type}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        placeholder={placeholder}
        className={`w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white block p-3.5 ${Icon ? 'pr-12' : ''} placeholder-gray-400 transition-all duration-200`}
      />
      {Icon && (
        <button 
          type="button"
          onClick={onIconClick}
          className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 group-focus-within:text-blue-500 hover:text-blue-600 cursor-pointer transition-colors"
        >
          <Icon size={20} />
        </button>
      )}
    </div>
  </div>
);

export const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 p-5 ${className}`}>
    {children}
  </div>
);