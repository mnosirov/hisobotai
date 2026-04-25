import React, { useState, useEffect, useRef } from 'react';
import { Search, PackagePlus, Trash2, Plus, Minus, CreditCard, User, X } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const KirimPage = ({ inventory, API_BASE, fetchInventoryData, fetchDashboardData }) => {
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [counterparties, setCounterparties] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Barchasi");
  const searchInputRef = useRef(null);

  useEffect(() => {
    fetchCounterparties();
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const fetchCounterparties = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/counterparties`);
      // Filter only suppliers for KIRIM
      setCounterparties(data.filter(c => c.type === 'supplier'));
    } catch (e) {
      setCounterparties([
        { id: 1, name: "Aliyev Vali (Optom)", balance: -5400000 }
      ]);
    }
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      // Set default buy price to the product's normal buy price (last_purchase_price)
      return [...prev, { ...product, qty: 1, custom_buy_price: product.last_purchase_price || 0 }];
    });
    setSearchTerm('');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    let match = inventory.find(p => p.barcode === searchTerm.trim() || p.name.toLowerCase() === searchTerm.toLowerCase());
    if (match) {
      addToCart(match);
    } else {
      toast.error("Mahsulot topilmadi!");
    }
    setSearchTerm('');
  };

  const categories = ["Barchasi", ...new Set(inventory.map(i => i.category || 'Umumiy'))];
  const displayProducts = selectedCategory === "Barchasi" 
    ? inventory 
    : inventory.filter(i => (i.category || 'Umumiy') === selectedCategory);

  const searchResults = searchTerm.trim().length > 0 
    ? inventory.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.barcode && p.barcode.includes(searchTerm)))
    : [];

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        return { ...item, qty: Math.max(1, newQty) };
      }
      return item;
    }));
  };
  
  const updatePrice = (id, newPrice) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, custom_buy_price: Number(newPrice) };
      }
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.custom_buy_price * item.qty), 0);
  const debtAmount = selectedSupplierId ? Math.max(0, totalAmount - (parseFloat(paidAmount) || 0)) : 0;

  const handleCheckout = async () => {
    if (cart.length === 0) return toast.error("Kirim varag'i bo'sh!");
    
    setIsProcessing(true);
    try {
      const items = cart.map(item => ({
        product_id: item.id,
        quantity: item.qty,
        buy_price: item.custom_buy_price
      }));

      const payload = { items };
      if (selectedSupplierId) {
        payload.supplier_id = parseInt(selectedSupplierId);
        payload.paid_amount = parseFloat(paidAmount) || 0;
      }

      await axios.post(`${API_BASE}/purchases/manual`, payload);
      toast.success("Kirim muvaffaqiyatli saqlandi!");
      setCart([]);
      setPaidAmount('');
      setSelectedSupplierId('');
      fetchInventoryData();
      fetchDashboardData();
    } catch (e) {
      if (API_BASE === 'demo') {
          toast.success("(Demo) Kirim muvaffaqiyatli saqlandi! Stock va qarzlar o'zgargandek hisoblandi.");
          setCart([]);
          setPaidAmount('');
          setSelectedSupplierId('');
      } else {
          toast.error(e.response?.data?.detail || "Xatolik yuz berdi");
      }
    } finally {
      setIsProcessing(false);
      searchInputRef.current?.focus();
    }
  };

  return (
    <div className="flex h-full gap-4 pb-2">
      {/* Left Area - Cart */}
      <div className="flex-1 flex flex-col bg-slate-800/40 rounded-2xl border border-slate-700/50 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-rose-400"><PackagePlus className="text-rose-400"/> Kirim qilinayotgan tovarlar</h2>
          <span className="bg-rose-500/20 text-rose-400 px-3 py-1 rounded-full text-sm font-bold">{cart.length} xil mahsulot</span>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <PackagePlus size={48} className="mb-2 opacity-20 text-rose-400" />
              <p>O'ng tomondan mahsulot tanlang...</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-slate-700/30 p-3 rounded-xl border border-slate-600/30">
                <div className="flex-1">
                  <h4 className="font-bold text-white leading-tight">{item.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                     <span className="text-[10px] text-slate-400">Olish Narxi:</span>
                     <input 
                        type="number" 
                        value={item.custom_buy_price} 
                        onChange={(e) => updatePrice(item.id, e.target.value)}
                        className="bg-slate-800 text-rose-300 font-bold w-24 px-2 py-1 text-xs rounded border border-slate-600 outline-none" 
                     />
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-600/50">
                    <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:bg-slate-700 rounded-md"><Minus size={14}/></button>
                    <span className="w-8 text-center font-mono text-sm font-bold text-white">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:bg-slate-700 rounded-md"><Plus size={14}/></button>
                  </div>
                  <div className="w-28 text-right font-bold text-rose-300">
                    {(item.qty * item.custom_buy_price).toLocaleString()}
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Area - Controls */}
      <div className="w-96 flex flex-col gap-4">
        {/* Search */}
        <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-4">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Mahsulot Shtrix yoki Ismi..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border-2 border-rose-500/30 focus:border-rose-500 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 outline-none transition"
              autoComplete="off"
            />
          </form>

          {searchResults.length > 0 && searchTerm !== searchResults[0].barcode && (
            <div className="mt-2 max-h-40 overflow-y-auto bg-slate-700/40 rounded-xl border border-slate-600/50">
              {searchResults.map(p => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="w-full text-left p-3 hover:bg-slate-600/50 border-b border-slate-600/50 last:border-0 flex justify-between items-center"
                >
                  <span className="font-medium">{p.name} <span className="text-xs text-slate-400">({p.stock} qoldiq)</span></span>
                  <span className="text-sm text-slate-300">{p.last_purchase_price?.toLocaleString()} UZS</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Categories Strip */}
        <div className="flex overflow-x-auto pb-1 space-x-2 scrollbar-hide no-scrollbar mx-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                (selectedCategory === cat) 
                  ? 'bg-rose-600 text-white shadow-lg border-rose-500' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Tap to Add Products Grid */}
        <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-2 overflow-y-auto max-h-48 grid grid-cols-2 gap-2">
           {displayProducts.slice(0, 50).map(p => (
             <button 
               key={p.id} 
               onClick={() => addToCart(p)}
               className="bg-slate-700/50 hover:bg-rose-500/20 hover:border-rose-500/50 border border-slate-600/30 rounded-xl p-3 text-left transition flex flex-col justify-between h-20"
             >
                <span className="font-semibold text-white text-sm truncate w-full">{p.name}</span>
                <div className="flex justify-between items-end w-full">
                  <span className="text-xs text-slate-400">{p.stock} qoldi</span>
                  <span className="text-slate-300 font-bold text-xs">Olish: {p.last_purchase_price?.toLocaleString()}</span>
                </div>
             </button>
           ))}
           {displayProducts.length === 0 && <p className="text-slate-500 text-xs text-center col-span-2 py-4">Bu toifada mahsulot topilmadi</p>}
        </div>

        {/* Counterparty & Payment */}
        <div className="flex-1 bg-slate-800/40 rounded-2xl border border-slate-700/50 p-4 flex flex-col">
          <div className="mb-4">
            <label className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-1 uppercase tracking-wider"><User size={14}/> Ta'minotchi (Kimdan olyapmiz?)</label>
            <select
              value={selectedSupplierId}
              onChange={e => setSelectedSupplierId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-rose-500"
            >
              <option value="">-- Ixtiyoriy yengil kirim (Qarzsiz) --</option>
              {counterparties.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.balance !== 0 ? `(Balans: ${c.balance})` : ''}</option>
              ))}
            </select>
          </div>

          <div className="mb-auto">
            <div className="flex justify-between items-end mb-2">
              <span className="text-slate-400 text-sm font-medium">Jami tasdiqlanayotgan summa:</span>
              <span className="text-3xl font-bold text-white">{totalAmount.toLocaleString()} <span className="text-lg text-slate-500 font-normal border-l border-slate-700 pl-2 ml-1">UZS</span></span>
            </div>
            
            {selectedSupplierId && (
              <div className="space-y-3 mt-4 pt-4 border-t border-slate-700">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">To'lab berilgan pul (Qisman bo'lsa yozing)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder={totalAmount.toString()}
                    value={paidAmount}
                    onChange={e => setPaidAmount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-2xl font-bold text-rose-400 outline-none focus:border-rose-500 placeholder-slate-700"
                  />
                </div>
                {debtAmount > 0 && (
                  <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20 flex justify-between items-center text-red-400">
                    <span className="text-sm font-bold">Biz ta'minotchidan qarz bo'lamiz:</span>
                    <span className="font-bold">{debtAmount.toLocaleString()} UZS</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleCheckout}
            disabled={isProcessing || cart.length === 0}
            className="w-full bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {isProcessing ? "Kutib turing..." : <><PackagePlus size={24}/> Kirimni Tasdiqlash</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default KirimPage;
