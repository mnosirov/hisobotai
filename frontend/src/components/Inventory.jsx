import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus } from 'lucide-react';

const Inventory = ({ inventory, setShowAddModal }) => {
  return (
    <motion.div
      key="inventory"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 pt-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Sklad (Zaxira)</h2>
        <button 
          onClick={() => setShowAddModal(true)}
          className="h-10 w-10 glass-card flex items-center justify-center text-indigo-400"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="space-y-3">
        {inventory.length === 0 && (
          <div className="text-center py-10 text-slate-500 text-sm">Sklad hozircha bo'sh. Mahsulot qo'shing.</div>
        )}
        {inventory.map((item) => (
          <div key={item.id} className="glass-card p-4 flex items-center justify-between relative overflow-hidden">
            <div className="flex items-center space-x-4">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                item.stock < item.threshold ? 'bg-rose-500/20' : 'bg-emerald-500/20'
              }`}>
                <Package className={item.stock < item.threshold ? 'text-rose-400' : 'text-emerald-400'} size={24} />
              </div>
              <div>
                <h4 className="font-bold">{item.name}</h4>
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
  );
};

export default Inventory;
