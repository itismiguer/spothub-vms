import React from 'react';
import { Calendar, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Booking, Court } from '../../types';
import { TableSkeleton } from '../../components/Skeletons';

interface BookingsTabProps {
  bookings: Booking[];
  courts: Court[];
  loading: boolean;
  isUpdating: boolean;
  onManualEntry: () => void;
  onApproveBooking: (id: string) => Promise<void>;
  onDeclineBooking: (id: string) => Promise<void>;
}

export const BookingsTab: React.FC<BookingsTabProps> = ({
  bookings,
  courts,
  loading,
  isUpdating,
  onManualEntry,
  onApproveBooking,
  onDeclineBooking
}) => {
  if (loading) return <TableSkeleton />;

  const isAdmin = (window as any).isGlobalAdmin || false; // This is a placeholder, usually comes from profile
  // In our case we use profile.role from parent or we check role in component if passed
  // Let's assume the useAuth hook might be needed if not passed.
  // But for simple override, we can check if approved state is reachable.
  
  const sortedBookings = [...bookings].sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis());

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter text-white">
            Reservation <span className="text-white/20">Control</span>
          </h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
            Manage pending requests and confirmed slots
          </p>
        </div>
        <button 
          onClick={onManualEntry}
          className="bg-lime text-charcoal px-6 sm:px-8 h-[52px] rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-lime/20 hover:scale-105 active:scale-95 transition-all w-full md:w-auto min-w-fit whitespace-nowrap"
        >
          + Manual Entry
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {sortedBookings.length === 0 ? (
          <div className="glass p-20 rounded-[48px] text-center space-y-6 border-white/5">
            <Calendar size={48} className="mx-auto text-white/5" />
            <p className="text-slate-500 text-sm italic font-medium uppercase tracking-widest">No active reservation pipeline</p>
          </div>
        ) : (
          sortedBookings.map((booking) => (
            <div key={booking.id} className="glass p-8 rounded-[40px] border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-lime/20 transition-all">
              <div className="flex gap-6 items-center">
                <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center font-display font-black italic text-2xl border ${
                  booking.status === 'PENDING' || booking.status === 'RESERVED' || booking.status === 'PENDING_PROOF' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                  booking.status === 'UNDER_REVIEW' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                  booking.status === 'CONFIRMED' ? 'bg-[#CCFF00]/10 text-[#CCFF00] border-[#CCFF00]/20' : 
                  'bg-white/5 text-slate-500 border-white/10'
                }`}>
                  {['PENDING', 'RESERVED', 'PENDING_PROOF'].includes(booking.status) ? '?' : 
                   booking.status === 'UNDER_REVIEW' ? 'R' :
                   booking.status[0]}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-display font-black uppercase italic text-white leading-none">
                      {(booking as any).source === 'manual' ? 'Manual Entry' : (booking.userName || 'Anonymous Player')}
                    </p>
                    {booking.status === 'PENDING' && <span className="bg-orange-500 animate-pulse w-2 h-2 rounded-full" />}
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {courts.find(c => c.id === booking.courtId)?.name || 'Unknown Court'} • {format(booking.startTime.toDate(), 'MMM dd, h:mm a')} - {format(booking.endTime.toDate(), 'h:mm a')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {['PENDING', 'RESERVED', 'PENDING_PROOF', 'UNDER_REVIEW'].includes(booking.status) ? (
                  <div className="flex flex-col items-end gap-3">
                    <div className="flex flex-col items-end">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Status</p>
                      <p className={`text-[11px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border ${
                        booking.status === 'UNDER_REVIEW' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                      } animate-pulse`}>
                        {booking.status === 'UNDER_REVIEW' ? 'Needs Review' : 'In Pipeline'}
                      </p>
                    </div>
                    <div className="flex flex-wrap sm:flex-nowrap gap-2">
                      <button 
                        disabled={isUpdating}
                        onClick={() => onDeclineBooking(booking.id)}
                        className="flex-1 min-w-fit h-auto glass px-6 sm:px-8 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest text-red-500 border-red-500/20 hover:bg-red-500/10 transition-all font-bold disabled:opacity-50 whitespace-nowrap"
                      >
                        Decline
                      </button>
                      <button 
                        disabled={isUpdating}
                        onClick={() => onApproveBooking(booking.id)}
                        className="flex-1 min-w-fit h-auto bg-[#CCFF00] text-charcoal px-6 sm:px-8 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#CCFF00]/20 font-bold disabled:opacity-50 whitespace-nowrap"
                      >
                        {isUpdating ? <Loader2 size={14} className="animate-spin" /> : 'Approve'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-end">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Status</p>
                    <p className={`text-[11px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border ${
                      booking.status === 'CONFIRMED' ? 'bg-lime/10 text-lime border-lime/20' : 
                      booking.status === 'CANCELLED' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                      'glass text-slate-500 border-white/10'
                    }`}>
                      {booking.status}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
