import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, ShoppingBag, Banknote, PackageOpen, Trash2, Clock, BarChart3, TrendingUp, PieChart, Layers, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const DailyArchive = ({ API_BASE, fetchDashboardData, fetchInventoryData }) => {
  const getLocalDate = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const [viewType, setViewType] = useState('daily'); // 'daily' or 'monthly'
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [report, setReport] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const dateInputRef = useRef(null);

  useEffect(() => {
    if (viewType === 'daily') {
      fetchDailyReport(selectedDate);
    } else {
      fetchMonthlyReport(selectedYear, selectedMonth);
    }
  }, [selectedDate, selectedMonth, selectedYear, viewType]);

  const fetchDailyReport = async (dateStr) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/reports/daily?date=${dateStr}&t=${Date.now()}`);
      setReport(data);
    } catch (err) {
      console.error("Report fetch error", err);
      toast.error("Kunlik hisobotni yuklashda xatolik");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyReport = async (year, month) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/reports/monthly?year=${year}&month=${month}&t=${Date.now()}`);
      setMonthlyReport(data);
    } catch (err) {
      console.error("Monthly report fetch error", err);
      toast.error("Oylik hisobotni yuklashda xatolik");
      setMonthlyReport(null);
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

  const changeMonth = (delta) => {
    let newMonth = selectedMonth + delta;
    let newYear = selectedYear;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const formatDateDisplay = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const [selectedImage, setSelectedImage] = useState(null);

  const months = [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
    "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"
  ];

  const ImageModal = ({ url, onClose }) => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl w-full h-auto max-h-[90vh] flex items-center justify-center"
      >
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white transition"
        >
          <X size={32} />
        </button>
        <img 
          src={url} 
          alt="Preview" 
          className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl border border-white/10 object-contain"
        />
      </motion.div>
    </motion.div>
  );

  const StatCard = ({ title, value, icon: Icon, color, subValue }) => (
    <div className="glass-card p-4 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
        <Icon size={48} />
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <p className={`text-xl font-black ${color}`}>{value.toLocaleString()} <span className="text-[10px] opacity-70">UZS</span></p>
      {subValue && <p className="text-[10px] text-slate-500 mt-1">{subValue}</p>}
    </div>
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-6 pt-4 pb-10"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="text-indigo-400" size={24} />
            <h2 className="text-xl font-bold">Xotira (Arxiv)</h2>
          </div>
          
          <div className="flex bg-slate-800/50 p-1 rounded-xl border border-white/5">
            <button 
              onClick={() => setViewType('daily')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${viewType === 'daily' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Kunlik
            </button>
            <button 
              onClick={() => setViewType('monthly')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${viewType === 'monthly' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Oylik
            </button>
          </div>
        </div>

      {/* Date/Month Navigator */}
      <div className="glass-card p-4 flex items-center justify-between bg-slate-800/80">
        <button 
          onClick={() => viewType === 'daily' ? changeDate(-1) : changeMonth(-1)}
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-700/50 hover:bg-slate-700 transition"
        >
          <ChevronLeft size={20} />
        </button>
        
        <div className="text-center flex-1">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">
            {viewType === 'daily' ? 'Tanlangan Sana' : 'Tanlangan Oy'}
          </p>
          <p className="text-lg font-black text-white">
            {viewType === 'daily' ? formatDateDisplay(selectedDate) : `${months[selectedMonth - 1]}, ${selectedYear}`}
          </p>
        </div>

        <button 
          onClick={() => viewType === 'daily' ? changeDate(1) : changeMonth(1)}
          disabled={viewType === 'daily' && selectedDate === getLocalDate()}
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-700/50 hover:bg-slate-700 transition disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-indigo-500"></div>
        </div>
      ) : viewType === 'daily' && report ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard title="Kunlik Savdo" value={report.summary.total_sales_revenue} icon={ShoppingBag} color="text-emerald-400" subValue={`${report.summary.sales_count} ta sotuv`} />
            <StatCard title="Sof Foyda" value={report.summary.total_sales_profit} icon={TrendingUp} color="text-indigo-400" subValue="Xarajatlarsiz" />
            <StatCard title="Xarajat (Chiqim)" value={report.summary.total_expenses} icon={Banknote} color="text-red-400" />
            <StatCard title="Kirim Summasi" value={report.summary.total_purchases_cost} icon={BarChart3} color="text-amber-400" subValue="Skladga kirim summasi" />
            <StatCard title="Net Kassa" value={report.summary.net_cash_flow} icon={Layers} color="text-amber-400" subValue="Savdo - Chiqim - Qarz to'lovi" />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <PackageOpen size={18} className="text-slate-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Sotilgan Mahsulotlar</h3>
            </div>
            <div className="glass-card divide-y divide-white/5 overflow-hidden">
              {report.sold_items.length === 0 ? (
                <div className="p-10 text-center text-slate-500 text-xs font-medium">Bu kunda savdo bo'lmagan.</div>
              ) : (
                report.sold_items.map((item, idx) => (
                  <div key={idx} className="p-4 flex items-center gap-4 hover:bg-white/5 transition">
                    <div 
                      onClick={() => item.image_url && setSelectedImage(item.image_url)}
                      className={`h-12 w-12 rounded-lg bg-slate-700/50 flex-shrink-0 overflow-hidden border border-white/5 ${item.image_url ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
                    >
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-500">
                          <PackageOpen size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {item.quantity} dona • Foyda: {item.profit.toLocaleString()} UZS
                        {item.supplier_name && <span className="text-slate-400"> • {item.supplier_name}</span>}
                      </p>
                    </div>
                    <p className="text-sm font-black text-emerald-400">{item.revenue.toLocaleString()} <span className="text-[10px] opacity-50">UZS</span></p>
                  </div>
                ))
              )}
            </div>
          </div>

          {report.purchases?.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <BarChart3 size={18} className="text-slate-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Kirimlar (Sklad)</h3>
              </div>
              <div className="glass-card divide-y divide-white/5 overflow-hidden">
                {report.purchases.map((p, idx) => (
                  <div key={idx} className="p-4 flex items-center gap-4 hover:bg-white/5 transition">
                    <div 
                      onClick={() => p.image_url && setSelectedImage(p.image_url)}
                      className={`h-12 w-12 rounded-lg bg-slate-700/50 flex-shrink-0 overflow-hidden border border-white/5 ${p.image_url ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
                    >
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-500">
                          <PackageOpen size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{p.name}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                        <p className="text-[10px] text-slate-400">
                          <span className="font-bold text-slate-300">{p.quantity}</span> dona • {p.time}
                        </p>
                        <p className="text-[10px] text-indigo-400 font-medium">
                          Do'kon: <span className="text-slate-300">{p.supplier_name}</span>
                        </p>
                        <p className="text-[10px] text-amber-500/80 font-medium">
                          Narx: <span className="text-slate-300">{p.price?.toLocaleString()}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-amber-400">{p.cost.toLocaleString()}</p>
                      <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">UZS</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : viewType === 'monthly' && monthlyReport ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard title="Oylik Savdo" value={monthlyReport.summary.total_revenue} icon={ShoppingBag} color="text-emerald-400" subValue={`${monthlyReport.summary.sales_count} ta sotuv`} />
            <StatCard title="Oylik Foyda" value={monthlyReport.summary.total_profit} icon={TrendingUp} color="text-indigo-400" subValue="Savdo - Tannarx" />
            <StatCard title="Oylik Xarajat" value={monthlyReport.summary.total_expenses} icon={Banknote} color="text-red-400" />
            <StatCard title="Net Foyda" value={monthlyReport.summary.net_profit} icon={PieChart} color="text-indigo-400" subValue="Foyda - Xarajat" />
            <StatCard title="Kirim Summasi" value={monthlyReport.summary.total_purchases_cost} icon={BarChart3} color="text-amber-400" subValue="Skladga kirim summasi" />
            <StatCard title="Qarz To'lovi" value={monthlyReport.summary.total_payments_made} icon={Layers} color="text-rose-400" />
            <StatCard title="Net Kassa" value={monthlyReport.summary.net_cash_flow} icon={Banknote} color="text-amber-400" subValue="Savdo - Xarajat - Qarz To'lovi" />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <PackageOpen size={18} className="text-slate-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Eng Ko'p Sotilganlar</h3>
            </div>
            <div className="glass-card divide-y divide-white/5 overflow-hidden">
              {monthlyReport.sold_items.length === 0 ? (
                <div className="p-10 text-center text-slate-500 text-xs font-medium">Bu oyda savdo bo'lmagan.</div>
              ) : (
                monthlyReport.sold_items.map((item, idx) => (
                  <div key={idx} className="p-4 flex items-center gap-4 hover:bg-white/5 transition">
                    <div 
                      onClick={() => item.image_url && setSelectedImage(item.image_url)}
                      className={`h-12 w-12 rounded-lg bg-slate-700/50 flex-shrink-0 overflow-hidden border border-white/5 ${item.image_url ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
                    >
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-500">
                          <PackageOpen size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {item.quantity} dona • Foyda: {item.profit.toLocaleString()} UZS
                        {item.supplier_name && <span className="text-slate-400"> • {item.supplier_name}</span>}
                      </p>
                    </div>
                    <p className="text-sm font-black text-emerald-400">{item.revenue.toLocaleString()} <span className="text-[10px] opacity-50">UZS</span></p>
                  </div>
                ))
              )}
            </div>
          </div>

          {monthlyReport.expenses_by_category?.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <PieChart size={18} className="text-slate-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Xarajatlar Tahlili</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {monthlyReport.expenses_by_category.map((ex, idx) => (
                  <div key={idx} className="glass-card p-3 flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">{ex.category}</p>
                    <p className="text-sm font-bold text-red-400">{ex.amount.toLocaleString()} UZS</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {monthlyReport.purchases?.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <BarChart3 size={18} className="text-slate-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Kirimlar Tarixi (Sklad)</h3>
              </div>
              <div className="glass-card divide-y divide-white/5 overflow-hidden">
                {monthlyReport.purchases.map((p, idx) => (
                  <div key={idx} className="p-4 flex items-center gap-4 hover:bg-white/5 transition">
                    <div 
                      onClick={() => p.image_url && setSelectedImage(p.image_url)}
                      className={`h-12 w-12 rounded-lg bg-slate-700/50 flex-shrink-0 overflow-hidden border border-white/5 ${p.image_url ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
                    >
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-500">
                          <PackageOpen size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{p.name}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                        <p className="text-[10px] text-slate-400">
                          <span className="font-bold text-slate-300">{p.quantity}</span> dona • {p.date} {p.time}
                        </p>
                        <p className="text-[10px] text-indigo-400 font-medium">
                          Do'kon: <span className="text-slate-300">{p.supplier_name}</span>
                        </p>
                        <p className="text-[10px] text-amber-500/80 font-medium">
                          Narx: <span className="text-slate-300">{p.price?.toLocaleString()}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-amber-400">{p.cost.toLocaleString()}</p>
                      <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">UZS</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
      </motion.div>

      <AnimatePresence>
        {selectedImage && (
          <ImageModal url={selectedImage} onClose={() => setSelectedImage(null)} />
        )}
      </AnimatePresence>
    </>
  );
};

export default DailyArchive;

