import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, User, Plus, Calendar, CheckCircle2, Star, Clock, ShieldAlert, Share2, Copy, QrCode, Loader2, Trash2, Edit3, Database } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { StatCard } from './components/StatCard';
import { Facility, Court, Booking, Review } from '../../types';
import { TableSkeleton } from '../../components/Skeletons';

interface OverviewTabProps {
  selectedFacilityId: string | null;
  courts: Court[];
  bookings: Booking[];
  reviews: Review[];
  loading: boolean;
  isUpdating: boolean;
  onManualEntry: () => void;
  onAddCourt: () => void;
  onEditCourt: (court: Court) => void;
  onDeleteCourt: (court: Court) => void;
  onViewSchedule: (court: Court) => void;
  onApproveBooking: (id: string) => Promise<void>;
  onDeclineBooking: (id: string) => Promise<void>;
  onLockdown: () => void;
  onCopyLink: () => void;
  onShare: () => void;
  onShowQR: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  selectedFacilityId,
  courts,
  bookings,
  reviews,
  loading,
  isUpdating,
  onManualEntry,
  onAddCourt,
  onEditCourt,
  onDeleteCourt,
  onViewSchedule,
  onApproveBooking,
  onDeclineBooking,
  onLockdown,
  onCopyLink,
  onShare,
  onShowQR
}) => {
  // Early Returns
  if (loading) return <TableSkeleton />;

  const totalBookings = bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED').length;
  const avgRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : 'New';
  const pendingBookings = bookings.filter(b => ['PENDING', 'PENDING_PROOF', 'UNDER_REVIEW'].includes(b.status));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard 
            label="Total Bookings" 
            value={totalBookings} 
            subValue="All Time" 
            icon={CheckCircle2} 
            color="lime" 
          />
          <StatCard 
            label="Facility Rating" 
            value={avgRating} 
            subValue={reviews.length > 0 ? `${reviews.length} Reviews` : 'No reviews'} 
            icon={Star} 
            color="blue" 
          />
        </div>

        <section className="glass p-6 sm:p-10 rounded-[48px] border-white/5 space-y-10 min-h-max h-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <h2 className="text-2xl sm:text-3xl font-display font-black uppercase italic tracking-tight">
              Active <span className="text-white/40">Courts</span> <span className="text-lime">/ {courts.length}</span>
            </h2>
            <div className="flex flex-wrap gap-3 w-full lg:w-auto">
              <Link 
                to={`/owner?tab=courts&facilityId=${selectedFacilityId}`}
                className="flex-1 sm:flex-none min-w-fit h-[52px] bg-lime text-charcoal px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-105 active:scale-95 shadow-xl shadow-lime/20 whitespace-nowrap"
              >
                <Database size={14} /> Inventory
              </Link>
              <button 
                onClick={onManualEntry}
                className="flex-1 sm:flex-none min-w-fit h-[52px] glass border-white/10 text-white px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:border-white/20 active:scale-95 transition-all whitespace-nowrap"
              >
                 <User size={14} /> Manual Block
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {courts.slice(0, 4).map(court => (
              <div key={court.id} className="p-8 rounded-[40px] glass border-white/5 group relative hover:border-lime/40 transition-all">
                <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center font-display font-black italic text-lime border-lime/20 uppercase">
                      {court.sport.charAt(0)}
                    </div>
                     <div className="flex gap-2">
                        <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${court.is_active ? 'bg-lime/20 text-lime' : 'bg-red-500/20 text-red-400'}`}>
                          {court.is_active ? 'Active' : 'Inactive'}
                        </div>
                     </div>
                </div>
                <h3 className="text-2xl font-display font-black uppercase italic text-white/90">{court.name}</h3>
                <p className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-widest leading-none">{court.hourly_rate} / hour</p>
                <button 
                  onClick={() => onViewSchedule(court)}
                  className="text-[10px] uppercase font-bold tracking-[0.2em] text-lime flex items-center gap-2 hover:gap-4 transition-all"
                >
                  View Schedule <Calendar size={14} />
                </button>
              </div>
            ))}
            {courts.length > 4 && (
              <Link 
                 to={`/owner?tab=courts&facilityId=${selectedFacilityId}`}
                 className="flex flex-col items-center justify-center p-8 rounded-[40px] glass border-dashed border-white/10 text-slate-500 hover:text-white hover:border-white/20 transition-all"
              >
                <Plus size={24} className="mb-2" />
                <span className="text-[10px] font-black uppercase tracking-widest">View {courts.length - 4} More Courts</span>
              </Link>
            )}
          </div>
        </section>

        {pendingBookings.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between px-2">
               <h2 className="text-2xl font-display font-black uppercase italic tracking-tight">Pending <span className="text-orange-500">Approvals</span></h2>
               <span className="bg-orange-500/20 text-orange-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">Action Required</span>
            </div>
            <div className="grid grid-cols-1 gap-4">
               {pendingBookings.map(booking => (
                 <div key={booking.id} className="glass border-orange-500/20 p-8 rounded-[40px] flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-orange-500/10">
                    <div className="flex items-center gap-6">
                       <div className="w-16 h-16 bg-orange-500/10 rounded-[24px] flex items-center justify-center text-orange-500 border border-orange-500/20">
                          <Clock size={32} />
                       </div>
                       <div>
                          <div className="flex items-center gap-3">
                             <p className="text-xl font-display font-black uppercase italic text-white leading-none">{booking.user_name}</p>
                             <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                               booking.status === 'PENDING_PROOF' ? 'bg-blue-500/20 text-blue-400 border-blue-500/20' : 
                               booking.status === 'UNDER_REVIEW' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20' : 
                               'bg-orange-500/20 text-orange-500 border-orange-500/20'
                             }`}>
                                {booking.status.replace('_', ' ')}
                             </span>
                          </div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">
                             {courts.find(c => c.id === booking.court_id)?.name} • {format(new Date(booking.start_time), 'MMM dd, h:mm a')}
                          </p>
                       </div>
                    </div>
                    <div className="flex gap-3">
                       {(booking as any).payment_receipt_url && (
                          <a 
                            href={(booking as any).payment_receipt_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="glass px-6 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest text-lime hover:bg-lime/10 transition-all flex items-center justify-center gap-2"
                          >
                            View Proof
                          </a>
                       )}
                       <button 
                         onClick={() => onDeclineBooking(booking.id)}
                         className="glass px-8 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all flex items-center justify-center min-w-[100px]"
                       >
                         Decline
                       </button>
                       <button 
                         onClick={() => onApproveBooking(booking.id)}
                         className="bg-lime text-charcoal px-8 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center justify-center min-w-[100px] shadow-lg shadow-lime/20"
                       >
                         Approve
                       </button>
                    </div>
                 </div>
               ))}
            </div>
          </section>
        )}

        <div className="glass p-6 sm:p-10 md:p-12 rounded-[40px] sm:rounded-[48px] border-white/5 relative overflow-hidden group flex flex-col min-h-fit h-auto">
           <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-[100px] group-hover:scale-125 transition-transform duration-700" />
           <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-8 relative h-full">
              <div className="p-5 glass rounded-[32px] border-orange-500/20 text-orange-400 shrink-0">
                 <ShieldAlert size={40} />
              </div>
              <div className="flex-1 flex flex-col h-full space-y-4">
                 <h3 className="text-2xl sm:text-3xl font-display font-black uppercase italic tracking-tighter">Facility <span className="text-white/20">Maintenance</span></h3>
                 <p className="text-slate-400 text-sm italic font-medium leading-relaxed">Instantly block upcoming sessions for upgrades, cleaning, or private events.</p>
                 <div className="mt-auto pt-4">
                   <button 
                     onClick={onLockdown}
                     disabled={isUpdating}
                     className="w-full sm:w-auto bg-white text-charcoal px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10 disabled:opacity-50 flex items-center justify-center gap-3"
                   >
                      {isUpdating && <Loader2 size={14} className="animate-spin" />}
                      Block All Slots
                   </button>
                 </div>
              </div>
           </div>
        </div>
      </div>
      
      <div className="space-y-8">
        <section className="glass p-5 sm:p-8 md:p-10 rounded-[40px] sm:rounded-[48px] border-white/5 space-y-6 sm:space-y-8 min-h-fit h-auto relative overflow-hidden flex flex-col">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-lime/10 rounded-full blur-3xl" />
          <div className="flex items-center justify-between relative z-10">
            <h3 className="text-xl font-display font-black uppercase italic tracking-tighter">Share <span className="text-white/40">Marketplace</span></h3>
            <Share2 className="text-lime" size={20} />
          </div>
          <div className="grid grid-cols-1 gap-3 relative z-10">
            <div className="flex gap-2">
               <button 
                 onClick={onCopyLink}
                 className="flex-1 bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col items-center justify-center hover:bg-white/10 transition-all gap-2 group"
               >
                  <Copy size={20} className="text-lime group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Copy Link</span>
               </button>
               <button 
                 onClick={onShare}
                 className="flex-1 bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col items-center justify-center hover:bg-white/10 transition-all gap-2 group"
               >
                  <Share2 size={20} className="text-lime group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Broadcast</span>
               </button>
            </div>
            <button 
              onClick={onShowQR}
              className="w-full bg-lime text-charcoal p-5 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-lime/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <QrCode size={18} />
              Generate QR Kit
            </button>
          </div>
        </section>

        <section className="glass p-5 sm:p-8 md:p-10 rounded-[40px] sm:rounded-[48px] border-white/5 space-y-6 sm:space-y-8 min-h-fit h-auto relative overflow-hidden flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] uppercase font-bold text-slate-500 tracking-[0.2em]">Live <span className="text-white/40">Feed</span></h3>
            <div className="w-2 h-2 bg-lime rounded-full animate-ping" />
          </div>
          <div className="space-y-4">
            {bookings.filter(b => b.status !== 'MAINTENANCE' && b.status !== 'manual_block').length > 0 ? (
              [...bookings]
                .filter(b => b.status !== 'MAINTENANCE' && b.status !== 'manual_block')
                .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
                .slice(0, 5)
                .map(b => (
                  <div key={b.id} className="flex items-center gap-4 p-4 glass rounded-3xl border-transparent hover:border-white/10 transition-all group">
                     <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center font-display font-black italic text-[10px] text-lime border border-white/5 group-hover:bg-lime group-hover:text-charcoal transition-all">
                       {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black uppercase italic text-white truncate">{b.user_name}</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate">
                          {courts.find(c => c.id === b.court_id)?.name}
                        </p>
                     </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-8">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">No recent activity</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
