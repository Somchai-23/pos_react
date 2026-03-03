import React from 'react';

export default function BottomNavigation({ activeTab, setActiveTab, menuItems }) {
  return (
    <div className="bg-white/90 backdrop-blur-md border-t border-gray-200 fixed bottom-0 left-0 right-0 z-50 safe-area-bottom shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
      {/* 🟢 ปรับให้เป็น flex และใช้ gap ที่เหมาะสมสำหรับ 6 เมนู */}
      <div className="max-w-lg mx-auto px-1 py-1.5 flex justify-between items-center">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 gap-1 p-1 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'text-blue-600 bg-blue-50/50 scale-105' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon 
                strokeWidth={isActive ? 2.5 : 2} 
                size={20} 
                className={isActive ? 'animate-in zoom-in-75' : ''}
              />
              <span className={`text-[9px] font-black uppercase tracking-tighter ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}