import React, { useState } from 'react';
import { UserPlus, Settings, Trash2, Search } from 'lucide-react';
import { Card, Button, Input } from './UIComponents';

// --- 1. นำเข้าเครื่องมือจาก Firebase ---
import { db } from '../firebase';
import { collection, addDoc, doc, deleteDoc } from "firebase/firestore";

export default function MembershipView({ customers, settings, setSettings }) {
    const [newMember, setNewMember] = useState({ name: '', phone: '' });
    const [activeSubTab, setActiveSubTab] = useState('list');
    const [searchTerm, setSearchTerm] = useState('');

    // --- 2. ฟังก์ชันสมัครสมาชิกใหม่ลง Cloud ---
    const handleAddMember = async () => {
        if (!newMember.name || !newMember.phone) return alert('กรุณากรอกข้อมูลให้ครบ');
        
        // เช็คเบอร์ซ้ำในข้อมูลที่โหลดมาจาก Cloud
        if (customers.find(c => c.phone === newMember.phone)) {
            return alert('❌ เบอร์โทรนี้เป็นสมาชิกอยู่ในระบบ Cloud แล้ว');
        }
        
        try {
            await addDoc(collection(db, "customers"), {
                name: newMember.name,
                phone: newMember.phone,
                points: 0,
                lastActivity: new Date().toISOString()
            });
            
            setNewMember({ name: '', phone: '' });
            alert('✅ สมัครสมาชิกบนคลาวด์สำเร็จ');
        } catch (e) {
            alert('❌ เกิดข้อผิดพลาด: ' + e.message);
        }
    };

    // --- 3. ฟังก์ชันลบสมาชิกจาก Cloud ---
    const handleDeleteMember = async (id, name) => {
        if (window.confirm(`คุณแน่ใจหรือไม่ที่จะลบสมาชิกคุณ "${name || 'ไม่ระบุชื่อ'}"? \n(ข้อมูลบนคลาวด์จะหายไปทันที)`)) {
            try {
                await deleteDoc(doc(db, "customers", id));
                alert('✅ ลบข้อมูลสมาชิกเรียบร้อย');
            } catch (e) {
                alert('❌ ไม่สามารถลบได้: ' + e.message);
            }
        }
    };

    // --- 4. แก้จุดพัง (Fix Filter Crash) ---
    const filteredCustomers = customers.filter(c => {
        // ใช้ (c.name || '') เพื่อป้องกัน Error กรณีชื่อใน Firebase เป็นค่าว่าง
        const nameText = (c.name || '').toLowerCase();
        const phoneText = (c.phone || '');
        const search = searchTerm.toLowerCase();
        
        return nameText.includes(search) || phoneText.includes(search);
    });

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-2xl mx-auto pb-24">
            <h1 className="text-3xl font-black text-slate-800">ระบบสมาชิก (Cloud)</h1>
            
            <div className="flex p-1 bg-gray-100 rounded-xl shadow-inner">
                <button onClick={() => setActiveSubTab('list')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeSubTab === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>รายชื่อสมาชิก</button>
                <button onClick={() => setActiveSubTab('settings')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeSubTab === 'settings' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>ตั้งค่าระบบแต้ม</button>
            </div>

            {activeSubTab === 'list' ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <Card className="p-5 border-blue-50 shadow-sm">
                        <h3 className="font-bold mb-4 flex items-center gap-2 text-blue-900"><UserPlus size={18}/> สมัครสมาชิกใหม่</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input label="ชื่อ-นามสกุล" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} placeholder="ระบุชื่อลูกค้า..." />
                            <Input label="เบอร์โทรศัพท์" value={newMember.phone} onChange={e => setNewMember({...newMember, phone: e.target.value})} placeholder="08xxxxxxxx" />
                        </div>
                        <Button onClick={handleAddMember} className="w-full mt-2 py-3">ยืนยันการสมัครลง Cloud</Button>
                    </Card>

                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="ค้นหาชื่อหรือเบอร์โทร..." 
                            className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    </div>

                    <div className="space-y-2">
                        {filteredCustomers.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 text-sm italic">ไม่พบข้อมูลสมาชิกบนคลาวด์</div>
                        ) : (
                            filteredCustomers.map(c => (
                                <div key={c.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center shadow-sm hover:border-blue-200 transition-all group">
                                    <div className="flex items-center gap-4">
                                        {/* ป้องกัน c.name[0] พังถ้าชื่อว่าง */}
                                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold shadow-inner">
                                            {(c.name || '?')[0]}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800">{c.name || 'ไม่ระบุชื่อ'}</p>
                                            <p className="text-xs text-gray-400 font-mono">{c.phone || '-'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-blue-600 font-black text-lg">{(c.points || 0).toLocaleString()}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Points</p>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteMember(c.id, c.name)}
                                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
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