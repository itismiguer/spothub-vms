import React from 'react';
import { Wallet, Calendar, Clock, Users, Activity, FileText } from 'lucide-react';
import { Booking } from '../../types';
import { TableSkeleton } from '../../components/Skeletons';

interface EarningsTabProps {
  bookings: Booking[];
  loading: boolean;
}

export const EarningsTab: React.FC<EarningsTabProps> = ({ bookings, loading }) => {
  if (loading) return <TableSkeleton />;

  const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED');
  const totalRevenue = confirmedBookings.reduce((acc, b) => acc + ((b as any).amount || 0), 0);
  const pendingValue = bookings.filter(b => b.status === 'PENDING').reduce((acc, b) => acc + ((b as any).amount || 0), 0);
  const avgTicket = confirmedBookings.length > 0 ? Math.round(totalRevenue / confirmedBookings.length) : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass p-10 rounded-[48px] border-white/5 space-y-2 relative overflow-hidden group">
             <div className="absolute right-0 top-0 p-8 opacity-10 text-lime group-hover:scale-110 transition-transform duration-700">
                <Wallet size={48} />
             </div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Gross Revenue</p>
             <h4 className="text-5xl font-display font-black italic tracking-tighter text-white">
                ₱{totalRevenue.toLocaleString()}
             </h4>
             <p className="text-[9px] font-bold text-lime uppercase tracking-widest flex items-center gap-1">
                <Activity size={10} /> Verified Collections
             </p>
          </div>
          <div className="glass p-10 rounded-[48px] border-white/5 space-y-2 relative overflow-hidden group">
             <div className="absolute right-0 top-0 p-8 opacity-10 text-blue-500 group-hover:scale-110 transition-transform duration-700">
                <Calendar size={48} />
             </div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Confirmed Sessions</p>
             <h4 className="text-5xl font-display font-black italic tracking-tighter text-white">
                {confirmedBookings.length}
             </h4>
             <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Live Across All Courts</p>
          </div>
          <div className="glass p-10 rounded-[48px] border-white/5 space-y-2 relative overflow-hidden group">
             <div className="absolute right-0 top-0 p-8 opacity-10 text-orange-500 group-hover:scale-110 transition-transform duration-700">
                <Clock size={48} />
             </div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pending Value</p>
             <h4 className="text-5xl font-display font-black italic tracking-tighter text-white/40">
                ₱{pendingValue.toLocaleString()}
             </h4>
             <p className="text-[9px] font-bold text-orange-500 uppercase tracking-widest animate-pulse">Awaiting Verification</p>
          </div>
          <div className="glass p-10 rounded-[48px] border-white/5 space-y-2 relative overflow-hidden group">
             <div className="absolute right-0 top-0 p-8 opacity-10 text-slate-500 group-hover:scale-110 transition-transform duration-700">
                <Users size={48} />
             </div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Avg Session Ticket</p>
             <h4 className="text-5xl font-display font-black italic tracking-tighter text-white">
                ₱{avgTicket.toLocaleString()}
             </h4>
             <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Per 60m Unit</p>
          </div>
       </div>

       <div className="glass p-10 lg:p-14 rounded-[56px] border-white/5 space-y-10">
          <header className="flex items-center justify-between">
             <div>
                <h3 className="text-3xl font-display font-black uppercase italic tracking-tighter">Settlement <span className="text-white/40">Log</span></h3>
                <p className="text-[10px] font-black text-lime uppercase tracking-widest mt-1">Transaction History & Receipts</p>
             </div>
          </header>

          <div className="space-y-4">
             {confirmedBookings
               .sort((a,b) => b.startTime.toMillis() - a.startTime.toMillis())
               .map(booking => (
                <div key={booking.id} className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 hover:border-lime/20 transition-all group">
                   <div className="flex items-center gap-6">
                      <div className="w-12 h-12 bg-lime/10 rounded-2xl flex items-center justify-center text-lime group-hover:bg-lime group-hover:text-charcoal transition-all">
                         <Wallet size={20} />
                      </div>
                      <div>
                         <p className="text-lg font-display font-black uppercase italic text-white leading-none">{booking.userName}</p>
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">
                           {booking.startTime.toDate().toLocaleDateString()} • Receipt #{booking.id.slice(-6).toUpperCase()}
                         </p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-xl font-display font-black italic text-white">₱{((booking as any).amount || 0).toLocaleString()}</p>
                      <button className="text-[9px] font-black uppercase tracking-widest text-lime flex items-center gap-2 ml-auto mt-1 opacity-0 group-hover:opacity-100 transition-all">
                         View Receipt <FileText size={10} />
                      </button>
                   </div>
                </div>
             ))}
          </div>
       </div>
    </div>
  );
};
