import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, TrendingUp, TrendingDown, ChevronRight, FileText, ShoppingBag, Mic } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import ConfirmationModal from './ConfirmationModal';
import VoiceRecorder from './VoiceRecorder';

const Dashboard = ({ profit, profitGrowth, lowStockItems, totalStockCost, totalStockSell, totalSalesRevenue, totalSupplierDebt, cashBalance, tg, fetchDashboardData, fetchInventoryData, API_BASE, setShowAddSaleModal }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [analyzedItems, setAnalyzedItems] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [captureMode, setCaptureMode] = useState('sales'); // 'sales' or 'inventory'

  const handleCapture = async () => {
    if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const formData = new FormData();
      formData.append('image', file);
      
      setIsAnalyzing(true);
      const loadingToast = toast.loading('Ma\'lumotlar tahlil qilinmoqda...');
      
      try {
        const endpoint = captureMode === 'sales' ? '/sales/analyze' : '/inventory/analyze';
        const res = await axios.post(`${API_BASE}${endpoint}`, formData);
        
        setAnalyzedItems(res.data);
        setShowConfirm(true);
        toast.dismiss(loadingToast);
      } catch (err) {
        const errorMsg = err.response?.data?.detail || "Xatolik: Tarmoq yoki AI ushlanib qoldi!";
        toast.error(errorMsg, { id: loadingToast });
      } finally {
        setIsAnalyzing(false);
      }
    };
    fileInput.click();
  };

  const handleVoiceComplete = async (audioBlob) => {
    if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('heavy');
    
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice_command.webm');
    
    setIsAnalyzing(true);
    const loadingToast = toast.loading('Ovoz tahlil qilinmoqda...');
    
    try {
      const endpoint = captureMode === 'sales' ? '/sales/voice-analyze' : '/inventory/voice-analyze';
      const res = await axios.post(`${API_BASE}${endpoint}`, formData);
      
      setAnalyzedItems(res.data);
      setShowConfirm(true);
      toast.dismiss(loadingToast);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Ovozli tahlilda xatolik yuz berdi.";
      toast.error(errorMsg, { id: loadingToast });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFinalConfirm = async () => {
    setIsConfirming(true);
    const loadingToast = toast.loading('Tasdiqlanmoqda...');
    
    try {
      const endpoint = captureMode === 'sales' ? '/sales/confirm' : '/inventory/confirm';
      await axios.post(`${API_BASE}${endpoint}`, analyzedItems);
      
      toast.success("Muvaffaqiyatli saqlandi!", { id: loadingToast });
      setShowConfirm(false);
      fetchDashboardData();
      fetchInventoryData();
    } catch (err) {
      toast.error("Saqlashda xatolik yuz berdi", { id: loadingToast });
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 pt-4"
    >

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Daily Profit Card */}
        <div className="glass-card p-4 bg-gradient-to-br from-indigo-500/20 to-blue-600/10">
          <span className="text-slate-400 text-[10px] font-medium uppercase">Bugungi Foyda</span>
          <div className="flex items-end justify-between mt-1">
            <h2 className="text-xl font-black text-white">
              {profit.toLocaleString('uz-UZ')}
            </h2>
          </div>
        </div>

        {/* Total Stock Cost Card */}
        <div className="glass-card p-4 bg-gradient-to-br from-emerald-500/20 to-teal-600/10">
          <span className="text-slate-400 text-[10px] font-medium uppercase">Sklad (Tan narxi)</span>
          <div className="flex items-end justify-between mt-1">
            <h2 className="text-xl font-black text-white">
              {(totalStockCost || 0).toLocaleString('uz-UZ')}
            </h2>
          </div>
        </div>

        {/* Total Stock Sell Card */}
        <div className="glass-card p-4 bg-gradient-to-br from-teal-500/20 to-cyan-600/10">
          <span className="text-slate-400 text-[10px] font-medium uppercase">Sklad (Sotish)</span>
          <div className="flex items-end justify-between mt-1">
            <h2 className="text-xl font-black text-white">
              {(totalStockSell || 0).toLocaleString('uz-UZ')}
            </h2>
          </div>
        </div>

        {/* Total Sales Revenue Card */}
        <div className="glass-card p-4 bg-gradient-to-br from-amber-500/20 to-orange-600/10">
          <span className="text-slate-400 text-[10px] font-medium uppercase">Jami Sotuv (Tushum)</span>
          <div className="flex items-end justify-between mt-1">
            <h2 className="text-xl font-black text-white">
              {(totalSalesRevenue || 0).toLocaleString('uz-UZ')}
            </h2>
          </div>
        </div>

        {/* Total Supplier Debt Card */}
        <div className="glass-card p-4 bg-gradient-to-br from-red-500/20 to-rose-600/10">
          <span className="text-slate-400 text-[10px] font-medium uppercase">Do'konlardan qarz</span>
          <div className="flex items-end justify-between mt-1">
            <h2 className="text-xl font-black text-white text-rose-400">
              {(totalSupplierDebt || 0).toLocaleString('uz-UZ')}
            </h2>
          </div>
        </div>

        {/* Cash Balance Card */}
        <div className="glass-card p-4 bg-gradient-to-br from-purple-500/20 to-pink-600/10">
          <span className="text-slate-400 text-[10px] font-medium uppercase">Sof Kassa (Qoldiq)</span>
          <div className="flex items-end justify-between mt-1">
            <h2 className="text-xl font-black text-white text-purple-400">
              {(cashBalance || 0).toLocaleString('uz-UZ')}
            </h2>
          </div>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="flex bg-slate-800/50 p-1 rounded-2xl border border-white/5">
        <button 
          onClick={() => setCaptureMode('sales')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl transition ${
            captureMode === 'sales' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'
          }`}
        >
          <FileText size={18} />
          <span className="text-sm font-bold">Sotuv (Daftar)</span>
        </button>
        <button 
          onClick={() => setCaptureMode('inventory')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl transition ${
            captureMode === 'inventory' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'
          }`}
        >
          <ShoppingBag size={18} />
          <span className="text-sm font-bold">Xarid (Faktura)</span>
        </button>
      </div>

      {/* Central Action Area: Camera & Voice side-by-side */}
      <div className="pt-4 flex flex-col items-center justify-center space-y-6">
        <div className="flex items-center justify-center space-x-8">
          {/* Camera Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleCapture}
            disabled={isAnalyzing}
            className={`w-32 h-32 rounded-full bg-gradient-to-tr ${
              captureMode === 'sales' ? 'from-blue-600 to-indigo-600' : 'from-emerald-600 to-teal-600'
            } shadow-[0_0_40px_rgba(79,70,229,0.2)] flex items-center justify-center text-white relative`}
          >
            {isAnalyzing ? (
              <div className="h-12 w-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Camera size={44} />
            )}
          </motion.button>

          {/* Voice Button */}
          <div className="w-32 h-32 flex items-center justify-center">
            <VoiceRecorder 
              onRecordingComplete={handleVoiceComplete} 
              isAnalyzing={isAnalyzing} 
            />
          </div>
        </div>
        
        <div className="text-center">
          <h3 className="text-xl font-bold">
            {captureMode === 'sales' ? 'Sotuvlarni kiritish' : 'Xaridlarni kiritish'}
          </h3>
          <p className="text-slate-500 text-xs mt-1 mb-4 max-w-[250px] mx-auto">
            Rasmga oling yoki ovozli buyruq bering (masalan: 10ta non)
          </p>
          
          {captureMode === 'sales' && (
            <button 
              onClick={() => setShowAddSaleModal(true)}
              className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-indigo-400 text-xs font-bold hover:bg-white/10 transition pb-2.5"
            >
              Qo'lda qo'shish +
            </button>
          )}
        </div>
      </div>

      {/* Quick Insights List */}
      <div className="space-y-4 pt-4">
        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Kutilayotgan topshiriqlar</h4>
        <div className="glass-card divide-y divide-white/5 overflow-hidden">
          {lowStockItems.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm italic">
              Hozircha kutilayotgan vazifalar yo'q. Hammasi joyida! ✨
            </div>
          ) : (
            lowStockItems.map((item, idx) => (
              <button key={idx} className="flex items-center w-full p-4 hover:bg-white/5 transition group">
                <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center mr-4 group-hover:bg-orange-500/30 transition">
                  <div className="h-5 w-5 rounded-full border-2 border-orange-500 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-orange-500">!</span>
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm">{item.name} kam qoldi</p>
                  <p className="text-slate-500 text-xs">Qoldiq: {item.stock} {item.unit}. Sotib olish kerak.</p>
                </div>
                <ChevronRight size={18} className="text-slate-600 group-hover:text-indigo-400 transition" />
              </button>
            ))
          )}
        </div>
      </div>

      <ConfirmationModal 
        show={showConfirm}
        title={captureMode === 'sales' ? "Sotuvlarni tasdiqlash" : "Xaridlarni tasdiqlash"}
        items={analyzedItems}
        loading={isConfirming}
        onConfirm={handleFinalConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </motion.div>
  );
};

export default Dashboard;
