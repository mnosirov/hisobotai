import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { TrendingUp, Package, MessageSquare } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import axios from 'axios';

import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Chat from './components/Chat';
import AddProductModal from './components/AddProductModal';

// Set this to your production backend URL eventually.
// Since Vercel rewrites were removed, the frontend will communicate with the dedicated backend URL.
// Assuming it will be deployed on render or similar, we leave it configurable.
// For now, if deployed together, we can still use `/api` if configured, 
// but it's much safer to use full URL for separated domains.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const TENANT_ID = 1;

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [profit, setProfit] = useState(0); 
  const [inventory, setInventory] = useState([]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', unit: 'dona', stock: '', buyPrice: '', sellPrice: '' });

  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: "Assalomu alaykum! Biznesingiz bo'yicha qanday savolingiz bor?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [tg, setTg] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    fetchInventoryData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/sales/summary?tenant_id=${TENANT_ID}`);
      setProfit(data.today_profit || 0);
    } catch (e) {
      console.error("Dashboard fetch error", e);
    }
  };

  const fetchInventoryData = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/inventory?tenant_id=${TENANT_ID}`);
      const mappedData = data.map(i => ({ ...i, threshold: 10 })); 
      setInventory(mappedData);
    } catch (e) {
      console.error("Inventory fetch error", e);
    }
  };

  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      const tgApp = window.Telegram.WebApp;
      tgApp.ready();
      tgApp.expand();
      setTg(tgApp);
      if (tgApp.isVersionAtLeast('6.1')) {
        tgApp.setHeaderColor('#0f172a');
      }
    }
  }, []);

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.stock) {
      toast.error("Mahsulot nomi va miqdorini kiriting!");
      return;
    }
    
    const loadingToast = toast.loading("Qo'shilmoqda...");
    try {
      await axios.post(`${API_BASE}/inventory?tenant_id=${TENANT_ID}`, {
        name: newProduct.name,
        unit: newProduct.unit,
        stock: parseFloat(newProduct.stock) || 0,
        last_purchase_price: parseFloat(newProduct.buyPrice) || 0,
        sell_price: parseFloat(newProduct.sellPrice) || 0
      });
      toast.success("Muvaffaqiyatli qo'shildi!", { id: loadingToast });
      setShowAddModal(false);
      setNewProduct({ name: '', unit: 'dona', stock: '', buyPrice: '', sellPrice: '' });
      fetchInventoryData(); 
    } catch (err) {
      toast.error("Xatolik: Tarmoq bilan aloqa yo'q", { id: loadingToast });
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const newMessages = [...chatMessages, { role: 'user', content: chatInput }];
    setChatMessages(newMessages);
    setChatInput("");
    setIsTyping(true);

    try {
      const res = await axios.post(`${API_BASE}/chat?tenant_id=${TENANT_ID}`, {
        message: chatInput
      });
      setChatMessages([...newMessages, { role: 'assistant', content: res.data.reply }]);
    } catch (err) {
      toast.error("Xatolik: Chat serveri bilan aloqa yo'q!");
      setChatMessages([...newMessages, { role: 'assistant', content: "Muloqot uzildi. Iltimos, keyinroq qayta urinib ko'ring." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0F172A] text-slate-100 selection:bg-indigo-500/30">
      <Toaster position="top-center" toastOptions={{ style: { background: '#1e293b', color: '#fff', borderRadius: '16px' } }} />
      
      {/* Header */}
      <header className="px-6 pt-10 pb-4 h-[120px] flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hisobot AI</h1>
          <p className="text-slate-400 text-sm">Biznesingiz raqamli hamrohi (Pro)</p>
        </div>
        <div className="h-10 w-10 glass-card flex items-center justify-center">
          <TrendingUp className="text-blue-400" size={20} />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-6 pb-24 scrollbar-hide">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <Dashboard 
              profit={profit} 
              tg={tg} 
              fetchDashboardData={fetchDashboardData} 
              fetchInventoryData={fetchInventoryData}
              TENANT_ID={TENANT_ID}
              API_BASE={API_BASE}
            />
          )}

          {activeTab === 'inventory' && (
            <Inventory 
              inventory={inventory} 
              setShowAddModal={setShowAddModal} 
            />
          )}
        </AnimatePresence>
      </main>

      <AddProductModal 
        showAddModal={showAddModal} 
        setShowAddModal={setShowAddModal} 
        newProduct={newProduct} 
        setNewProduct={setNewProduct} 
        handleAddProduct={handleAddProduct} 
      />

      <Chat 
        showChat={showChat} 
        setShowChat={setShowChat} 
        chatMessages={chatMessages} 
        isTyping={isTyping} 
        chatInput={chatInput} 
        setChatInput={setChatInput} 
        handleSendMessage={handleSendMessage} 
      />

      {/* Bottom Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 h-20 glass-card rounded-none rounded-t-3xl border-x-0 border-b-0 px-6 flex items-center justify-around z-10">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center space-y-1 transition ${
            activeTab === 'dashboard' ? 'text-indigo-400' : 'text-slate-500'
          }`}
        >
          <div className={`p-2 rounded-xl transition ${activeTab === 'dashboard' ? 'bg-indigo-500/20' : ''}`}>
            <TrendingUp size={24} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tight">Xulosa</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center space-y-1 transition ${
            activeTab === 'inventory' ? 'text-indigo-400' : 'text-slate-500'
          }`}
        >
          <div className={`p-2 rounded-xl transition ${activeTab === 'inventory' ? 'bg-indigo-500/20' : ''}`}>
            <Package size={24} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tight">Sklad</span>
        </button>

        <button 
          onClick={() => setShowChat(true)}
          className="flex flex-col items-center space-y-1 text-slate-500"
        >
          <div className="p-2 rounded-xl">
            <MessageSquare size={24} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tight">Chat</span>
        </button>
      </footer>
    </div>
  );
};

export default App;
