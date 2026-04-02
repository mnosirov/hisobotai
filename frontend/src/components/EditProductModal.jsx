import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';

const EditProductModal = ({ show, onClose, product, onUpdate, onDelete, inventory = [] }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unit: 'dona',
    stock: '',
    buyPrice: '',
    sellPrice: '',
    imageFile: null
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        category: product.category || 'Umumiy',
        unit: product.unit || 'dona',
        stock: product.stock || 0,
        buyPrice: product.last_purchase_price || 0,
        sellPrice: product.sell_price || 0,
        imageFile: null
      });
    }
  }, [product]);

  const categories = [...new Set(inventory.map(i => i.category || 'Umumiy'))];

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, imageFile: file });
    }
  };

  const handleSubmit = () => {
    onUpdate(product.id, formData);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(`${product.name}ni o'chirishni tasdiqlaysizmi?`)) {
      onDelete(product.id);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {show && (
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
            className="w-full max-w-sm glass-card p-6 bg-[#1e293b] max-h-[90vh] overflow-y-auto no-scrollbar"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg">Tahrirlash</h3>
              <button 
                onClick={onClose} 
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Image Upload/Preview */}
              <div className="flex flex-col items-center justify-center mb-4">
                <label className="cursor-pointer group relative">
                  <div className="h-24 w-24 rounded-2xl bg-white/5 border-2 border-dashed border-white/10 group-hover:border-indigo-500/50 transition-all flex items-center justify-center overflow-hidden">
                    {formData.imageFile ? (
                      <img 
                        src={URL.createObjectURL(formData.imageFile)} 
                        alt="Preview" 
                        className="h-full w-full object-cover" 
                      />
                    ) : (product?.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name} 
                          className="h-full w-full object-cover" 
                        />
                    ) : (
                      <div className="text-center">
                        <div className="text-indigo-400 mb-1 flex justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Rasmni yangilash</span>
                      </div>
                    ))}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Nomi</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500" 
                  placeholder="Nomi" 
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Bo'lim (Kategoriya)</label>
                <input 
                  type="text" 
                  list="edit-category-suggestions"
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500" 
                  placeholder="Kategoriya" 
                />
                <datalist id="edit-category-suggestions">
                  {categories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">Miqdor</label>
                  <input 
                    type="number" 
                    value={formData.stock} 
                    onChange={e => setFormData({...formData, stock: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500" 
                    placeholder="0" 
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">O'lchov</label>
                  <select 
                    value={formData.unit} 
                    onChange={e => setFormData({...formData, unit: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 appearance-none text-white"
                  >
                    <option value="dona" className="text-black bg-white">Dona</option>
                    <option value="kg" className="text-black bg-white">Kg</option>
                    <option value="litr" className="text-black bg-white">Litr</option>
                    <option value="metr" className="text-black bg-white">Metr</option>
                    <option value="quti" className="text-black bg-white">Quti</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">Olish narxi (UZS)</label>
                  <input 
                    type="number" 
                    value={formData.buyPrice} 
                    onChange={e => setFormData({...formData, buyPrice: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500" 
                    placeholder="0" 
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">Sotish narxi (UZS)</label>
                  <input 
                    type="number" 
                    value={formData.sellPrice} 
                    onChange={e => setFormData({...formData, sellPrice: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500" 
                    placeholder="0" 
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button 
                  onClick={handleDelete}
                  className="flex-shrink-0 h-14 w-14 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500/20 transition-colors"
                >
                  <Trash2 size={24} />
                </button>
                <button 
                  onClick={handleSubmit} 
                  className="flex-1 bg-indigo-600 font-bold py-4 rounded-xl active:scale-95 transition"
                >
                  Saqlash
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EditProductModal;
