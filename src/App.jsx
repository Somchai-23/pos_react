import React, { useState, useCallback } from 'react';

// Import Components จากโฟลเดอร์ components
import ProductView from './components/ProductView';
import TransactionView from './components/TransactionView';
import ReportView from './components/ReportView';
import BottomNavigation from './components/BottomNavigation';
import ScannerModal from './components/ScannerModal'; 

export default function POSStockApp() {
  const [activeTab, setActiveTab] = useState('products');
  
  // ข้อมูลสินค้า (Mock Data)
  const [products, setProducts] = useState([
    { id: 1, code: '8850001', name: 'เสื้อยืด Cotton (ขาว)', unit: 'ตัว', sellPrice: 250, buyPrice: 120, minStock: 10, img: '👕' },
    { id: 2, code: '8850002', name: 'กางเกงยีนส์ Slim', unit: 'ตัว', sellPrice: 890, buyPrice: 450, minStock: 5, img: '👖' },
    { id: 3, code: '8850003', name: 'หมวกแก๊ป', unit: 'ใบ', sellPrice: 199, buyPrice: 80, minStock: 20, img: '🧢' },
  ]);
  
  const [transactions, setTransactions] = useState([]);
  const [heldBills, setHeldBills] = useState([]); // [New] ตัวแปรเก็บรายการพักบิล
  const [viewState, setViewState] = useState('list');
  
  // --- ส่วนจัดการ Scanner ---
  const [showScanner, setShowScanner] = useState(false);
  const [scanCallback, setScanCallback] = useState(null); 

  const handleScanQR = (callback) => {
    setScanCallback(() => callback); 
    setShowScanner(true);            
  };

  const handleScanSuccess = (decodedText) => {
    if (scanCallback) {
        scanCallback(decodedText); 
    }
  };
  // -------------------------

  const handleDeleteProduct = (productId) => {
    if (window.confirm('คุณแน่ใจหรือไม่ที่จะลบสินค้านี้?')) {
        setProducts(products.filter(p => p.id !== productId));
    }
  };

  const generateDocNo = (type) => {
    const prefix = type === 'IN' ? 'PO' : 'INV';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${date}-${random}`;
  };

  const calculateStock = useCallback((productId) => {
    const incoming = transactions.filter(t => t.type === 'IN').flatMap(t => t.items).filter(i => i.productId === productId).reduce((sum, i) => sum + Number(i.qty), 0);
    const outgoing = transactions.filter(t => t.type === 'OUT').flatMap(t => t.items).filter(i => i.productId === productId).reduce((sum, i) => sum + Number(i.qty), 0);
    return 0 + incoming - outgoing;
  }, [transactions]);

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans text-gray-900">
      <div className="h-screen overflow-hidden flex flex-col">
        
        {/* Content Area */}
        <main className="flex-1 overflow-y-auto scroll-smooth pb-20">
            {activeTab === 'products' && (
                <ProductView 
                  products={products} 
                  setProducts={setProducts} 
                  viewState={viewState} 
                  setViewState={setViewState} 
                  calculateStock={calculateStock} 
                  handleScanQR={handleScanQR} 
                  handleDeleteProduct={handleDeleteProduct}
                />
            )}
            {activeTab === 'sell' && (
                <TransactionView 
                  type="OUT" 
                  products={products} 
                  transactions={transactions} 
                  setTransactions={setTransactions} 
                  setViewState={setViewState} 
                  generateDocNo={generateDocNo} 
                  handleScanQR={handleScanQR}
                  heldBills={heldBills}        // ส่งรายการพักบิลลงไป
                  setHeldBills={setHeldBills}  // ส่งฟังก์ชันอัปเดตลงไป
                />
            )}
            {activeTab === 'buy' && (
                <TransactionView 
                  type="IN" 
                  products={products} 
                  transactions={transactions} 
                  setTransactions={setTransactions} 
                  setViewState={setViewState} 
                  generateDocNo={generateDocNo} 
                  handleScanQR={handleScanQR} 
                  heldBills={heldBills} 
                  setHeldBills={setHeldBills}
                />
            )}
            {activeTab === 'reports' && (
                <ReportView 
                  products={products} 
                  transactions={transactions} 
                  calculateStock={calculateStock} 
                />
            )}
        </main>

        <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <ScannerModal 
            isOpen={showScanner} 
            onClose={() => setShowScanner(false)} 
            onScan={handleScanSuccess} 
        />
        
      </div>
    </div>
  );
}