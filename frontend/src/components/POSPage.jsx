import React, { useState, useEffect, useRef } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, User, X, FileText, Settings, History, XCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const POSPage = ({ inventory, API_BASE, fetchInventoryData, fetchDashboardData }) => {
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [counterparties, setCounterparties] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Barchasi");
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '', type: 'customer' });
  const searchInputRef = useRef(null);

  useEffect(() => {
    fetchCounterparties();
    // Keep focus on search input for barcode scanner
    if (searchInputRef.current && !showNewCustomerModal) {
      searchInputRef.current.focus();
    }
  }, [showNewCustomerModal]);

  const fetchCounterparties = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/counterparties`);
      setCounterparties(data.filter(c => c.type === 'customer'));
    } catch (e) {
      setCounterparties([
        { id: 2, name: "Aziz Do'kon", balance: 1200000 },
        { id: 3, name: "Shaxboz", balance: 450000 }
      ]);
    }
  };

  const handleQuickAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomerData.name) return toast.error("Ism kiritilmagan");

    try {
      const { data } = await axios.post(`${API_BASE}/counterparties`, newCustomerData);
      toast.success("Mijoz qo'shildi!");
      // Refresh list and select new customer
      const { data: updatedList } = await axios.get(`${API_BASE}/counterparties`);
      const filtered = updatedList.filter(c => c.type === 'customer');
      setCounterparties(filtered);
      setSelectedCustomerId(data.id);
      setShowNewCustomerModal(false);
      setNewCustomerData({ name: '', phone: '', type: 'customer' });
    } catch (err) {
      if (API_BASE === 'demo') {
        const dummyId = Date.now();
        const newPartner = { id: dummyId, ...newCustomerData, balance: 0 };
        setCounterparties([...counterparties, newPartner]);
        setSelectedCustomerId(dummyId);
        toast.success("(Demo) Mijoz qo'shildi!");
        setShowNewCustomerModal(false);
        setNewCustomerData({ name: '', phone: '', type: 'customer' });
      } else {
        toast.error("Mijozni saqlashda xatolik");
      }
    }
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          toast.error("Omborda yetarli emas!");
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
    setSearchTerm('');
  };

  // Keyboard scanner logic
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    // Direct match (barcode or exact name)
    let match = inventory.find(p => p.barcode === searchTerm.trim() || p.name.toLowerCase() === searchTerm.toLowerCase());
    
    if (match) {
      addToCart(match);
    } else {
      toast.error("Mahsulot topilmadi!");
    }
    setSearchTerm('');
  };

  const categories = ["Barchasi", ...new Set((inventory || []).map(i => i.category || 'Umumiy'))];
  const displayProducts = selectedCategory === "Barchasi" 
    ? (inventory || []) 
    : (inventory || []).filter(i => (i.category || 'Umumiy') === selectedCategory);
    

  // Fuzzy matches for manual typing
  const searchResults = searchTerm.trim().length > 0 
    ? inventory.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.barcode && p.barcode.includes(searchTerm)))
    : [];

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        if (newQty > item.stock) {
          toast.error("Omborda yetarli emas!");
          return item;
        }
        return { ...item, qty: Math.max(1, newQty) };
      }
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.sell_price * item.qty), 0);
  const debtAmount = selectedCustomerId ? Math.max(0, totalAmount - (parseFloat(paidAmount) || 0)) : 0;

  const handleCheckout = async () => {
    if (cart.length === 0) return toast.error("Savatcha bo'sh!");
    
    setIsProcessing(true);
    try {
      const items = cart.map(item => ({
        product_id: item.id,
        quantity: item.qty,
        revenue: item.qty * item.sell_price
      }));

      const payload = { items };
      if (selectedCustomerId) {
        payload.customer_id = parseInt(selectedCustomerId);
        payload.paid_amount = parseFloat(paidAmount) || 0;
      }

      await axios.post(`${API_BASE}/sales/manual`, payload);
      toast.success("Savdo muvaffaqiyatli yakunlandi!");
      setCart([]);
      setPaidAmount('');
      setSelectedCustomerId('');
      fetchInventoryData();
      fetchDashboardData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Xatolik yuz berdi");
    } finally {
      setIsProcessing(false);
      searchInputRef.current?.focus();
    }
  };

  // Jowi Terminal Tile Colors
  const getTileColor = (cat) => {
    const palette = {
      'Oziq-ovqat': 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400/30',
      'Ichimliklar': 'bg-blue-600 hover:bg-blue-500 border-blue-400/30',
      'Maishiy texnika': 'bg-indigo-600 hover:bg-indigo-500 border-indigo-400/30',
      'Kanselyariya': 'bg-orange-600 hover:bg-orange-500 border-orange-400/30',
      'Aksessuarlar': 'bg-purple-600 hover:bg-purple-500 border-purple-400/30',
      'default': 'bg-slate-700 hover:bg-slate-600 border-slate-500/20'
    };
    return palette[cat] || palette.default;
  };

  return (
    <div className="flex flex-col h-full bg-[#0f172a] text-slate-100 font-sans p-1 lg:p-2 gap-1 lg:gap-2 overflow-hidden select-none">
      
      {/* 1. COMPACT HEADER - Significantly Reduced Height */}
      <div className="flex items-center gap-2 bg-[#1e293b] p-2 rounded-xl border border-slate-700 shadow-lg shrink-0">
        <div className="flex items-center gap-2 px-2 border-r border-slate-700 pr-4 hidden md:flex">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-black italic text-lg shadow-lg">H</div>
          <h1 className="text-[10px] font-black uppercase tracking-widest hidden lg:block">Hisobot <span className="text-indigo-400">Pro</span></h1>
        </div>
        
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="MAHSULOT QIDIRISH..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#0f172a] border border-slate-700 rounded-lg py-2 pl-10 pr-10 text-[11px] font-bold text-white placeholder-slate-800 outline-none focus:border-indigo-500 transition-all uppercase"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
            >
              <XCircle size={14} />
            </button>
          )}
        </div>
        
        <div className="hidden sm:flex items-center gap-4 px-4 border-l border-slate-700">
           <p className="text-[10px] font-black tabular-nums text-indigo-400">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 gap-2 overflow-hidden min-h-0">
        
        {/* 2. JOWI TICKET: LEFT SIDEBAR (MAXIMIZED Vertical Space) */}
        <div className="w-full lg:w-[380px] xl:w-[420px] bg-[#1e293b] rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col shrink-0">
          <div className="bg-slate-800/80 p-3 border-b border-slate-700 flex justify-between items-center">
            <h2 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <ShoppingCart size={14} className="text-indigo-400"/> SAVATCHA
            </h2>
            <span className="text-[9px] font-black bg-indigo-500 px-2 py-0.5 rounded text-white">{cart.length} TA</span>
          </div>

          {/* This is the MAIN Cart Area - Now prioritized */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1 no-scrollbar bg-[#0f172a]/20">
             {cart.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center opacity-10 text-slate-500">
                  <ShoppingCart size={48} className="mb-2" />
                  <p className="font-black text-[10px] uppercase tracking-widest">Savatcha Bo'sh</p>
               </div>
             ) : (
               <div className="space-y-1">
                 {cart.map(item => (
                   <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center justify-between group hover:border-indigo-500/50 transition-colors">
                      <div className="flex-1 min-w-0 mr-3">
                        <h4 className="font-black text-white text-[11px] lg:text-xs leading-none uppercase truncate mb-1">{item.name}</h4>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-black text-indigo-400 tabular-nums">{item.sell_price.toLocaleString()}</span>
                           <span className="text-[9px] font-bold text-slate-600">x {item.qty}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-700">
                          <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded text-white"><Minus size={10}/></button>
                          <span className="w-7 text-center font-black text-[11px] tabular-nums text-white">{item.qty}</span>
                          <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded text-white"><Plus size={10}/></button>
                        </div>
                        <div className="w-20 text-right font-black text-xs text-white tabular-nums tracking-tighter">
                          {(item.qty * item.sell_price).toLocaleString()}
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="text-slate-700 hover:text-rose-500 p-1.5"><Trash2 size={14}/></button>
                      </div>
                   </div>
                 ))}
               </div>
             )}
          </div>

          {/* Sidebar Summary - Significantly More Compact */}
          <div className="bg-slate-800/90 p-4 border-t border-slate-700">
             <div className="flex justify-between items-center mb-4">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">JAMI SUMMA:</p>
                <div className="text-right">
                  <h3 className="text-2xl font-black text-white tabular-nums tracking-tighter decoration-indigo-500/30 underline underline-offset-4">{totalAmount.toLocaleString()} <span className="text-[10px] text-slate-500 font-bold ml-1">UZS</span></h3>
                </div>
             </div>
             
             <div className="flex items-center gap-2 bg-[#0f172a] rounded-xl p-1 border border-slate-700">
                <select
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  className="flex-1 bg-transparent py-2 px-3 text-[10px] font-black text-white outline-none appearance-none cursor-pointer uppercase"
                >
                  <option value="">-- ODDIY XARIDOR --</option>
                  {counterparties.map(c => (
                    <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
                  ))}
                </select>
                <button onClick={() => setShowNewCustomerModal(true)} className="w-8 h-8 flex items-center justify-center bg-indigo-600/10 text-indigo-400 rounded-lg"><User size={14}/></button>
             </div>
          </div>
        </div>

        {/* 3. JOWI TILES: CENTER/RIGHT (Catalog Grid) */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          
          {/* Categories Strip - Compact */}
          <div className="flex overflow-x-auto pb-1 gap-1 no-scrollbar shrink-0">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-b-4 ${
                  (selectedCategory === cat) 
                    ? 'bg-indigo-600 text-white border-indigo-800' 
                    : 'bg-[#1e293b] text-slate-500 border-slate-900 hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Dense Tile Grid */}
          <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-6 gap-2 no-scrollbar pb-10">
            {displayProducts.slice(0, 100).map((p, idx) => (
              <button 
                key={p.id} 
                onClick={() => addToCart(p)}
                className={`group relative ${getTileColor(idx % 2 === 0 ? p.category : 'default')} rounded-2xl p-3 text-left transition-all duration-200 flex flex-col h-28 lg:h-32 shadow-lg border-b-4 border-black/30 overflow-hidden hover:scale-[1.02] active:scale-[0.98] active:border-b-0 active:translate-y-1`}
              >
                 <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                 <div className="flex-1 min-w-0 z-10">
                   <h4 className="font-black text-white text-[10px] leading-tight uppercase truncate truncate-2-lines mb-1 group-hover:text-indigo-100 transition-colors">{p.name}</h4>
                   <p className="text-[9px] font-bold text-black/30 uppercase truncate">{p.category || 'ASOSIY'}</p>
                 </div>
                 
                 <div className="mt-auto flex justify-between items-end z-10">
                   <span className="text-[9px] font-bold text-white/40">{p.stock} ta</span>
                   <div className="bg-black/20 px-2 py-1 rounded-lg border border-white/10 group-hover:bg-black/40 transition-colors">
                      <span className="text-white font-black text-[11px] tabular-nums tracking-tighter">{p.sell_price.toLocaleString()}</span>
                   </div>
                 </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. JOWI ACTION BAR - Compact Height */}
      <div className="grid grid-cols-4 lg:grid-cols-6 gap-2 shrink-0 h-16 lg:h-20">
        <button 
          onClick={handleCheckout} 
          disabled={cart.length === 0 || isProcessing}
          className="col-span-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-20 rounded-xl flex items-center justify-center gap-3 transition-all shadow-xl border-b-4 border-emerald-800 active:translate-y-0.5 active:border-b-2"
        >
          <CreditCard size={20} className="text-white"/>
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-white leading-none mb-1">TO'LOVNI YAKUNLASH</p>
            <p className="text-[8px] font-black text-emerald-100 opacity-60 uppercase italic">SAVDONI YOPISH</p>
          </div>
        </button>

        <button 
          onClick={handleCheckout} 
          disabled={!selectedCustomerId || cart.length === 0 || isProcessing}
          className="bg-amber-600 hover:bg-amber-500 disabled:opacity-20 rounded-xl border-b-4 border-amber-800 flex flex-col items-center justify-center transition-all shadow-xl active:translate-y-0.5 active:border-b-2"
        >
          <Plus size={16}/>
          <span className="text-[8px] font-black uppercase tracking-widest">QARZ</span>
        </button>

        <button className="bg-slate-700 hover:bg-slate-600 rounded-xl border-b-4 border-slate-900 flex flex-col items-center justify-center transition-all shadow-xl active:translate-y-0.5 active:border-b-2">
          <FileText size={16}/>
          <span className="text-[8px] font-black uppercase tracking-widest text-center">OXIRGI CHEK</span>
        </button>

        <button 
          onClick={() => setCart([])}
          className="bg-rose-700 hover:bg-rose-600 rounded-xl border-b-4 border-rose-900 flex flex-col items-center justify-center transition-all shadow-xl active:translate-y-0.5 active:border-b-2"
        >
          <Trash2 size={16}/>
          <span className="text-[8px] font-black uppercase tracking-widest">TOZALASH</span>
        </button>

        <button className="bg-indigo-700 hover:bg-indigo-600 rounded-xl border-b-4 border-indigo-900 flex flex-col items-center justify-center transition-all shadow-xl hidden lg:flex active:translate-y-0.5 active:border-b-2">
          <Settings size={16}/>
          <span className="text-[8px] font-black uppercase tracking-widest">SOZLAMALAR</span>
        </button>
      </div>

      {/* QUICK MODAL - Compact */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-4">
          <div className="bg-[#1e293b] w-full max-w-xs rounded-2xl border-2 border-slate-700 shadow-2xl p-6">
            <h2 className="text-base font-black text-white uppercase tracking-tight mb-4 border-b-2 border-indigo-500 pb-2 italic">Yangi xaridor</h2>
            <form onSubmit={handleQuickAddCustomer} className="space-y-4">
              <input
                autoFocus required type="text" placeholder="MIJOZ ISMI"
                value={newCustomerData.name}
                onChange={e => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-3 text-white font-black outline-none focus:border-indigo-600 uppercase text-xs"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowNewCustomerModal(false)} className="flex-1 bg-slate-800 py-3 rounded-lg font-black text-[10px] uppercase">BEKOR</button>
                <button type="submit" className="flex-1 bg-indigo-600 py-3 rounded-lg font-black text-[10px] uppercase">SAQLASH</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSPage;
