import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, History, CheckCircle, Clock, ChevronRight, Search } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const SupplierDebts = ({ API_BASE, fetchDashboardData }) => {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [selectedDebt, setSelectedDebt] = useState(null);

  const fetchDebts = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/suppliers/debts`);
      setDebts(data);
    } catch (e) {
      toast.error("Qarzlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebts();
  }, []);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!selectedDebt || !payAmount) return;

    const loadingToast = toast.loading("To'lov qilinmoqda...");
    try {
      const formData = new FormData();
      formData.append('amount', payAmount);
      await axios.post(`${API_BASE}/suppliers/debts/${selectedDebt.id}/pay`, formData);
      toast.success("To'lov muvaffaqiyatli amalga oshirildi", { id: loadingToast });
      setSelectedDebt(null);
      setPayAmount("");
      fetchDebts();
      fetchDashboardData();
    } catch (err) {
      toast.error("Xatolik yuz berdi", { id: loadingToast });
    }
  };

  const filteredDebts = debts.filter(d => 
    d.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pt-4">
      {/* Search and Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <CreditCard className="text-red-400" />
            Do'konlardan qarzlar
          </h2>
          <p className="text-slate-400 text-sm">Yetkazib beruvchilar oldidagi jami qarzdorliklar</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text"
            placeholder="Do'kon nomi bo'yicha qidirish..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : filteredDebts.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <CheckCircle className="mx-auto text-emerald-400 mb-4" size={48} />
          <h3 className="text-lg font-bold text-white">Qarzlar yo'q!</h3>
          <p className="text-slate-400">Hozirda barcha do'konlar bilan hisob-kitoblar joyida.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredDebts.map((debt) => (
            <motion.div 
              key={debt.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-5 group hover:bg-white/5 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${debt.remaining_amount === 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    <Clock size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {debt.supplier?.name}
                    </h4>
                    <p className="text-sm text-slate-400 line-clamp-1">{debt.notes}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      <span>{new Date(debt.created_at).toLocaleDateString('uz-UZ')}</span>
                      <span>•</span>
                      <span className={debt.remaining_amount === 0 ? 'text-emerald-500' : 'text-red-500'}>
                        {debt.remaining_amount === 0 ? 'To\'langan' : 'To\'lanmagan'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-white">
                    {debt.remaining_amount.toLocaleString('uz-UZ')} <span className="text-[10px] font-normal text-slate-400">UZS</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Umumiy: {debt.total_amount.toLocaleString()} UZS</p>
                  {debt.remaining_amount > 0 && (
                    <button 
                      onClick={() => setSelectedDebt(debt)}
                      className="mt-3 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all active:scale-95"
                    >
                      To'lash
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pay Debt Modal */}
      <AnimatePresence>
        {selectedDebt && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm glass-card p-8 bg-[#1e293b]"
            >
              <h3 className="text-xl font-bold text-white mb-2">Qarzni yopish</h3>
              <p className="text-slate-400 text-sm mb-6">
                <span className="font-bold text-indigo-400">{selectedDebt.supplier?.name}</span> oldidagi qarzni to'lash.
              </p>
              
              <form onSubmit={handlePay} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">To'lov miqdori (UZS)</label>
                  <input 
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder={selectedDebt.remaining_amount.toString()}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-indigo-500"
                    autoFocus
                  />
                  <div className="flex justify-between mt-2">
                    <button 
                      type="button"
                      onClick={() => setPayAmount(selectedDebt.remaining_amount)}
                      className="text-[10px] text-indigo-400 font-bold hover:underline"
                    >
                      Hammasini to'lash
                    </button>
                    <span className="text-[10px] text-slate-500">Qoldiq: {selectedDebt.remaining_amount.toLocaleString()} UZS</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setSelectedDebt(null)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition"
                  >
                    Bekor qilish
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-500/20"
                  >
                    Tasdiqlash
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SupplierDebts;
