import React, { useState, useEffect } from 'react';
import { QrCode, Trash2, Plus, Search, ShoppingCart, MessageSquare, Users, AlertCircle, PauseCircle, PlayCircle, CheckCircle, ArrowLeft, Banknote, Printer, X } from 'lucide-react';
import { Button, Input, Card } from './UIComponents';
import { db } from '../firebase';
import { collection, doc, increment, runTransaction } from "firebase/firestore";
import { PrintReceipt } from './PrintTemplate'; 

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

    const [isPaymentStep, setIsPaymentStep] = useState(false);
    const [receivedAmount, setReceivedAmount] = useState(0);
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastBill, setLastBill] = useState(null);

    useEffect(() => {
        setCurrentDocNo(generateDocNo(type));
    }, [type, generateDocNo]);

    const handleFullReset = () => {
        setCart([]);
        setCartNote('');
        setCurrentMember(null);
        setMemberPhone('');
        setPointsToUse(0);
        setIsPaymentStep(false);
        setReceivedAmount(0);
        setShowReceipt(false);
        setLastBill(null);
        setCurrentDocNo(generateDocNo(type));
    };

    const grandTotal = cart.reduce((sum, item) => sum + item.total, 0);
    const finalAmount = grandTotal - Number(pointsToUse);
    const earnedPoints = currentMember && type === 'OUT' ? Math.floor(finalAmount / (memberSettings?.bahtPerPoint || 20)) : 0;
    const changeAmount = receivedAmount > 0 ? receivedAmount - finalAmount : 0;

    const addToCart = () => {
        const product = products.find(p => p.id === selectedProduct);
        if (!product) return alert('⚠️ โปรดเลือกสินค้าก่อน');
        const currentStock = calculateStock(product.id);
        const itemInCart = cart.find(i => i.productId === product.id);
        const currentQtyInCart = itemInCart ? Number(itemInCart.qty) : 0;

        if (type === 'OUT' && (currentQtyInCart + Number(qty)) > currentStock) {
            return alert(`❌ สินค้าไม่พอขาย! \nคงเหลือ: ${currentStock} ${product.unit}`);
        }

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
        try {
            await runTransaction(db, async (transaction) => {
                const snapshots = [];
                for (const item of cart) {
                    const productRef = doc(db, "products", item.productId);
                    const productSnap = await transaction.get(productRef);
                    if (!productSnap.exists()) throw new Error(`ไม่พบสินค้า ${item.name}`);
                    snapshots.push({ item, productRef, productSnap });
                }

                for (const { item, productRef, productSnap } of snapshots) {
                    const cloudStock = Number(productSnap.data().stock || 0);
                    if (type === 'OUT' && item.qty > cloudStock) throw new Error(`❌ "${item.name}" เหลือไม่พอ`);
                    transaction.update(productRef, { stock: increment(type === 'OUT' ? -Number(item.qty) : Number(item.qty)) });
                }

                const billRef = doc(collection(db, "transactions"));
                const billData = {
                    type, docNo: currentDocNo, date: new Date().toISOString(),
                    items: cart, totalAmount: finalAmount, 
                    receivedAmount: type === 'OUT' ? Number(receivedAmount) : 0,
                    changeAmount: type === 'OUT' ? Number(changeAmount) : 0,
                    pointsUsed: Number(pointsToUse), memberId: currentMember?.id || null, 
                    note: cartNote,
                    createdAt: new Date()
                };
                transaction.set(billRef, billData);

                if (currentMember && type === 'OUT') {
                    const memberRef = doc(db, "customers", currentMember.id);
                    transaction.update(memberRef, { points: increment(earnedPoints - Number(pointsToUse)) });
                }

                setLastBill({
                    ...billData,
                    memberName: currentMember?.name || 'ลูกค้าทั่วไป',
                    dateFormatted: new Date().toLocaleString('th-TH')
                });
            });

            setShowReceipt(true); 
        } catch (error) { alert('❌ ' + error.message); }
    };

    return (
        <div className="p-4 md:p-8 h-full max-w-[1600px] mx-auto overflow-hidden">
            <style>{`
                @media print {
                    body * { visibility: hidden !important; }
                    .print-only, .print-only * { visibility: visible !important; }
                    .print-only { position: absolute; left: 0; top: 0; width: 100%; display: block !important; }
                    .no-print { display: none !important; }
                }
            `}</style>

            <div className="flex flex-col lg:flex-row gap-8 h-full items-start no-print">
                <div className="w-full lg:w-[60%] space-y-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">{type === 'OUT' ? 'Sales Terminal' : 'Stock Intake'}</h1>
                        <span className="font-mono text-[10px] bg-white border border-slate-200 px-3 py-1 rounded-full text-slate-400 font-bold">{currentDocNo}</span>
                    </div>

                    {!isPaymentStep ? (
                        <>
                            <Card className="!p-6 border-none shadow-sm">
                                <div className="flex gap-2 mb-4">
                                    <select className="flex-1 bg-slate-50 border-2 border-slate-50 rounded-2xl p-4 text-sm font-bold outline-none" value={selectedProduct} onChange={(e) => {
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
                                {/* --- ส่วนแสดงผลหลังจากเลือกสินค้าแล้ว --- */}
{selectedProduct && (
    <div className="space-y-4 animate-in slide-in-from-top-2">
        
        {/* 🟢 แถบแสดงจำนวนคงเหลือปัจจุบัน (ดึงฟังก์ชันเดิมกลับมา) */}
        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
            <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">คงเหลือปัจจุบัน</span>
            </div>
            
            <div className="text-right flex flex-col items-end">
                <span className={`text-2xl font-black ${
                    calculateStock(selectedProduct) <= 0 
                        ? 'text-red-500' 
                        : calculateStock(selectedProduct) <= 5 // ใช้เกณฑ์ Low Stock ที่เราตั้งไว้
                            ? 'text-orange-500 animate-pulse' 
                            : 'text-blue-600'
                }`}>
                    {calculateStock(selectedProduct).toLocaleString()} {products.find(p => p.id === selectedProduct)?.unit || 'ชิ้น'}
                </span>
                
                {/* แสดงป้ายเตือนสถานะ */}
                {calculateStock(selectedProduct) <= 5 && calculateStock(selectedProduct) > 0 && (
                    <span className="text-[9px] font-black bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full uppercase mt-1">
                        ⚠️ ใกล้หมดคลัง
                    </span>
                )}
                {calculateStock(selectedProduct) <= 0 && (
                    <span className="text-[9px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase mt-1">
                        ❌ สินค้าหมด
                    </span>
                )}
            </div>
        </div>

        {/* ส่วนกรอกราคาและจำนวน (คงเดิมไว้) */}
        <div className="grid grid-cols-2 gap-4">
            <Input label="ราคาต่อหน่วย" type="number" value={price} onChange={e => setPrice(Number(e.target.value))} />
            <Input label="จำนวนรายการ" type="number" value={qty} onChange={e => setQty(Math.max(1, Number(e.target.value)))} />
            <Button onClick={addToCart} className="col-span-full py-4 text-base font-black shadow-lg shadow-blue-100">
                <Plus size={18}/> เพิ่มลงตะกร้า
            </Button>
        </div>
    </div>
)}
                            </Card>

                            {type === 'OUT' && (
                                <Card className="bg-blue-600 !p-6 border-none text-white shadow-xl shadow-blue-200/50">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Users size={16} className="text-blue-100" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100 font-black">Member Search</h3>
                                    </div>
                                    <div className="flex gap-2 mb-4">
                                        {/* 🟢 อัปเดต Input: บังคับตัวเลข 10 หลัก */}
                                        <input 
                                            placeholder="เบอร์โทรศัพท์ (10 หลัก)..." 
                                            value={memberPhone} 
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, ''); // กรองตัวหนังสือออก
                                                if (val.length <= 10) setMemberPhone(val);    // จำกัด 10 ตัว
                                            }} 
                                            className="flex-1 bg-white text-slate-900 border-none rounded-2xl p-4 font-bold outline-none shadow-inner" 
                                        />
                                        <button 
                                            onClick={() => { 
                                                if (memberPhone.length !== 10) return alert('⚠️ กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก');
                                                const m = customers.find(c => c.phone === memberPhone); 
                                                if(m) setCurrentMember(m); 
                                                else alert('❌ ไม่พบสมาชิก'); 
                                            }} 
                                            className="bg-slate-900 text-white px-6 rounded-2xl font-black shadow-lg"
                                        >
                                            <Search size={20}/>
                                        </button>
                                    </div>
                                    {currentMember && (
                                        <div className="flex justify-between items-center p-4 bg-white rounded-2xl text-slate-800 border border-blue-400">
                                            <div><p className="font-black text-sm">{currentMember.name}</p><p className="text-[10px] font-bold text-blue-600 italic">แต้มคงเหลือ: {(currentMember.points || 0).toLocaleString()}</p></div>
                                            <div className="text-right">
                                                <span className="text-[9px] font-black text-slate-400 uppercase">ใช้แต้ม (฿)</span>
                                                <input type="number" className="w-20 bg-slate-100 rounded-lg p-1.5 text-center font-black" value={pointsToUse} onChange={e => setPointsToUse(Math.max(0, Math.min(currentMember.points, Math.min(grandTotal, Number(e.target.value)))))} />
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            )}
                            <Card className="!p-5 border-2 border-dashed border-slate-200 bg-white">
                                <div className="flex items-center gap-2 mb-3 text-slate-400 text-[10px] font-black uppercase"><MessageSquare size={16}/> หมายเหตุ</div>
                                <textarea className="w-full bg-slate-50 rounded-xl p-4 text-sm min-h-[60px] outline-none" placeholder="รายละเอียดบิล..." value={cartNote} onChange={e => setCartNote(e.target.value)} />
                            </Card>
                        </>
                    ) : (
                        <Card className="!p-8 border-2 border-blue-100 shadow-xl animate-in zoom-in-95">
                            <button onClick={() => setIsPaymentStep(false)} className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-6 hover:text-slate-600"><ArrowLeft size={18}/> ย้อนกลับไปตะกร้า</button>
                            <div className="mb-8 text-center">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">ยอดชำระสุทธิ</p>
                                <p className="text-6xl font-black text-blue-600">฿{finalAmount.toLocaleString()}</p>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-center text-xs font-black text-slate-500 uppercase mb-3">รับเงินสด</label>
                                    <input autoFocus type="number" className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] py-6 text-4xl font-black text-center outline-none" value={receivedAmount || ''} onChange={(e) => setReceivedAmount(Number(e.target.value))} placeholder="0.00" />
                                </div>
                                <div className="grid grid-cols-4 gap-3">
                                    {[20, 100, 500, 1000].map(val => (
                                        <button key={val} onClick={() => setReceivedAmount(prev => Number(prev) + val)} className="py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-600 hover:bg-blue-600 hover:text-white transition-all text-sm shadow-sm">+{val}</button>
                                    ))}
                                    <button onClick={() => setReceivedAmount(finalAmount)} className="col-span-2 py-4 bg-green-50 text-green-600 border border-green-200 rounded-2xl font-black hover:bg-green-600 hover:text-white">จ่ายพอดี</button>
                                    <button onClick={() => setReceivedAmount(0)} className="col-span-2 py-4 bg-red-50 text-red-500 border border-red-200 rounded-2xl font-black hover:bg-red-500 hover:text-white">ล้าง</button>
                                </div>
                                <div className={`p-6 rounded-[2rem] text-center border-2 ${receivedAmount >= finalAmount ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100'}`}>
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">เงินทอน</p>
                                    <p className={`text-4xl font-black ${receivedAmount >= finalAmount ? 'text-green-600' : 'text-slate-300'}`}>฿{changeAmount.toLocaleString()}</p>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

                <aside className="hidden lg:flex w-[40%] bg-white border border-slate-100 rounded-[2.5rem] flex-col h-[calc(100vh-140px)] sticky top-8 shadow-sm overflow-hidden no-print">
                    <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between">
                        <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight"><ShoppingCart size={18} className="inline mr-2"/> Summary</h3>
                        <span className="bg-slate-900 text-white text-[10px] px-3 py-1 rounded-full font-black">{cart.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-200 opacity-40"><ShoppingCart size={64} className="mb-4" /><p className="text-[10px] font-black">ตะกร้าว่าง</p></div>
                        ) : (
                            cart.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center group animate-in slide-in-from-right-2">
                                    <div className="flex items-center gap-3">
                                        {!isPaymentStep && <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="w-8 h-8 flex items-center justify-center text-red-100 hover:text-red-500 transition-all"><Trash2 size={14}/></button>}
                                        <div><p className="font-bold text-sm text-slate-700">{item.name}</p><p className="text-[10px] text-slate-400 font-bold">{item.qty} x ฿{item.price.toLocaleString()}</p></div>
                                    </div>
                                    <span className="font-black text-slate-800 text-sm">฿{item.total.toLocaleString()}</span>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="p-8 bg-slate-50 border-t space-y-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <span className="text-xs font-black text-slate-400 uppercase block mb-1 tracking-widest">Grand Total</span>
                                <span className="text-4xl font-black text-blue-600 tracking-tighter italic">฿{finalAmount.toLocaleString()}</span>
                            </div>
                        </div>
                        {type === 'IN' ? (
                            <Button className="w-full py-5 text-xl font-black shadow-xl" onClick={saveTransaction} disabled={cart.length === 0}><CheckCircle size={24} className="mr-2"/> ยืนยันรับสต็อก</Button>
                        ) : (
                            !isPaymentStep ? (
                                <Button className="w-full py-5 text-xl font-black shadow-xl" onClick={() => setIsPaymentStep(true)} disabled={cart.length === 0}>ไปที่ชำระเงิน</Button>
                            ) : (
                                <Button className="w-full py-5 text-xl font-black shadow-xl" onClick={saveTransaction} disabled={receivedAmount < finalAmount}><CheckCircle size={24} className="mr-2"/> {receivedAmount < finalAmount ? 'เงินไม่พอ' : 'ยืนยันและจบบิล'}</Button>
                            )
                        )}
                    </div>
                </aside>
            </div>

            {showReceipt && lastBill && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 no-print">
                    <Card className="max-w-md w-full p-8 text-center relative animate-in zoom-in-95 shadow-2xl">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><CheckCircle size={48} /></div>
                        <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">ทำรายการสำเร็จ</h2>
                        <p className="text-slate-400 text-sm mb-8">บิลเลขที่: {lastBill.docNo}</p>
                        <div className="space-y-3">
                            <Button className="w-full py-5 text-lg font-black flex items-center justify-center gap-3 shadow-xl shadow-blue-200" onClick={() => window.print()}><Printer size={24} /> พิมพ์ใบเสร็จ</Button>
                            <Button variant="secondary" className="w-full py-4 text-slate-500 font-bold" onClick={handleFullReset}>เริ่มบิลใหม่</Button>
                        </div>
                    </Card>
                </div>
            )}

            {lastBill && <PrintReceipt data={lastBill} />}
        </div>
    );
}