import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Crown, Zap, Check, X, MessageCircle, Package, TrendingUp, BarChart3, FileText, Headphones } from 'lucide-react';

const PricingPage = ({ currentTier, subscriptionEnd }) => {
  const isActive = currentTier !== 'free' && subscriptionEnd && new Date(subscriptionEnd) > new Date();

  const plans = [
    {
      id: 'free',
      name: 'Bepul',
      price: "0",
      period: 'Cheksiz',
      icon: <Zap className="text-slate-400" size={28} />,
      gradient: 'from-slate-700 to-slate-800',
      borderColor: 'border-slate-600/30',
      textColor: 'text-slate-400',
      features: [
        { text: '10 ta mahsulot', included: true },
        { text: '20 ta sotuv/oy', included: true },
        { text: 'Asosiy hisobot', included: true },
        { text: 'AI yordamchi', included: false },
        { text: 'Hisobot eksport', included: false },
        { text: 'Telegram bot', included: false },
      ]
    },
    {
      id: 'standard',
      name: 'Standart',
      price: "49,000",
      period: 'oyiga',
      icon: <Shield className="text-blue-400" size={28} />,
      gradient: 'from-blue-600 to-indigo-700',
      borderColor: 'border-blue-500/30',
      textColor: 'text-blue-400',
      popular: true,
      features: [
        { text: '100 ta mahsulot', included: true },
        { text: 'Cheksiz sotuv', included: true },
        { text: "Batafsil hisobot", included: true },
        { text: 'AI yordamchi', included: true },
        { text: 'Hisobot eksport', included: false },
        { text: 'Telegram bot', included: true },
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: "99,000",
      period: 'oyiga',
      icon: <Crown className="text-amber-400" size={28} />,
      gradient: 'from-amber-600 to-orange-700',
      borderColor: 'border-amber-500/30',
      textColor: 'text-amber-400',
      features: [
        { text: 'Cheksiz mahsulot', included: true },
        { text: 'Cheksiz sotuv', included: true },
        { text: "To'liq hisobot", included: true },
        { text: 'AI yordamchi (ilg\'or)', included: true },
        { text: 'Hisobot eksport', included: true },
        { text: 'Telegram bot + Priority', included: true },
      ]
    }
  ];

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <motion.div
      key="pricing"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Tarif rejalar</h2>
        <p className="text-slate-400 text-sm">Biznesingizga mos rejani tanlang</p>
      </div>

      {/* Current Plan Banner */}
      {isActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-4 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 border-indigo-500/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Hozirgi tarif</p>
              <p className="font-bold text-white capitalize">{currentTier === 'standard' ? 'Standart' : 'Premium'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Amal qilish muddati</p>
              <p className="text-sm font-semibold text-emerald-400">{formatDate(subscriptionEnd)}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Plans */}
      <div className="space-y-4">
        {plans.map((plan, index) => {
          const isCurrent = currentTier === plan.id && (plan.id === 'free' || isActive);

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative glass-card p-5 space-y-4 ${isCurrent ? 'ring-2 ring-indigo-500/50' : ''
                } ${plan.popular ? 'border-blue-500/30' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider">
                    Mashhur
                  </span>
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 right-4">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/30">
                    Hozirgi
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center`}>
                  {plan.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white">{plan.price}</span>
                    <span className="text-xs text-slate-400">UZS / {plan.period}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                {plan.features.map((feature, fi) => (
                  <div key={fi} className="flex items-center gap-2.5">
                    {feature.included ? (
                      <Check size={16} className={plan.textColor} />
                    ) : (
                      <X size={16} className="text-slate-600" />
                    )}
                    <span className={`text-sm ${feature.included ? 'text-slate-200' : 'text-slate-500'}`}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              {plan.id !== 'free' && !isCurrent && (
                <a
                  href="https://t.me/MNosirov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition transform active:scale-[0.98] ${plan.id === 'premium'
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-500 hover:to-orange-500'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500'
                    }`}
                >
                  <MessageCircle size={16} />
                  Telegram orqali sotib olish
                </a>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Telegram Contact Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-5 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 text-center space-y-3"
      >
        <MessageCircle className="mx-auto text-blue-400" size={32} />
        <div>
          <h4 className="font-bold text-white">To'lov qanday amalga oshiriladi?</h4>
          <p className="text-slate-400 text-sm mt-1">
            Telegram orqali admin bilan bog'laning. To'lov tasdiqlangach, obuna avtomatik faollashtiriladi.
          </p>
        </div>
        <a
          href="https://t.me/MNosirov"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-blue-500/20 text-blue-400 font-semibold text-sm border border-blue-500/30 hover:bg-blue-500/30 transition"
        >
          <MessageCircle size={16} /> @MNosirov
        </a>
      </motion.div>
    </motion.div>
  );
};

export default PricingPage;
