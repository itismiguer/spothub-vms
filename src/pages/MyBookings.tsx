import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, getDoc, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { format, isAfter } from 'date-fns';
import { Calendar, Clock, MapPin, XCircle, CheckCircle2, Trophy, Star, Plus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface Booking {
  id: string;
  facilityId: string;
  courtId: string;
  startTime: any;
  endTime: any;
  status: string;
  facilityName?: string;
  courtName?: string;
  hasReview?: boolean;
  expiresAt?: any;
  bookingReference?: string;
  amount?: number;
}

const CountdownTimer = ({ expiresAt, onExpire }: { expiresAt: any; onExpire: () => void }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => {
      const expiry = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
      const diff = expiry.getTime() - new Date().getTime();

      if (diff <= 0) {
        clearInterval(timer);
        onExpire();
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  return (
    <div className="flex flex-col items-center justify-center bg-orange-500/10 border border-orange-500/20 px-6 py-4 rounded-3xl group">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/60 transition-colors group-hover:text-orange-500">Reserved For</span>
      <span className="text-3xl font-display font-black italic text-orange-500">{timeLeft}</span>
    </div>
  );
};

export default function MyBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewingBooking, setReviewingBooking] = useState<Booking | null>(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'bookings'), 
      where('userId', '==', user.uid),
      orderBy('startTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      try {
        const bookingsList = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Booking[];
        setBookings(bookingsList);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'bookings', false);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error("MyBookings listener error:", error);
      handleFirestoreError(error, OperationType.LIST, 'bookings', false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCancel = async (id: string) => {
    setIsCancelling(id);
    try {
      await updateDoc(doc(db, 'bookings', id), { status: 'CANCELLED' });
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'CANCELLED' } : b));
      toast.info('Booking cancelled successfully.');
    } catch (error) {
      toast.error('Failed to cancel booking.');
    } finally {
      setIsCancelling(null);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !reviewingBooking) return;
    setIsSubmittingReview(true);
    try {
      const userProfileSnap = await getDoc(doc(db, 'users', user.uid));
      const userName = userProfileSnap.data()?.name || 'Player';

      await addDoc(collection(db, 'reviews'), {
        userId: user.uid,
        userName,
        facilityId: reviewingBooking.facilityId,
        bookingId: reviewingBooking.id,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
        createdAt: serverTimestamp(),
        hidden: false
      });
      
      setBookings(prev => prev.map(b => b.id === reviewingBooking.id ? { ...b, hasReview: true } : b));
      setReviewingBooking(null);
      setReviewForm({ rating: 5, comment: '' });
      toast.success('Your review has been launched!');
    } catch (error) {
      toast.error('Failed to submit review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const [isUploading, setIsUploading] = useState<string | null>(null);

  const handleSetPaid = async (bookingId: string) => {
    setIsUploading(bookingId);
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { 
        status: 'PENDING_PROOF',
        updatedAt: serverTimestamp()
      });
      toast.success('STATUS UPDATED: Please upload your payment screenshot to finalize.');
    } catch (error) {
      toast.error('Update failed.');
    } finally {
      setIsUploading(null);
    }
  };

  const handleUploadProof = async (bookingId: string) => {
    setIsUploading(bookingId);
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { 
        status: 'UNDER_REVIEW',
        paymentProofUploadedAt: serverTimestamp(),
        // Mocking the URL for this environment
        paymentReceiptUrl: 'https://images.unsplash.com/photo-1554224155-16974398755b?q=80&w=3011&auto=format&fit=crop'
      });
      toast.success('PROOF UPLOADED: Your reservation is now under staff review.');
    } catch (error) {
      toast.error('Uplink failed. Please retry proof upload.');
    } finally {
      setIsUploading(null);
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse text-white/50 font-black italic uppercase tracking-tighter text-3xl">Retrieving your history...</div>;

  const upcoming = bookings.filter(b => 
    (b.status === 'CONFIRMED' || b.status === 'PENDING' || b.status === 'RESERVED' || b.status === 'PENDING_PROOF' || b.status === 'UNDER_REVIEW') && 
    isAfter(b.startTime.toDate(), new Date())
  );
  const past = bookings.filter(b => b.status === 'CANCELLED' || b.status === 'COMPLETED' || (!isAfter(b.startTime.toDate(), new Date()) && !['RESERVED', 'PENDING_PROOF', 'UNDER_REVIEW'].includes(b.status)));

  return (
    <div className="max-w-6xl mx-auto px-0 sm:px-12 py-12 pb-32 space-y-12">
      <header className="space-y-1">
        <h1 className="text-5xl font-display font-black uppercase italic tracking-tighter">Activity <span className="text-white/40">Hub</span></h1>
        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Your competitive journey & court history</p>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-lime text-charcoal p-6 sm:p-8 rounded-[32px] sm:rounded-[48px] flex flex-col justify-between min-h-[140px] sm:min-h-[192px] h-auto shadow-[0_0_40px_rgba(181,245,90,0.2)]">
           <Trophy className="text-charcoal shrink-0" size={28} />
           <div className="mt-4">
             <p className="text-3xl sm:text-4xl font-display font-black italic">{bookings.length}</p>
             <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-charcoal/60">Total Sessions</p>
           </div>
        </div>
        <div className="glass p-6 sm:p-8 rounded-[32px] sm:rounded-[48px] border-white/5 flex flex-col justify-between min-h-[140px] sm:min-h-[192px] h-auto">
           <Calendar className="text-white/20 shrink-0" size={28} />
           <div className="mt-4">
             <p className="text-3xl sm:text-4xl font-display font-black italic">{upcoming.length}</p>
             <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-white/40">Upcoming</p>
           </div>
        </div>
      </section>

      {/* Lists */}
      <div className="space-y-12">
        <section className="space-y-6">
          <h2 className="text-3xl font-display font-black uppercase italic tracking-tight">Upcoming <span className="text-white/40">Matches</span></h2>
          <AnimatePresence mode="popLayout">
            {upcoming.length === 0 ? (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-slate-500 italic font-medium p-8 glass rounded-[32px] border-white/5">No upcoming matches. Go explore!</motion.p>
            ) : (
              <div className="space-y-4">
                {upcoming.map((booking) => (
                <motion.div
                  key={booking.id}
                  layout="position"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass p-6 sm:p-8 rounded-[48px] border-white/5 hover:border-white/10 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 group min-h-max h-auto"
                >
                    <div className="flex gap-8 items-center">
                      <div className="w-20 h-20 bg-white/5 rounded-3xl flex flex-col items-center justify-center border border-white/10">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{format(booking.startTime.toDate(), 'MMM')}</span>
                        <span className="text-2xl font-display font-black italic leading-none">{format(booking.startTime.toDate(), 'dd')}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-display font-black text-2xl uppercase italic group-hover:text-lime transition-colors leading-tight">{booking.facilityName}</h3>
                          {booking.status === 'PENDING' && (
                            <span className="bg-orange-500/20 text-orange-500 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse border border-orange-500/20">Awaiting Approval</span>
                          )}
                          {booking.status === 'PENDING_PROOF' && (
                            <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse border border-blue-500/20">Verifying Proof</span>
                          )}
                          {booking.status === 'UNDER_REVIEW' && (
                            <span className="bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-indigo-500/20">Staff Reviewing</span>
                          )}
                          {booking.status === 'RESERVED' && (
                            <span className="bg-lime text-charcoal px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Locked</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs font-bold text-slate-400 uppercase tracking-widest">
                          <span className="flex items-center gap-1"><MapPin size={14} className="text-lime" /> {booking.courtName}</span>
                          <span className="flex items-center gap-1"><Clock size={14} /> {format(booking.startTime.toDate(), 'h:mm a')}</span>
                          <span className="text-white/40">REF: {booking.bookingReference}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mt-4 sm:mt-0">
                      {booking.status === 'RESERVED' && booking.expiresAt && (
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                          <CountdownTimer 
                            expiresAt={booking.expiresAt} 
                            onExpire={() => handleCancel(booking.id)} 
                          />
                          <button 
                            onClick={() => handleSetPaid(booking.id)}
                            disabled={!!isUploading}
                            className="bg-[#CCFF00] text-charcoal px-8 py-4 rounded-3xl font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-lg shadow-lime/20 flex items-center justify-center gap-2 w-full sm:w-auto"
                          >
                            {isUploading === booking.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            I Have Paid
                          </button>
                        </div>
                      )}
                      
                      {booking.status === 'PENDING_PROOF' && (
                        <button 
                          onClick={() => handleUploadProof(booking.id)}
                          disabled={!!isUploading}
                          className="bg-blue-500 text-white px-8 py-4 rounded-3xl font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 w-full sm:w-auto"
                        >
                          {isUploading === booking.id ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                          Upload Proof
                        </button>
                      )}
                      
                      <button 
                        onClick={() => handleCancel(booking.id)}
                        disabled={!!isCancelling || booking.status === 'CONFIRMED' || booking.status === 'UNDER_REVIEW'}
                        className="flex items-center gap-2 text-red-500 glass border-red-500/20 hover:bg-red-500/10 px-8 py-3 rounded-2xl transition-all text-xs font-bold w-full sm:w-auto justify-center focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-charcoal disabled:opacity-50 active:scale-95"
                      >
                        {isCancelling === booking.id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                        Cancel Booking
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </section>

        <section className="space-y-6">
          <h2 className="text-3xl font-display font-black uppercase italic tracking-tight text-white/20">Archive <span className="text-white/10">History</span></h2>
          <div className="glass rounded-[48px] overflow-hidden border-white/5">
             <div className="overflow-x-auto no-scrollbar">
               <table className="w-full text-left text-sm">
                 <thead>
                   <tr className="border-b border-white/5">
                     <th className="px-10 py-6 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Date</th>
                     <th className="px-10 py-6 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Location</th>
                     <th className="px-10 py-6 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Status</th>
                     <th className="px-10 py-6 text-[10px] uppercase tracking-widest text-slate-500 font-bold text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody>
                    {past.map((booking) => (
                      <tr key={booking.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                        <td className="px-10 py-6 font-display font-black uppercase italic text-slate-300">{format(booking.startTime.toDate(), 'MMM dd, yyyy')}</td>
                        <td className="px-10 py-6 text-slate-400 font-bold uppercase tracking-widest text-[10px]">{booking.facilityName}</td>
                        <td className="px-10 py-6">
                          <span className={`flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest ${booking.status === 'CANCELLED' ? 'text-red-400' : booking.status === 'COMPLETED' ? 'text-lime' : 'text-slate-500'}`}>
                            {booking.status === 'CANCELLED' ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
                            {booking.status === 'CANCELLED' ? 'Cancelled' : booking.status === 'COMPLETED' ? 'Completed' : 'Past'}
                          </span>
                        </td>
                        <td className="px-10 py-6 text-right">
                          {booking.status === 'COMPLETED' && !booking.hasReview && (
                            <button 
                              onClick={() => setReviewingBooking(booking)}
                              className="bg-lime text-charcoal px-6 py-2 rounded-xl text-[10px] font-black uppercase italic hover:scale-105 transition-transform"
                            >
                              Leave Review
                            </button>
                          )}
                          {booking.hasReview && (
                            <span className="text-white/20 text-[10px] uppercase font-bold tracking-widest italic flex items-center justify-end gap-1">
                              <Star size={10} fill="currentColor" /> Reviewed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {past.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-10 py-12 text-center text-slate-500 italic font-medium">No past history yet.</td>
                      </tr>
                    )}
                 </tbody>
               </table>
             </div>
          </div>
        </section>
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {reviewingBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReviewingBooking(null)}
              className="absolute inset-0 bg-charcoal/80 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-[95%] max-w-lg glass border-white/10 rounded-[32px] sm:rounded-[48px] p-6 sm:p-10 overflow-y-auto no-scrollbar max-h-[85vh] h-auto shadow-2xl m-4 sm:m-8"
            >
              <div className="absolute top-0 right-0 p-4 sm:p-8 z-10">
                <button onClick={() => setReviewingBooking(null)} className="text-[#CCFF00] hover:scale-110 transition-transform">
                  <XCircle size={32} strokeWidth={2} />
                </button>
              </div>

              <div className="space-y-8">
                <header className="pr-12 sm:pr-0">
                  <div className="bg-lime/20 text-lime w-fit px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">Post-Match Feedback</div>
                  <h2 className="text-3xl sm:text-4xl font-display font-black uppercase italic tracking-tighter leading-none whitespace-normal break-words">{reviewingBooking.facilityName}</h2>
                  <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-2">{reviewingBooking.courtName} • {format(reviewingBooking.startTime.toDate(), 'MMM dd')}</p>
                </header>

                <form onSubmit={handleSubmitReview} className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Overall Rating</label>
                    <div className="flex flex-wrap gap-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                          className={`p-3 rounded-2xl transition-all ${reviewForm.rating >= star ? 'bg-lime text-charcoal scale-110 shadow-[0_0_20px_rgba(181,245,90,0.3)]' : 'bg-white/5 text-white/20 hover:bg-white/10'}`}
                        >
                          <Star size={20} className="sm:size-6" fill={reviewForm.rating >= star ? "currentColor" : "none"} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Your Comment</label>
                    <textarea
                      required
                      placeholder="How was the lighting? The court surface? The overall vibe?"
                      className="w-full h-32 bg-white/5 border border-white/10 rounded-3xl p-5 sm:p-6 text-[13px] sm:text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-lime transition-colors resize-none leading-relaxed"
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="w-full bg-lime text-charcoal py-5 sm:py-6 rounded-3xl font-display font-black uppercase italic tracking-tighter text-lg sm:text-xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-lime/20 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isSubmittingReview ? <Loader2 size={24} className="animate-spin" /> : <>Post Review <Plus size={20} /></>}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
