import React, { useState } from 'react';
import { Plus, Search, QrCode, ChevronRight, Save, Wand2, Printer, Trash2, Lock, Eye } from 'lucide-react';
import QRCode from "react-qr-code";
import { Button, Input, Card, ImageUpload } from './UIComponents';

// --- 1. นำเข้าเครื่องมือจาก Firebase ---
import { db } from '../firebase'; 
import { collection, addDoc, doc, setDoc } from "firebase/firestore";

export default function ProductView({ products, setProducts, viewState, setViewState, calculateStock, handleScanQR, handleDeleteProduct, userRole }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [tempProduct, setTempProduct] = useState({});
    const [printSize, setPrintSize] = useState(150); 
    const [printQty, setPrintQty] = useState(1);

    const isOwner = userRole === 'OWNER';

    const handleGenerateRandomCode = () => {
        if (!isOwner) return;
        const randomCode = 'SKU-' + Math.floor(100000 + Math.random() * 900000);
        setTempProduct({ ...tempProduct, code: randomCode });
    };

    const handlePrintQR = () => {
        window.print();
    };

    // --- 2. ปรับฟังก์ชันบันทึกให้เป็นแบบ Async เพื่อคุยกับ Cloud ---
    const handleSaveProduct = async () => {
        if (!isOwner) return;
        if (!tempProduct.name || !tempProduct.code) return alert('กรุณากรอกชื่อและรหัสสินค้า');
        
        const productData = { 
            name: tempProduct.name,
            code: tempProduct.code,
            img: tempProduct.img || '📦',
            unit: tempProduct.unit || 'ชิ้น',
            sellPrice: Number(tempProduct.sellPrice || 0),
            buyPrice: Number(tempProduct.buyPrice || 0),
            minStock: Number(tempProduct.minStock || 0)
        };

        try {
            if (tempProduct.id) {
                // กรณีแก้ไข: อัปเดตข้อมูลเดิมใน Firestore
                await setDoc(doc(db, "products", tempProduct.id), productData);
            } else {
                // กรณีเพิ่มใหม่: สร้างเอกสารใหม่ใน Firestore
                await addDoc(collection(db, "products"), productData);
            }
            alert('✅ บันทึกลง Cloud สำเร็จ');
            setViewState('list');
        } catch (error) {
            console.error("Error saving product: ", error);
            alert('❌ ไม่สามารถบันทึกได้: ' + error.message);
        }
    };

    if (viewState === 'form') {
        return (
            <div className="p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-2xl mx-auto">
                <style>{`
                    @media print {
                        body * { visibility: hidden; }
                        #printable-area, #printable-area * { visibility: visible; }
                        #printable-area {
                            position: absolute; left: 0; top: 0; width: 100%;
                            display: flex !important; flex-wrap: wrap; gap: 15px;
                            justify-content: flex-start; padding: 10px; background: white !important;
                        }
                        .print-card {
                            display: flex; flex-direction: column; align-items: center;
                            padding: 10px; border: 1px dashed #ddd; page-break-inside: avoid; text-align: center;
                        }
                    }
                    #printable-area { display: none; }
                `}</style>

                {tempProduct.code && (
                    <div id="printable-area">
                        {Array.from({ length: printQty }).map((_, i) => (
                            <div key={i} className="print-card">
                                <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 5px 0', color: 'black' }}>{tempProduct.name}</p>
                                <div style={{ background: 'white', padding: '5px' }}>
                                    <QRCode value={tempProduct.code} size={Number(printSize)} style={{ height: "auto", width: `${printSize}px` }} />
                                </div>
                                <p style={{ fontFamily: 'monospace', fontSize: '12px', marginTop: '5px', color: 'black' }}>{tempProduct.code}</p>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-center justify-between mb-6 no-print">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setViewState('list')} className="p-2 hover:bg-gray-100 rounded-full border border-gray-200">
                            <ChevronRight className="rotate-180 text-gray-600" size={20} />
                        </button>
                        <h2 className="text-2xl font-bold text-gray-900">
                            {isOwner ? (tempProduct.id ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่') : 'รายละเอียดสินค้า'}
                        </h2>
                    </div>
                    {/* ปุ่มลบเรียกใช้ handleDeleteProduct จาก App.jsx */}
                    {tempProduct.id && isOwner && (
                        <button onClick={() => { handleDeleteProduct(tempProduct.id); setViewState('list'); }} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all">
                            <Trash2 size={24} />
                        </button>
                    )}
                </div>

                <Card className="no-print">
                    <ImageUpload 
                        value={tempProduct.img} 
                        onChange={isOwner ? (newImg) => setTempProduct({ ...tempProduct, img: newImg }) : undefined} 
                        disabled={!isOwner}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                        <div className="col-span-full">
                            <div className="flex items-end gap-2">
                                <div className="flex-1">
                                    <Input 
                                        label="รหัสสินค้า (SKU)" 
                                        value={tempProduct.code || ''} 
                                        onChange={e => setTempProduct({...tempProduct, code: e.target.value})} 
                                        disabled={!isOwner}
                                        icon={QrCode}
                                        placeholder="รหัสสินค้า..."
                                    />
                                </div>
                                {isOwner && (
                                    <button type="button" onClick={handleGenerateRandomCode} className="mb-4 p-3.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-100 hover:bg-purple-100 transition-all active:scale-95"><Wand2 size={20} /></button>
                                )}
                            </div>

                            {tempProduct.code && (
                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-6 mt-2">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="bg-white p-4 rounded-xl shadow-md">
                                            <QRCode value={tempProduct.code} size={100} style={{ height: "auto", maxWidth: "100%" }} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 w-full">
                                            <Input label="ขนาด QR (px)" type="number" value={printSize} onChange={(e) => setPrintSize(e.target.value)} />
                                            <Input label="จำนวนใบ" type="number" value={printQty} onChange={(e) => setPrintQty(Math.max(1, parseInt(e.target.value) || 1))} />
                                        </div>
                                        <button type="button" onClick={handlePrintQR} className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg active:scale-95 w-full justify-center">
                                            <Printer size={20} /> พิมพ์ฉลาก QR Code
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="col-span-full">
                            <Input label="ชื่อสินค้า" value={tempProduct.name || ''} onChange={e => setTempProduct({...tempProduct, name: e.target.value})} disabled={!isOwner} placeholder="ชื่อสินค้า..." />
                        </div>
                        <Input label="หน่วยนับ" value={tempProduct.unit || ''} onChange={e => setTempProduct({...tempProduct, unit: e.target.value})} disabled={!isOwner} />
                        <Input label="สต็อกขั้นต่ำ" type="number" value={tempProduct.minStock || ''} onChange={e => setTempProduct({...tempProduct, minStock: e.target.value})} disabled={!isOwner} />
                        
                        {isOwner ? (
                            <Input label="ราคาต้นทุน" type="number" value={tempProduct.buyPrice || ''} onChange={e => setTempProduct({...tempProduct, buyPrice: e.target.value})} />
                        ) : (
                            <div className="mb-4">
                                <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">ราคาต้นทุน</label>
                                <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 text-xs italic flex items-center gap-2"><Lock size={14}/> ข้อมูลถูกจำกัด</div>
                            </div>
                        )}
                        
                        <Input label="ราคาขาย" type="number" value={tempProduct.sellPrice || ''} onChange={e => setTempProduct({...tempProduct, sellPrice: e.target.value})} disabled={!isOwner} />
                    </div>
                    
                    {isOwner && (
                        <Button onClick={handleSaveProduct} className="w-full mt-6 py-4 text-base no-print">
                            <Save size={20} /> บันทึกลงระบบคลาวด์
                        </Button>
                    )}
                </Card>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1400px] mx-auto pb-24">
            <div className="flex justify-between items-center no-print">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">คลังสินค้า (Cloud)</h1>
                    <p className="text-slate-400 text-sm font-bold mt-1">
                        {isOwner ? 'จัดการรายการสินค้าและสต็อกแบบ Real-time' : 'ดูรายการสินค้าในสต็อก'}
                    </p>
                </div>
                {isOwner && (
                    <Button onClick={() => { setTempProduct({ img: '📦', minStock: 5, buyPrice: 0, sellPrice: 0 }); setViewState('form'); }}>
                        <Plus size={20} /> <span className="hidden sm:inline">เพิ่มสินค้าใหม่</span>
                    </Button>
                )}
            </div>

            <div className="relative shadow-sm rounded-xl no-print">
                <input type="text" placeholder="ค้นหาชื่อ หรือ รหัสสินค้า..." className="w-full bg-white border border-gray-200 rounded-xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-100 transition-all outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 no-print">
                {products.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.code?.includes(searchTerm)).map(p => {
                    const currentStock = calculateStock(p.id);
                    const isLow = currentStock <= (p.minStock || 5);
                    return (
                        <div key={p.id} onClick={() => { setTempProduct(p); setViewState('form'); }} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-4 group relative hover:border-blue-300 transition-all cursor-pointer overflow-hidden">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center overflow-hidden border border-gray-100 group-hover:scale-105 transition-transform">
                                    {p.img && p.img.startsWith('data:') ? <img src={p.img} alt="Product" className="w-full h-full object-cover" /> : <span className="text-3xl">{p.img}</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 truncate pr-2 text-base">{p.name}</h3>
                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-mono text-gray-500">{p.code}</span>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-end border-t pt-4 border-gray-50">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">คงเหลือ</p>
                                    <span className={`text-xl font-black ${isLow ? 'text-red-500' : 'text-blue-600'}`}>
                                        {currentStock} <span className="text-xs font-bold text-gray-400 uppercase">{p.unit}</span>
                                    </span>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ราคาขาย</p>
                                    <span className="text-xl font-black text-gray-900">฿{Number(p.sellPrice || 0).toLocaleString()}</span>
                                </div>
                            </div>
                            
                            {!isOwner && (
                                <div className="absolute top-4 right-4 text-gray-300">
                                    <Eye size={18} />
                                </div>
                            )}

                            {isOwner && (
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteProduct(p.id); }} className="absolute top-4 right-4 p-2 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}