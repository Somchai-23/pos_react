import React, { useState } from 'react';
import { Lock, User, Key, Mail, Phone, Store, UserPlus, LogIn, Check, X, AlertCircle, ShieldUser } from 'lucide-react';
import { Card, Button, Input } from './UIComponents';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";

export default function LoginView({ onLogin }) {
    // 🟢 State คุมการเปิด/ปิดโคมไฟ
    const [isOn, setIsOn] = useState(false);

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

    const toggleLamp = () => {
        setIsOn(!isOn);
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

    // --- 🟢 2. ฟังก์ชันสมัครร้านใหม่ ---
    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
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
            onLogin({ ...newUser, id: docRef.id }); 
            
        } catch (error) { alert('❌ สมัครไม่สำเร็จ: ' + error.message); }
        finally { setLoading(false); }
    };

    return (
        // 🟢 เปลี่ยนพื้นหลังเป็น Dark Mode ตามสถานะการเปิดไฟ
        <div className={`min-h-screen flex flex-col items-center justify-center relative overflow-x-hidden transition-colors duration-700 ease-in-out py-10 ${isOn ? 'bg-[#1c1f24]' : 'bg-[#121417]'}`}>
            
            {/* 🟢 แสงไฟสว่างวาบ */}
            <div className={`absolute top-40 w-[300px] md:w-[600px] h-[600px] bg-yellow-500/10 blur-[100px] rounded-full pointer-events-none transition-opacity duration-1000 ease-in-out ${isOn ? 'opacity-100' : 'opacity-0'}`}></div>

            {/* 🟢 โคมไฟกราฟิก */}
            <div className="absolute top-10 flex flex-col items-center z-20">
                <h1 className={`text-3xl md:text-4xl font-extrabold italic tracking-wider mb-10 transition-colors duration-700 ${isOn ? 'text-white' : 'text-slate-800'}`}>
                    POS Cloud System
                </h1>
                
                <div className="relative flex flex-col items-center">
                    {/* หมวกโคมไฟ */}
                    <div className={`w-32 h-16 rounded-t-full transition-all duration-500 z-10 ${isOn ? 'bg-[#f5ebd7] shadow-[0_10px_40px_rgba(245,235,215,0.4)]' : 'bg-slate-800'}`}></div>
                    {/* ขาตั้ง */}
                    <div className={`w-3 h-20 transition-colors duration-500 ${isOn ? 'bg-[#dcd0bb]' : 'bg-slate-900'}`}></div>
                    {/* ฐาน */}
                    <div className={`w-20 h-4 rounded-t-lg transition-colors duration-500 ${isOn ? 'bg-[#dcd0bb]' : 'bg-slate-900'}`}></div>

                    {/* สายดึงโคมไฟ */}
                    <button type="button" onClick={toggleLamp} className="absolute top-14 ml-16 flex flex-col items-center group cursor-pointer outline-none">
                        <div className="w-[2px] h-16 bg-slate-600 group-hover:h-20 transition-all duration-300 ease-out group-active:h-24"></div>
                        <div className={`w-4 h-4 rounded-full transition-colors duration-300 ${isOn ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)]' : 'bg-slate-600'}`}></div>
                    </button>
                </div>
            </div>

            {/* 🟢 ฟอร์ม Login ของเดิม (จะซ่อน/แสดง ตามสถานะไฟ) */}
            <div className={`relative z-10 w-full max-w-md p-4 mt-[280px] transition-all duration-1000 ease-out ${isOn ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-20 scale-95 pointer-events-none'}`}>
                <Card className="w-full !p-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)] border-none bg-white/95 backdrop-blur-xl">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
                            {isRegisterMode ? <Store size={32} /> : (isStaffMode ? <User size={32} /> : <Lock size={32} />)}
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                            {isRegisterMode ? 'Open New Shop' : (isStaffMode ? 'Staff PIN Login' : 'Owner Login')}
                        </h2>
                    </div>

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

                        <Button type="submit" disabled={loading || (isRegisterMode && !isPasswordValid)} className="w-full py-4 font-black shadow-lg mt-2">
                            {loading ? 'กำลังประมวลผล...' : (isRegisterMode ? 'สร้างร้านค้าทันที' : 'เข้าสู่ระบบ')}
                        </Button>
                    </form>

                    <div className="mt-6 flex flex-col gap-3 text-center border-t pt-4 border-slate-100">
                        {!isRegisterMode && (
                            <button type="button" onClick={() => { setIsStaffMode(!isStaffMode); resetForm(); }} className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">
                                {isStaffMode ? 'กลับไปล็อกอินระดับ Owner' : 'พนักงานเข้าสู่ระบบที่นี่'}
                            </button>
                        )}
                        <button type="button" onClick={() => { setIsRegisterMode(!isRegisterMode); setIsStaffMode(false); resetForm(); }} className="text-sm font-bold text-blue-600 hover:underline">
                            {isRegisterMode ? 'มีบัญชีแล้ว? เข้าสู่ระบบ' : 'ยังไม่มีร้าน? สมัครเปิดร้านใหม่ที่นี่'}
                        </button>
                    </div>
                </Card>
            </div>

            {/* ข้อความชี้แนะให้ดึงเชือก */}
            <p className={`absolute bottom-10 text-slate-600 font-bold animate-pulse transition-opacity duration-500 pointer-events-none tracking-widest ${isOn ? 'opacity-0' : 'opacity-100'}`}>
                ดึงสายโคมไฟเพื่อเข้าสู่ระบบ
            </p>
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