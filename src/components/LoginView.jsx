import React, { useState } from 'react';
import { Lock, User, Key, Mail, Phone, Store, UserPlus, LogIn, Check, X, AlertCircle, ShieldUser } from 'lucide-react';
import { Card, Button, Input } from './UIComponents';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";

export default function LoginView({ onLogin }) {
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [isStaffMode, setIsStaffMode] = useState(false); // 🟢 เพิ่ม State สลับโหมดพนักงาน
    const [formData, setFormData] = useState({ 
        shopName: '', name: '', email: '', phone: '', password: '',
        username: '', ownerEmail: '' // 🟢 เพิ่มฟิลด์สำหรับพนักงาน
    });
    const [loading, setLoading] = useState(false);

    const validation = {
        length: formData.password.length >= 8,
        hasUpper: /[A-Z]/.test(formData.password),
        hasLower: /[a-z]/.test(formData.password),
        hasNumber: /[0-9]/.test(formData.password),
    };
    const isPasswordValid = Object.values(validation).every(v => v === true);

    // --- 🔵 ฟังก์ชันเข้าสู่ระบบ (รองรับทั้ง Owner และ Staff) ---
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let q;
            if (isStaffMode) {
                // 🟢 ค้นหาพนักงาน: ต้องตรงทั้ง Username และ อีเมลของเจ้าของร้าน (Namespace)
                q = query(
                    collection(db, "users"), 
                    where("username", "==", formData.username),
                    where("ownerEmail", "==", formData.ownerEmail)
                );
            } else {
                // 🔵 ค้นหาเจ้าของร้าน: ใช้ Email ปกติ
                q = query(collection(db, "users"), where("email", "==", formData.email));
            }

            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                alert(isStaffMode ? '❌ ไม่พบข้อมูลพนักงานในร้านที่ระบุ' : '❌ ไม่พบอีเมลนี้ในระบบ');
            } else {
                const userData = querySnapshot.docs[0].data();
                if (userData.password === formData.password) {
                    onLogin({ ...userData, id: querySnapshot.docs[0].id });
                } else {
                    alert('❌ รหัสผ่านไม่ถูกต้อง');
                }
            }
        } catch (error) {
            alert('❌ เกิดข้อผิดพลาด: ' + error.message);
        } finally { setLoading(false); }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!isPasswordValid) return alert('⚠️ กรุณาตั้งรหัสผ่านให้ครบตามเงื่อนไข');
        if (formData.phone.length !== 10) return alert('⚠️ กรุณาระบุเบอร์โทรศัพท์ 10 หลัก');

        setLoading(true);
        try {
            const q = query(collection(db, "users"), where("email", "==", formData.email));
            const checkSnap = await getDocs(q);
            if (!checkSnap.empty) return alert('❌ อีเมลนี้ถูกใช้งานแล้ว');

            const newShopId = "SHOP-" + Date.now();
            const newUser = {
                shopName: formData.shopName,
                name: formData.name,
                email: formData.email,
                username: formData.email, // เจ้าของร้านใช้ Email เป็น Username โดยปริยาย
                phone: formData.phone,
                password: formData.password,
                role: 'OWNER',
                shopId: newShopId,
                createdAt: new Date().toISOString()
            };

            await addDoc(collection(db, "users"), newUser);
            alert(`🚀 ร้าน "${formData.shopName}" สร้างสำเร็จแล้ว!`);
            setIsRegisterMode(false);
        } catch (error) {
            alert('❌ สมัครไม่สำเร็จ: ' + error.message);
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <Card className="max-w-md w-full !p-8 shadow-2xl border-none">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4">
                        {isRegisterMode ? <Store size={32} /> : (isStaffMode ? <User size={32} /> : <Lock size={32} />)}
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                        {isRegisterMode ? 'Open New Shop' : (isStaffMode ? 'Staff Login' : 'Owner Login')}
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                        {isStaffMode ? 'เข้าใช้งานในฐานะพนักงาน' : 'เข้าใช้งานในฐานะเจ้าของร้าน'}
                    </p>
                </div>

                <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-4">
                    {isRegisterMode ? (
                        <>
                            <Input label="ชื่อร้านค้า" icon={Store} placeholder="ตั้งชื่อร้านของคุณ" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})} required />
                            <Input label="ชื่อเจ้าของร้าน" icon={User} placeholder="ชื่อ-นามสกุล" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                            <Input label="อีเมล (Email)" type="email" icon={Mail} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                            <Input label="เบอร์โทรศัพท์" icon={Phone} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})} required />
                        </>
                    ) : (
                        <>
                            {isStaffMode ? (
                                <>
                                    <Input label="อีเมลเจ้าของร้าน" icon={Mail} placeholder="email@owner.com" value={formData.ownerEmail} onChange={e => setFormData({...formData, ownerEmail: e.target.value})} required />
                                    <Input label="ชื่อผู้ใช้พนักงาน (Username)" icon={User} placeholder="เช่น ddd" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required />
                                </>
                            ) : (
                                <Input label="อีเมลเจ้าของร้าน" type="email" icon={Mail} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                            )}
                        </>
                    )}

                    <Input label="รหัสผ่าน" type="password" icon={Key} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />

                    {isRegisterMode && (
                        <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><AlertCircle size={12}/> ข้อกำหนดรหัสผ่าน:</p>
                            <RequirementItem met={validation.length} text="8 ตัวอักษรขึ้นไป" />
                            <RequirementItem met={validation.hasUpper} text="มีตัวพิมพ์ใหญ่ (A-Z)" />
                            <RequirementItem met={validation.hasLower} text="มีตัวพิมพ์เล็ก (a-z)" />
                            <RequirementItem met={validation.hasNumber} text="มีตัวเลข (0-9)" />
                        </div>
                    )}

                    <Button type="submit" disabled={loading || (isRegisterMode && !isPasswordValid)} className="w-full py-4 font-black shadow-lg">
                        {loading ? 'กำลังประมวลผล...' : (isRegisterMode ? 'สร้างร้านและบัญชีผู้ใช้' : 'เข้าสู่ระบบ')}
                    </Button>
                </form>

                <div className="mt-6 flex flex-col gap-3 text-center border-t pt-6 border-slate-100">
                    {!isRegisterMode && (
                        <button onClick={() => setIsStaffMode(!isStaffMode)} className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">
                            {isStaffMode ? 'สลับไปล็อกอินเจ้าของร้าน' : 'พนักงาน? เข้าสู่ระบบที่นี่'}
                        </button>
                    )}
                    <button onClick={() => { setIsRegisterMode(!isRegisterMode); setIsStaffMode(false); }} className="text-sm font-bold text-blue-600 hover:underline">
                        {isRegisterMode ? 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ' : 'ต้องการเปิดร้านใหม่? สมัครที่นี่'}
                    </button>
                </div>
            </Card>
        </div>
    );
}

function RequirementItem({ met, text }) {
    return (
        <li className={`flex items-center gap-2 text-[11px] font-bold ${met ? 'text-green-600' : 'text-slate-400'}`}>
            {met ? <Check size={14} className="stroke-[3px]"/> : <X size={14} className="text-slate-300 stroke-[3px]"/>}
            {text}
        </li>
    );
}