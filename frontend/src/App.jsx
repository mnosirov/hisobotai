import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Package, MessageSquare, TrendingUp, ChevronRight, Send, Plus, X, Upload } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const API_BASE = "http://localhost:8000";

// Mock Data
const INVENTORY = [
  { id: 1, name: 'Non (Oddiy)', stock: 5, unit: 'ta', threshold: 10 },
  { id: 2, name: 'Yog (Lazzat)', stock: 45, unit: 'litr', threshold: 15 },
  { id: 3, name: 'Sut', stock: 12, unit: 'litr', threshold: 5 },
  { id: 4, name: 'Shakar', stock: 120, unit: 'kg', threshold: 20 },
];

const SALES_DATA = [
  { day: 'Du', profit: 450000 },
  { day: 'Se', profit: 320000 },
  { day: 'Ch', profit: 580000 },
  { day: 'Pa', profit: 420000 },
  { day: 'Ju', profit: 950000 },
  { day: 'Sh', profit: 1200000 },
  { day: 'Ya', profit: 850000 },
];

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profit, setProfit] = useState(1250000); // 1.25M UZS
  const [showChat, setShowChat] = useState(false);
  const [tg, setTg] = useState(null);

  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      const tgApp = window.Telegram.WebApp;
      tgApp.ready();
      tgApp.expand();
      setTg(tgApp);
      tgApp.headerColor = '#0f172a';
    }
  }, []);

  const handleCapture = async () => {
    if (tg) tg.HapticFeedback.impactOccurred('medium');
    
    // Simulating file upload for Daily Ledger (Module 3)
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('image', file);
      
      try {
        const res = await axios.post(`${API_BASE}/sales/ledger`, formData);
        alert(`Muvaffaqiyatli! Jami: ${res.data.total_amount} UZS`);
      } catch (err) {
        alert("Xatolik: Backend ulanmagan!");
      }
    };
    fileInput.click();
  };

  return (
    <div className="flex flex-col h-screen bg-[#0F172A] text-slate-100 selection:bg-indigo-500/30">
      {/* Top Header */}
      <header className="px-6 pt-10 pb-4 h-[120px] flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hisobot AI</h1>
          <p className="text-slate-400 text-sm">Biznesingiz raqamli hamrohi</p>
        </div>
        <div className="h-10 w-10 glass-card flex items-center justify-center">
          <TrendingUp className="text-blue-400" size={20} />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-6 pb-24 scrollbar-hide">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
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
                  className="w-40 h-40 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 
                             shadow-[0_0_50px_rgba(79,70,229,0.3)] flex items-center justify-center text-white"
                >
                  <Camera size={56} />
                </motion.button>
                <div className="text-center">
                  <h3 className="text-xl font-bold">Rasmga olish</h3>
                  <p className="text-slate-500 text-sm">Daftar yoki Fakturani rasmga oling</p>
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
                      <p className="font-semibold text-sm">Akram akadan qarzni olish</p>
                      <p className="text-slate-500 text-xs">Muddat: Bugun</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-600" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'inventory' && (
            <motion.div
              key="inventory"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 pt-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Sklad (Zaxira)</h2>
                <button className="h-10 w-10 glass-card flex items-center justify-center text-indigo-400">
                  <Plus size={20} />
                </button>
              </div>

              <div className="space-y-3">
                {INVENTORY.map((item) => (
                  <div key={item.id} className="glass-card p-4 flex items-center justify-between relative overflow-hidden">
                    <div className="flex items-center space-x-4">
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                        item.stock < item.threshold ? 'bg-rose-500/20' : 'bg-emerald-500/20'
                      }`}>
                        <Package className={item.stock < item.threshold ? 'text-rose-400' : 'text-emerald-400'} size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold">{item.name}</h4>
                        <p className="text-slate-500 text-xs">{item.unit}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-black ${
                        item.stock < item.threshold ? 'text-rose-400' : 'text-emerald-400'
                      }`}>
                        {item.stock}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Qoldiq</p>
                    </div>
                    {item.stock < item.threshold && (
                      <div className="absolute top-0 right-0 py-1 px-2 bg-rose-500 text-[8px] font-black rounded-bl-lg uppercase">
                        Kam qoldi
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 h-20 glass-card rounded-none rounded-t-3xl border-x-0 border-b-0 px-6 flex items-center justify-around z-10">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center space-y-1 transition ${
            activeTab === 'dashboard' ? 'text-indigo-400' : 'text-slate-500'
          }`}
        >
          <div className={`p-2 rounded-xl transition ${activeTab === 'dashboard' ? 'bg-indigo-500/20' : ''}`}>
            <TrendingUp size={24} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tight">Xulosa</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center space-y-1 transition ${
            activeTab === 'inventory' ? 'text-indigo-400' : 'text-slate-500'
          }`}
        >
          <div className={`p-2 rounded-xl transition ${activeTab === 'inventory' ? 'bg-indigo-500/20' : ''}`}>
            <Package size={24} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tight">Sklad</span>
        </button>

        <button 
          onClick={() => setShowChat(true)}
          className="flex flex-col items-center space-y-1 text-slate-500"
        >
          <div className="p-2 rounded-xl">
            <MessageSquare size={24} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tight">Chat</span>
        </button>
      </footer>

      {/* AI Assistant Drawer */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-[#0F172A] flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center mr-3">
                  <MessageSquare text-white size={20} />
                </div>
                <div>
                  <h2 className="font-bold">AI Yordamchi</h2>
                  <div className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                    <span className="text-[10px] text-slate-500 uppercase font-black">Online</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowChat(false)}
                className="h-10 w-10 glass-card flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="glass-card p-4 max-w-[80%] rounded-tl-none">
                <p className="text-sm">Assalomu alaykum! Biznesingiz bo'yicha qanday savolingiz bor? Masalan: "Bugun qancha foyda qildim?" deb so'rashingiz mumkin.</p>
              </div>

              {/* AI Insight Chart Example */}
              <div className="glass-card p-4 w-full">
                <p className="text-xs text-slate-400 mb-4 font-bold uppercase tracking-widest italic">Haftalik foyda grafigi:</p>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={SALES_DATA}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="day" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f8fafc' }}
                        cursor={{ fill: '#334155', opacity: 0.2 }}
                      />
                      <Bar dataKey="profit" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4f46e5" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="bg-indigo-600 p-4 max-w-[80%] rounded-2xl rounded-tr-none text-sm">
                  Bugun qancha foyda qildim?
                </div>
              </div>
              
              <div className="glass-card p-4 max-w-[80%] rounded-tl-none">
                <p className="text-sm">Akram aka, bugungi umumiy foydangiz <span className="text-emerald-400 font-bold">1,250,000 UZS</span> ni tashkil etdi. Bu kechagiga nisbatan 12% ko'proq. 🚀</p>
              </div>
            </div>

            <div className="p-6 pb-10 flex items-center space-x-2">
              <input 
                type="text" 
                placeholder="Savol yozing..." 
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm focus:outline-none focus:border-indigo-500/50"
              />
              <button className="h-14 w-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                <Send size={24} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
