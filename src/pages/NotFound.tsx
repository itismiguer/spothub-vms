import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, ShieldAlert } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-8 text-center bg-radial from-white/[0.03] to-transparent relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-lime/10 via-transparent to-transparent opacity-50" />
        <div className="absolute -top-1/4 -right-1/4 w-[60%] h-[60%] bg-lime/10 rounded-full blur-[140px] animate-pulse" />
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-12 max-w-xl relative z-10"
      >
        <div className="relative inline-block">
          <h1 className="text-[180px] md:text-[240px] font-display font-black uppercase italic tracking-tighter text-white/5 leading-none select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldAlert className="text-red-500 animate-pulse" size={80} />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-4xl md:text-5xl font-display font-black uppercase italic tracking-tighter text-white">
            Lost in <span className="text-lime">Transition</span>
          </h2>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 leading-relaxed">
            The zone you are looking for has been decommissioned or moved to a new sector.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={() => navigate('/search')}
            className="w-full sm:w-auto h-16 bg-lime text-charcoal px-10 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-lime/20"
          >
            Return to Search <Search size={18} />
          </button>
          <button 
            onClick={() => navigate('/')}
            className="w-full sm:w-auto h-16 glass text-white px-10 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all"
          >
            Go Home <ArrowRight size={18} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
