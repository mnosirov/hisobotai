import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, ShoppingBag, Banknote, PackageOpen, Trash2, Clock } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const DailyArchive = ({ API_BASE, fetchDashboardData, fetchInventoryData }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDailyReport(selectedDate);
  }, [selectedDate]);

  const fetchDailyReport = async (dateStr) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/reports/daily?date=${dateStr}&t=${Date.now()}`);
      setReport(data);
    } catch (err) {
      console.error("Report fetch error", err);
      toast.error("Hisobotni yuklashda xatolik yuz berdi");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSale = async (saleId) => {
    if (!window.confirm("Ushbu sotuvni o'chirmoqchimisiz? Mahsulot qoldig'i qayta tiklanadi.")) return;
    const loadingToast = toast.loading("O'chirilmoqda...");
    try {
      await axios.delete(`${API_BASE}/sales/${saleId}`);
      toast.success("Sotuv o'chirildi!", { id: loadingToast });
      fetchDailyReport(selectedDate);
      if (fetchDashboardData) fetchDashboardData();
      if (fetchInventoryData) fetchInventoryData();
    } catch (err) {
      toast.error("Xatolik yuz berdi", { id: loadingToast });
    }
  };

  const changeDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const formatDateDisplay = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 pt-4 pb-10"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Calendar className="text-indigo-400" size={24} />
          <h2 className="text-xl font-bold">Kunlik Xotira (Arxiv)</h2>
        </div>
      </div>

      {/* Date Navigator */}
      <div className="glass-card p-4 flex items-center justify-between bg-slate-800/80">
        <button 
          onClick={() => changeDate(-1)}
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-700/50 hover:bg-slate-700 transition"
        >
          <ChevronLeft size={20} />
        </button>
        
        <div className="text-center flex-1">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Tanlangan Sana</p>
          <p className="text-lg font-black text-white">{formatDateDisplay(selectedDate)}</p>
        </div>

        <button 
          onClick={() => changeDate(1)}
          disabled={selectedDate === new Date().toISOString().slice(0, 10)}
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-700/50 hover:bg-slate-700 transition disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Quick Select Buttons */}
      <div className="flex space-x-2 overflow-x-auto scrollbar-hide pb-2">
        <button 
          onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
          className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition ${selectedDate === new Date().toISOString().slice(0, 10) ? 'bg-indigo-600 text-white' : 'glass-card text-slate-400'}`}
        >
          Bugun
        </button>
        <button 
          onClick={() => {
            const d = new Date(); d.setDate(d.getDate() - 1);
            setSelectedDate(d.toISOString().slice(0, 10));
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition ${selectedDate === new Date(Date.now() - 86400000).toISOString().slice(0, 10) ? 'bg-indigo-600 text-white' : 'glass-card text-slate-400'}`}
        >
          Kecha
        </button>
        <div className="relative shrink-0">
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => { if(e.target.value) setSelectedDate(e.target.value) }}
            max={new Date().toISOString().slice(0, 10)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full"
          />
          <button className="px-4 py-2 rounded-xl text-xs font-bold glass-card text-slate-400 flex items-center gap-2">
            <Calendar size={14} /> Boshqa sana...
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-indigo-500"></div>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="glass-card p-4 bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-emerald-400/70 text-[10px] font-bold uppercase">Kungi Sof Foyda</span>
              <p className="text-xl font-black text-emerald-400 mt-1">{(report.summary.total_sales_profit - report.summary.total_expenses).toLocaleString()} UZS</p>
            </div>
            <div className="glass-card p-4 bg-indigo-500/10 border border-indigo-500/20">
              <span className="text-indigo-400/70 text-[10px] font-bold uppercase">Jami Savdo (Tushum)</span>
              <p className="text-xl font-black text-indigo-400 mt-1">{report.summary.total_sales_revenue.toLocaleString()} UZS</p>
              <p className="text-[9px] text-indigo-400/60 mt-1">{report.summary.sales_count} ta tranzaksiya</p>
            </div>
            <div className="glass-card p-4 bg-red-500/10 border border-red-500/20">
              <span className="text-red-400/70 text-[10px] font-bold uppercase">Kungi Chiqimlar</span>
              <p className="text-xl font-black text-red-400 mt-1">{report.summary.total_expenses.toLocaleString()} UZS</p>
            </div>
            <div className="glass-card p-4 bg-orange-500/10 border border-orange-500/20">
              <span className="text-orange-400/70 text-[10px] font-bold uppercase">Kelgan Mollar (Xarid)</span>
              <p className="text-xl font-black text-orange-400 mt-1">{report.summary.total_purchases_cost.toLocaleString()} UZS</p>
            </div>
          </div>

          {/* Sales Transactions (Individual) */}
          {report.sales_transactions && report.sales_transactions.length > 0 && (
            <div className="glass-card overflow-hidden">
              <div className="p-4 bg-white/5 border-b border-white/5 flex items-center space-x-2">
                <Clock size={18} className="text-indigo-400" />
                <h3 className="font-bold text-sm">Savdo Tranzaksiyalari</h3>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold ml-auto">{report.sales_transactions.length} ta</span>
              </div>
              <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
                {report.sales_transactions.map((sale) => (
                  <div key={sale.id} className="p-4 hover:bg-white/5 transition">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-400">
                          {getTime(sale.created_at)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-100">{sale.items_json.length} xil mahsulot</p>
                          <p className="text-[10px] text-slate-500">Sotuv #{sale.id.toString().slice(-4)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="text-sm font-black text-emerald-400">+{sale.total_amount.toLocaleString()}</p>
                          <p className="text-[10px] text-slate-500">Foyda: {sale.profit.toLocaleString()}</p>
                        </div>
                        <button 
                          onClick={() => handleDeleteSale(sale.id)}
                          className="h-9 w-9 shrink-0 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center transition hover:bg-red-500/20 active:scale-90"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="flex space-x-4 overflow-x-auto scrollbar-hide">
                      {sale.items_json.map((item, idx) => (
                        <div key={idx} className="shrink-0">
                          <span className="text-[11px] font-bold text-slate-300">{item.product}</span>
                          <span className="text-[9px] text-slate-500 ml-1">{item.quantity} ta | {(item.revenue || 0).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sold Items Summary */}
            <div className="glass-card overflow-hidden">
              <div className="p-4 bg-white/5 border-b border-white/5 flex items-center space-x-2">
                <ShoppingBag size={18} className="text-indigo-400" />
                <h3 className="font-bold text-sm">Sotilgan Mahsulotlar (Jami)</h3>
              </div>
              <div className="p-0 max-h-[300px] overflow-y-auto">
                {report.sold_items.length === 0 ? (
                  <p className="p-6 text-center text-sm text-slate-500">Bu kunda savdo bo'lmagan.</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-800/50 text-[10px] uppercase text-slate-400 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Nomi</th>
                        <th className="px-4 py-2 font-semibold text-center">Soni</th>
                        <th className="px-4 py-2 font-semibold text-right">Summa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {report.sold_items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-white/5 transition">
                          <td className="px-4 py-3 font-medium text-slate-300">{item.name}</td>
                          <td className="px-4 py-3 text-center text-slate-400">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-emerald-400 font-bold">{item.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Expenses and Purchases */}
            <div className="space-y-6">
              {/* Expenses List */}
              <div className="glass-card overflow-hidden">
                <div className="p-4 bg-white/5 border-b border-white/5 flex items-center space-x-2">
                  <Banknote size={18} className="text-red-400" />
                  <h3 className="font-bold text-sm">Qilingan Chiqimlar</h3>
                </div>
                <div className="p-0 max-h-[200px] overflow-y-auto">
                  {report.expenses.length === 0 ? (
                    <p className="p-4 text-center text-xs text-slate-500">Chiqimlar yo'q.</p>
                  ) : (
                    <ul className="divide-y divide-white/5">
                      {report.expenses.map((exp, idx) => (
                        <li key={idx} className="p-3 flex justify-between items-center hover:bg-white/5 transition">
                          <div>
                            <p className="text-sm font-bold text-slate-300">{exp.category}</p>
                            {exp.notes && <p className="text-[10px] text-slate-500">{exp.notes}</p>}
                          </div>
                          <span className="text-red-400 font-bold text-sm">-{exp.amount.toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Purchases List */}
              <div className="glass-card overflow-hidden">
                <div className="p-4 bg-white/5 border-b border-white/5 flex items-center space-x-2">
                  <PackageOpen size={18} className="text-orange-400" />
                  <h3 className="font-bold text-sm">Omborga Kirim (Xaridlar)</h3>
                </div>
                <div className="p-0 max-h-[200px] overflow-y-auto">
                  {report.purchases.length === 0 ? (
                    <p className="p-4 text-center text-xs text-slate-500">Kirim bo'lmagan.</p>
                  ) : (
                    <ul className="divide-y divide-white/5">
                      {report.purchases.map((inv, idx) => (
                        <li key={idx} className="p-3 flex justify-between items-center hover:bg-white/5 transition">
                          <div>
                            <p className="text-sm font-bold text-slate-300">{inv.name}</p>
                            <p className="text-[10px] text-slate-500">{inv.quantity} ta qo'shilgan</p>
                          </div>
                          <span className="text-orange-400 font-bold text-sm">{inv.cost.toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
};

export default DailyArchive;
