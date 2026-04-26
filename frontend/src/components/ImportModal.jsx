import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const ImportModal = ({ show, onClose, API_BASE, fetchInventoryData }) => {
  const [file, setFile] = useState(null);
  const [dataPreview, setDataPreview] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!show) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const isCSV = selectedFile.name.endsWith('.csv');
      const isXLSX = selectedFile.name.endsWith('.xlsx');
      
      if (isCSV || isXLSX) {
        setFile(selectedFile);
        if (isCSV) {
          parseCSV(selectedFile);
        } else {
          setDataPreview([]); // No preview for XLSX yet, but we'll show the file name
        }
      } else {
        toast.error("Iltimos, .csv yoki .xlsx formatidagi faylni yuklang!");
      }
    }
  };

  const parseCSV = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/);
      if (lines.length < 2) return;
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const parsedData = lines.slice(1).filter(line => line.trim()).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj = {};
        headers.forEach((header, index) => {
          let key = header;
          if (header.includes('nomi') || header.includes('name')) key = 'name';
          if (header.includes('kategoriya') || header.includes('category')) key = 'category';
          if (header.includes('o\'lchov') || header.includes('unit')) key = 'unit';
          if (header.includes('qoldiq') || header.includes('stock')) key = 'stock';
          if (header.includes('narx') || header.includes('buy_price')) key = 'buy_price';
          if (header.includes('sotish') || header.includes('sell_price')) key = 'sell_price';
          if (header.includes('shtrix') || header.includes('barcode')) key = 'barcode';
          obj[key] = values[index];
        });
        return obj;
      });
      setDataPreview(parsedData);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    const loadingToast = toast.loading("Ma'lumotlar yuklanmoqda...");
    
    try {
      if (file.name.endsWith('.xlsx')) {
        const formData = new FormData();
        formData.append('file', file);
        await axios.post(`${API_BASE}/inventory/import`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        // Fallback for CSV if preview was shown, or just use the file
        if (dataPreview.length > 0) {
          await axios.post(`${API_BASE}/inventory/bulk`, dataPreview);
        } else {
          const formData = new FormData();
          formData.append('file', file);
          await axios.post(`${API_BASE}/inventory/import`, formData);
        }
      }
      
      toast.success("Muvaffaqiyatli yuklandi!", { id: loadingToast });
      fetchInventoryData();
      onClose();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Yuklashda xatolik yuz berdi";
      toast.error(errorMsg, { id: loadingToast });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const headers = "Name,Category,Unit,Stock,Buy_Price,Sell_Price,Barcode";
    const sample = "Samsung S24 Ultra,Telefonlar,dona,10,10000000,12000000,880123456789";
    const blob = new Blob([headers + "\n" + sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "hisobotai_template.csv";
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e293b] w-full max-w-4xl rounded-3xl overflow-hidden shadow-xl border border-slate-700 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Upload className="text-indigo-400" size={24} /> 
              Exceldan mahsulotlarni yuklash
            </h2>
            <p className="text-xs text-slate-400 mt-1">Jadvaldagi barcha mahsulotlarni ommaviy qo'shish (.xlsx yoki .csv)</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!file ? (
            <div className="space-y-6">
              <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6 flex flex-col items-center text-center">
                <div className="h-16 w-16 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 mb-4">
                  <FileText size={32} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Hali fayl tanlanmagan</h3>
                <p className="text-sm text-slate-400 mb-6 max-w-md">
                  Tayyorlab qo'ygan Excel (.xlsx) yoki CSV faylingizni yuklang.
                </p>
                <label className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl transition cursor-pointer">
                  Faylni tanlash
                  <input type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFileChange} />
                </label>
                <button 
                  onClick={downloadTemplate}
                  className="mt-4 text-xs text-indigo-400 hover:underline"
                >
                  Namunaviy faylni yuklab olish
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400" /> To'g'ri Format:
                  </h4>
                  <ul className="text-xs text-slate-300 space-y-2">
                    <li>• Birinchi qator (Sarlavha) nomi to'g'ri bo'lishi kerak.</li>
                    <li>• Ustunlar tartibi muhim emas, nomi bo'lsa kifoya.</li>
                    <li>• Miqdorlar faqat raqam bo'lishi lozim.</li>
                  </ul>
                </div>
                <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                    <AlertCircle size={14} className="text-amber-400" /> Diqqat!
                  </h4>
                  <ul className="text-xs text-slate-300 space-y-2">
                    <li>• Ismi bir xil bo'lgan mahsulotlar qoldig'i yangilanadi.</li>
                    <li>• Bo'sh qatorlar avtomatik tashlab ketiladi.</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-300">Fayl tahlili: {dataPreview.length} ta mahsulot topildi</h3>
                <button onClick={() => setFile(null)} className="text-xs text-rose-400 hover:underline">Boshqa fayl tanlash</button>
              </div>
              <div className="border border-slate-700 rounded-2xl overflow-hidden overflow-x-auto bg-slate-900/50">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800 text-slate-400 uppercase font-bold">
                    <tr>
                      <th className="p-3">Nomi</th>
                      <th className="p-3">Kategoriya</th>
                      <th className="p-3 text-center">Miqdor</th>
                      <th className="p-3 text-right">Olish Narxi</th>
                      <th className="p-3 text-right">Sotish Narxi</th>
                      <th className="p-3">Barkod</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {dataPreview.slice(0, 50).map((row, i) => (
                      <tr key={i} className="hover:bg-indigo-500/5 transition-colors">
                        <td className="p-3 text-white font-medium">{row.name}</td>
                        <td className="p-3 text-slate-400">{row.category}</td>
                        <td className="p-3 text-center text-indigo-400 font-bold">{row.stock}</td>
                        <td className="p-3 text-right text-slate-300">{Number(row.buy_price || 0).toLocaleString()}</td>
                        <td className="p-3 text-right text-emerald-400 font-bold">{Number(row.sell_price || 0).toLocaleString()}</td>
                        <td className="p-3 text-slate-500 font-mono">{row.barcode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {dataPreview.length > 50 && (
                  <div className="p-3 text-center text-[10px] text-slate-500 italic">
                    Yana {dataPreview.length - 50} ta mahsulot yuklanadi (bu yerda faqat dastlabki 50 tasi ko'rsatilgan)
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {file && (
          <div className="p-6 bg-slate-800/50 border-t border-slate-700 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-6 rounded-xl border border-slate-600 text-slate-300 font-bold hover:bg-slate-700 transition"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleImport}
              disabled={isProcessing}
              className="flex-[2] py-3 px-6 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
              {isProcessing ? "Yuklanmoqda..." : <><Upload size={20} /> Hammasini Skladga Qo'shish</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportModal;
