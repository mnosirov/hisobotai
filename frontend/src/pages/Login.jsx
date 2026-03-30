import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, UserPlus } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Login = ({ onSwitch }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const { login, API_BASE } = useAuth();

  const handleInputChange = (field, value) => {
    setLocalError('');
    if (field === 'email') setEmail(value);
    if (field === 'password') setPassword(value);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const loadingToast = toast.loading("Kirilmoqda...");

    try {
      const { data } = await axios.post(`${API_BASE}/auth/login`, { email, password });
      login(data.access_token, data.user);
      toast.success(`Xush kelibsiz, ${data.user.username}!`, { id: loadingToast });
    } catch (err) {
      const msg = err.response?.data?.detail || "Email yoki parol xato";
      setLocalError(msg);
      toast.error(msg, { id: loadingToast });
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
          <div className="h-16 w-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LogIn className="text-indigo-400" size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Xush Kelibsiz</h1>
          <p className="text-slate-400">Hisobingizga kiring va boshlang</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            {localError && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold text-center"
              >
                {localError}
              </motion.div>
            )}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                <Mail size={18} />
              </div>
              <input
                type="email"
                required
                className="block w-full pl-10 pr-3 py-3 bg-slate-900/50 border border-slate-700 rounded-xl leading-5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                placeholder="Email manzilingiz"
                value={email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                <Lock size={18} />
              </div>
              <input
                type="password"
                required
                className="block w-full pl-10 pr-3 py-3 bg-slate-900/50 border border-slate-700 rounded-xl leading-5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                placeholder="Parolingiz"
                value={password}
                onChange={(e) => handleInputChange('password', e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Kirilmoqda..." : "Kirish"}
          </button>
        </form>

        <div className="text-center pt-4">
          <button 
            onClick={onSwitch}
            className="text-slate-400 text-sm hover:text-indigo-400 transition-colors flex items-center justify-center mx-auto space-x-2"
          >
            <UserPlus size={16} />
            <span>Hisobingiz yo'qmi? Ro'yxatdan o'ting</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
