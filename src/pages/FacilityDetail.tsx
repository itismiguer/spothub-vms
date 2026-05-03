import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format, addHours, startOfDay, isBefore, eachHourOfInterval, setHours, addDays, isSameDay } from 'date-fns';
import { MapPin, Clock, ArrowLeft, CheckCircle2, Star, ShieldAlert, Trophy, Info, Calendar as CalendarIcon, ShieldCheck, Activity, XCircle, Loader2, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Selector from '../components/Selector';
import Modal from '../components/Modal';
import { toast } from 'sonner';

interface Facility {
  id: string;
  name: string;
  type: string;
  description: string;
  address: string;
  images: string[];
  owner_id: string;
  rules?: string;
  status: 'ACTIVE' | 'DEACTIVATED';
}

interface Court {
  id: string;
  name: string;
  hourly_rate: number;
}

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  court_id: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'MAINTENANCE' | 'PENDING' | 'RESERVED' | 'PENDING_PROOF' | 'UNDER_REVIEW' | 'manual_block';
  expires_at?: string;
  court_name?: string;
  facility_id: string;
}

interface Review {
  id: string;
  rating: number;
  comment?: string;
  facility_id: string;
}

export default function FacilityDetail() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dateScrollRef = React.useRef<HTMLDivElement>(null);

  const scrollDates = (direction: 'left' | 'right') => {
    if (dateScrollRef.current) {
      const scrollAmount = 200;
      dateScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const [facility, setFacility] = useState<Facility | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [timeSlotsTable, setTimeSlotsTable] = useState<any[]>([]); // New state for time_slots table
  const [reviews, setReviews] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [pendingBookingStart, setPendingBookingStart] = useState<Date | null>(null);
  const [bookingEnd, setBookingEnd] = useState<string>(''); // format 'HH:mm'
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentPreview, setPaymentPreview] = useState<string | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [reportType, setReportType] = useState('Maintenance Required');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastBookingData, setLastBookingData] = useState<any>(null);
  const [isLockingDown, setIsLockingDown] = useState(false);
  const [showLockdownConfirm, setShowLockdownConfirm] = useState(false);

  useEffect(() => {
    if (pendingBookingStart || isReporting || showSuccessModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [pendingBookingStart, isReporting, showSuccessModal]);

  const isOwner = user && facility && facility.owner_id === user.id;
  const isAdmin = profile?.role === 'ADMIN';

  const handleStartChat = async () => {
    if (!user || !facility || !id) {
      toast.error('Identity required for communication.');
      return;
    }

    if (isOwner) {
      toast.info('This is your own facility dashboard.');
      return;
    }

    setIsStartingChat(true);
    const chatId = `${user.id}_${id}`;
    
    try {
      const { data: chatSnap, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .single();
      
      if (chatError || !chatSnap) {
        await supabase.from('chats').insert({
          id: chatId,
          player_id: user.id,
          player_name: profile?.name || 'Anonymous Player',
          facility_id: id,
          facility_name: facility.name,
          facility_owner_id: facility.owner_id,
          last_timestamp: new Date().toISOString(),
          unread_count_owner: 1
        });
        
        await supabase.from('messages').insert({
          chat_id: chatId,
          text: `Inquiry started for ${facility.name}. How can I help you?`,
          sender_id: 'system'
        });
      }
      
      navigate('/messages');
    } catch (error) {
      toast.error('Communications uplink failed.');
    } finally {
      setIsStartingChat(false);
    }
  };

  useEffect(() => {
    if (!id) return;

    async function fetchData() {
      try {
        const { data: facilityData, error: facilityError } = await supabase
          .from('facilities')
          .select('*')
          .eq('id', id)
          .single();

        if (facilityError) throw facilityError;
        
        const isOwner = user && facilityData.owner_id === user.id;
        const isAdmin = profile?.role === 'ADMIN';
        
        if (facilityData.status === 'DEACTIVATED' && !isOwner && !isAdmin) {
          toast.error('Facility Offline', {
            description: 'The management has temporarily taken this facility offline.'
          });
          navigate('/');
          return;
        }
        
        setFacility(facilityData as Facility);

        const { data: courtsData } = await supabase.from('courts').select('*').eq('facility_id', id);
        setCourts(courtsData as Court[] || []);

        const { data: bookingsData } = await supabase.from('bookings').select('*').eq('facility_id', id);
        setBookings(bookingsData as Booking[] || []);

        // Optional: Fetch from time_slots table if user integration is active
        const { data: tsData } = await supabase.from('time_slots').select('*').in('court_id', courtsData?.map(c => c.id) || []);
        setTimeSlotsTable(tsData || []);

        const { data: reviewsData } = await supabase.from('reviews').select('*').eq('facility_id', id);
        setReviews(reviewsData || []);

      } catch (error) {
        console.error("Facility fetchData error:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    // Setup subscriptions
    const courtsSub = supabase.channel(`courts-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courts', filter: `facility_id=eq.${id}` }, fetchData)
      .subscribe();

    const bookingsSub = supabase.channel(`bookings-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `facility_id=eq.${id}` }, fetchData)
      .subscribe();

    const reviewsSub = supabase.channel(`reviews-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `facility_id=eq.${id}` }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(courtsSub);
      supabase.removeChannel(bookingsSub);
      supabase.removeChannel(reviewsSub);
    };
  }, [id, user]);

  useEffect(() => {
    if (courts.length > 0 && !selectedCourt) {
      setSelectedCourt(courts[0].id);
    }
  }, [courts, selectedCourt]);

  useEffect(() => {
    const isAnyModalOpen = pendingBookingStart || showSuccessModal || isReporting || showLockdownConfirm;
    if (isAnyModalOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [pendingBookingStart, showSuccessModal, isReporting, showLockdownConfirm]);

  const generateTimeSlots = () => {
    const start = setHours(selectedDate, 8); 
    const end = setHours(selectedDate, 22); 
    return eachHourOfInterval({ start, end });
  };

  const getSlotStatus = (startTime: Date, durationMinutes: number = 60) => {
    if (!selectedCourt) return 'NONE';
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

    const match = bookings.find(b => {
      if (b.court_id !== selectedCourt) return false;
      const bStatus = b.status?.toUpperCase();
      if (bStatus === 'CANCELLED') return false;

      // Check for reservation expiry if RESERVED or PENDING_PROOF
      if ((bStatus === 'RESERVED' || bStatus === 'PENDING_PROOF' || bStatus === 'UNDER_REVIEW') && b.expires_at) {
        const expiry = new Date(b.expires_at);
        if (new Date() > expiry) return false; // Ignore expired reservations
      }

      const bStart = new Date(b.start_time);
      const bEnd = new Date(b.end_time);
      return (startTime < bEnd) && (endTime > bStart);
    });

    if (match) return match.status;
    return 'AVAILABLE';
  };

  const handleExecuteLockdown = async () => {
    if (!id || !facility) return;

    setIsLockingDown(true);
    setShowLockdownConfirm(false);
    try {
      const now = new Date();
      const end48 = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      // 1. Cancel overlapping confirmed bookings
      const { data: bookingsToCancel } = await supabase
        .from('bookings')
        .select('id, start_time')
        .eq('facility_id', id)
        .eq('status', 'CONFIRMED');
      
      if (bookingsToCancel) {
        const cancellations = bookingsToCancel.filter(d => {
          const bStart = new Date(d.start_time);
          return bStart < end48 && bStart > now;
        }).map(d => supabase.from('bookings').update({ 
          status: 'CANCELLED',
          cancellation_reason: 'Emergency Facility Maintenance'
        }).eq('id', d.id));
        await Promise.all(cancellations);
      }

      // 2. Create maintenance blocks for all courts
      await Promise.all(courts.map(court => 
        supabase.from('bookings').insert({
          court_id: court.id,
          court_name: court.name,
          facility_id: id,
          facility_name: facility.name,
          facility_owner_id: facility.owner_id,
          user_id: user?.id,
          user_name: '(SYSTEM LOCKDOWN)',
          start_time: now.toISOString(),
          end_time: end48.toISOString(),
          status: 'MAINTENANCE',
          amount: 0
        })
      ));

      toast.error("PROTOCOL ACTIVATED: All courts are now under maintenance.", {
        icon: '🚨',
        duration: 5000
      });
    } catch (e) {
      toast.error("Lockdown sequence failed.");
    } finally {
      setIsLockingDown(false);
    }
  };

  const [lastBookingId, setLastBookingId] = useState<string | null>(null);
  const [currentBookingStatus, setCurrentBookingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!lastBookingId) return;
    const channel = supabase.channel(`booking-${lastBookingId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${lastBookingId}` }, (payload) => {
        const data = payload.new as any;
        setCurrentBookingStatus(data.status);
        if (data.status === 'CONFIRMED' && currentBookingStatus === 'PENDING') {
          toast.success("YOUR BOOKING WAS JUST APPROVED!", {
            icon: '🔥',
            style: { background: '#B5F55A', color: '#121212' }
          });
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [lastBookingId, currentBookingStatus]);

  const handleBooking = async () => {
    if (!user) {
      navigate('/register', { state: { from: location } });
      return;
    }

    if (profile?.role === 'OWNER') {
      toast.error('ACCESS RESTRICTED: Owners must log sessions via CMS Console.');
      return;
    }
    if (!pendingBookingStart || !bookingEnd) {
      toast.error('Identity and complete timing required!');
      return;
    }

    if (!selectedCourt || !id || !facility) return;
    if (!paymentFile) {
      toast.error('PAYMENT REQUIRED: Please upload a receipt screenshot.');
      return;
    }

    const [hours, minutes] = bookingEnd.split(':').map(Number);
    const endTime = new Date(pendingBookingStart);
    endTime.setHours(hours, minutes);

    const durationMinutes = (endTime.getTime() - pendingBookingStart.getTime()) / 60000;
    
    if (durationMinutes <= 0) {
      toast.error('End time must be after start time.');
      return;
    }

    const status = getSlotStatus(pendingBookingStart, durationMinutes);
    if (status !== 'AVAILABLE' && !isOwner && !isAdmin) {
      toast.error('This time range has conflicting reservations.');
      return;
    }

    setIsBooking(true);

    try {
      // 1. Upload Payment Receipt to Supabase Storage
      const fileExt = paymentFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('bookings')
        .upload(filePath, paymentFile);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload payment receipt.');
      }

      const { data: { publicUrl } } = supabase.storage
        .from('bookings')
        .getPublicUrl(filePath);

      // Direct overlap check via query
      const { data: overlaps } = await supabase
        .from('bookings')
        .select('*')
        .eq('court_id', selectedCourt)
        .in('status', ['CONFIRMED', 'manual_block']);
      
      const hasOverlap = overlaps?.some(b => {
        const bStart = new Date(b.start_time);
        const bEnd = new Date(b.end_time);
        return (pendingBookingStart < bEnd && endTime > bStart);
      });

      if (hasOverlap) {
        toast.error('TIME CONFLICT: This range is now occupied.');
        setIsBooking(false);
        return;
      }

      const bookingRef = `#APP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const selectedCourtData = courts.find(c => c.id === selectedCourt);
      
      const bookingData = {
        court_id: selectedCourt,
        court_name: selectedCourtData?.name || 'Unknown Court',
        facility_id: id,
        facility_name: facility.name,
        facility_owner_id: facility.owner_id, 
        user_id: user.id,
        user_name: profile?.name || user.email,
        start_time: pendingBookingStart.toISOString(),
        end_time: endTime.toISOString(),
        status: 'UNDER_REVIEW', // Changed from RESERVED to UNDER_REVIEW
        booking_reference: bookingRef,
        amount: (selectedCourtData?.hourly_rate || 0) * (durationMinutes / 60),
        payment_receipt_url: publicUrl, // Save the public URL
      };

      const { data: newBooking, error: bookingErr } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();
      
      if (bookingErr) throw bookingErr;

      await supabase.from('notifications').insert({
        user_id: facility.owner_id, // Notify the owner
        title: 'New Payment for Review',
        message: `${bookingData.user_name} uploaded proof for ${selectedCourtData?.name}.`,
        type: 'new_booking',
        read: false,
        related_id: newBooking.id
      });

      setLastBookingId(newBooking.id);
      setCurrentBookingStatus('UNDER_REVIEW');
      
      setLastBookingData({
        ...bookingData,
        start_time: pendingBookingStart.toISOString(),
        end_time: endTime.toISOString(),
        id: newBooking.id
      });

      toast.success('BOOKING SUBMITTED: Awaiting Owner Verification!', {
        duration: 5000,
        icon: '⏳',
      });

      setShowSuccessModal(true);
      setPendingBookingStart(null);
      setBookingEnd('');
      
    } catch (error) {
      console.error("Booking write error:", error);
    } finally {
      setIsBooking(false);
    }
  };

  if (loading || !facility) {
    return (
      <div className="h-screen flex items-center justify-center bg-charcoal">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5] 
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="text-lime flex flex-col items-center gap-4"
        >
          <Activity size={48} />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Syncing Facility...</span>
        </motion.div>
      </div>
    );
  }

  const timeSlots = generateTimeSlots();
  const next7Days = [...Array(7)].map((_, i) => addDays(startOfDay(new Date()), i));

  return (
    <div className="pb-32 bg-charcoal selection:bg-lime/30 min-h-screen">
      {/* Immersive Header */}
      <section className="relative h-[65vh] overflow-hidden">
        <motion.img 
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5 }}
          src={facility.images[0]} 
          className="w-full h-full object-cover" 
          alt={facility.name} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        
        <div className="absolute inset-x-0 top-0 pt-24 sm:pt-32 px-6 sm:px-12 z-20 pointer-events-none">
          <div className="max-w-[1440px] mx-auto">
             <motion.div 
               initial={{ opacity: 0, y: -10 }}
               animate={{ opacity: 1, y: 0 }}
               className="flex flex-wrap items-center gap-3 pointer-events-auto"
             >
                <button 
                  onClick={() => navigate(-1)}
                  className="glass p-2.5 rounded-full hover:bg-white/10 transition-all mr-2 focus:outline-none focus:ring-2 focus:ring-lime"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="glass-lime px-4 py-1.5 rounded-full text-[10px] font-bold text-lime uppercase tracking-[0.2em] border border-lime/20">
                  {facility.type}
                </div>
                <div className="glass px-4 py-1.5 rounded-full text-[10px] font-bold text-white uppercase tracking-[0.2em]">
                  Elite Club
                </div>
             </motion.div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 pt-32 pb-12 px-6 sm:px-12">
          <div className="max-w-[1440px] mx-auto space-y-6">
             
             <motion.h1 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="text-5xl sm:text-7xl lg:text-9xl font-display font-black tracking-tighter uppercase italic leading-[0.8] drop-shadow-2xl break-words"
             >
               {facility.name}
             </motion.h1>

             <div className="flex flex-wrap items-center gap-6 text-slate-300">
                <div className="flex items-center gap-2 text-sm">
                   <MapPin size={16} className="text-lime" />
                   <span className="text-white">{facility.address}</span>
                </div>
                <button 
                  onClick={handleStartChat}
                  disabled={isStartingChat}
                  className="glass px-6 py-2 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/10 transition-all active:scale-95 text-[9px] font-black uppercase tracking-widest text-lime border-lime/20"
                >
                   {isStartingChat ? (
                     <div className="flex items-center gap-1.5">
                       <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-lime" />
                       <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-lime" />
                       <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-lime" />
                     </div>
                   ) : (
                     <>
                       <MessageCircle size={12} />
                       Chat Owner
                     </>
                   )}
                </button>
                <button 
                  onClick={() => setIsReporting(true)}
                  className="glass px-6 py-2 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-500/10 transition-all active:scale-95 text-[9px] font-black uppercase tracking-widest text-red-400 border-red-500/20"
                >
                   <ShieldAlert size={12} />
                   Report Issue
                </button>
                <div className="flex items-center gap-1 text-sm font-bold text-white leading-none capitalize">
                   <Star size={16} className="text-lime fill-lime" />
                   {reviews.length > 0 ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length).toFixed(1) : 'New'} ({bookings.length} Bookings)
                </div>
             </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1440px] mx-auto px-4 md:px-12 grid grid-cols-1 lg:grid-cols-3 gap-12 mt-12">
        {/* About & Stats */}
        <div className="lg:col-span-2 space-y-12">
          <section className="space-y-6">
            <h2 className="text-3xl font-display font-black uppercase italic tracking-tight">Overview <span className="text-white/40">Details</span></h2>
            <p className="text-slate-300 leading-loose text-lg max-w-2xl">
              {facility.description || "The premier athletic destination. Featuring state-of-the-art surfaces, professional lighting, and luxury amenities for competitors and enthusiasts alike."}
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
               {[
                 { icon: Clock, label: '8 AM - 10 PM' },
                 { icon: Trophy, label: 'Pro Grade' },
                 { icon: ShieldCheck, label: 'Insured' },
                 { icon: Info, label: 'Staffed' }
               ].map((item, i) => (
                 <div key={i} className="glass p-4 rounded-3xl space-y-3">
                    <item.icon className="text-lime" size={20} />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">{item.label}</p>
                 </div>
               ))}
            </div>
          </section>

          <section className="space-y-6 glass p-6 sm:p-8 md:p-10 rounded-[32px] sm:rounded-[40px] border-white/5">
            <h2 className="text-2xl font-display font-black uppercase italic tracking-tight text-lime">Venue <span className="text-white/40">Rules</span></h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm text-slate-300">
              {(facility.rules || "Proper footwear required\nArrive 10 minutes early\nNo outside food allowed\nRespect your 60m slot").split('\n').map((rule, i) => (
                <div key={i} className="flex gap-4 items-start border-b border-white/5 pb-2">
                   <CheckCircle2 size={16} className="text-lime mt-1 flex-shrink-0" />
                   <span>{rule}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="flex justify-center pt-12">
            <button 
              onClick={() => setIsReporting(true)}
              className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-red-400 transition-colors flex items-center justify-center gap-3 group"
            >
              <div className="w-8 h-[1px] bg-white/10 group-hover:bg-red-500/20" />
              <ShieldAlert size={14} className="group-hover:animate-pulse" />
              Report Integrity Issue
              <div className="w-8 h-[1px] bg-white/10 group-hover:bg-red-500/20" />
            </button>
          </div>
        </div>

        {/* Booking Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-28 space-y-8">
            <div className="glass p-6 sm:p-10 rounded-[48px] space-y-8 shadow-2xl relative overflow-hidden min-h-max h-auto">
              <div className="absolute top-0 right-0 w-32 h-32 bg-lime/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              
                <div className="flex flex-col gap-4">
                  <h3 className="text-2xl font-display font-black uppercase italic">Reserve <span className="text-white/40">Court</span></h3>
                  {(profile?.role === 'OWNER' || profile?.role === 'ADMIN') && (isOwner || isAdmin) && (
                    <button 
                      disabled={isLockingDown}
                      onClick={() => setShowLockdownConfirm(true)}
                      className="w-full bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isLockingDown ? (
                        <div className="flex items-center gap-1.5">
                          <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        </div>
                      ) : (
                        <>
                          <ShieldAlert size={14} />
                          Emergency Lockdown
                        </>
                      )}
                    </button>
                  )}
                </div>

              {/* Date Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-white/50">Schedule Matrix</label>
                  <div className="relative group">
                    <input 
                      type="date"
                      min={format(new Date(), 'yyyy-MM-dd')}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        // Use string split to avoid timezone shifts
                        const [y, m, d] = e.target.value.split('-').map(Number);
                        const date = new Date(y, m - 1, d);
                        setSelectedDate(startOfDay(date));
                        setPendingBookingStart(null);
                        setBookingEnd('');
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer z-20 w-full h-full"
                    />
                    <div 
                      className="flex items-center justify-center gap-2 bg-lime/10 border border-lime/20 px-4 py-2 rounded-full text-[10px] font-black text-lime uppercase tracking-widest hover:bg-lime/20 transition-all relative z-10"
                    >
                      <CalendarIcon size={12} />
                      Pick A Date
                    </div>
                  </div>
                </div>

                <div className="relative group/calendar">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => scrollDates('left')}
                      className="p-2 glass rounded-xl border-white/10 text-white transition-all sm:flex items-center justify-center hover:bg-lime hover:text-charcoal"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    <div 
                      ref={dateScrollRef}
                      className="flex-1 flex gap-2 overflow-x-auto no-scrollbar pb-2 scroll-smooth"
                    >
                      {(isSameDay(selectedDate, new Date()) || isBefore(selectedDate, addDays(new Date(), 7)) ? next7Days : [selectedDate]).map((date) => (
                        <button
                          key={date.toISOString()}
                          onClick={() => {
                            setSelectedDate(date);
                            setPendingBookingStart(null);
                            setBookingEnd('');
                          }}
                          className={`flex-shrink-0 w-14 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border focus:outline-none focus:ring-2 focus:ring-lime focus:ring-offset-2 focus:ring-offset-charcoal ${
                            isSameDay(selectedDate, date)
                            ? 'bg-lime text-black border-lime shadow-[0_0_15px_rgba(181,245,90,0.3)]'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                          }`}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-widest leading-none">{format(date, 'EEE')}</span>
                          <span className="text-base font-bold leading-none">{format(date, 'd')}</span>
                        </button>
                      ))}
                    </div>

                    <button 
                      onClick={() => scrollDates('right')}
                      className="p-2 glass rounded-xl border-white/10 text-white transition-all sm:flex items-center justify-center hover:bg-lime hover:text-charcoal"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Selector
                  options={courts.map(c => ({ id: c.id, label: c.name, icon: Activity }))}
                  selectedId={selectedCourt}
                  onSelect={(id) => {
                    setSelectedCourt(id);
                    setPendingBookingStart(null);
                    setBookingEnd('');
                  }}
                  label="Court Array Selector"
                  placeholder="Select Court"
                  loading={loading}
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] uppercase font-bold tracking-widest text-white/50 ml-2">Time Matrix</label>
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto no-scrollbar pr-2">
                  {timeSlots.filter(slot => {
                    const status = getSlotStatus(slot);
                    const isPast = isBefore(slot, new Date());
                    const isOccupied = ['CONFIRMED', 'MAINTENANCE', 'manual_block', 'RESERVED', 'PENDING_PROOF', 'UNDER_REVIEW'].includes(status.toUpperCase());
                    return !isOccupied && !isPast;
                  }).map((slot, i) => {
                    const status = getSlotStatus(slot);
                    const isSelected = pendingBookingStart && slot.getTime() === pendingBookingStart.getTime();
                    
                    let statusClasses = 'bg-white/5 border-white/10 text-slate-300 hover:bg-lime hover:text-charcoal hover:border-lime';
                    
                    if (isSelected) {
                      statusClasses = 'bg-lime text-charcoal border-lime shadow-[0_0_15px_rgba(181,245,90,0.4)]';
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => {
                          if (!user) {
                            navigate('/register', { state: { from: location } });
                            return;
                          }
                          setPendingBookingStart(slot);
                        }}
                        className={`p-2 rounded-xl text-[10px] font-bold transition-all border focus:outline-none focus:ring-2 focus:ring-lime focus:ring-offset-2 focus:ring-offset-charcoal flex flex-col items-center justify-center gap-1 min-h-[50px] ${statusClasses}`}
                      >
                        <span className="leading-none">{format(slot, 'h:mm a')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Rate (60 MIN)</p>
                  <p className="text-2xl font-display font-black italic uppercase">₱{courts.find(c => c.id === selectedCourt)?.hourly_rate || 350}</p>
                </div>
                <div className="w-12 h-12 bg-lime/10 rounded-2xl flex items-center justify-center text-lime ring-1 ring-lime/20">
                  <Activity size={24} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reservation Bottom Sheet */}
      <AnimatePresence>
        {pendingBookingStart && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setPendingBookingStart(null);
                setBookingEnd('');
              }}
              className="absolute inset-0 bg-charcoal/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-[95%] max-w-lg bg-charcoal border border-white/10 rounded-[48px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-10 flex flex-col max-h-[92vh] m-4 sm:m-8"
            >
              {/* Handle */}
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-6 mb-2 flex-shrink-0" />
              
              <div className="p-8 sm:p-12 overflow-y-auto no-scrollbar pb-40">
                <div className="absolute top-6 right-8">
                  <button onClick={() => {
                    setPendingBookingStart(null);
                    setBookingEnd('');
                  }} className="text-white/20 hover:text-white transition-colors">
                    <XCircle size={32} strokeWidth={1.5} />
                  </button>
                </div>

                <div className="space-y-10">
                  <header>
                    <div className="bg-lime/20 text-lime w-fit px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">Confirm Reservation</div>
                    <h2 className="text-4xl sm:text-5xl font-display font-black uppercase italic tracking-tighter leading-none">{facility.name}</h2>
                    <p className="text-white/60 text-sm font-bold uppercase tracking-widest mt-4 flex items-center gap-2">
                       <CalendarIcon size={14} className="text-lime" />
                       {courts.find(c => c.id === selectedCourt)?.name} • {format(pendingBookingStart, 'MMM dd, yyyy')}
                    </p>
                  </header>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Arrival Time</label>
                      <div className="w-full glass border-white/10 p-5 rounded-3xl text-sm font-bold text-white flex items-center gap-3">
                         <Clock size={16} className="text-lime" />
                         {format(pendingBookingStart, 'h:mm a')}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Departure Time</label>
                      <div className="relative">
                        <select 
                          value={bookingEnd}
                          onChange={(e) => setBookingEnd(e.target.value)}
                          className="w-full glass border-white/10 p-5 rounded-3xl text-sm font-bold focus:border-lime/40 transition-all text-white appearance-none cursor-pointer"
                        >
                          <option value="" className="bg-charcoal text-white">Select end time</option>
                          {[...Array(10)].map((_, i) => {
                            const time = addHours(pendingBookingStart, (i + 1));
                            const val = format(time, 'HH:mm');
                            const statusAtEnd = getSlotStatus(pendingBookingStart, (i + 1) * 60);
                            const isSlotConflict = ['CONFIRMED', 'MAINTENANCE', 'manual_block'].includes(statusAtEnd.toLowerCase());
                            
                            if (isSlotConflict) return null;
                            
                            return <option key={val} value={val} className="bg-charcoal text-white">{format(time, 'h:mm a')}</option>;
                          })}
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                           <Clock size={16} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 space-y-6">
                    <header className="flex items-center justify-between">
                       <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">Payment Receipt (Required)</label>
                       {paymentPreview && <CheckCircle2 size={14} className="text-lime" />}
                    </header>
                    
                    <div className="relative group">
                       <input 
                         type="file" 
                         accept="image/*"
                         onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                               setPaymentFile(file);
                               const reader = new FileReader();
                               reader.onloadend = () => {
                                  setPaymentPreview(reader.result as string);
                                  toast.success('Receipt loaded successfully!');
                               };
                               reader.readAsDataURL(file);
                            }
                         }}
                         className="absolute inset-0 opacity-0 cursor-pointer z-10"
                       />
                       <div className={`w-full h-32 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 transition-all ${
                         paymentPreview ? 'border-lime/40 bg-lime/5' : 'border-white/10 bg-white/5 group-hover:border-lime/20'
                       }`}>
                          {paymentPreview ? (
                            <div className="flex flex-col items-center gap-2">
                               <CheckCircle2 size={24} className="text-lime" />
                               <span className="text-[10px] font-black uppercase text-lime">Image Captured</span>
                            </div>
                          ) : (
                            <>
                               <Activity size={24} className="text-white/20" />
                               <span className="text-[10px] font-black uppercase text-slate-500">Attach Screenshot (GCash/Maya)</span>
                            </>
                          )}
                       </div>
                    </div>

                    <div className="flex justify-between items-center text-sm pt-4 border-t border-white/5">
                      <span className="text-slate-500 uppercase font-bold tracking-widest text-[10px]">Session Duration</span>
                      <span className="text-white font-black italic uppercase">
                        {bookingEnd ? (() => {
                          const [h, m] = bookingEnd.split(':').map(Number);
                          const end = new Date(pendingBookingStart);
                          end.setHours(h, m);
                          const diff = (end.getTime() - pendingBookingStart.getTime()) / 60000;
                          return `${diff} Minutes`;
                        })() : 'Select Departure'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 uppercase font-bold tracking-widest text-[10px]">Rate per Hour</span>
                      <span className="text-white font-black italic">₱{courts.find(c => c.id === selectedCourt)?.hourly_rate}</span>
                    </div>
                    <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                      <span className="text-lime uppercase font-black tracking-widest text-[10px] italic shrink-0">Total Due</span>
                      <span className="text-2xl sm:text-3xl font-display font-black italic text-lime ml-2">
                        {bookingEnd ? (() => {
                          const [h, m] = bookingEnd.split(':').map(Number);
                          const end = new Date(pendingBookingStart);
                          end.setHours(h, m);
                          const diff = (end.getTime() - pendingBookingStart.getTime()) / 60000;
                          const rate = courts.find(c => c.id === selectedCourt)?.hourlyRate || 0;
                          const hours = diff / 60;
                          return `₱${(rate * hours).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                        })() : '---'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <p className="text-[10px] text-center text-slate-500 uppercase font-bold tracking-widest italic px-12 leading-relaxed">
                      Instant verification engaged. Your session will be locked upon confirmation.
                    </p>
                  </div>
                </div>

                {/* Sticky Footer for Mobile Confirm Button - Stays fixed to sheet bottom */}
                <div className="absolute bottom-0 inset-x-0 p-8 pt-4 pb-12 bg-gradient-to-t from-charcoal via-charcoal to-transparent z-[301]">
                  {(isOwner || isAdmin) ? (
                    <div className="w-full glass border-white/10 p-6 rounded-[32px] text-center">
                       <p className="text-[10px] font-black text-lime uppercase tracking-[0.2em] mb-2 flex items-center justify-center gap-2">
                         <ShieldAlert size={14} /> Owner Access Active
                       </p>
                       <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                         Please use the Management CMS to log manual facility blocks.
                       </p>
                    </div>
                  ) : (
                    <button
                      disabled={isBooking || !bookingEnd}
                      onClick={handleBooking}
                      className="w-full bg-lime text-charcoal py-7 rounded-[32px] font-display font-black uppercase italic tracking-tighter text-2xl sm:text-3xl hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-lime/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                    >
                      {isBooking ? (
                        <div className="flex items-center gap-2">
                          <motion.div 
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="w-2.5 h-2.5 rounded-full bg-charcoal"
                          />
                          <motion.div 
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                            className="w-2.5 h-2.5 rounded-full bg-charcoal"
                          />
                          <motion.div 
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                            className="w-2.5 h-2.5 rounded-full bg-charcoal"
                          />
                        </div>
                      ) : 'Confirm Reservation'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && lastBookingData && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowSuccessModal(false);
                navigate('/my-bookings');
              }}
              className="absolute inset-0 bg-charcoal/90 backdrop-blur-2xl"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-[95%] max-w-lg glass-lime border-lime/40 rounded-[32px] sm:rounded-[48px] p-6 sm:p-12 text-center shadow-[0_0_100px_rgba(181,245,90,0.2)] overflow-y-auto no-scrollbar max-h-[85vh] h-auto m-4 sm:m-8"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-lime/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
              
              <div className="relative space-y-8">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-lime rounded-full mx-auto flex items-center justify-center text-charcoal shadow-2xl shadow-lime/40">
                  <CheckCircle2 size={48} strokeWidth={2.5} className="sm:hidden" />
                  <CheckCircle2 size={56} strokeWidth={2.5} className="hidden sm:block" />
                </div>
                
                <div className="space-y-4">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-black uppercase italic tracking-tighter text-lime leading-none whitespace-normal break-words">
                    {currentBookingStatus === 'UNDER_REVIEW' ? (
                      <>Payment <br/><span className="text-orange-500">Under Review</span></>
                    ) : (
                      <>Booking <br/><span className="text-white">Confirmed</span></>
                    )}
                  </h2>
                   <div className="glass bg-white/5 border-white/10 p-5 sm:p-6 rounded-3xl space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="text-left w-full sm:w-auto">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-1">Venue</p>
                          <p className="text-lg sm:text-xl font-bold text-white whitespace-normal break-words">{facility.name}</p>
                          <p className="text-[10px] sm:text-xs font-black text-lime uppercase tracking-widest">{lastBookingData.court_name}</p>
                        </div>
                        <div className="text-left sm:text-right w-full sm:w-auto">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-1">Ref ID</p>
                          <p className={`text-[10px] sm:text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full border inline-block ${currentBookingStatus === 'UNDER_REVIEW' ? 'text-orange-500 bg-orange-500/10 border-orange-500/20' : 'text-lime bg-lime/10 border-lime/20'}`}>{lastBookingData.booking_reference}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                         <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-1">Date</p>
                            <p className="text-xs sm:text-sm font-bold text-white whitespace-normal break-words">{format(new Date(lastBookingData.start_time), 'MMM dd, yyyy')}</p>
                         </div>
                         <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-1">Status</p>
                            <p className="text-xs sm:text-sm font-bold text-white whitespace-normal break-words">
                               {currentBookingStatus === 'UNDER_REVIEW' ? 'Reviewing Proof' : 'Verified'}
                            </p>
                         </div>
                      </div>
                   </div>
                </div>

                <p className="text-[13px] sm:text-sm md:text-base font-bold text-slate-400 uppercase tracking-widest leading-relaxed px-2 italic whitespace-normal break-words">
                  {currentBookingStatus === 'UNDER_REVIEW' 
                    ? "The facility owner has been notified. You will receive an alert once your payment is verified."
                    : "Your reservation is secured. Please arrive 10 minutes prior to your session for check-in."}
                </p>

                <button 
                  onClick={() => {
                    setShowSuccessModal(false);
                    navigate('/my-bookings');
                  }}
                  className="w-full bg-lime text-charcoal py-5 sm:py-6 rounded-3xl font-display font-black uppercase italic tracking-tighter text-xl sm:text-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-lime/20"
                >
                  View My Bookings
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Emergency Lockdown Confirmation Modal */}
      <AnimatePresence>
        {showLockdownConfirm && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLockdownConfirm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-[95%] max-w-md glass border-red-500/50 rounded-[32px] sm:rounded-[48px] p-6 sm:p-10 text-center shadow-[0_0_100px_rgba(239,68,68,0.2)] overflow-y-auto no-scrollbar max-h-[85vh] h-auto m-4 sm:m-8"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-500/20 rounded-full mx-auto flex items-center justify-center text-red-500 mb-6 sm:mb-8 border border-red-500/30">
                <ShieldAlert size={32} className="sm:hidden" />
                <ShieldAlert size={40} className="hidden sm:block" />
              </div>
              
              <div className="space-y-4 mb-8 sm:mb-10">
                <h2 className="text-2xl sm:text-3xl font-display font-black uppercase italic tracking-tighter text-white whitespace-normal break-words">System <span className="text-red-500">Lockdown</span></h2>
                <p className="text-slate-400 text-[13px] sm:text-sm font-bold uppercase tracking-widest leading-relaxed whitespace-normal break-words">
                  Are you sure you want to block all slots for today and the next 48 hours for emergency maintenance?
                </p>
                <div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/10">
                  <p className="text-[9px] font-black text-red-400 uppercase tracking-[0.2em] whitespace-normal break-words">
                    This will automatically cancel all overlapping confirmed bookings.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleExecuteLockdown}
                  className="w-full bg-red-500 text-white py-4 sm:py-5 rounded-2xl font-display font-black uppercase italic tracking-tighter text-lg sm:text-xl hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 flex items-center justify-center gap-2"
                >
                  Activate Lockdown
                </button>
                <button 
                  onClick={() => setShowLockdownConfirm(false)}
                  className="w-full glass border-white/10 py-4 sm:py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all"
                >
                  Return to Dashboard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report Issue Modal */}
      <AnimatePresence>
        {isReporting && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 sm:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReporting(false)}
              className="absolute inset-0 bg-charcoal/80 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-[95%] max-w-lg glass border-white/10 rounded-[32px] sm:rounded-[40px] p-6 sm:p-10 shadow-2xl overflow-y-auto no-scrollbar max-h-[85vh] h-auto m-4 sm:m-8"
            >
               <div className="absolute top-0 right-0 p-4 sm:p-8 z-10">
                <button onClick={() => setIsReporting(false)} className="text-white/20 hover:text-white transition-colors">
                  <XCircle size={28} sm:size={32} strokeWidth={1.5} />
                </button>
              </div>

              <div className="space-y-8 pr-8 sm:pr-0">
                <header>
                   <div className="bg-red-500/20 text-red-400 w-fit px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                     <ShieldAlert size={12} /> Maintenance Req.
                   </div>
                   <h2 className="text-2xl sm:text-3xl font-display font-black uppercase italic tracking-tighter leading-none whitespace-normal break-words">Report <span className="text-white/40">Violation</span></h2>
                   <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2 italic whitespace-normal break-words">Your report will be sent to the facility owner immediately.</p>
                </header>

                <div className="space-y-6">
                   <div className="space-y-3">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Issue Category</label>
                      <select 
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value)}
                        className="w-full glass border-white/10 p-4 sm:p-5 rounded-3xl text-sm font-bold focus:border-red-500/40 transition-all text-white appearance-none cursor-pointer"
                      >
                         {['Maintenance Required', 'Wrong Location', 'Cleanliness', 'Security Issue', 'Other'].map(type => (
                           <option key={type} value={type} className="bg-charcoal text-white">{type}</option>
                         ))}
                      </select>
                   </div>
                   
                   <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase font-bold tracking-widest leading-relaxed whitespace-normal break-words">
                      Please ensure your report is accurate. Misuse of the reporting system may result in account suspension.
                   </p>

                   <button
                     disabled={isSubmittingReport}
                     onClick={async () => {
                       if (!user) {
                         navigate('/register', { state: { from: location } });
                         return;
                       }
                       setIsSubmittingReport(true);
                       try {
                         await supabase.from('reports').insert({
                           facility_id: id,
                           facility_name: facility.name,
                           user_id: user.id,
                           user_name: profile?.name || user.email || 'Anonymous',
                           type: reportType,
                           status: 'OPEN',
                           created_at: new Date().toISOString()
                         });
                         toast.message('Report Logged', {
                           description: 'The facility owner has been notified. Thank you for your vigilance.'
                         });
                         setIsReporting(false);
                       } catch (e) {
                         toast.error('Transmission failed.');
                       } finally {
                         setIsSubmittingReport(false);
                       }
                     }}
                     className="w-full bg-red-500 text-white py-6 rounded-3xl font-display font-black uppercase italic tracking-tighter text-2xl hover:bg-red-600 active:scale-95 transition-all shadow-xl shadow-red-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
                   >
                      {isSubmittingReport ? (
                        <div className="flex items-center gap-1.5">
                          <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity }} className="w-2 h-2 rounded-full bg-white" />
                          <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} className="w-2 h-2 rounded-full bg-white" />
                          <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      ) : 'File Official Report'}
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

