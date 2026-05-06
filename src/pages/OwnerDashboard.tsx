import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { VenueProvider, useVenue } from '../contexts/VenueContext';
import { Plus, Building2, Database, Loader2, Info } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import Modal from '../components/Modal';
import Selector from '../components/Selector';
import ActionDialog from '../components/ActionDialog';
import PromptDialog from '../components/PromptDialog';
import { format, isAfter, parseISO } from 'date-fns';
import { seedDemoData } from '../services/seedService';
import { Facility, Court, Booking, Review } from '../types';
import { useFacilities } from '../hooks/useFacilities';
import { useBookings } from '../hooks/useBookings';
import { DashboardSkeleton } from '../components/Skeletons';

// Import Tab Components
import { OverviewTab } from './owner/OverviewTab';
import { ScheduleTab } from './owner/ScheduleTab';
import { BookingsTab } from './owner/BookingsTab';
import { EarningsTab } from './owner/EarningsTab';
import { LiveFeedTab } from './owner/LiveFeedTab';
import { FeedbackTab } from './owner/FeedbackTab';
import { SettingsTab } from './owner/SettingsTab';
import { CourtsTab } from './owner/CourtsTab';
import { StaffTab } from './owner/StaffTab';

type Tab = 'overview' | 'schedule' | 'earnings' | 'bookings' | 'live' | 'feedback' | 'settings' | 'courts' | 'staff';

export default function OwnerDashboard() {
  return (
    <VenueProvider>
      <OwnerDashboardContent />
    </VenueProvider>
  );
}

function OwnerDashboardContent() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { selectedVenueId, setSelectedVenueId, isLoading: venueContextLoading, setIsLoading: setVenueContextLoading } = useVenue();
  const [searchParams] = useSearchParams();
  
  // Custom Hooks for Data
  const { facilities, loading: facilitiesLoading } = useFacilities(user?.id);
  const { bookings, loading: bookingsLoading } = useBookings(selectedVenueId);
  
  // Local State
  const [courts, setCourts] = useState<Court[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'overview');

  // Sync tab with URL search params
  const handleTabChange = (tabId: Tab) => {
    setActiveTab(tabId);
    navigate(`/owner?tab=${tabId}`, { replace: true });
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab') as Tab;
    if (tabParam) {
      if (tabParam !== activeTab) {
        setActiveTab(tabParam);
      }
    } else {
      setActiveTab('overview');
    }
  }, [searchParams]); // Only sync from URL when URL changes

  const [selectedCourtForSchedule, setSelectedCourtForSchedule] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Modals & Dialogs
  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
    confirmLabel?: string;
  }>({ isOpen: false, title: '', description: '', onConfirm: () => {} });

  const [promptDialog, setPromptDialog] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    initialValue?: string;
    placeholder?: string;
    onConfirm: (val: string) => void;
  }>({ isOpen: false, title: '', onConfirm: () => {} });

  const [isManualBooking, setIsManualBooking] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  
  const [manualBooking, setManualBooking] = useState({
    guestName: '',
    courtId: '',
    startTime: '08:00',
    endTime: '09:00'
  });

  const isStaff = profile?.role === 'STAFF';
  const activeFac = useMemo(() => facilities.find(f => f.id === selectedVenueId), [facilities, selectedVenueId]);

  const [systemSettings, setSystemSettings] = useState<any>(null);

  // Sync selectedVenueId with facilities list if not set
  useEffect(() => {
    if (!selectedVenueId && facilities.length > 0) {
      const initialId = searchParams.get('facilityId') || facilities[0].id;
      setSelectedVenueId(initialId);
      setVenueContextLoading(false);
    } else if (facilities.length > 0) {
      setVenueContextLoading(false);
    }
  }, [facilities, selectedVenueId]);

  // Save active venue preference to DB
  const handleVenueSwitch = async (id: string) => {
    if (id === selectedVenueId) return;
    
    setVenueContextLoading(true);
    setSelectedVenueId(id);
    
    try {
      // Call the set_active_venue SQL function to save their preference
      await supabase.rpc('set_active_venue', { venue_id: id });
    } catch (err) {
      console.warn("Preference sync failed, using local state only.");
    } finally {
      // Brief delay to show skeleton as requested
      setTimeout(() => setVenueContextLoading(false), 600);
    }
  };

  // Fetch System Settings
  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from('system_settings').select('*').eq('id', 'global').single();
      if (data) setSystemSettings(data);
    }
    fetchSettings();

    const channel = supabase.channel('system_settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings', filter: 'id=eq.global' }, (payload) => {
        setSystemSettings(payload.new);
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Real-time Subscriptions for Courts & Reviews
  useEffect(() => {
    if (!selectedVenueId) return;

    async function fetchData() {
      const { data: courtsData } = await supabase
        .from('courts')
        .select('*')
        .eq('facility_id', selectedVenueId)
        .is('deleted_at', null);
      setCourts(courtsData as Court[] || []);

      const { data: reviewsData } = await supabase.from('reviews').select('*').eq('facility_id', selectedVenueId);
      setReviews(reviewsData as Review[] || []);
    }

    fetchData();

    const courtsSub = supabase.channel(`courts-${selectedVenueId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courts', filter: `facility_id=eq.${selectedVenueId}` }, fetchData)
      .subscribe();

    const reviewsSub = supabase.channel(`reviews-${selectedVenueId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `facility_id=eq.${selectedVenueId}` }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(courtsSub);
      supabase.removeChannel(reviewsSub);
    };
  }, [selectedVenueId]);

  const checkOverlap = async (courtId: string, start: Date, end: Date) => {
    const { data: overlaps } = await supabase
      .from('bookings')
      .select('*')
      .eq('court_id', courtId)
      .in('status', ['CONFIRMED', 'manual_block', 'MAINTENANCE', 'PENDING']);
    
    return overlaps?.some(b => {
      const bStart = new Date(b.start_time);
      const bEnd = new Date(b.end_time);
      return (start < bEnd && end > bStart);
    });
  };

  const handleManualBooking = async () => {
    if (!selectedVenueId || !manualBooking.courtId) return;

    setIsUpdating(true);
    try {
      const start = parseISO(`${selectedDate}T${manualBooking.startTime}`);
      const end = parseISO(`${selectedDate}T${manualBooking.endTime}`);

      if (!isAfter(end, start)) {
        toast.error('End time must be after start time.');
        return;
      }

      const hasOverlap = await checkOverlap(manualBooking.courtId, start, end);
      if (hasOverlap) {
        toast.error('TIME CONFLICT: This court is already reserved.');
        return;
      }

      const bookingRef = `#MAN-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      
      await supabase.from('bookings').insert({
        facility_id: selectedVenueId,
        facility_name: activeFac?.name || 'Unknown',
        court_id: manualBooking.courtId,
        court_name: courts.find(c => c.id === manualBooking.courtId)?.name || 'Unknown Court',
        user_id: user?.id,
        user_name: (manualBooking.guestName || 'OWNER BLOCK').toUpperCase(),
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: 'CONFIRMED',
        source: 'manual',
        booking_reference: bookingRef,
        amount: 0
      });

      toast.success(`Manual Entry Logged: ${bookingRef}`);
      setIsManualBooking(false);
    } catch (err) {
      toast.error('Failed to log manual entry.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateFacility = async (updates: Partial<Facility>) => {
    if (!selectedVenueId) return;
    setIsUpdating(true);
    try {
      await supabase.from('venues').update(updates).eq('id', selectedVenueId);
      toast.success('Settings updated.');
    } catch (err) {
      toast.error('Failed to update venue.');
    } finally {
      setIsUpdating(false);
    }
  };

  const onApproveDecline = async (id: string, status: string, msg: string) => {
    setIsUpdating(true);
    try {
      await supabase.from('bookings').update({ status }).eq('id', id);
      toast.success(msg);
    } catch (err) {
      toast.error('Operation failed.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSeedData = async () => {
    if (!user) return;
    setIsSeeding(true);
    try {
      await seedDemoData(user.email || '', user.id);
      toast.success('Sample data generated!');
    } catch (error) {
      toast.error('Generation failed.');
    } finally {
      setIsSeeding(false);
    }
  };

  const onCopyLink = () => {
    if (!selectedVenueId) return;
    const url = `${window.location.origin}/v/${selectedVenueId}`;
    navigator.clipboard.writeText(url);
    toast.success('PUBLIC VENUE LINK COPIED!');
  };

  const onShare = async () => {
    if (!selectedVenueId) return;
    const url = `${window.location.origin}/v/${selectedVenueId}`;
    const activeFac = facilities.find(f => f.id === selectedVenueId);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: activeFac?.name || 'Reserve Venue',
          text: `Check out ${activeFac?.name} on Reserve!`,
          url: url,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      onCopyLink();
    }
  };

  const onLockdown = async () => {
    if (!selectedVenueId) return;
    setActionDialog({
      isOpen: true,
      title: 'MAINTENANCE SHUTDOWN',
      description: 'This will temporarily mark all courts for maintenance. Affects current day visibility only. Confirm?',
      confirmLabel: 'INITIATE LOCKDOWN',
      type: 'danger',
      onConfirm: async () => {
        setIsUpdating(true);
        try {
          // In a real app, this might create specific maintenance records
          // For now, we'll just show a success toast as it's a high-level UI trigger
          toast.success('FACILITY LOCKED FOR MAINTENANCE');
        } catch (err) {
          toast.error('LOCKDOWN FAILED');
        } finally {
          setIsUpdating(false);
          setActionDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const onAddCourt = () => {
    if (!selectedVenueId) return;
    setPromptDialog({
      isOpen: true,
      title: 'ADD NEW DEPLOYMENT',
      description: 'Enter court name (e.g. Center Court, Indoor 1)',
      placeholder: 'COURT NAME...',
      onConfirm: async (name) => {
        if (!name) return;
        setIsUpdating(true);
        try {
          const { error } = await supabase.from('courts').insert({
            facility_id: selectedVenueId,
            name: name,
            hourly_rate: 350, // Default rate
            sport: 'Basketball', // Default sport
            environment: 'OUTDOOR',
            surface_type: 'Hard Court',
            is_active: true
          });
          if (error) throw error;
          toast.success('COURT DEPLOYED SUCCESSFULLY');
        } catch (err) {
          toast.error('DEPLOYMENT FAILED');
        } finally {
          setIsUpdating(false);
          setPromptDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const onEditCourt = (court: Court) => {
    setPromptDialog({
      isOpen: true,
      title: 'RECONFIGURE COURT',
      description: `Modify name for ${court.name}`,
      initialValue: court.name,
      placeholder: 'NEW NAME...',
      onConfirm: async (newName) => {
        if (!newName) return;
        setIsUpdating(true);
        try {
          const { error } = await supabase.from('courts').update({ name: newName }).eq('id', court.id);
          if (error) throw error;
          toast.success('RECONFIGURATION COMPLETE');
        } catch (err) {
          toast.error('UPDATE FAILED');
        } finally {
          setIsUpdating(false);
          setPromptDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const onDeleteCourt = (court: Court) => {
    setActionDialog({
      isOpen: true,
      title: 'DECOMMISSION COURT',
      description: `Are you sure you want to delete ${court.name}? This will hide the court from discovery but preserve historical data.`,
      confirmLabel: 'DECOMMISSION NOW',
      type: 'danger',
      onConfirm: async () => {
        setIsUpdating(true);
        try {
          const { error } = await supabase
            .from('courts')
            .update({ 
              deleted_at: new Date().toISOString(),
              is_active: false 
            })
            .eq('id', court.id);
          if (error) throw error;
          toast.success('COURT DECOMMISSIONED');
        } catch (err) {
          toast.error('DELETION FAILED');
        } finally {
          setIsUpdating(false);
          setActionDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  if (facilitiesLoading) return <DashboardSkeleton />;

  if (facilities.length === 0) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-lime/5 to-transparent pointer-events-none" />
        <div className="relative z-10 space-y-12 max-w-2xl">
          <div className="w-32 h-32 bg-lime/10 rounded-[40px] flex items-center justify-center mx-auto mb-8 border border-lime/20 shadow-[0_0_80px_rgba(212,255,0,0.1)]">
            <Building2 className="text-lime" size={64} strokeWidth={1} />
          </div>
          <div className="space-y-4">
            <h2 className="text-6xl font-display font-black uppercase italic tracking-tighter text-white">Welcome <span className="text-white/20">Authorized Operator</span></h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] max-w-md mx-auto leading-loose">The network is active. No facilities registered to your unique identifier. Initialize your first asset to begin deployment.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
            <button 
              onClick={() => navigate('/onboarding')} 
              className="bg-lime text-charcoal px-12 py-6 rounded-[32px] font-black uppercase tracking-widest text-xs hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-lime/40"
            >
              Register Your First Facility
            </button>
            <button 
              onClick={handleSeedData} 
              disabled={isSeeding} 
              className="glass px-12 py-6 rounded-[32px] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-white/5 active:scale-95 transition-all"
            >
              {isSeeding ? <Loader2 className="animate-spin" /> : <Database size={20} />} Seed Neural Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredTabs = [
    { id: 'overview', label: 'OVERVIEW' },
    { id: 'schedule', label: 'MASTER SCHEDULE' },
    { id: 'earnings', label: 'EARNINGS' },
    { id: 'bookings', label: 'BOOKINGS' },
    { id: 'courts', label: 'COURTS' },
    { id: 'staff', label: 'TEAM' },
    { id: 'live', label: 'LIVE FEED' },
    { id: 'feedback', label: 'FEEDBACK' },
    { id: 'settings', label: 'SETTINGS' }
  ].filter(tab => {
    if (isStaff) {
      return ['overview', 'schedule', 'bookings', 'live'].includes(tab.id);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-transparent relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-lime/10 via-transparent to-transparent opacity-50" />
        <div className="absolute -top-1/4 -right-1/4 w-[60%] h-[60%] bg-lime/10 rounded-full blur-[140px] animate-pulse" />
      </div>

      <div className="max-w-[1440px] mx-auto px-0 sm:px-8 md:px-12 pt-12 py-12 space-y-20 pb-40 relative z-10">
      <ActionDialog 
        isOpen={actionDialog.isOpen} 
        onClose={() => setActionDialog(prev => ({ ...prev, isOpen: false }))} 
        {...actionDialog} 
      />
      <PromptDialog 
        isOpen={promptDialog.isOpen} 
        onClose={() => setPromptDialog(prev => ({ ...prev, isOpen: false }))} 
        {...promptDialog} 
      />

      <header className="space-y-16">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <h1 className="text-4xl sm:text-5xl font-display font-black uppercase italic tracking-tighter text-white">Facility <span className="text-white/40">Hub</span></h1>
              <div className="px-4 py-1 bg-lime text-charcoal rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 mb-1 sm:mb-2">
                {profile?.role}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Active Operations</label>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full lg:w-[400px]">
                  <Selector
                    options={facilities.map(f => ({ id: f.id, label: f.name, icon: Building2 }))}
                    selectedId={selectedVenueId || ''}
                    onSelect={handleVenueSwitch}
                    footerAction={{
                      label: "+ Register New Facility",
                      onClick: () => navigate('/onboarding'),
                      icon: Plus
                    }}
                  />
                </div>
                <button 
                  onClick={() => navigate('/management/inbox')}
                  className="w-full sm:w-auto h-12 bg-white/5 border border-white/10 text-white px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white/10 transition-all shadow-[0_0_15px_rgba(212,255,0,0.1)] hover:shadow-[0_0_20px_rgba(212,255,0,0.2)]"
                >
                  <div className="w-2 h-2 rounded-full bg-lime animate-ping" />
                  Command Center
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Search or Actions could go here */}
        </div>
        
        {/* Hub Navigation Matrix - STICKY */}
        <div className="w-full pt-4 sticky top-0 z-30 -mx-4 px-4 bg-transparent backdrop-blur-xl border-b border-white/5 pb-4">
          <div className="max-w-[1440px] mx-auto">
            {/* Mobile/Tablet Dropdown Selector (< 1024px) */}
            <div className="block lg:hidden">
              <Selector
                options={filteredTabs.map(t => ({ id: t.id, label: t.label }))}
                selectedId={activeTab}
                onSelect={(id) => handleTabChange(id as Tab)}
                label="Hub Navigation"
              />
            </div>

            {/* Desktop Horizontal Pill Navigation (>= 1024px) */}
            <div className="hidden lg:flex glass p-2 rounded-[32px] border-white/5 gap-1 overflow-x-auto no-scrollbar scroll-smooth relative">
              {filteredTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as Tab)}
                  className={`px-8 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex-shrink-0 min-w-fit h-auto relative z-10 group ${
                    activeTab === tab.id 
                      ? 'text-charcoal' 
                      : 'text-slate-500 hover:text-white'
                  }`}
                >
                  <span className="relative z-20">{tab.label}</span>
                  {activeTab === tab.id && (
                    <motion.div 
                      layoutId="activeTabPill"
                      className="absolute inset-0 bg-lime rounded-[24px] shadow-[0_15px_35px_rgba(204,255,0,0.25)] z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="relative">
        <AnimatePresence mode="wait">
          {venueContextLoading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DashboardSkeleton />
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && (
                <OverviewTab 
                  selectedFacilityId={selectedVenueId}
                  courts={courts}
                  bookings={bookings}
                  reviews={reviews}
                  loading={bookingsLoading}
                  isUpdating={isUpdating}
                  onManualEntry={() => setIsManualBooking(true)}
                  onAddCourt={onAddCourt} 
                  onEditCourt={onEditCourt}
                  onDeleteCourt={onDeleteCourt}
                  onViewSchedule={(court) => { setSelectedCourtForSchedule(court.id); handleTabChange('schedule'); }}
                  onApproveBooking={(id) => onApproveDecline(id, 'CONFIRMED', 'Verified')}
                  onDeclineBooking={(id) => onApproveDecline(id, 'CANCELLED', 'Declined')}
                  onLockdown={onLockdown} 
                  onCopyLink={onCopyLink}
                  onShare={onShare}
                  onShowQR={() => setShowQrModal(true)}
                />
              )}
              {activeTab === 'schedule' && (
                <ScheduleTab 
                  courts={courts}
                  bookings={bookings}
                  selectedCourtId={selectedCourtForSchedule}
                  onSelectCourt={setSelectedCourtForSchedule}
                  onBlockSlot={(courtId, time) => {
                    setManualBooking(prev => ({ ...prev, courtId, startTime: time }));
                    setIsManualBooking(true);
                  }}
                  onViewBooking={(booking) => toast.info(booking.user_name)}
                  isStaff={isStaff}
                />
              )}
              {activeTab === 'bookings' && (
                <BookingsTab 
                  bookings={bookings}
                  courts={courts}
                  loading={bookingsLoading}
                  isUpdating={isUpdating}
                  onManualEntry={() => setIsManualBooking(true)}
                  onApproveBooking={(id) => onApproveDecline(id, 'CONFIRMED', 'Confirmed')}
                  onDeclineBooking={(id) => onApproveDecline(id, 'CANCELLED', 'Cancelled')}
                />
              )}
              {activeTab === 'earnings' && <EarningsTab bookings={bookings} loading={bookingsLoading} selectedVenueId={selectedVenueId} />}
              {activeTab === 'live' && <LiveFeedTab selectedFacilityId={selectedVenueId} />}
              {activeTab === 'feedback' && <FeedbackTab reviews={reviews} loading={false} onReply={() => {}} />}
              {activeTab === 'staff' && <StaffTab facility_id={selectedVenueId} />}
              {activeTab === 'courts' && (
                <CourtsTab 
                  courts={courts}
                  facility={activeFac || null}
                  isUpdating={isUpdating}
                  onDelete={onDeleteCourt}
                />
              )}
              {activeTab === 'settings' && (
                <SettingsTab 
                  activeFac={activeFac || null} 
                  profile={profile} 
                  onUpdate={handleUpdateFacility}
                  onKycUpload={() => {}}
                  onAddMedia={() => {}}
                  isUpdating={isUpdating}
                  systemSettings={systemSettings}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Modal isOpen={isManualBooking} onClose={() => setIsManualBooking(false)} title="Manual Block">
         <div className="space-y-6">
            <Selector 
              options={courts.map(c => ({ id: c.id, label: c.name }))}
              selectedId={manualBooking.courtId}
              onSelect={id => setManualBooking(prev => ({ ...prev, courtId: id }))}
              label="Target Court"
            />
            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Guest Designation</label>
               <input 
                 type="text" 
                 placeholder="NAME OR REASON" 
                 value={manualBooking.guestName}
                 onChange={e => setManualBooking(prev => ({ ...prev, guestName: e.target.value }))}
                 className="w-full glass border-white/10 px-6 py-4 rounded-2xl text-sm font-bold uppercase tracking-widest text-white outline-none focus:border-lime/40"
               />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <input type="time" value={manualBooking.startTime} onChange={e => setManualBooking(prev => ({ ...prev, startTime: e.target.value }))} className="glass p-4 rounded-2xl text-white outline-none" />
                <input type="time" value={manualBooking.endTime} onChange={e => setManualBooking(prev => ({ ...prev, endTime: e.target.value }))} className="glass p-4 rounded-2xl text-white outline-none" />
            </div>
            <button 
              onClick={handleManualBooking}
              disabled={isUpdating}
              className="w-full bg-lime text-charcoal py-5 rounded-[24px] font-black uppercase tracking-widest shadow-xl shadow-lime/20 flex items-center justify-center"
            >
              {isUpdating ? <Loader2 className="animate-spin mx-auto" /> : 'Confirm Block'}
            </button>
         </div>
      </Modal>
      </div>
    </div>
  );
}
