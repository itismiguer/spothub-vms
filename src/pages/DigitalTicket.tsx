import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ChevronLeft, 
  Calendar, 
  MapPin, 
  AlertCircle, 
  Navigation, 
  X, 
  Activity,
  CheckCircle2,
  Download,
  Share2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { formatInTimeZone } from 'date-fns-tz';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export default function DigitalTicket() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchBooking();
    }
  }, [id]);

  const fetchBooking = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          facilities (*),
          courts (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setBooking(data);
    } catch (err) {
      toast.error('Ticket not found');
      navigate('/my-bookings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-transparent text-white">
        <Activity className="text-lime animate-spin mb-4" size={32} />
        <p className="text-[10px] font-black uppercase tracking-widest text-lime">Loading Digital Asset...</p>
      </div>
    );
  }

  if (!booking) return null;

  const venueTimeZone = booking.facilities?.timezone || 'UTC';

  return (
    <div className="min-h-screen bg-transparent text-white pb-20 relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-lime/10 via-transparent to-transparent opacity-30" />
        <div className="absolute -top-1/4 -right-1/4 w-[60%] h-[60%] bg-lime/10 rounded-full blur-[140px] animate-pulse" />
      </div>
      {/* Header */}
      <div className="glass border-b border-white/5 p-6 sticky top-0 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between">
           <Link to="/my-bookings" className="p-2 glass border-white/5 rounded-xl text-slate-400 hover:text-white transition-colors">
              <ChevronLeft size={20} />
           </Link>
           <div className="text-center">
              <h1 className="text-sm font-black uppercase tracking-widest">Entry Pass</h1>
              <p className="text-[10px] font-bold text-lime uppercase tracking-widest">Digital Ticket</p>
           </div>
           <button className="p-2 glass border-white/5 rounded-xl text-slate-400 hover:text-white transition-colors">
              <Share2 size={20} />
           </button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-6">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="w-full bg-white rounded-[48px] overflow-hidden shadow-2xl text-charcoal"
        >
          <div className="p-10 space-y-8">
            <div className="space-y-1">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Venue</p>
               <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter leading-none">{booking.facilities?.name}</h2>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-4">
               <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Court / Field</p>
                  <p className="text-base font-black uppercase italic">{booking.courts?.name}</p>
               </div>
               <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Reference</p>
                  <p className="text-base font-black uppercase italic text-lime-600">#{booking.booking_reference}</p>
               </div>
            </div>

            <div className="p-8 bg-charcoal/5 rounded-[32px] space-y-6">
               <div className="flex items-center gap-5">
                  <Calendar size={20} className="text-slate-400" />
                  <div>
                     <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Date & Venue Time</p>
                     <p className="text-sm font-black uppercase italic">
                        {formatInTimeZone(new Date(booking.start_time), venueTimeZone, 'EEEE, MMM d @ h:mm aa')}
                     </p>
                  </div>
               </div>
               <div className="flex items-start gap-5">
                  <MapPin size={20} className="text-slate-400 mt-1" />
                  <div className="space-y-1">
                     <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Structured Address</p>
                     <p className="text-xs font-bold leading-tight">
                        {booking.facilities?.street_address}<br/>
                        {booking.facilities?.city}, {booking.facilities?.state_province}
                     </p>
                  </div>
               </div>
            </div>

            {booking.payment_status === 'pending' && (
               <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex items-start gap-4">
                  <AlertCircle className="text-amber-500 flex-shrink-0" size={18} />
                  <div className="space-y-1 text-[10px] font-medium text-amber-800 leading-normal">
                     <p className="font-black uppercase tracking-widest">Verification Pending</p>
                     <p>Our team is verifying your payment. Your ticket will be active shortly.</p>
                  </div>
               </div>
            )}
          </div>

          <div className="relative flex items-center px-10">
             <div className="absolute -left-6 w-12 h-12 bg-[#0A0A0A] rounded-full" />
             <div className="absolute -right-6 w-12 h-12 bg-[#0A0A0A] rounded-full" />
             <div className="w-full border-t-2 border-dashed border-charcoal/10" />
          </div>

          <div className="p-10 flex flex-col items-center gap-8 bg-slate-50/50 text-center">
             <div className={`p-6 bg-white rounded-4xl border-2 transition-all ${booking.payment_status === 'paid' ? 'border-lime' : 'border-slate-100'}`}>
                <QRCodeSVG 
                  value={booking.id}
                  size={200}
                  level="H"
                  className={booking.payment_status === 'paid' ? 'opacity-100' : 'opacity-10 grayscale'}
                />
             </div>
             
             {booking.payment_status === 'paid' ? (
                <div className="space-y-1">
                   <div className="text-[10px] font-black uppercase tracking-widest text-lime-600 flex items-center justify-center gap-2">
                      <CheckCircle2 size={12} /> Verified Asset
                   </div>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Scan at venue check-in desk</p>
                </div>
             ) : (
                <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest animate-pulse">Waiting for manual verification</p>
             )}

             <div className="w-full flex flex-col gap-3">
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.facilities?.street_address + ', ' + booking.facilities?.city)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-16 bg-charcoal text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                   <Navigation size={18} className="text-lime" />
                   Open in Maps
                </a>
                <button className="w-full h-14 border border-charcoal/5 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] text-slate-400 hover:text-charcoal transition-colors">
                   <Download size={16} /> Save to Phone
                </button>
             </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
