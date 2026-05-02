import React, { useEffect, useState, useMemo } from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Building2, Database, Loader2 } from 'lucide-react';
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

type Tab = 'overview' | 'schedule' | 'earnings' | 'bookings' | 'live' | 'feedback' | 'settings';

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Custom Hooks for Data
  const { facilities, loading: facilitiesLoading } = useFacilities(user?.uid);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(searchParams.get('facilityId'));
  const { bookings, loading: bookingsLoading } = useBookings(selectedFacilityId);
  
  // Local State
  const [courts, setCourts] = useState<Court[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'overview');

  // Sync tab with URL search params
  useEffect(() => {
    const tabParam = searchParams.get('tab') as Tab;
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

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
  const activeFac = useMemo(() => facilities.find(f => f.id === selectedFacilityId), [facilities, selectedFacilityId]);

  const [systemSettings, setSystemSettings] = useState<any>(null);

  // Sync selectedFacilityId with facilities list if not set
  useEffect(() => {
    if (!selectedFacilityId && facilities.length > 0) {
      setSelectedFacilityId(facilities[0].id);
    }
  }, [facilities, selectedFacilityId]);

  // Fetch System Settings
  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'system_settings', 'global'), (snap) => {
      if (snap.exists()) {
        setSystemSettings(snap.data());
      }
    });
    return () => unsubSettings();
  }, []);

  // Real-time Subscriptions for Courts & Reviews
  useEffect(() => {
    if (!selectedFacilityId) return;

    const unsubCourts = onSnapshot(collection(db, 'facilities', selectedFacilityId, 'courts'), (snap) => {
      setCourts(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Court[]);
    });

    const reviewsQ = query(collection(db, 'reviews'), where('facilityId', '==', selectedFacilityId));
    const unsubReviews = onSnapshot(reviewsQ, (snap) => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Review[]);
    });

    return () => {
      unsubCourts();
      unsubReviews();
    };
  }, [selectedFacilityId]);

  const checkOverlap = async (courtId: string, start: Date, end: Date) => {
    const q = query(
      collection(db, 'bookings'),
      where('courtId', '==', courtId),
      where('status', 'in', ['CONFIRMED', 'manual_block', 'MAINTENANCE', 'PENDING'])
    );
    const snap = await getDocs(q);
    return snap.docs.some(doc => {
      const bData = doc.data();
      const bStart = bData.startTime.toDate();
      const bEnd = bData.endTime.toDate();
      return (start < bEnd && end > bStart);
    });
  };

  const handleManualBooking = async () => {
    if (!selectedFacilityId || !manualBooking.courtId) return;

    // Security check for verified email/identity
    const isVerified = user?.emailVerified || profile?.email_confirmed_at;
    if (!isVerified) {
      toast.error('VERIFICATION REQUIRED', {
        description: 'Please verify your email to log manual entries.'
      });
      return;
    }

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
      
      await addDoc(collection(db, 'bookings'), {
        facilityId: selectedFacilityId,
        facilityName: activeFac?.name || 'Unknown',
        courtId: manualBooking.courtId,
        courtName: courts.find(c => c.id === manualBooking.courtId)?.name || 'Unknown Court',
        userId: user?.uid,
        userName: (manualBooking.guestName || 'OWNER BLOCK').toUpperCase(),
        startTime: start,
        endTime: end,
        status: 'CONFIRMED',
        source: 'manual',
        bookingReference: bookingRef,
        createdAt: serverTimestamp(),
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
    if (!selectedFacilityId) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'facilities', selectedFacilityId), updates);
      toast.success('Settings updated.');
    } catch (err) {
      toast.error('Failed to update facility.');
    } finally {
      setIsUpdating(false);
    }
  };

  const onApproveDecline = async (id: string, status: string, msg: string) => {
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'bookings', id), { status });
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
      await seedDemoData(user.email || '', user.uid);
      toast.success('Sample data generated!');
    } catch (error) {
      toast.error('Generation failed.');
    } finally {
      setIsSeeding(false);
    }
  };

  if (facilitiesLoading) return <DashboardSkeleton />;

  if (facilities.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 text-center glass border-white/5 rounded-[48px] m-8">
        <Building2 className="text-lime mb-6 font-bold" size={64} />
        <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter mb-2 text-white">No facilities <span className="text-white/40">managed</span></h2>
        <div className="flex gap-4 mt-8">
          <button onClick={() => navigate('/onboarding')} className="bg-lime text-charcoal px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center">Register Facility</button>
          <button onClick={handleSeedData} disabled={isSeeding} className="glass px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2">
            {isSeeding ? <Loader2 className="animate-spin" /> : <Database size={16} />} Seed Sample Data
          </button>
        </div>
      </div>
    );
  }

  const filteredTabs = [
    { id: 'overview', label: 'OVERVIEW' },
    { id: 'schedule', label: 'MASTER SCHEDULE' },
    { id: 'earnings', label: 'EARNINGS' },
    { id: 'bookings', label: 'BOOKINGS' },
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
    <div className="max-w-[1440px] mx-auto px-0 sm:px-8 md:px-12 pt-12 py-12 space-y-20 pb-40">
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
            <div className="w-full lg:w-[400px]">
              <Selector
                options={facilities.map(f => ({ id: f.id, label: f.name, icon: Building2 }))}
                selectedId={selectedFacilityId || ''}
                onSelect={(id) => setSelectedFacilityId(id)}
                label="Active Facility"
              />
            </div>
          </div>

          {/* Desktop Search or Actions could go here */}
        </div>
        
        {/* Hub Navigation Matrix */}
        <div className="w-full pt-4">
          {/* Mobile/Tablet Dropdown Selector (< 1024px) */}
          <div className="block lg:hidden">
            <Selector
              options={filteredTabs.map(t => ({ id: t.id, label: t.label }))}
              selectedId={activeTab}
              onSelect={(id) => setActiveTab(id as Tab)}
              label="Hub Navigation"
            />
          </div>

          {/* Desktop Horizontal Pill Navigation (>= 1024px) */}
          <div className="hidden lg:flex glass p-2 rounded-[32px] border-white/5 gap-1 overflow-x-auto no-scrollbar scroll-smooth">
            {filteredTabs.map(tab => (
              <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as Tab)}
                 className={`px-8 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex-shrink-0 min-w-fit h-auto relative group ${
                   activeTab === tab.id 
                    ? 'bg-lime text-charcoal shadow-[0_15px_35px_rgba(204,255,0,0.25)]' 
                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                 }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <OverviewTab 
                selectedFacilityId={selectedFacilityId}
                courts={courts}
                bookings={bookings}
                reviews={reviews}
                loading={bookingsLoading}
                isUpdating={isUpdating}
                onManualEntry={() => setIsManualBooking(true)}
                onAddCourt={() => {}} 
                onEditCourt={() => {}}
                onDeleteCourt={() => {}}
                onViewSchedule={(court) => { setSelectedCourtForSchedule(court.id); setActiveTab('schedule'); }}
                onApproveBooking={(id) => onApproveDecline(id, 'CONFIRMED', 'Verified')}
                onDeclineBooking={(id) => onApproveDecline(id, 'CANCELLED', 'Declined')}
                onLockdown={() => {}} 
                onCopyLink={() => {}}
                onShare={() => {}}
                onShowQR={() => setShowQrModal(true)}
              />
            )}
            {activeTab === 'schedule' && (
              <ScheduleTab 
                courts={courts}
                bookings={bookings}
                selectedCourtId={selectedCourtForSchedule}
                onSelectCourt={setSelectedCourtForSchedule}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                onBlockSlot={(courtId, time) => {
                  setManualBooking(prev => ({ ...prev, courtId, startTime: time }));
                  setIsManualBooking(true);
                }}
                onViewBooking={(booking) => toast.info(booking.userName)}
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
            {activeTab === 'earnings' && <EarningsTab bookings={bookings} loading={bookingsLoading} />}
            {activeTab === 'live' && <LiveFeedTab selectedFacilityId={selectedFacilityId} />}
            {activeTab === 'feedback' && <FeedbackTab reviews={reviews} loading={false} onReply={() => {}} />}
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
                 placeholder="NAME or REASON" 
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
  );
}
