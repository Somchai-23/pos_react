import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, QrCode, ShoppingCart, Trash2, CheckCircle, 
  Plus, ArrowDownLeft, ArrowUpRight, PauseCircle, PlayCircle, X 
} from 'lucide-react';
import { Button, Input, Card } from './UIComponents';

export default function TransactionView({ 
  type, 
  products, 
  transactions, 
  setTransactions, 
  setViewState, 
  generateDocNo, 
  handleScanQR, 
  heldBills = [], 
  setHeldBills 
}) {
    const [selectedProduct, setSelectedProduct] = useState('');
    const [qty, setQty] = useState(1);
    const [price, setPrice] = useState(0);
    const [cart, setCart] = useState([]);
    const [cartNote, setCartNote] = useState('');
    const [showHeldBills, setShowHeldBills] = useState(false); 
    const [currentDocNo, setCurrentDocNo] = useState('');

    // สร้างเลขที่บิลใหม่เมื่อเปลี่ยนประเภท (IN/OUT)
    useEffect(() => {
        setCart([]);
        setCartNote('');
        setCurrentDocNo(generateDocNo(type));
        setSelectedProduct('');
    }, [type, generateDocNo]);

    // ฟังก์ชันคำนวณสต็อกคงเหลือปัจจุบัน (ใช้เช็คก่อนขาย)
    const getCurrentStock = (productId) => {
        const incoming = transactions.filter(t => t.type === 'IN').flatMap(t => t.items).filter(i => i.productId === productId).reduce((sum, i) => sum + Number(i.qty), 0);
        const outgoing = transactions.filter(t => t.type === 'OUT').flatMap(t => t.items).filter(i => i.productId === productId).reduce((sum, i) => sum + Number(i.qty), 0);
        return incoming - outgoing;
    };

    // ฟังก์ชันเพิ่มสินค้าลงตะกร้า (หัวใจสำคัญของความเข้มงวด)
    const addToCart = () => {
        const product = products.find(p => p.id === Number(selectedProduct));
        
        // --- 1. ตรวจสอบว่ามีสินค้าในระบบหรือไม่ ---
        if (!product) {
            alert('⚠️ ไม่พบรายการสินค้า! กรุณาสร้างข้อมูลสินค้าในเมนู "สต็อก" ก่อนทำรายการซื้อเข้าหรือขายออก');
            return;
        }

        // --- 2. ถ้าเป็นขาย (OUT) ต้องเช็คว่าของพอไหม ---
        if (type === 'OUT') {
            const stockLeft = getCurrentStock(product.id);
            const inCart = cart.find(i => i.productId === product.id)?.qty || 0;
            if (inCart + Number(qty) > stockLeft) {
                alert(`❌ สินค้าไม่พอขาย! (คงเหลือในคลัง: ${stockLeft} ${product.unit})`);
                return;
            }
        }

        // --- 3. บันทึกลงตะกร้า ---
        const existingIdx = cart.findIndex(item => item.productId === product.id);
        if (existingIdx > -1) {
            const newCart = [...cart];
            newCart[existingIdx].qty += Number(qty);
            newCart[existingIdx].total = newCart[existingIdx].qty * newCart[existingIdx].price;
            setCart(newCart);
        } else {
            setCart([...cart, {
                productId: product.id,
                name: product.name,
                qty: Number(qty),
                price: Number(price),
                total: Number(qty) * Number(price),
                unit: product.unit
            }]);
        }
        
        // Reset ฟอร์มเล็กๆ หลังเพิ่มเสร็จ
        setQty(1);
        setSelectedProduct('');
    };

    const handleProductSelect = (e) => {
        const pid = e.target.value;
        setSelectedProduct(pid);
        const product = products.find(p => p.id === Number(pid));
        if (product) {
            setPrice(type === 'IN' ? product.buyPrice : product.sellPrice);
        }
    };

    const handleScan = () => {
        handleScanQR((code) => {
            const product = products.find(p => p.code === code);
            if (product) {
                setSelectedProduct(product.id);
                setPrice(type === 'IN' ? product.buyPrice : product.sellPrice);
            } else {
                alert('❌ ไม่พบรหัสสินค้านี้ในระบบ! กรุณาเพิ่มสินค้าก่อนสแกน');
            }
        });
    };

    // --- ระบบพักบิล ---
    const handleHoldBill = () => {
        if (cart.length === 0) return;
        const billData = {
            id: Date.now(),
            items: cart,
            totalAmount: cart.reduce((sum, item) => sum + item.total, 0),
            note: cartNote || `พักบิล: ${new Date().toLocaleTimeString('th-TH')}`,
            date: new Date().toISOString(),
            type: type
        };
        setHeldBills([...heldBills, billData]);
        setCart([]);
        setCartNote('');
        alert('📦 พักบิลเรียบร้อยแล้ว');
    };

    const handleRestoreBill = (bill) => {
        setCart(bill.items);
        setCartNote(bill.note);
        setHeldBills(heldBills.filter(b => b.id !== bill.id));
        setShowHeldBills(false);
    };

    // --- ระบบบันทึกรายการ (ยืนยันบิล) ---
    const saveTransaction = () => {
        if (cart.length === 0) return;
        
        const newTransaction = {
            id: Date.now(),
            type,
            docNo: currentDocNo,
            date: new Date().toISOString(),
            items: cart,
            totalAmount: cart.reduce((sum, item) => sum + item.total, 0),
            note: cartNote
        };

        setTransactions([...transactions, newTransaction]);
        setCart([]);
        setCartNote('');
        setCurrentDocNo(generateDocNo(type)); // รันเลขบิลถัดไป
        alert('✅ บันทึกรายการสำเร็จ!');
    };

    const grandTotal = cart.reduce((sum, item) => sum + item.total, 0);
    const currentHeldBills = heldBills.filter(b => b.type === type);

    return (
      <div className="p-4 md:p-8 h-full flex flex-col max-w-4xl mx-auto relative pb-24">
        
        {/* Header Section */}
        <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${type === 'IN' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                    {type === 'IN' ? <ArrowDownLeft size={28} /> : <ArrowUpRight size={28} />}
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{type === 'IN' ? 'ซื้อสินค้าเข้า' : 'ขายสินค้าออก'}</h1>
                    <p className="text-gray-500 text-sm font-mono">{currentDocNo}</p>
                </div>
            </div>
            
            {currentHeldBills.length > 0 && (
                <button onClick={() => setShowHeldBills(true)} className="flex items-center gap-2 px-3 py-2 bg-amber-100 text-amber-700 rounded-xl font-bold text-xs animate-pulse">
                    <PauseCircle size={18} /> พักไว้ {currentHeldBills.length}
                </button>
            )}
        </div>

        {/* Input Card */}
        <Card className="mb-6 !p-6 border-blue-100 shadow-md">
          <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <select 
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl p-3.5 appearance-none focus:ring-2 focus:ring-blue-500"
                    value={selectedProduct}
                    onChange={handleProductSelect}
                >
                    <option value="">-- ค้นหาสินค้าที่มีในคลัง --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.code} | {p.name}</option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
                    <ChevronRight className="rotate-90" size={18} />
                </div>
              </div>
              <Button variant="secondary" onClick={handleScan} className="px-4">
                  <QrCode size={22} />
              </Button>
          </div>
          
          {selectedProduct && (
            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                <Input label="ราคาต่อหน่วย" type="number" value={price} onChange={e => setPrice(e.target.value)} />
                <Input label="จำนวน" type="number" value={qty} onChange={e => setQty(e.target.value)} />
                <Button onClick={addToCart} className="col-span-full py-3 bg-blue-600 text-white">
                    <Plus size={18} /> เพิ่มเข้าบิล
                </Button>
            </div>
          )}
        </Card>

        {/* Cart List */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-6">
          {cart.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50/50">
              <ShoppingCart className="mx-auto mb-3 text-gray-200" size={64} />
              <p className="text-gray-400 font-medium">ไม่มีรายการสินค้าในบิลนี้</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 text-gray-500 rounded-lg flex items-center justify-center font-bold">{idx + 1}</div>
                    <div>
                        <div className="font-bold text-gray-800">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.qty} {item.unit} x ฿{item.price.toLocaleString()}</div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-gray-900">฿{item.total.toLocaleString()}</span>
                  <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-400 p-2 hover:bg-red-50 rounded-lg">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Sum */}
        <div className="bg-white border-t border-gray-100 p-6 -mx-4 md:-mx-8 -mb-8 mt-auto rounded-t-[32px] shadow-2xl z-10">
           <div className="max-w-4xl mx-auto">
               <Input placeholder="หมายเหตุประจำบิล..." value={cartNote} onChange={e => setCartNote(e.target.value)} className="mb-4" />
               <div className="flex justify-between items-end mb-5">
                  <span className="text-gray-500 font-medium">ยอดรวม ({cart.length} รายการ)</span>
                  <span className="text-3xl font-black text-blue-600 tracking-tight">฿{grandTotal.toLocaleString()}</span>
               </div>
               <div className="flex gap-3">
                   <Button variant="secondary" className="flex-1 py-4 text-amber-600 bg-amber-50 border-amber-100" onClick={handleHoldBill} disabled={cart.length === 0}>
                     <PauseCircle size={20} /> พักบิล
                   </Button>
                   <Button className="flex-[2] py-4 text-lg font-bold shadow-xl" onClick={saveTransaction} disabled={cart.length === 0}>
                     <CheckCircle /> บันทึกบิล{type === 'IN' ? 'รับเข้า' : 'ขายออก'}
                   </Button>
               </div>
           </div>
        </div>

        {/* Modal พักบิล */}
        {showHeldBills && (
            <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
                <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-3xl overflow-hidden flex flex-col max-h-[70vh]">
                    <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-lg flex items-center gap-2"><PauseCircle className="text-amber-500" /> บิลที่พักไว้</h3>
                        <button onClick={() => setShowHeldBills(false)} className="p-2 bg-gray-200 rounded-full"><X size={18}/></button>
                    </div>
                    <div className="p-4 overflow-y-auto space-y-3">
                        {currentHeldBills.map(bill => (
                            <div key={bill.id} className="border border-gray-100 p-4 rounded-2xl flex justify-between items-center bg-gray-50 hover:border-blue-300">
                                <div>
                                    <p className="font-bold text-sm text-gray-800">{bill.note}</p>
                                    <p className="text-[10px] text-gray-400">{new Date(bill.date).toLocaleString('th-TH')}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-blue-600 mr-2">฿{bill.totalAmount.toLocaleString()}</span>
                                    <button onClick={() => handleRestoreBill(bill)} className="p-2 bg-blue-600 text-white rounded-lg"><PlayCircle size={18}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
      </div>
    );
}