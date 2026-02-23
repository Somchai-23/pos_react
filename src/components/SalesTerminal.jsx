import React, { useState, useEffect } from 'react';
import { QrCode, Trash2, Plus, Search, ShoppingCart, MessageSquare, Users, AlertCircle, PauseCircle, PlayCircle, CheckCircle, ArrowLeft, Printer, X } from 'lucide-react'; 
import { Button, Input, Card } from './UIComponents';
import { db } from '../firebase';
import { collection, doc, increment, runTransaction } from "firebase/firestore";
import { PrintReceipt } from './PrintTemplate'; 

export default function SalesTerminal({ products, generateDocNo, handleScanQR, customers, memberSettings, calculateStock, heldBills = [], setHeldBills }) {
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

    const currentProductData = products.find(p => p.id === selectedProduct);
    const dynamicMinStock = Number(currentProductData?.minStock || 0);

    useEffect(() => { setCurrentDocNo(generateDocNo('OUT')); }, [generateDocNo]);

    const handleFullReset = () => {
        setCart([]); setCartNote(''); setCurrentMember(null); setMemberPhone('');
        setPointsToUse(0); setIsPaymentStep(false); setReceivedAmount(0);
        setShowReceipt(false); setLastBill(null); setLowStockAlerts([]);
        setCurrentDocNo(generateDocNo('OUT'));
    };

    // --- 🟢 ฟังก์ชันพักบิล ---
    const holdCurrentBill = () => {
        if (cart.length === 0) return alert('⚠️ ตะกร้าว่างเปล่า พักบิลไม่ได้');
        const newHeldBill = {
            id: Date.now(), cart: [...cart], memberPhone, currentMember,
            pointsToUse, cartNote, totalAmount: finalAmount, timestamp: new Date()
        };
        setHeldBills(prev => [...(prev || []), newHeldBill]);
        handleFullReset();
        alert('📌 พักบิลเรียบร้อย!');
    };

    const recallBill = (bill) => {
        if (cart.length > 0 && !confirm('⚠️ มีรายการค้างอยู่ในตะกร้า ต้องการล้างและดึงบิลนี้มาแทนที่?')) return;
        setCart(bill.cart); setMemberPhone(bill.memberPhone || '');
        setCurrentMember(bill.currentMember || null); setPointsToUse(bill.pointsToUse || 0);
        setCartNote(bill.cartNote || ''); setHeldBills(prev => prev.filter(b => b.id !== bill.id));
        setShowHeldBills(false);
    };

    // --- 🟢 การคำนวณเงิน ---
    const grandTotal = cart.reduce((sum, item) => sum + item.total, 0);
    const finalAmount = grandTotal - Number(pointsToUse);
    const earnedPoints = currentMember ? Math.floor(finalAmount / (memberSettings?.bahtPerPoint || 20)) : 0;
    const changeAmount = receivedAmount > 0 ? receivedAmount - finalAmount : 0;

    const addToCart = () => {
        const product = products.find(p => p.id === selectedProduct);
        if (!product) return alert('⚠️ โปรดเลือกสินค้าก่อน');
        const currentStock = calculateStock(product.id);
        const itemInCart = cart.find(i => i.productId === product.id);
        const currentQtyInCart = itemInCart ? Number(itemInCart.qty) : 0;

        if ((currentQtyInCart + Number(qty)) > currentStock) return alert(`❌ สินค้าไม่พอขาย!`);

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
                const itemsToAlert = [];
                for (const item of cart) {
                    const productRef = doc(db, "products", item.productId);
                    const productSnap = await transaction.get(productRef);
                    const currentCloudStock = Number(productSnap.data().stock || 0);
                    const itemMinStock = Number(productSnap.data().minStock || 0); 
                    const remainingAfterSale = currentCloudStock - item.qty;
                    if (remainingAfterSale <= itemMinStock) {
                        itemsToAlert.push({ name: item.name, remaining: remainingAfterSale, threshold: itemMinStock });
                    }
                    snapshots.push({ item, productRef, currentCloudStock });
                }
                for (const { item, productRef } of snapshots) {
                    transaction.update(productRef, { stock: increment(-Number(item.qty)) });
                }
                const billRef = doc(collection(db, "transactions"));
                const billData = {
                    type: 'OUT', 
                    docNo: currentDocNo,
                    shopId: user.shopId, 
                    date: new Date().toISOString(),
                    items: cart, totalAmount: finalAmount, 
                    receivedAmount: Number(receivedAmount),
                    changeAmount: Number(changeAmount), 
                    pointsUsed: Number(pointsToUse),
                    memberId: currentMember?.id || null, note: cartNote, createdAt: new Date()
                };
                transaction.set(billRef, billData);
                if (currentMember) {
                    const memberRef = doc(db, "customers", currentMember.id);
                    transaction.update(memberRef, { points: increment(earnedPoints - Number(pointsToUse)) });
                }
                setLastBill({ ...billData, memberName: currentMember?.name || 'ลูกค้าทั่วไป', dateFormatted: new Date().toLocaleString('th-TH') });
                setLowStockAlerts(itemsToAlert);
            });
            setShowReceipt(true); 
        } catch (error) { alert('❌ ' + error.message); }
    };

    return (
        <div className="p-4 md:p-8 h-full max-w-[1600px] mx-auto overflow-hidden">
            <div className="flex flex-col lg:flex-row gap-8 h-full items-start no-print">
                <div className="w-full lg:w-[60%] space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Sales Terminal</h1>
                            {heldBills.length > 0 && (
                                <button onClick={() => setShowHeldBills(true)} className="bg-orange-100 text-orange-600 px-4 py-2 rounded-2xl text-[10px] font-black flex items-center gap-2 animate-pulse border border-orange-200">
                                    <PauseCircle size={16} /> บิลที่พัก ({heldBills.length})
                                </button>
                            )}
                        </div>
                        <span className="font-mono text-[10px] bg-white border border-slate-200 px-3 py-1 rounded-full text-slate-400 font-bold">{currentDocNo}</span>
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
                                        const product = products.find(prod => prod.code === code);
                                        
                                        if (!product) return alert('❌ ไม่พบสินค้าจากรหัสนี้');

                                        // 1. ตรวจสอบสต็อกปัจจุบัน
                                        const currentStock = calculateStock(product.id);
                                        const itemInCart = cart.find(i => i.productId === product.id);
                                        const currentQtyInCart = itemInCart ? Number(itemInCart.qty) : 0;

                                        // 2. ถ้าสต็อกไม่พอ (กรณีขายออก)
                                        if (currentQtyInCart + 1 > currentStock) {
                                            return alert(`❌ "${product.name}" ไม่พอขาย! (เหลือ: ${currentStock})`);
                                        }

                                        // 3. ทำการเพิ่มเข้าตะกร้าทันที
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
                                                price: Number(product.sellPrice || 0), 
                                                total: Number(product.sellPrice || 0), 
                                                unit: product.unit 
                                            }]);
                                        }
                                        
                                        // รีเซ็ตการเลือกในช่อง Dropdown (ถ้ามีค้างอยู่)
                                        setSelectedProduct('');
                                    })}>
                                        <QrCode />
                                    </Button>
                                </div>
                                {selectedProduct && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-inner">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">คงเหลือปัจจุบัน</span>
                                            <span className={`font-black flex flex-col items-end ${calculateStock(selectedProduct) <= dynamicMinStock ? 'text-orange-500 animate-pulse' : 'text-blue-600'}`}>
                                                <span>{calculateStock(selectedProduct)} {currentProductData?.unit}</span>
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input label="ราคา/หน่วย" type="number" value={price} onChange={e => setPrice(Number(e.target.value))} />
                                            <Input label="จำนวน" type="number" value={qty} onChange={e => setQty(Math.max(1, Number(e.target.value)))} />
                                            <Button onClick={addToCart} className="col-span-full py-4 text-base font-black shadow-lg shadow-blue-100"><Plus size={18}/> เพิ่มรายการ</Button>
                                        </div>
                                    </div>
                                )}
                            </Card>

                            <Card className="bg-blue-600 !p-6 border-none text-white shadow-xl shadow-blue-200/50">
                                <div className="flex items-center gap-2 mb-4"><Users size={16} className="text-blue-100" /><h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">Member Search</h3></div>
                                <div className="flex flex-row gap-2 mb-4 h-14"> 
                                    <input placeholder="เบอร์โทรสมาชิก" value={memberPhone} onChange={e => setMemberPhone(e.target.value.replace(/\D/g, '').slice(0,10))} className="flex-1 min-w-0 bg-white text-slate-900 border-none rounded-2xl px-4 text-sm font-bold outline-none" />
                                    <button onClick={() => { 
                                        const m = customers.find(c => c.phone === memberPhone); 
                                        if(m) setCurrentMember(m); else alert('❌ ไม่พบสมาชิก'); 
                                    }} className="bg-slate-900 text-white px-5 rounded-2xl font-black"><Search size={20}/></button>
                                </div>
                                {currentMember && (
                                    <div className="flex justify-between items-center p-4 bg-white rounded-2xl text-slate-800 border border-blue-400 animate-in zoom-in-95">
                                        <div><p className="font-black text-sm">{currentMember.name}</p><p className="text-[10px] font-bold text-blue-600">Points: {currentMember.points.toLocaleString()}</p></div>
                                        <div className="text-right"><span className="text-[9px] font-black text-slate-400 uppercase">ใช้แต้ม (฿)</span><input type="number" className="w-20 bg-slate-100 rounded-lg p-1.5 text-center font-black outline-none" value={pointsToUse} onChange={e => setPointsToUse(Math.max(0, Math.min(currentMember.points, Math.min(grandTotal, Number(e.target.value)))))} /></div>
                                    </div>
                                )}
                            </Card>
                            <Card className="!p-5 border-2 border-dashed border-slate-200 bg-white">
                                <div className="flex items-center gap-2 mb-3 text-slate-400 text-[10px] font-black uppercase"><MessageSquare size={16}/> หมายเหตุ</div>
                                <textarea className="w-full bg-slate-50 rounded-xl p-4 text-sm min-h-[60px] outline-none" placeholder="รายละเอียดบิล..." value={cartNote} onChange={e => setCartNote(e.target.value)} />
                            </Card>
                        </>
                    ) : (
                        <Card className="!p-8 border-2 border-blue-100 shadow-xl animate-in zoom-in-95">
                            <button onClick={() => setIsPaymentStep(false)} className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-6"><ArrowLeft size={18}/> ย้อนกลับ</button>
                            <div className="mb-8 text-center"><p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">ยอดชำระสุทธิ</p><p className="text-6xl font-black text-blue-600">฿{finalAmount.toLocaleString()}</p></div>
                            <div className="space-y-6">
                                <div className="relative">
                                    <label className="block text-center text-xs font-black text-slate-500 uppercase mb-3">รับเงินสด</label>
                                    <input autoFocus type="number" className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] py-6 text-5xl font-black text-center outline-none focus:ring-4 focus:ring-blue-100 transition-all" value={receivedAmount || ''} onChange={(e) => setReceivedAmount(Number(e.target.value))} placeholder="0.00" />
                                </div>
                                <div className="grid grid-cols-4 gap-3">
                                    {[20, 100, 500, 1000].map(val => (
                                        <button key={val} onClick={() => setReceivedAmount(prev => prev + val)} className="py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-600 hover:bg-blue-600 hover:text-white transition-all text-sm shadow-sm">+{val}</button>
                                    ))}
                                    <button onClick={() => setReceivedAmount(finalAmount)} className="col-span-2 py-4 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl font-black">จ่ายพอดี</button>
                                    <button onClick={() => setReceivedAmount(0)} className="col-span-2 py-4 bg-red-50 text-red-500 border border-red-100 rounded-2xl font-black">ล้างยอด</button>
                                </div>
                                <div className={`p-6 rounded-[2rem] text-center border-2 transition-all ${receivedAmount >= finalAmount ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">เงินทอน</p>
                                    <p className={`text-4xl font-black ${receivedAmount >= finalAmount ? 'text-emerald-600' : 'text-slate-300'}`}>฿{changeAmount.toLocaleString()}</p>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

                <aside className="hidden lg:flex w-[40%] bg-white border border-slate-100 rounded-[2.5rem] flex-col h-[calc(100vh-140px)] sticky top-8 shadow-sm overflow-hidden">
                    <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between"><h3 className="font-black text-slate-800 text-sm uppercase tracking-tight"><ShoppingCart size={18} className="inline mr-2"/> Summary</h3><span className="bg-slate-900 text-white text-[10px] px-3 py-1 rounded-full font-black">{cart.length}</span></div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {cart.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center group animate-in slide-in-from-right-2">
                                <div className="flex items-center gap-3">
                                    {!isPaymentStep && <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="w-8 h-8 text-red-100 hover:text-red-500 transition-all"><Trash2 size={14}/></button>}
                                    <div><p className="font-bold text-sm text-slate-700">{item.name}</p><p className="text-[10px] text-slate-400 font-bold">{item.qty} x ฿{item.price.toLocaleString()}</p></div>
                                </div>
                                <span className="font-black text-slate-800 text-sm">฿{item.total.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                    <div className="p-8 bg-slate-50 border-t space-y-4">
                        <div className="flex justify-between items-end">
                            <div><span className="text-xs font-black text-slate-400 uppercase block mb-1">Grand Total</span><span className="text-4xl font-black text-blue-600 tracking-tighter italic">฿{finalAmount.toLocaleString()}</span></div>
                        </div>
                        <div className="flex gap-3">
                            {!isPaymentStep && (
                                <Button variant="secondary" className="flex-1 py-5 font-black bg-white" onClick={holdCurrentBill} disabled={cart.length === 0}><PauseCircle size={20} /> พักบิล</Button>
                            )}
                            <Button className={`py-5 text-xl font-black shadow-xl ${isPaymentStep ? 'w-full' : 'flex-[2]'}`} onClick={() => {
                                if(!isPaymentStep) setIsPaymentStep(true); else saveTransaction();
                            }} disabled={cart.length === 0 || (isPaymentStep && receivedAmount < finalAmount)}>
                                {isPaymentStep ? (receivedAmount < finalAmount ? 'เงินไม่พอ' : 'ยืนยันและจบบิล') : 'ไปที่ชำระเงิน'}
                            </Button>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Modal บิลที่พัก */}
            {showHeldBills && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-4 no-print">
                    <Card className="max-w-md w-full p-6 animate-in zoom-in-95 shadow-2xl">
                        <div className="flex justify-between items-center mb-6 border-b pb-4"><h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><PauseCircle className="text-orange-500"/> รายการบิลที่พักไว้</h2><button onClick={() => setShowHeldBills(false)}><X /></button></div>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {heldBills.map(bill => (
                                <div key={bill.id} className="p-4 border-2 border-slate-50 bg-slate-50/50 rounded-2xl hover:border-blue-500 hover:bg-white cursor-pointer transition-all group" onClick={() => recallBill(bill)}>
                                    <div className="flex justify-between items-start mb-2"><span className="text-[10px] font-black text-slate-400 tracking-tighter">🕒 {new Date(bill.timestamp).toLocaleTimeString()}</span><span className="font-black text-blue-600">฿{bill.totalAmount.toLocaleString()}</span></div>
                                    <div className="flex justify-between items-center"><p className="text-xs font-bold text-slate-600">{bill.cart.length} รายการ | {bill.currentMember?.name || 'ลูกค้าทั่วไป'}</p><PlayCircle className="text-blue-500" size={20}/></div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {/* ระบบพิมพ์ใบเสร็จ */}
            {showReceipt && lastBill && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 no-print">
                    <Card className="max-w-md w-full p-8 text-center relative animate-in zoom-in-95 shadow-2xl">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle size={48} /></div>
                        <h2 className="text-3xl font-black text-slate-800 mb-2">ทำรายการสำเร็จ</h2>
                        <p className="text-slate-400 text-sm mb-6">บิลเลขที่: {lastBill.docNo}</p>
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