import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const AddProductModal = ({ showAddModal, setShowAddModal, newProduct, setNewProduct, handleAddProduct }) => {
  return (
    <AnimatePresence>
      {showAddModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-sm glass-card p-6 bg-[#1e293b]"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg">Yangi mahsulot</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Nomi</label>
                <input 
                  type="text" 
                  value={newProduct.name} 
                  onChange={e => setNewProduct({...newProduct, name: e.target.value})} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500" 
                  placeholder="Masalan: Qora choy" 
                />
              </div>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">Miqdor</label>
                  <input 
                    type="number" 
                    value={newProduct.stock} 
                    onChange={e => setNewProduct({...newProduct, stock: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500" 
                    placeholder="0" 
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">O'lchov</label>
                  <select 
                    value={newProduct.unit} 
                    onChange={e => setNewProduct({...newProduct, unit: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 appearance-none text-white"
                  >
                    <option value="dona" className="text-black">Dona</option>
                    <option value="kg" className="text-black">Kg</option>
                    <option value="litr" className="text-black">Litr</option>
                    <option value="metr" className="text-black">Metr</option>
                    <option value="quti" className="text-black">Quti</option>
                  </select>
                </div>
              </div>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">Olish narxi (UZS)</label>
                  <input 
                    type="number" 
                    value={newProduct.buyPrice} 
                    onChange={e => setNewProduct({...newProduct, buyPrice: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500" 
                    placeholder="0" 
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">Sotish narxi (UZS)</label>
                  <input 
                    type="number" 
                    value={newProduct.sellPrice} 
                    onChange={e => setNewProduct({...newProduct, sellPrice: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500" 
                    placeholder="0" 
                  />
                </div>
              </div>
              
              <button 
                onClick={handleAddProduct} 
                className="w-full bg-indigo-600 font-bold py-4 rounded-xl mt-6 active:scale-95 transition"
              >
                Saqlash
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddProductModal;
