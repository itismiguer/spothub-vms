import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Activity, 
  Clock, 
  User, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Timer,
  ChevronRight,
  Filter,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { format, isToday } from 'date-fns';
import { toast } from 'sonner';

interface Booking {
  id: string;
  facility_id: string;
  court_id: string;
  court_name: string;
  user_name: string;
  start_time: string;
  end_time: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'IN_PROGRESS' | 'COMPLETED' | 'MAINTENANCE';
  source?: string;
}

type LiveMonitorProps = {
  propFacilityId?: string;
  isEmbedded?: boolean;
}

export default function LiveMonitor({ propFacilityId, isEmbedded = false }: LiveMonitorProps) {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const facilityId = propFacilityId || searchParams.get('facilityId') || profile?.facility_id;
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filterToday, setFilterToday] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [authTimedOut, setAuthTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (authLoading) setAuthTimedOut(true);
    }, 5000); // 5 second safety timeout
    return () => clearTimeout(timer);
  }, [authLoading]);

  useEffect(() => {
    if (!facilityId) {
      if (!authLoading || authTimedOut) setLoading(false);
      return;
    }

    setLoading(true);

    const fetchBookings = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('facility_id', facilityId)
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error);
        toast.error('Failed to load feed.');
      } else {
        setBookings(data as Booking[]);
      }
      setLoading(false);
    };

    fetchBookings();

    const channel = supabase
      .channel('live_monitor_feed')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'bookings',
        filter: `facility_id=eq.${facilityId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setBookings(prev => [payload.new as Booking, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setBookings(prev => prev.map(b => b.id === payload.new.id ? payload.new as Booking : b));
        } else if (payload.eventType === 'DELETE') {
          setBookings(prev => prev.filter(b => b.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [facilityId, authLoading]);

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast.success(`SYSTEM ACTION: Marking session as ${newStatus.replace('_', ' ').toUpperCase()}`, {
        icon: <ShieldCheck className="text-lime" />
      });
      setSelectedBooking(null);
    } catch (err) {
      toast.error('Command failed to execute.');
    }
  };

  const filteredBookings = filterToday 
    ? bookings.filter(b => isToday(new Date(b.start_time)))
    : bookings;

  if (authLoading && !authTimedOut) {
    return (
      <div className="h-screen bg-transparent flex flex-col items-center justify-center text-lime font-display italic font-black uppercase tracking-[0.5em] text-2xl gap-4">
        <div className="fixed inset-0 pointer-events-none z-[-1]">
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-lime/10 via-transparent to-transparent opacity-50" />
          <div className="absolute -top-1/4 -right-1/4 w-[60%] h-[60%] bg-lime/10 rounded-full blur-[140px] animate-pulse" />
        </div>
        <Activity size={48} className="animate-pulse" />
        Authenticating...
      </div>
    );
  }

  const isSuperAdmin = profile?.email === 'miguel@builtbymiguel.net';
  const isAuthorized = profile && (profile.role === 'OWNER' || profile.role === 'STAFF' || profile.role === 'ADMIN' || isSuperAdmin) || authTimedOut;

  if (!isAuthorized && !authTimedOut) {
    return <div className="h-screen bg-black flex flex-col items-center justify-center text-white font-display italic font-black uppercase tracking-[0.5em] text-2xl p-8 text-center">
      <ShieldAlert size={64} className="text-red-500 mb-6 mx-auto" />
      Unauthorized Terminal Access
      <button 
        onClick={() => navigate('/')}
        className="mt-12 glass border-white/10 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all"
      >
        Exit Stream
      </button>
    </div>;
  }

  return (
    <div className={`${isEmbedded ? 'h-full overflow-y-auto no-scrollbar pb-20' : 'min-h-screen'} bg-transparent text-white font-sans selection:bg-lime selection:text-charcoal ${isEmbedded ? 'p-0' : 'p-4 sm:p-10'} relative overflow-x-hidden`}>
      {!isEmbedded && (
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-lime/10 via-transparent to-transparent opacity-50" />
          <div className="absolute -top-1/4 -right-1/4 w-[60%] h-[60%] bg-lime/10 rounded-full blur-[140px] animate-pulse" />
        </div>
      )}
      {/* Header */}
      {!isEmbedded && (
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 px-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-lime animate-ping" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-lime">Active Monitor // Secure Feed</span>
             </div>
             <div className="h-px w-20 bg-white/10" />
          </div>
          <h1 className="text-6xl md:text-8xl font-display font-black italic uppercase tracking-tighter leading-none">
            Live <span className="text-white/10">Feed</span>
          </h1>
          <p className="font-mono text-slate-500 text-xs uppercase tracking-[0.4em]">
            Station ID: {facilityId?.substring(0, 8).toUpperCase()} // {format(new Date(), 'hh:mm:ss a')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={() => setFilterToday(!filterToday)}
            className={`flex items-center justify-center gap-3 px-8 py-5 rounded-[24px] font-black text-[10px] uppercase tracking-widest transition-all border-2 ${filterToday ? 'bg-lime text-charcoal border-lime shadow-[0_0_40px_rgba(181,245,90,0.3)]' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/30'}`}
          >
            <Filter size={16} />
            {filterToday ? 'Live Today' : 'Full Registry'}
          </button>
          
          <button 
            onClick={() => navigate('/owner')}
            className="flex items-center justify-center gap-3 px-8 py-5 bg-white/5 border-2 border-white/10 rounded-[24px] font-black text-[10px] uppercase tracking-widest hover:border-white/40 transition-all text-white"
          >
            <ArrowLeft size={16} />
            Control Hub
          </button>
        </div>
      </header>
      )}

      {/* Main Feed Grid */}
      {!facilityId ? (
        <div className="flex-1 flex flex-col items-center justify-center py-40 text-center space-y-10">
          <div className="w-32 h-32 glass rounded-[64px] flex items-center justify-center text-lime border-white/10 group animate-pulse">
            <ShieldAlert size={64} strokeWidth={1} />
          </div>
          <div className="space-y-4">
             <h3 className="text-4xl sm:text-6xl font-display font-black uppercase italic tracking-tighter text-white">Station <span className="text-white/20">Offline</span></h3>
             <p className="text-slate-500 font-mono text-xs uppercase tracking-[0.4em] max-w-sm mx-auto leading-relaxed"> No valid operational Facility ID detected for this browser session. </p>
          </div>
          <button 
            onClick={() => navigate('/owner')}
            className="bg-lime text-charcoal px-12 py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-lime/20 hover:scale-105 active:scale-95 transition-all"
          >
            Resolution: Return to Hub
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-4">
           {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-72 glass rounded-[48px] border-white/5 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-4 pb-20">
          <AnimatePresence mode="popLayout">
            {filteredBookings.length > 0 ? filteredBookings.map((booking) => {
              const start = new Date(booking.start_time);
              const end = new Date(booking.end_time);
              
              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={booking.id}
                  onClick={() => setSelectedBooking(booking)}
                  className={`p-1 rounded-[48px] transition-all cursor-pointer group relative overflow-hidden h-full border-2 ${
                    booking.status === 'IN_PROGRESS' ? 'border-lime shadow-[0_0_40px_rgba(181,245,90,0.15)] bg-lime/10' : 
                    booking.status === 'PENDING' ? 'border-amber-400/20 bg-white/5' :
                    'border-white/5 bg-white/5'
                  }`}
                >
                  <div className="glass h-full p-8 rounded-[44px] flex flex-col">
                    <header className="flex justify-between items-start mb-10">
                      <div className={`p-4 rounded-2xl ${booking.status === 'IN_PROGRESS' ? 'bg-lime text-charcoal' : 'bg-white/5 text-slate-500 group-hover:text-white transition-colors'}`}>
                        {booking.status === 'IN_PROGRESS' ? <Activity size={32} strokeWidth={2.5} /> : <Clock size={32} strokeWidth={2.5} />}
                      </div>
                      <div className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-lg ${
                        booking.status === 'CONFIRMED' ? 'bg-lime text-charcoal' :
                        booking.status === 'PENDING' ? 'bg-orange-500 text-white animate-pulse' :
                        booking.status === 'IN_PROGRESS' ? 'bg-white text-charcoal' :
                        booking.status === 'COMPLETED' ? 'bg-white/10 text-slate-500' :
                        'bg-red-600 text-white'
                      }`}>
                        {booking.status.replace('_', ' ')}
                      </div>
                    </header>

                    <div className="space-y-8 flex-1">
                      <div>
                        <div className="flex items-baseline gap-3 mb-2">
                           <h3 className="text-6xl font-display font-black tracking-tighter text-white leading-none italic">
                            {format(start, 'HH:mm')}
                          </h3>
                          <span className="text-xl font-black text-lime uppercase tracking-widest leading-none">HRS</span>
                        </div>
                        <p className="text-[12px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2">
                          EXIT PROTOCOL @ {format(end, 'HH:mm')}
                        </p>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-1">
                           <p className="text-[11px] font-black text-lime uppercase tracking-[0.3em] leading-none mb-2">Primary Athlete</p>
                           <h4 className="text-4xl font-display font-black tracking-tighter text-white uppercase italic leading-none truncate pb-2">
                            {booking.user_name || 'GUEST'}
                          </h4>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] leading-none mb-2">Assigned Sector</p>
                           <p className="text-xl font-display font-black text-white/50 uppercase tracking-tighter italic">
                            {booking.court_name}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between">
                       <div>
                          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-1">Session Token</p>
                          <span className="font-mono text-sm text-lime font-bold">
                            #{booking.id.slice(-8).toUpperCase()}
                          </span>
                       </div>
                       <div className="w-10 h-10 glass rounded-xl flex items-center justify-center text-lime group-hover:scale-110 transition-transform">
                          <ChevronRight size={20} />
                       </div>
                    </div>
                  </div>
                </motion.div>
              );
            }) : (
              <div className="col-span-full py-40 flex flex-col items-center justify-center text-center space-y-8 animate-pulse">
                <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center text-white/5">
                   <Activity size={64} />
                </div>
                <div>
                  <h2 className="text-6xl font-display font-black italic text-white/10 uppercase tracking-tighter">Zero <br />Activities</h2>
                  <p className="text-slate-600 font-mono text-xs uppercase tracking-widest mt-4">Feed Idle // Awaiting Inputs</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Quick Action Drawer */}
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               onClick={() => setSelectedBooking(null)}
               className="absolute inset-0 bg-black/60 backdrop-blur-xl" 
             />
             <motion.div 
               initial={{ y: 100, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               exit={{ y: 100, opacity: 0 }}
               className="glass p-6 sm:p-12 rounded-[32px] sm:rounded-[56px] border-white/10 w-full max-w-xl relative z-10 space-y-8 sm:space-y-10 overflow-y-auto no-scrollbar max-h-[85vh] h-auto"
             >
                <header className="flex items-center justify-between pr-8 sm:pr-0">
                  <div>
                    <h3 className="text-2xl sm:text-4xl font-display font-black italic tracking-tighter uppercase leading-none whitespace-normal break-words">Command <span className="text-slate-500">Action</span></h3>
                    <p className="text-[10px] sm:text-xs font-mono text-slate-500 uppercase tracking-widest mt-2 whitespace-normal break-words">Manage session for {selectedBooking.user_name}</p>
                  </div>
                  <button onClick={() => setSelectedBooking(null)} className="absolute top-4 right-4 sm:relative sm:top-0 sm:right-0 w-10 h-10 sm:w-12 sm:h-12 glass rounded-2xl flex items-center justify-center text-slate-400 hover:text-white">
                    <XCircle className="size-5 sm:size-6" />
                  </button>
                </header>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {selectedBooking.status === 'CONFIRMED' && (
                    <button 
                      onClick={() => handleUpdateStatus(selectedBooking.id, 'IN_PROGRESS')}
                      className="col-span-2 flex flex-col items-center gap-4 p-6 sm:p-8 bg-lime rounded-[24px] sm:rounded-[32px] text-charcoal hover:scale-[1.02] transition-transform shadow-2xl shadow-lime/20"
                    >
                      <ShieldCheck className="size-7 sm:size-8" />
                      <span className="font-black uppercase tracking-widest text-[10px] sm:text-xs">Verify & Check-In</span>
                    </button>
                  )}

                  {selectedBooking.status === 'PENDING' && (
                    <>
                      <button 
                        onClick={() => handleUpdateStatus(selectedBooking.id, 'CONFIRMED')}
                        className="flex flex-col items-center justify-center gap-3 sm:gap-4 p-6 sm:p-8 bg-white/5 glass rounded-[24px] sm:rounded-[32px] text-lime hover:bg-lime/10 transition-colors"
                      >
                        <CheckCircle2 className="size-5 sm:size-6" />
                        <span className="font-black uppercase tracking-widest text-[9px]">Approve</span>
                      </button>
                      <button 
                         onClick={() => handleUpdateStatus(selectedBooking.id, 'CANCELLED')}
                        className="flex flex-col items-center justify-center gap-3 sm:gap-4 p-6 sm:p-8 bg-white/5 glass rounded-[24px] sm:rounded-[32px] text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <XCircle className="size-5 sm:size-6" />
                        <span className="font-black uppercase tracking-widest text-[9px]">Decline</span>
                      </button>
                    </>
                  )}

                  {selectedBooking.status === 'IN_PROGRESS' && (
                    <button 
                      onClick={() => handleUpdateStatus(selectedBooking.id, 'COMPLETED')}
                      className="col-span-2 flex flex-col items-center gap-4 p-6 sm:p-8 bg-white/5 glass rounded-[24px] sm:rounded-[32px] text-white hover:bg-white/10 transition-colors"
                    >
                      <Timer className="size-7 sm:size-8 text-blue-400" />
                      <span className="font-black uppercase tracking-widest text-[10px] sm:text-xs">End Session Now</span>
                    </button>
                  )}

                  {selectedBooking.status === 'MAINTENANCE' && (
                    <button 
                      onClick={() => handleUpdateStatus(selectedBooking.id, 'CANCELLED')}
                      className="col-span-2 flex flex-col items-center gap-4 p-6 sm:p-8 bg-red-500/10 glass border-red-500/20 rounded-[24px] sm:rounded-[32px] text-red-500 hover:bg-red-500/20 transition-colors"
                    >
                      <ShieldAlert className="size-7 sm:size-8" />
                      <span className="font-black uppercase tracking-widest text-[10px] sm:text-xs">Lift Maintenance Block</span>
                    </button>
                  )}
                </div>

                <div className="p-6 sm:p-8 glass rounded-[32px] sm:rounded-[40px] border-white/5 bg-white/[0.02] space-y-4">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest gap-4">
                    <span className="text-slate-500 shrink-0">Facility Location</span>
                    <span className="text-white text-right whitespace-normal break-words">{selectedBooking.court_name}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest gap-4">
                    <span className="text-slate-500 shrink-0">Scheduled Span</span>
                    <span className="text-white text-right whitespace-normal break-words">
                      {format(new Date(selectedBooking.start_time), 'hh:mm')} - {format(new Date(selectedBooking.end_time), 'hh:mm a')}
                    </span>
                  </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
