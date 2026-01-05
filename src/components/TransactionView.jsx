import React, { useState, useEffect } from 'react';
import { ChevronRight, QrCode, ShoppingCart, Trash2, CheckCircle, Plus, ArrowDownLeft, ArrowUpRight, PauseCircle, PlayCircle, X } from 'lucide-react';

// --- UI Components (รวมไว้ในไฟล์นี้เพื่อให้ทำงานได้ทันทีโดยไม่ติด Error) ---

const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', disabled = false }) => {
  const baseStyle = "px-4 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 text-sm";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:bg-blue-300 disabled:shadow-none",
    secondary: "bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 disabled:bg-gray-50",
    danger: "bg-red-50 text-red-500 hover:bg-red-100",
    ghost: "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
  };

  return (
    <button 
      type={type} 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Input = ({ label, value, onChange, placeholder, type = "text", icon: Icon, onIconClick, readOnly, className = "", autoComplete = "off" }) => (
  <div className={`mb-4 ${className}`}>
    {label && <label className="block text-xs font-semibold text-gray-500 mb-2 ml-1 tracking-wide">{label}</label>}
    <div className="relative group">
      <input
        type={type}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white block p-3.5 ${Icon ? 'pr-12' : ''} placeholder-gray-400 transition-all duration-200`}
      />
      {Icon && (
        <button 
          type="button"
          onClick={onIconClick}
          className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 group-focus-within:text-blue-500 hover:text-blue-600 cursor-pointer transition-colors"
        >
          <Icon size={20} />
        </button>
      )}
    </div>
  </div>
);

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 p-5 ${className}`}>
    {children}
  </div>
);

// --- Main TransactionView Component ---

export default function TransactionView({ type, products, transactions, setTransactions, setViewState, generateDocNo, handleScanQR, heldBills = [], setHeldBills }) {
    const [selectedProduct, setSelectedProduct] = useState('');
    const [qty, setQty] = useState(1);
    const [price, setPrice] = useState(0);
    const [cart, setCart] = useState([]);
    const [cartNote, setCartNote] = useState('');
    const [showHeldBills, setShowHeldBills] = useState(false); 

    useEffect(() => {
        setCart([]);
        setCartNote('');
        setViewState('list');
    }, [type, setViewState]);

    // ฟังก์ชันคำนวณสต็อกคงเหลือ (สำหรับตรวจสอบก่อนขาย)
    const getCurrentStock = (productId) => {
        const incoming = transactions.filter(t => t.type === 'IN').flatMap(t => t.items).filter(i => i.productId === productId).reduce((sum, i) => sum + Number(i.qty), 0);
        const outgoing = transactions.filter(t => t.type === 'OUT').flatMap(t => t.items).filter(i => i.productId === productId).reduce((sum, i) => sum + Number(i.qty), 0);
        return incoming - outgoing;
    };

    const addToCart = () => {
      const product = products.find(p => p.id === Number(selectedProduct));
      if (!product) return;
      
      // Validation: เช็คสต็อกก่อนขาย
      if (type === 'OUT') {
          const currentStock = getCurrentStock(product.id);
          const itemInCart = cart.find(i => i.productId === product.id);
          const currentQtyInCart = itemInCart ? itemInCart.qty : 0;
          
          if (currentQtyInCart + Number(qty) > currentStock) {
              alert(`สินค้าคงเหลือไม่พอ! (มี: ${currentStock}, ในตะกร้า: ${currentQtyInCart}, จะเพิ่ม: ${qty})`);
              return;
          }
      }

      const existingItemIndex = cart.findIndex(item => item.productId === product.id);
      
      if (existingItemIndex > -1) {
          const newCart = [...cart];
          newCart[existingItemIndex].qty += Number(qty);
          newCart[existingItemIndex].total = newCart[existingItemIndex].qty * newCart[existingItemIndex].price;
          setCart(newCart);
      } else {
          setCart([...cart, {
            productId: product.id,
            name: product.name,
            qty: Number(qty),
            price: Number(price),
            total: Number(qty) * Number(price)
          }]);
      }
      
      setQty(1);
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
            if(product) {
                setSelectedProduct(product.id);
                setPrice(type === 'IN' ? product.buyPrice : product.sellPrice);
            } else {
                alert('ไม่พบสินค้านี้ในระบบ');
            }
        });
    }

    const handleHoldBill = () => {
        if (cart.length === 0) return alert('ไม่มีรายการสินค้าให้พักบิล');
        
        const billData = {
            id: Date.now(),
            items: cart,
            totalAmount: cart.reduce((sum, item) => sum + item.total, 0),
            note: cartNote || `บิลเวลา ${new Date().toLocaleTimeString('th-TH')}`,
            date: new Date().toISOString(),
            type: type
        };

        if (setHeldBills) {
            setHeldBills([...heldBills, billData]);
            setCart([]);
            setCartNote('');
            alert('พักบิลเรียบร้อยแล้ว สามารถทำรายการต่อไปได้เลย');
        }
    };

    const handleRestoreBill = (bill) => {
        if (cart.length > 0) {
            if(!window.confirm('มีรายการสินค้าค้างอยู่ในตะกร้า ต้องการทับด้วยรายการที่พักไว้หรือไม่?')) return;
        }
        
        // เช็คสต็อกอีกครั้งตอนเรียกคืน (เผื่อขายไปแล้วระหว่างนั้น)
        if (type === 'OUT') {
            for (const item of bill.items) {
                const currentStock = getCurrentStock(item.productId);
                if (item.qty > currentStock) {
                    alert(`ไม่สามารถเรียกคืนบิลได้ เนื่องจากสินค้า "${item.name}" คงเหลือไม่พอ (เหลือ ${currentStock})`);
                    return;
                }
            }
        }

        setCart(bill.items);
        setCartNote(bill.note);
        setHeldBills(heldBills.filter(b => b.id !== bill.id));
        setShowHeldBills(false);
    };

    const handleDeleteHeldBill = (billId) => {
        if(window.confirm('ต้องการลบบิลที่พักไว้นี้ทิ้งใช่หรือไม่?')) {
            setHeldBills(heldBills.filter(b => b.id !== billId));
        }
    };

    const saveTransaction = () => {
      if (cart.length === 0) return;
      const totalAmount = cart.reduce((sum, item) => sum + item.total, 0);
      setTransactions([...transactions, {
        id: Date.now(),
        type,
        docNo: generateDocNo(type),
        date: new Date().toISOString(),
        items: cart,
        totalAmount,
        note: cartNote
      }]);
      setCart([]);
      setCartNote('');
      alert('บันทึกรายการสำเร็จ!');
    };

    const grandTotal = cart.reduce((sum, item) => sum + item.total, 0);
    const currentHeldBills = heldBills.filter(b => b.type === type);

    // คำนวณสต็อกของสินค้าที่เลือกอยู่ (เพื่อแสดงผล)
    const selectedProductStock = selectedProduct ? getCurrentStock(Number(selectedProduct)) : 0;

    return (
      <div className="p-4 md:p-8 h-full flex flex-col max-w-4xl mx-auto relative pb-24">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${type === 'IN' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                    {type === 'IN' ? <ArrowDownLeft size={28} /> : <ArrowUpRight size={28} />}
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{type === 'IN' ? 'รับเข้า' : 'ขายสินค้า'}</h1>
                    <p className="text-gray-500 text-sm">{generateDocNo(type)}</p>
                </div>
            </div>
            
            {currentHeldBills.length > 0 && (
                <button 
                    onClick={() => setShowHeldBills(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-amber-100 text-amber-700 rounded-xl font-medium text-sm hover:bg-amber-200 transition-colors animate-pulse"
                >
                    <PauseCircle size={18} />
                    <span>พักไว้ {currentHeldBills.length}</span>
                </button>
            )}
        </div>

        <Card className="mb-6 !p-6 border-blue-100 shadow-md">
          <div className="flex gap-3 mb-4">
             <div className="relative flex-1">
                <select 
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl p-3.5 appearance-none focus:ring-2 focus:ring-blue-500 transition-shadow cursor-pointer"
                    value={selectedProduct}
                    onChange={handleProductSelect}
                >
                    <option value="">-- เลือกสินค้า --</option>
                    {products.map(p => (
                    <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                    <ChevronRight className="rotate-90 text-gray-400" size={18} />
                </div>
             </div>
             <Button variant="secondary" onClick={handleScan} className="px-4">
                 <QrCode size={22} />
             </Button>
          </div>
          
          {selectedProduct && (
            <div className="animate-in fade-in slide-in-from-top-2">
                {type === 'OUT' && (
                    <div className="mb-2 text-right">
                       <span className={`text-xs font-bold px-2 py-1 rounded-full ${selectedProductStock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                           คงเหลือ: {selectedProductStock} ชิ้น
                       </span>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <Input 
                        label="ราคาต่อหน่วย" 
                        type="number"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                    />
                    <Input 
                        label="จำนวน" 
                        type="number"
                        value={qty}
                        onChange={e => setQty(e.target.value)}
                    />
                </div>
               <Button onClick={addToCart} className="w-full py-3" disabled={type === 'OUT' && selectedProductStock <= 0}>
                   <Plus size={18} /> เพิ่มรายการ
               </Button>
            </div>
          )}
        </Card>

        {/* Cart List */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-1">
          {cart.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
              <ShoppingCart className="mx-auto mb-3 text-gray-300" size={56} />
              <p className="text-gray-400 font-medium">ยังไม่มีสินค้าในตะกร้า</p>
              <p className="text-gray-400 text-sm mt-1">เลือกสินค้าด้านบนเพื่อเริ่มรายการ</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">
                        {idx + 1}
                    </div>
                    <div>
                        <div className="font-semibold text-gray-800">{item.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{item.qty} x ฿{item.price.toLocaleString()}</div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-gray-900 text-lg">฿{item.total.toLocaleString()}</span>
                  <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-white border-t border-gray-100 p-6 -mx-4 md:-mx-8 -mb-8 mt-auto rounded-t-3xl shadow-[0_-8px_20px_-5px_rgba(0,0,0,0.1)] z-10">
           <div className="max-w-4xl mx-auto">
               <Input 
                  placeholder="เพิ่มหมายเหตุ (ถ้ามี)" 
                  value={cartNote} 
                  onChange={e => setCartNote(e.target.value)}
                  className="mb-4"
               />
               <div className="flex justify-between items-end mb-4">
                  <div>
                      <span className="text-gray-500 text-sm block mb-1">ยอดรวมสุทธิ</span>
                      <span className="text-sm font-medium text-gray-900">{cart.length} รายการ</span>
                  </div>
                  <span className="text-3xl font-bold text-blue-600 tracking-tight">฿{grandTotal.toLocaleString()}</span>
               </div>
               
               <div className="grid grid-cols-4 gap-3">
                   {/* ปุ่มพักบิล (ใหม่) */}
                   <Button 
                     variant="secondary"
                     className="col-span-1 py-4 text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100" 
                     onClick={handleHoldBill}
                     disabled={cart.length === 0}
                   >
                     <PauseCircle size={20} /> <span className="hidden sm:inline">พักบิล</span>
                   </Button>

                   {/* ปุ่มยืนยัน */}
                   <Button 
                     className="col-span-3 py-4 text-lg font-bold shadow-blue-300 shadow-xl" 
                     onClick={saveTransaction}
                     disabled={cart.length === 0}
                    >
                     <CheckCircle className="mr-2" /> {type === 'IN' ? 'ยืนยันการซื้อ' : 'รับเงิน'}
                   </Button>
               </div>
           </div>
        </div>

        {/* Modal แสดงรายการพักบิล (Popup) */}
        {showHeldBills && (
            <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[80vh] flex flex-col">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                            <PauseCircle className="text-amber-500" /> รายการที่พักไว้
                        </h3>
                        <button onClick={() => setShowHeldBills(false)} className="p-2 hover:bg-gray-200 rounded-full">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1 space-y-3">
                        {currentHeldBills.length === 0 ? (
                            <p className="text-center text-gray-400 py-8">ไม่มีรายการที่พักไว้</p>
                        ) : (
                            currentHeldBills.map(bill => (
                                <div key={bill.id} className="border border-gray-200 rounded-xl p-3 hover:border-blue-300 transition-colors bg-white shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-bold text-gray-800">{bill.note || 'ไม่มีหมายเหตุ'}</p>
                                            <p className="text-xs text-gray-500">{new Date(bill.date).toLocaleTimeString('th-TH')}</p>
                                        </div>
                                        <span className="font-bold text-blue-600">฿{bill.totalAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mb-3 bg-gray-50 p-2 rounded-lg">
                                        {bill.items.map(i => `${i.name} (x${i.qty})`).join(', ').substring(0, 50)}...
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleRestoreBill(bill)}
                                            className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
                                        >
                                            <PlayCircle size={16} /> ทำรายการต่อ
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteHeldBill(bill.id)}
                                            className="px-3 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}

      </div>
    );
}