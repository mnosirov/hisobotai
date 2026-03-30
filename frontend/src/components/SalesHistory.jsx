import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ShoppingBag, Trash2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const SalesHistory = ({ API_BASE, fetchInventoryData, fetchDashboardData }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/sales/history?t=${Date.now()}`);
      setHistory(data);
    } catch (err) {
      console.error("History fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (saleId) => {
    if (!window.confirm("Ushbu sotuvni o'chirmoqchimisiz? Bu amal mahsulot qoldiqlarini qayta tiklaydi.")) return;

    const loadingToast = toast.loading("O'chirilmoqda...");
    try {
      await axios.delete(`${API_BASE}/sales/${saleId}`);
      toast.success("Sotuv o'chirildi", { id: loadingToast });
      
      // Refresh all data
      fetchHistory();
      if (fetchInventoryData) fetchInventoryData();
      if (fetchDashboardData) fetchDashboardData();
    } catch (err) {
      toast.error("Xatolik yuz berdi", { id: loadingToast });
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getTime = (dateStr) => {
    const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  };

  // Group by date
  const groupedHistory = history.reduce((groups, sale) => {
    const d = new Date(sale.created_at.endsWith('Z') ? sale.created_at : sale.created_at + 'Z');
    const dateKey = d.toLocaleDateString();
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(sale);
    return groups;
  }, {});

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-indigo-500"></div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 pt-4"
    >
      <div className="flex items-center space-x-3">
        <Calendar className="text-indigo-400" size={24} />
        <h2 className="text-2xl font-bold">Sotuvlar Tarixi</h2>
      </div>

      <div className="space-y-4">
        {Object.keys(groupedHistory).length === 0 && (
          <div className="text-center py-10 text-slate-500 text-sm">Hali sotuvlar amalga oshirilmagan.</div>
        )}
        
        {Object.entries(groupedHistory).map(([dateKey, sales]) => (
          <div key={dateKey} className="space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 mb-2">
              {formatDate(sales[0].created_at)}
            </h3>
            
            <div className="space-y-3">
              {sales.map((sale) => (
                <div key={sale.id} className="glass-card overflow-hidden group">
                  <div className="p-4 flex justify-between items-center bg-white/5 relative">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-bold">
                        {getTime(sale.created_at)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-100">
                          {sale.items_json.length} xil mahsulot
                        </p>
                        <p className="text-[10px] text-slate-500">Sotuv: #{sale.id.toString().slice(-4)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-black text-emerald-400">+{sale.total_amount.toLocaleString()} UZS</p>
                        <p className="text-[10px] text-slate-500">Foyda: {itemProfit(sale).toLocaleString()} UZS</p>
                      </div>
                      <button 
                        onClick={() => handleDelete(sale.id)}
                        className="h-8 w-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center transition-opacity hover:bg-red-500/20"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="px-4 py-2 border-t border-white/5 overflow-x-auto">
                    <div className="flex space-x-4 min-w-max">
                      {sale.items_json.map((item, idx) => (
                        <div key={idx} className="flex flex-col">
                          <span className="text-[11px] font-bold text-slate-300">{item.product}</span>
                          <span className="text-[9px] text-slate-500">{item.quantity} ta | {item.revenue.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// Helper to calculate total profit from items_json if not directly available (defensive)
const itemProfit = (sale) => {
  if (sale.profit) return sale.profit;
  return sale.items_json.reduce((sum, item) => sum + (item.profit || 0), 0);
};

export default SalesHistory;
