import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format, addDays, startOfDay, isBefore, isAfter, parse, addHours, differenceInMinutes, isSameDay } from 'date-fns';
import { formatInTimeZone, toDate } from 'date-fns-tz';
import { MapPin, Info, Calendar as CalendarIcon, ShieldCheck, Activity, Search, Share2, ArrowLeft, Clock, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Loader2, Upload, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import DiscoveryMap from '../components/DiscoveryMap';
import { FavoriteButton } from '../components/FavoriteButton';
import { Facility, Court, Booking } from '../types';

export default function VenuePage() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [facility, setFacility] = useState<Facility | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'courts' | 'schedule' | 'info' | 'location'>('courts');
  const [selectedDay, setSelectedDay] = useState(new Date());

  // Checkout Modal State
  const [selectedSlot, setSelectedSlot] = useState<{ court: Court; start: Date; end: Date } | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentPreview, setPaymentPreview] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVenueData() {
      if (!id) return;
      try {
        let query = supabase.from('venues').select('*');
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        
        if (isUuid) {
          query = query.or(`id.eq.${id},slug.eq.${id}`);
        } else {
          query = query.eq('slug', id);
        }

        const { data: facilityData, error: facilityError } = await query.maybeSingle();

        if (facilityError || !facilityData) {
          toast.error('Venue not found');
          navigate('/');
          return;
        }

        setFacility(facilityData as Facility);
        document.title = `${facilityData.name} | ${facilityData.city} ${facilityData.type} | SpotHub`;

        const actualId = facilityData.id;
        
        // Redirect if deactivated and not the owner
        if (facilityData.status === 'DEACTIVATED' && (!user || user.id !== facilityData.owner_id)) {
          toast.error('Facility Offline', {
            description: 'The management has temporarily taken this facility offline.'
          });
          navigate('/');
          return;
        }

        const { data: courtsData } = await supabase
          .from('courts')
          .select('*')
          .eq('facility_id', actualId)
          .is('deleted_at', null); // Filter deleted courts
        setCourts(courtsData as Court[] || []);

        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('*')
          .eq('facility_id', actualId);
        setBookings(bookingsData as Booking[] || []);

      } catch (error) {
        console.error('Error fetching venue data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchVenueData();
  }, [id, user, navigate]);

  const jsonLd = facility ? {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": facility.name,
    "image": facility.images?.[0],
    "address": {
      "@type": "PostalAddress",
      "streetAddress": facility.street_address,
      "addressLocality": facility.city,
      "addressRegion": facility.state_province,
      "addressCountry": facility.country_code
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": facility.latitude,
      "longitude": facility.longitude
    },
    "url": window.location.href,
    "telephone": facility.phone_number,
    "priceRange": "$$",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "128"
    }
  } : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.5, 1, 0.5] 
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="text-lime flex flex-col items-center gap-4"
        >
          <Activity size={48} />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Initializing Venue...</span>
        </motion.div>
      </div>
    );
  }

  if (!facility) return null;

  const next7Days = useMemo(() => {
    return [...Array(7)].map((_, i) => addDays(startOfDay(new Date()), i));
  }, []);

  const timeSlots = useMemo(() => {
    if (!facility || !facility.opening_hours) return [];
    
    // Get the day of the week in the venue's timezone
    const venueTimeZone = facility.timezone || 'UTC';
    const dayName = formatInTimeZone(selectedDay, venueTimeZone, 'eeee').toLowerCase() as keyof typeof facility.opening_hours;
    const schedule = facility.opening_hours?.[dayName];
    
    if (!schedule || schedule.closed) return [];

    const slots = [];
    const [openH, openM] = schedule.open.split(':').map(Number);
    const [closeH, closeM] = schedule.close.split(':').map(Number);

    // Start of the day in the venue's timezone
    let current = toDate(format(selectedDay, 'yyyy-MM-dd') + `T${schedule.open}:00`, { timeZone: venueTimeZone });
    const end = toDate(format(selectedDay, 'yyyy-MM-dd') + `T${schedule.close}:00`, { timeZone: venueTimeZone });

    while (isBefore(current, end)) {
      slots.push(new Date(current));
      current = addHours(current, 1);
    }

    return slots;
  }, [facility, selectedDay]);

  const checkAvailability = (courtId: string, start: Date, end: Date) => {
    const overlapping = bookings.find(b => {
      if (b.court_id !== courtId || b.status === 'CANCELLED') return false;
      const bStart = new Date(b.start_time);
      const bEnd = new Date(b.end_time);
      return isBefore(start, bEnd) && isAfter(end, bStart);
    });
    return !overlapping;
  };

  const handleBooking = async () => {
    if (!user || !facility || !selectedSlot || !paymentFile) return;
    setIsBooking(true);

    try {
      // 1. Upload Payment Proof
      const fileExt = paymentFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `payments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('bookings')
        .upload(filePath, paymentFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('bookings')
        .getPublicUrl(filePath);

      // 2. Final Overlap Check
      const isAvailable = checkAvailability(selectedSlot.court.id, selectedSlot.start, selectedSlot.end);
      if (!isAvailable) {
        toast.error('Slot was just taken! Please select another time.');
        setIsBooking(false);
        return;
      }

      // 3. Create Booking
      const durationHours = differenceInMinutes(selectedSlot.end, selectedSlot.start) / 60;
      const amount = selectedSlot.court.hourly_rate * durationHours;
      const reference = `#APP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const { error: bookingError } = await supabase
        .from('bookings')
        .insert({
          court_id: selectedSlot.court.id,
          user_id: user.id,
          facility_id: facility.id,
          start_time: selectedSlot.start.toISOString(),
          end_time: selectedSlot.end.toISOString(),
          status: 'PENDING_PROOF',
          amount,
          total_price: amount,
          payment_proof_url: publicUrl,
          booking_reference: reference,
          payment_status: 'pending'
        });

      if (bookingError) throw bookingError;

      toast.success('Booking request submitted! Verification in progress.');
      setSelectedSlot(null);
      setPaymentFile(null);
      setPaymentPreview(null);
      
      // Refresh bookings
      const { data: updatedBookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('facility_id', facility.id);
      setBookings(updatedBookings || []);
      
    } catch (err: any) {
      toast.error('Booking failed: ' + err.message);
    } finally {
      setIsBooking(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPaymentFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPaymentPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const tabs = [
    { id: 'courts', label: 'Courts', icon: CalendarIcon },
    ...(facility?.show_public_schedule ? [{ id: 'schedule', label: 'Visual Scheduler', icon: Activity }] : []),
    { id: 'info', label: 'Info & Rules', icon: Info },
    { id: 'location', label: 'Location', icon: MapPin },
  ];

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 py-8 mt-12 space-y-12 bg-transparent relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-lime/10 via-transparent to-transparent opacity-30" />
        <div className="absolute -top-1/4 -right-1/4 w-[60%] h-[60%] bg-lime/10 rounded-full blur-[140px] animate-pulse" />
      </div>
      <Helmet>
        <title>{facility.name} | Book {facility.sport || facility.type} in {facility.city}</title>
        <meta name="description" content={facility.description || `Reserve your slot at ${facility.name}. Best rates for ${facility.type} in ${facility.city}.`} />
        
        {/* OpenGraph */}
        <meta property="og:title" content={`${facility.name} | Reserve Now`} />
        <meta property="og:description" content={facility.description || `Book ${facility.name} in ${facility.city}.`} />
        <meta property="og:image" content={facility.images?.[0] || facility.cover_image} />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:type" content="website" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={facility.name} />
        <meta name="twitter:description" content={facility.description} />
        <meta name="twitter:image" content={facility.images?.[0] || facility.cover_image} />
      </Helmet>
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
      {/* Venue Header */}
      <header className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-6">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">Back to Search</span>
            </button>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-lime/10 text-lime text-[10px] font-black uppercase tracking-widest rounded-full border border-lime/20">
                  {facility.type}
                </span>
              </div>
              <h1 className="text-5xl md:text-7xl font-display font-black uppercase italic tracking-tighter text-white">
                {facility.name}
              </h1>
              <div className="flex items-center gap-2 text-slate-400">
                <MapPin size={16} className="text-lime" />
                <span className="text-sm font-medium">
                  {facility.street_address ? `${facility.street_address}${facility.unit_number ? ` ${facility.unit_number}` : ''}, ${facility.city}` : facility.address}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <FavoriteButton facilityId={facility.id} size={24} className="!p-4 !rounded-3xl border border-white/5" />
            <button 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success('Venue link copied!');
              }}
              className="flex items-center gap-3 glass px-6 py-4 rounded-3xl border-white/5 hover:bg-white/10 transition-all text-white group"
            >
              <Share2 size={18} className="text-lime group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">Share Venue</span>
            </button>
          </div>
        </div>

        {/* Custom Navigation */}
        <div className="flex glass p-2 rounded-3xl border-white/5 overflow-x-auto scrollbar-hide flex-nowrap w-fit gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all relative flex-shrink-0 min-w-max ${
                activeTab === tab.id ? 'text-lime' : 'text-slate-500 hover:text-white/80'
              }`}
            >
              {activeTab === tab.id && (
                <motion.div layoutId="venueTab" className="absolute inset-0 bg-white/5 border border-white/10 rounded-2xl" />
              )}
              <tab.icon size={16} className="relative z-10" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'courts' && (
          <motion.div
            key="courts"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {courts.filter(c => c.is_active).map(court => (
              <div key={court.id} className="glass p-8 rounded-[40px] border-white/5 space-y-6 hover:border-lime/30 transition-all group">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-display font-black uppercase italic tracking-tight">{court.name}</h3>
                  <div className="w-12 h-12 bg-lime/10 rounded-2xl flex items-center justify-center text-lime group-hover:scale-110 transition-transform">
                    <Activity size={24} />
                  </div>
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-display font-black text-lime">${court.hourly_rate}</span>
                  <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1.5">/ hour</span>
                </div>
                <button 
                  onClick={() => navigate(`/facility/${facility.id}?court=${court.id}`)}
                  className="w-full bg-lime text-charcoal py-5 rounded-[24px] font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-lime/20"
                >
                  Book This Court
                </button>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'schedule' && (
          <motion.div
            key="schedule"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Day Selector */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar glass p-4 rounded-[32px] border-white/5">
              {next7Days.map((day) => {
                const isSelected = isSameDay(day, selectedDay);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    className={`flex-shrink-0 w-24 h-24 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border ${
                      isSelected 
                        ? 'bg-lime text-charcoal border-lime shadow-[0_0_20px_rgba(181,245,90,0.3)]' 
                        : 'bg-white/5 border-white/10 text-slate-500 hover:border-lime/40'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest">{format(day, 'EEE')}</span>
                    <span className="text-2xl font-display font-black tracking-tighter">{format(day, 'd')}</span>
                    <span className="text-[8px] font-bold uppercase tracking-widest opacity-60">{format(day, 'MMM')}</span>
                  </button>
                );
              })}
            </div>

            <div className="glass rounded-[48px] border-white/5 overflow-x-auto no-scrollbar relative shadow-2xl">
              <div className="min-w-[1000px]">
                {/* Header Row: Court Names */}
                <div className="flex border-b border-white/5 bg-white/[0.02]">
                  <div className="w-32 flex-shrink-0 p-8 border-r border-white/5 flex items-center justify-center">
                    <Clock size={20} className="text-slate-500" />
                  </div>
                  {courts.filter(c => c.is_active).map(court => (
                    <div key={court.id} className="flex-1 p-8 text-center border-r border-white/5 last:border-r-0">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Court</p>
                      <h4 className="text-xl font-display font-black uppercase italic tracking-tighter text-white">{court.name}</h4>
                    </div>
                  ))}
                </div>

                {/* Body Rows: Hours (Shared Logic) */}
                {timeSlots.map((slot) => {
                  const hourStr = format(slot, 'HH:00');
                  const slotEnd = addHours(slot, 1);
                  
                  return (
                    <div key={slot.toISOString()} className="flex border-b border-white/5 last:border-b-0 group hover:bg-white/[0.01] transition-colors">
                      <div className="w-32 flex-shrink-0 p-6 border-r border-white/5 flex items-center justify-center text-center">
                        <span className="text-lg font-display font-black italic text-white/20 group-hover:text-lime transition-colors leading-none">
                          {formatInTimeZone(slot, facility.timezone || 'UTC', 'h aa')}
                        </span>
                      </div>
                      {courts.filter(c => c.is_active).map(court => {
                        const isAvailable = checkAvailability(court.id, slot, slotEnd);

                        return (
                          <div key={court.id} className="flex-1 p-1 border-r border-white/5 last:border-r-0 relative">
                            {isAvailable ? (
                              <button
                                onClick={() => setSelectedSlot({ court, start: slot, end: slotEnd })}
                                className="w-full h-full min-h-[80px] rounded-3xl border border-dashed border-white/5 hover:border-lime/40 hover:bg-lime/5 transition-all flex items-center justify-center group/btn"
                              >
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/10 group-hover/btn:text-lime">Book Now</span>
                              </button>
                            ) : (
                              <div className="w-full h-full p-4 rounded-3xl bg-white/5 border border-white/5 flex flex-col items-center justify-center gap-1 opacity-40">
                                <span className="text-[8px] font-black uppercase tracking-widest">Reserved</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="glass p-8 rounded-[40px] border-white/5 flex flex-col md:flex-row items-center gap-6 justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500">
                  <Info size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Interactive Scheduler</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Showing slots in Venue Local Time ({facility.timezone || 'UTC'})</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border border-dashed border-white/20" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-white/5 border border-white/10" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Reserved</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'info' && (
          <motion.div
            key="info"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12"
          >
            <div className="glass p-12 rounded-[48px] border-white/5 space-y-10">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-lime">
                  <Info size={24} />
                  <h3 className="text-2xl font-display font-black uppercase italic tracking-tight">About {facility.name}</h3>
                </div>
                <p className="text-slate-400 leading-relaxed font-medium">
                  {facility.description || 'No description available for this venue.'}
                </p>
              </div>

              {facility.rules && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-lime">
                    <ShieldCheck size={24} />
                    <h3 className="text-2xl font-display font-black uppercase italic tracking-tight">Venue Rules</h3>
                  </div>
                  <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-6">
                    <p className="text-slate-300 whitespace-pre-wrap text-sm leading-relaxed font-medium italic border-b border-white/5 pb-6">
                      "{facility.rules}"
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                       <div className={`p-4 rounded-2xl flex items-center gap-3 ${facility.has_canteen ? 'bg-lime/10 text-lime' : 'bg-white/5 text-slate-500 opacity-50'}`}>
                          <Activity size={18} />
                          <span className="text-[10px] font-black uppercase tracking-widest">{facility.has_canteen ? 'Canteen On-Site' : 'No Canteen'}</span>
                       </div>
                       <div className={`p-4 rounded-2xl flex items-center gap-3 ${facility.allow_outside_food ? 'bg-lime/10 text-lime' : 'bg-red-500/10 text-red-500'}`}>
                          <ShieldCheck size={18} />
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest">{facility.allow_outside_food ? 'Outside Food Allowed' : 'No Outside Food'}</span>
                            {facility.allow_outside_food && facility.corkage_fee_amount && (
                              <span className="text-[8px] font-bold uppercase tracking-widest opacity-70">PHP {facility.corkage_fee_amount} Corkage Fee</span>
                            )}
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="glass p-10 rounded-[48px] border-white/5 space-y-6 bg-gradient-to-br from-lime/5 to-transparent">
                <div className="w-16 h-16 bg-lime rounded-2xl flex items-center justify-center text-charcoal shadow-[0_0_30px_rgba(181,245,90,0.3)]">
                  <ShieldCheck size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-display font-black uppercase italic tracking-tight">Verified Venue</h3>
                  <p className="text-slate-400 text-sm font-medium">
                    This venue is a verified partner. All bookings made through this link are secure and immediately transmitted to the venue management.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'location' && (
          <motion.div
            key="location"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="h-[600px] w-full"
          >
             <DiscoveryMap 
              facilities={[{
                ...facility,
                lat: facility.latitude,
                lng: facility.longitude,
                type: 'FACILITY'
              }]} 
              onSelectFacility={(f) => navigate(`/${f.country_code?.toLowerCase()}/${f.city?.toLowerCase()}/${f.slug}`)}
              forcedCenter={facility.latitude && facility.longitude ? { lat: facility.latitude, lng: facility.longitude } : null}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      <AnimatePresence>
        {selectedSlot && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isBooking && setSelectedSlot(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[48px] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-8 pb-0 flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-3xl font-display font-black uppercase italic tracking-tight">Checkout <span className="text-lime">Summary</span></h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Confirm your reservation details</p>
                </div>
                <button 
                  onClick={() => setSelectedSlot(null)}
                  disabled={isBooking}
                  className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-colors"
                >
                  <Activity size={20} className="rotate-45" />
                </button>
              </div>

              <div className="p-8 space-y-8">
                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="glass p-6 rounded-3xl border-white/5 space-y-4">
                    <div className="flex items-center gap-3 text-lime">
                      <CalendarIcon size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Schedule</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xl font-display font-black uppercase italic text-white">
                        {formatInTimeZone(selectedSlot.start, facility.timezone || 'UTC', 'EEEE, MMM d')}
                      </p>
                      <p className="text-sm font-bold text-slate-500">
                        {formatInTimeZone(selectedSlot.start, facility.timezone || 'UTC', 'h:mm aa')} - {formatInTimeZone(selectedSlot.end, facility.timezone || 'UTC', 'h:mm aa')}
                      </p>
                    </div>
                  </div>

                  <div className="glass p-6 rounded-3xl border-white/5 space-y-4">
                    <div className="flex items-center gap-3 text-lime">
                      <Activity size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Resource</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xl font-display font-black uppercase italic text-white">{selectedSlot.court.name}</p>
                      <p className="text-sm font-bold text-slate-500 uppercase">{selectedSlot.court.sport}</p>
                    </div>
                  </div>
                </div>

                {/* Pricing Summary */}
                <div className="glass p-8 rounded-[32px] border-white/5 bg-white/[0.02] space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Duration</span>
                    <span className="text-sm font-black text-white italic">{differenceInMinutes(selectedSlot.end, selectedSlot.start) / 60} HOURS</span>
                  </div>
                  <div className="flex items-center justify-between pt-6 border-t border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-lime">Total Investment</span>
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-display font-black text-white">
                        {facility.currency_code === 'PHP' ? '₱' : facility.currency_code === 'USD' ? '$' : facility.currency_code || '$'}
                        {((selectedSlot.court.hourly_rate * differenceInMinutes(selectedSlot.end, selectedSlot.start)) / 60).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Private Payment Step */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-lime text-charcoal rounded-full flex items-center justify-center text-[10px] font-black">3</div>
                    <h3 className="text-sm font-black uppercase tracking-widest">Payment Verification</h3>
                  </div>
                  
                  {!paymentPreview ? (
                    <label className="flex flex-col items-center justify-center w-full h-40 glass border-dashed border-white/10 rounded-3xl hover:border-lime/40 transition-all cursor-pointer group">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-10 h-10 text-white/20 group-hover:text-lime transition-all mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white">Upload GCash / Bank Receipt</p>
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={onFileChange} />
                    </label>
                  ) : (
                    <div className="relative h-48 rounded-3xl overflow-hidden glass border-white/10">
                      <img src={paymentPreview} className="w-full h-full object-cover opacity-50" alt="Payment Proof" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/40">
                        <div className="flex items-center gap-2 text-lime">
                          <CheckCircle2 size={24} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Receipt Attached</span>
                        </div>
                        <button 
                          onClick={() => { setPaymentFile(null); setPaymentPreview(null); }}
                          className="px-4 py-2 bg-white/10 hover:bg-red-500/20 text-red-400 rounded-full text-[8px] font-black uppercase tracking-widest transition-all"
                        >
                          Remove & Replace
                        </button>
                      </div>
                    </div>
                  )}
                  <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500 text-center italic">
                    All bookings are subject to manual verification by {facility.name} management.
                  </p>
                </div>

                <button
                  disabled={!paymentFile || isBooking}
                  onClick={handleBooking}
                  className="w-full h-20 bg-lime disabled:bg-white/5 disabled:text-white/20 text-charcoal rounded-[24px] font-black uppercase tracking-widest text-base hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4 shadow-2xl shadow-lime/20"
                >
                  {isBooking ? (
                    <>
                      <Loader2 size={24} className="animate-spin" />
                      <span>Transmitting...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={24} />
                      <span>Request Reservation</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <footer className="pt-20 pb-12 border-t border-white/5 text-center">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2 opacity-30 grayscale">
            <Activity className="text-lime" size={24} />
            <span className="text-xl font-display font-black tracking-tighter uppercase italic text-white leading-none pt-1">
              RE<span className="text-lime">SERVE</span>
            </span>
          </div>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">
            Powered by the RESERVE Marketplace
          </p>
        </div>
      </footer>
    </div>
  );
}
