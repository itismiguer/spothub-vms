import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, updateDoc, getDoc, addDoc, serverTimestamp, where, limit, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Shield, Users, Building2, TrendingUp, Search, MoreVertical, CheckCircle, XCircle, Database, Loader2, Star, Eye, EyeOff, MessageCircle, Settings, Plus, ShieldCheck, FileText, ChevronDown, Bell, Clock, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { seedDemoData } from '../services/seedService';
import { useAuth } from '../contexts/AuthContext';
import Selector from '../components/Selector';

interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: string;
  businessName?: string;
  businessAddress?: string;
  kycUrl?: string;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
}

interface Facility {
  id: string;
  name: string;
  type: string;
  ownerId: string;
  address?: string;
  createdAt?: any;
}

interface Review {
  id: string;
  facilityId: string;
  facilityName?: string;
  userName: string;
  rating: number;
  comment: string;
  hidden: boolean;
  createdAt: any;
  ownerReply?: { text: string; updatedAt: any };
}

interface SystemSettings {
  global_sms_enabled: boolean;
}

interface Booking {
  id: string;
  facilityId: string;
  courtName: string;
  userName: string;
  startTime: any;
  endTime: any;
  status: string;
  bookingReference: string;
}

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'facilities' | 'reviews' | 'verification' | 'settings' | 'bookings' | 'notifications'>('overview');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({ global_sms_enabled: true });
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Role Guard
  const isSuperAdmin = profile?.role === 'super_admin';

  const handleToggleGlobalSms = async () => {
    try {
      const newValue = !systemSettings.global_sms_enabled;
      await updateDoc(doc(db, 'system_settings', 'global'), { global_sms_enabled: newValue, updatedAt: serverTimestamp() });
      setSystemSettings({ ...systemSettings, global_sms_enabled: newValue });
      toast.success(`Global SMS ${newValue ? 'Enabled' : 'Disabled'}`, {
        icon: newValue ? '💬' : '🔇'
      });
    } catch (error) {
      toast.error('Failed to update system settings.');
    }
  };

  const handleToggleFacilityStatus = async (facId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'facilities', facId), { isActive: !currentStatus });
      setFacilities(prev => prev.map(f => f.id === facId ? { ...f, isActive: !currentStatus } : f));
      toast.success(`Facility ${!currentStatus ? 'Activated' : 'Locked Down'}`);
    } catch (error) {
      toast.error('Failed to update facility status.');
    }
  };

  const handleBookingManualStatus = async (bookingId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { status: newStatus, manualOverride: true, overridenBy: user?.uid });
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
      
      const targetBooking = bookings.find(b => b.id === bookingId);
      if (targetBooking && (targetBooking as any).userId) {
        await addDoc(collection(db, 'notifications'), {
          userId: (targetBooking as any).userId,
          title: `Booking ${newStatus}`,
          message: `Your reservation ${targetBooking.bookingReference} status has been updated to ${newStatus} by the Super Admin.`,
          type: newStatus === 'CONFIRMED' ? 'booking_confirmed' : 'booking_expired',
          read: false,
          createdAt: serverTimestamp(),
          relatedId: bookingId
        });
      }

      toast.success(`Booking status forced to ${newStatus}`);
    } catch (error) {
      toast.error('Override failed.');
    }
  };

  // Helper variables for verification
  const pendingVerificationUsers = users.filter(u => u.verificationStatus === 'pending');

  const handleVerifyUser = async (uid: string, status: 'verified' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'users', uid), { 
        verificationStatus: status,
        verifiedAt: serverTimestamp()
      });

      // Also update all facilities owned by this user to reflect verification
      const fSnap = await getDocs(query(collection(db, 'facilities'), where('ownerId', '==', uid)));
      const facilityPromises = fSnap.docs.map(d => updateDoc(d.ref, { 
        isVerified: status === 'verified' ? true : false,
        verificationStatus: status 
      }));
      await Promise.all(facilityPromises);

      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, verificationStatus: status } : u));
      toast.success(`User verification: ${status.toUpperCase()}`);
    } catch (error) {
      console.error("Verification update error:", error);
      toast.error('Failed to update verification status.');
    }
  };

  // Facility Registration Form State
  const [newFac, setNewFac] = useState({ name: '', type: 'Pickleball', ownerId: '', address: '', lat: 9.3068, lng: 123.3039 });

  const fetchData = async () => {
    setLoading(true);
    try {
      const uSnap = await getDocs(collection(db, 'users'));
      setUsers(uSnap.docs.map(d => d.data()) as UserProfile[]);

      const fSnap = await getDocs(collection(db, 'facilities'));
      const facilitiesData = fSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      setFacilities(facilitiesData);

      const rSnap = await getDocs(collection(db, 'reviews'));
      const reviewsData = rSnap.docs.map(d => {
        const data = d.data();
        const facility = facilitiesData.find(f => f.id === data.facilityId);
        return { 
          id: d.id, 
          ...data,
          facilityName: facility?.name || 'Unknown Facility'
        } as Review;
      });
      setReviews(reviewsData.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));

      // Fetch System Settings
      const settingsSnap = await getDoc(doc(db, 'system_settings', 'global'));
      if (settingsSnap.exists()) {
        setSystemSettings(settingsSnap.data() as SystemSettings);
      } else {
        // Init with specific ID 'global' if not exists
        const initialSettings = { global_sms_enabled: true, updatedAt: serverTimestamp() };
        await setDoc(doc(db, 'system_settings', 'global'), initialSettings);
        setSystemSettings(initialSettings as any);
      }

      // Fetch All Bookings for Override Control
      const bSnap = await getDocs(collection(db, 'bookings'));
      setBookings(bSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Booking[]);

      // Fetch Global Notifications for Oversight
      const nSnap = await getDocs(query(collection(db, 'notifications'), limit(50)));
      setNotifications(nSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'admin_data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  const handleSeedData = async () => {
    if (!user) return;
    setIsSeeding(true);
    try {
      await seedDemoData(user.email || '', user.uid);
      toast.success('Demo data initialized successfully!');
      fetchData(); // Refresh list
    } catch (error) {
      toast.error('Failed to initialize demo data.');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleRegisterFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    try {
      await addDoc(collection(db, 'facilities'), {
        ...newFac,
        isVerified: true,
        verificationStatus: 'verified',
        images: ['https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=800'],
        createdAt: serverTimestamp(),
      });
      toast.success('New facility registered successfully.');
      setNewFac({ name: '', type: 'Pickleball', ownerId: '', address: '', lat: 9.3068, lng: 123.3039 });
      fetchData();
    } catch (error) {
      toast.error('Failed to register facility.');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRoleChange = async (uid: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
      toast.success(`User role updated to ${newRole}`);
    } catch (error) {
      toast.error('Failed to update role.');
    }
  };

  const handleToggleReviewVisibility = async (reviewId: string, currentHidden: boolean) => {
    try {
      await updateDoc(doc(db, 'reviews', reviewId), { hidden: !currentHidden });
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, hidden: !currentHidden } : r));
      toast.success(`Review ${!currentHidden ? 'hidden' : 'visible'}`);
    } catch (error) {
      toast.error('Failed to update review visibility.');
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-white/50 font-display font-black italic uppercase text-4xl tracking-tighter">Initializing Master Control...</div>;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'bookings', label: 'Bookings', icon: FileText },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'facilities', label: 'Facilities', icon: Building2 },
    { id: 'reviews', label: 'Moderation', icon: MessageCircle },
    { id: 'verification', label: 'Verifications', icon: ShieldCheck, badge: pendingVerificationUsers.length > 0 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'System', icon: Settings }
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-0 md:px-12 py-12 pb-32 space-y-12">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 text-cyan">
        <div className="space-y-1 flex-shrink-0">
          <div className="flex items-center gap-2 text-cyan text-[10px] uppercase font-bold tracking-[0.2em]">
            <Shield size={14} className="fill-cyan/20" /> System Secure
          </div>
          <h1 className="text-4xl sm:text-6xl font-display font-black uppercase italic tracking-tighter leading-none">Master <br /><span className="text-white/40">Command</span></h1>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest leading-relaxed mt-4">Super Admin Oversight</p>
        </div>
        
        <div className="space-y-4 w-full lg:w-fit">
          {/* Mobile Tab Selector */}
          <div className="lg:hidden">
            <Selector
              options={tabs.map(t => ({ id: t.id, label: t.label, icon: t.icon }))}
              selectedId={activeTab}
              onSelect={(id) => setActiveTab(id as any)}
              label="Admin Operations"
            />
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex flex-wrap gap-2 glass p-2 rounded-[32px] border-white/5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === tab.id ? 'bg-cyan text-charcoal shadow-lg shadow-cyan/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
              >
                <tab.icon size={14} />
                {tab.label}
                {tab.badge && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-charcoal" />
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Users', value: users.length, icon: Users, color: 'cyan' },
                { label: 'Active Facilities', value: facilities.length, icon: Building2, color: 'blue' },
                { label: 'System Reviews', value: reviews.length, icon: Star, color: 'orange' },
                { label: 'Market Flow', value: 'High', icon: TrendingUp, color: 'green' },
              ].map((stat, i) => (
                <div key={i} className="glass p-6 sm:p-8 rounded-[32px] sm:rounded-[48px] border-white/5 space-y-6">
                  <stat.icon className="text-cyan/40" size={28} sm:size={32} />
                  <div>
                    <p className="text-3xl sm:text-4xl font-display font-black italic text-white leading-none">{stat.value}</p>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-2">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <section className="glass p-6 sm:p-12 rounded-[32px] sm:rounded-[56px] border-white/10 shadow-2xl space-y-8 sm:space-y-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-cyan/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
              <div className="flex items-center gap-4 sm:gap-6 relative">
                <div className="p-4 sm:p-5 glass rounded-2xl sm:rounded-3xl border-white/5 text-cyan shrink-0"><Plus size={28} sm:size={32} /></div>
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-black uppercase italic tracking-tighter whitespace-normal break-words leading-none">Onboard <span className="text-white/40">Tenant</span></h2>
                  <p className="text-slate-400 text-[10px] sm:text-xs md:text-sm font-medium italic mt-1 line-clamp-1">Instant registration for new facility operators.</p>
                </div>
              </div>

              <form onSubmit={handleRegisterFacility} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end relative">
                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-[0.2em] ml-1">Facility Name</label>
                  <input required className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl focus:outline-none focus:border-cyan/40 transition-all text-sm font-bold uppercase tracking-widest" value={newFac.name} onChange={e => setNewFac({...newFac, name: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-[0.2em] ml-1">Sport Segment</label>
                  <select className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl focus:outline-none appearance-none text-sm font-bold uppercase tracking-widest text-white" value={newFac.type} onChange={e => setNewFac({...newFac, type: e.target.value})}>
                    {['Basketball', 'Pickleball', 'Tennis', 'Badminton', 'Volleyball', 'Gym', 'Swimming Pool', 'Football', 'Futsal', 'Padel'].map(s => <option key={s} value={s} className="bg-charcoal text-white">{s}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-[0.2em] ml-1">Operator UID</label>
                  <input required className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl focus:outline-none text-sm font-mono" value={newFac.ownerId} onChange={e => setNewFac({...newFac, ownerId: e.target.value})} />
                </div>
                <button 
                  type="submit" 
                  disabled={isRegistering}
                  className="bg-cyan text-charcoal h-[66px] rounded-3xl font-display font-black uppercase italic tracking-tighter text-xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-cyan/20 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isRegistering && <Loader2 size={20} className="animate-spin" />}
                  Register
                </button>
              </form>
            </section>
            
            <button 
              onClick={handleSeedData}
              disabled={isSeeding}
              className="flex items-center gap-3 glass border-lime/20 text-lime px-8 py-4 rounded-[32px] font-black uppercase tracking-widest text-[10px] transition-all hover:bg-lime/10 disabled:opacity-50"
            >
              {isSeeding ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
              Initialize Infrastructure Seed
            </button>
          </motion.div>
        )}

        {activeTab === 'bookings' && (
          <motion.div
            key="bookings"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass rounded-[48px] border-white/5 overflow-hidden"
          >
            <div className="p-10 border-b border-white/5 flex items-center justify-between glass">
              <h2 className="text-2xl font-display font-black uppercase italic tracking-tight">Global <span className="text-white/40">Reservations</span></h2>
              <div className="flex gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white/5 px-4 py-2 rounded-full border border-white/5">System Managed</span>
              </div>
            </div>
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="px-10 py-6 text-[10px] uppercase font-bold text-slate-500 tracking-widest">Entry</th>
                    <th className="px-10 py-6 text-[10px] uppercase font-bold text-slate-500 tracking-widest">Status</th>
                    <th className="px-10 py-6 text-[10px] uppercase font-bold text-slate-500 tracking-widest text-right">Admin Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-10 py-6">
                        <div className="font-display font-black uppercase italic text-lg leading-none group-hover:text-cyan transition-colors">{booking.userName}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{booking.courtName} • {booking.bookingReference}</div>
                      </td>
                      <td className="px-10 py-6">
                         <div className="flex items-center gap-3">
                           <span className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border flex items-center gap-2 ${
                             booking.status === 'CONFIRMED' ? 'bg-cyan/20 text-cyan border-cyan/20' : 
                             booking.status === 'CANCELLED' ? 'bg-red-500/20 text-red-500 border-red-500/20' : 
                             booking.status === 'PENDING' || booking.status === 'PENDING_PROOF' ? 'bg-orange-500/20 text-orange-400 border-orange-500/20' :
                             booking.status === 'UNDER_REVIEW' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                             'bg-white/5 text-slate-500 border-white/5'
                           }`}>
                             {booking.status === 'PENDING' || booking.status === 'PENDING_PROOF' ? <Clock size={12} className="animate-pulse" /> : 
                              booking.status === 'UNDER_REVIEW' ? <ShieldAlert size={12} className="animate-pulse" /> : 
                              booking.status === 'CONFIRMED' ? <CheckCircle size={12} /> : null}
                             {booking.status}
                           </span>
                         </div>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <div className="flex justify-end gap-2">
                           {['CONFIRMED', 'CANCELLED', 'RESERVED', 'PENDING_PROOF'].map(s => (
                             <button
                               key={s}
                               onClick={() => handleBookingManualStatus(booking.id, s)}
                               className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${booking.status === s ? 'bg-cyan text-charcoal' : 'bg-white/5 text-slate-500 hover:text-white hover:bg-white/10'}`}
                             >
                               {s === 'PENDING_PROOF' ? 'PROOF' : s}
                             </button>
                           ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="max-w-3xl mx-auto space-y-8"
          >
            <div className="glass p-12 rounded-[64px] border-white/10 space-y-12">
               <div className="space-y-2">
                 <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter">Command <span className="text-white/40">Protocol</span></h2>
                 <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Global platform primitives</p>
               </div>

               <div className="space-y-6">
                 <div className="flex items-center justify-between p-8 glass rounded-[32px] border-white/5 group hover:border-cyan/20 transition-all">
                    <div className="space-y-1">
                      <p className="text-xl font-display font-black uppercase italic text-white group-hover:text-cyan transition-colors">Global SMS Distribution</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Enable/Disable all platform notifications</p>
                    </div>
                    <button 
                      onClick={handleToggleGlobalSms}
                      className={`w-20 h-10 rounded-full p-1 transition-all flex items-center ${systemSettings.global_sms_enabled ? 'bg-cyan' : 'bg-white/10'}`}
                    >
                       <div className={`w-8 h-8 rounded-full shadow-lg transition-transform ${systemSettings.global_sms_enabled ? 'translate-x-10 bg-charcoal' : 'translate-x-0 bg-slate-500'}`} />
                    </button>
                 </div>

                 <div className="flex items-center justify-between p-8 glass rounded-[32px] border-white/5 opacity-40 cursor-not-allowed">
                    <div className="space-y-1">
                      <p className="text-xl font-display font-black uppercase italic text-white">Payment Gateway</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Platform-wide transaction processing</p>
                    </div>
                    <div className="w-20 h-10 rounded-full p-1 bg-white/10 flex items-center">
                       <div className="w-8 h-8 rounded-full bg-slate-500" />
                    </div>
                 </div>
               </div>

               <div className="pt-8 border-t border-white/5 flex items-center gap-4 text-cyan/40">
                  <ShieldCheck size={20} />
                  <p className="text-[10px] font-black uppercase tracking-widest">Security layer active • Master overrides enabled</p>
               </div>
            </div>
          </motion.div>
        )}
        {activeTab === 'users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass rounded-[48px] border-white/5 overflow-hidden"
          >
            <div className="p-10 border-b border-white/5 flex items-center justify-between sticky top-0 z-10 glass">
              <h2 className="text-2xl font-display font-black uppercase italic tracking-tight">Identity <span className="text-white/40">Registry</span></h2>
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input placeholder="Filter by email..."  className="pl-12 pr-6 py-3 bg-white/5 rounded-2xl text-[10px] font-bold uppercase tracking-widest border border-white/10 focus:border-cyan/40 outline-none w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="px-10 py-6 text-[10px] uppercase font-bold text-slate-500 tracking-widest">User Profile</th>
                    <th className="px-10 py-6 text-[10px] uppercase font-bold text-slate-500 tracking-widest">Clearance</th>
                    <th className="px-10 py-6 text-[10px] uppercase font-bold text-slate-500 tracking-widest text-right">Access Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.filter(u => u.email.includes(searchTerm)).map((user) => (
                    <tr key={user.uid} className="hover:bg-white/5 transition-colors group">
                      <td className="px-10 py-6">
                        <div className="font-display font-black uppercase italic text-lg leading-none group-hover:text-cyan transition-colors">{user.name}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{user.email}</div>
                      </td>
                      <td className="px-10 py-6">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${
                          user.role === 'super_admin' ? 'bg-cyan/20 text-cyan border-cyan/20' : 
                          user.role === 'ADMIN' ? 'bg-red-500/20 text-red-400 border-red-500/20' : 
                          user.role === 'OWNER' ? 'bg-blue-500/20 text-blue-400 border-blue-500/20' : 'bg-white/5 text-slate-500 border-white/5'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <select className="bg-white/5 p-3 rounded-xl text-[10px] uppercase font-bold text-white focus:text-white outline-none cursor-pointer tracking-widest" value={user.role} onChange={(e) => handleRoleChange(user.uid, e.target.value)}>
                          <option value="PLAYER" className="bg-charcoal text-white">Standard</option>
                          <option value="OWNER" className="bg-charcoal text-white">Operator</option>
                          <option value="ADMIN" className="bg-charcoal text-white">Admin</option>
                          <option value="super_admin" className="bg-charcoal text-white">Super Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'facilities' && (
          <motion.div
            key="facilities"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {facilities.map(fac => (
              <div key={fac.id} className="glass p-8 rounded-[48px] border-white/5 group hover:border-white/10 transition-all space-y-6 relative overflow-hidden">
                 {!fac.isActive && (
                   <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                 )}
                 <div className="flex items-center justify-between">
                   <div className="w-16 h-16 glass border-white/10 rounded-2xl flex items-center justify-center font-display font-black text-cyan italic text-2xl uppercase">{fac.name[0]}</div>
                   <div className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${fac.isActive ? 'bg-cyan/10 text-cyan border-cyan/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                     {fac.isActive ? fac.type : 'Locked'}
                   </div>
                 </div>
                 <div className="space-y-1">
                   <h3 className="text-2xl font-display font-black uppercase italic tracking-tight text-white group-hover:text-cyan transition-colors line-clamp-1">{fac.name}</h3>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest line-clamp-1">{fac.address || 'No location provided'}</p>
                 </div>
                 <div className="pt-4 flex items-center justify-between border-t border-white/5">
                    <button 
                      onClick={() => handleToggleFacilityStatus(fac.id, !!fac.isActive)}
                      className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${fac.isActive ? 'text-red-400 hover:text-red-300' : 'text-cyan hover:text-white'}`}
                    >
                       {fac.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                       {fac.isActive ? 'Lockdown' : 'Activate'}
                    </button>
                    <button 
                      onClick={() => navigate(`/facility/${fac.id}`)}
                      className="text-white hover:text-cyan transition-colors active:scale-90 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    >
                      <Settings size={14} />
                      Config
                    </button>
                 </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'reviews' && (
          <motion.div
            key="reviews"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between glass p-8 px-12 rounded-[40px] border-white/5">
              <h2 className="text-3xl font-display font-black uppercase italic tracking-tight">Content <span className="text-white/40">Moderation</span></h2>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white/5 px-4 py-2 rounded-full border border-white/5">Global Log: {reviews.length} Entries</div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {reviews.map((review) => (
                <div key={review.id} className={`glass p-10 rounded-[56px] border-white/5 transition-all flex flex-col md:flex-row gap-10 items-start ${review.hidden ? 'opacity-40 grayscale' : ''}`}>
                  <div className="md:w-64 space-y-4">
                    <div className="text-white font-display font-black uppercase italic text-2xl group-hover:text-lime transition-colors leading-tight">{review.userName}</div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest px-3 py-1 bg-white/5 rounded-full border border-white/5 w-fit">PID: {review.id.slice(0, 8)}</div>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} className={i < review.rating ? 'text-lime fill-lime shadow-xl' : 'text-white/10'} />
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 space-y-6 border-l border-white/5 pl-10">
                    <div className="space-y-2">
                       <span className="text-[9px] font-black uppercase tracking-widest text-lime/50">{review.facilityName}</span>
                       <p className="text-lg font-medium text-slate-300 leading-relaxed italic">"{review.comment}"</p>
                    </div>
                    {review.ownerReply && (
                      <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-2">
                         <span className="text-[9px] font-black uppercase tracking-widest text-white/20">System Response</span>
                         <p className="text-sm text-slate-400 italic">"{review.ownerReply.text}"</p>
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col gap-3">
                    <button 
                      onClick={() => handleToggleReviewVisibility(review.id, review.hidden)}
                      className={`p-5 rounded-[32px] transition-all ${review.hidden ? 'bg-lime text-charcoal shadow-xl shadow-lime/20' : 'bg-charcoal/50 text-white/40 border border-white/10 hover:border-lime/40'}`}
                      title={review.hidden ? "Show Review" : "Hide Review"}
                    >
                      {review.hidden ? <Eye size={24} /> : <EyeOff size={24} />}
                    </button>
                    <button 
                      className="p-5 rounded-[32px] bg-charcoal/50 text-white/40 border border-white/10 hover:border-red-500/40 hover:text-red-400 transition-all font-display font-black uppercase italic text-xs"
                      onClick={() => toast.error('Permanent deletion requires Master Override')}
                    >
                      <XCircle size={24} />
                    </button>
                  </div>
                </div>
              ))}
              {reviews.length === 0 && (
                <div className="glass p-20 rounded-[64px] border-white/5 text-center space-y-4">
                  <MessageCircle size={48} className="text-white/5 mx-auto" />
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Registry is empty. No reviews to moderate.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
        {activeTab === 'verification' && (
          <motion.div
            key="verification"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-12"
          >
            <div className="glass rounded-[48px] border-white/5 overflow-hidden">
               <div className="p-10 border-b border-white/5 glass">
                  <h2 className="text-2xl font-display font-black uppercase italic tracking-tight">Pending <span className="text-white/40">Approvals</span></h2>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/5">
                        <th className="px-10 py-6 text-[10px] uppercase font-bold text-slate-500 tracking-widest">Operator</th>
                        <th className="px-10 py-6 text-[10px] uppercase font-bold text-slate-500 tracking-widest">Document</th>
                        <th className="px-10 py-6 text-[10px] uppercase font-bold text-slate-500 tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {pendingVerificationUsers.length > 0 ? pendingVerificationUsers.map((u) => (
                        <tr key={u.uid} className="hover:bg-white/5 transition-colors group">
                          <td className="px-10 py-6">
                            <div className="font-display font-black uppercase italic text-lg leading-none">{u.name}</div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{u.email}</div>
                            {u.businessName && (
                              <div className="text-[10px] text-lime font-bold uppercase tracking-widest mt-2">{u.businessName}</div>
                            )}
                            {u.businessAddress && (
                              <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1">{u.businessAddress}</div>
                            )}
                          </td>
                          <td className="px-10 py-6">
                            {u.kycUrl ? (
                              <a href={u.kycUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-lime hover:underline font-bold text-[10px] uppercase tracking-widest translate-y-[-8px]">
                                <FileText size={14} />
                                View Evidence
                              </a>
                            ) : (
                              <span className="text-slate-600 font-bold text-[10px] uppercase tracking-widest">No Document</span>
                            )}
                          </td>
                          <td className="px-10 py-6 text-right space-x-4">
                            <button 
                              onClick={() => handleVerifyUser(u.uid, 'verified')}
                              className="px-6 py-2 bg-lime/20 text-lime border border-lime/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-lime hover:text-charcoal transition-all"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleVerifyUser(u.uid, 'rejected')}
                              className="px-6 py-2 bg-red-500/10 text-red-500 border border-red-500/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={3} className="px-10 py-20 text-center text-slate-600 font-bold uppercase tracking-widest text-xs italic">
                            All operators are currently verified
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
               </div>
            </div>
          </motion.div>
        )}
        {activeTab === 'notifications' && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between glass p-8 px-12 rounded-[40px] border-white/5">
              <h2 className="text-3xl font-display font-black uppercase italic tracking-tight">System <span className="text-white/40">Communications</span></h2>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white/5 px-4 py-2 rounded-full border border-white/5">Full System Log: {notifications.length} Entries</div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {notifications.map((n) => (
                <div key={n.id} className="glass p-6 rounded-3xl border border-white/5 flex items-center justify-between gap-6 group hover:border-cyan/20 transition-all">
                  <div className="flex items-center gap-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${n.read ? 'bg-white/5 text-slate-500' : 'bg-cyan/10 text-cyan'}`}>
                      <Bell size={20} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h4 className="text-[11px] font-black uppercase tracking-wider text-white">{n.title}</h4>
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-2 py-0.5 border border-white/5 rounded-full">UID: {n.userId?.slice(0, 8)}</span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium">{n.message}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">
                      {n.createdAt?.toMillis ? new Date(n.createdAt.toMillis()).toLocaleString() : 'Recent'}
                    </p>
                    <span className={`text-[8px] font-black uppercase tracking-widest p-1 px-2 rounded-md mt-2 inline-block ${n.read ? 'bg-white/5 text-slate-600' : 'bg-cyan/20 text-cyan'}`}>
                      {n.read ? 'ACKNOWLEDGED' : 'ACTIVE'}
                    </span>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="glass p-20 rounded-[64px] border-white/5 text-center space-y-4">
                  <Bell size={48} className="text-white/5 mx-auto" />
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">No notification events recorded in this cycle.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
