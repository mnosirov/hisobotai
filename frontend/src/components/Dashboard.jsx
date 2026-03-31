import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, TrendingUp, TrendingDown, ChevronRight, FileText, ShoppingBag, Mic } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import ConfirmationModal from './ConfirmationModal';
import VoiceRecorder from './VoiceRecorder';

const Dashboard = ({ profit, profitGrowth, lowStockItems, tg, fetchDashboardData, fetchInventoryData, API_BASE, setShowAddSaleModal, initialType = 'camera' }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [analyzedItems, setAnalyzedItems] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [captureMode, setCaptureMode] = useState('sales'); // 'sales' or 'inventory'
  const [interactionType, setInteractionType] = useState(initialType); // 'camera' or 'voice'

  // Effect to sync prop if needed (when switching from bottom nav)
  useEffect(() => {
    setInteractionType(initialType);
  }, [initialType]);

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
      {/* Interaction Type Toggle at the very top */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800/50 rounded-2xl border border-white/5">
        <button 
          onClick={() => setInteractionType('camera')}
          className={`flex items-center justify-center space-x-2 py-3 rounded-xl transition font-bold text-sm ${
            interactionType === 'camera' 
              ? 'bg-indigo-600 text-white shadow-lg' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Camera size={18} />
          <span>Rasm Orqali</span>
        </button>
        <button 
          onClick={() => setInteractionType('voice')}
          className={`flex items-center justify-center space-x-2 py-3 rounded-xl transition font-bold text-sm ${
            interactionType === 'voice' 
              ? 'bg-indigo-600 text-white shadow-lg' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Mic size={18} />
          <span>Ovoz Orqali</span>
        </button>
      </div>

      {/* Daily Profit Card */}
      <div className="glass-card p-6 bg-gradient-to-br from-indigo-500/20 to-blue-600/10">
        <span className="text-slate-400 text-sm font-medium">Bugungi Foyda</span>
        <div className="flex items-end justify-between mt-2">
          <h2 className="text-3xl font-black text-white">
            {profit.toLocaleString('uz-UZ')} <span className="text-lg font-normal text-indigo-300">UZS</span>
          </h2>
          <div className={`flex items-center text-sm font-bold px-2 py-1 rounded-lg ${
            profitGrowth >= 0 ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'
          }`}>
            {profitGrowth >= 0 ? '+' : ''}{profitGrowth}% 
            {profitGrowth >= 0 ? <TrendingUp size={14} className="ml-1" /> : <TrendingDown size={14} className="ml-1" />}
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

      {/* Central Action Button / Voice Recorder */}
      <div className="pt-4 flex flex-col items-center justify-center space-y-6">
        {interactionType === 'camera' ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleCapture}
            disabled={isAnalyzing}
            className={`w-40 h-40 rounded-full bg-gradient-to-tr ${
              captureMode === 'sales' ? 'from-blue-600 to-indigo-600' : 'from-emerald-600 to-teal-600'
            } shadow-[0_0_50px_rgba(79,70,229,0.3)] flex items-center justify-center text-white relative`}
          >
            {isAnalyzing ? (
              <div className="h-16 w-16 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Camera size={56} />
            )}
          </motion.button>
        ) : (
          <div className="h-40 flex items-center justify-center">
            <VoiceRecorder 
              onRecordingComplete={handleVoiceComplete} 
              isAnalyzing={isAnalyzing} 
            />
          </div>
        )}
        
        <div className="text-center">
          <h3 className="text-xl font-bold">
            {interactionType === 'camera' 
              ? (captureMode === 'sales' ? 'Sotuvlarni tahlil qilish' : 'Xaridlarni tahlil qilish')
              : (captureMode === 'sales' ? 'Sotuvli ovozli buyruq' : 'Xaridli ovozli buyruq')
            }
          </h3>
          <p className="text-slate-500 text-sm mb-4">
            {interactionType === 'camera' 
              ? (captureMode === 'sales' ? 'Daftar varog\'ini rasmga oling' : 'Faktura (chekka) rasmga oling')
              : (captureMode === 'sales' ? 'Sotuvni aytib bering (masalan: 10ta non)' : 'Xaridni aytib bering (masalan: 5ta sut 5000dan)')
            }
          </p>
          
          {captureMode === 'sales' && interactionType === 'camera' && (
            <button 
              onClick={() => setShowAddSaleModal(true)}
              className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-indigo-400 text-xs font-bold hover:bg-indigo-500/10 transition pb-2.5"
            >
              Qo'lda sotuv qo'shish +
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
