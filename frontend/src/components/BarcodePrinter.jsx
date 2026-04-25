import React, { useRef } from 'react';
import Barcode from 'react-barcode';
import { Printer, X } from 'lucide-react';

const BarcodePrinter = ({ product, onClose }) => {
  const printRef = useRef(null);

  const handlePrint = () => {
    const printContent = printRef.current.innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // Quick restore of React state after raw DOM manipulation
  };

  if (!product || !product.barcode) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e293b] w-full max-w-sm rounded-3xl p-6 shadow-xl border border-slate-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Barkodni chop etish</h2>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* Print Preview Area */}
        <div className="bg-white p-4 rounded-xl flex flex-col items-center justify-center mb-6" ref={printRef}>
          <div className="text-center text-black print-only-container">
             <div className="font-bold text-lg mb-1 truncate w-48">{product.name}</div>
             <Barcode 
               value={product.barcode} 
               format="CODE128" 
               width={1.8} 
               height={60} 
               fontSize={14} 
               margin={0}
               background="#ffffff"
             />
             <div className="text-xs mt-1 font-semibold border-t border-dashed border-gray-400 pt-1">
               {product.sell_price?.toLocaleString()} UZS
             </div>
          </div>
        </div>

        <button 
          onClick={handlePrint}
          className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition"
        >
          <Printer size={20} />
          Qog'ozga chiqarish
        </button>
      </div>

      <style jsx global>{`
        @media print {
           @page { margin: 0; size: auto; }
           body { width: 100%; height: 100%; display: flex; justify-content: center; align-items: flex-start; padding-top: 1cm; background: white; }
           .print-only-container { transform: scale(1.5); transform-origin: top center; }
        }
      `}</style>
    </div>
  );
};

export default BarcodePrinter;
