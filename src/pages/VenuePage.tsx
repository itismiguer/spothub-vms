import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot, serverTimestamp, addDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { startOfDay } from 'date-fns';
import { MapPin, Info, Calendar as CalendarIcon, ShieldCheck, Activity, Search, Share2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import DiscoveryMap from '../components/DiscoveryMap';

interface Facility {
  id: string;
  name: string;
  type: string;
  description: string;
  address: string;
  images: string[];
  ownerId: string;
  lat?: number;
  lng?: number;
  rules?: string;
  showPublicSchedule?: boolean;
}

interface Court {
  id: string;
  name: string;
  hourlyRate: number;
}

interface Booking {
  id: string;
  startTime: any;
  endTime: any;
  courtId: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'MAINTENANCE' | 'PENDING' | 'manual_block';
}

export default function VenuePage() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [facility, setFacility] = useState<Facility | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'courts' | 'info' | 'location'>('courts');

  useEffect(() => {
    async function fetchVenueData() {
      if (!id) return;
      try {
        const facilitySnap = await getDoc(doc(db, 'facilities', id));
        if (facilitySnap.exists()) {
          const data = facilitySnap.data() as any;
          
          // Redirect if deactivated and not the owner
          if (data.status === 'DEACTIVATED' && (!user || user.uid !== data.ownerId)) {
            toast.error('Facility Offline', {
              description: 'The management has temporarily taken this facility offline.'
            });
            navigate('/');
            return;
          }
          
          setFacility({ id: facilitySnap.id, ...data } as Facility);
          
          // Apply branding if exists
          if (data.brandColor) {
            document.documentElement.style.setProperty('--brand', data.brandColor);
          }
        } else {
          toast.error('Venue not found');
          navigate('/');
          return;
        }

        const unsubCourts = onSnapshot(collection(db, 'facilities', id, 'courts'), (snap) => {
          setCourts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Court[]);
        });

        const bookingsQ = query(collection(db, 'bookings'), where('facilityId', '==', id));
        const unsubBookings = onSnapshot(bookingsQ, (snap) => {
          setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Booking[]);
        });

        return () => {
          unsubCourts();
          unsubBookings();
          document.documentElement.style.setProperty('--brand', '#B5F55A');
        };
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'facility');
      } finally {
        setLoading(false);
      }
    }

    fetchVenueData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal">
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

  const tabs = [
    { id: 'courts', label: 'Courts', icon: CalendarIcon },
    ...(facility?.showPublicSchedule ? [{ id: 'schedule', label: 'Master Schedule', icon: Activity }] : []),
    { id: 'info', label: 'Info & Rules', icon: Info },
    { id: 'location', label: 'Location', icon: MapPin },
  ];

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 py-8 mt-12 space-y-12">
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
                <span className="text-sm font-medium">{facility.address}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
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
            {courts.map(court => (
              <div key={court.id} className="glass p-8 rounded-[40px] border-white/5 space-y-6 hover:border-lime/30 transition-all group">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-display font-black uppercase italic tracking-tight">{court.name}</h3>
                  <div className="w-12 h-12 bg-lime/10 rounded-2xl flex items-center justify-center text-lime group-hover:scale-110 transition-transform">
                    <Activity size={24} />
                  </div>
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-display font-black text-lime">${court.hourlyRate}</span>
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
            <div className="glass rounded-[48px] border-white/5 overflow-x-auto no-scrollbar relative shadow-2xl">
              <div className="min-w-[1000px]">
                {/* Header Row: Court Names */}
                <div className="flex border-b border-white/5 bg-white/[0.02]">
                  <div className="w-32 flex-shrink-0 p-8 border-r border-white/5 flex items-center justify-center">
                    <CalendarIcon size={20} className="text-slate-500" />
                  </div>
                  {courts.map(court => (
                    <div key={court.id} className="flex-1 p-8 text-center border-r border-white/5 last:border-r-0">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Court</p>
                      <h4 className="text-xl font-display font-black uppercase italic tracking-tighter text-white">{court.name}</h4>
                    </div>
                  ))}
                </div>

                {/* Body Rows: Hours (Shared Logic) */}
                {[...Array(16)].map((_, i) => {
                  const hour = i + 6; 
                  const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                  const now = new Date();
                  const startSlot = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0);
                  const endSlot = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour + 1, 0, 0);

                  return (
                    <div key={hour} className="flex border-b border-white/5 last:border-b-0 group hover:bg-white/[0.01] transition-colors">
                      <div className="w-32 flex-shrink-0 p-6 border-r border-white/5 flex items-center justify-center text-center">
                        <span className="text-lg font-display font-black italic text-white/20 group-hover:text-lime transition-colors leading-none">
                          {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                        </span>
                      </div>
                      {courts.map(court => {
                        const booking = bookings.find(b => {
                          if (b.courtId !== court.id) return false;
                          const bStart = b.startTime.toDate ? b.startTime.toDate() : new Date(b.startTime);
                          const bEnd = b.endTime.toDate ? b.endTime.toDate() : new Date(b.endTime);
                          return (startSlot < bEnd && endSlot > bStart) && b.status !== 'CANCELLED';
                        });

                        return (
                          <div key={court.id} className="flex-1 p-1 border-r border-white/5 last:border-r-0 relative">
                            {booking ? (
                              <div className="w-full h-full p-4 rounded-3xl bg-white/5 border border-white/5 flex flex-col items-center justify-center gap-1 opacity-40">
                                <span className="text-[8px] font-black uppercase tracking-widest">Reserved</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => navigate(`/facility/${facility.id}?court=${court.id}&time=${timeStr}`)}
                                className="w-full h-full min-h-[80px] rounded-3xl border border-dashed border-white/5 hover:border-lime/40 hover:bg-lime/5 transition-all flex items-center justify-center group/btn"
                              >
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/10 group-hover/btn:text-lime">Book Now</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="glass p-8 rounded-[40px] border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500">
                <Info size={24} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 max-w-sm">
                The master schedule shows real-time availability for today. Click an empty slot to proceed to booking.
              </p>
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
                  <div className="bg-white/5 p-8 rounded-3xl border border-white/5">
                    <p className="text-slate-300 whitespace-pre-wrap text-sm leading-relaxed font-medium italic">
                      "{facility.rules}"
                    </p>
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
              facilities={[
                { 
                  id: facility.id, 
                  name: facility.name, 
                  lat: facility.lat || 9.3068, 
                  lng: facility.lng || 123.3039, 
                  type: facility.type 
                }
              ]} 
              onSelectFacility={(id) => navigate(`/facility/${id}`)}
              forcedCenter={facility.lat && facility.lng ? { lat: facility.lat, lng: facility.lng } : null}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Simplified Branding Footer */}
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
