import React from 'react';
import { Activity, Clock, Plus } from 'lucide-react';
import { format, addHours, parseISO } from 'date-fns';
import { Court, Booking } from '../../types';
import Selector from '../../components/Selector';

interface ScheduleTabProps {
  courts: Court[];
  bookings: Booking[];
  selectedCourtId: string;
  onSelectCourt: (id: string) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onBlockSlot: (courtId: string, time: string) => void;
  onViewBooking: (booking: Booking) => void;
  isStaff: boolean;
}

export const ScheduleTab: React.FC<ScheduleTabProps> = ({
  courts,
  bookings,
  selectedCourtId,
  onSelectCourt,
  selectedDate,
  onDateChange,
  onBlockSlot,
  onViewBooking,
  isStaff
}) => {
  const filteredCourts = courts.filter(c => selectedCourtId === 'all' || c.id === selectedCourtId);

  return (
    <div className="space-y-8 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter">Master <span className="text-white/40">Schedule</span></h2>
          <p className="text-[10px] font-black text-[#CCFF00] uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] animate-ping" /> Real-time Availability Matrix
          </p>
        </div>
        <div className="flex flex-wrap lg:flex-nowrap items-end gap-4 w-full lg:w-auto">
          <div className="w-full sm:flex-1 lg:w-[240px] min-w-[200px]">
            <Selector
              options={[
                { id: 'all', label: 'All Courts View', icon: Activity },
                ...courts.map(c => ({ id: c.id, label: c.name, icon: Activity }))
              ]}
              selectedId={selectedCourtId}
              onSelect={(id) => onSelectCourt(id as string)}
              label="Schedule Pivot"
            />
          </div>
          <div className="w-[calc(50%-8px)] sm:w-auto flex-1 lg:flex-none">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1 mb-2 block">
              Target Date
            </label>
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="glass border-white/10 px-4 sm:px-6 py-[13px] rounded-2xl text-[10px] font-black uppercase text-white focus:border-lime/40 transition-all w-full h-[52px]"
            />
          </div>
          {!isStaff && (
            <div className="w-[calc(50%-8px)] sm:w-auto flex-1 lg:flex-none">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1 mb-2 block invisible">
                Action
              </label>
              <button 
                onClick={() => onBlockSlot('', '')}
                className="bg-[#CCFF00] text-black px-6 sm:px-8 h-[52px] rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#CCFF00]/20 flex items-center justify-center gap-2 whitespace-nowrap w-full sm:w-auto"
              >
                <Plus size={14} /> Block Slot
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="glass rounded-[32px] sm:rounded-[56px] border-white/5 overflow-x-auto no-scrollbar relative shadow-2xl">
        <div className="min-w-fit w-full">
          <div className="flex border-b border-white/5 bg-white/[0.02]">
            <div className="w-16 sm:w-32 flex-shrink-0 p-4 sm:p-8 border-r border-white/5 flex items-center justify-center">
              <Clock size={16} className="text-slate-500" />
            </div>
            {filteredCourts.map(court => (
              <div key={court.id} className="flex-1 p-2 sm:p-8 text-center border-r border-white/5 last:border-r-0 min-w-[80px] sm:min-w-[200px]">
                <p className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-tighter sm:tracking-[0.2em] mb-1">Crt</p>
                <h4 className="text-[10px] sm:text-xs font-black text-white uppercase italic tracking-tighter truncate max-w-full whitespace-normal line-clamp-2 leading-tight">
                  {court.name}
                </h4>
              </div>
            ))}
          </div>

          {[...Array(16)].map((_, i) => {
            const hour = i + 6;
            const timeStr = `${hour.toString().padStart(2, '0')}:00`;
            const startSlot = parseISO(`${selectedDate}T${timeStr}`);
            const endSlot = addHours(startSlot, 1);

            return (
              <div key={hour} className="flex border-b border-white/5 last:border-b-0 group hover:bg-white/[0.01] transition-colors h-16 sm:h-auto">
                <div className="w-16 sm:w-32 flex-shrink-0 p-2 sm:p-6 border-r border-white/5 flex items-center justify-center bg-white/[0.01]">
                  <span className="text-[10px] sm:text-lg font-display font-black italic text-white/20 group-hover:text-lime transition-colors uppercase tracking-tighter">
                    {format(startSlot, 'h:mm a')}
                  </span>
                </div>
                {filteredCourts.map(court => {
                  const booking = bookings.find(b => {
                    if (b.court_id !== court.id) return false;
                    const bStart = new Date(b.start_time);
                    const bEnd = new Date(b.end_time);
                    return (startSlot < bEnd && endSlot > bStart) && b.status !== 'CANCELLED' && b.status !== 'cancelled';
                  });

                  return (
                    <div key={court.id} className="flex-1 p-0.5 sm:p-1 border-r border-white/5 last:border-r-0 relative min-w-[80px] sm:min-w-[200px]">
                      {booking ? (
                        <button
                          onClick={() => onViewBooking(booking)}
                          className={`w-full h-full p-2 sm:p-4 rounded-xl sm:rounded-3xl flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-all hover:scale-[0.98] ${
                            (booking as any).status === 'manual_block' || (booking as any).status === 'MAINTENANCE' ? 'bg-orange-500/10 border border-orange-500/20 text-orange-400' : 
                            (booking as any).status === 'CONFIRMED' ? 'bg-[#CCFF00] text-charcoal shadow-lg shadow-lime/10' :
                            'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                          }`}
                        >
                          <span className="text-[6px] sm:text-[8px] font-black uppercase tracking-widest opacity-60">
                            {(booking as any).booking_reference || 'BLOCKED'}
                          </span>
                          <span className="text-[8px] sm:text-[11px] font-black uppercase italic tracking-tighter truncate max-w-full">
                            {booking.user_name || 'Guest'}
                          </span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onBlockSlot(court.id, timeStr)}
                          className="w-full h-full min-h-[60px] sm:min-h-[80px] rounded-xl sm:rounded-3xl border border-dashed border-white/5 hover:border-lime/40 hover:bg-lime/5 transition-all flex items-center justify-center group/btn"
                        >
                          <Plus size={14} className="text-white/5 group-hover/btn:text-lime transition-colors" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
