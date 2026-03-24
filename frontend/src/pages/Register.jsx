import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Lock, User, LogIn } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Register = ({ onSwitch }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { API_BASE } = useAuth();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const loadingToast = toast.loading("Ro'yxatdan o'tilmoqda...");

    try {
      await axios.post(`${API_BASE}/auth/register`, { username, email, password });
      toast.success("Muvaffaqiyatli ro'yxatdan o'tdingiz! Endi kiring.", { id: loadingToast });
      onSwitch(); // Go to login after success
    } catch (err) {
      toast.error(err.response?.data?.detail || "Ro'yxatdan o'tishda xatolik yuz berdi", { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-[#0F172A]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-card p-8 space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="h-16 w-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserPlus className="text-blue-400" size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Ro'yxatdan O'tish</h1>
          <p className="text-slate-400">Biznesingizni Hisobot AI bilan boshlang</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                <User size={18} />
              </div>
              <input
                type="text"
                required
                className="block w-full pl-10 pr-3 py-3 bg-slate-900/50 border border-slate-700 rounded-xl leading-5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                placeholder="Foydalanuvchi ismi"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                <Mail size={18} />
              </div>
              <input
                type="email"
                required
                className="block w-full pl-10 pr-3 py-3 bg-slate-900/50 border border-slate-700 rounded-xl leading-5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                placeholder="Email manzilingiz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                <Lock size={18} />
              </div>
              <input
                type="password"
                required
                className="block w-full pl-10 pr-3 py-3 bg-slate-900/50 border border-slate-700 rounded-xl leading-5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                placeholder="Parolingiz (min. 6 belgi)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Ro'yxatdan o'tilmoqda..." : "Ro'yxatdan o'tish"}
          </button>
        </form>

        <div className="text-center pt-4">
          <button 
            onClick={onSwitch}
            className="text-slate-400 text-sm hover:text-blue-400 transition-colors flex items-center justify-center mx-auto space-x-2"
          >
            <LogIn size={16} />
            <span>Hisobingiz bormi? Kirish</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
