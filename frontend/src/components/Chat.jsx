import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send } from 'lucide-react';

const Chat = ({ showChat, setShowChat, chatMessages, isTyping, chatInput, setChatInput, handleSendMessage }) => {
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (showChat) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, showChat, isTyping]);

  return (
    <AnimatePresence>
      {showChat && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-50 bg-[#0F172A] flex flex-col"
        >
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center mr-3">
                <MessageSquare className="text-white" size={20} />
              </div>
              <div>
                <h2 className="font-bold">AI Yordamchi</h2>
                <div className="flex items-center">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                  <span className="text-[10px] text-slate-500 uppercase font-black">Online</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setShowChat(false)}
              className="h-10 w-10 glass-card flex items-center justify-center"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-4 max-w-[80%] text-sm ${
                  msg.role === 'user' ? 
                  'bg-indigo-600 rounded-2xl rounded-tr-none' : 
                  'glass-card rounded-2xl rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="glass-card p-4 max-w-[50%] rounded-2xl rounded-tl-none text-sm text-slate-400 animate-pulse">
                  Yozmoqda...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-6 pb-10 flex items-center space-x-2">
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
              placeholder="Savol yozing..." 
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm focus:outline-none focus:border-indigo-500/50"
            />
            <button 
              onClick={handleSendMessage}
              disabled={isTyping}
              className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 ${isTyping ? 'bg-indigo-600/50' : 'bg-indigo-600'}`}
            >
              <Send size={24} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Chat;
