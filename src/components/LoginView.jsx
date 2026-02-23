import React, { useState } from 'react';
import { Lock, User, Key, Mail, Phone, Store, UserPlus, LogIn, Check, X, AlertCircle } from 'lucide-react';
import { Card, Button, Input } from './UIComponents';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";

export default function LoginView({ onLogin }) {
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [formData, setFormData] = useState({ 
        shopName: '', 
        name: '', 
        email: '', 
        phone: '', 
        password: '' 
    });
    const [loading, setLoading] = useState(false);

    // 🟢 ระบบตรวจสอบเงื่อนไขรหัสผ่าน (8 ตัว, พิมพ์ใหญ่, พิมพ์เล็ก, ตัวเลข)
    const validation = {
        length: formData.password.length >= 8,
        hasUpper: /[A-Z]/.test(formData.password),
        hasLower: /[a-z]/.test(formData.password),
        hasNumber: /[0-9]/.test(formData.password),
    };
    const isPasswordValid = Object.values(validation).every(v => v === true);

    // --- 🔵 ฟังก์ชันเข้าสู่ระบบ (ใช้ Email) ---
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const q = query(collection(db, "users"), where("email", "==", formData.email));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                alert('❌ ไม่พบอีเมลนี้ในระบบ');
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

    // --- 🟢 ฟังก์ชันสมัครสมาชิกเปิดร้านใหม่ ---
    const handleRegister = async (e) => {
        e.preventDefault();
        
        if (!isPasswordValid) return alert('⚠️ กรุณาตั้งรหัสผ่านให้ครบตามเงื่อนไข');
        if (formData.phone.length !== 10) return alert('⚠️ กรุณาระบุเบอร์โทรศัพท์ 10 หลัก');

        setLoading(true);
        try {
            // ตรวจสอบอีเมลซ้ำในระบบ
            const q = query(collection(db, "users"), where("email", "==", formData.email));
            const checkSnap = await getDocs(q);
            if (!checkSnap.empty) return alert('❌ อีเมลนี้ถูกใช้งานแล้ว');

            // 1. สร้าง Shop ID ใหม่สำหรับร้านนี้โดยเฉพาะ
            const newShopId = "SHOP-" + Date.now();

            // 2. บันทึกข้อมูลเจ้าของร้านและร้านค้าลงในระบบ
            const newUser = {
                shopName: formData.shopName,
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
                role: 'OWNER', // สมัครใหม่เป็นเจ้าของร้านเสมอ
                shopId: newShopId,
                createdAt: new Date().toISOString()
            };

            await addDoc(collection(db, "users"), newUser);
            alert(`🚀 ยินดีด้วย! ร้าน "${formData.shopName}" สร้างสำเร็จแล้ว`);
            setIsRegisterMode(false);
            setFormData({ shopName: '', name: '', email: '', phone: '', password: '' });
        } catch (error) {
            alert('❌ สมัครไม่สำเร็จ: ' + error.message);
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <Card className="max-w-md w-full !p-8 shadow-2xl border-none animate-in zoom-in-95">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4">
                        {isRegisterMode ? <Store size={32} /> : <Lock size={32} />}
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                        {isRegisterMode ? 'Open New Shop' : 'Login'}
                    </h1>
                </div>

                <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-4">
                    {isRegisterMode && (
                        <>
                            <Input label="ชื่อร้านค้า" icon={Store} placeholder="ตั้งชื่อร้านของคุณ" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})} required />
                            <Input label="ชื่อเจ้าของร้าน" icon={User} placeholder="ชื่อ-นามสกุล" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                        </>
                    )}
                    
                    <Input label="อีเมล (Email)" type="email" icon={Mail} placeholder="example@mail.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                    
                    {isRegisterMode && (
                        <Input label="เบอร์โทรศัพท์" icon={Phone} placeholder="08xxxxxxxx" value={formData.phone} onChange={e => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setFormData({...formData, phone: val});
                        }} required />
                    )}

                    <Input label="รหัสผ่าน" type="password" icon={Key} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />

                    {/* แสดงเงื่อนไขรหัสผ่านเฉพาะตอนสมัคร */}
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
                        {loading ? 'กำลังบันทึก...' : (isRegisterMode ? 'สร้างร้านและบัญชีผู้ใช้' : 'เข้าสู่ระบบ')}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <button onClick={() => { setIsRegisterMode(!isRegisterMode); setFormData({ shopName: '', name: '', email: '', phone: '', password: '' }); }} className="text-sm font-bold text-blue-600 hover:underline">
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