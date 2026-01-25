import React, { useState, useEffect } from 'react';
import { QrCode, Trash2, CheckCircle, Plus, PauseCircle, PlayCircle, X, Search, ShoppingCart } from 'lucide-react';
import { Button, Input, Card } from './UIComponents';

export default function TransactionView({ type, products, transactions, setTransactions, generateDocNo, handleScanQR, heldBills = [], setHeldBills, customers, setCustomers, memberSettings }) {
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
        setCart([]); setCurrentDocNo(generateDocNo(type)); setSelectedProduct(''); setCurrentMember(null); setPointsToUse(0);
    }, [type, generateDocNo]);

    const grandTotal = cart.reduce((sum, item) => sum + item.total, 0);
    const earnedPoints = currentMember && type === 'OUT' ? Math.floor((grandTotal - pointsToUse) / memberSettings.bahtPerPoint) : 0;

    const addToCart = () => {
        const product = products.find(p => p.id === Number(selectedProduct));
        if (!product) return alert('⚠️ เลือกสินค้าก่อน');
        
        const existingIdx = cart.findIndex(item => item.productId === product.id);
        if (existingIdx > -1) {
            const newCart = [...cart];
            newCart[existingIdx].qty += Number(qty);
            newCart[existingIdx].total = newCart[existingIdx].qty * newCart[existingIdx].price;
            setCart(newCart);
        } else {
            setCart([...cart, { productId: product.id, name: product.name, qty: Number(qty), price: Number(price), total: Number(qty) * Number(price), unit: product.unit }]);
        }
        setQty(1); setSelectedProduct('');
    };

    const saveTransaction = () => {
        if (cart.length === 0) return;
        const finalAmount = grandTotal - Number(pointsToUse);
        setTransactions([...transactions, { id: Date.now(), type, docNo: currentDocNo, date: new Date().toISOString(), items: cart, totalAmount: finalAmount, pointsUsed: Number(pointsToUse), pointsEarned: earnedPoints, memberId: currentMember?.id, note: cartNote }]);
        if (currentMember && type === 'OUT') {
            setCustomers(customers.map(c => c.id === currentMember.id ? { ...c, points: c.points - Number(pointsToUse) + earnedPoints } : c ));
        }
        setCart([]); setCurrentDocNo(generateDocNo(type)); setCurrentMember(null); setPointsToUse(0); setMemberPhone(''); alert('✅ สำเร็จ');
    };

    return (
        <div className="p-4 md:p-8 h-full max-w-[1600px] mx-auto overflow-hidden">
            {/* Split Layout: 2 คอลัมน์บนจอใหญ่ */}
            <div className="flex flex-col lg:flex-row gap-8 h-full items-start">
                
                {/* ฝั่งซ้าย: จัดการสินค้าและสมาชิก (60%) */}
                <div className="w-full lg:w-[60%] space-y-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">{type === 'IN' ? 'สต็อกเข้า' : 'ขายสินค้า'}</h1>
                        <span className="font-mono text-xs bg-white border px-3 py-1 rounded-full text-slate-400">{currentDocNo}</span>
                    </div>

                    <Card className="!p-6 border-none shadow-sm">
                        <div className="flex gap-2 mb-4">
                            <select className="flex-1 bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500" value={selectedProduct} onChange={(e) => {
                                const pid = e.target.value; setSelectedProduct(pid);
                                const p = products.find(prod => prod.id === Number(pid));
                                if(p) setPrice(type === 'IN' ? p.buyPrice : p.sellPrice);
                            }}>
                                <option value="">-- เลือกสินค้า --</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.code} | {p.name}</option>)}
                            </select>
                            <Button variant="secondary" className="rounded-2xl w-14 h-14" onClick={() => handleScanQR((code) => {
                                const p = products.find(prod => prod.code === code);
                                if(p) { setSelectedProduct(p.id); setPrice(type === 'IN' ? p.buyPrice : p.sellPrice); }
                            })}><QrCode /></Button>
                        </div>
                        {selectedProduct && (
                            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                                <Input label="ราคา" type="number" value={price} onChange={e => setPrice(e.target.value)} />
                                <Input label="จำนวน" type="number" value={qty} onChange={e => setQty(e.target.value)} />
                                <Button onClick={addToCart} className="col-span-full py-4 text-base"><Plus size={18}/> เพิ่มลงตะกร้า</Button>
                            </div>
                        )}
                    </Card>

                    {type === 'OUT' && (
                        <Card className="bg-blue-600 !p-6 border-none text-white">
                            <div className="flex gap-2 mb-4">
                                <input placeholder="เบอร์โทรสมาชิก" value={memberPhone} onChange={e => setMemberPhone(e.target.value)} className="flex-1 bg-white/20 border-none rounded-xl p-3 placeholder:text-white/60 text-white outline-none focus:bg-white/30 transition-all" />
                                <button onClick={() => { const m = customers.find(c => c.phone === memberPhone); if(m) setCurrentMember(m); else alert('ไม่พบสมาชิก'); }} className="bg-white text-blue-600 px-4 rounded-xl font-bold"><Search size={18}/></button>
                            </div>
                            {currentMember && (
                                <div className="flex justify-between items-center animate-in fade-in">
                                    <div><p className="font-bold">{currentMember.name}</p><p className="text-xs opacity-70">แต้มคงเหลือ: {currentMember.points}</p></div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold">ใช้แต้ม:</span>
                                        <input type="number" className="w-16 bg-white/20 border-none rounded p-1 text-center font-bold" value={pointsToUse} onChange={e => setPointsToUse(Math.min(currentMember.points, Math.min(grandTotal, e.target.value)))} />
                                    </div>
                                </div>
                            )}
                        </Card>
                    )}

                    {/* ตะกร้าแบบ Mobile (โชว์เฉพาะจอเล็ก) */}
                    <div className="lg:hidden space-y-3">
                        {cart.map((item, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm">
                                <div><p className="font-bold text-slate-800">{item.name}</p><p className="text-xs text-slate-400">{item.qty} x ฿{item.price}</p></div>
                                <span className="font-bold">฿{item.total.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ฝั่งขวา: ตะกร้าสินค้าถาวร (สำหรับ Desktop 40%) */}
                <aside className="hidden lg:flex w-[40%] bg-white border rounded-[32px] flex-col h-[calc(100vh-140px)] sticky top-8 shadow-sm overflow-hidden">
                    <div className="p-6 border-b bg-slate-50 flex items-center justify-between">
                        <h3 className="font-black text-slate-800 flex items-center gap-2"><ShoppingCart size={20}/> รายการสั่งซื้อ</h3>
                        <span className="bg-blue-600 text-white text-[10px] px-2 py-1 rounded-full font-black">{cart.length} รายการ</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50">
                                <ShoppingCart size={48} className="mb-2" />
                                <p className="text-sm font-bold uppercase tracking-widest">ยังไม่มีสินค้าในตะกร้า</p>
                            </div>
                        ) : (
                            cart.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center group">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-200 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                        <div><p className="font-bold text-sm text-slate-700">{item.name}</p><p className="text-[10px] text-slate-400">{item.qty} {item.unit} x ฿{item.price}</p></div>
                                    </div>
                                    <span className="font-black text-slate-800 text-sm">฿{item.total.toLocaleString()}</span>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="p-6 bg-slate-50 border-t space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-slate-400 font-bold"><span>ราคารวม</span><span>฿{grandTotal.toLocaleString()}</span></div>
                            {pointsToUse > 0 && <div className="flex justify-between text-xs text-red-500 font-bold"><span>ส่วนลดสมาชิก</span><span>-฿{pointsToUse}</span></div>}
                            <div className="flex justify-between items-end pt-2">
                                <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">ยอดสุทธิ</span>
                                <span className="text-4xl font-black text-blue-600 tracking-tighter">฿{(grandTotal - pointsToUse).toLocaleString()}</span>
                            </div>
                        </div>
                        <Button className="w-full py-5 rounded-2xl text-lg font-black shadow-xl shadow-blue-100" onClick={saveTransaction} disabled={cart.length === 0}><CheckCircle size={20}/> ยืนยันชำระเงิน</Button>
                    </div>
                </aside>

            </div>
        </div>
    );
}