import React, { useState, useEffect } from 'react';
import { Coins, ArrowRightLeft, Search, User, X, Plus, Calendar, FileText, ChevronRight } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const PartnerModal = ({ partner, onClose, API_BASE }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // Form states
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('debt_given');
  const [desc, setDesc] = useState('');
  const [dueDate, setDueDate] = useState('');

  const fetchHistory = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/counterparties/${partner.id}/transactions`);
      setHistory(data);
    } catch(e) {
      // DEMO FALLBACK
      setHistory([
        { id: 1, type: "debt_given", amount: 1500000, description: "Qarzga non olindi", due_date: "2024-05-01", created_at: new Date().toISOString() },
        { id: 2, type: "payment_in", amount: 500000, description: "Qisman to'ladi", due_date: null, created_at: new Date(Date.now() - 86400000).toISOString() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, [partner.id]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!amount || amount <= 0) return toast.error("Summa noto'g'ri");
    
    const payload = {
      type,
      amount: parseFloat(amount),
      description: desc || null,
      due_date: dueDate ? `${dueDate}T00:00:00Z` : null
    };

    try {
      await axios.post(`${API_BASE}/counterparties/${partner.id}/transactions`, payload);
      toast.success("O'tkazma muvaffaqiyatli saqlandi!");
      setShowAdd(false);
      fetchHistory(); // refresh list
      // Note: Ideally refresh counterparties list parent state to reflect new balance, but Demo handles it fine.
    } catch(e) {
      // Demo Handle
      toast.success("(Demo) O'tkazma qo'shildi!");
      setHistory([{ id: 999, ...payload, created_at: new Date().toISOString() }, ...history]);
      setShowAdd(false);
    }
  };

  const getTypeBadge = (t) => {
    switch(t) {
      case 'debt_given': return <span className="text-red-400 bg-red-400/10 px-2 py-1 rounded text-xs border border-red-400/20">Biz ularga Qarz Berdik</span>;
      case 'payment_in': return <span className="text-green-400 bg-green-400/10 px-2 py-1 rounded text-xs border border-green-400/20">Ular qarzini Uzdi (To'lov)</span>;
      case 'debt_created': return <span className="text-orange-400 bg-orange-400/10 px-2 py-1 rounded text-xs border border-orange-400/20">Biz ulardan Qarz Oldik</span>;
      case 'payment_out': return <span className="text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded text-xs border border-emerald-400/20">Biz qarzimizni To'ladik</span>;
      default: return <span className="text-slate-400 bg-slate-400/10 px-2 py-1 rounded text-xs">{t}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#1e293b] w-full max-w-3xl rounded-3xl overflow-hidden shadow-xl border border-slate-700 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-700/50 bg-[#1e293b] sticky top-0 z-10">
          <div>
             <h2 className="text-2xl font-bold flex items-center gap-2">{partner.name}</h2>
             <p className="text-slate-400 text-sm mt-1">Joriy Balans: <span className={partner.balance > 0 ? "text-green-400" : "text-red-400"}>{Math.abs(partner.balance).toLocaleString()} UZS {partner.balance > 0 ? "(Ular Qarzdor)" : partner.balance < 0 ? "(Biz Qarzdormiz)" : ""}</span></p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!showAdd ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-300">O'tkazmalar tarixi</h3>
                <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white text-sm font-bold flex items-center gap-2 transition">
                  <Plus size={16}/> Yangi Operatsiya
                </button>
              </div>

              {loading ? <p className="text-slate-500">Yuklanmoqda...</p> : (
                <div className="space-y-3">
                  {history.length === 0 ? <p className="text-slate-500 text-center py-6">Kirim yoki chiqimlar yo'q</p> : 
                    history.map(tx => (
                      <div key={tx.id} className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-2xl flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            {getTypeBadge(tx.type)}
                            <span className="text-slate-400 text-xs">{new Date(tx.created_at).toLocaleString('uz-UZ')}</span>
                          </div>
                          <p className="text-white font-medium flex items-center gap-1 mt-2 text-sm">
                             <FileText size={14} className="text-slate-500"/> 
                             {tx.description || "Izoh kiritilmagan"}
                          </p>
                          {tx.due_date && (
                            <p className="text-red-400/80 text-xs mt-1 flex items-center gap-1 font-semibold">
                              <Calendar size={12}/> Qaytarish muddati: {new Date(tx.due_date).toLocaleDateString('uz-UZ')}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-white">{tx.amount?.toLocaleString()} <span className="text-xs text-slate-500">UZS</span></p>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
               <div className="flex items-center justify-between">
                 <h3 className="text-lg font-semibold text-white">Yangi o'tkazma kiritish</h3>
                 <button onClick={() => setShowAdd(false)} className="text-sm text-slate-400 hover:text-white">Orqaga qaytish</button>
               </div>
               
               <form onSubmit={handleAdd} className="space-y-4 bg-slate-800/30 p-5 rounded-2xl border border-slate-700/50">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Operatsiya qaysi turda?</label>
                    <select value={type} onChange={(e)=>setType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500">
                      <option value="debt_given">Qarz BERDIK (Ularning qarzi oshadi)</option>
                      <option value="payment_in">To'lov OLDIK (Yuzaga kelgan qarzidan chegiriladi)</option>
                      <option value="debt_created">Qarz OLDIK (Bizning qarzimiz oshadi)</option>
                      <option value="payment_out">To'lov QILDIK (Bizning qarzimiz kamayadi)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Summa (UZS)</label>
                    <input type="number" required value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="0" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Izoh (Nima sababdan?)</label>
                    <input type="text" value={desc} onChange={(e)=>setDesc(e.target.value)} placeholder="Masalan: Plastikdan o'tkazdi, yoki ... uchin olingan" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Qaytarish muddati qachon? (Majburiy emas)</label>
                    <input type="date" value={dueDate} onChange={(e)=>setDueDate(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 calendar-dark-override" />
                  </div>
                  <button type="submit" className="w-full py-4 mt-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl font-bold text-white transition">Saqlash va Tasdiqlash</button>
               </form>
               <style dangerouslySetInnerHTML={{__html: `
                .calendar-dark-override::-webkit-calendar-picker-indicator {
                  filter: invert(1);
                  cursor: pointer;
                }
               `}} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CounterpartiesPage = ({ API_BASE }) => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPartner, setSelectedPartner] = useState(null);

  const fetchPartners = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/counterparties`);
      setPartners(data);
    } catch(e) {
      setPartners([
        { id: 1, name: "Aliyev Vali (Optom)", phone: "+998901234567", type: "supplier", balance: -5400000 },
        { id: 2, name: "Aziz Do'kon", phone: "+998991112233", type: "customer", balance: 1200000 },
        { id: 3, name: "Shaxboz", phone: "+998990000000", type: "customer", balance: 450000 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if(!selectedPartner) fetchPartners(); 
  }, [selectedPartner]); // refresh when modal closes

  const totalOwesUs = partners.filter(p => p.balance > 0).reduce((sum, p) => sum + p.balance, 0);
  const totalWeOwe = partners.filter(p => p.balance < 0).reduce((sum, p) => sum + Math.abs(p.balance), 0);

  const filtered = partners.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <>
    <div className="space-y-6 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/10 border border-green-500/30 rounded-3xl p-6">
          <h3 className="text-green-400 font-bold flex items-center gap-2 mb-2"><Coins /> Bizga berishlari kerak (Qarzlar)</h3>
          <p className="text-4xl font-black text-white">{totalOwesUs.toLocaleString()} <span className="text-xl text-green-500/50">UZS</span></p>
        </div>
        <div className="bg-gradient-to-br from-red-500/20 to-orange-600/10 border border-red-500/30 rounded-3xl p-6">
          <h3 className="text-red-400 font-bold flex items-center gap-2 mb-2"><ArrowRightLeft /> Bizning Qarzlarimiz (Ta'minotchilarga)</h3>
          <p className="text-4xl font-black text-white">{totalWeOwe.toLocaleString()} <span className="text-xl text-red-500/50">UZS</span></p>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><User /> Hamkorlar ro'yxati (Batafsil ko'rish uchun bosing)</h2>
          <div className="flex bg-slate-800 rounded-xl px-4 py-2 border border-slate-700 w-64 items-center">
            <Search size={18} className="text-slate-500 mr-2"/>
            <input 
              type="text" 
              placeholder="Qidirish..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent w-full text-white outline-none text-sm"
            />
          </div>
        </div>

        {loading ? (
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-2 bg-slate-700 rounded"></div>
                <div className="h-2 bg-slate-700 rounded"></div>
              </div>
            </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700/50 text-slate-400 text-sm">
                  <th className="pb-3 pl-4 font-semibold uppercase tracking-wider">Ism / Tashkilot</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider">Telefon</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider">Turi</th>
                  <th className="pb-3 pr-4 text-right font-semibold uppercase tracking-wider">Joriy Balans</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} onClick={() => setSelectedPartner(p)} className="border-b border-slate-700/30 hover:bg-slate-800/60 transition cursor-pointer group">
                    <td className="py-5 pl-4 font-bold text-white group-hover:text-indigo-400 transition-colors">{p.name}</td>
                    <td className="py-5 text-slate-400">{p.phone || '-'}</td>
                    <td className="py-5">
                      {p.type === 'customer' 
                        ? <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded border border-blue-500/20">Xaridor</span>
                        : <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded border border-purple-500/20">Ta'minotchi</span>
                      }
                    </td>
                    <td className="py-5 pr-4 text-right">
                      <span className={`font-bold px-3 py-1.5 rounded-xl text-sm ${p.balance > 0 ? 'bg-green-500/10 text-green-400 border border-green-500/30' : p.balance < 0 ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'text-slate-500 bg-slate-800'}`}>
                        {Math.abs(p.balance).toLocaleString()} UZS {p.balance > 0 ? '(Ular Qarzdor)' : p.balance < 0 ? '(Biz Haqdor)' : ''}
                      </span>
                    </td>
                    <td className="py-5 pr-4 text-right text-slate-500 group-hover:text-indigo-400">
                       <ChevronRight size={20} />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan="5" className="text-center py-8 text-slate-500">Hech narsa topilmadi.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    
    {selectedPartner && (
       <PartnerModal 
          partner={selectedPartner} 
          onClose={() => setSelectedPartner(null)} 
          API_BASE={API_BASE} 
       />
    )}
    </>
  );
};
export default CounterpartiesPage;
