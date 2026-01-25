import React, { useState } from 'react';
import { Lock, User, LogIn, LayoutDashboard } from 'lucide-react';
import { Button, Input, Card } from './UIComponents';

export default function LoginView({ onLogin, users }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        // ค้นหา User จากฐานข้อมูลในเครื่อง
        const foundUser = users.find(u => u.username === username && u.password === password);

        if (foundUser) {
            onLogin(foundUser);
        } else {
            alert('❌ ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
            <Card className="w-full max-w-sm !p-8 shadow-2xl border-none rounded-[2.5rem]">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-200">
                        <LayoutDashboard size={40} />
                    </div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">MY POS</h1>
                    <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">ยินดีต้อนรับ</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input label="ชื่อผู้ใช้งาน" icon={User} value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" />
                    <Input label="รหัสผ่าน" type="password" icon={Lock} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
                    <Button type="submit" className="w-full py-4 text-lg font-black mt-4">
                        <LogIn size={20} /> เข้าสู่ระบบ
                    </Button>
                </form>
            </Card>
        </div>
    );
}