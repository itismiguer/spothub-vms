import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';

export default function ServerError() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-red-500/10 via-transparent to-transparent opacity-50" />
        <div className="absolute -top-1/4 -right-1/4 w-[60%] h-[60%] bg-red-500/10 rounded-full blur-[140px] animate-pulse" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12 max-w-xl relative z-10"
      >
        <div className="w-24 h-24 bg-red-500/10 rounded-[32px] flex items-center justify-center text-red-500 mx-auto shadow-2xl shadow-red-500/20">
          <ShieldAlert size={48} className="animate-bounce" />
        </div>

        <div className="space-y-4">
          <h2 className="text-4xl md:text-5xl font-display font-black uppercase italic tracking-tighter text-white">
            System <span className="text-red-500">Relay</span> Error
          </h2>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 leading-relaxed">
            Our servers encountered a synchronization failure. The engineering team has been notified at high priority.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto h-16 bg-white text-charcoal px-10 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-white/10"
          >
            Attempt Re-sync <RefreshCw size={18} />
          </button>
          <button 
            onClick={() => navigate('/')}
            className="w-full sm:w-auto h-16 glass text-white px-10 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all"
          >
            Safe Zone <Home size={18} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
