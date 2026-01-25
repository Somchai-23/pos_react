import React, { useState, useMemo } from 'react';
import { Filter, Calendar, ChevronRight, ArrowLeft, Trophy, Medal, Clock } from 'lucide-react';
import { Card } from './UIComponents';

export default function ReportView({ products, transactions, calculateStock }) {
    const [reportTab, setReportTab] = useState('stock'); // stock, sales, purchase, top_sellers
    const [viewLevel, setViewLevel] = useState('summary');
    const [timeFilter, setTimeFilter] = useState('daily'); // daily, weekly, monthly
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [selectedBill, setSelectedBill] = useState(null);

    // --- Logic: คำนวณสรุปข้อมูลตามช่วงเวลา (ขาย/ซื้อ) ---
    const summaryData = useMemo(() => {
        const filtered = transactions.filter(t => t.type === (reportTab === 'sales' ? 'OUT' : 'IN'));
        
        const grouped = filtered.reduce((acc, curr) => {
            const date = new Date(curr.date);
            let key = '';
            let label = '';
            
            if (timeFilter === 'daily') {
                key = curr.date.slice(0, 10); // YYYY-MM-DD
                label = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
            } else if (timeFilter === 'weekly') {
                // คำนวณหาต้นสัปดาห์ (วันจันทร์)
                const diff = date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1);
                const startOfWeek = new Date(new Date(curr.date).setDate(diff));
                key = startOfWeek.toISOString().slice(0, 10);
                const endOfWeek = new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() + 6));
                label = `สัปดาห์: ${startOfWeek.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - ${endOfWeek.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`;
            } else if (timeFilter === 'monthly') {
                key = curr.date.slice(0, 7); // YYYY-MM
                label = date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
            }

            if (!acc[key]) acc[key] = { key, label, totalAmount: 0, billCount: 0, transactions: [] };
            acc[key].totalAmount += curr.totalAmount;
            acc[key].billCount += 1;
            acc[key].transactions.push(curr);
            return acc;
        }, {});

        return Object.values(grouped).sort((a, b) => b.key.localeCompare(a.key));
    }, [transactions, reportTab, timeFilter]);

    // --- Logic: สินค้าขายดี (ยังคงเดิมแต่กรองสินค้าที่ลบออก) ---
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
        if (viewLevel === 'billDetail') setViewLevel('dateDetail');
        else if (viewLevel === 'dateDetail') { setViewLevel('summary'); setSelectedPeriod(null); }
    };

    return (
      <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto pb-24">
        <div className="flex items-center gap-4">
            {viewLevel !== 'summary' && (
                <button onClick={goBack} className="p-2 bg-white rounded-full border shadow-sm active:scale-90 transition-transform">
                    <ArrowLeft size={20}/>
                </button>
            )}
            <h1 className="text-3xl font-bold text-gray-900">
                {viewLevel === 'summary' ? 'รายงานสรุป' : 'รายละเอียด'}
            </h1>
        </div>
        
        {viewLevel === 'summary' && (
            <div className="space-y-4">
                {/* แถบเลือกประเภทรายงาน */}
                <div className="flex p-1.5 bg-gray-100 rounded-2xl overflow-x-auto no-scrollbar">
                    {[
                        { id: 'stock', label: 'คลัง' },
                        { id: 'sales', label: 'ยอดขาย' },
                        { id: 'purchase', label: 'ยอดซื้อ' },
                        { id: 'top_sellers', label: 'ขายดี' }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => { setReportTab(tab.id); setViewLevel('summary'); }}
                            className={`flex-1 min-w-[80px] py-2.5 text-xs font-bold rounded-xl transition-all ${reportTab === tab.id ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ปุ่มเลือกช่วงเวลา (โชว์เฉพาะหน้า ยอดขาย/ยอดซื้อ) */}
                {(reportTab === 'sales' || reportTab === 'purchase') && (
                    <div className="flex gap-2 p-1 bg-blue-50/50 rounded-xl border border-blue-100">
                        {['daily', 'weekly', 'monthly'].map(filter => (
                            <button key={filter} onClick={() => setTimeFilter(filter)}
                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${timeFilter === filter ? 'bg-blue-600 text-white shadow-md' : 'text-blue-400'}`}>
                                {filter === 'daily' ? 'รายวัน' : filter === 'weekly' ? 'รายสัปดาห์' : 'รายเดือน'}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* --- สรุปตามช่วงเวลา (Summary List) --- */}
        {viewLevel === 'summary' && (reportTab === 'sales' || reportTab === 'purchase') && (
            <div className="space-y-3 animate-in fade-in duration-300">
                {summaryData.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">ไม่มีข้อมูลในช่วงนี้</div>
                ) : (
                    summaryData.map(item => (
                        <div key={item.key} onClick={() => { setSelectedPeriod(item); setViewLevel('dateDetail'); }}
                            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center cursor-pointer hover:border-blue-300 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                    {timeFilter === 'daily' ? <Calendar size={24}/> : <Clock size={24}/>}
                                </div>
                                <div>
                                    <div className="font-bold text-sm md:text-base text-gray-800">{item.label}</div>
                                    <div className="text-xs text-gray-500">{item.billCount} บิล</div>
                                </div>
                            </div>
                            <div className="text-right flex items-center gap-3">
                                <div className="font-bold text-lg text-blue-600">฿{item.totalAmount.toLocaleString()}</div>
                                <ChevronRight className="text-gray-300" size={18}/>
                            </div>
                        </div>
                    ))
                )}
            </div>
        )}

        {/* --- รายการบิลในแต่ละช่วงเวลา (Level 2) --- */}
        {viewLevel === 'dateDetail' && (
            <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
                <div className="bg-blue-600 text-white p-6 rounded-3xl mb-4 shadow-lg shadow-blue-100">
                    <p className="text-xs opacity-80 font-bold uppercase mb-1">{selectedPeriod?.label}</p>
                    <h2 className="text-3xl font-black">฿{selectedPeriod?.totalAmount.toLocaleString()}</h2>
                </div>
                {selectedPeriod?.transactions.map(bill => (
                    <div key={bill.id} onClick={() => { setSelectedBill(bill); setViewLevel('billDetail'); }}
                        className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors">
                        <div>
                            <div className="font-bold text-gray-800">{bill.docNo}</div>
                            <div className="text-xs text-gray-400">{new Date(bill.date).toLocaleString('th-TH')}</div>
                        </div>
                        <span className="font-bold">฿{bill.totalAmount.toLocaleString()}</span>
                    </div>
                ))}
            </div>
        )}

        {/* --- รายละเอียดบิล (Level 3) --- */}
        {viewLevel === 'billDetail' && selectedBill && (
            <Card className="!p-0 overflow-hidden animate-in zoom-in-95 shadow-xl border-none">
                <div className="bg-slate-900 p-8 text-white">
                    <div className="flex justify-between items-start mb-6">
                        <div className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black">{selectedBill.docNo}</div>
                        <div className="text-xs opacity-60">{new Date(selectedBill.date).toLocaleString('th-TH')}</div>
                    </div>
                    <p className="text-sm opacity-80">หมายเหตุ: {selectedBill.note || '-'}</p>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        {selectedBill.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                                <div className="font-bold text-gray-800">{item.name} <span className="text-xs font-normal text-gray-400">x {item.qty}</span></div>
                                <div className="font-bold text-gray-900">฿{item.total.toLocaleString()}</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-100 flex justify-between items-center">
                        <span className="text-gray-400 font-bold text-xs uppercase tracking-tighter">Total Amount</span>
                        <span className="text-3xl font-black text-blue-600">฿{selectedBill.totalAmount.toLocaleString()}</span>
                    </div>
                </div>
            </Card>
        )}

        {/* ส่วนแสดงสินค้าขายดี (Top Sellers) */}
        {reportTab === 'top_sellers' && viewLevel === 'summary' && (
            <div className="space-y-4 animate-in fade-in duration-500">
                <div className="flex items-center gap-2 px-2 text-amber-600">
                    <Trophy size={20} />
                    <span className="font-bold">อันดับสินค้าขายดี</span>
                </div>
                {topSellers.map((item, index) => (
                    <div key={index} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4 relative">
                        <div className="w-8 h-8 font-black text-gray-300 text-center">{index + 1}</div>
                        <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center text-2xl overflow-hidden border">
                            {item.img.startsWith('data:') ? <img src={item.img} className="w-full h-full object-cover" /> : item.img}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-800">{item.name}</h3>
                            <p className="text-xs text-gray-500">รวม ฿{item.totalRevenue.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-xl font-black text-blue-600">{item.totalQty}</div>
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
                        <div key={p.id} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-2xl overflow-hidden border">
                                    {p.img.startsWith('data:') ? <img src={p.img} className="w-full h-full object-cover" /> : p.img}
                                </div>
                                <div><div className="font-bold text-gray-800">{p.name}</div><div className="text-[10px] text-gray-400 font-mono">{p.code}</div></div>
                            </div>
                            <div className="text-right">
                                <div className={`text-xl font-black ${stock <= p.minStock ? 'text-red-500' : 'text-blue-600'}`}>{stock}</div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase">{p.unit}</div>
                            </div>
                        </div>
                    );
                 })}
            </div>
        )}
      </div>
    );
}