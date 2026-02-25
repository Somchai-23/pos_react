import React, { useState, useEffect } from 'react';
import { QrCode, Trash2, Plus, Search, ShoppingCart, MessageSquare, Users, AlertCircle, PauseCircle, PlayCircle, CheckCircle, ArrowLeft, Printer, X, UserPlus } from 'lucide-react'; 
import { Button, Input, Card } from './UIComponents';
import { db } from '../firebase';
import { collection, doc, increment, runTransaction, addDoc } from "firebase/firestore";
import { PrintReceipt } from './PrintTemplate'; 

// 🟢 เปลี่ยนจาก user เป็น currentUser เพื่อให้ตรงกับมาตรฐานแอป
export default function SalesTerminal({ currentUser, products, generateDocNo, handleScanQR, customers, memberSettings, calculateStock, heldBills = [], setHeldBills }) {
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
    const [lowStockAlerts, setLowStockAlerts] = useState([]);
    const [showHeldBills, setShowHeldBills] = useState(false);
    const [showMobileCart, setShowMobileCart] = useState(false);

    // --- 🟢 ฟังก์ชันสมัครสมาชิกให้ลูกค้าใหม่ ---
    const handleRegisterCustomer = async () => {
        const name = prompt("กรุณาระบุชื่อลูกค้า:");
        if (!name) return;
        try {
            const customerData = {
                name: name,
                phone: memberPhone,
                points: 0,
                shopId: currentUser.shopId, // 👈 ใช้ currentUser ได้แล้ว
                createdAt: new Date().toISOString()
            };
            const docRef = await addDoc(collection(db, "customers"), customerData);
            setCurrentMember({ id: docRef.id, ...customerData });
            alert("✅ สมัครสมาชิกเรียบร้อย!");
        } catch (error) { alert("❌ สมัครไม่สำเร็จ: " + error.message); }
    };

    const currentProductData = products.find(p => p.id === selectedProduct);
    const dynamicMinStock = Number(currentProductData?.minStock || 0);

    useEffect(() => { setCurrentDocNo(generateDocNo('OUT')); }, [generateDocNo]);

    const handleFullReset = () => {
        setCart([]); setCartNote(''); setCurrentMember(null); setMemberPhone('');
        setPointsToUse(0); setIsPaymentStep(false); setReceivedAmount(0);
        setShowReceipt(false); setLastBill(null); setLowStockAlerts([]);
        setCurrentDocNo(generateDocNo('OUT')); setShowMobileCart(false);
    };

    const finalAmount = cart.reduce((sum, item) => sum + item.total, 0) - Number(pointsToUse);
    const changeAmount = receivedAmount > 0 ? receivedAmount - finalAmount : 0;

    const addToCart = () => {
        const product = products.find(p => p.id === selectedProduct);
        if (!product) return alert('⚠️ โปรดเลือกสินค้าก่อน');
        const currentStock = Number(product.stock || 0); 
        const itemInCart = cart.find(i => i.productId === product.id);
        if (((itemInCart ? itemInCart.qty : 0) + Number(qty)) > currentStock) return alert(`❌ สินค้าไม่พอขาย!`);
        if (itemInCart) {
            setCart(cart.map(i => i.productId === product.id ? { ...i, qty: i.qty + Number(qty), total: (i.qty + Number(qty)) * i.price } : i));
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
                    snapshots.push({ item, productRef });
                }
                for (const { item, productRef } of snapshots) {
                    transaction.update(productRef, { stock: increment(-Number(item.qty)) });
                }
                const billRef = doc(collection(db, "transactions"));
                const billData = {
                    type: 'OUT', docNo: currentDocNo, 
                    shopId: currentUser.shopId, // 👈 แก้ไขเป็น currentUser
                    date: new Date().toISOString(),
                    items: cart, totalAmount: finalAmount, receivedAmount: Number(receivedAmount),
                    changeAmount: Number(changeAmount), note: cartNote, createdAt: new Date()
                };
                transaction.set(billRef, billData);
                if (currentMember) {
                    const memberRef = doc(db, "customers", currentMember.id);
                    const earned = Math.floor(finalAmount / (memberSettings?.bahtPerPoint || 20));
                    transaction.update(memberRef, { points: increment(earned - Number(pointsToUse)) });
                }
                setLastBill({ ...billData, memberName: currentMember?.name || 'ลูกค้าทั่วไป', dateFormatted: new Date().toLocaleString('th-TH') });
            });
            setShowReceipt(true); 
        } catch (error) { alert('❌ ' + error.message); }
    };

    const holdCurrentBill = () => {
        if (cart.length === 0) return alert('⚠️ ตะกร้าว่างเปล่า พักบิลไม่ได้');
        const newHeldBill = { id: Date.now(), cart: [...cart], memberPhone, currentMember, pointsToUse, cartNote, totalAmount: finalAmount, timestamp: new Date() };
        setHeldBills(prev => [...(prev || []), newHeldBill]);
        handleFullReset();
        alert('📌 พักบิลเรียบร้อย!');
    };

    const recallBill = (bill) => {
        setCart(bill.cart); setMemberPhone(bill.memberPhone || ''); setCurrentMember(bill.currentMember || null);
        setPointsToUse(bill.pointsToUse || 0); setCartNote(bill.cartNote || '');
        setHeldBills(prev => prev.filter(b => b.id !== bill.id)); setShowHeldBills(false);
    };

    return (
        <div className="p-4 md:p-8 h-full max-w-[1600px] mx-auto overflow-hidden">
            <div className="flex flex-col lg:flex-row gap-8 h-full items-start no-print pb-28">
                <div className="w-full lg:w-[60%] space-y-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight italic uppercase">Sales Terminal</h1>
                        <span className="font-mono text-[10px] bg-white border px-3 py-1 rounded-full text-slate-400 font-bold">{currentDocNo}</span>
                    </div>

                    {!isPaymentStep ? (
                        <>
                            <Card className="!p-6 border-none shadow-sm">
                                <div className="flex gap-2 mb-4">
                                    <select className="flex-1 bg-slate-50 border-2 border-slate-50 rounded-2xl p-4 text-sm font-bold outline-none" value={selectedProduct} onChange={(e) => {
                                        const pid = e.target.value; setSelectedProduct(pid);
                                        const p = products.find(prod => prod.id === pid);
                                        if(p) setPrice(p.sellPrice || 0);
                                    }}>
                                        <option value="">-- เลือกสินค้า --</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.code} | {p.name}</option>)}
                                    </select>
                                    <Button variant="secondary" className="rounded-2xl w-14 h-14" onClick={() => handleScanQR((code) => {
                                        const p = products.find(prod => prod.code === code);
                                        if (!p) return alert('❌ ไม่พบสินค้า');
                                        if ((cart.find(i=>i.productId===p.id)?.qty || 0) + 1 > p.stock) return alert(`❌ สินค้าไม่พอขาย!`);
                                        setCart(prev => prev.some(i=>i.productId===p.id) ? prev.map(i=>i.productId===p.id?{...i,qty:i.qty+1,total:(i.qty+1)*i.price}:i) : [...prev,{productId:p.id,name:p.name,qty:1,price:Number(p.sellPrice||0),total:Number(p.sellPrice||0),unit:p.unit}]);
                                    })}><QrCode /></Button>
                                </div>
                                {selectedProduct && (
                                    <div className="space-y-4 animate-in fade-in zoom-in-95">
                                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border">
                                            <span className="text-[10px] font-black text-slate-400 uppercase">คงเหลือปัจจุบัน: {currentProductData.stock} {currentProductData.unit}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input label="ราคา" type="number" value={price} onChange={e => setPrice(Number(e.target.value))} />
                                            <Input label="จำนวน" type="number" value={qty} onChange={e => setQty(Math.max(1, Number(e.target.value)))} />
                                            <Button onClick={addToCart} className="col-span-full py-4 font-black"><Plus size={18}/> เพิ่มลงตะกร้า</Button>
                                        </div>
                                    </div>
                                )}
                            </Card>

                            <Card className="bg-blue-600 !p-6 border-none text-white shadow-xl">
                                <div className="flex flex-row gap-2 h-14"> 
                                    <input placeholder="เบอร์โทรสมาชิก" value={memberPhone} onChange={e => setMemberPhone(e.target.value.replace(/\D/g, '').slice(0,10))} className="flex-1 bg-white text-slate-900 rounded-2xl px-4 text-sm font-bold outline-none" />
                                    <button onClick={() => { 
                                        const m = customers.find(c => c.phone === memberPhone); 
                                        if(m) setCurrentMember(m); 
                                        else if(memberPhone.length === 10) { if(confirm("ไม่พบสมาชิก ต้องการสมัครใหม่?")) handleRegisterCustomer(); }
                                        else alert('❌ ไม่พบสมาชิก'); 
                                    }} className="bg-slate-900 text-white px-5 rounded-2xl font-black"><Search size={20}/></button>
                                </div>
                                {currentMember && (
                                    <div className="mt-4 p-4 bg-white rounded-2xl text-slate-800 flex justify-between items-center animate-in zoom-in-95">
                                        <div><p className="font-black text-sm">{currentMember.name}</p><p className="text-[10px] font-bold text-blue-600">Points: {currentMember.points.toLocaleString()}</p></div>
                                        <div className="text-right"><span className="text-[9px] font-black text-slate-400 block">ใช้แต้ม (฿)</span><input type="number" className="w-20 bg-slate-100 rounded-lg p-1.5 text-center font-black outline-none" value={pointsToUse} onChange={e => setPointsToUse(Math.max(0, Math.min(currentMember.points, Math.min(finalAmount + Number(pointsToUse), Number(e.target.value)))))} /></div>
                                    </div>
                                )}
                            </Card>

                            <Card className="!p-5 border-2 border-dashed border-slate-200 bg-white">
                                <div className="flex items-center gap-2 mb-3 text-slate-400 text-[10px] font-black uppercase"><MessageSquare size={16}/> หมายเหตุบิล</div>
                                <textarea className="w-full bg-slate-50 rounded-xl p-4 text-sm min-h-[80px] outline-none focus:ring-4 focus:ring-blue-50 transition-all" placeholder="รายละเอียดเพิ่มเติม..." value={cartNote} onChange={e => setCartNote(e.target.value)} />
                            </Card>
                        </>
                    ) : (
                        <Card className="!p-8 border-2 border-blue-100 shadow-xl animate-in zoom-in-95 text-center">
                            <button onClick={() => setIsPaymentStep(false)} className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-6"><ArrowLeft size={18}/> ย้อนกลับ</button>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">ยอดชำระสุทธิ</p>
                            <p className="text-6xl font-black text-blue-600 italic mb-8">฿{finalAmount.toLocaleString()}</p>
                            <div className="space-y-6">
                                <input autoFocus type="number" className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] py-6 text-5xl font-black text-center outline-none" value={receivedAmount || ''} onChange={(e) => setReceivedAmount(Number(e.target.value))} placeholder="0.00" />
                                <div className="grid grid-cols-4 gap-3">
                                    {[20, 100, 500, 1000].map(val => (<button key={val} onClick={() => setReceivedAmount(prev => prev + val)} className="py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-600">+{val}</button>))}
                                    <button onClick={() => setReceivedAmount(finalAmount)} className="col-span-2 py-4 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl font-black">จ่ายพอดี</button>
                                    <button onClick={() => setReceivedAmount(0)} className="col-span-2 py-4 bg-red-50 text-red-500 border border-red-100 rounded-2xl font-black">ล้างยอด</button>
                                </div>
                                <div className={`p-6 rounded-[2rem] border-2 transition-all ${receivedAmount >= finalAmount ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">เงินทอน</p>
                                    <p className={`text-4xl font-black ${receivedAmount >= finalAmount ? 'text-emerald-600' : 'text-slate-300'}`}>฿{changeAmount.toLocaleString()}</p>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

                <aside className="hidden lg:flex w-[40%] bg-white border border-slate-100 rounded-[2.5rem] flex-col h-[calc(100vh-140px)] sticky top-8 shadow-sm overflow-hidden">
                    <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between"><h3 className="font-black text-slate-800 text-sm uppercase"><ShoppingCart size={18} className="inline mr-2"/> Summary</h3><span className="bg-slate-900 text-white text-[10px] px-3 py-1 rounded-full font-black">{cart.length}</span></div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {cart.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center group animate-in slide-in-from-right-2">
                                <div className="flex items-center gap-3">
                                    {!isPaymentStep && <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="w-8 h-8 text-red-100 hover:text-red-500"><Trash2 size={14}/></button>}
                                    <div><p className="font-bold text-sm text-slate-700">{item.name}</p><p className="text-[10px] text-slate-400 font-bold">{item.qty} x ฿{item.price.toLocaleString()}</p></div>
                                </div>
                                <span className="font-black text-slate-800 text-sm">฿{item.total.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                    <div className="p-8 bg-slate-50 border-t space-y-4">
                        <div className="flex justify-between items-center"><span className="text-slate-400 font-black uppercase text-xs">ยอดรวม</span><span className="text-4xl font-black text-blue-600 italic">฿{finalAmount.toLocaleString()}</span></div>
                        <div className="flex gap-3">
                            {!isPaymentStep && <Button variant="secondary" className="flex-1 py-5 font-black bg-white" onClick={holdCurrentBill} disabled={cart.length === 0}><PauseCircle size={20} /> พักบิล</Button>}
                            <Button className={`py-5 text-xl font-black shadow-xl ${isPaymentStep ? 'w-full' : 'flex-[2]'}`} onClick={() => { if(!isPaymentStep) setIsPaymentStep(true); else saveTransaction(); }} disabled={cart.length === 0 || (isPaymentStep && receivedAmount < finalAmount)}>{isPaymentStep ? 'ยืนยันบิล' : 'ไปที่ชำระเงิน'}</Button>
                        </div>
                    </div>
                </aside>
            </div>

            {/* 🟢 Mobile Floating Button */}
            {!isPaymentStep && cart.length > 0 && (
                <div className="lg:hidden fixed bottom-24 left-4 right-4 z-[50] animate-in fade-in slide-in-from-bottom-10">
                    <button onClick={() => setShowMobileCart(true)} className="w-full bg-slate-900 text-white p-5 rounded-[2rem] shadow-2xl flex justify-between items-center border active:scale-95 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-600 p-2 rounded-2xl"><ShoppingCart size={22} /></div>
                            <div className="text-left"><p className="text-[10px] font-black text-slate-400 uppercase">ตะกร้า ({cart.length})</p><p className="text-lg font-black">ตรวจสอบรายการ</p></div>
                        </div>
                        <p className="text-2xl font-black italic text-blue-400">฿{finalAmount.toLocaleString()}</p>
                    </button>
                </div>
            )}

            {/* 🟢 Mobile Cart Modal + หมายเหตุ */}
            {showMobileCart && (
                <div className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex flex-col no-print">
                    <div className="flex-1 mt-16 bg-white rounded-t-[3.5rem] flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-500">
                        <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-black text-2xl text-slate-800 italic uppercase">Cart Details</h3>
                            <button onClick={() => setShowMobileCart(false)} className="p-3 bg-white shadow rounded-full"><X /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                            {cart.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-slate-50 p-5 rounded-[2rem] border shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-400"><Trash2 size={22}/></button>
                                        <div><p className="font-black text-slate-800">{item.name}</p><p className="text-xs font-bold text-slate-400">{item.qty} {item.unit} x ฿{item.price.toLocaleString()}</p></div>
                                    </div>
                                    <p className="font-black text-xl text-slate-800">฿{item.total.toLocaleString()}</p>
                                </div>
                            ))}
                            <div className="mt-4 p-5 border-2 border-dashed rounded-[2rem] bg-slate-50/30">
                                <div className="flex items-center gap-2 mb-3 text-slate-400 text-[10px] font-black uppercase"><MessageSquare size={16}/> บันทึกหมายเหตุ</div>
                                <textarea className="w-full bg-white border rounded-2xl p-4 text-sm min-h-[100px] outline-none" placeholder="พิมพ์รายละเอียด..." value={cartNote} onChange={e => setCartNote(e.target.value)} />
                            </div>
                        </div>
                        <div className="p-8 bg-white border-t-2 space-y-4">
                            <div className="flex justify-between items-center px-2"><span className="text-slate-400 font-black uppercase text-xs">ยอดรวมทั้งสิ้น</span><span className="text-4xl font-black text-blue-600 italic">฿{finalAmount.toLocaleString()}</span></div>
                            <div className="flex gap-3">
                                <Button variant="secondary" className="flex-1 py-5 font-black bg-slate-100" onClick={holdCurrentBill}><PauseCircle size={20} /> พักบิล</Button>
                                <Button className="flex-[2] py-5 text-xl font-black shadow-lg shadow-blue-200" onClick={() => { setShowMobileCart(false); setIsPaymentStep(true); }}>ชำระเงิน</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ระบบพิมพ์ใบเสร็จและบิลที่พัก */}
            {showHeldBills && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
                    <Card className="max-w-md w-full p-6 animate-in zoom-in-95 shadow-2xl border-none">
                        <div className="flex justify-between items-center mb-6 border-b pb-4"><h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><PauseCircle className="text-orange-500"/> บิลที่พักไว้</h2><button onClick={() => setShowHeldBills(false)}><X /></button></div>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {heldBills.map(bill => (
                                <div key={bill.id} className="p-4 border-2 border-slate-50 bg-slate-50/50 rounded-2xl hover:border-blue-500 hover:bg-white cursor-pointer transition-all" onClick={() => recallBill(bill)}>
                                    <div className="flex justify-between items-start mb-2"><span className="text-[10px] font-black text-slate-400">🕒 {new Date(bill.timestamp).toLocaleTimeString()}</span><span className="font-black text-blue-600">฿{bill.totalAmount.toLocaleString()}</span></div>
                                    <p className="text-xs font-bold text-slate-600 truncate">{bill.cart.length} รายการ | {bill.currentMember?.name || 'ลูกค้าทั่วไป'}</p>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {showReceipt && lastBill && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <Card className="max-w-md w-full p-8 text-center animate-in zoom-in-95 shadow-2xl border-none relative">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle size={48} /></div>
                        <h2 className="text-3xl font-black text-slate-800 mb-2 italic">DONE!</h2>
                        <p className="text-slate-400 text-sm mb-6 uppercase font-bold">Bill: {lastBill.docNo}</p>
                        <div className="space-y-3">
                            <Button className="w-full py-5 text-lg font-black flex items-center justify-center gap-3 shadow-xl" onClick={() => window.print()}><Printer size={24} /> พิมพ์ใบเสร็จ</Button>
                            <Button variant="secondary" className="w-full py-4 text-slate-500 font-bold" onClick={handleFullReset}>เริ่มบิลใหม่</Button>
                        </div>
                    </Card>
                </div>
            )}
            {lastBill && <PrintReceipt data={lastBill} />}
        </div>
    );
}