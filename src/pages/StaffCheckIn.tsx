import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  User, 
  Calendar, 
  Clock, 
  ChevronLeft,
  ScanLine,
  ArrowRight
} from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Booking } from '../types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

import { createNotification } from '../lib/notifications';
import NotificationBell from '../components/NotificationBell';

export default function StaffCheckIn() {
  const { user } = useAuth();
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  const handleScan = async (result: any) => {
    if (!result || !scanning || loading) return;
    
    // Assuming the QR contains just the booking ID
    const bookingId = result[0]?.rawValue;
    if (!bookingId) return;

    setScanning(false);
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          profiles:user_id (name, email),
          courts:court_id (name),
          facilities:facility_id (name)
        `)
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      setBooking(data as unknown as Booking & { profiles: any, courts: any, facilities: any });
    } catch (err: any) {
      toast.error('Booking not found or invalid QR code');
      setScanning(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!booking || checkingIn) return;
    setCheckingIn(true);

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          checked_in_at: new Date().toISOString(),
          status: 'CHECKED_IN'
        })
        .eq('id', booking.id);

      if (error) throw error;

      toast.success('Player Checked In Successfully!');
      resetScanner();
    } catch (err: any) {
      toast.error('Check-in failed: ' + err.message);
    } finally {
      setCheckingIn(false);
    }
  };

  const resetScanner = () => {
    setBooking(null);
    setScanning(true);
  };

  return (
    <div className="min-h-screen bg-transparent text-white pb-20 relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-lime/10 via-transparent to-transparent opacity-30" />
        <div className="absolute -top-1/4 -right-1/4 w-[60%] h-[60%] bg-lime/10 rounded-full blur-[140px] animate-pulse" />
      </div>
      {/* Header */}
      <div className="glass border-b border-white/5 p-6 sticky top-0 z-50 backdrop-blur-3xl">
        <div className="max-w-md mx-auto flex items-center justify-between">
           <Link to="/owner" className="p-2 glass border-white/5 rounded-xl text-slate-400">
             <ChevronLeft size={20} />
           </Link>
            <div className="flex items-center gap-3">
               <NotificationBell />
               <div className="text-center">
                  <h1 className="text-sm font-black uppercase tracking-widest">Front Desk</h1>
                  <p className="text-[10px] font-bold text-lime uppercase tracking-widest">Staff Check-In</p>
               </div>
            </div>
           <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      <div className="max-w-md mx-auto p-6 space-y-8">
        <AnimatePresence mode="wait">
          {scanning ? (
            <motion.div 
              key="scanner"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-display font-black uppercase italic tracking-tight">Ready to <span className="text-lime">Scan</span></h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Position the player's QR code within the frame</p>
              </div>

              <div className="aspect-square glass rounded-[40px] overflow-hidden relative border-2 border-lime/20 shadow-2xl shadow-lime/5">
                <Scanner
                  onScan={handleScan}
                  allowMultiple={false}
                  scanDelay={2000}
                />
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-10 border-2 border-dashed border-lime/40 rounded-3xl animate-pulse" />
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-lime/40 shadow-[0_0_15px_rgba(190,242,2,0.5)] animate-scan" />
                </div>
              </div>

              <div className="flex flex-col items-center gap-4 py-8">
                 <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <ScanLine size={14} className="text-lime" /> Awaiting QR Code
                 </div>
                 <div className="flex gap-1">
                   {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 bg-lime/40 rounded-full animate-bounce" style={{ animationDelay: `${i * 200}ms` }} />)}
                 </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {loading ? (
                <div className="glass p-20 rounded-[40px] border-white/5 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="animate-spin text-lime" size={40} />
                  <p className="text-[10px] font-black uppercase tracking-widest">Validating Ticket...</p>
                </div>
              ) : booking ? (
                <div className="space-y-6">
                  {/* Booking Card */}
                  <div className="glass rounded-[40px] border-white/5 overflow-hidden">
                    <div className={`p-8 ${booking.payment_status === 'paid' ? 'bg-lime/10' : 'bg-amber-500/10'} border-b border-white/5 flex flex-col items-center text-center gap-4`}>
                       <div className={`w-16 h-16 rounded-full flex items-center justify-center ${booking.payment_status === 'paid' ? 'bg-lime text-charcoal' : 'bg-amber-500 text-charcoal'}`}>
                          {booking.payment_status === 'paid' ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
                       </div>
                       <div>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Payment Status</p>
                          <h3 className="text-2xl font-display font-black uppercase italic tracking-tight">
                            {booking.payment_status === 'paid' ? 'Payment Verified' : 'Payment Required'}
                          </h3>
                       </div>
                    </div>

                    <div className="p-8 space-y-6">
                       <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-1">
                             <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Player</p>
                             <div className="flex items-center gap-2">
                                <User size={12} className="text-lime" />
                                <span className="text-xs font-black uppercase tracking-tight">{(booking as any).profiles?.name || 'Guest'}</span>
                             </div>
                          </div>
                          <div className="space-y-1">
                             <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Court</p>
                             <div className="flex items-center gap-2">
                                <Calendar size={12} className="text-lime" />
                                <span className="text-xs font-black uppercase tracking-tight">{(booking as any).courts?.name}</span>
                             </div>
                          </div>
                          <div className="space-y-1">
                             <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Date</p>
                             <div className="flex items-center gap-2">
                                <Calendar size={12} className="text-lime" />
                                <span className="text-xs font-black uppercase tracking-tight">{format(new Date(booking.start_time), 'MMM dd, yyyy')}</span>
                             </div>
                          </div>
                          <div className="space-y-1">
                             <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Time</p>
                             <div className="flex items-center gap-2">
                                <Clock size={12} className="text-lime" />
                                <span className="text-xs font-black uppercase tracking-tight">{format(new Date(booking.start_time), 'HH:mm')} - {format(new Date(booking.end_time), 'HH:mm')}</span>
                             </div>
                          </div>
                       </div>

                       <div className="pt-6 border-t border-white/5">
                          <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1">Facility</p>
                          <p className="text-sm font-black uppercase tracking-widest text-white/40">{(booking as any).facilities?.name}</p>
                       </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                    {booking.payment_status === 'paid' ? (
                      <button 
                        onClick={handleCheckIn}
                        disabled={checkingIn || !!booking.checked_in_at}
                        className="w-full bg-lime text-charcoal h-20 rounded-[32px] font-display font-black text-xl uppercase italic tracking-tight shadow-xl shadow-lime/20 flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                      >
                         {checkingIn ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={24} /> {booking.checked_in_at ? 'ALREADY CHECKED IN' : 'SUCCESS - CHECK IN PLAYER'}</>}
                      </button>
                    ) : (
                      <button 
                        disabled
                        className="w-full bg-amber-500 text-charcoal h-20 rounded-[32px] font-display font-black text-xl uppercase italic tracking-tight opacity-100 flex items-center justify-center gap-4"
                      >
                         <AlertCircle size={24} /> WARNING - VERIFY PAYMENT FIRST
                      </button>
                    )}

                    <button 
                      onClick={resetScanner}
                      className="w-full glass border-white/5 h-16 rounded-[28px] font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                       <ScanLine size={16} /> Scan Another QR
                    </button>
                  </div>
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 10%; opacity: 0; }
          50% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
        .animate-scan {
          animation: scan 3s infinite linear;
        }
      `}</style>
    </div>
  );
}
