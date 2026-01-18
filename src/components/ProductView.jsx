import React, { useState } from 'react';
import { Plus, Search, QrCode, ChevronRight, Save, Wand2, Printer } from 'lucide-react';
import QRCode from "react-qr-code";
import { Button, Input, Card, ImageUpload } from './UIComponents';

export default function ProductView({ products, setProducts, viewState, setViewState, calculateStock, handleScanQR }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [tempProduct, setTempProduct] = useState({});
    
    // --- State สำหรับการพิมพ์ ---
    const [printSize, setPrintSize] = useState(150); 
    const [printQty, setPrintQty] = useState(1);

    const handleGenerateRandomCode = () => {
        const randomCode = 'SKU-' + Math.floor(100000 + Math.random() * 900000);
        setTempProduct({ ...tempProduct, code: randomCode });
    };

    const handlePrintQR = () => {
        window.print();
    };

    const handleSaveProduct = () => {
        if (!tempProduct.name || !tempProduct.code) return alert('กรุณากรอกชื่อและรหัสสินค้า');
        
        const productToSave = { 
            ...tempProduct, 
            img: tempProduct.img || '📦',
            sellPrice: Number(tempProduct.sellPrice || 0),
            buyPrice: Number(tempProduct.buyPrice || 0),
            minStock: Number(tempProduct.minStock || 0)
        };

        if (tempProduct.id) {
            setProducts(products.map(p => p.id === tempProduct.id ? productToSave : p));
        } else {
            setProducts([...products, { ...productToSave, id: Date.now() }]);
        }
        setViewState('list');
    };

    if (viewState === 'form') {
        return (
            <div className="p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-2xl mx-auto">
                
                {/* CSS สำหรับควบคุมการพิมพ์โดยเฉพาะ */}
                <style>{`
                    @media print {
                        /* ซ่อนทุกอย่างในหน้าจอ */
                        body * {
                            visibility: hidden;
                        }
                        /* แสดงเฉพาะพื้นที่พิมพ์ */
                        #printable-area, #printable-area * {
                            visibility: visible;
                        }
                        #printable-area {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            display: flex !important;
                            flex-wrap: wrap;
                            gap: 15px;
                            justify-content: flex-start;
                            padding: 10px;
                            background: white !important;
                        }
                        .print-card {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            padding: 10px;
                            border: 1px dashed #ddd;
                            page-break-inside: avoid;
                            text-align: center;
                        }
                    }
                    #printable-area { display: none; }
                `}</style>

                {/* ส่วนที่ Render ออกมาเพื่อพิมพ์เท่านั้น (วนลูปตามจำนวน printQty) */}
                {tempProduct.code && (
                    <div id="printable-area">
                        {Array.from({ length: printQty }).map((_, i) => (
                            <div key={i} className="print-card">
                                <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 5px 0', color: 'black' }}>
                                    {tempProduct.name || 'สินค้า'}
                                </p>
                                <div style={{ background: 'white', padding: '5px' }}>
                                    <QRCode 
                                        value={tempProduct.code} 
                                        size={Number(printSize)}
                                        style={{ height: "auto", width: `${printSize}px` }}
                                    />
                                </div>
                                <p style={{ fontFamily: 'monospace', fontSize: '12px', marginTop: '5px', color: 'black' }}>
                                    {tempProduct.code}
                                </p>
                                {tempProduct.sellPrice > 0 && (
                                    <p style={{ fontSize: '12px', fontWeight: 'bold', color: 'black' }}>
                                        ฿{Number(tempProduct.sellPrice).toLocaleString()}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-4 mb-6 no-print">
                    <button onClick={() => setViewState('list')} className="p-2 hover:bg-gray-100 rounded-full border border-gray-200">
                        <ChevronRight className="rotate-180 text-gray-600" size={20} />
                    </button>
                    <h2 className="text-2xl font-bold text-gray-900">{tempProduct.id ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่'}</h2>
                </div>

                <Card className="no-print">
                    <ImageUpload value={tempProduct.img} onChange={(newImg) => setTempProduct({ ...tempProduct, img: newImg })} />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                        <div className="col-span-full">
                            <div className="flex items-end gap-2">
                                <div className="flex-1">
                                    <Input 
                                        label="รหัสสินค้า (SKU)" 
                                        value={tempProduct.code || ''} 
                                        onChange={e => setTempProduct({...tempProduct, code: e.target.value})}
                                        icon={QrCode}
                                        onIconClick={() => handleScanQR((code) => setTempProduct({...tempProduct, code}))}
                                        placeholder="สแกน หรือ กดปุ่มสุ่มรหัส ->"
                                    />
                                </div>
                                <button type="button" onClick={handleGenerateRandomCode} className="mb-4 p-3.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-100 hover:bg-purple-100 shadow-sm active:scale-95">
                                    <Wand2 size={20} />
                                </button>
                            </div>

                            {/* ตั้งค่าการพิมพ์ */}
                            {tempProduct.code && (
                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-6 mt-2">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="bg-white p-4 rounded-xl shadow-md">
                                            <QRCode value={tempProduct.code} size={100} style={{ height: "auto", maxWidth: "100%" }} />
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4 w-full">
                                            <div>
                                                <label className="text-xs font-bold text-blue-600 mb-1 block">ขนาด QR (px)</label>
                                                <input 
                                                    type="number" 
                                                    value={printSize} 
                                                    onChange={(e) => setPrintSize(e.target.value)}
                                                    className="w-full p-2.5 bg-white border border-blue-200 rounded-lg text-center font-bold"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-blue-600 mb-1 block">จำนวนที่จะพิมพ์</label>
                                                <input 
                                                    type="number" 
                                                    value={printQty} 
                                                    onChange={(e) => setPrintQty(Math.max(1, parseInt(e.target.value) || 1))}
                                                    className="w-full p-2.5 bg-white border border-blue-200 rounded-lg text-center font-bold"
                                                />
                                            </div>
                                        </div>

                                        <button type="button" onClick={handlePrintQR} className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg active:scale-95 w-full justify-center">
                                            <Printer size={20} /> พิมพ์ฉลาก {printQty > 1 ? `(${printQty} ใบ)` : ''}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="col-span-full">
                            <Input label="ชื่อสินค้า" value={tempProduct.name || ''} onChange={e => setTempProduct({...tempProduct, name: e.target.value})} placeholder="ระบุชื่อสินค้า..." />
                        </div>
                        <Input label="หน่วยนับ" value={tempProduct.unit || ''} onChange={e => setTempProduct({...tempProduct, unit: e.target.value})} placeholder="ชิ้น, ตัว..." />
                        <Input label="จุดแจ้งเตือนสต็อกต่ำ" type="number" value={tempProduct.minStock || ''} onChange={e => setTempProduct({...tempProduct, minStock: e.target.value})} placeholder="5" />
                        <Input label="ราคาต้นทุน" type="number" value={tempProduct.buyPrice || ''} onChange={e => setTempProduct({...tempProduct, buyPrice: e.target.value})} placeholder="0.00" />
                        <Input label="ราคาขาย" type="number" value={tempProduct.sellPrice || ''} onChange={e => setTempProduct({...tempProduct, sellPrice: e.target.value})} placeholder="0.00" />
                    </div>
                    
                    <Button onClick={handleSaveProduct} className="w-full mt-6 py-4 text-base no-print">
                        <Save size={20} /> บันทึกข้อมูลสินค้า
                    </Button>
                </Card>
            </div>
        );
    }

    // --- ส่วนหน้า List สินค้า (เหมือนเดิมแต่ใส่ no-print) ---
    return (
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto pb-24">
            <div className="flex justify-between items-center no-print">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">คลังสินค้า</h1>
                    <p className="text-gray-500 text-sm mt-1">จัดการรายการสินค้าทั้งหมด</p>
                </div>
                <Button onClick={() => { setTempProduct({ img: '📦', minStock: 5, buyPrice: 0, sellPrice: 0 }); setViewState('form'); }}>
                    <Plus size={20} /> <span className="hidden sm:inline">เพิ่มสินค้า</span>
                </Button>
            </div>

            <div className="relative shadow-sm rounded-xl no-print">
                <input 
                    type="text" 
                    placeholder="ค้นหาชื่อ หรือ รหัสสินค้า..." 
                    className="w-full bg-white border border-gray-200 rounded-xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-100 transition-all" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                />
                <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 no-print">
                {products.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.code?.includes(searchTerm)).map(p => {
                    const currentStock = calculateStock ? calculateStock(p.id) : 0;
                    const isLow = currentStock <= (p.minStock || 5);
                    return (
                        <div key={p.id} onClick={() => { setTempProduct(p); setViewState('form'); }} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 cursor-pointer hover:border-blue-300 transition-all group">
                            <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden border border-gray-100 group-hover:scale-105 transition-transform">
                                {p.img && p.img.startsWith('data:') ? <img src={p.img} alt="Product" className="w-full h-full object-cover" /> : <span className="text-2xl">{p.img}</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-semibold text-gray-900 truncate pr-2 text-base">{p.name}</h3>
                                    <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-full uppercase ${isLow ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                                        {currentStock} {p.unit}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm text-gray-500 mt-2">
                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">{p.code}</span>
                                    <span className="font-bold text-gray-900">฿{Number(p.sellPrice || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}