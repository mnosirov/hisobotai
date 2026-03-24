import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertCircle } from 'lucide-react';

const ConfirmationModal = ({ show, onConfirm, onCancel, items, title, loading }) => {
  if (!show) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-lg glass-card p-6 bg-[#1e293b] max-h-[80vh] flex flex-col"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-xl text-white">{title}</h3>
            <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <p className="text-slate-400 text-sm mb-4">
            AI quyidagilarni aniqladi. Barchasi to'g'rimi?
          </p>

          <div className="flex-1 overflow-y-auto space-y-2 mb-6 pr-2 scrollbar-hide">
            {items.map((item, idx) => (
              <div key={idx} className={`p-3 rounded-xl border ${item.found !== false && !item.is_new ? 'bg-white/5 border-white/10' : 'bg-amber-500/10 border-amber-500/20'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-slate-100">{item.product_name || item.name}</h4>
                    <p className="text-xs text-slate-500">
                      {item.quantity} {item.unit || 'ta'} 
                      {item.price > 0 && ` | ${item.price.toLocaleString()} UZS`}
                      {item.revenue > 0 && ` | ${item.revenue.toLocaleString()} UZS`}
                    </p>
                  </div>
                  {item.found === false || item.is_new ? (
                    <div className="flex items-center text-[10px] text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded">
                      <AlertCircle size={10} className="mr-1" /> Yangi/Noma'lum
                    </div>
                  ) : (
                    <div className="text-emerald-400">
                      <Check size={16} />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-center py-6 text-slate-500 italic">Hech narsa aniqlanmadi</div>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-400 hover:bg-white/5 transition"
            >
              Bekor qilish
            </button>
            <button
              onClick={onConfirm}
              disabled={loading || items.length === 0}
              className="flex-[2] py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check size={20} />
                  <span>Tasdiqlash</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ConfirmationModal;
