import React, { useState } from 'react';
import { Plus, Search, QrCode, ChevronRight, Save, Wand2, Printer, Trash2, Lock, Eye, AlertCircle, Box, PackageX, LayoutGrid } from 'lucide-react';
import QRCode from "react-qr-code";
import { Button, Input, Card, ImageUpload } from './UIComponents';
import { db } from '../firebase'; 
import { collection, addDoc, doc, setDoc } from "firebase/firestore";

// 🟢 เพิ่ม 'user' เข้าไปใน Props เพื่อให้รู้จักรหัสร้าน (shopId)
export default function ProductView({ user, products, viewState, setViewState, handleScanQR, handleDeleteProduct, userRole }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [tempProduct, setTempProduct] = useState({});
    const [printSize, setPrintSize] = useState(150); 
    const [printQty, setPrintQty] = useState(1);
    const [filterType, setFilterType] = useState('all');

    const isOwner = userRole === 'OWNER';

    // การคำนวณสรุปสถานะ
    const lowStockItems = products.filter(p => {
        const stock = Number(p.stock || 0);
        const min = Number(p.minStock || 5);
        return stock > 0 && stock <= min;
    });
    const outOfStockItems = products.filter(p => Number(p.stock || 0) <= 0);

    // ตรรกะการกรองสินค้า
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.code?.includes(searchTerm);
        const stock = Number(p.stock || 0);
        const min = Number(p.minStock || 5);
        let matchesFilter = true;
        if (filterType === 'low') matchesFilter = stock > 0 && stock <= min;
        if (filterType === 'out') matchesFilter = stock <= 0;
        return matchesSearch && matchesFilter;
    });

    const handleGenerateRandomCode = () => {
        if (!isOwner) return;
        let newCode = '';
        let isDuplicate = true;
        while (isDuplicate) {
            newCode = Math.floor(10000000 + Math.random() * 90000000).toString();
            const duplicate = products.find(p => p.code === newCode);
            if (!duplicate) isDuplicate = false;
        }
        setTempProduct({ ...tempProduct, code: newCode });
    };

    const handlePrintQR = () => { window.print(); };

    const handleSaveProduct = async () => {
        if (!isOwner) return;
        if (!tempProduct.name || !tempProduct.code) return alert('⚠️ กรุณากรอกชื่อและรหัสสินค้าให้ครบ');
        
        // 🟢 ตอนนี้ฟังก์ชันรู้จัก 'user' แล้ว จึงดึง shopId มาใช้ได้
        const productData = { 
            name: tempProduct.name,
            code: tempProduct.code,
            shopId: user.shopId, // ✅ ระบุร้านค้าเจ้าของสินค้า
            img: tempProduct.img || '📦',
            unit: tempProduct.unit || 'ชิ้น',
            sellPrice: Number(tempProduct.sellPrice || 0),
            buyPrice: Number(tempProduct.buyPrice || 0),
            minStock: Number(tempProduct.minStock || 0),
            stock: Number(tempProduct.stock || 0) 
        };

        try {
            if (tempProduct.id) {
                await setDoc(doc(db, "products", tempProduct.id), productData);
            } else {
                await addDoc(collection(db, "products"), productData);
            }
            alert('✅ บันทึกข้อมูลสินค้าเรียบร้อย');
            setViewState('list');
        } catch (error) { alert('❌ ไม่สามารถบันทึกได้: ' + error.message); }
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
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight uppercase">
                            {isOwner ? (tempProduct.id ? 'Edit' : 'New Product') : 'Product Details'}
                        </h2>
                    </div>
                    {tempProduct.id && isOwner && (
                        <button onClick={() => { handleDeleteProduct(tempProduct.id); setViewState('list'); }} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all">
                            <Trash2 size={24} />
                        </button>
                    )}
                </div>

                <Card className="no-print">
                    <ImageUpload value={tempProduct.img} onChange={isOwner ? (newImg) => setTempProduct({ ...tempProduct, img: newImg }) : undefined} disabled={!isOwner} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                        <div className="col-span-full">
                            <div className="flex items-end gap-2">
                                <div className="flex-1">
                                    <Input label="รหัสสินค้า" value={tempProduct.code || ''} onChange={e => setTempProduct({...tempProduct, code: e.target.value})} disabled={!isOwner} icon={QrCode} onIconClick={() => handleScanQR((code) => setTempProduct({...tempProduct, code}))} />
                                </div>
                                {isOwner && (
                                    <button type="button" onClick={handleGenerateRandomCode} className="mb-4 p-3.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-100 hover:bg-purple-100 active:scale-95 transition-all"><Wand2 size={20} /></button>
                                )}
                            </div>
                        </div>

                        {tempProduct.code && isOwner && (
                            <div className="col-span-full bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                    <div className="bg-white p-2 rounded-lg shadow-sm">
                                        <QRCode value={tempProduct.code} size={80} />
                                    </div>
                                    <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                                        <Input label="ขนาด (px)" type="number" value={printSize} onChange={e => setPrintSize(e.target.value)} className="mb-0" />
                                        <Input label="จำนวนใบ" type="number" value={printQty} onChange={e => setPrintQty(e.target.value)} className="mb-0" />
                                    </div>
                                    <button type="button" onClick={handlePrintQR} className="bg-blue-600 text-white p-4 rounded-xl hover:bg-blue-700 shadow-md active:scale-95 transition-all"><Printer size={20}/></button>
                                </div>
                            </div>
                        )}

                        <div className="col-span-full">
                            <Input label="ชื่อสินค้า" value={tempProduct.name || ''} onChange={e => setTempProduct({...tempProduct, name: e.target.value})} disabled={!isOwner} />
                        </div>
                        <Input label="หน่วยนับ" value={tempProduct.unit || 'ชิ้น'} onChange={e => setTempProduct({...tempProduct, unit: e.target.value})} disabled={!isOwner} />
                        <Input label="สต็อกขั้นต่ำ" type="number" value={tempProduct.minStock || ''} onChange={e => setTempProduct({...tempProduct, minStock: e.target.value})} disabled={!isOwner} />
                        
                        {isOwner ? (
                            <Input label="ราคาต้นทุน" type="number" value={tempProduct.buyPrice || ''} onChange={e => setTempProduct({...tempProduct, buyPrice: e.target.value})} />
                        ) : (
                            <div className="mb-4">
                                <label className="text-[10px] font-black text-gray-400 mb-1 block uppercase tracking-widest">Cost Price</label>
                                <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 text-xs italic flex items-center gap-2"><Lock size={14}/> ข้อมูลถูกจำกัด</div>
                            </div>
                        )}
                        <Input label="ราคาขาย" type="number" value={tempProduct.sellPrice || ''} onChange={e => setTempProduct({...tempProduct, sellPrice: e.target.value})} disabled={!isOwner} />
                    </div>
                    {isOwner && <Button onClick={handleSaveProduct} className="w-full mt-6 py-4 font-black shadow-lg shadow-blue-100"><Save size={20} /> บันทึกข้อมูลสินค้า</Button>}
                </Card>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1400px] mx-auto pb-24">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
                <button onClick={() => setFilterType('all')} 
                        className={`p-5 rounded-[2.5rem] shadow-sm flex items-center gap-4 transition-all border-2 text-left ${filterType === 'all' ? 'bg-blue-600 text-white border-blue-400 scale-105 shadow-blue-200' : 'bg-white border-gray-100 text-slate-800 hover:border-blue-200'}`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${filterType === 'all' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white'}`}><LayoutGrid size={24}/></div>
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${filterType === 'all' ? 'text-blue-100' : 'text-blue-600'}`}>สินค้าทั้งหมด</p>
                        <p className="text-2xl font-black">{products.length} <span className="text-xs">รายการ</span></p>
                    </div>
                </button>

                <button onClick={() => setFilterType('low')} 
                        className={`p-5 rounded-[2.5rem] shadow-sm flex items-center gap-4 transition-all border-2 text-left ${filterType === 'low' ? 'bg-orange-500 text-white border-orange-300 scale-105 shadow-orange-200' : 'bg-orange-50 border-orange-100 text-orange-800 hover:border-orange-300'}`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${filterType === 'low' ? 'bg-white text-orange-600' : 'bg-orange-500 text-white'}`}><Box size={24}/></div>
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${filterType === 'low' ? 'text-orange-100' : 'text-orange-600'}`}>ใกล้หมดคลัง</p>
                        <p className="text-2xl font-black">{lowStockItems.length} <span className="text-xs">รายการ</span></p>
                    </div>
                </button>

                <button onClick={() => setFilterType('out')} 
                        className={`p-5 rounded-[2.5rem] shadow-sm flex items-center gap-4 transition-all border-2 text-left ${filterType === 'out' ? 'bg-red-500 text-white border-red-300 scale-105 shadow-red-200' : 'bg-red-50 border-red-100 text-red-800 hover:border-red-300'}`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${filterType === 'out' ? 'bg-white text-red-600' : 'bg-red-500 text-white'}`}><PackageX size={24}/></div>
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${filterType === 'out' ? 'text-red-100' : 'text-red-600'}`}>หมดสต็อก</p>
                        <p className="text-2xl font-black">{outOfStockItems.length} <span className="text-xs">รายการ</span></p>
                    </div>
                </button>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print pt-4">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight italic">รายการสินค้า</h1>
                {isOwner && (
                    <Button onClick={() => { setTempProduct({ img: '📦', minStock: 5, buyPrice: 0, sellPrice: 0, stock: 0 }); setViewState('form'); }}>
                        <Plus size={20} /> เพิ่มสินค้าใหม่
                    </Button>
                )}
            </div>

            <div className="relative no-print">
                <input type="text" placeholder={`ค้นหาในรายการ ${filterType === 'all' ? 'ทั้งหมด' : (filterType === 'low' ? 'ใกล้หมด' : 'หมดสต็อก')}...`} className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-4 focus:ring-blue-50 outline-none shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <Search className="absolute left-4 top-4 text-gray-400" size={20} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 no-print">
                {filteredProducts.length > 0 ? (
                    filteredProducts.map(p => {
                        const currentStock = Number(p.stock || 0);
                        const minStock = Number(p.minStock || 5);
                        const isOutOfStock = currentStock <= 0;
                        const isLowStock = currentStock > 0 && currentStock <= minStock;

                        return (
                            <div key={p.id} onClick={() => { setTempProduct(p); setViewState('form'); }} 
                                 className={`bg-white p-5 rounded-[2.5rem] border shadow-sm flex flex-col gap-4 group relative transition-all cursor-pointer overflow-hidden ${
                                    isOutOfStock ? 'border-red-200 bg-red-50/20' : 
                                    isLowStock ? 'border-orange-200 bg-orange-50/10' : 'border-gray-100 hover:border-blue-300'
                                 }`}>
                                
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center overflow-hidden border border-gray-100 group-hover:scale-105 transition-transform">
                                        {p.img && p.img.startsWith('data:') ? <img src={p.img} alt="Product" className="w-full h-full object-cover" /> : <span className="text-3xl">{p.img}</span>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-slate-800 truncate text-base">{p.name}</h3>
                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-slate-400">{p.code}</span>
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-end border-t pt-4 border-slate-50">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest font-black">คงเหลือ</p>
                                        <span className={`text-xl font-black ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-500' : 'text-blue-600'}`}>
                                            {currentStock.toLocaleString()} <span className="text-[10px] text-slate-300 uppercase">{p.unit}</span>
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest font-black">ราคาขาย</p>
                                        <span className="text-xl font-black text-slate-800">฿{Number(p.sellPrice || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                                {isOwner && (
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteProduct(p.id); }} className="absolute top-4 right-4 p-2 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full py-20 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                        <PackageX size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500 font-bold uppercase tracking-widest">ไม่พบรายการสินค้าในหมวดหมู่นี้</p>
                    </div>
                )}
            </div>
        </div>
    );
}