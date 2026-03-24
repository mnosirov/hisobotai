import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TrendingUp, Package, MessageSquare, LogOut, User as UserIcon, Calendar } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import axios from 'axios';

import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Chat from './components/Chat';
import AddProductModal from './components/AddProductModal';
import AddSaleModal from './components/AddSaleModal';
import SalesHistory from './components/SalesHistory';
import Login from './pages/Login';
import Register from './pages/Register';
import { AuthProvider, useAuth } from './context/AuthContext';

const MainApp = () => {
  const { user, logout, loading, API_BASE } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  
  const [profit, setProfit] = useState(0); 
  const [profitGrowth, setProfitGrowth] = useState(0);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddSaleModal, setShowAddSaleModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', category: 'Umumiy', unit: 'dona', stock: '', buyPrice: '', sellPrice: '' });

  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: "Assalomu alaykum! Biznesingiz bo'yicha qanday savolingiz bor?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [tg, setTg] = useState(null);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchInventoryData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/sales/summary`);
      setProfit(data.today_profit || 0);
      setProfitGrowth(data.profit_growth || 0);
      setLowStockItems(data.low_stock_items || []);
    } catch (e) {
      console.error("Dashboard fetch error", e);
    }
  };

  const fetchInventoryData = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/inventory`);
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
      await axios.post(`${API_BASE}/inventory`, {
        name: newProduct.name,
        category: newProduct.category,
        unit: newProduct.unit,
        stock: parseFloat(newProduct.stock) || 0,
        last_purchase_price: parseFloat(newProduct.buyPrice) || 0,
        sell_price: parseFloat(newProduct.sellPrice) || 0
      });
      toast.success("Muvaffaqiyatli qo'shildi!", { id: loadingToast });
      setShowAddModal(false);
      setNewProduct({ name: '', category: 'Umumiy', unit: 'dona', stock: '', buyPrice: '', sellPrice: '' });
      fetchInventoryData(); 
    } catch (err) {
      toast.error("Xatolik yuz berdi", { id: loadingToast });
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const newMessages = [...chatMessages, { role: 'user', content: chatInput }];
    setChatMessages(newMessages);
    setChatInput("");
    setIsTyping(true);

    try {
      const res = await axios.post(`${API_BASE}/chat`, {
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

  if (loading) return (
    <div className="h-screen bg-[#0F172A] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
  );

  if (!user) {
    return (
      authMode === 'login' 
        ? <Login onSwitch={() => setAuthMode('register')} /> 
        : <Register onSwitch={() => setAuthMode('login')} />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0F172A] text-slate-100 selection:bg-indigo-500/30">
      <Toaster position="top-center" toastOptions={{ style: { background: '#1e293b', color: '#fff', borderRadius: '16px' } }} />
      
      {/* Header */}
      <header className="px-6 pt-10 pb-4 flex items-center justify-between">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-2xl font-bold tracking-tight">Hisobot AI <span className="text-[10px] bg-indigo-500/20 px-1.5 py-0.5 rounded text-indigo-400 font-mono">v1.1.9</span></h1>
          <div className="flex items-center space-x-2 text-slate-400 text-xs">
            <UserIcon size={12} className="text-indigo-400" />
            <span>{user.username}</span>
          </div>
        </motion.div>
        <motion.button 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={logout}
          className="h-10 w-10 glass-card flex items-center justify-center hover:bg-red-500/10 transition-colors group"
          title="Chiqish"
        >
          <LogOut className="text-slate-400 group-hover:text-red-400" size={20} />
        </motion.button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-6 pb-24 scrollbar-hide">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <Dashboard 
              profit={profit} 
              profitGrowth={profitGrowth}
              lowStockItems={lowStockItems}
              tg={tg} 
              fetchDashboardData={fetchDashboardData} 
              fetchInventoryData={fetchInventoryData}
              API_BASE={API_BASE}
              setShowAddSaleModal={setShowAddSaleModal}
            />
          )}

          {activeTab === 'inventory' && (
            <Inventory 
              inventory={inventory} 
              setShowAddModal={setShowAddModal} 
            />
          )}

          {activeTab === 'history' && (
            <SalesHistory API_BASE={API_BASE} />
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

      <AddSaleModal 
        show={showAddSaleModal}
        onClose={() => setShowAddSaleModal(false)}
        inventory={inventory}
        API_BASE={API_BASE}
        fetchDashboardData={fetchDashboardData}
        fetchInventoryData={fetchInventoryData}
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
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center space-y-1 transition ${
            activeTab === 'history' ? 'text-indigo-400' : 'text-slate-500'
          }`}
        >
          <div className={`p-2 rounded-xl transition ${activeTab === 'history' ? 'bg-indigo-500/20' : ''}`}>
            <Calendar size={24} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tight">Tarix</span>
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

const App = () => (
  <AuthProvider>
    <MainApp />
  </AuthProvider>
);

export default App;
