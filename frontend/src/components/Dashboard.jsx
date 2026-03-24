import React from 'react';
import { motion } from 'framer-motion';
import { Camera, TrendingUp, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const Dashboard = ({ profit, tg, fetchDashboardData, fetchInventoryData, API_BASE }) => {
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
      
      const loadingToast = toast.loading('Ma\'lumotlar tahlil qilinmoqda...');
      try {
        const res = await axios.post(`${API_BASE}/sales/ledger`, formData);
        toast.success(`Muvaffaqiyatli! Jami: ${res.data.total_amount} UZS`, { id: loadingToast });
        fetchDashboardData();
        fetchInventoryData();
      } catch (err) {
        const errorMsg = err.response?.data?.detail || "Xatolik: Tarmoq yoki AI ushlanib qoldi!";
        toast.error(errorMsg, { id: loadingToast });
      }
    };
    fileInput.click();
  };

  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 pt-4"
    >
      {/* Daily Profit Card */}
      <div className="glass-card p-6 bg-gradient-to-br from-indigo-500/20 to-blue-600/10">
        <span className="text-slate-400 text-sm font-medium">Bugungi Foyda</span>
        <div className="flex items-end justify-between mt-2">
          <h2 className="text-3xl font-black text-white">
            {profit.toLocaleString('uz-UZ')} <span className="text-lg font-normal text-indigo-300">UZS</span>
          </h2>
          <div className="flex items-center text-green-400 text-sm font-bold bg-green-500/10 px-2 py-1 rounded-lg">
            +12% <TrendingUp size={14} className="ml-1" />
          </div>
        </div>
      </div>

      {/* Central Action Button */}
      <div className="pt-8 flex flex-col items-center justify-center space-y-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleCapture}
          className="w-40 h-40 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-[0_0_50px_rgba(79,70,229,0.3)] flex items-center justify-center text-white"
        >
          <Camera size={56} />
        </motion.button>
        <div className="text-center">
          <h3 className="text-xl font-bold">Rasmga olish</h3>
          <p className="text-slate-500 text-sm">Daftar yoki Fakturani yuklash</p>
        </div>
      </div>

      {/* Quick Insights List */}
      <div className="space-y-4 pt-4">
        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Kutilayotgan topshiriqlar</h4>
        <div className="glass-card divide-y divide-white/5 overflow-hidden">
          <button className="flex items-center w-full p-4 hover:bg-white/5 transition">
            <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center mr-4">
              <div className="h-5 w-5 rounded-full border-2 border-orange-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-sm">Asosiy qarzni to'plash</p>
              <p className="text-slate-500 text-xs">Muddat: Bugun</p>
            </div>
            <ChevronRight size={18} className="text-slate-600" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
