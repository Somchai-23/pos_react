import React, { useState, useEffect } from 'react';
import { QrCode, Trash2, Plus, Search, ShoppingCart, MessageSquare, Users, AlertCircle, PauseCircle, PlayCircle } from 'lucide-react';
import { Button, Input, Card } from './UIComponents';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, increment } from "firebase/firestore";

export default function TransactionView({ type, products, generateDocNo, handleScanQR, customers, memberSettings, calculateStock, heldBills, setHeldBills }) {
    const [selectedProduct, setSelectedProduct] = useState('');
    const [qty, setQty] = useState(1);
    const [price, setPrice] = useState(0);
    const [cart, setCart] = useState([]);
    const [cartNote, setCartNote] = useState(''); 
    const [currentDocNo, setCurrentDocNo] = useState('');
    const [memberPhone, setMemberPhone] = useState(''); 
    const [currentMember, setCurrentMember] = useState(null);
    const [pointsToUse, setPointsToUse] = useState(0);

    useEffect(() => {
        setCart([]); setCartNote(''); setCurrentDocNo(generateDocNo(type)); setSelectedProduct(''); setCurrentMember(null); setMemberPhone(''); setPointsToUse(0);
    }, [type, generateDocNo]);

    const grandTotal = cart.reduce((sum, item) => sum + item.total, 0);
    const earnedPoints = currentMember && type === 'OUT' ? Math.floor((grandTotal - pointsToUse) / memberSettings.bahtPerPoint) : 0;

    // --- ฟังก์ชันพักบิล (จะทำงานเฉพาะหน้าขายสินค้า) ---
    const handleHoldBill = () => {
        if (type !== 'OUT') return; // ป้องกันการเรียกใช้ผิดหน้า
        if (cart.length === 0) return alert('⚠️ ไม่มีสินค้าให้พักครับ');
        
        const newHeldBill = {
            id: Date.now(),
            items: [...cart],
            note: cartNote,
            total: grandTotal,
            time: new Date().toLocaleTimeString('th-TH'),
            member: currentMember
        };

        setHeldBills([...heldBills, newHeldBill]);
        setCart([]); setCartNote(''); setCurrentMember(null);
        alert('📍 พักบิลนี้ไว้แล้ว');
    };

    const handleRecallBill = (heldBill) => {
        if (cart.length > 0 && !window.confirm('ต้องการแทนที่ตะกร้าด้วยบิลที่พักไว้ใช่ไหม?')) return;
        setCart(heldBill.items);
        setCartNote(heldBill.note || '');
        setCurrentMember(heldBill.member || null);
        setHeldBills(heldBills.filter(b => b.id !== heldBill.id));
    };

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
            setCart([...cart, { productId: product.id, name: product.name, qty: Number(qty), price: Number(price), total: Number(qty) * Number(price), unit: product.unit }]);
        }
        setQty(1); setSelectedProduct(''); setPrice(0);
    };

    const saveTransaction = async () => {
        if (cart.length === 0) return;
        const finalAmount = grandTotal - Number(pointsToUse);
        const billData = { type, docNo: currentDocNo, date: new Date().toISOString(), items: cart, totalAmount: finalAmount, pointsUsed: Number(pointsToUse), pointsEarned: earnedPoints, memberId: currentMember?.id || null, note: cartNote };

        try {
            await addDoc(collection(db, "transactions"), billData);
            if (currentMember && type === 'OUT') {
                const memberRef = doc(db, "customers", currentMember.id);
                await updateDoc(memberRef, { points: increment(earnedPoints - Number(pointsToUse)) });
            }
            setCart([]); setCartNote(''); setCurrentDocNo(generateDocNo(type)); setCurrentMember(null); setPointsToUse(0); setMemberPhone(''); 
            alert('✅ บันทึกรายการเรียบร้อย');
        } catch (error) {
            alert('❌ ข้อผิดพลาด: ' + error.message);
        }
    };

    return (
        <div className="p-4 md:p-8 h-full max-w-[1600px] mx-auto overflow-hidden">
            <div className="flex flex-col lg:flex-row gap-8 h-full items-start">
                <div className="w-full lg:w-[60%] space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                                {type === 'OUT' ? 'ขายสินค้า (Cloud)' : 'รับสต็อกเข้า'}
                            </h1>
                            {/* แสดงจำนวนบิลค้างเฉพาะหน้าขายสินค้า */}
                            {type === 'OUT' && heldBills.length > 0 && (
                                <p className="text-orange-500 text-xs font-bold animate-pulse mt-1">● มีบิลค้างอยู่ {heldBills.length} รายการ</p>
                            )}
                        </div>
                        <span className="font-mono text-[10px] bg-white border border-slate-200 px-3 py-1 rounded-full text-slate-400 font-bold">{currentDocNo}</span>
                    </div>

                    {/* แสดงรายการบิลที่พักไว้เฉพาะหน้าขายสินค้า */}
                    {type === 'OUT' && heldBills.length > 0 && (
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {heldBills.map(bill => (
                                <button key={bill.id} onClick={() => handleRecallBill(bill)} className="flex items-center gap-2 bg-orange-50 border border-orange-100 px-4 py-2 rounded-xl shrink-0 hover:bg-orange-100 transition-all">
                                    <PlayCircle size={16} className="text-orange-500" />
                                    <div className="text-left">
                                        <p className="text-[10px] font-black text-orange-600 uppercase">พักเมื่อ {bill.time}</p>
                                        <p className="text-xs font-bold text-slate-700">฿{bill.total.toLocaleString()}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    <Card className="!p-6 border-none shadow-sm">
                        {/* ส่วนเลือกสินค้าเหมือนเดิม */}
                        <div className="flex gap-2 mb-4">
                            <select className="flex-1 bg-slate-50 border-2 border-slate-50 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-blue-50 transition-all outline-none" value={selectedProduct} onChange={(e) => {
                                const pid = e.target.value; setSelectedProduct(pid);
                                const p = products.find(prod => prod.id === pid);
                                if(p) setPrice(type === 'IN' ? (p.buyPrice || 0) : (p.sellPrice || 0));
                            }}>
                                <option value="">-- เลือกสินค้า --</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.code} | {p.name}</option>)}
                            </select>
                            <Button variant="secondary" className="rounded-2xl w-14 h-14 shrink-0 shadow-sm" onClick={() => handleScanQR((code) => {
                                const p = products.find(prod => prod.code === code);
                                if(p) { setSelectedProduct(p.id); setPrice(type === 'IN' ? (p.buyPrice || 0) : (p.sellPrice || 0)); }
                            })}><QrCode /></Button>
                        </div>
                        
                        {selectedProduct && (
                            <div className="space-y-4 animate-in slide-in-from-top-2">
                                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><AlertCircle size={12}/> Stock</span>
                                    <span className={`font-black ${calculateStock(selectedProduct) <= 0 ? 'text-red-500' : 'text-blue-600'}`}>
                                        {calculateStock(selectedProduct)} {products.find(p => p.id === selectedProduct)?.unit || 'หน่วย'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="ราคา/หน่วย" type="number" value={price} onChange={e => setPrice(Number(e.target.value))} />
                                    <Input label="จำนวน" type="number" value={qty} onChange={e => setQty(Math.max(1, Number(e.target.value)))} />
                                    <Button onClick={addToCart} className="col-span-full py-4 text-base font-black shadow-lg shadow-blue-100"><Plus size={18}/> เพิ่มลงรายการ</Button>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* ส่วนหมายเหตุ */}
                    <Card className="!p-5 border-2 border-dashed border-slate-200 bg-white shadow-none">
                        <div className="flex items-center gap-2 mb-3 text-slate-400">
                            <MessageSquare size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">หมายเหตุ</span>
                        </div>
                        <textarea className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm text-slate-700 focus:ring-4 focus:ring-slate-100 min-h-[80px] outline-none transition-all" placeholder="รายละเอียดเพิ่มเติม..." value={cartNote} onChange={(e) => setCartNote(e.target.value)} />
                    </Card>
                </div>

                <aside className="hidden lg:flex w-[40%] bg-white border border-slate-100 rounded-[2.5rem] flex-col h-[calc(100vh-140px)] sticky top-8 shadow-sm overflow-hidden">
                    <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between">
                        <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm uppercase tracking-tight"><ShoppingCart size={18}/> Cart Summary</h3>
                        <span className="bg-slate-900 text-white text-[10px] px-3 py-1 rounded-full font-black">{cart.length}</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-200">
                                <ShoppingCart size={64} strokeWidth={1} className="mb-4 opacity-20" />
                                <p className="text-[10px] font-black text-slate-300">ไม่มีสินค้าในตะกร้า</p>
                            </div>
                        ) : (
                            cart.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center group animate-in fade-in">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="w-8 h-8 flex items-center justify-center text-red-100 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={14}/></button>
                                        <div><p className="font-bold text-sm text-slate-700">{item.name}</p><p className="text-[10px] text-slate-400 font-bold">{item.qty} {item.unit} x ฿{item.price.toLocaleString()}</p></div>
                                    </div>
                                    <span className="font-black text-slate-800 text-sm">฿{item.total.toLocaleString()}</span>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-8 bg-slate-50 border-t space-y-5">
                        <div className={`grid ${type === 'OUT' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                            {/* ปุ่มพักบิล: จะแสดงเฉพาะหน้าขายสินค้า (OUT) */}
                            {type === 'OUT' && (
                                <button onClick={handleHoldBill} disabled={cart.length === 0} className="flex items-center justify-center gap-2 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all disabled:opacity-50">
                                    <PauseCircle size={18} /> พักบิล
                                </button>
                            )}
                            <Button className="py-4 rounded-2xl text-base font-black shadow-xl shadow-blue-200 active:scale-95 transition-all" onClick={saveTransaction} disabled={cart.length === 0}>
                               {type === 'IN' ? 'รับสต็อกเข้า' : 'ชำระเงิน'}
                            </Button>
                        </div>
                        <div className="pt-2 border-t border-slate-200">
                            <div className="flex justify-between items-end">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">ยอดสุทธิ</span>
                                <span className="text-4xl font-black text-blue-600 tracking-tighter italic">฿{(grandTotal - pointsToUse).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}