import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

export default function ScannerModal({ isOpen, onClose, onScan }) {
  const scannerRef = useRef(null);
  const lastScannedCode = useRef(null); // เก็บค่ารหัสล่าสุดที่สแกน
  const lastScannedTime = useRef(0);    // เก็บเวลาล่าสุดที่สแกน

  useEffect(() => {
    if (!isOpen) return;

    const timeoutId = setTimeout(() => {
        if (scannerRef.current) {
            scannerRef.current.clear().catch(err => console.error("Failed to clear", err));
        }

        const scanner = new Html5QrcodeScanner(
            "reader",
            { 
                fps: 15, // เพิ่มความไวในการตรวจจับ
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                disableFlip: false, 
            },
            false
        );
        
        scannerRef.current = scanner;

        scanner.render(
            (decodedText) => {
                const now = Date.now();
                // 🟢 ระบบป้องกันการสแกนรหัสเดิมซ้ำภายใน 2 วินาที
                // แต่ถ้าเป็นรหัสใหม่ (สินค้าคนละชิ้น) ให้สแกนได้ทันที
                if (decodedText !== lastScannedCode.current || (now - lastScannedTime.current > 2000)) {
                    
                    onScan(decodedText); // ส่งรหัสไปเพิ่มในตะกร้า
                    
                    lastScannedCode.current = decodedText;
                    lastScannedTime.current = now;

                    // 🔊 ใส่การสั่นเบาๆ (ถ้าใช้บนมือถือ) เพื่อให้พนักงานรู้ว่าติดแล้ว
                    if (window.navigator.vibrate) {
                        window.navigator.vibrate(100);
                    }
                }
            },
            (errorMessage) => {
                // กรณีอ่านไม่เจอ (ข้ามไป)
            }
        );
    }, 100);

    return () => {
        clearTimeout(timeoutId);
        if (scannerRef.current) {
            scannerRef.current.clear().catch(err => console.error("Cleanup error", err));
        }
    };
  }, [isOpen, onScan]); // ❌ เอา onClose ออกจาก Dependency เพื่อไม่ให้รีเซ็ตกล้องบ่อย

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden relative shadow-2xl">
           {/* 🔴 ปุ่มปิดแบบแมนนวล (กดเมื่อสแกนครบทุกอย่างแล้ว) */}
           <button 
             onClick={onClose} 
             className="absolute top-4 right-4 z-10 bg-red-50 hover:bg-red-100 p-2.5 rounded-full transition-colors group"
           >
             <X size={24} className="text-red-500 group-hover:scale-110 transition-transform"/>
           </button>

           <div className="p-6 text-center">
               <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 animate-bounce">
                  <Camera size={28} />
               </div>
               <h3 className="font-bold text-xl mb-1 text-gray-800">สแกน</h3>
               
               
               <div id="reader" className="overflow-hidden rounded-2xl border-2 border-blue-50 bg-gray-50 min-h-[300px]"></div>
               
               <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-bold text-emerald-500 bg-emerald-50 py-2 rounded-xl">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                  ระบบพร้อมสแกนชิ้นต่อไปได้ทันที
               </div>
           </div>
        </div>
    </div>
  );
}