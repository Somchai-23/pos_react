import React from 'react';
import { Upload } from 'lucide-react';

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

export const Input = ({ label, value, onChange, placeholder, type = "text", icon: Icon, onIconClick, readOnly, className = "", autoComplete = "off", disabled = false }) => (
  <div className={`mb-4 ${className}`}>
    {label && <label className="block text-xs font-semibold text-gray-500 mb-2 ml-1 tracking-wide">{label}</label>}
    <div className="relative group">
      <input
        type={type}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full bg-gray-50 border border-gray-200 ${disabled ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'text-gray-900'} text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white block p-3.5 ${Icon ? 'pr-12' : ''} placeholder-gray-400 transition-all duration-200`}
      />
      {Icon && (
        <button 
          type="button"
          onClick={onIconClick}
          disabled={disabled}
          className={`absolute inset-y-0 right-0 flex items-center pr-4 ${disabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 group-focus-within:text-blue-500 hover:text-blue-600 cursor-pointer'} transition-colors`}
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

// Component สำหรับอัปโหลดรูปภาพ (เพิ่มระบบเช็คขนาดไฟล์และซ่อนปุ่มเมื่อถูก disabled)
export const ImageUpload = ({ value, onChange, placeholder = "📦", disabled = false }) => {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 🟢 เพิ่มระบบเช็คขนาดไฟล์ (ไม่เกิน 2MB = 2097152 bytes)
      if (file.size > 2097152) {
        alert('⚠️ ขนาดไฟล์ใหญ่เกินไป กรุณาอัปโหลดรูปภาพขนาดไม่เกิน 2MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange(reader.result); // ส่งค่า Base64 กลับไป
      };
      reader.readAsDataURL(file);
    }
  };

  const isBase64 = value && typeof value === 'string' && value.startsWith('data:');

  return (
    <div className="flex flex-col items-center mb-6">
      {/* ส่วนแสดงผลรูปภาพ (โลโก้) */}
      <div className={`w-32 h-32 rounded-2xl flex items-center justify-center border-2 shadow-sm overflow-hidden mb-3 transition-all ${disabled ? 'border-gray-200 bg-gray-100 opacity-60' : 'border-gray-100 bg-gray-50'}`}>
        {isBase64 ? (
            <img src={value} alt="Product Logo" className="w-full h-full object-cover" />
        ) : (
            <span className="text-5xl">{value || placeholder}</span>
        )}
      </div>
      
      {/* 🟢 ซ่อนปุ่มและคำอธิบาย หากผู้ใช้ไม่มีสิทธิ์ (เช่น Staff มาดูข้อมูล) */}
      {!disabled && (
        <div className="flex flex-col items-center">
          <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-blue-600 cursor-pointer hover:bg-blue-50 transition-colors shadow-sm active:scale-95 mb-2">
            <Upload size={18} />
            <span>แนบไฟล์ภาพ</span>
            <input 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
            />
          </label>
          {/* 🟢 เพิ่มคำอธิบายสัดส่วนและขนาดไฟล์ */}
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            สัดส่วน 1:1 (จัตุรัส) • ไม่เกิน 2MB
          </p>
        </div>
      )}
    </div>
  );
};