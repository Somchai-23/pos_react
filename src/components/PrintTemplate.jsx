import React from 'react';
import QRCode from "react-qr-code";

// 🟢 รูปแบบใบเสร็จรับเงินสำหรับขนาด A4
export const PrintReceipt = ({ data, shopName }) => (
  <div className="print-only receipt-layout" style={{ 
      width: '100%', 
      maxWidth: '800px', // ขนาดความกว้างที่เหมาะสมกับกระดาษ A4
      margin: '0 auto', 
      fontFamily: '"Sarabun", "Kanit", sans-serif', // ใช้ฟอนต์มาตรฐานที่อ่านง่าย
      color: '#000', 
      padding: '40px',
      boxSizing: 'border-box'
  }}>
    
    {/* 🟢 ส่วนหัว (Header: ชื่อร้าน และรายละเอียดบิล) */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '20px' }}>
      <div>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '28px', fontWeight: '900', textTransform: 'uppercase', color: '#1e3a8a' }}>
          {shopName || "MY POS"}
        </h1>
        <p style={{ margin: '0', fontSize: '14px', color: '#555' }}>ระบบจัดการหน้าร้านอัจฉริยะ</p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <h2 style={{ margin: '0 0 10px 0', fontSize: '24px', fontWeight: 'bold' }}>ใบเสร็จรับเงิน / RECEIPT</h2>
        <table style={{ fontSize: '14px', float: 'right', textAlign: 'left' }}>
          <tbody>
            <tr>
              <td style={{ fontWeight: 'bold', paddingRight: '15px', textAlign: 'right' }}>เลขที่บิล:</td>
              <td>{data.docNo}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold', paddingRight: '15px', textAlign: 'right' }}>วันที่:</td>
              <td>{data.dateFormatted}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    {/* 🟢 ข้อมูลลูกค้า (Customer Info) */}
    <div style={{ marginBottom: '30px', fontSize: '16px' }}>
      <div style={{ display: 'flex', marginBottom: '5px' }}>
        <strong style={{ width: '100px' }}>ชื่อลูกค้า:</strong>
        <span>{data.memberName || 'ลูกค้าทั่วไป'}</span>
      </div>
    </div>

    {/* 🟢 ตารางรายการสินค้า (Item Table) */}
    <table style={{ width: '100%', fontSize: '15px', borderCollapse: 'collapse', marginBottom: '30px' }}>
      <thead>
        <tr style={{ backgroundColor: '#f1f5f9', borderTop: '2px solid #000', borderBottom: '2px solid #000' }}>
          <th style={{ padding: '12px 8px', textAlign: 'center', width: '10%' }}>ลำดับ</th>
          <th style={{ padding: '12px 8px', textAlign: 'left', width: '45%' }}>รายการสินค้า</th>
          <th style={{ padding: '12px 8px', textAlign: 'center', width: '15%' }}>จำนวน</th>
          <th style={{ padding: '12px 8px', textAlign: 'right', width: '15%' }}>ราคา/หน่วย</th>
          <th style={{ padding: '12px 8px', textAlign: 'right', width: '15%' }}>จำนวนเงิน (฿)</th>
        </tr>
      </thead>
      <tbody>
        {data.items.map((item, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
            <td style={{ padding: '12px 8px', textAlign: 'center' }}>{i + 1}</td>
            <td style={{ padding: '12px 8px' }}>{item.name}</td>
            <td style={{ padding: '12px 8px', textAlign: 'center' }}>{item.qty} {item.unit || ''}</td>
            <td style={{ padding: '12px 8px', textAlign: 'right' }}>{Number(item.price).toLocaleString()}</td>
            <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold' }}>{item.total.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>

    {/* 🟢 ส่วนสรุปยอดเงิน (Summary section) */}
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
      <div style={{ width: '350px' }}>
        <table style={{ width: '100%', fontSize: '16px', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '8px 0', fontWeight: 'bold' }}>ยอดรวมสุทธิ (Total)</td>
              <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '900', fontSize: '18px' }}>฿{data.totalAmount.toLocaleString()}</td>
            </tr>
            <tr style={{ borderBottom: '1px dashed #cbd5e1' }}>
              <td style={{ padding: '8px 0', color: '#64748b' }}>รับเงินสด (Received)</td>
              <td style={{ padding: '8px 0', textAlign: 'right', color: '#64748b' }}>฿{Number(data.receivedAmount || 0).toLocaleString()}</td>
            </tr>
            <tr>
              <td style={{ padding: '12px 0', fontWeight: 'bold' }}>เงินทอน (Change)</td>
              <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: '900', fontSize: '18px' }}>฿{Number(data.changeAmount || 0).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    {/* 🟢 ส่วนท้าย (Footer & Signatures) */}
    <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'center' }}>
          <QRCode value={data.docNo} size={80} />
        </div>
        <p style={{ fontSize: '12px', margin: '0', color: '#64748b' }}>สแกน QR เพื่ออ้างอิงบิล</p>
      </div>
      
      <div style={{ display: 'flex', gap: '50px' }}>
        <div style={{ textAlign: 'center', width: '180px' }}>
          <div style={{ borderBottom: '1px solid #000', height: '40px', marginBottom: '10px' }}></div>
          <p style={{ margin: '0', fontSize: '14px' }}>ผู้รับเงิน / Cashier</p>
        </div>
        <div style={{ textAlign: 'center', width: '180px' }}>
          <div style={{ borderBottom: '1px solid #000', height: '40px', marginBottom: '10px' }}></div>
          <p style={{ margin: '0', fontSize: '14px' }}>ผู้จ่ายเงิน / Customer</p>
        </div>
      </div>
    </div>
  </div>
);

export const PrintQRLabel = ({ product, size, qty }) => (
  <div className="print-only qr-label-grid">
    {Array.from({ length: qty }).map((_, i) => (
      <div key={i} className="qr-card">
        <p style={{ fontSize: '12px', fontWeight: 'bold' }}>{product.name}</p>
        <QRCode value={product.code} size={Number(size)} />
        <p style={{ fontFamily: 'monospace', fontSize: '10px' }}>{product.code}</p>
      </div>
    ))}
  </div>
);