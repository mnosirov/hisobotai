import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, ShoppingCart, Search, Check, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const AddSaleModal = ({ show, onClose, inventory, API_BASE, fetchDashboardData, fetchInventoryData }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState([]); // [{product_id, name, quantity, revenue}]
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredProducts = inventory.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product) => {
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.product_id === product.id 
          ? { ...item, quantity: item.quantity + 1, revenue: (item.quantity + 1) * product.sell_price }
          : item
      ));
    } else {
      setCart([...cart, { 
        product_id: product.id, 
        name: product.name, 
        quantity: 1, 
        revenue: product.sell_price,
        unit: product.unit 
      }]);
    }
    toast.success(`${product.name} qo'shildi`);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.product_id === productId) {
        const product = inventory.find(p => p.id === productId);
        const newQty = Math.max(0.1, item.quantity + delta);
        return { ...item, quantity: newQty, revenue: newQty * product.sell_price };
      }
      return item;
    }));
  };

  const handleSell = async () => {
    if (cart.length === 0) return;
    
    setIsSubmitting(true);
    const loadingToast = toast.loading("Saqlanmoqda...");
    try {
      await axios.post(`${API_BASE}/sales/manual`, {
        items: cart.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          revenue: i.revenue
        }))
      });
      toast.success("Sotuv muvaffaqiyatli saqlandi!", { id: loadingToast });
      setCart([]);
      fetchDashboardData();
      fetchInventoryData();
      onClose();
    } catch (err) {
      toast.error("Xatolik yuz berdi", { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!show) return null;

  const totalAmount = cart.reduce((sum, item) => sum + item.revenue, 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-2xl glass-card p-6 bg-[#1e293b] max-h-[90vh] flex flex-col"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-xl text-white">Qo'lda sotuv qo'shish</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-6 flex-1 overflow-hidden">
            {/* Left side: Product Search */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="text"
                  placeholder="Mahsulot qidirish..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                {filteredProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition flex justify-between items-center group"
                  >
                    <div className="text-left">
                      <p className="font-bold text-sm">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.category} | {p.sell_price.toLocaleString()} UZS</p>
                    </div>
                    <Plus size={18} className="text-indigo-400 group-hover:scale-125 transition" />
                  </button>
                ))}
              </div>
            </div>

            {/* Right side: Cart */}
            <div className="w-full md:w-72 bg-black/20 rounded-2xl p-4 flex flex-col overflow-hidden">
              <h4 className="font-bold text-sm mb-4 flex items-center">
                <ShoppingCart size={16} className="mr-2 text-indigo-400" />
                Savat ({cart.length})
              </h4>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-hide">
                {cart.map(item => (
                  <div key={item.product_id} className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <div className="flex justify-between font-bold mb-2">
                      <span className="text-slate-100">{item.name}</span>
                      <button onClick={() => removeFromCart(item.product_id)} className="text-red-400/50 hover:text-red-400 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center bg-black/30 rounded-lg p-1">
                        <button onClick={() => updateQuantity(item.product_id, -1)} className="p-1.5 hover:bg-white/10 rounded-md transition">
                          <Minus size={14} />
                        </button>
                        <span className="px-3 font-mono font-bold text-indigo-400">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product_id, 1)} className="p-1.5 hover:bg-white/10 rounded-md transition">
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="font-black text-white">{item.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                {cart.length === 0 && (
                  <p className="text-center text-slate-500 text-xs py-10 italic">Savat bo'sh</p>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex justify-between items-end mb-4">
                  <span className="text-xs text-slate-400">Jami:</span>
                  <span className="text-lg font-black text-white">{totalAmount.toLocaleString()} UZS</span>
                </div>
                <button
                  onClick={handleSell}
                  disabled={isSubmitting || cart.length === 0}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={20} /><span>Sotish</span></>}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AddSaleModal;
