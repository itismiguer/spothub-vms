import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { motion } from 'motion/react';
import { Plus, Trash2, Loader2, ArrowRight, Activity, Zap, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function AddCourts() {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState('PHP');
  const [courts, setCourts] = useState([
    { name: 'Court 1', hourly_rate: 1000, sport: 'PICKLEBALL', environment: 'OUTDOOR', surface: 'HARD' }
  ]);

  useEffect(() => {
    async function fetchVenue() {
      if (!venueId) return;
      const { data } = await supabase.from('venues').select('currency_code').eq('id', venueId).single();
      if (data?.currency_code) setCurrency(data.currency_code);
    }
    fetchVenue();
  }, [venueId]);

  if (!venueId) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-8 text-center space-y-4 relative overflow-x-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-lime/10 via-transparent to-transparent opacity-50" />
          <div className="absolute -top-1/4 -right-1/4 w-[60%] h-[60%] bg-lime/10 rounded-full blur-[140px] animate-pulse" />
        </div>
        <div className="relative z-10">
          <h2 className="text-2xl font-display font-black uppercase italic text-white">Missing Session</h2>
          <p className="text-slate-500 uppercase text-[10px] tracking-widest">No venue ID detected. Return to onboarding.</p>
          <button onClick={() => navigate('/onboarding')} className="bg-lime text-charcoal px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] mt-4">Back</button>
        </div>
      </div>
    );
  }

  const handleAddCourt = () => {
    setCourts([...courts, { 
      name: `Court ${courts.length + 1}`, 
      hourly_rate: 1000, 
      sport: 'PICKLEBALL', 
      environment: 'OUTDOOR', 
      surface: 'HARD' 
    }]);
  };

  const handleRemoveCourt = (i: number) => {
    setCourts(courts.filter((_, idx) => idx !== i));
  };

  const handleUpdateCourt = (i: number, field: string, value: any) => {
    const next = [...courts];
    (next[i] as any)[field] = value;
    setCourts(next);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const courtsToInsert = courts.map(c => ({
        facility_id: venueId,
        name: c.name.toUpperCase(),
        hourly_rate: c.hourly_rate,
        sport: c.sport.toUpperCase(),
        environment: c.environment.toUpperCase(),
        surface: c.surface.toUpperCase(),
        is_active: true
      }));

      const { error } = await supabase.from('courts').insert(courtsToInsert);
      if (error) throw error;

      toast.success("Courts registered! Taking you to your dashboard.");
      navigate(`/manage/venues/${venueId}`);
    } catch (err: any) {
      toast.error("Deployment failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const currencySymbolMap: Record<string, string> = {
    'PHP': '₱',
    'USD': '$',
    'GBP': '£',
    'EUR': '€',
    'AED': 'Dh',
    'SGD': 'S$',
    'AUD': 'A$'
  };

  return (
    <div className="min-h-screen bg-transparent text-white p-6 md:p-12 flex flex-col items-center relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-lime/10 via-transparent to-transparent opacity-50" />
        <div className="absolute -top-1/4 -right-1/4 w-[60%] h-[60%] bg-lime/10 rounded-full blur-[140px] animate-pulse" />
      </div>

      <div className="w-full max-w-3xl space-y-12 relative z-10">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 glass border-lime/30 rounded-[32px] flex items-center justify-center text-lime shadow-2xl shadow-lime/10 animate-bounce">
            <Zap size={40} />
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl font-display font-black uppercase italic tracking-tighter">Inventory <span className="text-lime">Deployment</span></h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic">Venue ID: {venueId.split('-')[0]} // Configure units for service</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-400">Unit Portfolio</h3>
            <button 
              onClick={handleAddCourt}
              className="px-6 py-3 glass border-lime/20 text-lime rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest hover:bg-lime/10 transition-all shadow-xl"
            >
              <Plus size={16} /> Add Unit
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {courts.map((court, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                className="glass p-8 rounded-[40px] border-white/5 space-y-8 relative group hover:border-white/10 transition-all overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-lime scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
                
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-1 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Name</label>
                        <input 
                          type="text"
                          value={court.name}
                          placeholder="EX. COURT A1"
                          onChange={e => handleUpdateCourt(i, 'name', e.target.value)}
                          className="w-full glass border-white/10 p-5 rounded-3xl text-sm font-black uppercase italic tracking-widest text-white outline-none focus:border-lime/40 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Hourly Rate ({currency})</label>
                        <div className="relative">
                          <input 
                            type="number"
                            value={court.hourly_rate}
                            onChange={e => handleUpdateCourt(i, 'hourly_rate', parseInt(e.target.value))}
                            className="w-full glass border-white/10 p-5 rounded-3xl text-sm font-black italic text-lime outline-none focus:border-lime/40 pl-10"
                          />
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-lime/50">{currencySymbolMap[currency] || '₱'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Sport</label>
                        <div className="relative group/select">
                          <select 
                            value={court.sport}
                            onChange={e => handleUpdateCourt(i, 'sport', e.target.value)}
                            className="w-full bg-[#1A1A1A] border border-white/10 p-5 rounded-3xl text-[10px] font-black uppercase tracking-widest text-white appearance-none cursor-pointer focus:border-lime/60 transition-all pr-12"
                          >
                            <option value="PICKLEBALL">PICKLEBALL</option>
                            <option value="TENNIS">TENNIS</option>
                            <option value="BASKETBALL">BASKETBALL</option>
                            <option value="BADMINTON">BADMINTON</option>
                            <option value="PADEL">PADEL</option>
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-lime">
                            <Plus size={14} className="rotate-45" />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Environment</label>
                        <div className="relative group/select">
                          <select 
                            value={court.environment}
                            onChange={e => handleUpdateCourt(i, 'environment', e.target.value)}
                            className="w-full bg-[#1A1A1A] border border-white/10 p-5 rounded-3xl text-[10px] font-black uppercase tracking-widest text-white appearance-none cursor-pointer focus:border-lime/60 transition-all pr-12"
                          >
                            <option value="INDOOR">INDOOR</option>
                            <option value="OUTDOOR">OUTDOOR</option>
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-lime">
                            <Plus size={14} className="rotate-45" />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Surface</label>
                        <div className="relative group/select">
                          <select 
                            value={court.surface}
                            onChange={e => handleUpdateCourt(i, 'surface', e.target.value)}
                            className="w-full bg-[#1A1A1A] border border-white/10 p-5 rounded-3xl text-[10px] font-black uppercase tracking-widest text-white appearance-none cursor-pointer focus:border-lime/60 transition-all pr-12"
                          >
                            <option value="HARD">HARD</option>
                            <option value="CLAY">CLAY</option>
                            <option value="TURF">TURF</option>
                            <option value="WOOD">WOOD</option>
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-lime">
                            <Plus size={14} className="rotate-45" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex md:flex-col justify-end gap-2">
                    {courts.length > 1 && (
                      <button 
                        onClick={() => handleRemoveCourt(i)}
                        className="w-14 h-14 bg-red-500/10 border border-red-500/20 text-red-500 rounded-3xl flex items-center justify-center hover:bg-red-500/20 transition-all shadow-lg"
                      >
                        <Trash2 size={24} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="pt-12">
          <button 
            onClick={handleFinish}
            disabled={loading || courts.length === 0}
            className="w-full h-24 bg-lime text-charcoal rounded-[32px] flex items-center justify-center gap-6 group hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-lime/20"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={32} />
            ) : (
              <>
                <span className="text-3xl font-display font-black uppercase italic tracking-tighter">Initialize Listing</span>
                <ArrowRight className="group-hover:translate-x-3 transition-transform" size={40} />
              </>
            )}
          </button>
          <div className="mt-8 flex items-center justify-center gap-12 opacity-30">
            <div className="flex items-center gap-3">
              <Shield size={16} />
              <span className="text-[8px] font-black uppercase tracking-[0.3em]">SECURE LAYER</span>
            </div>
            <div className="flex items-center gap-3">
              <Activity size={16} />
              <span className="text-[8px] font-black uppercase tracking-[0.3em]">LIVE STATUS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
