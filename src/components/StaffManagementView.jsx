import React, { useState } from 'react';
import { UserPlus, Shield, Key, Trash2, Mail, Users, Edit3, Lock, X, CheckCircle } from 'lucide-react';
import { Button, Input, Card } from './UIComponents';

// --- 1. นำเข้า updateDoc เพิ่มเติมเพื่อใช้ในการแก้ไข ---
import { db } from '../firebase';
import { collection, addDoc, doc, deleteDoc, updateDoc } from "firebase/firestore";

export default function StaffManagementView({ users, setUsers, currentUser }) {
    const [newStaff, setNewStaff] = useState({ name: '', username: '', password: '', role: 'STAFF' });
    const [editingStaffId, setEditingStaffId] = useState(null); // 🟢 เก็บ ID พนักงานที่กำลังแก้ไข
    
    // --- 🟢 States สำหรับระบบยืนยันตัวตนเจ้าของ ---
    const [isReauthorizing, setIsReauthorizing] = useState(false);
    const [ownerPasswordConfirm, setOwnerPasswordConfirm] = useState('');
    const [pendingEditStaff, setPendingEditStaff] = useState(null);

    // --- 🟢 2. ฟังก์ชันเริ่มกระบวนการแก้ไข (เปิดหน้าต่างใส่รหัส) ---
    const startEditProcess = (staff) => {
        setPendingEditStaff(staff);
        setIsReauthorizing(true);
        setOwnerPasswordConfirm('');
    };

    // --- 🟢 3. ฟังก์ชันตรวจสอบรหัสเจ้าของร้าน ---
    const handleVerifyOwner = () => {
        if (ownerPasswordConfirm === currentUser.password) {
            // ถ้ารหัสถูกต้อง ให้ดึงข้อมูลพนักงานขึ้นไปที่ฟอร์มด้านบน
            setEditingStaffId(pendingEditStaff.id);
            setNewStaff({ 
                name: pendingEditStaff.name, 
                username: pendingEditStaff.username, 
                password: pendingEditStaff.password, 
                role: pendingEditStaff.role 
            });
            setIsReauthorizing(false);
            setPendingEditStaff(null);
            window.scrollTo({ top: 0, behavior: 'smooth' }); // เลื่อนจอขึ้นไปที่ฟอร์ม
        } else {
            alert('❌ รหัสผ่านเจ้าของร้านไม่ถูกต้อง!');
        }
    };

    // --- 4. ฟังก์ชันบันทึกข้อมูล (ทั้งเพิ่มใหม่และแก้ไข) ---
    const handleSaveStaff = async () => {
        if (!newStaff.name || !newStaff.username || !newStaff.password) {
            return alert('⚠️ กรุณากรอกข้อมูลพนักงานให้ครบทุกช่อง');
        }

        try {
            if (editingStaffId) {
                // 🔵 กรณีแก้ไข (Update)
                const userRef = doc(db, "users", editingStaffId);
                await updateDoc(userRef, {
                    ...newStaff,
                    updatedAt: new Date().toISOString()
                });
                alert('✅ อัปเดตข้อมูลพนักงานเรียบร้อย');
                setEditingStaffId(null);
            } else {
                // ⚪ กรณีเพิ่มใหม่ (Create)
                const isDuplicate = users?.some(u => u.username === newStaff.username);
                if (isDuplicate) return alert('❌ ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว');

                await addDoc(collection(db, "users"), {
                    ...newStaff,
                    shopId: currentUser.shopId,
                    createdAt: new Date().toISOString()
                });
                alert('✅ เพิ่มพนักงานลงระบบ Cloud เรียบร้อย');
            }
            
            setNewStaff({ name: '', username: '', password: '', role: 'STAFF' });
        } catch (error) {
            alert('❌ เกิดข้อผิดพลาด: ' + error.message);
        }
    };

    const handleDeleteStaff = async (id, staffName) => {
        if (staffName === (currentUser?.name || '')) return alert('❌ คุณไม่สามารถลบตัวเองได้');
        if (window.confirm(`ยืนยันการลบพนักงาน "${staffName || 'ไม่ระบุชื่อ'}"?`)) {
            try {
                await deleteDoc(doc(db, "users", id));
                alert('✅ ลบพนักงานเรียบร้อย');
            } catch (error) { alert('❌ เกิดข้อผิดพลาด: ' + error.message); }
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto animate-in fade-in duration-500 pb-24">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Staff Management</h1>

            {/* ส่วนฟอร์ม (ปรับหัวข้อตามโหมด Edit/Create) */}
            <Card className={`border-none shadow-xl !p-8 transition-all ${editingStaffId ? 'bg-orange-50/50 ring-2 ring-orange-200' : 'shadow-blue-100/50'}`}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl shadow-lg ${editingStaffId ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white shadow-blue-200'}`}>
                            {editingStaffId ? <Edit3 size={20} /> : <UserPlus size={20} />}
                        </div>
                        <h2 className="text-xl font-black text-slate-800">
                            {editingStaffId ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงานใหม่'}
                        </h2>
                    </div>
                    {editingStaffId && (
                        <button onClick={() => { setEditingStaffId(null); setNewStaff({ name: '', username: '', password: '', role: 'STAFF' }); }} className="text-xs font-bold text-slate-400 hover:text-red-500 flex items-center gap-1">
                            <X size={14}/> ยกเลิกการแก้ไข
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="ชื่อ-นามสกุล" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} />
                    <Input label="ชื่อผู้ใช้ (Username)" value={newStaff.username} onChange={e => setNewStaff({...newStaff, username: e.target.value})} icon={Mail} />
                    <Input label="รหัสผ่าน" type="text" value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} icon={Key} />
                    
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ตำแหน่ง</label>
                        <select className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-4 text-sm font-bold outline-none" value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})}>
                            <option value="STAFF">Staff (พนักงานทั่วไป)</option>
                            <option value="OWNER">Owner (เจ้าของร้าน)</option>
                        </select>
                    </div>

                    <Button onClick={handleSaveStaff} className={`md:col-span-full mt-4 py-5 rounded-2xl text-lg font-black shadow-xl transition-all ${editingStaffId ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-100' : 'bg-blue-600 shadow-blue-200'}`}>
                        {editingStaffId ? <><CheckCircle size={20} className="mr-2"/> บันทึกการเปลี่ยนแปลง</> : <><UserPlus size={20} className="mr-2"/> บันทึกพนักงานลง Cloud</>}
                    </Button>
                </div>
            </Card>

            {/* รายชื่อพนักงาน */}
            <div className="grid gap-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">พนักงานทั้งหมด ({users?.length || 0})</h3>
                {users?.map(staff => (
                    <div key={staff.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${staff.role === 'OWNER' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                {(staff.name || '?')[0]}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-black text-slate-800">{staff.name}</p>
                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full text-white ${staff.role === 'OWNER' ? 'bg-purple-600' : 'bg-blue-600'}`}>{staff.role}</span>
                                </div>
                                <p className="text-xs text-slate-400 font-bold">User: {staff.username}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {staff.name !== (currentUser?.name || '') && (
                                <>
                                    <button onClick={() => startEditProcess(staff)} className="p-3 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                        <Edit3 size={20} />
                                    </button>
                                    <button onClick={() => handleDeleteStaff(staff.id, staff.name)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                        <Trash2 size={20} />
                                    </button>
                                </>
                            )}
                            {staff.name === (currentUser?.name || '') && <div className="p-2 text-slate-300"><Shield size={18} /></div>}
                        </div>
                    </div>
                ))}
            </div>

            {/* 🟢 Re-authentication Modal (หน้าต่างยืนยันรหัสเจ้าของ) */}
            {isReauthorizing && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <Card className="max-w-sm w-full p-8 shadow-2xl border-none animate-in zoom-in-95">
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-slate-100 text-slate-900 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                <Lock size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800">ยืนยันตัวตนเจ้าของร้าน</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase mt-1">กรุณาใส่รหัสผ่านเพื่อแก้ไขข้อมูล</p>
                            </div>
                            <Input 
                                type="password" 
                                placeholder="รหัสผ่านของคุณ" 
                                value={ownerPasswordConfirm} 
                                onChange={e => setOwnerPasswordConfirm(e.target.value)}
                                autoFocus
                            />
                            <div className="flex gap-3 pt-2">
                                <Button variant="secondary" onClick={() => setIsReauthorizing(false)} className="flex-1">ยกเลิก</Button>
                                <Button onClick={handleVerifyOwner} className="flex-1 font-black bg-slate-900 text-white">ตกลง</Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}