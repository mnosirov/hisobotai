import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, RefreshCw, Archive, ShoppingBag, CreditCard, Users, Banknote, Clock } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const Trash = ({ API_BASE, fetchDashboardData, fetchInventoryData }) => {
  const [trashItems, setTrashItems] = useState({
    products: [],
    sales: [],
    expenses: [],
    suppliers: [],
    debts: []
  });
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('products');

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/trash`);
      setTrashItems(data);
    } catch (err) {
      toast.error("Savatni yuklashda xatolik!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleRestore = async (type, id) => {
    const loadingToast = toast.loading("Qayta tiklanmoqda...");
    try {
      await axios.post(`${API_BASE}/trash/${type}/${id}/restore`);
      toast.success("Muvaffaqiyatli tiklandi!", { id: loadingToast });
      fetchTrash();
      if (type === 'product') fetchInventoryData();
      fetchDashboardData();
    } catch (err) {
      toast.error("Tiklashda xatolik yuz berdi", { id: loadingToast });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleString('uz-UZ', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const tabs = [
    { id: 'products', label: 'Mahsulotlar', icon: <ShoppingBag size={16} /> },
    { id: 'sales', label: 'Sotuvlar', icon: <CreditCard size={16} /> },
    { id: 'expenses', label: 'Chiqimlar', icon: <Banknote size={16} /> },
    { id: 'suppliers', label: 'Ta\'minotchilar', icon: <Users size={16} /> },
    { id: 'debts', label: 'Qarzlar', icon: <Clock size={16} /> }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Trash2 className="text-red-400" size={24} />
            Savat
          </h2>
          <p className="text-slate-400 text-xs">O'chirilgan ma'lumotlarni qayta tiklashingiz mumkin</p>
        </div>
        <button 
          onClick={fetchTrash}
          className="p-2 glass-card hover:bg-indigo-500/10 transition-colors"
        >
          <RefreshCw size={18} className={loading ? "animate-spin text-indigo-400" : "text-slate-400"} />
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
              activeSubTab === tab.id 
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
              activeSubTab === tab.id ? 'bg-white/20' : 'bg-slate-700'
            }`}>
              {trashItems[tab.id]?.length || 0}
            </span>
          </button>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500"></div>
            <p className="text-slate-500 text-sm">Yuklanmoqda...</p>
          </div>
        ) : trashItems[activeSubTab]?.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center">
              <Archive className="text-slate-600" size={32} />
            </div>
            <div>
              <p className="text-slate-300 font-medium">Savat bo'sh</p>
              <p className="text-slate-500 text-xs mt-1">Hozircha hech narsa o'chirilmagan</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {trashItems[activeSubTab].map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate text-slate-200">
                    {item.name || item.customer || (item.category ? `${item.category}: ${item.amount}` : `Sotuv: ${item.amount}`)}
                  </h3>
                  
                  {/* Show products if it's a sale */}
                  {item.type === 'sale' && item.items_json && (
                    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                      {item.items_json.map((p, idx) => (
                        <span key={idx} className="text-[9px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
                          {p.product} ({p.quantity} ta)
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock size={10} />
                      {formatDate(item.deleted_at)}
                    </span>
                    {item.amount && (
                      <span className="text-[10px] text-indigo-400 font-mono">
                        {item.amount.toLocaleString()} UZS
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRestore(item.type, item.id)}
                  className="ml-4 p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl hover:bg-indigo-500 hover:text-white transition-all group"
                  title="Qayta tiklash"
                >
                  <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
        <p className="text-[10px] text-amber-400/80 leading-relaxed italic">
          * Savatdagi ma'lumotlar serverda xavfsiz saqlanadi. Istalgan vaqtda ularni qayta tiklashingiz mumkin.
        </p>
      </div>
    </motion.div>
  );
};

export default Trash;
