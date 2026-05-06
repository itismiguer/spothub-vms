import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  ChevronRight, 
  Ticket as TicketIcon, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2, 
  Smartphone,
  Navigation,
  Globe,
  Loader2,
  QrCode as QrCodeIcon,
  X,
  Trophy,
  Activity,
  Plus
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format, isAfter } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { QRCodeSVG } from 'qrcode.react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Facility {
  id: string;
  name: string;
  street_address: string;
  city: string;
  state_province: string;
  timezone: string;
  images: string[];
}

interface Court {
  id: string;
  name: string;
  sport: string;
}

interface Booking {
  id: string;
  facility_id: string;
  court_id: string;
  start_time: string;
  end_time: string;
  status: string;
  payment_status: string;
  booking_reference: string;
  facilities: Facility;
  courts: Court;
}

export default function MyBookings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Booking | null>(null);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          facilities (
            id, name, street_address, city, state_province, timezone, images
          ),
          courts (
            id, name, sport
          )
        `)
        .eq('user_id', user?.id)
        .order('start_time', { ascending: false });

      if (error) throw error;
      setBookings(data as any[] || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      toast.error('Could not retrieve your bookings');
    } finally {
      setLoading(false);
    }
  };

  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-transparent text-white">
        <Activity className="text-lime animate-spin mb-4" size={32} />
        <span className="text-[10px] font-black uppercase tracking-widest text-lime">Synchronizing Wallet...</span>
      </div>
    );
  }

  const upcoming = bookings.filter(b => isAfter(new Date(b.start_time), new Date()));
  const past = bookings.filter(b => !isAfter(new Date(b.start_time), new Date()));

  return (
    <div className="min-h-screen bg-transparent pb-20 relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-lime/10 via-transparent to-transparent opacity-50" />
        <div className="absolute -top-1/4 -right-1/4 w-[60%] h-[60%] bg-lime/10 rounded-full blur-[140px] animate-pulse" />
      </div>
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-5xl font-display font-black uppercase italic tracking-tighter text-white">My <span className="text-lime">Bookings</span></h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Your Digital Sports Wallet</p>
          </div>
          <button 
            onClick={() => navigate('/search')}
            className="w-full md:w-auto h-14 bg-lime text-charcoal px-8 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-lime/20"
          >
            <Plus size={18} /> New Reservation
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <div className="glass p-6 rounded-[32px] border-white/5 space-y-3">
              <Trophy className="text-lime" size={20} />
              <div>
                <p className="text-2xl font-display font-black italic text-white">{bookings.length}</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Total Games</p>
              </div>
           </div>
           <div className="glass p-6 rounded-[32px] border-white/5 space-y-3 text-lime">
              <Calendar size={20} />
              <div>
                <p className="text-2xl font-display font-black italic text-white">{upcoming.length}</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Upcoming</p>
              </div>
           </div>
        </div>

        {/* Bookings Sections */}
        <div className="space-y-16">
          {/* Upcoming Section */}
          <section className="space-y-8">
            <h2 className="text-2xl font-display font-black uppercase italic tracking-tight text-white/40">Active <span className="text-white">Tickets</span></h2>
            <div className="grid grid-cols-1 gap-4">
              {upcoming.map((booking) => {
                const venueTimeZone = booking.facilities?.timezone || 'UTC';
                const showUserTime = userTimeZone !== venueTimeZone;

                return (
                  <motion.div
                    key={booking.id}
                    layoutId={booking.id}
                    onClick={() => setSelectedTicket(booking)}
                    className="glass p-8 rounded-[40px] border-white/5 group hover:border-lime/40 transition-all cursor-pointer relative overflow-hidden flex flex-col md:flex-row gap-8 justify-between items-start md:items-center"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                         <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                           booking.payment_status === 'paid' 
                             ? 'bg-lime/10 text-lime border-lime/20' 
                             : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                         }`}>
                           {booking.payment_status === 'paid' ? 'Active Ticket' : 'Verifying Payment'}
                         </div>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-3xl font-display font-black uppercase italic tracking-tight text-white group-hover:text-lime transition-all">
                          {booking.facilities?.name}
                        </h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                           {booking.courts?.name} • {booking.courts?.sport}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4 pt-2">
                        <div className="space-y-1 text-white">
                          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
                            <Clock size={12} className="text-lime" /> Venue Local Time
                          </div>
                          <p className="text-sm font-black italic">
                            {formatInTimeZone(new Date(booking.start_time), venueTimeZone, 'EEEE, MMM d')}
                          </p>
                          <p className="text-2xl font-display font-black uppercase italic tracking-tighter">
                            {formatInTimeZone(new Date(booking.start_time), venueTimeZone, 'h:mm aa')}
                          </p>
                        </div>

                        {showUserTime && (
                           <div className="space-y-1 text-slate-400">
                             <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
                               <Globe size={12} /> Your Local Time
                             </div>
                             <p className="text-xs font-bold">
                               {format(new Date(booking.start_time), 'h:mm aa')}
                             </p>
                             <p className="text-[9px] font-bold uppercase text-slate-600">{userTimeZone}</p>
                           </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className="flex-1 md:flex-none glass p-4 rounded-3xl border-white/10 flex items-center justify-center">
                         <QrCodeIcon size={32} className="text-white/20 group-hover:text-lime transition-colors" />
                      </div>
                      <ChevronRight size={24} className="text-slate-700 group-hover:text-lime transition-colors group-hover:translate-x-1" />
                    </div>
                  </motion.div>
                );
              })}
              {upcoming.length === 0 && (
                <div className="p-12 glass rounded-[40px] border-white/5 border-dashed text-center">
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No active sessions. Start a new match today.</p>
                </div>
              )}
            </div>
          </section>

          {/* Past Section */}
          <section className="space-y-8">
            <h2 className="text-2xl font-display font-black uppercase italic tracking-tight text-white/20">Game <span className="text-white/10">Archive</span></h2>
            <div className="glass rounded-[48px] border-white/5 overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                      <tr className="border-b border-white/5">
                        <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Date Played</th>
                        <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Facility / Court</th>
                        <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                        <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Reference</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                      {past.map((b) => (
                        <tr key={b.id} className="group hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setSelectedTicket(b)}>
                           <td className="p-8 text-xs font-black uppercase text-slate-300">
                              {format(new Date(b.start_time), 'MMM dd, yyyy')}
                           </td>
                           <td className="p-8">
                              <div className="text-xs font-black uppercase text-white">{b.facilities?.name}</div>
                              <div className="text-[9px] text-slate-500 uppercase font-bold">{b.courts?.name}</div>
                           </td>
                           <td className="p-8">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 size={12} className={b.status === 'CANCELLED' ? 'text-red-500' : 'text-slate-500'} />
                                <span className={`text-[9px] font-black uppercase tracking-widest ${b.status === 'CANCELLED' ? 'text-red-500' : 'text-slate-500'}`}>
                                  {b.status}
                                </span>
                              </div>
                           </td>
                           <td className="p-8 text-right font-mono text-[10px] text-slate-600">
                             #{b.booking_reference}
                           </td>
                        </tr>
                      ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </section>
        </div>
      </div>

      {/* Digital Ticket Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-3xl"
              onClick={() => setSelectedTicket(null)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-lg bg-white rounded-[48px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.5)] text-charcoal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-10 space-y-8">
                <div className="flex justify-between items-start">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entry Ticket</p>
                      <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter leading-none">{selectedTicket.facilities?.name}</h2>
                   </div>
                   <button 
                    onClick={() => setSelectedTicket(null)}
                    className="w-12 h-12 bg-charcoal/5 rounded-2xl flex items-center justify-center hover:bg-charcoal/10 transition-colors"
                   >
                      <X className="text-charcoal" size={24} />
                   </button>
                </div>

                <div className="grid grid-cols-2 gap-8 pt-4">
                   <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Court / Field</p>
                      <p className="text-base font-black uppercase italic">{selectedTicket.courts?.name}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Booking Reference</p>
                      <p className="text-base font-black uppercase italic text-lime-600">#{selectedTicket.booking_reference}</p>
                   </div>
                </div>

                <div className="p-8 bg-charcoal/5 rounded-[32px] space-y-6">
                   <div className="flex items-center gap-5">
                      <Calendar size={20} className="text-slate-400" />
                      <div>
                         <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Date & Venue Time</p>
                         <p className="text-sm font-black uppercase italic">
                            {formatInTimeZone(new Date(selectedTicket.start_time), selectedTicket.facilities?.timezone || 'UTC', 'EEEE, MMM d @ h:mm aa')}
                         </p>
                      </div>
                   </div>
                   <div className="flex items-start gap-5">
                      <MapPin size={20} className="text-slate-400 mt-1" />
                      <div className="space-y-1">
                         <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Structured Address</p>
                         <p className="text-xs font-bold leading-tight">
                            {selectedTicket.facilities?.street_address}<br/>
                            {selectedTicket.facilities?.city}, {selectedTicket.facilities?.state_province}
                         </p>
                      </div>
                   </div>
                </div>

                {/* Status Alert */}
                {selectedTicket.payment_status === 'pending' && (
                   <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex items-start gap-4">
                      <AlertCircle className="text-amber-500 flex-shrink-0" size={18} />
                      <div className="space-y-1">
                         <p className="text-[10px] font-black uppercase tracking-widest text-amber-900">Payment Verification</p>
                         <p className="text-[10px] font-medium text-amber-800 leading-normal">Our team is verifying your payment. Your ticket will be active shortly.</p>
                      </div>
                   </div>
                )}
              </div>

              {/* Perforation Line */}
              <div className="relative flex items-center px-10">
                 <div className="absolute -left-6 w-12 h-12 bg-[#0A0A0A] rounded-full" />
                 <div className="absolute -right-6 w-12 h-12 bg-[#0A0A0A] rounded-full" />
                 <div className="w-full border-t-2 border-dashed border-charcoal/10" />
              </div>

              {/* Ticket Bottom (QR Code) */}
              <div className="p-10 flex flex-col items-center gap-8 bg-slate-50/50">
                 <div className={`p-6 bg-white rounded-4xl border-2 transition-all ${selectedTicket.payment_status === 'paid' ? 'border-lime' : 'border-slate-100'}`}>
                    <QRCodeSVG 
                      value={selectedTicket.id}
                      size={200}
                      level="H"
                      includeMargin={false}
                      className={selectedTicket.payment_status === 'paid' ? 'opacity-100' : 'opacity-10 grayscale'}
                    />
                 </div>
                 
                 <div className="w-full flex flex-col gap-3">
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedTicket.facilities?.street_address + ', ' + selectedTicket.facilities?.city)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-16 bg-charcoal text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                       <Navigation size={18} className="text-lime" />
                       Open in Google Maps
                    </a>
                    <button 
                      onClick={() => setSelectedTicket(null)}
                      className="w-full h-14 border border-charcoal/5 rounded-2xl flex items-center justify-center font-black uppercase tracking-widest text-[10px] text-slate-400 hover:text-charcoal transition-colors"
                    >
                       Close Pocket
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
