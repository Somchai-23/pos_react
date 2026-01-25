import React, { useState } from 'react';
import { UserPlus, Settings, Phone, User, Trash2, Award, Clock, Search } from 'lucide-react';
import { Card, Button, Input } from './UIComponents';

export default function MembershipView({ customers, setCustomers, settings, setSettings }) {
    const [newMember, setNewMember] = useState({ name: '', phone: '' });
    const [activeSubTab, setActiveSubTab] = useState('list');
    const [searchTerm, setSearchTerm] = useState('');

    const handleAddMember = () => {
        if (!newMember.name || !newMember.phone) return alert('กรุณากรอกข้อมูลให้ครบ');
        if (customers.find(c => c.phone === newMember.phone)) return alert('เบอร์โทรนี้เป็นสมาชิกอยู่แล้ว');
        
        setCustomers([...customers, { 
            ...newMember, 
            id: Date.now(), 
            points: 0, 
            lastActivity: new Date().toISOString() 
        }]);
        setNewMember({ name: '', phone: '' });
        alert('✅ เพิ่มสมาชิกสำเร็จ');
    };

    // --- ฟังก์ชันลบสมาชิก ---
    const handleDeleteMember = (id, name) => {
        if (window.confirm(`คุณแน่ใจหรือไม่ที่จะลบสมาชิกคุณ "${name}"? \n(แต้มสะสมทั้งหมดจะหายไปและไม่สามารถกู้คืนได้)`)) {
            setCustomers(customers.filter(c => c.id !== id));
        }
    };

    // กรองรายชื่อตามช่องค้นหา
    const filteredCustomers = customers.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.phone.includes(searchTerm)
    );

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-2xl mx-auto pb-24">
            <h1 className="text-3xl font-bold text-gray-900">ระบบสมาชิก</h1>
            
            <div className="flex p-1 bg-gray-100 rounded-xl shadow-inner">
                <button onClick={() => setActiveSubTab('list')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeSubTab === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>รายชื่อสมาชิก</button>
                <button onClick={() => setActiveSubTab('settings')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeSubTab === 'settings' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>ตั้งค่า All-Member</button>
            </div>

            {activeSubTab === 'list' ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                    {/* ส่วนสมัครสมาชิก */}
                    <Card className="p-5 border-blue-50 shadow-sm">
                        <h3 className="font-bold mb-4 flex items-center gap-2 text-blue-900"><UserPlus size={18}/> สมัครสมาชิกใหม่</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input label="ชื่อ-นามสกุล" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} placeholder="ระบุชื่อลูกค้า..." />
                            <Input label="เบอร์โทรศัพท์" value={newMember.phone} onChange={e => setNewMember({...newMember, phone: e.target.value})} placeholder="08xxxxxxxx" />
                        </div>
                        <Button onClick={handleAddMember} className="w-full mt-2 py-3">ยืนยันการสมัคร</Button>
                    </Card>

                    {/* ช่องค้นหาด่วน */}
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="ค้นหาชื่อหรือเบอร์โทร..." 
                            className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-100"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    </div>

                    {/* รายชื่อสมาชิก */}
                    <div className="space-y-2">
                        {filteredCustomers.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 text-sm italic">ไม่พบข้อมูลสมาชิก</div>
                        ) : (
                            filteredCustomers.map(c => (
                                <div key={c.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center shadow-sm hover:border-blue-200 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold shadow-inner">
                                            {c.name[0]}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800">{c.name}</p>
                                            <p className="text-xs text-gray-400 font-mono">{c.phone}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-blue-600 font-black text-lg">{c.points.toLocaleString()}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Points</p>
                                        </div>
                                        {/* ปุ่มลบสมาชิก */}
                                        <button 
                                            onClick={() => handleDeleteMember(c.id, c.name)}
                                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-90"
                                            title="ลบสมาชิก"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ) : (
                /* ส่วนตั้งค่า (เหมือนเดิม) */
                <Card className="p-6 animate-in fade-in duration-300">
                    <h3 className="font-bold mb-6 flex items-center gap-2 text-gray-800"><Settings size={18}/> ตั้งค่าระบบแต้ม</h3>
                    <div className="space-y-5">
                        <Input label="ยอดซื้อกี่บาท ได้ 1 แต้ม?" type="number" value={settings.bahtPerPoint} onChange={e => setSettings({...settings, bahtPerPoint: Number(e.target.value)})} />
                        <Input label="อายุของแต้ม (วัน) [0 = ไม่มีวันหมดอายุ]" type="number" value={settings.pointExpiryDays} onChange={e => setSettings({...settings, pointExpiryDays: Number(e.target.value)})} />
                        
                    </div>
                </Card>
            )}
        </div>
    );
}