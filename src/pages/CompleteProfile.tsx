import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Building2, CheckCircle2, ArrowRight, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export default function CompleteProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'PLAYER' | 'OWNER' | null>(null);

  const handleComplete = async () => {
    if (!selectedRole || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: selectedRole })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success(`Success! Welcome to the network as a ${selectedRole}.`);
      
      if (selectedRole === 'OWNER') {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      toast.error('Failed to update profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col items-center justify-center p-6 relative overflow-x-hidden">
      {/* Background Accents */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-lime/10 via-transparent to-transparent opacity-50" />
        <div className="absolute -top-1/4 -right-1/4 w-[60%] h-[60%] bg-lime/10 rounded-full blur-[140px] animate-pulse" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full space-y-12 relative z-10"
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-lime/20 rounded-2xl flex items-center justify-center mb-4">
            <Activity className="text-lime" size={32} />
          </div>
          <h1 className="text-5xl font-display font-black uppercase italic tracking-tighter">Initialize <span className="text-lime">Identity</span></h1>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] max-w-sm">Select your primary operational mode to configure your console interface.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Player Option */}
          <button
            onClick={() => setSelectedRole('PLAYER')}
            className={`group p-8 rounded-[40px] border-2 transition-all text-left space-y-6 relative overflow-hidden ${
              selectedRole === 'PLAYER' 
                ? 'bg-lime border-lime shadow-[0_0_50px_rgba(212,255,0,0.2)]' 
                : 'bg-white/5 border-white/10 hover:border-white/20'
            }`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              selectedRole === 'PLAYER' ? 'bg-charcoal text-lime' : 'bg-white/10 text-white group-hover:scale-110'
            }`}>
              <User size={24} />
            </div>
            <div className="space-y-2">
              <h3 className={`text-2xl font-display font-black uppercase italic tracking-tight ${
                selectedRole === 'PLAYER' ? 'text-charcoal' : 'text-white'
              }`}>The Player</h3>
              <p className={`text-[10px] font-bold uppercase tracking-widest leading-relaxed ${
                selectedRole === 'PLAYER' ? 'text-charcoal/60' : 'text-slate-500'
              }`}>
                Book courts, follow facilities, and compete in the network.
              </p>
            </div>
            {selectedRole === 'PLAYER' && (
              <div className="absolute top-6 right-6 text-charcoal">
                <CheckCircle2 size={24} />
              </div>
            )}
          </button>

          {/* Owner Option */}
          <button
            onClick={() => setSelectedRole('OWNER')}
            className={`group p-8 rounded-[40px] border-2 transition-all text-left space-y-6 relative overflow-hidden ${
              selectedRole === 'OWNER' 
                ? 'bg-lime border-lime shadow-[0_0_50px_rgba(212,255,0,0.2)]' 
                : 'bg-white/5 border-white/10 hover:border-white/20'
            }`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              selectedRole === 'OWNER' ? 'bg-charcoal text-lime' : 'bg-white/10 text-white group-hover:scale-110'
            }`}>
              <Building2 size={24} />
            </div>
            <div className="space-y-2">
              <h3 className={`text-2xl font-display font-black uppercase italic tracking-tight ${
                selectedRole === 'OWNER' ? 'text-charcoal' : 'text-white'
              }`}>The Owner</h3>
              <p className={`text-[10px] font-bold uppercase tracking-widest leading-relaxed ${
                selectedRole === 'OWNER' ? 'text-charcoal/60' : 'text-slate-500'
              }`}>
                List your venue, manage inventory, and deploy digital booking.
              </p>
            </div>
            {selectedRole === 'OWNER' && (
              <div className="absolute top-6 right-6 text-charcoal">
                <CheckCircle2 size={24} />
              </div>
            )}
          </button>
        </div>

        <button
          onClick={handleComplete}
          disabled={!selectedRole || loading}
          className={`w-full h-16 rounded-[24px] font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-4 transition-all ${
            selectedRole && !loading
              ? 'bg-white text-charcoal hover:scale-[1.02] active:scale-95 shadow-2xl'
              : 'bg-white/5 text-white/20 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <Activity className="animate-spin" size={24} />
          ) : (
            <>
              Confirm Credentials
              <ArrowRight size={20} />
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}
