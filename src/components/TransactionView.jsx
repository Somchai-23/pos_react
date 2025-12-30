import React, { useState, useEffect } from 'react';
import { ChevronRight, QrCode, ShoppingCart, Trash2, CheckCircle, Plus, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Button, Input, Card } from './UIComponents';

export default function TransactionView({ type, products, transactions, setTransactions, setViewState, generateDocNo, handleScanQR }) {
    const [selectedProduct, setSelectedProduct] = useState('');
    const [qty, setQty] = useState(1);
    const [price, setPrice] = useState(0);
    const [cart, setCart] = useState([]);
    const [cartNote, setCartNote] = useState('');

    useEffect(() => {
        setCart([]);
        setCartNote('');
        setViewState('list');
    }, [type, setViewState]);

    const addToCart = () => {
      const product = products.find(p => p.id === Number(selectedProduct));
      if (!product) return;
      
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        qty: Number(qty),
        price: Number(price),
        total: Number(qty) * Number(price)
      }]);
      
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

    return (
      <div className="p-4 md:p-8 h-full flex flex-col max-w-4xl mx-auto relative pb-24">
        <div className="flex items-center gap-3 mb-6">
            <div className={`p-3 rounded-2xl ${type === 'IN' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                {type === 'IN' ? <ArrowDownLeft size={28} /> : <ArrowUpRight size={28} />}
            </div>
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{type === 'IN' ? 'รับสินค้าเข้าสต็อก' : 'สร้างรายการขาย'}</h1>
                <p className="text-gray-500 text-sm">สร้างบิล{type === 'IN' ? 'ซื้อ' : 'ขาย'}ใหม่</p>
            </div>
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
               <Button onClick={addToCart} className="w-full py-3">
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

        {/* Footer */}
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
               <Button 
                 className="w-full py-4 text-lg font-bold shadow-blue-300 shadow-xl" 
                 onClick={saveTransaction}
                 disabled={cart.length === 0}
                >
                 <CheckCircle className="mr-2" /> {type === 'IN' ? 'ยืนยันการสั่งซื้อ' : 'ยืนยันการขาย'}
               </Button>
           </div>
        </div>
      </div>
    );
};