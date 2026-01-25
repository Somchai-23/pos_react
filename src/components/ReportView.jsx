import React, { useState, useMemo } from 'react';
import { Filter, Calendar, ChevronRight, FileText, ArrowLeft, Package } from 'lucide-react';
import { Card } from './UIComponents';

export default function ReportView({ products, transactions, calculateStock }) {
    const [reportTab, setReportTab] = useState('stock'); 
    const [filterLowStock, setFilterLowStock] = useState(false);
    
    // State สำหรับการ Drill-down (ดูรายละเอียด)
    const [viewLevel, setViewLevel] = useState('summary'); // summary, dateDetail, billDetail
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedBill, setSelectedBill] = useState(null);

    // -- สรุปข้อมูลรายวัน --
    const dailyData = useMemo(() => {
        const filtered = transactions.filter(t => t.type === (reportTab === 'sales' ? 'OUT' : 'IN'));
        const grouped = filtered.reduce((acc, curr) => {
            const date = curr.date.slice(0, 10);
            if (!acc[date]) acc[date] = { date, totalAmount: 0, billCount: 0, transactions: [] };
            acc[date].totalAmount += curr.totalAmount;
            acc[date].billCount += 1;
            acc[date].transactions.push(curr);
            return acc;
        }, {});
        return Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [transactions, reportTab]);

    // ฟังก์ชันย้อนกลับ
    const goBack = () => {
        if (viewLevel === 'billDetail') setViewLevel('dateDetail');
        else if (viewLevel === 'dateDetail') {
            setViewLevel('summary');
            setSelectedDate(null);
        }
    };

    return (
      <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto pb-24">
        <div className="flex items-center gap-4">
            {viewLevel !== 'summary' && (
                <button onClick={goBack} className="p-2 bg-white rounded-full border shadow-sm"><ArrowLeft size={20}/></button>
            )}
            <h1 className="text-3xl font-bold text-gray-900">
                {viewLevel === 'summary' ? 'รายงานสรุป' : viewLevel === 'dateDetail' ? 'รายการบิล' : 'รายละเอียดบิล'}
            </h1>
        </div>
        
        {viewLevel === 'summary' && (
            <div className="flex p-1.5 bg-gray-100 rounded-2xl">
                {['stock', 'sales', 'purchase'].map(tab => (
                    <button key={tab} onClick={() => { setReportTab(tab); setViewLevel('summary'); }}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${reportTab === tab ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>
                        {tab === 'stock' ? 'คลัง' : tab === 'sales' ? 'ยอดขาย' : 'ยอดซื้อ'}
                    </button>
                ))}
            </div>
        )}

        {/* --- LEVEL 1: สรุปรายวัน --- */}
        {viewLevel === 'summary' && reportTab !== 'stock' && (
            <div className="space-y-3">
                {dailyData.map(day => (
                    <div key={day.date} onClick={() => { setSelectedDate(day); setViewLevel('dateDetail'); }}
                        className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center cursor-pointer hover:border-blue-300 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Calendar size={24}/></div>
                            <div>
                                <div className="font-bold text-lg">{new Date(day.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric'})}</div>
                                <div className="text-sm text-gray-500">{day.billCount} บิล</div>
                            </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                            <div className="font-bold text-lg text-blue-600">฿{day.totalAmount.toLocaleString()}</div>
                            <ChevronRight className="text-gray-300" size={20}/>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* --- LEVEL 2: รายการบิลในวันนั้น --- */}
        {viewLevel === 'dateDetail' && (
            <div className="space-y-3">
                <div className="bg-blue-600 text-white p-4 rounded-2xl mb-4">
                    <p className="text-sm opacity-80 font-medium">ยอดรวมประจำวัน</p>
                    <h2 className="text-2xl font-bold">฿{selectedDate?.totalAmount.toLocaleString()}</h2>
                </div>
                {selectedDate?.transactions.map(bill => (
                    <div key={bill.id} onClick={() => { setSelectedBill(bill); setViewLevel('billDetail'); }}
                        className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-50">
                        <div>
                            <div className="font-bold text-gray-800">{bill.docNo}</div>
                            <div className="text-xs text-gray-400">{new Date(bill.date).toLocaleTimeString('th-TH')} น.</div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="font-bold">฿{bill.totalAmount.toLocaleString()}</span>
                            <ChevronRight size={16} className="text-gray-300"/>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* --- LEVEL 3: รายละเอียดในบิล (ว่าซื้ออะไรไปบ้าง) --- */}
        {viewLevel === 'billDetail' && selectedBill && (
            <Card className="!p-0 overflow-hidden">
                <div className="bg-gray-50 p-6 border-b">
                    <div className="flex justify-between items-start mb-4">
                        <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">{selectedBill.docNo}</div>
                        <div className="text-sm text-gray-500">{new Date(selectedBill.date).toLocaleString('th-TH')}</div>
                    </div>
                    <p className="text-sm text-gray-600 font-medium">หมายเหตุ: {selectedBill.note || '-'}</p>
                </div>
                <div className="p-6">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b">
                                <th className="pb-3 font-bold">รายการ</th>
                                <th className="pb-3 text-center font-bold">จำนวน</th>
                                <th className="pb-3 text-right font-bold">รวม</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {selectedBill.items.map((item, idx) => (
                                <tr key={idx} className="text-sm">
                                    <td className="py-4 font-medium text-gray-800">{item.name}</td>
                                    <td className="py-4 text-center">{item.qty}</td>
                                    <td className="py-4 text-right font-bold">฿{item.total.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="mt-6 pt-6 border-t flex justify-between items-center">
                        <span className="text-gray-500 font-bold">ยอดรวมสุทธิ</span>
                        <span className="text-2xl font-bold text-blue-600">฿{selectedBill.totalAmount.toLocaleString()}</span>
                    </div>
                </div>
            </Card>
        )}

        {/* ส่วนแสดง Stock Report (คงเดิม) */}
        {reportTab === 'stock' && viewLevel === 'summary' && (
            /* ... โค้ดส่วนแสดงตารางสต็อกเดิมของคุณ ... */
            <div className="space-y-3">
                {products.map(p => (
                    <div key={p.id} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-2xl border border-gray-100">{p.img}</div>
                            <div>
                                <div className="font-bold text-gray-900">{p.name}</div>
                                <div className="text-xs text-gray-400 font-mono mt-0.5">{p.code}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={`text-xl font-bold ${calculateStock(p.id) <= p.minStock ? 'text-red-500' : 'text-blue-600'}`}>
                                {calculateStock(p.id)}
                            </div>
                            <div className="text-xs text-gray-400 font-medium">{p.unit}</div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    );
}