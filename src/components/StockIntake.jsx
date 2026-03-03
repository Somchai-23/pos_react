import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Trash2, Plus, ArrowDownLeft, Save, PackagePlus, FileText, Box, SearchCode } from 'lucide-react';
import { Button, Input, Card } from './UIComponents';
import { db } from '../firebase';
import { collection, doc, increment, runTransaction } from "firebase/firestore";

export default function StockIntake({ user, products, generateDocNo, handleScanQR, calculateStock }) {
    const [selectedProduct, setSelectedProduct] = useState('');
    const [qty, setQty] = useState(1);
    const [buyPrice, setBuyPrice] = useState(0);
    const [intakeList, setIntakeList] = useState([]);
    const [note, setNote] = useState(''); 
    const [currentDocNo, setCurrentDocNo] = useState('');
    const [loading, setLoading] = useState(false);

    // 🟢 State สำหรับระบบค้นหาสินค้า (Autocomplete)
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchRef = useRef(null);

    // สร้างเลขที่บิลรับเข้า (PO - Purchase Order)
    useEffect(() => { setCurrentDocNo(generateDocNo('IN')); }, [generateDocNo]);

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

    // 🟢 ระบบกรองสินค้าตามคำค้นหา
    const suggestedProducts = products.filter(p => 
        p.code?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.name?.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5); // แสดงแค่ 5 รายการ

    // 🟢 ฟังก์ชันเมื่อคลิกเลือกสินค้าจากคำค้นหา
    const selectProductFromSearch = (product) => {
        setSelectedProduct(product.id);
        setBuyPrice(product.buyPrice || 0); // ดึงต้นทุนมาแสดง
        setSearchQuery(`${product.code} - ${product.name}`); 
        setShowSuggestions(false);
    };

    const handleAddToList = () => {
        const product = products.find(p => p.id === selectedProduct);
        if (!product) return alert('⚠️ โปรดเลือกสินค้าก่อน');
        if (qty <= 0) return alert('⚠️ จำนวนต้องมากกว่า 0');

        const existingIndex = intakeList.findIndex(i => i.productId === product.id);
        if (existingIndex >= 0) {
            const newList = [...intakeList];
            newList[existingIndex].qty += Number(qty);
            newList[existingIndex].total = newList[existingIndex].qty * newList[existingIndex].price;
            setIntakeList(newList);
        } else {
            setIntakeList([...intakeList, { 
                productId: product.id, 
                name: product.name, 
                code: product.code,
                qty: Number(qty), 
                price: Number(buyPrice), 
                total: Number(qty) * Number(buyPrice), 
                unit: product.unit 
            }]);
        }
        
        // ล้างค่าหลังจากกดเพิ่ม
        setQty(1); 
        setSelectedProduct(''); 
        setBuyPrice(0);
        setSearchQuery(''); 
    };

    const handleSaveIntake = async () => {
        if (intakeList.length === 0) return alert('⚠️ ไม่มีรายการสินค้าในบิล');
        setLoading(true);

        try {
            const totalAmount = intakeList.reduce((sum, item) => sum + item.total, 0);

            await runTransaction(db, async (transaction) => {
                for (const item of intakeList) {
                    const productRef = doc(db, "products", item.productId);
                    transaction.update(productRef, { 
                        stock: increment(Number(item.qty)),
                        buyPrice: Number(item.price) 
                    });
                }

                const billRef = doc(collection(db, "transactions"));
                const operatorName = user?.displayName || user?.email?.split('@')[0] || 'พนักงาน (Staff)';

                const billData = {
                    type: 'IN', 
                    docNo: currentDocNo, 
                    shopId: user.shopId, 
                    date: new Date().toISOString(),
                    items: intakeList, 
                    totalAmount: totalAmount, 
                    note: note, 
                    memberName: operatorName, 
                    createdAt: new Date()
                };
                transaction.set(billRef, billData);
            });

            alert('✅ บันทึกการรับสินค้าเข้าสต็อกเรียบร้อย!');
            setIntakeList([]); 
            setNote('');
            setCurrentDocNo(generateDocNo('IN'));
        } catch (error) { 
            alert('❌ เกิดข้อผิดพลาด: ' + error.message); 
        } finally {
            setLoading(false);
        }
    };

    const totalValue = intakeList.reduce((sum, item) => sum + item.total, 0);

    return (
        <div className="p-4 md:p-8 h-full max-w-[1600px] mx-auto">
            <div className="flex flex-col lg:flex-row gap-8 h-full items-start">
                
                {/* --- 🟢 ฝั่งซ้าย: ฟอร์มเพิ่มสินค้า --- */}
                <div className="w-full lg:w-[60%] space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                                <ArrowDownLeft size={24} className="stroke-[3px]"/>
                            </div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight italic uppercase">Stock Intake</h1>
                        </div>
                        <span className="font-mono text-[10px] bg-white border border-slate-200 px-3 py-1 rounded-full text-slate-400 font-bold">{currentDocNo}</span>
                    </div>

                    <Card className="!p-6 md:!p-8 border-none shadow-xl bg-white rounded-[2.5rem]">
                        
                        {/* 🟢 ส่วนค้นหาสินค้า (เปลี่ยนจาก Select เป็น Search) */}
                        <div className="flex gap-2 mb-6 relative" ref={searchRef}>
                            <div className="flex-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <SearchCode size={20} className="text-slate-400" />
                                </div>
                                <input 
                                    type="text"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-emerald-400 transition-colors"
                                    placeholder="รหัสสินค้า"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setSelectedProduct(''); // รีเซ็ตการเลือก
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
                                                    className="px-4 py-3 hover:bg-emerald-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center transition-colors"
                                                    onClick={() => selectProductFromSearch(p)}
                                                >
                                                    <div>
                                                        <p className="font-black text-sm text-slate-800">{p.name}</p>
                                                        <p className="text-[10px] font-mono text-slate-400">{p.code}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-black text-emerald-600">ทุน ฿{(p.buyPrice || 0).toLocaleString()}</p>
                                                        <p className="text-[10px] font-bold text-slate-400">เหลือ {p.stock}</p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-4 py-4 text-center text-sm font-bold text-slate-400">ไม่พบสินค้าที่ตรงกัน</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <Button variant="secondary" className="rounded-2xl w-14 h-14 bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-600 border-none" onClick={() => handleScanQR((code) => {
                                const p = products.find(prod => prod.code === code);
                                if (!p) return alert('❌ ไม่พบสินค้านี้ในระบบ');
                                setSelectedProduct(p.id);
                                setBuyPrice(p.buyPrice || 0);
                                setSearchQuery(`${p.code} - ${p.name}`); // นำชื่อไปใส่ในช่องค้นหา
                            })}><QrCode /></Button>
                        </div>

                        {selectedProduct && (
                            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                                <div className="flex justify-between items-center bg-emerald-50 text-emerald-700 p-4 rounded-2xl border border-emerald-100">
                                    <div className="flex items-center gap-2 font-black text-sm">
                                        <PackagePlus size={18} />
                                        <span>สต็อกปัจจุบัน:</span>
                                    </div>
                                    <span className="text-xl font-black">{calculateStock(selectedProduct)} {products.find(p=>p.id===selectedProduct)?.unit}</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input label="ราคาต้นทุน/หน่วย (฿)" type="number" value={buyPrice} onChange={e => setBuyPrice(Number(e.target.value))} />
                                    <Input label="จำนวนที่รับเข้า" type="number" value={qty} onChange={e => setQty(Math.max(1, Number(e.target.value)))} />
                                    <Button onClick={handleAddToList} className="col-span-full py-5 text-lg font-black bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-200 mt-2">
                                        <Plus size={20} className="inline mr-2"/> เพิ่มเข้ารายการบิล
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>

                    <Card className="!p-5 border-2 border-dashed border-slate-200 bg-white rounded-[2rem]">
                        <div className="flex items-center gap-2 mb-3 text-slate-400 text-[10px] font-black uppercase tracking-widest"><FileText size={16}/> บันทึกหมายเหตุ (เช่น ชื่อร้านส่ง, เลขที่อ้างอิง)</div>
                        <textarea className="w-full bg-slate-50 rounded-2xl p-4 text-sm min-h-[100px] outline-none focus:ring-4 focus:ring-emerald-50 transition-all border border-slate-100" placeholder="พิมพ์รายละเอียด..." value={note} onChange={e => setNote(e.target.value)} />
                    </Card>
                </div>

                {/* --- 🟢 ฝั่งขวา: รายการบิลรับเข้า --- */}
                <aside className="w-full lg:w-[40%] bg-white border border-slate-100 rounded-[2.5rem] flex flex-col h-[600px] lg:h-[calc(100vh-140px)] lg:sticky top-8 shadow-xl overflow-hidden">
                    <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between">
                        <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight flex items-center gap-2">
                            <Box size={18} className="text-emerald-500"/> รายการนำเข้าสต็อก
                        </h3>
                        <span className="bg-slate-900 text-white text-[10px] px-3 py-1 rounded-full font-black">{intakeList.length}</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {intakeList.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4 opacity-50">
                                <PackagePlus size={64} />
                                <p className="font-bold uppercase tracking-widest text-xs">ยังไม่มีรายการ</p>
                            </div>
                        ) : (
                            intakeList.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm animate-in slide-in-from-right-2">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setIntakeList(intakeList.filter((_, i) => i !== idx))} className="w-8 h-8 text-red-200 hover:text-red-500 bg-red-50 rounded-full flex items-center justify-center transition-all"><Trash2 size={14}/></button>
                                        <div>
                                            <p className="font-black text-sm text-slate-800">{item.name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">{item.qty} {item.unit} x ฿{item.price.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <span className="font-black text-emerald-600 text-base">฿{item.total.toLocaleString()}</span>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-8 bg-slate-900 text-white space-y-6">
                        <div className="flex justify-between items-end border-b border-slate-700 pb-4">
                            <span className="text-slate-400 font-black uppercase text-xs tracking-widest">รวมมูลค่ารับเข้า</span>
                            <span className="text-4xl font-black italic tracking-tighter text-emerald-400">฿{totalValue.toLocaleString()}</span>
                        </div>
                        <Button 
                            className="w-full py-5 text-xl font-black shadow-xl shadow-emerald-900/20 bg-emerald-500 hover:bg-emerald-400 text-slate-900 border-none flex items-center justify-center gap-2" 
                            onClick={handleSaveIntake} 
                            disabled={intakeList.length === 0 || loading}
                        >
                            <Save size={24} /> {loading ? 'กำลังบันทึก...' : 'บันทึกสต็อก'}
                        </Button>
                    </div>
                </aside>
            </div>
        </div>
    );
}