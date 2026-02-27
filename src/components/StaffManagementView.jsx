import React, { useState } from 'react';
import { UserPlus, Shield, Key, Trash2, Mail, Users, Edit3, Lock, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button, Input, Card } from './UIComponents';
import { db } from '../firebase';
import { collection, addDoc, doc, deleteDoc, updateDoc } from "firebase/firestore";

export default function StaffManagementView({ users, setUsers, currentUser }) {
    const [newStaff, setNewStaff] = useState({ name: '', username: '', password: '', role: 'STAFF' });
    const [editingStaffId, setEditingStaffId] = useState(null); 
    
    // --- 🟢 States สำหรับระบบยืนยันตัวตนเจ้าของ (ใช้ร่วมกันทั้ง Edit และ Delete) ---
    const [authAction, setAuthAction] = useState(null); // รูปแบบ: { type: 'edit' หรือ 'delete', staff: {} }
    const [ownerPasswordConfirm, setOwnerPasswordConfirm] = useState('');

    // --- 🟢 1. ฟังก์ชันเริ่มกระบวนการยืนยันตัวตน ---
    const startAuthProcess = (type, staff) => {
        // ป้องกันไม่ให้เจ้าของร้านลบตัวเอง
        if (type === 'delete' && staff.name === (currentUser?.name || '')) {
            return alert('❌ คุณไม่สามารถลบตัวเองได้');
        }
        
        setAuthAction({ type, staff });
        setOwnerPasswordConfirm('');
    };

    // --- 🟢 2. ฟังก์ชันตรวจสอบรหัสและทำรายการต่อ ---
    const handleAuthSubmit = async (e) => {
        if (e) e.preventDefault(); // กันฟอร์มเด้งรีเฟรช

        if (ownerPasswordConfirm === currentUser.password) {
            // ถ้ารหัสถูกต้อง ให้เช็คว่าทำรายการอะไรอยู่
            if (authAction.type === 'edit') {
                setEditingStaffId(authAction.staff.id);
                setNewStaff({ 
                    name: authAction.staff.name, 
                    username: authAction.staff.username, 
                    password: authAction.staff.password, 
                    role: authAction.staff.role 
                });
                setAuthAction(null);
                window.scrollTo({ top: 0, behavior: 'smooth' }); 
            } 
            else if (authAction.type === 'delete') {
                try {
                    await deleteDoc(doc(db, "users", authAction.staff.id));
                    alert('✅ ลบข้อมูลพนักงานเรียบร้อยแล้ว');
                    setAuthAction(null);
                } catch (error) { 
                    alert('❌ เกิดข้อผิดพลาดในการลบ: ' + error.message); 
                }
            }
        } else {
            alert('❌ รหัสผ่านเจ้าของร้านไม่ถูกต้อง!');
        }
    };

    const handleSaveStaff = async () => {
        if (newStaff.password.length !== 4) {
            return alert('⚠️ รหัสพนักงานต้องมี 4 หลักเท่านั้น');
        }

        try {
            if (editingStaffId) {
                const staffRef = doc(db, "users", editingStaffId);
                await updateDoc(staffRef, {
                    name: newStaff.name,
                    username: newStaff.username,
                    password: newStaff.password,
                    role: newStaff.role
                });
                alert('✅ อัปเดตข้อมูลพนักงานเรียบร้อย');
            } else {
                await addDoc(collection(db, "users"), {
                    ...newStaff,
                    shopId: currentUser.shopId,     
                    ownerEmail: currentUser.email, 
                    createdAt: new Date().toISOString()
                });
                alert('✅ เพิ่มพนักงานเรียบร้อย (รหัส 4 หลัก)');
            }
            
            setEditingStaffId(null);
            setNewStaff({ name: '', username: '', password: '', role: 'STAFF' });
        } catch (error) { 
            alert('❌ เกิดข้อผิดพลาด: ' + error.message); 
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
                        <select className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-400 transition-colors" value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})}>
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
                                    {/* 🔴 เรียกใช้ฟังก์ชันแบบส่งชนิดเข้าไป (edit) */}
                                    <button onClick={() => startAuthProcess('edit', staff)} className="p-3 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-xl transition-colors">
                                        <Edit3 size={20} />
                                    </button>
                                    {/* 🔴 เรียกใช้ฟังก์ชันแบบส่งชนิดเข้าไป (delete) */}
                                    <button onClick={() => startAuthProcess('delete', staff)} className="p-3 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors">
                                        <Trash2 size={20} />
                                    </button>
                                </>
                            )}
                            {staff.name === (currentUser?.name || '') && <div className="p-2 text-slate-300"><Shield size={18} /></div>}
                        </div>
                    </div>
                ))}
            </div>

            {/* 🔒 Re-authentication Modal (หน้าต่างยืนยันรหัสเจ้าของร้าน สำหรับ Edit และ Delete) */}
            {authAction && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <Card className="max-w-sm w-full p-8 shadow-2xl border-none animate-in zoom-in-95 rounded-[2.5rem] relative">
                        <button onClick={() => setAuthAction(null)} className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition-colors">
                            <X size={16} />
                        </button>
                        
                        <div className="text-center space-y-4">
                            {/* เปลี่ยนสีไอคอนตามการกระทำ (ฟ้า=แก้, แดง=ลบ) */}
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-inner ${authAction.type === 'delete' ? 'bg-red-100 text-red-500' : 'bg-blue-100 text-blue-600'}`}>
                                {authAction.type === 'delete' ? <AlertTriangle size={32} /> : <Lock size={32} />}
                            </div>
                            
                            <div>
                                <h3 className="text-xl font-black text-slate-800">
                                    {authAction.type === 'edit' ? 'ยืนยันเพื่อแก้ไขข้อมูล' : 'ยืนยันเพื่อลบพนักงาน'}
                                </h3>
                                <p className="text-sm text-slate-500 font-bold mt-2">
                                    พนักงาน: <span className="text-slate-800">{authAction.staff.name}</span>
                                </p>
                            </div>
                            
                            <form onSubmit={handleAuthSubmit} className="space-y-4 pt-4">
                                <input 
                                    type="password" 
                                    placeholder="ใส่รหัสผ่าน" 
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-center text-xl font-black tracking-widest outline-none focus:border-blue-500 transition-all"
                                    value={ownerPasswordConfirm} 
                                    onChange={e => setOwnerPasswordConfirm(e.target.value)}
                                    autoFocus
                                />
                                <div className="flex gap-3">
                                    <Button type="button" variant="secondary" onClick={() => setAuthAction(null)} className="flex-1 border-none bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold">ยกเลิก</Button>
                                    <Button type="submit" className={`flex-1 font-black text-white shadow-lg border-none ${authAction.type === 'delete' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}>
                                        ยืนยัน
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}