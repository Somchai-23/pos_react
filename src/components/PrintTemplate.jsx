// components/PrintTemplate.jsx
import React from 'react';
import QRCode from "react-qr-code";

export const PrintReceipt = ({ data }) => (
  <div className="print-only receipt-layout">
    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
      <h2 style={{ margin: '0' }}>MY POS CLOUD</h2>
      <p style={{ fontSize: '10px' }}>ยินดีให้บริการ</p>
    </div>
    <div style={{ fontSize: '11px', borderBottom: '1px dashed #000', paddingBottom: '5px' }}>
      <p>เลขที่: {data.docNo}</p>
      <p>วันที่: {data.dateFormatted}</p>
    </div>
    <table style={{ width: '100%', fontSize: '11px', margin: '10px 0' }}>
      <tbody>
        {data.items.map((item, i) => (
          <tr key={i}>
            <td>{item.name} x {item.qty}</td>
            <td style={{ textAlign: 'right' }}>{item.total.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <div style={{ textAlign: 'right', fontSize: '12px', fontWeight: 'bold', borderTop: '1px dashed #000' }}>
      <p>ยอดสุทธิ: ฿{data.totalAmount.toLocaleString()}</p>
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