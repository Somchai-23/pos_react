import React, { useState, useCallback, useEffect } from 'react';
import { Package, ArrowDownLeft, ArrowUpRight, Users, BarChart2, LayoutDashboard, LogOut, ShieldCheck } from 'lucide-react';

// --- 1. Firebase Imports ---
import { db } from './firebase'; 
import { collection, onSnapshot, doc, deleteDoc, query, orderBy } from "firebase/firestore"; 

// --- 2. Components Imports ---
import ProductView from './components/ProductView';
import SalesTerminal from './components/SalesTerminal'; // เรียกใช้หน้าขายแยก
import StockIntake from './components/StockIntake';   // เรียกใช้หน้าสต็อกแยก
import ReportView from './components/ReportView';
import MembershipView from './components/MembershipView'; 
import StaffManagementView from './components/StaffManagementView';
import BottomNavigation from './components/BottomNavigation';
import ScannerModal from './components/ScannerModal'; 
import LoginView from './components/LoginView'; 

// --- 3. Menu Configuration ---
const allMenuItems = [
  { id: 'products', icon: Package, label: 'คลังสินค้า', roles: ['OWNER', 'STAFF'] },
  { id: 'buy', icon: ArrowDownLeft, label: 'ซื้อเข้าสต็อก', roles: ['OWNER', 'STAFF'] },
  { id: 'sell', icon: ArrowUpRight, label: 'ขายสินค้า', roles: ['OWNER', 'STAFF'] },
  { id: 'members', icon: Users, label: 'สมาชิก', roles: ['OWNER', 'STAFF'] },
  { id: 'staff_manage', icon: ShieldCheck, label: 'จัดการพนักงาน', roles: ['OWNER'] },
  { id: 'reports', icon: BarChart2, label: 'รายงาน', roles: ['OWNER'] }, 
];

export default function POSStockApp() {
  const [user, setUser] = useState(null); 
  const [activeTab, setActiveTab] = useState('products');
  const [viewState, setViewState] = useState('list');
  
  // Data States
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [memberSettings, setMemberSettings] = useState({ bahtPerPoint: 20, pointExpiryDays: 0, pointValue: 1 });
  
  // 🟢 State สำหรับพักบิล (ประกาศไว้ที่นี่เพื่อให้ข้อมูลไม่หายเมื่อสลับหน้า)
  const [heldBills, setHeldBills] = useState([]); 

  // --- 4. ระบบ Real-time Cloud Sync ---
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    });

    const qProd = query(collection(db, "products"), orderBy("name", "asc"));
    const unsubProd = onSnapshot(qProd, (snap) => {
      setProducts(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    });

    const unsubCust = onSnapshot(collection(db, "customers"), (snap) => {
      setCustomers(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    });

    const qTrans = query(collection(db, "transactions"), orderBy("createdAt", "desc"));
    const unsubTrans = onSnapshot(qTrans, (snap) => {
      setTransactions(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    });

    return () => { unsubUsers(); unsubProd(); unsubCust(); unsubTrans(); };
  }, []);

  // --- 5. ระบบเมนูและสิทธิ์ ---
  const menuItems = allMenuItems.filter(item => user && user.role && item.roles.includes(user.role));

  const handleLogout = () => {
    if(window.confirm('ยืนยันการออกจากระบบ?')) {
        setUser(null);
        setActiveTab('products');
    }
  };

  // ฟังก์ชันคำนวณสต็อกแบบ Real-time จาก Transactions
  const calculateStock = useCallback((productId) => {
    const incoming = transactions.filter(t => t.type === 'IN').flatMap(t => t.items).filter(i => i.productId === productId).reduce((sum, i) => sum + Number(i.qty), 0);
    const outgoing = transactions.filter(t => t.type === 'OUT').flatMap(t => t.items).filter(i => i.productId === productId).reduce((sum, i) => sum + Number(i.qty), 0);
    return incoming - outgoing;
  }, [transactions]);

  const generateDocNo = (type) => {
    const prefix = type === 'IN' ? 'PO' : 'INV';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${date}-${random}`;
  };

  const [showScanner, setShowScanner] = useState(false);
  const [scanCallback, setScanCallback] = useState(null); 
  const handleScanQR = (callback) => { setScanCallback(() => callback); setShowScanner(true); };

  if (!user) return <LoginView users={users} onLogin={(data) => setUser(data)} />;

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col sticky top-0 h-screen shadow-sm z-50">
        <div className="p-6 border-b flex items-center gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100"><LayoutDashboard size={20}/></div>
          <span className="font-black text-xl tracking-tight text-slate-800 uppercase">POS NAJA</span>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setViewState('list'); }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50'}`}>
              <item.icon size={20} />
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t bg-white">
            <div className="mb-4 px-4 py-3 bg-slate-50 rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">
                    {user?.name ? user.name[0] : '?'}
                </div>
                <div className="overflow-hidden">
                    <p className="text-[10px] font-black text-slate-800 truncate uppercase">{user?.name || 'Unknown'}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{user?.role || 'No Role'}</p>
                </div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 font-bold text-sm hover:bg-red-50 rounded-xl transition-all">
                <LogOut size={18} className="rotate-180" /> ออกจากระบบ
            </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="md:hidden bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-40">
          <span className="font-black text-blue-600 tracking-tight">MY POS</span>
          <div className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase tracking-widest">{activeTab}</div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50/50 scrollbar-hide">
          <div className="max-w-[1600px] mx-auto pb-32 md:pb-8">
            {activeTab === 'products' && (
              <ProductView 
                products={products} setProducts={setProducts} viewState={viewState} setViewState={setViewState} 
                calculateStock={calculateStock} handleScanQR={handleScanQR} userRole={user.role}
                handleDeleteProduct={async (id) => {
                    if(window.confirm('ยืนยันการลบสินค้าจากคลาวด์?')) {
                        await deleteDoc(doc(db, "products", id));
                    }
                }}
              />
            )}
            
            {activeTab === 'members' && <MembershipView customers={customers} settings={memberSettings} setSettings={setMemberSettings} />}
            
            {/* 🔵 หน้าขายสินค้า (ใช้ SalesTerminal แยกออกมา) */}
            {activeTab === 'sell' && (
              <SalesTerminal 
                products={products}
                generateDocNo={generateDocNo}
                handleScanQR={handleScanQR}
                customers={customers}
                memberSettings={memberSettings}
                calculateStock={calculateStock}
                heldBills={heldBills}
                setHeldBills={setHeldBills}
              />
            )}

            {/* 🔵 หน้าซื้อสต็อกเข้า (ใช้ StockIntake แยกออกมา) */}
            {activeTab === 'buy' && (
              <StockIntake 
                products={products}
                generateDocNo={generateDocNo}
                handleScanQR={handleScanQR}
                calculateStock={calculateStock}
              />
            )}
            
            {activeTab === 'reports' && <ReportView products={products} transactions={transactions} calculateStock={calculateStock} />}
            {activeTab === 'staff_manage' && <StaffManagementView users={users} currentUser={user} />}
          </div>
        </main>

        <div className="md:hidden">
          <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} menuItems={menuItems} onLogout={handleLogout} />
        </div>
      </div>
<ScannerModal 
  isOpen={showScanner} 
  onClose={() => setShowScanner(false)} // 🟢 ต้องมั่นใจว่าบรรทัดนี้มีอยู่
  onScan={(text) => {
    if(scanCallback) scanCallback(text);
  }} 
/>
    </div>
  );//onClose={() => setShowScanner(false)}
}