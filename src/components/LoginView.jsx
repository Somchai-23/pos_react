import React, { useState } from 'react';
import { Lock, User, Key, Mail, Phone, Store, UserPlus, LogIn, Check, X, AlertCircle, ShieldUser } from 'lucide-react';
import { Card, Button, Input } from './UIComponents';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc } from "firebase/firestore"; // 🟢 เพิ่ม addDoc

export default function LoginView({ onLogin }) {
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [isStaffMode, setIsStaffMode] = useState(false);
    const [formData, setFormData] = useState({ 
        shopName: '', name: '', email: '', phone: '', password: '',
        username: '', ownerEmail: '' 
    });
    const [loading, setLoading] = useState(false);

    const validation = {
        length: formData.password.length >= 8,
        hasUpper: /[A-Z]/.test(formData.password),
        hasLower: /[a-z]/.test(formData.password),
        hasNumber: /[0-9]/.test(formData.password),
    };
    const isPasswordValid = Object.values(validation).every(v => v === true);

    const resetForm = () => {
        setFormData({ shopName: '', name: '', email: '', phone: '', password: '', username: '', ownerEmail: '' });
    };

    // --- 🔵 1. ฟังก์ชันเข้าสู่ระบบ ---
    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            let q;
            if (isStaffMode) {
                q = query(collection(db, "users"), 
                    where("username", "==", formData.username),
                    where("ownerEmail", "==", formData.ownerEmail));
            } else {
                q = query(collection(db, "users"), where("email", "==", formData.email));
            }

            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                alert(isStaffMode ? '❌ ไม่พบพนักงานในร้านนี้' : '❌ ไม่พบอีเมลนี้ในระบบ');
            } else {
                const userData = querySnapshot.docs[0].data();
                if (userData.password === formData.password) {
                    onLogin({ ...userData, id: querySnapshot.docs[0].id });
                } else { alert('❌ รหัสผ่านไม่ถูกต้อง'); }
            }
        } catch (error) { alert('❌ Error: ' + error.message); }
        finally { setLoading(false); }
    };

    // --- 🟢 2. ฟังก์ชันสมัครร้านใหม่ (เพิ่มเข้ามาใหม่) ---
    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // เช็คอีเมลซ้ำก่อน
            const q = query(collection(db, "users"), where("email", "==", formData.email));
            const checkSnap = await getDocs(q);
            if (!checkSnap.empty) {
                setLoading(false);
                return alert('❌ อีเมลนี้ถูกใช้งานไปแล้ว');
            }

            const newShopId = "SHOP-" + Date.now();
            const newUser = {
                shopName: formData.shopName,
                name: formData.name,
                email: formData.email,
                username: formData.email, 
                phone: formData.phone,
                password: formData.password,
                role: 'OWNER',
                shopId: newShopId,
                createdAt: new Date().toISOString()
            };

            const docRef = await addDoc(collection(db, "users"), newUser);
            alert(`🚀 ร้าน "${formData.shopName}" สร้างสำเร็จ!`);
            
            // 🟢 ส่งข้อมูลเข้า App ทันทีเพื่อกัน Error: user is not defined
            onLogin({ ...newUser, id: docRef.id }); 
            
        } catch (error) { alert('❌ สมัครไม่สำเร็จ: ' + error.message); }
        finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <Card className="max-w-md w-full !p-8 shadow-2xl border-none">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4">
                        {isRegisterMode ? <Store size={32} /> : (isStaffMode ? <User size={32} /> : <Lock size={32} />)}
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                        {isRegisterMode ? 'Open New Shop' : (isStaffMode ? 'Staff PIN Login' : 'Owner Login')}
                    </h1>
                </div>

                {/* 🟢 แก้ไขตรงนี้: สลับฟังก์ชันตามโหมด */}
                <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-4">
                    {isRegisterMode ? (
                        <>
                            <Input label="ชื่อร้านค้า" icon={Store} placeholder="ตั้งชื่อร้านของคุณ" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})} required />
                            <Input label="ชื่อเจ้าของร้าน" icon={User} placeholder="ชื่อ-นามสกุล" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                            <Input label="อีเมล" type="email" icon={Mail} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                            <Input label="เบอร์โทรศัพท์" icon={Phone} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})} required />
                        </>
                    ) : (
                        <>
                            {isStaffMode ? (
                                <>
                                    <Input label="อีเมลเจ้าของร้าน" icon={Mail} value={formData.ownerEmail} onChange={e => setFormData({...formData, ownerEmail: e.target.value})} autoComplete="off" required />
                                    <Input label="ชื่อพนักงาน" icon={User} value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} autoComplete="off" required />
                                </>
                            ) : (
                                <Input label="อีเมล" type="email" icon={Mail} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                            )}
                        </>
                    )}

                    <Input 
                        label={isStaffMode ? "รหัส PIN 4 หลัก" : "รหัสผ่าน"} 
                        type="password" 
                        icon={Key} 
                        maxLength={isStaffMode ? 4 : 20}
                        value={formData.password} 
                        onChange={e => setFormData({...formData, password: isStaffMode ? e.target.value.replace(/\D/g, '').slice(0, 4) : e.target.value})} 
                        autoComplete="new-password"
                        inputMode={isStaffMode ? "numeric" : "text"}
                        required 
                    />

                    {isRegisterMode && (
                        <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
                            <RequirementItem met={validation.length} text="8 ตัวอักษรขึ้นไป" />
                            <RequirementItem met={validation.hasUpper} text="มีตัวพิมพ์ใหญ่ (A-Z)" />
                            <RequirementItem met={validation.hasLower} text="มีตัวพิมพ์เล็ก (a-z)" />
                            <RequirementItem met={validation.hasNumber} text="มีตัวเลข (0-9)" />
                        </div>
                    )}

                    <Button type="submit" disabled={loading || (isRegisterMode && !isPasswordValid)} className="w-full py-4 font-black shadow-lg">
                        {loading ? 'กำลังประมวลผล...' : (isRegisterMode ? 'สร้างร้านค้าทันที' : 'เข้าสู่ระบบ')}
                    </Button>
                </form>

                <div className="mt-6 flex flex-col gap-3 text-center border-t pt-4 border-slate-100">
                    {!isRegisterMode && (
                        <button type="button" onClick={() => { setIsStaffMode(!isStaffMode); resetForm(); }} className="text-sm font-bold text-slate-500 hover:text-blue-600">
                            {isStaffMode ? 'กลับไปล็อกอินร้าน' : 'พนักงานเข้าสู่ระบบที่นี่'}
                        </button>
                    )}
                    <button type="button" onClick={() => { setIsRegisterMode(!isRegisterMode); setIsStaffMode(false); resetForm(); }} className="text-sm font-bold text-blue-600 hover:underline">
                        {isRegisterMode ? 'มีบัญชีแล้ว? เข้าสู่ระบบ' : 'สมัครเปิดร้านใหม่ที่นี่'}
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