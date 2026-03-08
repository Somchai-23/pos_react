import React, { useState, useMemo } from 'react';
import { Filter, Calendar, ChevronRight, ArrowLeft, Trophy, Clock, QrCode, Printer, Search, BarChart2, TrendingUp, AlertCircle, Package, ArrowDownLeft, DollarSign, PieChart } from 'lucide-react'; 
import { Card, Button } from './UIComponents'; 
import { PrintReceipt } from './PrintTemplate'; 

export default function ReportView({ products = [], transactions = [], calculateStock, handleScanQR, memberSettings }) {
    const [reportTab, setReportTab] = useState('dashboard'); 
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

    // 🟢 1. คำนวณ Stats ด้านบน (ยอดขาย, ยอดซื้อ, กำไร/ขาดทุน)
    const dashboardStats = useMemo(() => {
        let todaySales = 0, todayPurchases = 0, todayProfit = 0;
        const today = new Date();

        (transactions || []).forEach(t => {
            if (!t.date) return;
            const d = new Date(t.date);
            if (isNaN(d.getTime())) return; 

            if (d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()) {
                if (t.type === 'IN') {
                    todayPurchases += (t.totalAmount || 0);
                }
                if (t.type === 'OUT') {
                    todaySales += (t.totalAmount || 0);
                    let totalCost = 0;
                    (t.items || []).forEach(item => {
                        const product = products.find(p => p.id === item.productId);
                        const costPrice = product ? Number(product.buyPrice || 0) : 0;
                        totalCost += (costPrice * item.qty);
                    });
                    todayProfit += ((t.totalAmount || 0) - totalCost);
                }
            }
        });

        let low = 0, out = 0;
        (products || []).forEach(p => {
            const s = calculateStock ? calculateStock(p.id) : (p.stock || 0);
            if (s <= 0) out++;
            else if (s <= (p.minStock || 5)) low++;
        });

        return { todaySales, todayPurchases, todayProfit, lowStockCount: low, outOfStockCount: out, totalProducts: products.length };
    }, [transactions, products, calculateStock]);

    // 🟢 2. ดึงข้อมูลประวัติแยกตามวัน/สัปดาห์/เดือน สำหรับทำกราฟ
    const getChartData = (type) => {
        const filtered = (transactions || []).filter(t => t.type === type);
        const grouped = filtered.reduce((acc, curr) => {
            if (!curr.date) return acc;
            const date = new Date(curr.date); 
            if (isNaN(date.getTime())) return acc; 
            
            let key = '', shortLabel = '', label = '';
            if (timeFilter === 'daily') {
                key = date.toISOString().slice(0, 10); 
                shortLabel = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
                label = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
            } else if (timeFilter === 'weekly') {
                const diff = date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1);
                const startOfWeek = new Date(date.setDate(diff)); 
                key = startOfWeek.toISOString().slice(0, 10);
                shortLabel = `W${Math.ceil(startOfWeek.getDate() / 7)} ${startOfWeek.toLocaleDateString('th-TH', { month: 'short' })}`;
                const endOfWeek = new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() + 6));
                label = `สัปดาห์: ${startOfWeek.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - ${endOfWeek.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`;
            } else if (timeFilter === 'monthly') {
                key = date.toISOString().slice(0, 7); 
                shortLabel = date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
                label = date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
            }

            if (!acc[key]) acc[key] = { key, shortLabel, label, totalAmount: 0, totalProfit: 0, billCount: 0, transactions: [] };
            
            acc[key].totalAmount += (curr.totalAmount || 0);
            
            // คำนวณกำไร/ขาดทุน (ใช้เฉพาะกราฟ OUT)
            if (type === 'OUT') {
                let billCost = 0;
                (curr.items || []).forEach(item => {
                    const product = products.find(p => p.id === item.productId);
                    const costPrice = product ? Number(product.buyPrice || 0) : 0;
                    billCost += (costPrice * item.qty);
                });
                acc[key].totalProfit += ((curr.totalAmount || 0) - billCost);
            }

            acc[key].billCount += 1;
            acc[key].transactions.push(curr);
            return acc;
        }, {});

        return Object.values(grouped).sort((a, b) => b.key.localeCompare(a.key)).slice(0, 15);
    };

    const salesChartData = useMemo(() => getChartData('OUT'), [transactions, timeFilter, products]);
    const purchaseChartData = useMemo(() => getChartData('IN'), [transactions, timeFilter, products]);
    
    const maxSalesChart = salesChartData.length > 0 ? Math.max(...salesChartData.map(d => d.totalAmount)) : 0;
    const maxPurchaseChart = purchaseChartData.length > 0 ? Math.max(...purchaseChartData.map(d => d.totalAmount)) : 0;
    // หาค่ากำไร/ขาดทุนที่มากที่สุด (เอาค่า Absolute มาเป็นเกณฑ์ตั้งเสากราฟ)
    const maxAbsProfitChart = salesChartData.length > 0 ? Math.max(...salesChartData.map(d => Math.abs(d.totalProfit)), 0) : 0;

    // 🟢 3. คำนวณข้อมูลสินค้าขายดี และ กราฟวงกลม
    const topSellers = useMemo(() => {
        const sales = (transactions || []).filter(t => t.type === 'OUT');
        const summary = {};
        sales.forEach(t => {
            (t.items || []).forEach(item => {
                const pInfo = (products || []).find(p => p.id === item.productId);
                if (!pInfo) return; 
                if (!summary[item.productId]) {
                    summary[item.productId] = { name: item.name, img: pInfo.img, totalQty: 0, totalRevenue: 0, unit: pInfo.unit };
                }
                summary[item.productId].totalQty += Number(item.qty || 0);
                summary[item.productId].totalRevenue += Number(item.total || 0);
            });
        });
        return Object.values(summary).sort((a, b) => b.totalQty - a.totalQty);
    }, [transactions, products]);

    const pieChart = useMemo(() => {
        if (!topSellers || topSellers.length === 0) return { data: [], total: 0, gradient: '' };
        
        const totalRevenue = topSellers.reduce((sum, item) => sum + item.totalRevenue, 0);
        if (totalRevenue === 0) return { data: [], total: 0, gradient: '' };

        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#94a3b8']; // น้ำเงิน, เขียว, ส้ม, ม่วง, เทา
        const top4 = topSellers.slice(0, 4);
        const others = topSellers.slice(4);
        const othersRevenue = others.reduce((sum, item) => sum + item.totalRevenue, 0);

        let currentPercent = 0;
        const data = top4.map((item, index) => {
            const percent = (item.totalRevenue / totalRevenue) * 100;
            const start = currentPercent;
            currentPercent += percent;
            return { name: item.name, revenue: item.totalRevenue, percent, start, end: currentPercent, color: colors[index] };
        });

        if (othersRevenue > 0) {
            const percent = (othersRevenue / totalRevenue) * 100;
            data.push({ name: 'สินค้าอื่นๆ', revenue: othersRevenue, percent, start: currentPercent, end: 100, color: colors[4] });
        }

        const gradient = data.map(d => `${d.color} ${d.start}% ${d.end}%`).join(', ');
        return { data, total: totalRevenue, gradient };
    }, [topSellers]);

    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const lowerQuery = searchQuery.toLowerCase();
        return (transactions || []).filter(t => 
            (t.docNo && t.docNo.toLowerCase().includes(lowerQuery)) || 
            (t.memberPhone && t.memberPhone.includes(lowerQuery)) ||
            (t.memberName && t.memberName.toLowerCase().includes(lowerQuery))
        ).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    }, [transactions, searchQuery]);

    const summaryData = useMemo(() => {
        const filtered = (transactions || []).filter(t => t.type === (reportTab === 'sales' ? 'OUT' : 'IN'));
        const grouped = filtered.reduce((acc, curr) => {
            if (!curr.date) return acc;
            const date = new Date(curr.date);
            if (isNaN(date.getTime())) return acc;

            let key = '', label = '';
            if (timeFilter === 'daily') {
                key = date.toISOString().slice(0, 10); 
                label = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
            } else if (timeFilter === 'weekly') {
                const diff = date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1);
                const startOfWeek = new Date(date.setDate(diff)); 
                key = startOfWeek.toISOString().slice(0, 10);
                const endOfWeek = new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() + 6));
                label = `สัปดาห์: ${startOfWeek.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - ${endOfWeek.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`;
            } else if (timeFilter === 'monthly') {
                key = date.toISOString().slice(0, 7); 
                label = date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
            }

            if (!acc[key]) acc[key] = { key, label, totalAmount: 0, billCount: 0, transactions: [] };
            acc[key].totalAmount += (curr.totalAmount || 0);
            acc[key].billCount += 1;
            acc[key].transactions.push(curr);
            return acc;
        }, {});

        return Object.values(grouped).sort((a, b) => b.key.localeCompare(a.key));
    }, [transactions, reportTab, timeFilter]);

    const goBack = () => {
        if (viewLevel === 'billDetail') { setViewLevel(searchQuery.trim() ? 'summary' : 'dateDetail'); }
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

        <div className="p-4 md:p-8 space-y-6 max-w-[1400px] mx-auto pb-24 print:hidden">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {viewLevel !== 'summary' && (
                        <button onClick={goBack} className="p-2 bg-white rounded-full border shadow-sm active:scale-90 transition-transform">
                            <ArrowLeft size={20}/>
                        </button>
                    )}
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight">
                        {viewLevel === 'summary' ? 'Report Center' : 'Details'}
                    </h1>
                </div>
                <button 
                    onClick={handleScanBill} 
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md w-full sm:w-auto"
                >
                    <QrCode size={18} />
                    <span>สแกน QR ค้นหาบิล</span>
                </button>
            </div>
            
            {viewLevel === 'summary' && (
                <div className="space-y-4">
                    <div className="flex p-1.5 bg-white border rounded-2xl overflow-x-auto hide-scroll shadow-sm">
                        {[
                            { id: 'dashboard', label: 'แดชบอร์ดภาพรวม' },
                            { id: 'sales', label: 'ประวัติยอดขาย' },
                            { id: 'purchase', label: 'ประวัติรับเข้า' },
                            { id: 'top_sellers', label: 'จัดอันดับสินค้า' }
                        ].map(tab => (
                            <button key={tab.id} onClick={() => { setReportTab(tab.id); setViewLevel('summary'); setSearchQuery(''); }}
                                className={`flex-1 min-w-[100px] py-3 text-xs font-black rounded-xl transition-all ${reportTab === tab.id ? 'bg-blue-600 shadow-md text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {(reportTab === 'dashboard' || reportTab === 'sales' || reportTab === 'purchase') && (
                        <div className="flex gap-2 p-1.5 bg-blue-50/50 rounded-xl border border-blue-100 w-fit">
                            {['daily', 'weekly', 'monthly'].map(filter => (
                                <button key={filter} onClick={() => setTimeFilter(filter)}
                                    className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${timeFilter === filter ? 'bg-blue-600 text-white shadow-md' : 'text-blue-600 hover:bg-blue-100'}`}>
                                    {filter === 'daily' ? 'รายวัน' : filter === 'weekly' ? 'รายสัปดาห์' : 'รายเดือน'}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 🟢 หน้า 1: DASHBOARD */}
            {viewLevel === 'summary' && reportTab === 'dashboard' && (
                <div className="space-y-6 animate-in fade-in duration-500 mt-4">
                    
                    {/* กล่องสรุป 4 กล่อง */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="!p-5 border-none shadow-md bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-[2rem]">
                            <p className="text-[10px] font-black uppercase opacity-80 mb-2 flex items-center gap-1"><TrendingUp size={14}/> ยอดขายวันนี้</p>
                            <h3 className="text-3xl font-black">฿{dashboardStats.todaySales.toLocaleString()}</h3>
                        </Card>
                        
                        {/* 🟢 กล่องกำไร/ขาดทุนวันนี้ */}
                        <Card className={`!p-5 border-none shadow-md bg-gradient-to-br text-white rounded-[2rem] ${dashboardStats.todayProfit < 0 ? 'from-red-500 to-red-700' : 'from-indigo-500 to-purple-600'}`}>
                            <p className="text-[10px] font-black uppercase opacity-80 mb-2 flex items-center gap-1">
                                <DollarSign size={14}/> {dashboardStats.todayProfit < 0 ? 'ขาดทุนวันนี้ (Loss)' : 'กำไรวันนี้ (Profit)'}
                            </p>
                            <h3 className="text-3xl font-black">
                                {dashboardStats.todayProfit < 0 ? '-' : ''}฿{Math.abs(dashboardStats.todayProfit).toLocaleString()}
                            </h3>
                        </Card>

                        <Card className="!p-5 border-none shadow-md bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-[2rem]">
                            <p className="text-[10px] font-black uppercase opacity-80 mb-2 flex items-center gap-1"><ArrowDownLeft size={14}/> ยอดซื้อเข้าวันนี้</p>
                            <h3 className="text-3xl font-black">฿{dashboardStats.todayPurchases.toLocaleString()}</h3>
                        </Card>

                        <Card className="!p-5 border-none shadow-md bg-gradient-to-br from-orange-400 to-orange-600 text-white rounded-[2rem]">
                            <p className="text-[10px] font-black uppercase opacity-80 mb-2 flex items-center gap-1"><AlertCircle size={14}/> สินค้าใกล้หมด</p>
                            <h3 className="text-3xl font-black">{dashboardStats.lowStockCount + dashboardStats.outOfStockCount} <span className="text-sm font-bold">รายการ</span></h3>
                        </Card>
                    </div>

                    {/* กราฟ 4 ตัว */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* 1. 📈 กราฟยอดขาย (Sales) */}
                        <Card className="!p-6 border-none shadow-sm bg-white rounded-[2.5rem]">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black text-slate-800 text-sm flex items-center gap-2 uppercase tracking-widest">
                                    <BarChart2 className="text-blue-600" size={20}/> แนวโน้มยอดขาย (Sales)
                                </h3>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">ยอดสูงสุด</p>
                                    <p className="text-sm font-black text-blue-600">฿{maxSalesChart.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="h-48 flex items-end gap-2 overflow-x-auto hide-scroll pb-2 border-b border-dashed border-slate-200">
                                {salesChartData.length === 0 ? (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold uppercase text-xs">ไม่มีข้อมูลการขาย</div>
                                ) : (
                                    [...salesChartData].reverse().map((item, idx) => {
                                        const heightPercent = maxSalesChart > 0 ? (item.totalAmount / maxSalesChart) * 100 : 0;
                                        return (
                                            <div key={idx} className="flex flex-col items-center justify-end h-full flex-1 min-w-[36px] group cursor-pointer" onClick={() => { setSelectedPeriod(item); setViewLevel('dateDetail'); }}>
                                                <div className="relative w-full flex justify-center h-full items-end">
                                                    <div className="absolute -top-8 bg-slate-900 text-white text-[10px] font-bold py-1.5 px-2 rounded-xl opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 transition-all shadow-lg pointer-events-none">
                                                        ฿{item.totalAmount.toLocaleString()}
                                                    </div>
                                                    <div className="w-full max-w-[28px] rounded-t-xl bg-blue-100 group-hover:bg-blue-600 transition-all duration-500 ease-out" style={{ height: `${Math.max(heightPercent, 5)}%` }}></div>
                                                </div>
                                                <span className="text-[9px] text-slate-400 font-bold mt-3 truncate w-full text-center uppercase">{item.shortLabel}</span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </Card>

                        {/* 2. 📈 กราฟยอดซื้อเข้า (Purchase) */}
                        <Card className="!p-6 border-none shadow-sm bg-white rounded-[2.5rem]">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black text-slate-800 text-sm flex items-center gap-2 uppercase tracking-widest">
                                    <ArrowDownLeft className="text-emerald-500" size={20}/> แนวโน้มซื้อเข้า (Purchase)
                                </h3>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">ซื้อเข้าสูงสุด</p>
                                    <p className="text-sm font-black text-emerald-600">฿{maxPurchaseChart.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="h-48 flex items-end gap-2 overflow-x-auto hide-scroll pb-2 border-b border-dashed border-slate-200">
                                {purchaseChartData.length === 0 ? (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold uppercase text-xs">ไม่มีข้อมูลรับเข้า</div>
                                ) : (
                                    [...purchaseChartData].reverse().map((item, idx) => {
                                        const heightPercent = maxPurchaseChart > 0 ? (item.totalAmount / maxPurchaseChart) * 100 : 0;
                                        return (
                                            <div key={idx} className="flex flex-col items-center justify-end h-full flex-1 min-w-[36px] group cursor-pointer" onClick={() => { setSelectedPeriod(item); setViewLevel('dateDetail'); }}>
                                                <div className="relative w-full flex justify-center h-full items-end">
                                                    <div className="absolute -top-8 bg-slate-900 text-white text-[10px] font-bold py-1.5 px-2 rounded-xl opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 transition-all shadow-lg pointer-events-none">
                                                        ฿{item.totalAmount.toLocaleString()}
                                                    </div>
                                                    <div className="w-full max-w-[28px] rounded-t-xl bg-emerald-100 group-hover:bg-emerald-500 transition-all duration-500 ease-out" style={{ height: `${Math.max(heightPercent, 5)}%` }}></div>
                                                </div>
                                                <span className="text-[9px] text-slate-400 font-bold mt-3 truncate w-full text-center uppercase">{item.shortLabel}</span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </Card>

                        {/* 3. 📈 กราฟกำไรและขาดทุน (Bidirectional Bar Chart) */}
                        <Card className="!p-6 border-none shadow-sm bg-white rounded-[2.5rem]">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black text-slate-800 text-sm flex items-center gap-2 uppercase tracking-widest">
                                    <DollarSign className="text-purple-600" size={20}/> แนวโน้มกำไรและขาดทุน
                                </h3>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">กำไร/ขาดทุนสูงสุด</p>
                                    <p className="text-sm font-black text-purple-600">฿{maxAbsProfitChart.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="h-48 flex items-center gap-2 overflow-x-auto hide-scroll pb-2 border-b border-dashed border-slate-200">
                                {salesChartData.length === 0 ? (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold uppercase text-xs">ไม่มีข้อมูลกำไร</div>
                                ) : (
                                    [...salesChartData].reverse().map((item, idx) => {
                                        const isLoss = item.totalProfit < 0;
                                        const heightPercent = maxAbsProfitChart > 0 ? (Math.abs(item.totalProfit) / maxAbsProfitChart) * 100 : 0;

                                        return (
                                            <div key={idx} className="flex flex-col items-center justify-center h-full flex-1 min-w-[36px] group cursor-pointer relative" onClick={() => { setSelectedPeriod(item); setViewLevel('dateDetail'); }}>
                                                {/* ส่วนกำไร (ด้านบนเส้นศูนย์) */}
                                                <div className="w-full h-[45%] flex items-end justify-center relative">
                                                    {!isLoss && (
                                                        <div className="w-full max-w-[24px] rounded-t-md bg-purple-100 group-hover:bg-purple-600 transition-all duration-500 ease-out" style={{ height: `${Math.max(heightPercent, 5)}%` }}></div>
                                                    )}
                                                </div>
                                                
                                                {/* เส้นแบ่งกลาง และ วันที่ */}
                                                <div className="w-full h-[10%] flex items-center justify-center z-10 relative">
                                                    <div className="absolute w-full h-[1px] bg-slate-100"></div>
                                                    <span className="text-[8px] text-slate-400 font-bold uppercase bg-white px-1 relative">{item.shortLabel}</span>
                                                </div>

                                                {/* ส่วนขาดทุน (ด้านล่างเส้นศูนย์) */}
                                                <div className="w-full h-[45%] flex items-start justify-center relative">
                                                    {isLoss && (
                                                        <div className="w-full max-w-[24px] rounded-b-md bg-red-100 group-hover:bg-red-500 transition-all duration-500 ease-out" style={{ height: `${Math.max(heightPercent, 5)}%` }}></div>
                                                    )}
                                                </div>

                                                <div className={`absolute ${isLoss ? 'top-4' : 'bottom-4'} bg-slate-900 text-white text-[10px] font-bold py-1.5 px-2 rounded-xl opacity-0 group-hover:opacity-100 whitespace-nowrap z-20 pointer-events-none shadow-lg`}>
                                                    {isLoss ? 'ขาดทุน: -' : 'กำไร: '}฿{Math.abs(item.totalProfit).toLocaleString()}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </Card>

                        {/* 4. 📊 กราฟวงกลม สัดส่วนสินค้าขายดี (Pie/Donut Chart) */}
                        <Card className="!p-6 border-none shadow-sm bg-white rounded-[2.5rem] flex flex-col">
                            <h3 className="font-black text-slate-800 text-sm flex items-center gap-2 uppercase tracking-widest mb-6">
                                <PieChart className="text-amber-500" size={20}/> สัดส่วนรายได้จากสินค้า 5 อันดับแรก
                            </h3>
                            <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-8">
                                {pieChart.data.length > 0 ? (
                                    <>
                                        {/* วงกลม Donut Chart สร้างด้วย CSS Conic Gradient */}
                                        <div className="relative w-36 h-36 rounded-full shadow-inner border border-slate-50 flex-shrink-0" style={{ background: `conic-gradient(${pieChart.gradient})` }}>
                                            <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                                                <div className="text-center">
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-widest">รายได้รวม</span>
                                                    <span className="text-sm font-black text-slate-800">฿{pieChart.total > 9999 ? (pieChart.total/1000).toFixed(1)+'k' : pieChart.total}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* รายละเอียดแต่ละสี (Legend) */}
                                        <div className="space-y-3 w-full">
                                            {pieChart.data.map((d, i) => (
                                                <div key={i} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 overflow-hidden pr-2">
                                                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }}></span>
                                                        <span className="font-bold text-xs text-slate-600 truncate">{d.name}</span>
                                                    </div>
                                                    <span className="font-black text-xs text-slate-800 flex-shrink-0">{d.percent.toFixed(1)}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold uppercase text-xs pb-10">ไม่มีข้อมูลขายสินค้า</div>
                                )}
                            </div>
                        </Card>

                    </div>
                </div>
            )}

            {/* 🟢 หน้า 2: ประวัติยอดขาย / รับเข้า (List & Search) */}
            {viewLevel === 'summary' && (reportTab === 'sales' || reportTab === 'purchase') && (
                <div className="space-y-4 animate-in fade-in duration-300 mt-4">
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="ค้นหารายการ" 
                            className="w-full bg-white border-2 border-blue-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-4 focus:ring-blue-50 outline-none shadow-sm transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Search className="absolute left-4 top-4 text-blue-400" size={22} />
                    </div>

                    {searchQuery.trim() !== '' ? (
                        <div className="space-y-3">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mt-4">ผลการค้นหา ({searchResults.length} รายการ)</p>
                            {searchResults.length === 0 ? (
                                <div className="text-center py-10 bg-white rounded-3xl border border-gray-100">
                                    <Search className="mx-auto text-gray-200 mb-2" size={32}/>
                                    <p className="text-gray-400 font-bold">ไม่พบบิลที่ตรงกับคำค้นหา</p>
                                </div>
                            ) : (
                                searchResults.map(bill => (
                                    <div key={bill.id} onClick={() => { setSelectedBill(bill); setViewLevel('billDetail'); }}
                                        className="bg-white p-5 rounded-[2rem] border border-blue-100 shadow-sm flex justify-between items-center cursor-pointer hover:bg-blue-50 transition-colors">
                                        <div>
                                            <div className="font-black text-slate-800">{bill.docNo}</div>
                                            <div className="text-[10px] text-slate-500 font-bold mt-1">
                                                🕒 {new Date(bill.date).toLocaleString('th-TH')} <br/>
                                                {bill.type === 'OUT' ? '👤 ลูกค้า:' : '📥 ผู้รับเข้า:'} {bill.memberName || '-'} {bill.memberPhone ? `(${bill.memberPhone})` : ''}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`font-black text-lg ${bill.type === 'OUT' ? 'text-blue-600' : 'text-emerald-600'}`}>฿{(bill.totalAmount || 0).toLocaleString()}</span>
                                            <div className="text-[10px] text-slate-400 font-bold">{bill.items?.length || 0} รายการ</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3 pt-2">
                            {summaryData.length === 0 ? (
                                <div className="text-center py-20 text-gray-400 font-bold">ไม่มีข้อมูลประวัติในช่วงเวลานี้</div>
                            ) : (
                                summaryData.map(item => (
                                    <div key={item.key} onClick={() => { setSelectedPeriod(item); setViewLevel('dateDetail'); }}
                                        className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center cursor-pointer hover:border-blue-300 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${reportTab === 'sales' ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'}`}>
                                                {timeFilter === 'daily' ? <Calendar size={24}/> : <Clock size={24}/>}
                                            </div>
                                            <div>
                                                <div className="font-black text-sm md:text-base text-slate-800">{item.label}</div>
                                                <div className="text-xs text-slate-500 font-bold mt-1">{item.billCount} บิล</div>
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center gap-3">
                                            <div className="font-black text-xl text-slate-800">฿{item.totalAmount.toLocaleString()}</div>
                                            <ChevronRight className="text-slate-300 group-hover:text-blue-500" size={20}/>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* --- Level 2: รายการบิลในวันที่เลือก --- */}
            {viewLevel === 'dateDetail' && (
                <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
                    <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] mb-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
                        <p className="text-xs text-blue-300 font-bold uppercase tracking-widest mb-2">{selectedPeriod?.label}</p>
                        <h2 className="text-5xl font-black italic tracking-tighter">฿{(selectedPeriod?.totalAmount || 0).toLocaleString()}</h2>
                        <p className="text-sm mt-4 text-slate-400 font-bold">จำนวนทั้งหมด {selectedPeriod?.billCount} บิล</p>
                    </div>
                    {(selectedPeriod?.transactions || []).map(bill => (
                        <div key={bill.id} onClick={() => { setSelectedBill(bill); setViewLevel('billDetail'); }}
                            className="bg-white p-5 rounded-[2rem] border border-slate-100 flex justify-between items-center cursor-pointer hover:border-blue-300 hover:shadow-md transition-all">
                            <div>
                                <div className="font-black text-slate-800 text-base">{bill.docNo}</div>
                                <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">{new Date(bill.date).toLocaleString('th-TH')}</div>
                                {bill.memberName && <div className={`text-xs font-bold mt-1 ${bill.type === 'OUT' ? 'text-blue-600' : 'text-emerald-600'}`}>{bill.type === 'OUT' ? '👤' : '📥'} {bill.memberName}</div>}
                            </div>
                            <div className="text-right">
                                <span className={`font-black text-lg ${bill.type === 'OUT' ? 'text-blue-600' : 'text-emerald-600'}`}>฿{(bill.totalAmount || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- Level 3: รายละเอียดบิล --- */}
            {viewLevel === 'billDetail' && selectedBill && (
                <Card className="!p-0 overflow-hidden animate-in zoom-in-95 shadow-2xl border-none rounded-[2.5rem]">
                    <div className="bg-slate-900 p-8 text-white">
                        <div className="flex justify-between items-start mb-6">
                            <div className="px-4 py-1.5 bg-white/10 rounded-full text-xs font-black tracking-widest uppercase border border-white/20">{selectedBill.docNo}</div>
                            <div className="text-xs opacity-60 font-bold">{new Date(selectedBill.date).toLocaleString('th-TH')}</div>
                        </div>
                        <p className="text-base opacity-90 font-bold mb-2 flex items-center gap-2">
                            {selectedBill.type === 'OUT' ? '👤 ลูกค้า:' : '📥 ผู้ทำรายการ:'} {selectedBill.memberName || '-'} 
                            {selectedBill.memberPhone ? <span className="bg-blue-600 px-2 py-0.5 rounded text-[10px]">{selectedBill.memberPhone}</span> : ''}
                        </p>
                        {selectedBill.note && <p className="text-sm opacity-60 italic border-l-2 border-blue-500 pl-3 mt-4">"{selectedBill.note}"</p>}
                    </div>
                    <div className="p-8">
                        <div className="space-y-4">
                            {(selectedBill.items || []).length > 0 ? (
                                (selectedBill.items || []).map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center py-3 border-b border-dashed border-slate-100 last:border-0">
                                        <div>
                                            <div className="font-black text-slate-800">{item.name}</div>
                                            <div className="text-xs font-bold text-slate-400 mt-1">{item.qty} {item.unit} <span className="mx-1 text-slate-300">x</span> ฿{item.price?.toLocaleString() || ((item.total || 0)/(item.qty || 1)).toLocaleString()}</div>
                                        </div>
                                        <div className="font-black text-lg text-slate-900">฿{(item.total || 0).toLocaleString()}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-slate-400 font-bold py-4">ไม่มีรายการสินค้าในบิลนี้ (บิลเก่า)</div>
                            )}
                        </div>
                        
                        <div className="mt-8 pt-6 border-t-[3px] border-slate-100 space-y-3">
                            {selectedBill.receivedAmount !== undefined && (
                                <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                                    <span>รับเงินสด</span>
                                    <span>฿{Number(selectedBill.receivedAmount || 0).toLocaleString()}</span>
                                </div>
                            )}
                            {selectedBill.changeAmount !== undefined && (
                                <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                                    <span>เงินทอน</span>
                                    <span>฿{Number(selectedBill.changeAmount || 0).toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-end pt-4">
                                <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest">ยอดรวมทั้งสิ้น</span>
                                <span className="text-4xl font-black text-blue-600 italic tracking-tighter">฿{(selectedBill.totalAmount || 0).toLocaleString()}</span>
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

            {/* 🟢 หน้า 3: จัดอันดับสินค้าขายดี */}
            {reportTab === 'top_sellers' && viewLevel === 'summary' && (
                <div className="space-y-4 animate-in fade-in duration-500 mt-4">
                    <div className="flex items-center gap-2 px-2 text-amber-600">
                        <Trophy size={20} />
                        <span className="font-black uppercase tracking-widest text-sm">สินค้าขายดี 10 อันดับแรก</span>
                    </div>
                    {(topSellers || []).slice(0, 10).map((item, index) => (
                        <div key={index} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex items-center gap-4 shadow-sm hover:border-amber-300 transition-all group">
                            <div className={`w-10 h-10 font-black text-lg rounded-full flex items-center justify-center ${index === 0 ? 'bg-amber-100 text-amber-600' : index === 1 ? 'bg-slate-100 text-slate-500' : index === 2 ? 'bg-orange-100 text-orange-700' : 'text-slate-300'}`}>
                                {index + 1}
                            </div>
                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl overflow-hidden border">
                                {item.img?.startsWith('data:') ? <img src={item.img} className="w-full h-full object-cover group-hover:scale-110 transition-transform" /> : item.img}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-black text-slate-800 truncate">{item.name}</h3>
                                <p className="text-xs font-bold text-slate-400 mt-1">รายรับ ฿{(item.totalRevenue || 0).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-black text-blue-600">{item.totalQty}</div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase">{item.unit}</div>
                            </div>
                        </div>
                    ))}
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