import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Plus, Calendar, Coffee, Zap, Home, Banknote, HelpCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const categoryIcons = {
  "Tushlik": <Coffee size={16} />,
  "Svet": <Zap size={16} />,
  "Ijara": <Home size={16} />,
  "Oylik": <Banknote size={16} />,
  "Boshqa": <HelpCircle size={16} />
};

const Expenses = ({ API_BASE, fetchDashboardData }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Tushlik');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/expenses`);
      setExpenses(data);
    } catch (e) {
      toast.error("Chiqimlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!amount) {
      toast.error("Summani kiriting");
      return;
    }
    
    const loadingToast = toast.loading("Saqlanmoqda...");
    try {
      await axios.post(`${API_BASE}/expenses`, {
        amount: parseFloat(amount),
        category,
        notes
      });
      
      toast.success("Chiqim qo'shildi", { id: loadingToast });
      setAmount('');
      setCategory('Tushlik');
      setNotes('');
      setShowAddModal(false);
      fetchExpenses();
      if(fetchDashboardData) fetchDashboardData();
    } catch (err) {
      toast.error("Xatolik yuz berdi", { id: loadingToast });
    }
  };

  const handleDelete = async (id) => {
    const loadingToast = toast.loading("O'chirilmoqda...");
    try {
      await axios.delete(`${API_BASE}/expenses/${id}`);
      toast.success("O'chirildi", { id: loadingToast });
      fetchExpenses();
      if(fetchDashboardData) fetchDashboardData();
    } catch (err) {
      toast.error("Xatolik yuz berdi", { id: loadingToast });
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-slate-500 text-sm">Yuklanmoqda...</div>;
  }

  return (
    <motion.div
      key="expenses"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 pt-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Chiqimlar</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition shadow-lg shadow-indigo-500/20"
        >
          <Plus size={16} />
          <span>Qo'shish</span>
        </button>
      </div>

      <div className="space-y-3">
        {expenses.length === 0 ? (
          <div className="text-center py-10 glass-card">
            <p className="text-slate-500 text-sm">Hech qanday chiqim topilmadi.</p>
          </div>
        ) : (
          expenses.map(expense => (
            <div key={expense.id} className="glass-card p-4 flex items-center justify-between group">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                  {categoryIcons[expense.category] || categoryIcons["Boshqa"]}
                </div>
                <div>
                  <h3 className="font-bold text-sm">{expense.category}</h3>
                  <div className="flex items-center text-[10px] text-slate-500 mt-1 space-x-2">
                    <span className="flex items-center"><Calendar size={10} className="mr-1" /> {new Date(expense.created_at).toLocaleDateString('uz-UZ')}</span>
                    {expense.notes && <span>• {expense.notes}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="font-bold text-rose-400">
                  -{expense.amount.toLocaleString('uz-UZ')} UZS
                </span>
                <button
                  onClick={() => handleDelete(expense.id)}
                  className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition"
                  title="O'chirish"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1e293b] rounded-2xl w-full max-w-sm border border-white/10 shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
              <h3 className="font-bold text-lg">Yangi chiqim</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white transition">✕</button>
            </div>
            
            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Summa (UZS)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition"
                  placeholder="Masalan: 50000"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Kategoriya</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="Tushlik">Tushlik</option>
                  <option value="Svet">Elektr energiyasi (Svet)</option>
                  <option value="Ijara">Ijara</option>
                  <option value="Oylik">Oylik maosh</option>
                  <option value="Boshqa">Boshqa xarajat</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Izoh (ixtiyoriy)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition"
                  placeholder="Qo'shimcha ma'lumot..."
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-indigo-500/20"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default Expenses;
