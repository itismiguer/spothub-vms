import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Settings2, 
  Circle, 
  CheckCircle2, 
  Building2, 
  Map as MapIcon, 
  Activity,
  Layers,
  Wind,
  Image as ImageIcon,
  DollarSign,
  Loader2,
  MoreVertical,
  X,
  Target
} from 'lucide-react';
import { Court, Facility } from '../../types';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import Modal from '../../components/Modal';

interface CourtsTabProps {
  courts: Court[];
  facility: Facility | null;
  isUpdating: boolean;
  onDelete: (court: Court) => void;
}

const SPORTS = [
  'Pickleball',
  'Padel',
  'Tennis',
  'Basketball',
  'Badminton',
  'Volleyball',
  'Futsal',
  'Squash'
];

const SURFACE_TYPES = [
  'Hard Court',
  'Clay',
  'Grass',
  'Artificial Turf',
  'Acrylic',
  'Wood/Parquet',
  'Rubber/PVC',
  'Sand'
];

export const CourtsTab: React.FC<CourtsTabProps> = ({
  courts,
  facility,
  isUpdating: parentIsUpdating,
  onDelete
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<Partial<Court>>({
    name: '',
    sport: 'Pickleball',
    hourly_rate: 1000,
    environment: 'OUTDOOR',
    surface_type: 'Hard Court',
    is_active: true,
    image_url: ''
  });

  const filteredCourts = courts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.sport.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingCourt(null);
    setFormData({
      name: '',
      sport: 'Pickleball',
      hourly_rate: 1000,
      environment: 'OUTDOOR',
      surface_type: 'Hard Court',
      is_active: true,
      image_url: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (court: Court) => {
    setEditingCourt(court);
    setFormData(court);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!facility) return;
    if (!formData.name || !formData.hourly_rate || !formData.sport) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCourt) {
        const { error } = await supabase
          .from('courts')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCourt.id);
        
        if (error) throw error;
        toast.success('Court updated successfully');
      } else {
        const { error } = await supabase
          .from('courts')
          .insert({
            ...formData,
            facility_id: facility.id
          });
        
        if (error) throw error;
        toast.success('New court added');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCourtStatus = async (court: Court) => {
    try {
      const { error } = await supabase
        .from('courts')
        .update({ is_active: !court.is_active })
        .eq('id', court.id);
      
      if (error) throw error;
      toast.success(`Court ${court.is_active ? 'disabled' : 'enabled'}`);
    } catch (err: any) {
      toast.error('Failed to toggle status');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-display font-black uppercase italic tracking-tighter">Court <span className="text-white/40">Inventory</span></h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Manage your physical layout & pricing</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Filter courts..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="glass border-white/5 pl-12 pr-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white placeholder:text-white/20 outline-none focus:border-lime/40 transition-all w-full md:w-64"
            />
          </div>
          <button 
            onClick={handleOpenAdd}
            className="bg-lime text-charcoal px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-lime/20"
          >
            <Plus size={16} /> Add Court
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCourts.map((court) => (
          <motion.div 
            layout
            key={court.id}
            className={`glass rounded-[32px] border-white/5 overflow-hidden flex flex-col group transition-all ${!court.is_active ? 'opacity-60 saturate-50' : ''}`}
          >
            <div className="aspect-[16/9] relative bg-white/5 overflow-hidden">
               {court.image_url ? (
                 <img src={court.image_url} alt={court.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
               ) : (
                 <div className="w-full h-full flex flex-col items-center justify-center text-white/10 gap-2">
                    <ImageIcon size={48} />
                    <span className="text-[8px] font-black uppercase tracking-widest">No Image Asset</span>
                 </div>
               )}
               <div className="absolute top-4 left-4 flex gap-2">
                 <div className="px-3 py-1 glass rounded-full text-[8px] font-black uppercase tracking-widest text-white border-white/10">
                   {court.sport}
                 </div>
                 <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-2 ${court.environment === 'INDOOR' ? 'bg-indigo-500 text-white' : 'bg-amber-500 text-charcoal'}`}>
                   {court.environment === 'INDOOR' ? <Wind size={10} /> : <Target size={10} />}
                   {court.environment}
                 </div>
               </div>
               
               <button 
                 onClick={() => toggleCourtStatus(court)}
                 className={`absolute top-4 right-4 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${court.is_active ? 'bg-lime text-charcoal shadow-lg shadow-lime/20' : 'bg-red-500 text-white'}`}
               >
                 {court.is_active ? <CheckCircle2 size={18} /> : <Circle size={18} />}
               </button>
            </div>

            <div className="p-6 space-y-6 flex-grow">
               <div className="flex items-start justify-between">
                  <div className="space-y-1">
                     <h4 className="text-xl font-display font-black uppercase italic tracking-tighter">{court.name}</h4>
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{court.surface_type}</p>
                  </div>
                  <div className="text-right">
                     <span className="text-2xl font-display font-black text-lime">{facility?.currency_code || 'USD'} {court.hourly_rate}</span>
                     <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Per Hour</p>
                  </div>
               </div>

               <div className="flex items-center gap-2 pt-6 border-t border-white/5">
                  <button 
                    onClick={() => handleOpenEdit(court)}
                    className="flex-1 glass border-white/5 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/5 transition-all text-white flex items-center justify-center gap-2"
                  >
                    <Settings2 size={14} /> Configure
                  </button>
                  <button 
                    onClick={() => onDelete(court)}
                    className="w-12 h-11 glass border-white/5 rounded-xl transition-all hover:bg-red-500/10 hover:border-red-500/20 text-red-400 flex items-center justify-center"
                  >
                    <Trash2 size={14} />
                  </button>
               </div>
            </div>
          </motion.div>
        ))}

        {filteredCourts.length === 0 && (
          <div className="col-span-full py-40 flex flex-col items-center justify-center text-center space-y-8 glass border-white/5 rounded-[48px] relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-b from-lime/5 to-transparent pointer-events-none" />
             <div className="w-24 h-24 rounded-[32px] bg-lime/10 flex items-center justify-center text-lime border border-lime/20 shadow-[0_0_40px_rgba(212,255,0,0.1)] relative z-10">
               <Building2 size={48} strokeWidth={1} />
             </div>
             <div className="space-y-3 relative z-10">
               <h3 className="text-3xl font-display font-black uppercase italic tracking-tighter text-white">No active <span className="text-white/40">inventory</span></h3>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] max-w-sm mx-auto leading-loose">Initialize your first digital court asset to begin accepting reservations on the network.</p>
             </div>
             <button 
               onClick={handleOpenAdd}
               className="relative z-10 bg-lime text-charcoal px-12 py-6 rounded-[32px] font-black uppercase tracking-widest text-xs hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-lime/40 flex items-center gap-3"
             >
               <Plus size={20} /> Deploy Your First Court
             </button>
          </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => !isSubmitting && setIsModalOpen(false)} 
        title={editingCourt ? "Edit Configuration" : "New Deployment"}
      >
        <div className="space-y-8">
           <div className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">Court Designation</label>
                 <input 
                   type="text" 
                   placeholder="E.G. CHAMPIONSHIP COURT 1"
                   value={formData.name}
                   onChange={e => setFormData(p => ({ ...p, name: e.target.value.toUpperCase() }))}
                   className="w-full glass border-white/10 p-5 rounded-2xl text-sm font-black uppercase tracking-widest focus:border-lime/60 transition-all text-white placeholder:text-white/10"
                 />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">Sport discipline</label>
                    <select 
                      value={formData.sport}
                      onChange={e => setFormData(p => ({ ...p, sport: e.target.value }))}
                      className="w-full text-[11px] font-black uppercase tracking-widest outline-none"
                    >
                       {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">Hourly Rate ({facility?.currency_code || 'USD'})</label>
                    <div className="relative">
                       <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                       <input 
                         type="number" 
                         placeholder="0"
                         value={formData.hourly_rate}
                         onChange={e => setFormData(p => ({ ...p, hourly_rate: parseInt(e.target.value) }))}
                         className="w-full glass border-white/10 p-5 pl-10 rounded-2xl text-sm font-black focus:border-lime/60 transition-all text-white"
                       />
                    </div>
                 </div>
              </div>

              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">Surface & Environment</label>
                 <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setFormData(p => ({ ...p, environment: p.environment === 'INDOOR' ? 'OUTDOOR' : 'INDOOR' }))}
                      className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${formData.environment === 'INDOOR' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-500'}`}
                    >
                       <span className="text-[9px] font-black uppercase tracking-widest">{formData.environment}</span>
                       <div className={`w-8 h-4 rounded-full relative transition-all ${formData.environment === 'INDOOR' ? 'bg-indigo-500' : 'bg-amber-500'}`}>
                          <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${formData.environment === 'INDOOR' ? 'right-0.5' : 'left-0.5'}`} />
                       </div>
                    </button>
                    <select 
                      value={formData.surface_type}
                      onChange={e => setFormData(p => ({ ...p, surface_type: e.target.value }))}
                      className="w-full text-[9px] font-black uppercase tracking-widest outline-none"
                    >
                       {SURFACE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">Asset URL (Court Photo)</label>
                 <div className="relative">
                    <ImageIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="text" 
                      placeholder="HTTPS://..."
                      value={formData.image_url}
                      onChange={e => setFormData(p => ({ ...p, image_url: e.target.value }))}
                      className="w-full glass border-white/10 p-5 pl-14 rounded-3xl text-[10px] font-black focus:border-lime/60 transition-all text-white placeholder:text-white/10"
                    />
                 </div>
              </div>

              <div className="flex items-center justify-between p-6 rounded-[32px] glass border-white/5 group clickable" onClick={() => setFormData(p => ({ ...p, is_active: !p.is_active }))}>
                 <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white">Active Status</p>
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Determines if players can book this court</p>
                 </div>
                 <div className={`w-12 h-6 rounded-full relative transition-all ${formData.is_active ? 'bg-lime' : 'bg-white/10'}`}>
                    <motion.div animate={{ x: formData.is_active ? 26 : 4 }} className="absolute top-1 w-4 h-4 rounded-full bg-white" />
                 </div>
              </div>
           </div>

           <div className="flex gap-4">
              <button 
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="flex-1 glass border-white/5 py-5 rounded-[24px] text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-[2] bg-lime text-charcoal py-5 rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-lime/20 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : editingCourt ? 'Update Configuration' : 'Deploy Court'}
              </button>
           </div>
        </div>
      </Modal>
    </div>
  );
};
