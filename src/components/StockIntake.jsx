import React, { useState, useEffect } from 'react';
import { QrCode, Trash2, Plus, CheckCircle, ArrowUpRight, ShoppingCart, MessageSquare, AlertCircle } from 'lucide-react';
import { Button, Input, Card } from './UIComponents';
import { db } from '../firebase';
import { collection, doc, increment, runTransaction } from "firebase/firestore";

export default function StockIntake({ products, generateDocNo, handleScanQR, calculateStock }) {
    const [selectedProduct, setSelectedProduct] = useState('');
    const [qty, setQty] = useState(1);
    const [price, setPrice] = useState(0);
    const [cart, setCart] = useState([]);
    const [cartNote, setCartNote] = useState(''); // 🟢 เพิ่มช่องหมายเหตุ
    const [currentDocNo, setCurrentDocNo] = useState('');

    useEffect(() => { setCurrentDocNo(generateDocNo('IN')); }, [generateDocNo]);

    // 🟢 คำนวณสต็อกปัจจุบันของสินค้าที่เลือก
    const currentProductData = products.find(p => p.id === selectedProduct);
    const selectedProductStock = selectedProduct ? calculateStock(selectedProduct) : 0;

    const addToCart = () => {
        const product = products.find(p => p.id === selectedProduct);
        if (!product) return alert('⚠️ โปรดเลือกสินค้าก่อน');
        
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
        setQty(1); setSelectedProduct(''); setPrice(0);
    };

    const confirmIntake = async () => {
        if (cart.length === 0) return;
        try {
            await runTransaction(db, async (transaction) => {
                for (const item of cart) {
                    const productRef = doc(db, "products", item.productId);
                    transaction.update(productRef, { stock: increment(Number(item.qty)) });
                }
                const billRef = doc(collection(db, "transactions"));
                transaction.set(billRef, {
                    type: 'IN', 
                    docNo: currentDocNo, 
                    date: new Date().toISOString(),
                    items: cart, 
                    totalAmount: cart.reduce((sum, i) => sum + i.total, 0),
                    note: cartNote, // 🟢 บันทึกหมายเหตุลง Firebase
                    createdAt: new Date()
                });
            });
            setCart([]); 
            setCartNote('');
            setCurrentDocNo(generateDocNo('IN'));
            alert('✅ เพิ่มสต็อกและบันทึกรายการสำเร็จ!');
        } catch (error) { alert('❌ ' + error.message); }
    };

    return (
        <div className="p-4 md:p-8 h-full max-w-4xl mx-auto">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-blue-100 text-blue-600"><ArrowUpRight size={28} /></div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 uppercase">Stock Intake</h1>
                    <p className="text-gray-400 text-xs font-mono">{currentDocNo}</p>
                </div>
            </div>

            <Card className="!p-6 border-blue-100 shadow-md mb-6">
                <div className="flex gap-3 mb-4">
                    <select className="flex-1 bg-gray-50 border-2 border-gray-100 rounded-xl p-3.5 font-bold outline-none"
                        value={selectedProduct} onChange={(e) => {
                            const p = products.find(prod => prod.id === e.target.value);
                            setSelectedProduct(e.target.value);
                            if(p) setPrice(p.buyPrice || 0);
                        }}>
                        <option value="">-- เลือกสินค้าที่จะรับเข้า --</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.code} | {p.name}</option>)}
                    </select>
                    
                    {/* 🟢 ปุ่มสแกน QR/Barcode กลับมาแล้ว */}

                        <Button variant="secondary" className="rounded-xl w-14 h-14 shrink-0" onClick={() => handleScanQR((code) => {
                            const product = products.find(prod => prod.code === code);

                            if (!product) return alert('❌ ไม่พบสินค้าในคลัง');

                            const itemInCart = cart.find(i => i.productId === product.id);

                            // เพิ่มเข้าตะกร้ารับของทันที
                            if (itemInCart) {
                                setCart(prevCart => prevCart.map(item => 
                                    item.productId === product.id 
                                    ? { ...item, qty: item.qty + 1, total: (item.qty + 1) * item.price }
                                    : item
                                ));
                            } else {
                                setCart(prevCart => [...prevCart, { 
                                    productId: product.id, 
                                    name: product.name, 
                                    qty: 1, 
                                    price: Number(product.buyPrice || 0), 
                                    total: Number(product.buyPrice || 0), 
                                    unit: product.unit 
                                }]);
                            }
                            
                            setSelectedProduct('');
                        })}>
                            <QrCode />
                        </Button>
                </div>

                {selectedProduct && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        {/* 🟢 แสดงสต็อกปัจจุบันเพื่อช่วยในการตัดสินใจรับของ */}
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><AlertCircle size={14}/> สต็อกปัจจุบันในคลัง</span>
                            <span className="font-black text-blue-600">{selectedProductStock.toLocaleString()} {currentProductData?.unit}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input label="ราคาทุนต่อหน่วย (฿)" type="number" value={price} onChange={e => setPrice(Number(e.target.value))} />
                            <Input label="จำนวนที่รับเข้า" type="number" value={qty} onChange={e => setQty(Math.max(1, Number(e.target.value)))} />
                            <Button onClick={addToCart} className="col-span-full py-4 font-black shadow-lg shadow-blue-100"><Plus size={18}/> เพิ่มรายการเข้าคลัง</Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* 🟢 ช่องหมายเหตุสำหรับการซื้อเข้า (เช่น ชื่อซัพพลายเออร์ หรือ เลขใบส่งของ) */}
            <Card className="!p-5 border-2 border-dashed border-slate-200 bg-white mb-6">
                <div className="flex items-center gap-2 mb-3 text-slate-400 text-[10px] font-black uppercase"><MessageSquare size={16}/> หมายเหตุการรับเข้า</div>
                <textarea 
                    className="w-full bg-slate-50 rounded-xl p-4 text-sm min-h-[60px] outline-none focus:ring-2 focus:ring-blue-100 transition-all" 
                    placeholder="หมายเหตุอื่นๆ" 
                    value={cartNote} 
                    onChange={e => setCartNote(e.target.value)} 
                />
            </Card>
            
            {/* รายการในตะกร้า */}
            <div className="space-y-3">
                {cart.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl">
                        <ShoppingCart className="mx-auto mb-2 text-gray-200" size={40} />
                        <p className="text-gray-400 text-sm font-bold">ยังไม่มีรายการรับเข้า</p>
                    </div>
                ) : (
                    cart.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm animate-in slide-in-from-right-2">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black">{idx + 1}</div>
                                <div>
                                    <div className="font-bold text-gray-800">{item.name}</div>
                                    <div className="text-xs text-gray-400 font-bold">เพิ่ม {item.qty.toLocaleString()} {item.unit} | ทุนรวม ฿{item.total.toLocaleString()}</div>
                                </div>
                            </div>
                            <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="p-2 text-red-100 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                        </div>
                    ))
                )}
            </div>

            <Button 
                className="w-full mt-10 py-5 text-xl font-black shadow-xl shadow-blue-200" 
                onClick={confirmIntake} 
                disabled={cart.length === 0}
            >
                <CheckCircle size={24} className="mr-2"/> ยืนยันการรับสินค้าเข้า
            </Button>
        </div>
    );
}