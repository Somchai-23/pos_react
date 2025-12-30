import React, { useState, useCallback } from 'react';

// Import Components จากโฟลเดอร์ components ที่เราแยกไว้
import ProductView from './components/ProductView';
import TransactionView from './components/TransactionView';
import ReportView from './components/ReportView';
import BottomNavigation from './components/BottomNavigation';
import ScannerModal from './components/ScannerModal'; // เรียกใช้ตัวสแกนที่เราเพิ่งสร้าง

export default function POSStockApp() {
  // State หลัก
  const [activeTab, setActiveTab] = useState('products');
  
  // ข้อมูลสินค้า (Mock Data)
  const [products, setProducts] = useState([
    { id: 1, code: '8850001', name: 'เสื้อยืด Cotton (ขาว)', unit: 'ตัว', sellPrice: 250, buyPrice: 120, minStock: 10, img: '👕' },
    { id: 2, code: '8850002', name: 'กางเกงยีนส์ Slim', unit: 'ตัว', sellPrice: 890, buyPrice: 450, minStock: 5, img: '👖' },
    { id: 3, code: '8850003', name: 'หมวกแก๊ป', unit: 'ใบ', sellPrice: 199, buyPrice: 80, minStock: 20, img: '🧢' },
  ]);
  
  const [transactions, setTransactions] = useState([]);
  const [viewState, setViewState] = useState('list');
  
  // --- ส่วนจัดการ Scanner (ของจริง) ---
  const [showScanner, setShowScanner] = useState(false);
  const [scanCallback, setScanCallback] = useState(null); // เก็บฟังก์ชันปลายทางที่จะรับค่าบาร์โค้ด

  // ฟังก์ชันนี้จะถูกส่งไปให้หน้า ProductView และ TransactionView ใช้
  const handleScanQR = (callback) => {
    setScanCallback(() => callback); // เก็บ callback ไว้
    setShowScanner(true);            // สั่งเปิด ScannerModal
  };

  // เมื่อ ScannerModal อ่านค่าเสร็จ จะส่งค่ากลับมาที่นี่
  const handleScanSuccess = (decodedText) => {
    if (scanCallback) {
        scanCallback(decodedText); // ส่งเลขบาร์โค้ดกลับไปให้ช่อง Input
    }
    // (สามารถเพิ่มเสียง Beep ตรงนี้ได้ถ้าต้องการ)
  };
  // ------------------------------------

  const generateDocNo = (type) => {
    const prefix = type === 'IN' ? 'PO' : 'INV';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${date}-${random}`;
  };

  const calculateStock = useCallback((productId) => {
    const incoming = transactions.filter(t => t.type === 'IN').flatMap(t => t.items).filter(i => i.productId === productId).reduce((sum, i) => sum + Number(i.qty), 0);
    const outgoing = transactions.filter(t => t.type === 'OUT').flatMap(t => t.items).filter(i => i.productId === productId).reduce((sum, i) => sum + Number(i.qty), 0);
    return 50 + incoming - outgoing;
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
                  handleScanQR={handleScanQR} // ส่งฟังก์ชันเปิดกล้องไปให้ใช้
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
                  handleScanQR={handleScanQR} // ส่งฟังก์ชันเปิดกล้องไปให้ใช้
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
                  handleScanQR={handleScanQR} // ส่งฟังก์ชันเปิดกล้องไปให้ใช้
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

        {/* Bottom Navigation */}
        <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
        
        {/* Scanner Modal (ของจริง) */}
        <ScannerModal 
            isOpen={showScanner} 
            onClose={() => setShowScanner(false)} 
            onScan={handleScanSuccess} 
        />
        
      </div>
    </div>
  );
}