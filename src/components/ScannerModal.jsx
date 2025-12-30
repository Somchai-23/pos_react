import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

export default function ScannerModal({ isOpen, onClose, onScan }) {
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // หน่วงเวลาเล็กน้อยเพื่อให้ DOM พร้อม
    const timeoutId = setTimeout(() => {
        // เคลียร์ Scanner ตัวเก่าถ้ามีค้างอยู่
        if (scannerRef.current) {
            scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
        }

        // ตั้งค่าตัวสแกน
        const scanner = new Html5QrcodeScanner(
            "reader",
            { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                disableFlip: false, 
            },
            false
        );
        
        scannerRef.current = scanner;

        // เริ่มทำงาน
        scanner.render(
            (decodedText) => {
                onScan(decodedText);
                scanner.clear().catch(err => console.error(err));
                onClose();
            },
            (errorMessage) => {
                // กรณีอ่านไม่เจอ (ไม่ต้องทำอะไร)
            }
        );
    }, 100);

    return () => {
        clearTimeout(timeoutId);
        if (scannerRef.current) {
            scannerRef.current.clear().catch(err => console.error("Cleanup error", err));
        }
    };
  }, [isOpen, onScan, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-200">
       <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden relative shadow-2xl">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 z-10 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-600"/>
          </button>
          <div className="p-6 text-center">
              <h3 className="font-bold text-xl mb-1 text-gray-800 flex items-center justify-center gap-2">
                <Camera className="text-blue-600" /> สแกน QR/Barcode
              </h3>
              <p className="text-gray-400 text-xs mb-4">วางรหัสให้อยู่ในกรอบสี่เหลี่ยม</p>
              
              <div id="reader" className="overflow-hidden rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 min-h-[300px]"></div>
              
              <p className="mt-4 text-xs text-gray-400">รองรับทั้ง QR Code และ Barcode สินค้า</p>
          </div>
       </div>
    </div>
  );
}