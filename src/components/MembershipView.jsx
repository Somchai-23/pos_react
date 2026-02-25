import React, { useState } from 'react';
// 🟢 จุดแก้ไขที่ 1: เพิ่ม Users เข้าไปในรายการ Import
import { UserPlus, Settings, Trash2, Search, Save, AlertCircle, Edit3, XCircle, Users } from 'lucide-react'; 
import { Card, Button, Input } from './UIComponents';
import { db } from '../firebase';
import { collection, addDoc, doc, deleteDoc, setDoc, updateDoc } from "firebase/firestore";

// 🟢 จุดแก้ไขที่ 2: เพิ่ม 'user' เข้ามาใน { ... } เพื่อให้ดึง shopId ได้
export default function MembershipView({ user, customers, settings, setSettings }) {
    const [newMember, setNewMember] = useState({ name: '', phone: '' });
    const [editingMemberId, setEditingMemberId] = useState(null); 
    const [activeSubTab, setActiveSubTab] = useState('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [tempSettings, setTempSettings] = useState({ ...settings });

    const startEdit = (customer) => {
        setEditingMemberId(customer.id);
        setNewMember({ name: customer.name, phone: customer.phone });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setEditingMemberId(null);
        setNewMember({ name: '', phone: '' });
    };

    const handleAddOrUpdateMember = async () => {
    if (!newMember.name || !newMember.phone) return alert('กรุณากรอกข้อมูลให้ครบ');
    if (newMember.phone.length !== 10) return alert('⚠️ กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก');

    const duplicate = customers.find(c => c.phone === newMember.phone);

    try {
        if (editingMemberId) {
            if (duplicate && duplicate.id !== editingMemberId) {
                return alert(`❌ ไม่สามารถใช้เบอร์นี้ได้: เบอร์นี้ถูกใช้งานโดยคุณ "${duplicate.name}" แล้ว`);
            }

            const memberRef = doc(db, "customers", editingMemberId);
            await updateDoc(memberRef, {
                name: newMember.name,
                phone: newMember.phone
            });
            alert('✅ อัปเดตข้อมูลสมาชิกเรียบร้อย');
        } else {
            if (duplicate) {
                return alert(`❌ เบอร์โทรนี้เป็นสมาชิกอยู่แล้ว (คุณ ${duplicate.name})`);
            }

            await addDoc(collection(db, "customers"), {
                name: newMember.name, 
                phone: newMember.phone, 
                shopId: user.shopId, // ✅ ตอนนี้โปรแกรมรู้จัก user แล้ว
                points: 0, 
                lastActivity: new Date().toISOString()
            });
            alert('✅ สมัครสมาชิกสำเร็จ');
        }
        cancelEdit();
    } catch (e) { 
        alert('❌ ไม่สามารถดำเนินการได้: ' + e.message); 
    }
    };

    const handleDeleteMember = async (id, name) => {
        if (window.confirm(`ยืนยันการลบสมาชิกคุณ "${name || 'ไม่ระบุชื่อ'}"?`)) {
            try {
                await deleteDoc(doc(db, "customers", id));
            } catch (e) { alert('❌ ลบไม่สำเร็จ: ' + e.message); }
        }
    };

    const handleSaveSettings = async () => {
        if (tempSettings.bahtPerPoint <= 0) return alert('⚠️ ยอดซื้อขั้นต่ำต้องมากกว่า 0 บาท');
        if (window.confirm('ยืนยันการเปลี่ยนเงื่อนไขการให้แต้มสมาชิก?')) {
            try {
                setSettings(tempSettings);
                // 🟢 จุดแก้ไขที่ 3: บันทึกแยกตามร้าน (user.shopId) ไม่ให้ทับร้านอื่น
                await setDoc(doc(db, "settings", user.shopId), {
                    ...tempSettings,
                    shopId: user.shopId
                });
                alert('🚀 อัปเดตระบบแต้มเรียบร้อยแล้ว');
            } catch (e) { alert('❌ บันทึกไม่สำเร็จ: ' + e.message); }
        }
    };

    const filteredCustomers = customers.filter(c => 
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (c.phone || '').includes(searchTerm)
    );

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-2xl mx-auto pb-24">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight text-center md:text-left uppercase">Member Center</h1>
            
            <div className="flex p-1 bg-gray-100 rounded-xl shadow-inner">
                <button onClick={() => setActiveSubTab('list')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeSubTab === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>รายชื่อสมาชิก</button>
                <button onClick={() => setActiveSubTab('settings')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeSubTab === 'settings' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>ตั้งค่าระบบแต้ม</button>
            </div>

            {activeSubTab === 'list' ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <Card className={`p-5 border-2 shadow-sm transition-all ${editingMemberId ? 'border-orange-200 bg-orange-50/30' : 'border-blue-50'}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className={`font-bold flex items-center gap-2 ${editingMemberId ? 'text-orange-700' : 'text-blue-900'}`}>
                                {editingMemberId ? <><Edit3 size={18}/> แก้ไขข้อมูลสมาชิก</> : <><UserPlus size={18}/> ลงทะเบียนสมาชิกใหม่</>}
                            </h3>
                            {editingMemberId && (
                                <button onClick={cancelEdit} className="text-xs font-bold text-orange-600 flex items-center gap-1 hover:underline">
                                    <XCircle size={14}/> ยกเลิกการแก้ไข
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input label="ชื่อ-นามสกุล" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} placeholder="ระบุชื่อลูกค้า" />
                            <Input 
                                label="เบอร์โทรศัพท์" 
                                value={newMember.phone} 
                                onChange={e => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    if (val.length <= 10) setNewMember({...newMember, phone: val});
                                }} 
                                placeholder="08xxxxxxxx" 
                            />
                        </div>
                        <Button 
                            onClick={handleAddOrUpdateMember} 
                            className={`w-full mt-4 py-4 font-black shadow-lg ${editingMemberId ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-100' : 'shadow-blue-100'}`}
                        >
                            {editingMemberId ? 'บันทึกการเปลี่ยนแปลง' : 'ยืนยันการสมัครสมาชิก'}
                        </Button>
                    </Card>

                    <div className="relative">
                        <input type="text" placeholder="ค้นหาชื่อหรือเบอร์โทร" className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        <Search className="absolute left-4 top-4 text-slate-300" size={20} />
                    </div>

                    <div className="space-y-2">
                        {filteredCustomers.length === 0 ? (
                            <div className="text-center py-10 text-slate-300 text-xs italic font-bold uppercase tracking-widest">
                                <Users size={48} className="mx-auto mb-2 opacity-20" />
                                No Members Found
                            </div>
                        ) : (
                            filteredCustomers.map(c => (
                                <div key={c.id} className="bg-white p-4 rounded-3xl border border-slate-100 flex justify-between items-center shadow-sm group hover:border-blue-200 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black">{(c.name || '?')[0]}</div>
                                        <div>
                                            <p className="font-black text-slate-800">{c.name || 'ไม่ระบุชื่อ'}</p>
                                            <p className="text-xs text-slate-400 font-bold">{c.phone}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-right mr-2">
                                            <p className="text-blue-600 font-black text-lg">{(c.points || 0).toLocaleString()}</p>
                                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Points</p>
                                        </div>
                                        <button onClick={() => startEdit(c)} className="p-2 text-slate-300 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100">
                                            <Edit3 size={18} />
                                        </button>
                                        <button onClick={() => handleDeleteMember(c.id, c.name)} className="p-2 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <Card className="p-6 border-none shadow-xl shadow-blue-50">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-slate-900 text-white rounded-xl"><Settings size={20}/></div>
                            <div>
                                <h3 className="font-black text-slate-800">ตั้งค่าระบบแต้ม</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Point Calculation Rules</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-4">
                                <Input label="ยอดซื้อกี่บาท ได้ 1 แต้ม?" type="number" value={tempSettings.bahtPerPoint} onChange={e => setTempSettings({...tempSettings, bahtPerPoint: Number(e.target.value)})} />
                                <Input label="อายุของแต้ม (วัน) [0 = ไม่มีวันหมดอายุ]" type="number" value={tempSettings.pointExpiryDays} onChange={e => setTempSettings({...tempSettings, pointExpiryDays: Number(e.target.value)})} />
                            </div>
                            <div className="pt-4 border-t border-slate-100">
                                <Button onClick={handleSaveSettings} className="w-full py-5 rounded-2xl text-base font-black shadow-lg shadow-blue-100 flex items-center justify-center gap-2"><Save size={20} /> บันทึกการตั้งค่าใหม่</Button>
                                <button onClick={() => setTempSettings({...settings})} className="w-full mt-3 text-xs font-bold text-slate-400 hover:text-slate-600 transition-all">ล้างค่าที่แก้ไข</button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}