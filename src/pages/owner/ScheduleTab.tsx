import React, { useMemo } from 'react';
import { Activity, Plus, ZoomIn } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Court, Booking } from '../../types';
import Selector from '../../components/Selector';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

interface ScheduleTabProps {
  courts: Court[];
  bookings: Booking[];
  selectedCourtId: string;
  onSelectCourt: (id: string) => void;
  onBlockSlot: (courtId: string, time: string) => void;
  onViewBooking: (booking: Booking) => void;
  isStaff: boolean;
}

export const ScheduleTab: React.FC<ScheduleTabProps> = ({
  courts,
  bookings,
  selectedCourtId,
  onSelectCourt,
  onBlockSlot,
  onViewBooking,
  isStaff
}) => {
  const events = useMemo(() => {
    return bookings
      .filter(b => b.status !== 'CANCELLED' && b.status !== 'cancelled')
      .filter(b => selectedCourtId === 'all' || b.court_id === selectedCourtId)
      .map(b => ({
        id: b.id,
        title: b.user_name || 'Guest',
        start: b.start_time,
        end: b.end_time,
        borderColor: 'transparent',
        extendedProps: { booking: b },
        className: b.status === 'manual_block' || b.status === 'MAINTENANCE' ? 'maintenance-event' : 'confirmed-event'
      }));
  }, [bookings, selectedCourtId]);

  const handleDateClick = (info: any) => {
    if (isStaff) return;
    const courtId = selectedCourtId === 'all' ? (courts[0]?.id || '') : selectedCourtId;
    const timeStr = format(parseISO(info.dateStr), 'HH:mm');
    onBlockSlot(courtId, timeStr);
  };

  const handleEventClick = (info: any) => {
    onViewBooking(info.event.extendedProps.booking);
  };

  return (
    <div className="space-y-8 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter">Master <span className="text-white/40">Schedule</span></h2>
          <p className="text-[10px] font-black text-[#B5F55A] uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B5F55A] animate-ping" /> Synchronized Availability Matrix
          </p>
        </div>
        <div className="flex flex-wrap lg:flex-nowrap items-end gap-4 w-full lg:w-auto">
          <div className="w-full sm:flex-1 lg:w-[300px] min-w-[240px]">
            <Selector
              options={[
                { id: 'all', label: 'Consolidated View (All Courts)', icon: Activity },
                ...courts.map(c => ({ id: c.id, label: c.name, icon: Activity }))
              ]}
              selectedId={selectedCourtId}
              onSelect={(id) => onSelectCourt(id as string)}
              label="Asset Filtering"
            />
          </div>
          {!isStaff && (
            <button 
              onClick={() => onBlockSlot(selectedCourtId === 'all' ? '' : selectedCourtId, '08:00')}
              className="bg-[#B5F55A] text-black px-8 h-[52px] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#B5F55A]/20 flex items-center justify-center gap-2 whitespace-nowrap w-full sm:w-auto hover:scale-105 transition-all"
            >
              <Plus size={16} /> Force Block
            </button>
          )}
        </div>
      </div>

      <div className="glass rounded-[40px] border-white/5 p-4 sm:p-8 shadow-2xl relative overflow-hidden min-h-[800px]">
        <div className="absolute top-0 right-0 p-8 pointer-events-none opacity-5">
            <ZoomIn size={200} strokeWidth={1} className="text-white" />
        </div>
        
        <div className="relative z-10 calendar-container">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridDay"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridDay,timeGridWeek,dayGridMonth'
            }}
            events={events}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            nowIndicator={true}
            editable={false}
            droppable={false}
            slotMinTime="06:00:00"
            slotMaxTime="23:00:00"
            allDaySlot={false}
            slotDuration="00:30:00"
            height="auto"
            expandRows={true}
            stickyHeaderDates={true}
          />
        </div>
      </div>

      <style>{`
        .confirmed-event {
          background-color: #B5F55A !important;
          color: #000000 !important;
        }
        .maintenance-event {
          background-color: #FF5500 !important;
          color: white !important;
          opacity: 0.8;
        }
        .calendar-container .fc-v-event {
          border: none !important;
          box-shadow: 0 4px 15px rgba(0,0,0,0.3) !important;
        }
      `}</style>
    </div>
  );
};
