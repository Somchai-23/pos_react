import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Trash2, Plus, Search, ShoppingCart, MessageSquare, Users, AlertCircle, PauseCircle, PlayCircle, CheckCircle, ArrowLeft, Printer, X, UserPlus, SearchCode } from 'lucide-react'; 
import { Button, Input, Card } from './UIComponents';
import { db } from '../firebase';
import { collection, doc, increment, runTransaction, addDoc } from "firebase/firestore";
import { PrintReceipt } from './PrintTemplate'; 

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

    // 🟢 State ใหม่สำหรับระบบค้นหาสินค้า (Autocomplete)
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchRef = useRef(null);

    useEffect(() => { setCurrentDocNo(generateDocNo('OUT')); }, [generateDocNo]);

    // 🟢 ระบบซ่อนกล่อง Suggestion เมื่อคลิกที่อื่น
    useEffect(() => {
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleFullReset = () => {
        setCart([]); setCartNote(''); setCurrentMember(null); setMemberPhone('');
        setPointsToUse(0); setIsPaymentStep(false); setReceivedAmount(0);
        setShowReceipt(false); setLastBill(null); setLowStockAlerts([]);
        setCurrentDocNo(generateDocNo('OUT')); setShowMobileCart(false);
        setSearchQuery(''); setSelectedProduct(''); setPrice(0); // ล้างค่าค้นหา
    };

    // 🟢 คำนวณยอดก่อนลดและยอดสุทธิ
    const subTotalAmount = cart.reduce((sum, item) => sum + item.total, 0);
    const finalAmount = subTotalAmount - Number(pointsToUse);
    const changeAmount = receivedAmount > 0 ? receivedAmount - finalAmount : 0;

    const saveTransaction = async () => {
        if (cart.length === 0) return;
        if (receivedAmount < finalAmount) return alert('⚠️ ยอดเงินไม่เพียงพอ');

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
                    shopId: currentUser.shopId, 
                    date: new Date().toISOString(),
                    items: cart, 
                    subTotal: subTotalAmount, // 🟢 บันทึกยอดก่อนลด
                    pointsDiscount: Number(pointsToUse), // 🟢 บันทึกส่วนลดที่ใช้
                    totalAmount: finalAmount, 
                    receivedAmount: Number(receivedAmount),
                    changeAmount: Number(changeAmount), 
                    note: cartNote, 
                    memberName: currentMember?.name || 'ลูกค้าทั่วไป', 
                    memberPhone: currentMember?.phone || memberPhone || '', 
                    createdAt: new Date()
                };
                
                transaction.set(billRef, billData);
                if (currentMember) {
                    const memberRef = doc(db, "customers", currentMember.id);
                    const earned = Math.floor(finalAmount / (memberSettings?.bahtPerPoint || 20));
                    transaction.update(memberRef, { points: increment(earned - Number(pointsToUse)) });
                }
                setLastBill({ 
                    ...billData, 
                    dateFormatted: new Date().toLocaleString('th-TH') 
                });
            });
            setShowReceipt(true); 
        } catch (error) { alert('❌ เกิดข้อผิดพลาด: ' + error.message); }
    };

    const handleRegisterCustomer = async () => {
        const name = prompt("ชื่อลูกค้าใหม่:");
        if (!name) return;
        try {
            const customerData = {
                name: name, phone: memberPhone, points: 0,
                shopId: currentUser.shopId, createdAt: new Date().toISOString()
            };
            const docRef = await addDoc(collection(db, "customers"), customerData);
            setCurrentMember({ id: docRef.id, ...customerData });
            alert("✅ สมัครสำเร็จ");
        } catch (e) { alert("❌ " + e.message); }
    };

    // 🟢 ระบบกรองสินค้าตามคำค้นหา
    const suggestedProducts = products.filter(p => 
        p.code?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.name?.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5); // แสดงแค่ 5 รายการที่ตรงสุด

    // 🟢 ฟังก์ชันเมื่อคลิกเลือกสินค้าจากคำค้นหา
    const selectProductFromSearch = (product) => {
        setSelectedProduct(product.id);
        setPrice(product.sellPrice || 0);
        setSearchQuery(`${product.code} - ${product.name}`); // เอาชื่อไปโชว์ในกล่อง
        setShowSuggestions(false);
    };

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
        
        // ล้างค่าหลังเพิ่มลงตะกร้า
        setQty(1); 
        setSelectedProduct(''); 
        setPrice(0);
        setSearchQuery('');
    };

    const holdCurrentBill = () => {
        if (cart.length === 0) return alert('⚠️ ตะกร้าว่างเปล่า');
        setHeldBills(prev => [...(prev || []), { id: Date.now(), cart: [...cart], memberPhone, currentMember, pointsToUse, cartNote, totalAmount: finalAmount, timestamp: new Date() }]);
        handleFullReset();
        alert('📌 พักบิลแล้ว');
    };

    const recallBill = (bill) => {
        setCart(bill.cart); setMemberPhone(bill.memberPhone || ''); setCurrentMember(bill.currentMember || null);
        setPointsToUse(bill.pointsToUse || 0); setCartNote(bill.cartNote || '');
        setHeldBills(prev => prev.filter(b => b.id !== bill.id)); setShowHeldBills(false);
    };

    // 🟢 รองรับการสแกน QR แล้วแอดลงตะกร้าทันที หรือเอามาโชว์
    const onScanResult = (code) => {
        const p = products.find(prod => prod.code === code);
        if (!p) return alert('❌ ไม่พบสินค้า');
        if ((cart.find(i=>i.productId===p.id)?.qty || 0) + 1 > p.stock) return alert(`❌ สินค้าไม่พอขาย!`);
        
        // แอดลงตะกร้าให้เลยเพื่อความรวดเร็ว
        setCart(prev => prev.some(i=>i.productId===p.id) 
            ? prev.map(i=>i.productId===p.id?{...i,qty:i.qty+1,total:(i.qty+1)*i.price}:i) 
            : [...prev,{productId:p.id,name:p.name,qty:1,price:Number(p.sellPrice||0),total:Number(p.sellPrice||0),unit:p.unit}]
        );
        // ล้างช่องค้นหา
        setSearchQuery('');
        setSelectedProduct('');
    };

    return (
        <>
            <style>{`
                @media print {
                    body * { visibility: hidden !important; }
                    #receipt-print-area, #receipt-print-area * { visibility: visible !important; }
                    #receipt-print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: white;
                    }
                }
            `}</style>

            <div className="p-4 md:p-8 h-full max-w-[1600px] mx-auto overflow-hidden print:hidden">
                <div className="flex flex-col lg:flex-row gap-8 h-full items-start pb-28">
                    <div className="w-full lg:w-[60%] space-y-6">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <h1 className="text-3xl font-black text-slate-800 tracking-tight italic uppercase">Sales Terminal</h1>
                                {heldBills.length > 0 && (
                                    <button onClick={() => setShowHeldBills(true)} className="bg-orange-100 text-orange-600 px-4 py-2 rounded-2xl text-[10px] font-black flex items-center gap-2 animate-pulse border border-orange-200">
                                        <PauseCircle size={16} /> บิลที่พัก ({heldBills.length})
                                    </button>
                                )}
                            </div>
                            <span className="font-mono text-[10px] bg-white border px-3 py-1 rounded-full text-slate-400 font-bold">{currentDocNo}</span>
                        </div>

                        {!isPaymentStep ? (
                            <>
                                <Card className="!p-6 border-none shadow-sm">
                                    <div className="flex gap-2 mb-4 relative" ref={searchRef}>
                                        {/* 🟢 1. เปลี่ยน Select เป็น Search Input */}
                                        <div className="flex-1 relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <SearchCode size={20} className="text-slate-400" />
                                            </div>
                                            <input 
                                                type="text"
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-blue-400 transition-colors"
                                                placeholder="รหัสสินค้า"
                                                value={searchQuery}
                                                onChange={(e) => {
                                                    setSearchQuery(e.target.value);
                                                    setSelectedProduct(''); // รีเซ็ตการเลือกถ้ามีการพิมพ์ใหม่
                                                    setShowSuggestions(true);
                                                }}
                                                onFocus={() => setShowSuggestions(true)}
                                            />
                                            
                                            {/* กล่อง Suggestion */}
                                            {showSuggestions && searchQuery.trim() !== '' && (
                                                <div className="absolute z-10 w-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                    {suggestedProducts.length > 0 ? (
                                                        suggestedProducts.map(p => (
                                                            <div 
                                                                key={p.id} 
                                                                className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center transition-colors"
                                                                onClick={() => selectProductFromSearch(p)}
                                                            >
                                                                <div>
                                                                    <p className="font-black text-sm text-slate-800">{p.name}</p>
                                                                    <p className="text-[10px] font-mono text-slate-400">{p.code}</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="font-black text-blue-600">฿{(p.sellPrice || 0).toLocaleString()}</p>
                                                                    <p className={`text-[10px] font-bold ${p.stock <= 0 ? 'text-red-500' : 'text-slate-400'}`}>เหลือ {p.stock}</p>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-4 py-4 text-center text-sm font-bold text-slate-400">ไม่พบสินค้าที่ตรงกัน</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <Button variant="secondary" className="rounded-2xl w-14 h-14" onClick={() => handleScanQR(onScanResult)}>
                                            <QrCode />
                                        </Button>
                                    </div>

                                    {/* 🟢 แสดงฟอร์มเฉพาะเมื่อเลือกสินค้าจาก Suggestion แล้ว */}
                                    {selectedProduct && (
                                        <div className="space-y-4 animate-in fade-in zoom-in-95">
                                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    สต็อกคงเหลือ: <span className="text-slate-800 text-sm">{products.find(p=>p.id===selectedProduct)?.stock}</span>
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="ราคา (฿)" type="number" value={price} onChange={e => setPrice(Number(e.target.value))} />
                                                <Input label="จำนวน" type="number" value={qty} onChange={e => setQty(Math.max(1, Number(e.target.value)))} />
                                                <Button onClick={addToCart} className="col-span-full py-4 font-black text-lg shadow-lg shadow-blue-100">
                                                    เพิ่มลงตะกร้า
                                                </Button>
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
                                            else if(memberPhone.length === 10) { if(confirm("ไม่พบเบอร์นี้ ต้องการสมัครสมาชิกใหม่?")) handleRegisterCustomer(); }
                                            else alert('❌ ไม่พบสมาชิก'); 
                                        }} className="bg-slate-900 text-white px-5 rounded-2xl font-black hover:bg-slate-800 transition-colors"><Search size={20}/></button>
                                    </div>
                                    {currentMember && (
                                        <div className="mt-4 p-4 bg-white rounded-2xl text-slate-800 flex justify-between items-center animate-in zoom-in-95">
                                            <div><p className="font-black text-sm">{currentMember.name}</p><p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">Points: {currentMember.points.toLocaleString()}</p></div>
                                            <div className="text-right">
                                                <span className="text-[9px] font-black text-slate-400 block uppercase tracking-widest mb-1">ใช้แต้มลด (฿)</span>
                                                <input type="number" className="w-20 bg-slate-100 rounded-lg p-1.5 text-center font-black outline-none focus:ring-2 focus:ring-blue-400 transition-shadow" value={pointsToUse} onChange={e => setPointsToUse(Math.max(0, Math.min(currentMember.points, Math.min(subTotalAmount + Number(pointsToUse), Number(e.target.value)))))} />
                                            </div>
                                        </div>
                                    )}
                                </Card>

                                <Card className="!p-5 border-2 border-dashed border-slate-200 bg-white">
                                    <div className="flex items-center gap-2 mb-3 text-slate-400 text-[10px] font-black uppercase tracking-widest"><MessageSquare size={16}/> บันทึกหมายเหตุบิล</div>
                                    <textarea className="w-full bg-slate-50 rounded-xl p-4 text-sm font-bold min-h-[80px] outline-none focus:ring-4 focus:ring-blue-50 transition-all border border-slate-100" placeholder="พิมพ์รายละเอียดที่นี่..." value={cartNote} onChange={e => setCartNote(e.target.value)} />
                                </Card>
                            </>
                        ) : (
                            <Card className="!p-8 border-2 border-blue-100 shadow-xl animate-in zoom-in-95 text-center relative overflow-hidden">
                                <button onClick={() => setIsPaymentStep(false)} className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-6 hover:text-slate-600 transition-colors"><ArrowLeft size={18}/> ย้อนกลับแก้ไข</button>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">ยอดชำระสุทธิ</p>
                                <p className="text-6xl font-black text-blue-600 mb-8 tracking-tighter italic">฿{finalAmount.toLocaleString()}</p>
                                <div className="space-y-6">
                                    <input autoFocus type="number" className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] py-6 text-5xl font-black text-center outline-none focus:ring-4 focus:ring-blue-50 transition-all" value={receivedAmount || ''} onChange={(e) => setReceivedAmount(Number(e.target.value))} placeholder="0.00" inputMode="numeric" />
                                    <div className="grid grid-cols-4 gap-3">
                                        {[20, 100, 500, 1000].map(val => (<button key={val} onClick={() => setReceivedAmount(prev => prev + val)} className="py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm">+{val}</button>))}
                                        <button onClick={() => setReceivedAmount(finalAmount)} className="col-span-2 py-4 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl font-black hover:bg-emerald-100 transition-colors">จ่ายพอดี</button>
                                        <button onClick={() => setReceivedAmount(0)} className="col-span-2 py-4 bg-red-50 text-red-500 border border-red-100 rounded-2xl font-black hover:bg-red-100 transition-colors">ล้างยอด</button>
                                    </div>
                                    <div className={`p-6 rounded-[2rem] border-2 transition-all ${receivedAmount >= finalAmount ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">เงินทอน</p>
                                        <p className={`text-4xl font-black ${receivedAmount >= finalAmount ? 'text-emerald-600' : 'text-slate-300'}`}>฿{changeAmount.toLocaleString()}</p>
                                    </div>
                                    
                                    <div className="lg:hidden pt-4 pb-2">
                                        <Button className="w-full py-5 text-xl font-black shadow-xl shadow-blue-200" onClick={saveTransaction} disabled={receivedAmount < finalAmount}>
                                            {receivedAmount < finalAmount ? 'ระบุเงินรับไม่พอ' : 'ยืนยันและจบบิล'}
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>

                    <aside className="hidden lg:flex w-[40%] bg-white border border-slate-100 rounded-[2.5rem] flex-col h-[calc(100vh-140px)] sticky top-8 shadow-xl overflow-hidden">
                        <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between"><h3 className="font-black text-slate-800 text-sm uppercase tracking-tight"><ShoppingCart size={18} className="inline mr-2"/> Summary</h3><span className="bg-slate-900 text-white text-[10px] px-3 py-1 rounded-full font-black">{cart.length}</span></div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 font-bold text-sm uppercase tracking-widest opacity-50">
                                    <ShoppingCart size={48} className="mb-4" />
                                    ตะกร้าว่างเปล่า
                                </div>
                            ) : (
                                cart.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center group animate-in slide-in-from-right-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            {!isPaymentStep && <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="w-8 h-8 text-red-200 hover:text-red-500 bg-white rounded-full flex items-center justify-center shadow-sm transition-all"><Trash2 size={14}/></button>}
                                            <div><p className="font-black text-sm text-slate-800">{item.name}</p><p className="text-[10px] text-slate-400 font-bold mt-0.5">{item.qty} x ฿{item.price.toLocaleString()}</p></div>
                                        </div>
                                        <span className="font-black text-slate-800 text-base">฿{item.total.toLocaleString()}</span>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-8 bg-slate-900 text-white space-y-4">
                            {/* 🟢 แสดงส่วนลดในตะกร้าด้านขวา */}
                            {pointsToUse > 0 && (
                                <div className="flex justify-between items-center text-sm font-bold text-red-400 mb-2 border-b border-slate-700 pb-2">
                                    <span>หักส่วนลดแต้มสะสม</span>
                                    <span>- ฿{Number(pointsToUse).toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-end pb-2">
                                <span className="text-slate-400 font-black uppercase text-xs tracking-widest">ยอดสุทธิ</span>
                                <span className="text-4xl font-black text-blue-400 italic tracking-tighter">฿{finalAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex gap-3 pt-2">
                                {!isPaymentStep && <Button variant="secondary" className="flex-1 py-5 font-black bg-slate-800 text-slate-300 border-none hover:bg-slate-700" onClick={holdCurrentBill} disabled={cart.length === 0}><PauseCircle size={20} /> พักบิล</Button>}
                                <Button className={`py-5 text-xl font-black shadow-xl shadow-blue-900/50 border-none ${isPaymentStep ? 'w-full' : 'flex-[2]'}`} onClick={() => { if(!isPaymentStep) setIsPaymentStep(true); else saveTransaction(); }} disabled={cart.length === 0 || (isPaymentStep && receivedAmount < finalAmount)}>
                                    {isPaymentStep ? (receivedAmount < finalAmount ? 'เงินไม่พอ' : 'ยืนยันบิล') : 'ชำระเงิน'}
                                </Button>
                            </div>
                        </div>
                    </aside>
                </div>

                {/* 🟢 เรียกใช้คอมโพเนนต์ใบเสร็จ และส่งข้อมูลที่อัปเดตแล้วไปให้ */}
                {showReceipt && lastBill && (
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 print:hidden">
                        <Card className="max-w-md w-full p-8 text-center animate-in zoom-in-95 shadow-2xl relative border-none rounded-[2.5rem]">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><CheckCircle size={48} /></div>
                            <h2 className="text-3xl font-black text-slate-800 mb-2 italic tracking-tighter uppercase">สำรเร็จ!</h2>
                            <p className="text-slate-400 text-sm mb-6 font-bold tracking-widest uppercase">Bill No: {lastBill.docNo}</p>
                            <div className="space-y-3">
                                <Button className="w-full py-5 text-lg font-black flex items-center justify-center gap-3 shadow-xl shadow-blue-100 border-none" onClick={() => window.print()}><Printer size={24} /> พิมพ์ใบเสร็จ</Button>
                                <Button variant="secondary" className="w-full py-4 text-slate-500 font-bold border-none bg-slate-50 hover:bg-slate-100" onClick={handleFullReset}>เริ่มบิลใหม่</Button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>

            {lastBill && (
                <div id="receipt-print-area" className="hidden print:block">
                    <PrintReceipt data={lastBill} shopName={memberSettings?.shopName} />
                </div>
            )}
        </>
    );
}