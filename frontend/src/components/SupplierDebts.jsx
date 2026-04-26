import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, History, CheckCircle, Clock, ChevronRight, Search, ChevronDown, ChevronUp, Store } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const SupplierDebts = ({ API_BASE, fetchDashboardData }) => {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [expandedSuppliers, setExpandedSuppliers] = useState({});
  const [viewMode, setViewMode] = useState('debts'); // 'debts' or 'history'
  const [history, setHistory] = useState([]);

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

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/suppliers/payments/history`);
      setHistory(data);
    } catch (e) {
      toast.error("Tarixni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'debts') {
      fetchDebts();
    } else {
      fetchHistory();
    }
  }, [viewMode]);

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

  // Group debts by supplier
  const groupedDebts = debts.reduce((acc, debt) => {
    const supplierId = debt.supplier_id;
    const supplierName = debt.supplier?.name || "Noma'lum do'kon";
    
    if (!acc[supplierId]) {
      acc[supplierId] = {
        id: supplierId,
        name: supplierName,
        totalRemaining: 0,
        items: []
      };
    }
    
    acc[supplierId].totalRemaining += debt.remaining_amount;
    acc[supplierId].items.push(debt);
    return acc;
  }, {});

  const supplierList = Object.values(groupedDebts).filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpand = (id) => {
    setExpandedSuppliers(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="space-y-6 pt-4 pb-12">
      {/* Search and Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Store className="text-indigo-400" />
            Qarzlar va To'lovlar
          </h2>
          <div className="flex bg-white/5 p-1 rounded-xl mt-2 w-fit border border-white/10">
            <button 
              onClick={() => setViewMode('debts')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'debts' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              Hozirgi qarzlar
            </button>
            <button 
              onClick={() => setViewMode('history')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'history' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              To'lovlar tarixi
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text"
            placeholder={viewMode === 'debts' ? "Do'kon nomi..." : "Tarixdan qidirish..."}
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
      ) : viewMode === 'history' ? (
        /* History View */
        <div className="grid gap-3">
          {history.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <History className="mx-auto text-slate-500 mb-4" size={48} />
              <p className="text-slate-400">To'lovlar tarixi hali mavjud emas.</p>
            </div>
          ) : (
            history.filter(h => h.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase())).map((log) => (
              <motion.div 
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card p-4 flex items-center justify-between border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-sm">{log.supplier?.name}</h5>
                    <p className="text-[10px] text-slate-400">{log.notes}</p>
                    <p className="text-[10px] text-indigo-400 font-medium">{new Date(log.payment_date).toLocaleString('uz-UZ')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-emerald-400">
                    -{log.amount.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">UZS</span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      ) : supplierList.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <CheckCircle className="mx-auto text-emerald-400 mb-4" size={48} />
          <h3 className="text-lg font-bold text-white">Qarzlar yo'q!</h3>
          <p className="text-slate-400">Hozirda barcha do'konlar bilan hisob-kitoblar joyida.</p>
        </div>
      ) : (
        /* Debts View (Existing code) */
        <div className="grid gap-4">
          {supplierList.map((supplier) => (
            <div key={supplier.id} className="glass-card overflow-hidden border border-white/5">
              {/* Supplier Header */}
              <div 
                onClick={() => toggleExpand(supplier.id)}
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-all bg-white/[0.02]"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Store size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-white">{supplier.name}</h4>
                    <p className="text-xs text-slate-500">{supplier.items.length} ta xarid bo'yicha</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Umumiy qarz</p>
                    <div className="text-xl font-black text-rose-400">
                      {supplier.totalRemaining.toLocaleString('uz-UZ')} <span className="text-xs font-normal text-slate-500">UZS</span>
                    </div>
                  </div>
                  <div className="text-slate-500">
                    {expandedSuppliers[supplier.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
              </div>

              {/* Individual Debts List */}
              <AnimatePresence>
                {expandedSuppliers[supplier.id] && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/5 bg-black/20"
                  >
                    <div className="p-4 space-y-3">
                      {supplier.items.map((debt) => (
                        <div key={debt.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-all">
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${debt.remaining_amount === 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                              <Clock size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-200">{debt.notes}</p>
                              <p className="text-[10px] text-slate-500">{new Date(debt.created_at).toLocaleDateString('uz-UZ')}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-sm font-bold text-white">
                                {debt.remaining_amount.toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">UZS</span>
                              </div>
                            </div>
                            {debt.remaining_amount > 0 && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDebt(debt);
                                }}
                                className="px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white text-[10px] font-bold rounded-lg transition-all"
                              >
                                To'lash
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
                <span className="font-bold text-indigo-400">{selectedDebt.supplier?.name}</span> do'koniga to'lov qilish.
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
