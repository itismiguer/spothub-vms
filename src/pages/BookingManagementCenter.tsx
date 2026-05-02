import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Inbox, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Filter, 
  User, 
  Calendar, 
  MapPin, 
  MessageSquare, 
  Loader2,
  ChevronRight,
  Search,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'MAINTENANCE';

interface Booking {
  id: string;
  userId: string;
  userName: string;
  facilityId: string;
  facilityName: string;
  courtName: string;
  startTime: Timestamp;
  endTime: Timestamp;
  status: BookingStatus;
  totalPrice?: number;
  amount?: number;
  paymentReceiptUrl?: string;
  createdAt?: Timestamp;
}

export default function BookingManagementCenter() {
  const { user, profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [activeFilter, setActiveFilter] = useState<'PENDING' | 'CONFIRMED' | 'PAST'>('PENDING');
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;

    const bookingsRef = collection(db, 'bookings');
    let q;
    
    const isSuperAdmin = profile.email === 'miguel@builtbymiguel.net';

    if (profile.role === 'ADMIN' && isSuperAdmin) {
      q = query(bookingsRef, orderBy('startTime', 'desc'));
    } else {
      q = query(bookingsRef, where('facilityOwnerId', '==', user.uid), orderBy('startTime', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      
      // Auto-cancel logic: if PENDING and older than 60 mins
      const now = Date.now();
      data.forEach(async (b) => {
        if (b.status === 'PENDING' && b.createdAt) {
          const createdTime = b.createdAt.toMillis();
          if (now - createdTime > 60 * 60 * 1000) {
            try {
              await updateDoc(doc(db, 'bookings', b.id), { 
                status: 'CANCELLED',
                cancellationReason: 'Auto-cancelled: Verification timeout (60m)' 
              });
            } catch (e) {
              console.error("Auto-cancel failed for", b.id);
            }
          }
        }
      });

      // Sound chime for new bookings
      if (!loading && snapshot.docChanges().some(change => change.type === 'added')) {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log('Autoplay blocked'));
        toast.info('NEW SIGNAL DETECTED: Incoming Booking');
      }

      setBookings(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, profile]);

  const filteredBookings = bookings.filter(b => {
    if (activeFilter === 'PENDING') return b.status === 'PENDING';
    if (activeFilter === 'CONFIRMED') return b.status === 'CONFIRMED';
    return b.status === 'CANCELLED' || b.status === 'COMPLETED';
  });

  const handleUpdateStatus = async (id: string, status: BookingStatus) => {
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'bookings', id), { status });
      toast.success(`Booking ${status.toLowerCase()} successfully.`);
      if (selectedBooking?.id === id) {
        setSelectedBooking(prev => prev ? { ...prev, status } : null);
      }
    } catch (err) {
      toast.error('Failed to update status.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <Loader2 className="text-lime animate-spin" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal text-white pt-20 pb-32 overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-6 h-[calc(100vh-140px)] flex flex-col">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between py-8 gap-6 flex-shrink-0">
          <div className="flex items-center gap-6">
             <div className="w-16 h-16 bg-lime rounded-[24px] flex items-center justify-center text-charcoal shadow-[0_0_30px_rgba(181,245,90,0.3)] animate-pulse">
               <Activity size={32} strokeWidth={2.5} />
             </div>
             <div>
               <h1 className="text-5xl font-display font-black uppercase italic tracking-tighter leading-none">Command <span className="text-white/20">Center</span></h1>
               <p className="text-[10px] font-black text-lime uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-lime animate-ping" /> System Online // Secure Stream
               </p>
             </div>
          </div>

          <div className="flex glass p-1.5 rounded-2xl border-white/5 bg-white/[0.02]">
             {(['PENDING', 'CONFIRMED', 'PAST'] as const).map(f => (
               <button
                 key={f}
                 onClick={() => setActiveFilter(f)}
                 className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeFilter === f ? 'text-charcoal' : 'text-slate-500 hover:text-white'}`}
               >
                 {activeFilter === f && (
                   <motion.div layoutId="filterBg" className="absolute inset-0 bg-lime rounded-xl" />
                 )}
                 <span className="relative z-10">{f}</span>
                 {f === 'PENDING' && filteredBookings.length > 0 && (
                   <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-charcoal" />
                 )}
               </button>
             ))}
          </div>
        </header>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          {/* Left Panel: Stream Panel */}
          <div className="lg:col-span-4 h-full flex flex-col glass rounded-[44px] border-white/5 bg-white/[0.01] overflow-hidden">
            <div className="p-8 border-b border-white/5 flex items-center justify-between flex-shrink-0">
               <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Entry Registry</h3>
               <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-lime/20" />
                  <div className="w-1.5 h-1.5 rounded-full bg-lime/40" />
                  <div className="w-1.5 h-1.5 rounded-full bg-lime" />
               </div>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
              <AnimatePresence mode="popLayout">
                {filteredBookings.length > 0 ? (
                  filteredBookings.map((booking) => (
                    <motion.button
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      key={booking.id}
                      onClick={() => setSelectedBooking(booking)}
                      className={`w-full text-left p-8 rounded-[36px] border-2 transition-all relative group overflow-hidden ${
                        selectedBooking?.id === booking.id 
                          ? 'bg-lime/10 border-lime/30 shadow-2xl shadow-lime/5' 
                          : 'bg-white/[0.02] border-transparent hover:border-white/10 hover:bg-white/[0.04]'
                      }`}
                    >
                      {selectedBooking?.id === booking.id && (
                        <div className="absolute top-0 right-0 p-4">
                           <div className="w-2 h-2 rounded-full bg-lime animate-ping" />
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mb-4">
                         <div className="flex gap-2 items-center">
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border ${
                              booking.status === 'PENDING' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                              booking.status === 'CONFIRMED' ? 'bg-lime/10 text-lime border-lime/20' :
                              'bg-white/5 text-slate-600 border-white/5'
                            }`}>
                              {booking.status}
                            </span>
                            {booking.status === 'PENDING' && !booking.paymentReceiptUrl && (
                               <span className="bg-red-500 text-white px-2 py-1 rounded-full text-[7px] font-black uppercase animate-pulse">NO RECEIPT</span>
                            )}
                         </div>
                         <span className="font-mono text-[10px] text-slate-600 tracking-tighter">ID: {booking.id.slice(-6).toUpperCase()}</span>
                      </div>
                      <h4 className="text-2xl font-display font-black tracking-tighter uppercase italic text-white group-hover:text-lime transition-colors">{booking.userName || 'GUEST'}</h4>
                      <div className="flex items-center gap-3 mt-4 mt-2">
                         <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            <Clock size={12} className="text-lime" />
                            {format(booking.startTime.toDate(), 'HH:mm')}
                         </div>
                         <div className="w-1 h-1 rounded-full bg-white/10" />
                         <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-[150px]">
                            {booking.courtName}
                         </div>
                      </div>
                    </motion.button>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-white/5 mb-6">
                       <Inbox size={40} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600">No active signals found</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Panel: Tactics Panel */}
          <div className="lg:col-span-8 h-full flex flex-col relative">
            <AnimatePresence mode="wait">
              {selectedBooking ? (
                <motion.div
                  key={selectedBooking.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="glass rounded-[56px] border-white/5 h-full flex flex-col relative overflow-hidden bg-white/[0.01]"
                >
                  <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-lime/5 rounded-full blur-[120px] pointer-events-none" />
                  
                  <div className="flex-1 overflow-y-auto no-scrollbar p-12 lg:p-20 space-y-16">
                    <header className="space-y-10 relative">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="px-4 py-2 bg-charcoal border border-white/10 rounded-xl font-mono text-[11px] text-lime font-bold">
                               TXN://{selectedBooking.id.toUpperCase()}
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                               Received {format(selectedBooking.startTime.toDate(), 'MMM d, yyyy')}
                            </span>
                         </div>
                      </div>
                      
                      <div className="space-y-4">
                         <h2 className="text-8xl font-display font-black uppercase italic tracking-tighter leading-[0.8] text-white">
                            {selectedBooking.userName || 'UNIDENTIFIED'}
                         </h2>
                         <p className="text-[12px] font-black text-lime uppercase tracking-[0.5em] pl-1">Authorized Athlete Profile</p>
                      </div>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="p-10 glass rounded-[44px] border-white/10 bg-white/[0.02] flex flex-col justify-between h-56">
                          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Sector</p>
                          <div>
                            <h4 className="text-3xl font-display font-black italic tracking-tighter text-white uppercase">{selectedBooking.courtName}</h4>
                            <p className="text-[10px] font-bold text-lime uppercase tracking-widest mt-2">{selectedBooking.facilityName}</p>
                          </div>
                       </div>
                       <div className="p-10 glass rounded-[44px] border-white/10 bg-white/[0.02] flex flex-col justify-between h-56">
                          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Timeline</p>
                          <div>
                            <h4 className="text-3xl font-display font-black italic tracking-tighter text-white uppercase">
                               {format(selectedBooking.startTime.toDate(), 'HH:mm')}
                            </h4>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">DUR: 60 MINS</p>
                          </div>
                       </div>
                       <div className="p-10 glass rounded-[44px] border-white/10 bg-white/[0.02] flex flex-col justify-between h-56 group hover:border-lime/40 transition-colors">
                          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Revenue</p>
                          <div>
                            <h4 className="text-4xl font-display font-black italic tracking-tighter text-lime">₱{(selectedBooking.amount || selectedBooking.totalPrice || 0).toLocaleString()}</h4>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2 group-hover:text-white transition-colors">Digital Settlement Complete</p>
                          </div>
                       </div>
                    </div>

                    {selectedBooking.paymentReceiptUrl && (
                       <div className="space-y-6">
                          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Verification Evidence</p>
                          <div className="glass rounded-[48px] border-white/10 overflow-hidden relative group aspect-video lg:aspect-[21/9]">
                             <img 
                               src={selectedBooking.paymentReceiptUrl} 
                               alt="Payment Receipt" 
                               className="w-full h-full object-contain bg-black/50"
                             />
                             <div className="absolute inset-0 bg-lime/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <span className="glass px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest">Original Capture</span>
                             </div>
                          </div>
                          <button 
                            onClick={() => window.open(selectedBooking.paymentReceiptUrl, '_blank')}
                            className="bg-white/5 border border-white/10 text-white/40 hover:text-white px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all"
                          >
                             Open Full Resolution
                          </button>
                       </div>
                    )}
                  </div>

                  <div className="p-10 lg:p-12 border-t border-white/5 flex-shrink-0 bg-charcoal/40 backdrop-blur-3xl">
                    <div className="flex gap-6 max-w-4xl mx-auto">
                      {selectedBooking.status === 'PENDING' && (
                        <>
                          <button 
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(selectedBooking.id, 'CANCELLED')}
                            className="flex-1 flex items-center justify-center gap-4 py-8 rounded-[36px] glass border-red-500/20 text-red-500 font-display font-black uppercase italic tracking-tighter text-2xl hover:bg-red-500/10 transition-all active:scale-95 disabled:opacity-50"
                          >
                            <XCircle size={32} />
                            Decline Entry
                          </button>
                          <button 
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(selectedBooking.id, 'CONFIRMED')}
                            className="flex-[1.5] flex items-center justify-center gap-4 py-8 rounded-[36px] bg-lime text-charcoal font-display font-black uppercase italic tracking-tighter text-2xl hover:scale-[1.02] transition-all shadow-[0_20px_50px_rgba(181,245,90,0.3)] active:scale-95 disabled:opacity-50"
                          >
                            <CheckCircle2 size={32} strokeWidth={2.5} />
                            Validate Access
                          </button>
                        </>
                      )}

                      {selectedBooking.status === 'CONFIRMED' && (
                        <button 
                           disabled={isUpdating}
                           onClick={() => handleUpdateStatus(selectedBooking.id, 'COMPLETED')}
                           className="w-full flex items-center justify-center gap-4 py-8 rounded-[36px] bg-white text-charcoal font-display font-black uppercase italic tracking-tighter text-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                         >
                           Terminate Session
                         </button>
                      )}
                      
                      {selectedBooking.status === 'CANCELLED' && (
                        <div className="w-full py-8 text-center bg-red-500/10 rounded-[36px] border border-red-500/20">
                           <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.5em]">Activity Decommissioned</span>
                        </div>
                      )}

                      {selectedBooking.status === 'COMPLETED' && (
                        <div className="w-full py-8 text-center bg-white/5 rounded-[36px] border border-white/10">
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">Cycle Finished Successfully</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="glass rounded-[56px] border-white/5 h-full flex flex-col items-center justify-center p-20 text-center relative overflow-hidden bg-white/[0.01]">
                   <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-[600px] h-[600px] bg-lime/10 rounded-full blur-[150px] animate-pulse" />
                   </div>
                   <div className="relative z-10 space-y-10 group cursor-default">
                      <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center text-white/5 group-hover:text-lime transition-all duration-700 mx-auto transform group-hover:rotate-180">
                        <Activity size={64} strokeWidth={1} />
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-4xl font-display font-black uppercase italic tracking-tighter text-white/20 group-hover:text-white transition-colors">Awaiting Instructions</h3>
                        <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] max-w-xs mx-auto">Select a valid signal from the entry panel to begin processing.</p>
                      </div>
                   </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
