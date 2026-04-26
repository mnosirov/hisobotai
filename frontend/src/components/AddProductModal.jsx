import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import axios from 'axios';

const AddProductModal = ({ showAddModal, setShowAddModal, newProduct, setNewProduct, handleAddProduct, inventory = [], suppliers = [], fetchSuppliers }) => {
  const categories = [...new Set(inventory.map(i => i.category || 'Umumiy'))];
  const [matchFound, setMatchFound] = React.useState(false);
  
  const handleNameChange = (val) => {
    const existing = inventory.find(i => i.name.toLowerCase() === val.trim().toLowerCase());
    if (existing) {
      setMatchFound(true);
      setNewProduct({
        ...newProduct,
        name: val, // Keep case as typed or can use existing.name
        category: existing.category || 'Umumiy',
        unit: existing.unit || 'dona',
        buyPrice: existing.last_purchase_price || 0,
        sellPrice: existing.sell_price || 0,
        stock: newProduct.stock
      });
    } else {
      setMatchFound(false);
      setNewProduct({...newProduct, name: val});
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewProduct({ ...newProduct, imageFile: file });
    }
  };

  const limitDigits = (val, max = 9) => {
    if (val.length > max) return val.slice(0, max);
    return val;
  };

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
            className="w-full max-w-sm glass-card p-6 bg-[#1e293b] max-h-[90vh] overflow-y-auto no-scrollbar"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg">Yangi mahsulot</h3>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setMatchFound(false);
                  if (newProduct.imageFile) setNewProduct({ ...newProduct, imageFile: null });
                }} 
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
                    {newProduct.imageFile ? (
                      <img 
                        src={URL.createObjectURL(newProduct.imageFile)} 
                        alt="Preview" 
                        className="h-full w-full object-cover" 
                      />
                    ) : (
                      <div className="text-center">
                        <div className="text-indigo-400 mb-1 flex justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Rasm yuklash</span>
                      </div>
                    )}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>

              <div>
                <div className="flex justify-between items-end mb-1">
                  <label className="text-xs text-slate-400 block">Nomi</label>
                  {matchFound && (
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">Mavjud mahsulot topildi</span>
                  )}
                </div>
                <input 
                  type="text" 
                  list="product-suggestions"
                  value={newProduct.name} 
                  onChange={e => handleNameChange(e.target.value)} 
                  className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm focus:outline-none transition ${
                    matchFound ? 'border-emerald-500/50 focus:border-emerald-500' : 'border-white/10 focus:border-indigo-500'
                  }`} 
                  placeholder="Masalan: Qora choy" 
                />
                <datalist id="product-suggestions">
                  {inventory.map(item => (
                    <option key={item.id} value={item.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Bo'lim (Kategoriya)</label>
                <input 
                  type="text" 
                  list="category-suggestions"
                  value={newProduct.category} 
                  onChange={e => setNewProduct({...newProduct, category: e.target.value})} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500" 
                  placeholder="Masalan: Oziq-ovqat" 
                />
                <datalist id="category-suggestions">
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
                    value={newProduct.stock} 
                    onKeyDown={e => {
                      if ((newProduct.unit === 'dona' || newProduct.unit === 'quti') && (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === 'E')) {
                        e.preventDefault();
                      }
                    }}
                    onChange={e => {
                      let val = e.target.value;
                      if (newProduct.unit === 'dona' || newProduct.unit === 'quti') {
                        val = val.replace(/[^0-9]/g, '');
                      }
                      setNewProduct({...newProduct, stock: limitDigits(val)});
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500" 
                    placeholder="0" 
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">O'lchov</label>
                  <select 
                    value={newProduct.unit} 
                    onChange={e => setNewProduct({...newProduct, unit: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 appearance-none text-white overflow-hidden"
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
                    value={newProduct.buyPrice} 
                    onChange={e => setNewProduct({...newProduct, buyPrice: limitDigits(e.target.value)})} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500" 
                    placeholder="0" 
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">Sotish narxi (UZS)</label>
                  <input 
                    type="number" 
                    value={newProduct.sellPrice} 
                    onChange={e => setNewProduct({...newProduct, sellPrice: limitDigits(e.target.value)})} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500" 
                    placeholder="0" 
                  />
                </div>
              </div>
              
              <div className="pt-2 border-t border-white/5 space-y-4">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1">Yetkazib beruvchi va To'lov</p>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Yetkazib beruvchi (Do'kon)</label>
                  <div className="flex gap-2">
                    <select 
                      value={newProduct.supplierId} 
                      onChange={e => setNewProduct({...newProduct, supplierId: e.target.value})} 
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 appearance-none text-white"
                    >
                      <option value="" className="text-black bg-white">Tanlanmagan</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id} className="text-black bg-white">{s.name}</option>
                      ))}
                    </select>
                    <button 
                      onClick={async () => {
                        const name = prompt("Do'kon (Yetkazib beruvchi) nomini kiriting:");
                        if (name) {
                          try {
                            const { data } = await axios.post(`${API_BASE}/suppliers`, { name });
                            await fetchSuppliers();
                            setNewProduct({...newProduct, supplierId: data.id});
                          } catch (e) {
                            const errorMsg = e.response?.data?.detail || e.message;
                            alert("Xatolik yuz berdi: " + errorMsg);
                          }
                        }
                      }}
                      className="px-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl hover:bg-indigo-500/20 transition"
                      title="Yangi do'kon qo'shish"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-sm font-medium">Qarzga olingan</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={newProduct.isDebt}
                      onChange={e => setNewProduct({...newProduct, isDebt: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              {/* Optional Fields: Color and Condition */}
              <div className="pt-2 border-t border-white/5 space-y-4">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1">Qo'shimcha</p>
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 mb-1 block">Rangi</label>
                    <input 
                      type="text" 
                      value={newProduct.color || ''} 
                      onChange={e => setNewProduct({...newProduct, color: e.target.value})} 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500" 
                      placeholder="Masalan: Qizil" 
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 mb-1 block">Holati</label>
                    <input 
                      type="text" 
                      list="condition-suggestions"
                      value={newProduct.condition || ''} 
                      onChange={e => setNewProduct({...newProduct, condition: e.target.value})} 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500" 
                      placeholder="Yangi/Eski" 
                    />
                    <datalist id="condition-suggestions">
                      <option value="Yangi" />
                      <option value="Ishlatilgan" />
                      <option value="A'lo" />
                    </datalist>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={handleAddProduct} 
                disabled={!newProduct.name || !newProduct.stock}
                className={`w-full font-bold py-4 rounded-xl mt-6 active:scale-95 transition flex items-center justify-center space-x-2 ${
                  matchFound ? 'bg-emerald-600 shadow-lg shadow-emerald-500/20' : 'bg-indigo-600'
                } disabled:opacity-50`}
              >
                {matchFound ? "Mavjudni yangilash" : "Saqlash"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddProductModal;
