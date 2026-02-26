import React, { useState, useCallback, useEffect } from 'react';
import { Package, ArrowDownLeft, ArrowUpRight, Users, BarChart2, LayoutDashboard, LogOut, ShieldCheck } from 'lucide-react';

// --- 1. Firebase Imports ---
import { db } from './firebase'; 
import { 
  collection, onSnapshot, doc, deleteDoc, query, orderBy, 
  setDoc, where 
} from "firebase/firestore"; 

// --- 2. Components Imports ---
import ProductView from './components/ProductView';
import SalesTerminal from './components/SalesTerminal';
import StockIntake from './components/StockIntake';
import ReportView from './components/ReportView';
import MembershipView from './components/MembershipView'; 
import StaffManagementView from './components/StaffManagementView';
import BottomNavigation from './components/BottomNavigation';
import ScannerModal from './components/ScannerModal'; 
import LoginView from './components/LoginView'; 

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
  
  const [memberSettings, setMemberSettings] = useState({ 
    bahtPerPoint: 20, pointExpiryDays: 0, pointValue: 1, shopName: "กำลังโหลด..." 
  });
  
  const [heldBills, setHeldBills] = useState([]); 

  // --- 3. ระบบ Real-time Cloud Sync ---
  useEffect(() => {
    if (!user?.shopId) return; 
    const sid = user.shopId;

    // A. ดึงข้อมูลการตั้งค่าร้าน
    const settingsRef = doc(db, "settings", sid); 
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
        if (docSnap.exists()) {
            setMemberSettings(docSnap.data());
        } else {
            const defaultSettings = {
                shopName: user.shopName || "ร้านค้าใหม่ของคุณ",
                bahtPerPoint: 10,
                pointExpiryDays: 0,
                shopId: sid
            };
            setDoc(settingsRef, defaultSettings).catch(err => console.error("Init error:", err));
            setMemberSettings(defaultSettings);
        }
    });

    // B. ดึงรายชื่อพนักงานในร้าน
    const qUsers = query(collection(db, "users"), where("shopId", "==", sid));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
        setUsers(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    });

    // C. ดึงรายการสินค้า (กรองตามร้าน และเรียงชื่อ)
    // ⚠️ ถ้า Error 400 ให้กดลิงก์ใน Console เพื่อสร้าง Index ใน Firebase นะครับ
    const qProd = query(collection(db, "products"), where("shopId", "==", sid), orderBy("name", "asc"));
    const unsubProd = onSnapshot(qProd, (snap) => {
        setProducts(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    });

    // D. ดึงรายชื่อลูกค้าสมาชิก
    const qCust = query(collection(db, "customers"), where("shopId", "==", sid));
    const unsubCust = onSnapshot(qCust, (snap) => {
        setCustomers(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    });

    // E. ดึงประวัติธุรกรรม
    const qTrans = query(collection(db, "transactions"), where("shopId", "==", sid), orderBy("date", "desc"));
    const unsubTrans = onSnapshot(qTrans, (snap) => {
        setTransactions(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    });

    return () => { 
        unsubSettings(); unsubUsers(); unsubProd(); unsubCust(); unsubTrans(); 
    };
  }, [user?.shopId]);

  const menuItems = allMenuItems.filter(item => user && user.role && item.roles.includes(user.role));

  const handleLogout = () => {
    if(window.confirm('ยืนยันการออกจากระบบ?')) {
        setUser(null);
        setActiveTab('products');
    }
  };

  // 🟢 ปรับปรุงฟังก์ชันคำนวณสต็อกให้แม่นยำขึ้นโดยดึงจาก Cloud Field ตรงๆ
  const calculateStock = useCallback((productId) => {
    const p = products.find(prod => prod.id === productId);
    return p ? Number(p.stock || 0) : 0;
  }, [products]);

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

  // ป้องกันหน้าจอขาวระหว่างโหลดข้อมูลร้านค้า
  if (user && !memberSettings.shopId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">กำลังเตรียมข้อมูลร้านค้า...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar สำหรับคอมพิวเตอร์ */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col sticky top-0 h-screen shadow-sm z-50">
        <div className="p-6 border-b flex items-center gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg"><LayoutDashboard size={20}/></div>
          <span className="font-black text-xl tracking-tight text-slate-800 uppercase">
            {memberSettings.shopName || "POS NAJA"}
          </span>
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
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                    {(user?.name || '?')[0]}
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
          <span className="font-black text-blue-600 tracking-tight uppercase">{memberSettings.shopName || "MY POS"}</span>
          <div className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase tracking-widest">{activeTab}</div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50/50 scrollbar-hide">
          <div className="max-w-[1600px] mx-auto pb-32 md:pb-8">
            
            {/* 1. หน้าคลังสินค้า */}
            {activeTab === 'products' && (
              <ProductView 
                user={user} 
                products={products} 
                viewState={viewState} 
                setViewState={setViewState} 
                calculateStock={calculateStock} 
                handleScanQR={handleScanQR} 
                userRole={user.role}
                handleDeleteProduct={async (id) => {
                    if(window.confirm('ยืนยันการลบสินค้าจากคลาวด์?')) {
                        await deleteDoc(doc(db, "products", id));
                    }
                }}
              />
            )}
            
            {/* 2. หน้าสมาชิก (🟢 ส่ง user ไปให้แล้ว) */}
            {activeTab === 'members' && (
              <MembershipView 
                user={user}
                customers={customers} 
                settings={memberSettings} 
                setSettings={setMemberSettings} 
              />
            )}
            
            {/* 3. หน้าขายสินค้า (🟢 ส่ง currentUser={user} ไปตามที่ SalesTerminal ต้องการ) */}
            {activeTab === 'sell' && (
              <SalesTerminal 
                currentUser={user} 
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

            {/* 4. หน้าซื้อสต็อกเข้า */}
            {activeTab === 'buy' && (
              <StockIntake 
                user={user}
                products={products}
                generateDocNo={generateDocNo}
                handleScanQR={handleScanQR}
                calculateStock={calculateStock}
              />
            )}
            
            {/* 5. หน้ารายงาน และ จัดการพนักงาน */}
            {activeTab === 'reports' && <ReportView products={products} transactions={transactions} calculateStock={calculateStock} handleScanQR={handleScanQR} memberSettings={memberSettings} />}
            {activeTab === 'staff_manage' && <StaffManagementView users={users} currentUser={user} />}
          </div>
        </main>

        <div className="md:hidden">
          <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} menuItems={menuItems} onLogout={handleLogout} />
        </div>
      </div>

      <ScannerModal 
        isOpen={showScanner} 
        onClose={() => setShowScanner(false)} 
        onScan={(text) => { if(scanCallback) scanCallback(text); }} 
      />
    </div>
  );
}