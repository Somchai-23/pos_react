import React, { useState, useCallback, useEffect } from 'react';
import { Package, ArrowDownLeft, ArrowUpRight, Users, BarChart2, LayoutDashboard, LogOut, ShieldCheck } from 'lucide-react';

// --- 1. Firebase Imports ---
import { db } from './firebase'; 
import { collection, onSnapshot, doc, deleteDoc, query, orderBy } from "firebase/firestore"; 

// --- 2. Components Imports ---
import ProductView from './components/ProductView';
import TransactionView from './components/TransactionView';
import ReportView from './components/ReportView';
import MembershipView from './components/MembershipView'; 
import StaffManagementView from './components/StaffManagementView';
import BottomNavigation from './components/BottomNavigation';
import ScannerModal from './components/ScannerModal'; 
import LoginView from './components/LoginView'; 

// --- 3. Menu Configuration (ย้ายมาไว้นอก Component เพื่อป้องกัน Error) ---
const allMenuItems = [
  { id: 'products', icon: Package, label: 'คลังสินค้า', roles: ['OWNER', 'STAFF'] },
  { id: 'buy', icon: ArrowDownLeft, label: 'ซื้อเข้าสต็อก', roles: ['OWNER', 'STAFF'] },
  { id: 'sell', icon: ArrowUpRight, label: 'ขายสินค้า', roles: ['OWNER', 'STAFF'] },
  { id: 'members', icon: Users, label: 'สมาชิก', roles: ['OWNER', 'STAFF'] },
  { id: 'staff_manage', icon: ShieldCheck, label: 'จัดการพนักงาน', roles: ['OWNER'] },
  { id: 'reports', icon: BarChart2, label: 'รายงาน', roles: ['OWNER'] }, 
];

export default function POSStockApp() {
  // --- States หลัก ---
  const [user, setUser] = useState(null); 
  const [activeTab, setActiveTab] = useState('products');
  const [viewState, setViewState] = useState('list');
  
  // Data States (เริ่มต้นเป็นค่าว่าง เพื่อรอโหลดจาก Cloud)
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [memberSettings, setMemberSettings] = useState({ bahtPerPoint: 20, pointExpiryDays: 0, pointValue: 1 });
  const [heldBills, setHeldBills] = useState([]); 

  // --- 4. ระบบ Real-time Cloud Sync ---
  useEffect(() => {
    // ดึงข้อมูลพนักงาน
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    });

    // ดึงข้อมูลสินค้า (เรียงตามชื่อ)
    const qProd = query(collection(db, "products"), orderBy("name", "asc"));
    const unsubProd = onSnapshot(qProd, (snap) => {
      setProducts(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    });

    // ดึงข้อมูลสมาชิก
    const unsubCust = onSnapshot(collection(db, "customers"), (snap) => {
      setCustomers(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    });

    // ดึงข้อมูลประวัติการขาย (เรียงตามวันที่ล่าสุด)
    const qTrans = query(collection(db, "transactions"), orderBy("date", "desc"));
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

  // --- หน้า Login ---
  if (!user) return <LoginView users={users} onLogin={(data) => setUser(data)} />;

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col sticky top-0 h-screen shadow-sm z-50">
        <div className="p-6 border-b flex items-center gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100"><LayoutDashboard size={20}/></div>
          <span className="font-black text-xl tracking-tight text-slate-800">MY POS CLOUD</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setViewState('list'); }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50'}`}>
              <item.icon size={20} />
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t">
            <div className="mb-4 px-4 py-3 bg-slate-50 rounded-xl flex items-center gap-3">
                {/* ใช้ Optional Chaining เพื่อป้องกันจอขาว */}
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

        <main className="flex-1 overflow-y-auto bg-slate-50/50">
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
            {activeTab === 'members' && <MembershipView customers={customers} setCustomers={setCustomers} settings={memberSettings} setSettings={setMemberSettings} />}
            
            {activeTab === 'sell' && (
              <TransactionView 
                type="OUT" products={products} transactions={transactions} setTransactions={setTransactions} 
                setViewState={setViewState} generateDocNo={generateDocNo} handleScanQR={handleScanQR}
                heldBills={heldBills} setHeldBills={setHeldBills} customers={customers} setCustomers={setCustomers} 
                memberSettings={memberSettings} calculateStock={calculateStock}
              />
            )}
            {activeTab === 'buy' && (
              <TransactionView 
                type="IN" products={products} transactions={transactions} setTransactions={setTransactions} 
                setViewState={setViewState} generateDocNo={generateDocNo} handleScanQR={handleScanQR} 
                heldBills={heldBills} setHeldBills={setHeldBills} customers={customers} setCustomers={setCustomers} 
                memberSettings={memberSettings} calculateStock={calculateStock}
              />
            )}
            
            {activeTab === 'reports' && <ReportView products={products} transactions={transactions} calculateStock={calculateStock} />}
            {activeTab === 'staff_manage' && <StaffManagementView users={users} setUsers={setUsers} currentUser={user} />}
          </div>
        </main>

        <div className="md:hidden">
          <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} menuItems={menuItems} onLogout={handleLogout} />
        </div>
      </div>
      <ScannerModal isOpen={showScanner} onClose={() => setShowScanner(false)} onScan={(text) => { if(scanCallback) scanCallback(text); }} />
    </div>
  );
}