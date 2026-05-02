import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
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
  facilityId: string;
  courtId: string;
  courtName: string;
  userName: string;
  startTime: any;
  endTime: any;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'IN_PROGRESS' | 'COMPLETED' | 'MAINTENANCE';
  source?: string;
}

export default function LiveMonitor() {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const facilityId = searchParams.get('facilityId') || profile?.facilityId;
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filterToday, setFilterToday] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!facilityId) {
      if (!authLoading) setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'bookings'),
      where('facilityId', '==', facilityId),
      orderBy('startTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Booking[];
      setBookings(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'bookings');
    });

    return () => unsubscribe();
  }, [facilityId, authLoading]);

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast.success(`SYSTEM ACTION: Marking session as ${newStatus.replace('_', ' ').toUpperCase()}`, {
        icon: <ShieldCheck className="text-lime" />
      });
      setSelectedBooking(null);
    } catch (err) {
      toast.error('Command failed to execute.');
    }
  };

  const filteredBookings = filterToday 
    ? bookings.filter(b => b.startTime?.toDate && isToday(b.startTime.toDate()))
    : bookings;

  if (authLoading) {
    return <div className="h-screen bg-black flex flex-col items-center justify-center text-lime font-display italic font-black uppercase tracking-[0.5em] text-2xl gap-4">
      <Activity size={48} className="animate-pulse" />
      Authenticating...
    </div>;
  }

  const isSuperAdmin = profile?.email === 'miguel@builtbymiguel.net';
  const isAuthorized = profile && (profile.role === 'OWNER' || profile.role === 'STAFF' || profile.role === 'ADMIN' || isSuperAdmin);

  if (!isAuthorized) {
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
    <div className="min-h-screen bg-[#000000] text-white font-sans selection:bg-lime selection:text-charcoal p-4 sm:p-10">
      {/* Header */}
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
              const start = booking.startTime?.toDate ? booking.startTime.toDate() : new Date();
              const end = booking.endTime?.toDate ? booking.endTime.toDate() : new Date();
              
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
                            {booking.userName || 'GUEST'}
                          </h4>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] leading-none mb-2">Assigned Sector</p>
                           <p className="text-xl font-display font-black text-white/50 uppercase tracking-tighter italic">
                            {booking.courtName}
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
                    <p className="text-[10px] sm:text-xs font-mono text-slate-500 uppercase tracking-widest mt-2 whitespace-normal break-words">Manage session for {selectedBooking.userName}</p>
                  </div>
                  <button onClick={() => setSelectedBooking(null)} className="absolute top-4 right-4 sm:relative sm:top-0 sm:right-0 w-10 h-10 sm:w-12 sm:h-12 glass rounded-2xl flex items-center justify-center text-slate-400 hover:text-white">
                    <XCircle size={20} sm:size={24} />
                  </button>
                </header>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {selectedBooking.status === 'CONFIRMED' && (
                    <button 
                      onClick={() => handleUpdateStatus(selectedBooking.id, 'IN_PROGRESS')}
                      className="col-span-2 flex flex-col items-center gap-4 p-6 sm:p-8 bg-lime rounded-[24px] sm:rounded-[32px] text-charcoal hover:scale-[1.02] transition-transform shadow-2xl shadow-lime/20"
                    >
                      <ShieldCheck size={28} sm:size={32} />
                      <span className="font-black uppercase tracking-widest text-[10px] sm:text-xs">Verify & Check-In</span>
                    </button>
                  )}

                  {selectedBooking.status === 'PENDING' && (
                    <>
                      <button 
                        onClick={() => handleUpdateStatus(selectedBooking.id, 'CONFIRMED')}
                        className="flex flex-col items-center justify-center gap-3 sm:gap-4 p-6 sm:p-8 bg-white/5 glass rounded-[24px] sm:rounded-[32px] text-lime hover:bg-lime/10 transition-colors"
                      >
                        <CheckCircle2 size={20} sm:size={24} />
                        <span className="font-black uppercase tracking-widest text-[9px]">Approve</span>
                      </button>
                      <button 
                         onClick={() => handleUpdateStatus(selectedBooking.id, 'CANCELLED')}
                        className="flex flex-col items-center justify-center gap-3 sm:gap-4 p-6 sm:p-8 bg-white/5 glass rounded-[24px] sm:rounded-[32px] text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <XCircle size={20} sm:size={24} />
                        <span className="font-black uppercase tracking-widest text-[9px]">Decline</span>
                      </button>
                    </>
                  )}

                  {selectedBooking.status === 'IN_PROGRESS' && (
                    <button 
                      onClick={() => handleUpdateStatus(selectedBooking.id, 'COMPLETED')}
                      className="col-span-2 flex flex-col items-center gap-4 p-6 sm:p-8 bg-white/5 glass rounded-[24px] sm:rounded-[32px] text-white hover:bg-white/10 transition-colors"
                    >
                      <Timer size={28} sm:size={32} className="text-blue-400" />
                      <span className="font-black uppercase tracking-widest text-[10px] sm:text-xs">End Session Now</span>
                    </button>
                  )}

                  {selectedBooking.status === 'MAINTENANCE' && (
                    <button 
                      onClick={() => handleUpdateStatus(selectedBooking.id, 'CANCELLED')}
                      className="col-span-2 flex flex-col items-center gap-4 p-6 sm:p-8 bg-red-500/10 glass border-red-500/20 rounded-[24px] sm:rounded-[32px] text-red-500 hover:bg-red-500/20 transition-colors"
                    >
                      <ShieldAlert size={28} sm:size={32} />
                      <span className="font-black uppercase tracking-widest text-[10px] sm:text-xs">Lift Maintenance Block</span>
                    </button>
                  )}
                </div>

                <div className="p-6 sm:p-8 glass rounded-[32px] sm:rounded-[40px] border-white/5 bg-white/[0.02] space-y-4">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest gap-4">
                    <span className="text-slate-500 shrink-0">Facility Location</span>
                    <span className="text-white text-right whitespace-normal break-words">{selectedBooking.courtName}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest gap-4">
                    <span className="text-slate-500 shrink-0">Scheduled Span</span>
                    <span className="text-white text-right whitespace-normal break-words">
                      {format(selectedBooking.startTime.toDate(), 'hh:mm')} - {format(selectedBooking.endTime.toDate(), 'hh:mm a')}
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
