import React, { useState, useCallback, useEffect } from 'react';
import { Package, ArrowDownLeft, ArrowUpRight, Users, BarChart2, LayoutDashboard } from 'lucide-react';

// Import Components
import ProductView from './components/ProductView';
import TransactionView from './components/TransactionView';
import ReportView from './components/ReportView';
import MembershipView from './components/MembershipView'; 
import BottomNavigation from './components/BottomNavigation';
import ScannerModal from './components/ScannerModal'; 

export default function POSStockApp() {
  const [activeTab, setActiveTab] = useState('products');
  const [viewState, setViewState] = useState('list');

  // --- ข้อมูลเบื้องต้น และระบบ LocalStorage (เหมือนเดิม) ---
  const initialProducts = [
    { id: 1, code: '8850001', name: 'เสื้อยืด Cotton (ขาว)', unit: 'ตัว', sellPrice: 250, buyPrice: 120, minStock: 10, img: '👕' },
    { id: 2, code: '8850002', name: 'กางเกงยีนส์ Slim', unit: 'ตัว', sellPrice: 890, buyPrice: 450, minStock: 5, img: '👖' },
    { id: 3, code: '8850003', name: 'หมวกแก๊ป', unit: 'ใบ', sellPrice: 199, buyPrice: 80, minStock: 20, img: '🧢' },
  ];

  const getSavedData = (key, defaultValue) => {
    const saved = localStorage.getItem(key);
    if (!saved) return defaultValue;
    const parsed = JSON.parse(saved);
    return (Array.isArray(parsed) && parsed.length === 0) ? defaultValue : parsed;
  };

  const [products, setProducts] = useState(() => getSavedData('pos_products', initialProducts));
  const [transactions, setTransactions] = useState(() => getSavedData('pos_transactions', []));
  const [customers, setCustomers] = useState(() => getSavedData('pos_customers', []));
  const [memberSettings, setMemberSettings] = useState(() => getSavedData('pos_member_settings', { bahtPerPoint: 20, pointExpiryDays: 0, pointValue: 1 }));
  const [heldBills, setHeldBills] = useState([]); 

  useEffect(() => {
    localStorage.setItem('pos_products', JSON.stringify(products));
    localStorage.setItem('pos_transactions', JSON.stringify(transactions));
    localStorage.setItem('pos_customers', JSON.stringify(customers));
    localStorage.setItem('pos_member_settings', JSON.stringify(memberSettings));
  }, [products, transactions, customers, memberSettings]);

  // --- ระบบเมนู ---
  const menuItems = [
    { id: 'products', icon: Package, label: 'คลังสินค้า' },
    { id: 'buy', icon: ArrowDownLeft, label: 'ซื้อเข้าสต็อก' },
    { id: 'sell', icon: ArrowUpRight, label: 'ขายสินค้า' },
    { id: 'members', icon: Users, label: 'สมาชิก' },
    { id: 'reports', icon: BarChart2, label: 'รายงาน' },
  ];

  const generateDocNo = (type) => {
    const prefix = type === 'IN' ? 'PO' : 'INV';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${date}-${random}`;
  };

  const calculateStock = useCallback((productId) => {
    const incoming = transactions.filter(t => t.type === 'IN').flatMap(t => t.items).filter(i => i.productId === productId).reduce((sum, i) => sum + Number(i.qty), 0);
    const outgoing = transactions.filter(t => t.type === 'OUT').flatMap(t => t.items).filter(i => i.productId === productId).reduce((sum, i) => sum + Number(i.qty), 0);
    return incoming - outgoing;
  }, [transactions]);

  const [showScanner, setShowScanner] = useState(false);
  const [scanCallback, setScanCallback] = useState(null); 
  const handleScanQR = (callback) => { setScanCallback(() => callback); setShowScanner(true); };

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      
      {/* --- SIDEBAR: สำหรับ Desktop (md ขึ้นไป) --- */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col sticky top-0 h-screen shadow-sm z-50">
        <div className="p-6 border-b flex items-center gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100"><LayoutDashboard size={20}/></div>
          <span className="font-black text-xl tracking-tight text-slate-800">MY POS</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setViewState('list'); }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>
              <item.icon size={20} />
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* --- MAIN AREA --- */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-40">
          <span className="font-black text-blue-600 tracking-tight">MY POS</span>
          <div className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase tracking-widest">{activeTab}</div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50/50">
          <div className="max-w-[1600px] mx-auto pb-32 md:pb-8">
            {activeTab === 'products' && (
              <ProductView 
                products={products} setProducts={setProducts} viewState={viewState} setViewState={setViewState} 
                calculateStock={calculateStock} handleScanQR={handleScanQR} 
                handleDeleteProduct={(id) => setProducts(products.filter(p => p.id !== id))}
              />
            )}
            {activeTab === 'members' && <MembershipView customers={customers} setCustomers={setCustomers} settings={memberSettings} setSettings={setMemberSettings} />}
            {activeTab === 'sell' && (
              <TransactionView 
                type="OUT" products={products} transactions={transactions} setTransactions={setTransactions} 
                setViewState={setViewState} generateDocNo={generateDocNo} handleScanQR={handleScanQR}
                heldBills={heldBills} setHeldBills={setHeldBills} customers={customers} setCustomers={setCustomers} memberSettings={memberSettings}
              />
            )}
            {activeTab === 'buy' && (
              <TransactionView 
                type="IN" products={products} transactions={transactions} setTransactions={setTransactions} 
                setViewState={setViewState} generateDocNo={generateDocNo} handleScanQR={handleScanQR} 
                heldBills={heldBills} setHeldBills={setHeldBills} customers={customers} setCustomers={setCustomers} memberSettings={memberSettings}
              />
            )}
            {activeTab === 'reports' && <ReportView products={products} transactions={transactions} calculateStock={calculateStock} />}
          </div>
        </main>

        {/* --- BOTTOM NAV: สำหรับ Mobile (md ซ่อน) --- */}
        <div className="md:hidden">
          <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </div>

      <ScannerModal isOpen={showScanner} onClose={() => setShowScanner(false)} onScan={(text) => { if(scanCallback) scanCallback(text); }} />
    </div>
  );
}