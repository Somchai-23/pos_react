import React from 'react';
import { Package, BarChart2, ArrowDownLeft, ArrowUpRight, Users } from 'lucide-react';

export default function BottomNavigation({ activeTab, setActiveTab }) {
  // เพิ่มรายการเมนู 'members' เข้าไปใน Array
  const menuItems = [
    { id: 'products', icon: Package, label: 'สต็อก' },
    { id: 'buy', icon: ArrowDownLeft, label: 'ซื้อเข้า' },
    { id: 'sell', icon: ArrowUpRight, label: 'ขายออก' },
    { id: 'members', icon: Users, label: 'สมาชิก' }, // <--- เมนูใหม่
    { id: 'reports', icon: BarChart2, label: 'รายงาน' },
  ];

  return (
    <div className="bg-white/80 backdrop-blur-md border-t border-gray-200 fixed bottom-0 w-full z-50 safe-area-bottom shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
      <div className="max-w-md mx-auto px-4 py-2 flex justify-between items-center">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all duration-300 min-w-[64px] ${
              activeTab === item.id 
                ? 'text-blue-600 bg-blue-50/80 scale-105 shadow-sm' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            <item.icon 
              strokeWidth={activeTab === item.id ? 2.5 : 2} 
              size={22} 
              className={activeTab === item.id ? 'animate-in zoom-in-75' : ''}
            />
            <span className={`text-[10px] font-bold ${activeTab === item.id ? 'opacity-100' : 'opacity-70'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}