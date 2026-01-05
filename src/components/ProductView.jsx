import React, { useState } from 'react';
import { Plus, Search, QrCode, ChevronRight, Save, Trash2 } from 'lucide-react'; // Import Trash2 (รูปถังขยะ)
import { Button, Input, Card, ImageUpload } from './UIComponents';

export default function ProductView({ products, setProducts, viewState, setViewState, calculateStock, handleScanQR, handleDeleteProduct }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [tempProduct, setTempProduct] = useState({});

    const handleSaveProduct = () => {
      if (!tempProduct.name || !tempProduct.code) return alert('กรุณากรอกชื่อและรหัสสินค้า');
      
      const productToSave = {
        ...tempProduct,
        img: tempProduct.img || '📦' 
      };

      if (tempProduct.id) {
        setProducts(products.map(p => p.id === tempProduct.id ? productToSave : p));
      } else {
        setProducts([...products, { ...productToSave, id: Date.now() }]);
      }
      setViewState('list');
    };

    const renderProductImage = (img) => {
        if (img && img.startsWith('data:')) {
            return <img src={img} alt="Product" className="w-full h-full object-cover" />;
        }
        return <span className="text-2xl">{img}</span>;
    };

    if (viewState === 'form') {
      return (
        <div className="p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setViewState('list')} className="p-2 hover:bg-gray-100 rounded-full transition-colors border border-gray-200">
              <ChevronRight className="rotate-180 text-gray-600" size={20} />
            </button>
            <h2 className="text-2xl font-bold text-gray-900">{tempProduct.id ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่'}</h2>
          </div>

          <Card>
            <ImageUpload 
                value={tempProduct.img} 
                onChange={(newImg) => setTempProduct({ ...tempProduct, img: newImg })}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-full">
                    <Input 
                    label="รหัสสินค้า (SKU)" 
                    value={tempProduct.code || ''} 
                    onChange={e => setTempProduct({...tempProduct, code: e.target.value})}
                    icon={QrCode}
                    onIconClick={() => handleScanQR((code) => setTempProduct({...tempProduct, code}))}
                    placeholder="Scan QR Code..."
                    />
                </div>
                <div className="col-span-full">
                    <Input 
                    label="ชื่อสินค้า" 
                    value={tempProduct.name || ''} 
                    onChange={e => setTempProduct({...tempProduct, name: e.target.value})}
                    placeholder="เช่น เสื้อยืด, กางเกง..."
                    />
                </div>
                <Input 
                    label="หน่วยนับ" 
                    value={tempProduct.unit || ''} 
                    onChange={e => setTempProduct({...tempProduct, unit: e.target.value})}
                    placeholder="ชิ้น"
                />
                <Input 
                    label="เตือนเมื่อต่ำกว่า" 
                    type="number"
                    value={tempProduct.minStock || ''} 
                    onChange={e => setTempProduct({...tempProduct, minStock: Number(e.target.value)})}
                    placeholder="0"
                />
                <Input 
                    label="ราคาต้นทุน" 
                    type="number"
                    value={tempProduct.buyPrice || ''} 
                    onChange={e => setTempProduct({...tempProduct, buyPrice: Number(e.target.value)})}
                    placeholder="0.00"
                />
                <Input 
                    label="ราคาขาย" 
                    type="number"
                    value={tempProduct.sellPrice || ''} 
                    onChange={e => setTempProduct({...tempProduct, sellPrice: Number(e.target.value)})}
                    placeholder="0.00"
                />
            </div>
            
            <Button onClick={handleSaveProduct} className="w-full mt-6 py-3.5 text-base">
                <Save size={20} /> บันทึกข้อมูล
            </Button>
          </Card>
        </div>
      );
    }

    // List View
    return (
      <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto pb-24">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">คลังสินค้า</h1>
            <p className="text-gray-500 text-sm mt-1">จัดการรายการสินค้าทั้งหมด</p>
          </div>
          <Button onClick={() => { setTempProduct({ img: '📦' }); setViewState('form'); }}>
            <Plus size={20} /> <span className="hidden sm:inline">เพิ่มสินค้า</span>
          </Button>
        </div>

        <div className="relative shadow-sm rounded-xl">
          <input 
            type="text" 
            placeholder="ค้นหาชื่อสินค้า หรือ รหัสสินค้า..." 
            className="w-full bg-white border-none rounded-xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-100 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.filter(p => p.name.includes(searchTerm) || p.code.includes(searchTerm)).map(p => {
            const currentStock = calculateStock(p.id);
            const isLowStock = currentStock <= p.minStock;
            return (
              <div 
                key={p.id} 
                onClick={() => { setTempProduct(p); setViewState('form'); }}
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group relative"
              >
                {/* รูปสินค้า */}
                <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200 overflow-hidden border border-gray-100">
                  {renderProductImage(p.img)}
                </div>
                
                {/* ข้อมูลสินค้า */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-gray-900 truncate pr-8 text-base">{p.name}</h3>
                    <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${isLowStock ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                      {currentStock} {p.unit}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-500 mt-2">
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">{p.code}</span>
                    <span className="font-bold text-gray-900">฿{p.sellPrice.toLocaleString()}</span>
                  </div>
                </div>

                {/* ปุ่มลบ (จะแสดงเมื่อเอาเมาส์ชี้ หรือบนมือถืออาจต้องปรับให้แสดงตลอดถ้าต้องการ) */}
                <button 
                    onClick={(e) => {
                        e.stopPropagation(); // ป้องกันไม่ให้กดแล้วเข้าไปหน้าแก้ไข
                        handleDeleteProduct(p.id);
                    }}
                    className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-sm text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors z-10 border border-gray-100 opacity-0 group-hover:opacity-100"
                    title="ลบสินค้า"
                >
                    <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
};