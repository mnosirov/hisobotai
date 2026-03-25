import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Crown, Shield, X, Calendar, CheckCircle, XCircle, Search, Clock, Award } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const AdminPanel = ({ API_BASE }) => {
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('users'); // 'users' or 'history'

  const [grantForm, setGrantForm] = useState({
    tier: 'standard',
    start_date: new Date().toISOString().split('T')[0],
    end_date: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchSubscriptions();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE}/admin/users`);
      setUsers(data);
    } catch (err) {
      toast.error("Foydalanuvchilarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/admin/subscriptions`);
      setSubscriptions(data);
    } catch (err) {
      console.error("Subscription history error", err);
    }
  };

  const handleGrant = async () => {
    if (!selectedUser || !grantForm.end_date) {
      toast.error("Barcha maydonlarni to'ldiring!");
      return;
    }

    const loadingToast = toast.loading("Obuna berilmoqda...");
    try {
      await axios.post(`${API_BASE}/admin/subscription`, {
        user_id: selectedUser.id,
        tier: grantForm.tier,
        start_date: new Date(grantForm.start_date).toISOString(),
        end_date: new Date(grantForm.end_date).toISOString()
      });
      toast.success("Obuna muvaffaqiyatli berildi!", { id: loadingToast });
      setShowGrantModal(false);
      setSelectedUser(null);
      setGrantForm({ tier: 'standard', start_date: new Date().toISOString().split('T')[0], end_date: '' });
      fetchUsers();
      fetchSubscriptions();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Xatolik yuz berdi", { id: loadingToast });
    }
  };

  const handleRevoke = async (userId, username) => {
    if (!confirm(`${username} obunasini bekor qilmoqchimisiz?`)) return;
    
    const loadingToast = toast.loading("Bekor qilinmoqda...");
    try {
      await axios.delete(`${API_BASE}/admin/subscription/${userId}`);
      toast.success("Obuna bekor qilindi", { id: loadingToast });
      fetchUsers();
    } catch (err) {
      toast.error("Xatolik", { id: loadingToast });
    }
  };

  const tierBadge = (tier, isActive) => {
    const styles = {
      free: 'bg-slate-700/50 text-slate-400 border-slate-600/50',
      standard: isActive ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-slate-700/50 text-slate-400 border-slate-600/50',
      premium: isActive ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-700/50 text-slate-400 border-slate-600/50'
    };
    const icons = {
      free: null,
      standard: <Shield size={12} />,
      premium: <Crown size={12} />
    };
    const labels = { free: 'Bepul', standard: 'Standart', premium: 'Premium' };
    
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${styles[tier]}`}>
        {icons[tier]} {labels[tier]}
        {!isActive && tier !== 'free' && <span className="text-red-400 ml-1">(muddati o'tgan)</span>}
      </span>
    );
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  return (
    <motion.div
      key="admin"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="text-indigo-400" size={24} />
            Admin Panel
          </h2>
          <p className="text-slate-400 text-sm mt-1">Foydalanuvchilar va obunalarni boshqaring</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveView('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeView === 'users' 
              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' 
              : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
          }`}
        >
          <Users size={16} /> Foydalanuvchilar ({users.length})
        </button>
        <button
          onClick={() => setActiveView('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeView === 'history' 
              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' 
              : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
          }`}
        >
          <Clock size={16} /> To'lov tarixi ({subscriptions.length})
        </button>
      </div>

      {/* Users View */}
      {activeView === 'users' && (
        <>
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Qidirish (ism yoki email)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
            />
          </div>

          {/* Users List */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((u) => (
                <motion.div
                  key={u.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-card p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{u.username}</span>
                        {u.is_admin === 1 && (
                          <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 text-[10px] font-bold uppercase">Admin</span>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs mt-0.5">{u.email}</p>
                    </div>
                    {tierBadge(u.subscription_tier, u.is_active)}
                  </div>
                  
                  {u.subscription_tier !== 'free' && (
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> {formatDate(u.subscription_start)} — {formatDate(u.subscription_end)}
                      </span>
                      {u.is_active ? (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle size={12} /> Aktiv
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400">
                          <XCircle size={12} /> Muddati o'tgan
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { setSelectedUser(u); setShowGrantModal(true); }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 text-xs font-semibold hover:bg-indigo-500/30 transition border border-indigo-500/20"
                    >
                      <Award size={14} /> Obuna berish
                    </button>
                    {u.subscription_tier !== 'free' && (
                      <button
                        onClick={() => handleRevoke(u.id, u.username)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition border border-red-500/20"
                      >
                        <XCircle size={14} /> Bekor qilish
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-center text-slate-500 py-8">Foydalanuvchi topilmadi</p>
              )}
            </div>
          )}
        </>
      )}

      {/* History View */}
      {activeView === 'history' && (
        <div className="space-y-3">
          {subscriptions.length === 0 ? (
            <p className="text-center text-slate-500 py-8">To'lov tarixi yo'q</p>
          ) : (
            subscriptions.map((s) => (
              <div key={s.id} className="glass-card p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">User #{s.user_id}</span>
                  {tierBadge(s.tier, true)}
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar size={12} /> {formatDate(s.start_date)} — {formatDate(s.end_date)}
                </p>
                <p className="text-[10px] text-slate-500">
                  Faollashtirilgan: {formatDate(s.created_at)}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Grant Subscription Modal */}
      <AnimatePresence>
        {showGrantModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowGrantModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-md glass-card p-6 space-y-5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Award className="text-indigo-400" size={20} />
                  Obuna berish
                </h3>
                <button onClick={() => setShowGrantModal(false)} className="text-slate-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              {selectedUser && (
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <p className="font-semibold text-white">{selectedUser.username}</p>
                  <p className="text-xs text-slate-400">{selectedUser.email}</p>
                </div>
              )}

              {/* Tier Selection */}
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-medium">Tarif</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setGrantForm({...grantForm, tier: 'standard'})}
                    className={`p-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition ${
                      grantForm.tier === 'standard'
                        ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <Shield size={16} /> Standart
                  </button>
                  <button
                    onClick={() => setGrantForm({...grantForm, tier: 'premium'})}
                    className={`p-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition ${
                      grantForm.tier === 'premium'
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <Crown size={16} /> Premium
                  </button>
                </div>
              </div>

              {/* Date Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Boshlanish sanasi</label>
                  <input
                    type="date"
                    value={grantForm.start_date}
                    onChange={(e) => setGrantForm({...grantForm, start_date: e.target.value})}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Tugash sanasi</label>
                  <input
                    type="date"
                    value={grantForm.end_date}
                    onChange={(e) => setGrantForm({...grantForm, end_date: e.target.value})}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              {/* Quick Duration Buttons */}
              <div className="flex gap-2">
                {[
                  { label: '1 oy', days: 30 },
                  { label: '3 oy', days: 90 },
                  { label: '6 oy', days: 180 },
                  { label: '1 yil', days: 365 }
                ].map(({ label, days }) => (
                  <button
                    key={days}
                    onClick={() => {
                      const start = new Date(grantForm.start_date);
                      const end = new Date(start);
                      end.setDate(end.getDate() + days);
                      setGrantForm({...grantForm, end_date: end.toISOString().split('T')[0]});
                    }}
                    className="flex-1 px-2 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs font-medium hover:bg-white/10 hover:text-white transition"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleGrant}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold text-sm hover:from-indigo-500 hover:to-blue-500 transition transform active:scale-[0.98]"
              >
                Obuna berish
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdminPanel;
