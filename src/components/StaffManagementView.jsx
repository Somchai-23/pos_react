import React, { useState } from 'react';
import { UserPlus, Shield, Key, Trash2, Mail, Users } from 'lucide-react';
import { Button, Input, Card } from './UIComponents';

// --- 1. นำเข้าฐานข้อมูลจากไฟล์ที่เราสร้างไว้ ---
import { db } from '../firebase';
import { collection, addDoc, doc, deleteDoc } from "firebase/firestore";

export default function StaffManagementView({ users, setUsers, currentUser }) {
    const [newStaff, setNewStaff] = useState({ name: '', username: '', password: '', role: 'STAFF' });

    // --- 2. ฟังก์ชันเพิ่มพนักงานใหม่ลง Cloud ---
    const handleAddStaff = async () => {
        if (!newStaff.name || !newStaff.username || !newStaff.password) {
            return alert('⚠️ กรุณากรอกข้อมูลพนักงานให้ครบทุกช่อง');
        }

        // ตรวจสอบชื่อผู้ใช้ซ้ำ (กันเหนียว)
        const isDuplicate = users?.some(u => u.username === newStaff.username);
        if (isDuplicate) return alert('❌ ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว');

        try {
            await addDoc(collection(db, "users"), {
                ...newStaff,
                createdAt: new Date().toISOString()
            });
            
            setNewStaff({ name: '', username: '', password: '', role: 'STAFF' });
            alert('✅ เพิ่มพนักงานลงระบบ Cloud เรียบร้อย');
        } catch (error) {
            alert('❌ ไม่สามารถเพิ่มพนักงานได้: ' + error.message);
        }
    };

    // --- 3. ฟังก์ชันลบพนักงานออกจาก Cloud ---
    const handleDeleteStaff = async (id, staffName) => {
        // ป้องกันการลบตัวเอง (ตรวจสอบค่าว่างด้วย)
        if (staffName === (currentUser?.name || '')) return alert('❌ คุณไม่สามารถลบตัวเองได้');
        
        if (window.confirm(`ยืนยันการลบพนักงาน "${staffName || 'ไม่ระบุชื่อ'}" ออกจากระบบ Cloud?`)) {
            try {
                await deleteDoc(doc(db, "users", id));
                alert('✅ ลบพนักงานเรียบร้อย');
            } catch (error) {
                alert('❌ เกิดข้อผิดพลาด: ' + error.message);
            }
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">จัดการพนักงาน</h1>
                <p className="text-slate-400 text-sm font-bold mt-1 uppercase tracking-wider">Cloud Staff Synchronization</p>
            </div>

            {/* ส่วนเพิ่มพนักงานใหม่ */}
            <Card className="border-none shadow-xl shadow-blue-100/50 !p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200">
                        <UserPlus size={20} />
                    </div>
                    <h2 className="text-xl font-black text-slate-800">เพิ่มพนักงานใหม่</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="ชื่อ-นามสกุล" placeholder="ชื่อจริงพนักงาน" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} />
                    <Input label="ชื่อผู้ใช้ (Username)" placeholder="ใช้สำหรับล็อกอิน" value={newStaff.username} onChange={e => setNewStaff({...newStaff, username: e.target.value})} icon={Mail} />
                    <Input label="รหัสผ่าน" type="password" placeholder="รหัสผ่าน 4 หลักขึ้นไป" value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} icon={Key} />
                    
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ตำแหน่ง / สิทธิ์</label>
                        <select className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-blue-50 focus:border-blue-200 outline-none transition-all" value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})}>
                            <option value="STAFF">Staff (พนักงานทั่วไป)</option>
                            <option value="OWNER">Owner (เจ้าของร้าน/ผู้จัดการ)</option>
                        </select>
                    </div>

                    <Button onClick={handleAddStaff} className="md:col-span-full mt-4 py-5 rounded-2xl text-lg font-black shadow-xl shadow-blue-200 active:scale-95 transition-all">
                        <UserPlus size={20} className="mr-2" /> บันทึกพนักงานลง Cloud
                    </Button>
                </div>
            </Card>

            {/* รายชื่อพนักงานในระบบ Cloud */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2 ml-1">
                    <Users size={18} className="text-slate-400" />
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">พนักงานในระบบ ({users?.length || 0})</h3>
                </div>

                <div className="grid gap-3">
                    {users?.map(staff => (
                        <div key={staff.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between hover:border-blue-200 transition-all group">
                            <div className="flex items-center gap-4">
                                {/* แก้ไข: ป้องกัน staff.name[0] พังถ้าชื่อเป็นค่าว่าง */}
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${staff.role === 'OWNER' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {(staff.name || '?')[0]}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-black text-slate-800">{staff.name || 'ไม่ระบุชื่อ'}</p>
                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${staff.role === 'OWNER' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'}`}>
                                            {staff.role || 'STAFF'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 font-bold">User: {staff.username || '-'}</p>
                                </div>
                            </div>
                            
                            {/* แสดงไอคอนล็อกสำหรับพนักงาน และปุ่มลบสำหรับเจ้าของ */}
                            {staff.name === (currentUser?.name || '') ? (
                                <div className="p-2 bg-slate-50 text-slate-300 rounded-xl"><Shield size={18} /></div>
                            ) : (
                                <button onClick={() => handleDeleteStaff(staff.id, staff.name)} className="p-3 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                    <Trash2 size={20} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}