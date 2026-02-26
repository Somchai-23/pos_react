import React, { useState, useMemo } from 'react';
import { Filter, Calendar, ChevronRight, ArrowLeft, Trophy, Medal, Clock, QrCode, Printer, Search, BarChart2 } from 'lucide-react'; 
import { Card, Button } from './UIComponents'; 
import { PrintReceipt } from './PrintTemplate'; 

export default function ReportView({ products, transactions, calculateStock, handleScanQR, memberSettings }) {
    const [reportTab, setReportTab] = useState('stock'); 
    const [viewLevel, setViewLevel] = useState('summary');
    const [timeFilter, setTimeFilter] = useState('daily'); 
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [selectedBill, setSelectedBill] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const handleScanBill = () => {
        if (!handleScanQR) return alert('⚠️ ระบบสแกนยังไม่ได้เชื่อมต่อ');
        handleScanQR((scannedCode) => {
            const foundBill = transactions.find(t => t.docNo === scannedCode);
            if (foundBill) {
                setSelectedBill(foundBill);
                setViewLevel('billDetail');
            } else {
                alert(`❌ ไม่พบบิลเลขที่: ${scannedCode} ในประวัติของร้านนี้`);
            }
        });
    };

    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const lowerQuery = searchQuery.toLowerCase();
        return transactions.filter(t => 
            (t.docNo && t.docNo.toLowerCase().includes(lowerQuery)) || 
            (t.memberPhone && t.memberPhone.includes(lowerQuery)) ||
            (t.memberName && t.memberName.toLowerCase().includes(lowerQuery))
        ).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [transactions, searchQuery]);

    const summaryData = useMemo(() => {
        const filtered = transactions.filter(t => t.type === (reportTab === 'sales' ? 'OUT' : 'IN'));
        const grouped = filtered.reduce((acc, curr) => {
            const date = new Date(curr.date);
            let key = '';
            let label = '';
            let shortLabel = '';
            
            if (timeFilter === 'daily') {
                key = curr.date.slice(0, 10); 
                label = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
                shortLabel = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
            } else if (timeFilter === 'weekly') {
                const diff = date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1);
                const startOfWeek = new Date(new Date(curr.date).setDate(diff));
                key = startOfWeek.toISOString().slice(0, 10);
                const endOfWeek = new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() + 6));
                label = `สัปดาห์: ${startOfWeek.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - ${endOfWeek.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`;
                shortLabel = `W${Math.ceil(date.getDate() / 7)}`;
            } else if (timeFilter === 'monthly') {
                key = curr.date.slice(0, 7); 
                label = date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
                shortLabel = date.toLocaleDateString('th-TH', { month: 'short' });
            }

            if (!acc[key]) acc[key] = { key, label, shortLabel, totalAmount: 0, billCount: 0, transactions: [] };
            acc[key].totalAmount += curr.totalAmount;
            acc[key].billCount += 1;
            acc[key].transactions.push(curr);
            return acc;
        }, {});

        return Object.values(grouped).sort((a, b) => b.key.localeCompare(a.key));
    }, [transactions, reportTab, timeFilter]);

    // 🟢 หาค่าที่มากที่สุดเพื่อใช้สร้างความสูงของกราฟแท่ง
    const maxSummaryAmount = summaryData.length > 0 ? Math.max(...summaryData.map(d => d.totalAmount)) : 0;

    const topSellers = useMemo(() => {
        const sales = transactions.filter(t => t.type === 'OUT');
        const summary = {};
        sales.forEach(t => {
            t.items.forEach(item => {
                const pInfo = products.find(p => p.id === item.productId);
                if (!pInfo) return; 
                if (!summary[item.productId]) {
                    summary[item.productId] = { name: item.name, img: pInfo.img, totalQty: 0, totalRevenue: 0, unit: pInfo.unit };
                }
                summary[item.productId].totalQty += Number(item.qty);
                summary[item.productId].totalRevenue += Number(item.total);
            });
        });
        return Object.values(summary).sort((a, b) => b.totalQty - a.totalQty);
    }, [transactions, products]);

    const goBack = () => {
        if (viewLevel === 'billDetail') {
            setViewLevel(searchQuery.trim() ? 'summary' : 'dateDetail'); 
        }
        else if (viewLevel === 'dateDetail') { setViewLevel('summary'); setSelectedPeriod(null); }
    };

    return (
      <>
        <style>{`
            @media print {
                body * { visibility: hidden !important; }
                #receipt-print-area, #receipt-print-area * { visibility: visible !important; }
                #receipt-print-area { position: absolute; left: 0; top: 0; width: 100%; background: white; }
            }
            .hide-scroll::-webkit-scrollbar { display: none; }
            .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>

        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto pb-24 print:hidden">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {viewLevel !== 'summary' && (
                        <button onClick={goBack} className="p-2 bg-white rounded-full border shadow-sm active:scale-90 transition-transform">
                            <ArrowLeft size={20}/>
                        </button>
                    )}
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight uppercase">
                        {viewLevel === 'summary' ? 'Dashboard' : 'Details'}
                    </h1>
                </div>
                <button 
                    onClick={handleScanBill} 
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md w-full sm:w-auto active:scale-95"
                >
                    <QrCode size={18} />
                    <span>สแกน QR ค้นหาบิล</span>
                </button>
            </div>
            
            {viewLevel === 'summary' && (reportTab === 'sales' || reportTab === 'purchase') && (
                <div className="relative animate-in fade-in">
                    <input 
                        type="text" 
                        placeholder="พิมพ์เบอร์โทรศัพท์, ชื่อลูกค้า หรือ เลขที่บิล เพื่อค้นหา..." 
                        className="w-full bg-white border-2 border-blue-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-4 focus:ring-blue-50 outline-none shadow-sm transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Search className="absolute left-4 top-4 text-blue-400" size={22} />
                </div>
            )}

            {searchQuery.trim() !== '' && viewLevel === 'summary' && (reportTab === 'sales' || reportTab === 'purchase') ? (
                <div className="space-y-3 animate-in fade-in duration-300">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">ผลการค้นหา ({searchResults.length} รายการ)</p>
                    {searchResults.length === 0 ? (
                        <div className="text-center py-10 bg-white rounded-3xl border border-gray-100">
                            <Search className="mx-auto text-gray-200 mb-2" size={32}/>
                            <p className="text-gray-400 font-bold">ไม่พบบิลที่ตรงกับคำค้นหา</p>
                        </div>
                    ) : (
                        searchResults.map(bill => (
                            <div key={bill.id} onClick={() => { setSelectedBill(bill); setViewLevel('billDetail'); }}
                                className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm flex justify-between items-center cursor-pointer hover:bg-blue-50 transition-colors">
                                <div>
                                    <div className="font-black text-gray-800">{bill.docNo}</div>
                                    <div className="text-[10px] text-gray-500 font-bold mt-1">
                                        🕒 {new Date(bill.date).toLocaleString('th-TH')} <br/>
                                        👤 {bill.memberName || 'ลูกค้าทั่วไป'} {bill.memberPhone ? `(${bill.memberPhone})` : ''}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="font-black text-blue-600 text-lg">฿{bill.totalAmount.toLocaleString()}</span>
                                    <div className="text-[10px] text-gray-400 font-bold">{bill.items.length} รายการ</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <>
                    {viewLevel === 'summary' && (
                        <div className="space-y-4">
                            <div className="flex p-1.5 bg-white border rounded-2xl overflow-x-auto hide-scroll shadow-sm">
                                {[
                                    { id: 'stock', label: 'คลังสินค้า' },
                                    { id: 'sales', label: 'ยอดขาย' },
                                    { id: 'purchase', label: 'ยอดซื้อเข้า' },
                                    { id: 'top_sellers', label: 'สินค้าขายดี' }
                                ].map(tab => (
                                    <button key={tab.id} onClick={() => { setReportTab(tab.id); setViewLevel('summary'); setSearchQuery(''); }}
                                        className={`flex-1 min-w-[90px] py-3 text-xs font-black rounded-xl transition-all ${reportTab === tab.id ? 'bg-blue-600 shadow-md text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {(reportTab === 'sales' || reportTab === 'purchase') && (
                                <div className="flex gap-2 p-1.5 bg-blue-50/50 rounded-xl border border-blue-100">
                                    {['daily', 'weekly', 'monthly'].map(filter => (
                                        <button key={filter} onClick={() => setTimeFilter(filter)}
                                            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${timeFilter === filter ? 'bg-blue-600 text-white shadow-md' : 'text-blue-600 hover:bg-blue-100'}`}>
                                            {filter === 'daily' ? 'รายวัน' : filter === 'weekly' ? 'รายสัปดาห์' : 'รายเดือน'}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 🟢 ส่วนแสดงกราฟแท่ง (Bar Chart) */}
                    {viewLevel === 'summary' && (reportTab === 'sales' || reportTab === 'purchase') && summaryData.length > 0 && (
                        <Card className="!p-6 animate-in fade-in slide-in-from-bottom-4 border-none shadow-sm bg-white">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black text-slate-800 text-sm flex items-center gap-2 uppercase tracking-widest">
                                    <BarChart2 className="text-blue-600" size={18}/>
                                    แนวโน้ม{reportTab === 'sales' ? 'ยอดขาย' : 'การซื้อ'}
                                </h3>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">สูงสุด</p>
                                    <p className="text-sm font-black text-blue-600">฿{maxSummaryAmount.toLocaleString()}</p>
                                </div>
                            </div>
                            
                            {/* แกนกราฟ */}
                            <div className="h-40 flex items-end gap-2 overflow-x-auto hide-scroll pb-2 border-b border-dashed border-slate-200">
                                {/* เราใช้ [...summaryData].reverse() เพื่อให้ข้อมูลเรียงจาก "เก่าสุด(ซ้าย)" ไปหา "ใหม่สุด(ขวา)" */}
                                {[...summaryData].reverse().map((item, idx) => {
                                    const heightPercent = maxSummaryAmount > 0 ? (item.totalAmount / maxSummaryAmount) * 100 : 0;
                                    return (
                                        <div key={idx} 
                                             className="flex flex-col items-center justify-end h-full flex-1 min-w-[36px] group cursor-pointer" 
                                             onClick={() => { setSelectedPeriod(item); setViewLevel('dateDetail'); }}>
                                            
                                            {/* แท่งกราฟ และ Tooltip */}
                                            <div className="relative w-full flex justify-center h-full items-end">
                                                <div className="absolute -top-8 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 transition-all pointer-events-none shadow-lg">
                                                    ฿{item.totalAmount.toLocaleString()}
                                                </div>
                                                <div 
                                                    className={`w-full max-w-[28px] rounded-t-lg transition-all duration-500 ease-out ${reportTab === 'sales' ? 'bg-blue-400 group-hover:bg-blue-600' : 'bg-emerald-400 group-hover:bg-emerald-600'}`}
                                                    style={{ height: `${Math.max(heightPercent, 5)}%` }} 
                                                ></div>
                                            </div>
                                            {/* ป้ายกำกับแกน X (วันที่/เดือน) */}
                                            <span className="text-[9px] text-slate-400 font-bold mt-2 truncate w-full text-center uppercase">
                                                {item.shortLabel}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}

                    {/* --- สรุปตามช่วงเวลา (List) --- */}
                    {viewLevel === 'summary' && (reportTab === 'sales' || reportTab === 'purchase') && (
                        <div className="space-y-3 animate-in fade-in duration-300">
                            {summaryData.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 font-bold">ไม่มีข้อมูล</div>
                            ) : (
                                summaryData.map(item => (
                                    <div key={item.key} onClick={() => { setSelectedPeriod(item); setViewLevel('dateDetail'); }}
                                        className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex justify-between items-center cursor-pointer hover:border-blue-300 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${reportTab === 'sales' ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'}`}>
                                                {timeFilter === 'daily' ? <Calendar size={24}/> : <Clock size={24}/>}
                                            </div>
                                            <div>
                                                <div className="font-black text-sm md:text-base text-gray-800">{item.label}</div>
                                                <div className="text-xs text-gray-500 font-bold mt-1">{item.billCount} บิล</div>
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center gap-3">
                                            <div className="font-black text-xl text-slate-800">฿{item.totalAmount.toLocaleString()}</div>
                                            <ChevronRight className="text-gray-300 group-hover:text-blue-500" size={20}/>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </>
            )}

            {/* --- รายการบิลในแต่ละช่วงเวลา (Level 2) --- */}
            {viewLevel === 'dateDetail' && (
                <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
                    <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] mb-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
                        <p className="text-xs text-blue-300 font-bold uppercase tracking-widest mb-2">{selectedPeriod?.label}</p>
                        <h2 className="text-5xl font-black italic tracking-tighter">฿{selectedPeriod?.totalAmount.toLocaleString()}</h2>
                        <p className="text-sm mt-4 text-slate-400 font-bold">จำนวนทั้งหมด {selectedPeriod?.billCount} บิล</p>
                    </div>
                    {selectedPeriod?.transactions.map(bill => (
                        <div key={bill.id} onClick={() => { setSelectedBill(bill); setViewLevel('billDetail'); }}
                            className="bg-white p-5 rounded-[2rem] border border-gray-100 flex justify-between items-center cursor-pointer hover:border-blue-300 hover:shadow-md transition-all">
                            <div>
                                <div className="font-black text-gray-800 text-base">{bill.docNo}</div>
                                <div className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wider">{new Date(bill.date).toLocaleString('th-TH')}</div>
                                {bill.memberName && <div className="text-xs text-blue-600 font-bold mt-1">👤 {bill.memberName}</div>}
                            </div>
                            <div className="text-right">
                                <span className="font-black text-lg text-slate-800">฿{bill.totalAmount.toLocaleString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- รายละเอียดบิล (Level 3) --- */}
            {viewLevel === 'billDetail' && selectedBill && (
                <Card className="!p-0 overflow-hidden animate-in zoom-in-95 shadow-2xl border-none rounded-[2.5rem]">
                    <div className="bg-slate-900 p-8 text-white">
                        <div className="flex justify-between items-start mb-6">
                            <div className="px-4 py-1.5 bg-white/10 rounded-full text-xs font-black tracking-widest uppercase border border-white/20">{selectedBill.docNo}</div>
                            <div className="text-xs opacity-60 font-bold">{new Date(selectedBill.date).toLocaleString('th-TH')}</div>
                        </div>
                        <p className="text-base opacity-90 font-bold mb-2 flex items-center gap-2">
                            👤 ลูกค้า: {selectedBill.memberName || 'ลูกค้าทั่วไป'} {selectedBill.memberPhone ? <span className="bg-blue-600 px-2 py-0.5 rounded text-[10px]">{selectedBill.memberPhone}</span> : ''}
                        </p>
                        {selectedBill.note && <p className="text-sm opacity-60 italic border-l-2 border-blue-500 pl-3 mt-4">"{selectedBill.note}"</p>}
                    </div>
                    <div className="p-8">
                        <div className="space-y-4">
                            {selectedBill.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center py-3 border-b border-dashed border-gray-100 last:border-0">
                                    <div>
                                        <div className="font-black text-gray-800">{item.name}</div>
                                        <div className="text-xs font-bold text-gray-400 mt-1">{item.qty} {item.unit} <span className="mx-1 text-gray-300">x</span> ฿{item.price?.toLocaleString() || (item.total/item.qty).toLocaleString()}</div>
                                    </div>
                                    <div className="font-black text-lg text-gray-900">฿{item.total.toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-8 pt-6 border-t-[3px] border-slate-100 space-y-3">
                            {selectedBill.receivedAmount !== undefined && (
                                <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                                    <span>รับเงินสด</span>
                                    <span>฿{Number(selectedBill.receivedAmount).toLocaleString()}</span>
                                </div>
                            )}
                            {selectedBill.changeAmount !== undefined && (
                                <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                                    <span>เงินทอน</span>
                                    <span>฿{Number(selectedBill.changeAmount).toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-end pt-4">
                                <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest">ยอดรวมทั้งสิ้น</span>
                                <span className="text-4xl font-black text-blue-600 italic tracking-tighter">฿{selectedBill.totalAmount.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="mt-8">
                            <Button 
                                className="w-full py-5 text-lg font-black flex items-center justify-center gap-3 shadow-xl shadow-blue-100 active:scale-95 transition-all" 
                                onClick={() => window.print()}
                            >
                                <Printer size={24} /> สั่งพิมพ์สลิปใบนี้
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* ส่วนแสดงสินค้าขายดี (Top Sellers) */}
            {reportTab === 'top_sellers' && viewLevel === 'summary' && (
                <div className="space-y-4 animate-in fade-in duration-500">
                    <div className="flex items-center gap-2 px-2 text-amber-600">
                        <Trophy size={20} />
                        <span className="font-black uppercase tracking-widest text-sm">สินค้าขายดี 10 อันดับแรก</span>
                    </div>
                    {topSellers.slice(0, 10).map((item, index) => (
                        <div key={index} className="bg-white p-5 rounded-[2rem] border border-gray-100 flex items-center gap-4 shadow-sm hover:border-amber-300 transition-all group">
                            <div className={`w-10 h-10 font-black text-lg rounded-full flex items-center justify-center ${index === 0 ? 'bg-amber-100 text-amber-600' : index === 1 ? 'bg-slate-100 text-slate-500' : index === 2 ? 'bg-orange-100 text-orange-700' : 'text-gray-300'}`}>
                                {index + 1}
                            </div>
                            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl overflow-hidden border">
                                {item.img.startsWith('data:') ? <img src={item.img} className="w-full h-full object-cover group-hover:scale-110 transition-transform" /> : item.img}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-black text-gray-800 truncate">{item.name}</h3>
                                <p className="text-xs font-bold text-gray-400 mt-1">รายรับ ฿{item.totalRevenue.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-black text-blue-600">{item.totalQty}</div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase">{item.unit}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ส่วนแสดงสต็อกคงเหลือ (Stock) */}
            {reportTab === 'stock' && viewLevel === 'summary' && (
                <div className="space-y-3 animate-in fade-in">
                     {products.map(p => {
                        const stock = calculateStock(p.id);
                        return (
                            <div key={p.id} className="flex justify-between items-center bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl overflow-hidden border">
                                        {p.img.startsWith('data:') ? <img src={p.img} className="w-full h-full object-cover" /> : p.img}
                                    </div>
                                    <div>
                                        <div className="font-black text-gray-800 text-base">{p.name}</div>
                                        <div className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-slate-400 inline-block mt-1">{p.code}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-2xl font-black ${stock <= p.minStock ? 'text-red-500 animate-pulse' : 'text-slate-800'}`}>{stock}</div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{p.unit}</div>
                                </div>
                            </div>
                        );
                     })}
                </div>
            )}
        </div>

        {selectedBill && (
            <div id="receipt-print-area" className="hidden print:block">
                <PrintReceipt data={selectedBill} shopName={memberSettings?.shopName} />
            </div>
        )}
      </>
    );
}