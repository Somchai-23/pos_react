    import React from 'react';
import { Package, BarChart2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export default function BottomNavigation({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: 'products', icon: Package, label: 'สต็อก' },
    { id: 'buy', icon: ArrowDownLeft, label: 'ซื้อเข้า' },
    { id: 'sell', icon: ArrowUpRight, label: 'ขายออก' },
    { id: 'reports', icon: BarChart2, label: 'รายงาน' },
  ];

  return (
    <div className="bg-white/80 backdrop-blur-md border-t border-gray-200 fixed bottom-0 w-full z-50 safe-area-bottom">
      <div className="max-w-md mx-auto px-6 py-2 flex justify-between items-center">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 ${
              activeTab === item.id 
                ? 'text-blue-600 bg-blue-50 scale-105' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            <item.icon strokeWidth={activeTab === item.id ? 2.5 : 2} size={24} />
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}