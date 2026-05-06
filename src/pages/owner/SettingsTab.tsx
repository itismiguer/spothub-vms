import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Clock, FileText, Upload, Trash2, Plus, Loader2, Globe, Settings2, Moon, Sun, AlertCircle } from 'lucide-react';
import { Facility, UserProfile, OpeningHours, DaySchedule } from '../../types';
import { TableSkeleton } from '../../components/Skeletons';

interface SettingsTabProps {
  activeFac: Facility | null;
  profile: UserProfile | null;
  onUpdate: (data: Partial<Facility>) => void;
  onKycUpload: (file: File) => void;
  onAddMedia: () => void;
  isUpdating: boolean;
  systemSettings: any;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Paris',
  'Asia/Manila',
  'Asia/Singapore',
  'Asia/Dubai',
  'Asia/Tokyo',
  'Australia/Sydney',
];

export const SettingsTab: React.FC<SettingsTabProps> = ({
  activeFac,
  profile,
  onUpdate,
  onKycUpload,
  onAddMedia,
  isUpdating,
}) => {
  if (!activeFac) return <TableSkeleton />;

  const [localHours, setLocalHours] = useState<OpeningHours>(activeFac.opening_hours || {
    monday: { open: '08:00', close: '22:00', closed: false },
    tuesday: { open: '08:00', close: '22:00', closed: false },
    wednesday: { open: '08:00', close: '22:00', closed: false },
    thursday: { open: '08:00', close: '22:00', closed: false },
    friday: { open: '08:00', close: '22:00', closed: false },
    saturday: { open: '08:00', close: '22:00', closed: false },
    sunday: { open: '08:00', close: '22:00', closed: false },
  });

  const isVerified = (profile as any)?.verificationStatus === 'verified';
  const isPending = (profile as any)?.verificationStatus === 'pending';

  const handleHourChange = (day: keyof OpeningHours, field: keyof DaySchedule, value: any) => {
    const nextDaySchedule = { ...localHours[day], [field]: value };
    const next = { ...localHours, [day]: nextDaySchedule };
    setLocalHours(next);

    // Only update if valid or closed
    const isValid = nextDaySchedule.closed || nextDaySchedule.close > nextDaySchedule.open;
    if (isValid) {
      onUpdate({ opening_hours: next });
    }
  };

  const calculateTotalWeeklyHours = () => {
    const total = Object.values(localHours).reduce((acc: number, day: any) => {
      if (day.closed) return acc;
      const [oH, oM] = (day.open as string).split(':').map(Number);
      const [cH, cM] = (day.close as string).split(':').map(Number);
      const hours = (cH + cM / 60) - (oH + oM / 60);
      return acc + (hours > 0 ? hours : 0);
    }, 0);
    return (total as number).toFixed(1);
  };

  const weeklyHours = calculateTotalWeeklyHours();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
       <div className="space-y-8">
          <section className="glass p-8 sm:p-10 rounded-[48px] border-white/5 space-y-10">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter">Business <span className="text-white/40">Hours</span></h3>
                <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-full border border-white/5">
                   <div className="w-2 h-2 rounded-full bg-lime animate-pulse" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                     Your venue is open <span className="text-lime">{weeklyHours} hours</span> a week
                   </span>
                </div>
             </div>
             
             <div className="space-y-3">
                {DAYS.map((day) => {
                  const schedule = localHours[day];
                  const isValid = schedule.closed || schedule.close > schedule.open;
                  
                  return (
                    <div key={day} className={`group flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-3xl border transition-all ${
                      schedule.closed ? 'bg-white/[0.02] border-white/5 opacity-50' : 'glass border-white/5 hover:border-white/10'
                    }`}>
                       <div className="flex items-center gap-4 mb-4 sm:mb-0">
                          <button 
                            onClick={() => handleHourChange(day, 'closed', !schedule.closed)}
                            className={`w-12 h-6 rounded-full relative transition-all ${schedule.closed ? 'bg-red-500/20' : 'bg-lime'}`}
                          >
                             <motion.div 
                               initial={false}
                               animate={{ x: schedule.closed ? 4 : 24 }}
                               className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-lg"
                             />
                          </button>
                          <span className="text-xs font-black uppercase italic tracking-widest min-w-[100px]">{day}</span>
                       </div>

                       <div className="flex items-center gap-3">
                          {!schedule.closed ? (
                            <>
                              <div className="flex items-center gap-2 glass px-4 py-2 rounded-xl border-white/5">
                                 <Sun size={12} className="text-amber-500" />
                                 <input 
                                   type="time" 
                                   value={schedule.open} 
                                   onChange={(e) => handleHourChange(day, 'open', e.target.value)}
                                   className="bg-transparent text-[10px] font-black text-white outline-none"
                                 />
                              </div>
                              <span className="text-slate-500 font-bold">→</span>
                              <div className={`flex items-center gap-2 glass px-4 py-2 rounded-xl border ${isValid ? 'border-white/5' : 'border-red-500/40'}`}>
                                 <Moon size={12} className="text-indigo-400" />
                                 <input 
                                   type="time" 
                                   value={schedule.close} 
                                   onChange={(e) => handleHourChange(day, 'close', e.target.value)}
                                   className="bg-transparent text-[10px] font-black text-white outline-none"
                                 />
                              </div>
                              {!isValid && <AlertCircle size={14} className="text-red-500 animate-pulse" />}
                            </>
                          ) : (
                            <span className="text-[10px] font-black text-red-500/60 uppercase tracking-widest italic px-4 py-2">Facility Closed</span>
                          )}
                       </div>
                    </div>
                  );
                })}
             </div>
          </section>

          <section className="glass p-8 sm:p-10 rounded-[48px] border-white/5 space-y-8">
             <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter">Global <span className="text-white/40">Localization</span></h3>
             <div className="space-y-6">
                <div className="space-y-3">
                   <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Venue Timezone</label>
                   <div className="relative">
                      <Globe className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <select 
                        value={activeFac.timezone || 'UTC'}
                        onChange={(e) => onUpdate({ timezone: e.target.value })}
                        className="w-full text-xs font-black uppercase tracking-widest outline-none"
                      >
                         {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                      </select>
                   </div>
                </div>
                
                <div className="space-y-3">
                   <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Operational Slop (Buffer Time)</label>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="glass p-5 rounded-3xl border-white/5 flex flex-col gap-1">
                         <span className="text-[8px] font-black text-slate-500 uppercase">Buffer between games</span>
                         <div className="flex items-center gap-2">
                           <input 
                             type="number" 
                             value={activeFac.buffer_time_mins || 0}
                             onChange={(e) => onUpdate({ buffer_time_mins: parseInt(e.target.value) })}
                             className="bg-transparent text-2xl font-display font-black text-lime outline-none w-16"
                           />
                           <span className="text-[10px] font-black text-white uppercase italic">Mins</span>
                         </div>
                      </div>
                      <div className="glass p-5 rounded-3xl border-white/5 flex flex-col gap-1">
                         <span className="text-[8px] font-black text-slate-500 uppercase">Min Reservation</span>
                         <div className="flex items-center gap-2">
                           <input 
                             type="number" 
                             value={activeFac.min_booking_duration_mins || 60}
                             onChange={(e) => onUpdate({ min_booking_duration_mins: parseInt(e.target.value) })}
                             className="bg-transparent text-2xl font-display font-black text-lime outline-none w-16"
                           />
                           <span className="text-[10px] font-black text-white uppercase italic">Mins</span>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </section>
       </div>

       <div className="space-y-8">
          <section className="glass p-8 sm:p-10 rounded-[48px] border-white/5 space-y-10">
             <div className="flex items-center justify-between">
                <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter">Core <span className="text-white/40">Identity</span></h3>
                {isUpdating && <Loader2 className="animate-spin text-lime" size={20} />}
             </div>
             
             <div className="space-y-6">
                <div className="space-y-3">
                   <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Venue Designation</label>
                   <input 
                      type="text" 
                      value={activeFac.name}
                      onChange={(e) => onUpdate({ name: e.target.value })}
                      placeholder="VENUE NAME"
                      className="w-full glass border-white/5 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none focus:border-lime/40"
                   />
                </div>

                <div className="space-y-3">
                   <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Deployment Description</label>
                   <textarea 
                      value={activeFac.description || ''}
                      onChange={(e) => onUpdate({ description: e.target.value })}
                      placeholder="Describe your facility operational capacity..."
                      className="w-full glass border-white/5 px-6 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-widest outline-none focus:border-lime/40 min-h-[120px] resize-none"
                   />
                </div>

                <div className="space-y-3">
                   <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Physical Coordinates (Address)</label>
                   <input 
                      type="text" 
                      value={activeFac.address}
                      onChange={(e) => onUpdate({ address: e.target.value })}
                      placeholder="STREET, CITY, COUNTRY"
                      className="w-full glass border-white/5 px-6 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-widest outline-none focus:border-lime/40"
                   />
                </div>

                <div className="space-y-3">
                   <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Visibility Status</label>
                   <div className="p-1 glass rounded-2xl border-white/5 flex relative overflow-hidden h-14">
                      <div 
                        className={`absolute inset-y-1 transition-all duration-500 ease-out rounded-xl z-0 ${
                          activeFac.status !== 'DEACTIVATED' 
                            ? 'left-1 w-[calc(50%-4px)] bg-lime shadow-lg shadow-lime/20' 
                            : 'left-[calc(50%+1px)] w-[calc(50%-4px)] bg-red-500/20 border border-red-500/20'
                        }`}
                      />
                      <button 
                        onClick={() => onUpdate({ status: 'LIVE' })}
                        className={`flex-1 relative z-10 text-[10px] font-black uppercase tracking-widest transition-colors ${
                          activeFac.status !== 'DEACTIVATED' ? 'text-charcoal' : 'text-slate-500'
                        }`}
                      >
                        Active
                      </button>
                      <button 
                        onClick={() => onUpdate({ status: 'DEACTIVATED' })}
                        className={`flex-1 relative z-10 text-[10px] font-black uppercase tracking-widest transition-colors ${
                          activeFac.status === 'DEACTIVATED' ? 'text-red-400' : 'text-slate-500'
                        }`}
                      >
                        Deactivated
                      </button>
                   </div>
                </div>

                <div className="space-y-4">
                   <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Trust Badges (KYC)</label>
                   <div className={`p-8 rounded-[40px] border-2 border-dashed flex flex-col items-center text-center space-y-4 transition-all ${
                     isVerified ? 'bg-lime/5 border-lime/20' : 'glass border-white/5'
                   }`}>
                      {isVerified ? (
                        <>
                          <div className="w-12 h-12 bg-lime text-charcoal rounded-full flex items-center justify-center">
                            <CheckCircle2 size={24} />
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest text-white">Business Verified</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Full operational clearance</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-slate-500">
                            <FileText size={24} />
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest text-white">Awaiting Validation</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Upload permits to go public</p>
                          </div>
                          <label className="bg-white text-charcoal px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                            <Upload size={14} /> Upload KYC
                            <input type="file" className="hidden" accept="application/pdf,image/*" onChange={(e) => e.target.files?.[0] && onKycUpload(e.target.files[0])} />
                          </label>
                        </>
                      )}
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Gallery</label>
                      <button onClick={onAddMedia} className="text-lime text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
                        <Plus size={14} /> Add Media
                      </button>
                   </div>
                   <div className="grid grid-cols-3 gap-3">
                      {activeFac.images.map((img, i) => (
                        <div key={i} className="aspect-square glass rounded-2xl overflow-hidden relative group border-white/5">
                           <img src={img} className="w-full h-full object-cover" alt="Venue" referrerPolicy="no-referrer" />
                           <button className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white">
                              <Trash2 size={16} />
                           </button>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </section>

          <section className="glass p-8 sm:p-10 rounded-[48px] border-white/5 space-y-8">
             <div className="flex items-center justify-between">
                <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter">Small <span className="text-white/40">Details</span></h3>
                <Settings2 size={20} className="text-slate-500" />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => onUpdate({ has_canteen: !activeFac.has_canteen })}
                  className={`p-6 rounded-[32px] border flex items-center justify-between transition-all ${
                    activeFac.has_canteen ? 'bg-lime/10 border-lime/40 text-lime' : 'glass border-white/5 text-slate-500'
                  }`}
                >
                   <span className="text-[10px] font-black uppercase tracking-widest">Canteen</span>
                   <div className={`w-8 h-4 rounded-full relative transition-all ${activeFac.has_canteen ? 'bg-lime' : 'bg-white/10'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${activeFac.has_canteen ? 'right-0.5' : 'left-0.5'}`} />
                   </div>
                </button>
                <button 
                  onClick={() => onUpdate({ allow_outside_food: !activeFac.allow_outside_food })}
                  className={`p-6 rounded-[32px] border flex items-center justify-between transition-all ${
                    activeFac.allow_outside_food ? 'bg-lime/10 border-lime/40 text-lime' : 'glass border-white/5 text-slate-500'
                  }`}
                >
                   <span className="text-[10px] font-black uppercase tracking-widest">Outside Food</span>
                   <div className={`w-8 h-4 rounded-full relative transition-all ${activeFac.allow_outside_food ? 'bg-lime' : 'bg-white/10'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${activeFac.allow_outside_food ? 'right-0.5' : 'left-0.5'}`} />
                   </div>
                </button>
             </div>
             
             <div className="space-y-4 pt-6 border-t border-white/5">
                <div className="flex items-center justify-between p-6 rounded-3xl glass border-white/5">
                   <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Public Schedule Grid</h4>
                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Let players see full availability</p>
                   </div>
                   <button 
                      onClick={() => onUpdate({ show_public_schedule: !activeFac.show_public_schedule })}
                      className={`w-12 h-6 rounded-full relative transition-all ${activeFac.show_public_schedule ? 'bg-lime' : 'bg-white/10'}`}
                   >
                      <motion.div 
                        initial={false}
                        animate={{ x: activeFac.show_public_schedule ? 26 : 4 }}
                        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-lg"
                      />
                   </button>
                </div>
             </div>
          </section>
       </div>
    </div>
  );
};
