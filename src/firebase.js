import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// รหัสที่คุณคัดลอกมาจากรูปที่ 4
const firebaseConfig = {
  apiKey: "AIzaSyDRZKchBiDwDuN2zN9GbWeq5S2QCPjSJ2I",
  authDomain: "pos-shop-cloud.firebaseapp.com",
  projectId: "pos-shop-cloud",
  storageBucket: "pos-shop-cloud.firebasestorage.app",
  messagingSenderId: "858105399391",
  appId: "1:858105399391:web:fa96716139f63497cff3ea"
};

// เชื่อมต่อเข้าแอป
const app = initializeApp(firebaseConfig);
// เปิดใช้งาน Firestore ฐานข้อมูลที่เราจะใช้เก็บสต็อกสินค้า
export const db = getFirestore(app);