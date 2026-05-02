import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Clock, FileText, Upload, Trash2, Plus, Loader2 } from 'lucide-react';
import { Facility, UserProfile } from '../../types';
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

export const SettingsTab: React.FC<SettingsTabProps> = ({
  activeFac,
  profile,
  onUpdate,
  onKycUpload,
  onAddMedia,
  isUpdating,
  systemSettings
}) => {
  if (!activeFac) return <TableSkeleton />;

  const isVerified = (profile as any)?.verificationStatus === 'verified';
  const isPending = (profile as any)?.verificationStatus === 'pending';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
       <div className="space-y-8">
          <section className="glass p-5 sm:p-8 md:p-10 rounded-[40px] sm:rounded-[48px] border-white/5 space-y-8 sm:space-y-10 min-h-fit h-auto">
             <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter">Core <span className="text-white/40">Details</span></h3>
             <div className="space-y-6">
                <div className="space-y-3">
                   <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Facility Status</label>
                   <div className="p-1 glass rounded-2xl border-white/5 flex relative overflow-hidden h-14 cursor-pointer">
                      <div 
                        className={`absolute inset-y-1 transition-all duration-500 ease-out rounded-xl z-0 ${
                          activeFac.status !== 'DEACTIVATED' 
                            ? 'left-1 w-[calc(50%-4px)] bg-lime shadow-lg shadow-lime/20' 
                            : 'left-[calc(50%+1px)] w-[calc(50%-4px)] bg-red-500/20 border border-red-500/20'
                        }`}
                      />
                      <button 
                        onClick={() => onUpdate({ status: 'LIVE' })}
                        className={`flex-1 relative z-10 text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${
                          activeFac.status !== 'DEACTIVATED' ? 'text-charcoal' : 'text-slate-500 hover:text-white'
                        }`}
                      >
                        Live
                      </button>
                      <button 
                        onClick={() => onUpdate({ status: 'DEACTIVATED' })}
                        className={`flex-1 relative z-10 text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${
                          activeFac.status === 'DEACTIVATED' ? 'text-red-400' : 'text-slate-500 hover:text-white'
                        }`}
                      >
                        Deactivated
                      </button>
                   </div>
                </div>

                <div className="space-y-4">
                   <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Business Verification (KYC)</label>
                   <div className="p-8 glass rounded-[32px] border-white/5 border-dashed border-2 flex flex-col items-center text-center space-y-4">
                      {isVerified ? (
                        <>
                          <div className="w-12 h-12 bg-lime/20 rounded-full flex items-center justify-center text-lime">
                            <CheckCircle2 size={24} />
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-white">Business Verified</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Clearance granted for live operations</p>
                          </div>
                        </>
                      ) : isPending ? (
                        <>
                          <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-500">
                            <Clock size={24} />
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-white">Verification Pending</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Documents under review by administration</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-slate-500">
                            <FileText size={24} />
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-white">No Permits Uploaded</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Upload Business Permit or Owner ID</p>
                          </div>
                          <label className="bg-lime text-charcoal px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:scale-105 transition-all flex items-center gap-2">
                            <Upload size={14} />
                            Select File
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="application/pdf,image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) onKycUpload(file);
                              }}
                            />
                          </label>
                        </>
                      )}
                   </div>
                </div>
                <div className="space-y-3">
                   <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Gallery Manager</label>
                   <div className="grid grid-cols-3 gap-3">
                      {activeFac.images.map((img, i) => (
                        <div key={i} className="aspect-square glass rounded-2xl overflow-hidden relative group border-white/5">
                           <img src={img} className="w-full h-full object-cover" alt="Court" referrerPolicy="no-referrer" />
                           <button className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                              <Trash2 size={16} />
                           </button>
                        </div>
                      ))}
                      <button onClick={onAddMedia} className="aspect-square glass rounded-2xl border-white/5 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all text-lime">
                         <Plus size={20} />
                         <span className="text-[8px] font-black uppercase tracking-widest">Add Media</span>
                      </button>
                   </div>
                </div>
             </div>
          </section>
       </div>

       <div className="space-y-8">
          <section className="glass p-5 sm:p-8 md:p-10 rounded-[40px] sm:rounded-[48px] border-white/5 space-y-8 sm:space-y-10 min-h-fit h-auto flex flex-col">
             <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white">Amenities <span className="text-white/30">& UX</span></h3>
             <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'parking', label: 'Free Parking', icon: 'P' },
                  { id: 'indoor', label: 'Indoor Facility', icon: 'IN' },
                  { id: 'lighting', label: 'Night Lighting', icon: 'LT' },
                  { id: 'pro', label: 'Professional Grade', icon: 'PR' }
                ].map(amenity => {
                  const isSelected = activeFac.amenities?.includes(amenity.id);
                  return (
                    <button 
                      key={amenity.id}
                      onClick={() => {
                        const current = activeFac.amenities || [];
                        const next = isSelected ? current.filter(a => a !== amenity.id) : [...current, amenity.id];
                        onUpdate({ amenities: next });
                      }}
                      className={`p-6 rounded-[32px] border flex flex-col items-start gap-4 transition-all ${
                        isSelected ? 'bg-lime/10 border-lime/40 text-lime' : 'glass border-white/5 text-slate-500 hover:border-white/10'
                      }`}
                    >
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-black italic text-[11px] ${isSelected ? 'bg-lime text-charcoal' : 'glass'}`}>
                          {amenity.icon}
                        </div>
                       <span className="text-[10px] font-black uppercase tracking-widest">{amenity.label}</span>
                    </button>
                  );
                })}
             </div>
             <div className="pt-6 border-t border-white/5 space-y-4">
                <div className="flex items-center justify-between p-6 rounded-[32px] glass border-white/5">
                   <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Public Master Schedule</h4>
                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Allow players to view the full availability grid.</p>
                   </div>
                   <button 
                      onClick={() => onUpdate({ showPublicSchedule: !activeFac.showPublicSchedule })}
                      className={`w-12 h-6 rounded-full relative transition-all ${activeFac.showPublicSchedule ? 'bg-lime' : 'bg-white/10'}`}
                   >
                      <motion.div 
                        initial={false}
                        animate={{ x: activeFac.showPublicSchedule ? 24 : 4 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
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
