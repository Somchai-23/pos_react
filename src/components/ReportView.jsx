import React, { useState, useMemo } from 'react';
import { Filter, Calendar } from 'lucide-react';
import { Card } from './UIComponents';

export default function ReportView({ products, transactions, calculateStock }) {
    const [reportTab, setReportTab] = useState('stock'); // stock, sales, purchase
    const [filterLowStock, setFilterLowStock] = useState(false);

    // -- Stock Report Logic --
    const stockData = useMemo(() => {
       let data = products.map(p => ({
           ...p,
           currentStock: calculateStock(p.id)
       }));
       // Sort high to low
       data.sort((a, b) => b.currentStock - a.currentStock);
       return data;
    }, [products, transactions, calculateStock]);

    const displayStock = filterLowStock ? stockData.filter(d => d.currentStock <= d.minStock) : stockData;

    // -- Sales/Purchase Report Logic --
    const getReportData = (type) => {
        const filtered = transactions.filter(t => t.type === type);
        
        // Group by Date (YYYY-MM-DD)
        const grouped = filtered.reduce((acc, curr) => {
            const date = curr.date.slice(0, 10);
            if (!acc[date]) acc[date] = { date, totalQty: 0, totalAmount: 0, count: 0 };
            
            const qty = curr.items.reduce((sum, i) => sum + Number(i.qty), 0);
            acc[date].totalQty += qty;
            acc[date].totalAmount += curr.totalAmount;
            acc[date].count += 1;
            return acc;
        }, {});

        // Sort by date desc
        return Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    const salesReport = useMemo(() => getReportData('OUT'), [transactions]);
    const purchaseReport = useMemo(() => getReportData('IN'), [transactions]);

    return (
      <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto pb-24">
        <h1 className="text-3xl font-bold text-gray-900">รายงานสรุป</h1>
        
        {/* Tab Switcher */}
        <div className="flex p-1.5 bg-gray-100 rounded-2xl">
           {['stock', 'sales', 'purchase'].map(tab => (
               <button
                 key={tab}
                 onClick={() => setReportTab(tab)}
                 className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${reportTab === tab ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
               >
                 {tab === 'stock' ? 'คงเหลือ' : tab === 'sales' ? 'ยอดขาย' : 'ยอดซื้อ'}
               </button>
           ))}
        </div>

        {/* Content */}
        {reportTab === 'stock' && (
           <div className="animate-in fade-in duration-300">
              <div className="flex justify-between items-center mb-4 px-2">
                  <span className="text-sm font-medium text-gray-500">พบข้อมูล {displayStock.length} รายการ</span>
                  <button 
                    onClick={() => setFilterLowStock(!filterLowStock)}
                    className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full border transition-colors ${filterLowStock ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                     <Filter size={14} /> {filterLowStock ? 'แสดงเฉพาะสินค้าใกล้หมด' : 'แสดงทั้งหมด'}
                  </button>
              </div>
              
              <div className="space-y-3">
                 {displayStock.map(p => (
                     <div key={p.id} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                         <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-2xl border border-gray-100">
                                {p.img}
                             </div>
                             <div>
                                 <div className="font-bold text-gray-900">{p.name}</div>
                                 <div className="text-xs text-gray-400 font-mono mt-0.5">{p.code}</div>
                             </div>
                         </div>
                         <div className="text-right">
                             <div className={`text-xl font-bold ${p.currentStock <= p.minStock ? 'text-red-500' : 'text-blue-600'}`}>
                                 {p.currentStock}
                             </div>
                             <div className="text-xs text-gray-400 font-medium">{p.unit}</div>
                         </div>
                     </div>
                 ))}
              </div>
           </div>
        )}

        {(reportTab === 'sales' || reportTab === 'purchase') && (
            <div className="animate-in fade-in duration-300 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-100 !p-5">
                        <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">ยอดรวมทั้งหมด</div>
                        <div className="text-2xl font-bold text-blue-800">
                            ฿{(reportTab === 'sales' ? salesReport : purchaseReport).reduce((acc, c) => acc + c.totalAmount, 0).toLocaleString()}
                        </div>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-100 !p-5">
                        <div className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-1">จำนวนชิ้น</div>
                        <div className="text-2xl font-bold text-purple-800">
                            {(reportTab === 'sales' ? salesReport : purchaseReport).reduce((acc, c) => acc + c.totalQty, 0).toLocaleString()}
                        </div>
                    </Card>
                </div>

                <div className="space-y-3">
                    {(reportTab === 'sales' ? salesReport : purchaseReport).map((row, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex justify-between mb-3">
                                <div className="font-bold text-gray-800 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                                        <Calendar size={16} />
                                    </div>
                                    {new Date(row.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric'})}
                                </div>
                                <div className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full h-fit self-center">{row.count} บิล</div>
                            </div>
                            <div className="flex justify-between items-center text-sm border-t border-gray-50 pt-3">
                                <span className="text-gray-500">ขายได้ {row.totalQty} ชิ้น</span>
                                <span className="font-bold text-gray-900 bg-gray-50 px-2 py-1 rounded-lg">฿{row.totalAmount.toLocaleString()}</span>
                            </div>
                        </div>
                    ))}
                    {(reportTab === 'sales' ? salesReport : purchaseReport).length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-sm">ไม่มีข้อมูลในช่วงนี้</div>
                    )}
                </div>
            </div>
        )}
      </div>
    );
};