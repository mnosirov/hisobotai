import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Inventory = ({ inventory, setShowAddModal }) => {
  const { BACKEND_URL } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('Barchasi');
  const [fullscreenImage, setFullscreenImage] = useState(null);

  const filteredInventory = selectedCategory === 'Barchasi' 
    ? inventory 
    : inventory.filter(item => (item.category || 'Umumiy') === selectedCategory);

  return (
    <>
      <motion.div
        key="inventory"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6 pt-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Sklad (Zaxira)</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                inventory.length >= 10 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
              }`}>
                {inventory.length} / { 
                  inventory.length <= 10 ? 10 : (inventory.length <= 100 ? 100 : 5000) 
                } mahsulot
              </span>
            </div>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="h-10 w-10 glass-card flex items-center justify-center text-indigo-400 hover:bg-indigo-500/10 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Categories Filter Strip */}
        <div className="flex overflow-x-auto pb-2 space-x-2 scrollbar-hide no-scrollbar">
          {["Barchasi", ...new Set(inventory.map(i => i.category || 'Umumiy'))].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition ${
                (selectedCategory === cat) 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredInventory.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-sm">Sklad hozircha bo'sh yoki bu bo'limda mahsulot yo'q.</div>
          )}
          {filteredInventory.map((item) => (
            <div key={item.id} className="glass-card p-4 flex items-center justify-between relative overflow-hidden group">
              <div className="flex items-center space-x-4">
                <div 
                  onClick={() => {
                    if (!item.image_url || typeof item.image_url !== 'string') return;
                    const url = item.image_url.startsWith('http') ? item.image_url : `${BACKEND_URL}${item.image_url}`;
                    setFullscreenImage(url);
                  }}
                  className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 overflow-hidden cursor-pointer ${
                    item.stock < (item.threshold || 10) ? 'bg-rose-500/20' : 'bg-emerald-500/20'
                  }`}
                >
                  {item.image_url && typeof item.image_url === 'string' ? (
                    <img 
                      src={item.image_url.startsWith('http') ? item.image_url : `${BACKEND_URL}${item.image_url}`} 
                      alt={item.name} 
                      className="h-full w-full object-cover" 
                      onError={(e) => {
                        e.target.onerror = null; // Prevent infinite loop
                        e.target.parentElement.innerHTML = '<div class="flex items-center justify-center h-full w-full opacity-50"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package text-slate-400"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.27 6.96 8.73 5.05 8.73-5.05"/><path d="M12 22.08V12"/></svg></div>';
                      }}
                    />
                  ) : (
                    <Package className={item.stock < (item.threshold || 10) ? 'text-rose-400' : 'text-emerald-400'} size={24} />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold">{item.name}</h4>
                    <span className="text-[9px] px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md border border-indigo-500/20">
                      {item.category || 'Umumiy'}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs">{item.unit} | Olish: {item.last_purchase_price} | Sotish: {item.sell_price}</p>
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

      {/* Fullscreen Image Overlay */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFullscreenImage(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 cursor-zoom-out"
          >
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={fullscreenImage}
              alt="Full size"
              className="max-w-full max-h-full rounded-2xl shadow-2xl"
            />
            <button className="absolute top-6 right-6 h-12 w-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
              <Plus className="rotate-45" size={32} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Inventory;
