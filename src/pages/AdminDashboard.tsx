import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  Search, 
  Mail, 
  Building2, 
  Loader2, 
  ArrowUpRight,
  User,
  History,
  Activity,
  ChevronDown,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { createNotification } from '../lib/notifications';
import NotificationBell from '../components/NotificationBell';

type AdminTab = 'overview' | 'verifications' | 'venues' | 'users' | 'payouts';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [stats, setStats] = useState({ totalRevenue: 0, commission: 0, pendingBookings: 0, pendingVenues: 0, pendingPayouts: 0 });
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [pendingVenues, setPendingVenues] = useState<any[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);

  const [userSearch, setUserSearch] = useState('');
  const [foundUser, setFoundUser] = useState<any>(null);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [searchingUser, setSearchingUser] = useState(false);
  const [viewingProof, setViewingProof] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: bks, error: bksErr } = await supabase.from('bookings').select('*, profiles(name, email), venues(name)').eq('payment_status', 'pending');
      const { data: vns, error: vnsErr } = await supabase.from('venues').select('*').eq('status', 'PENDING');
      const { data: totalData, error: totalErr } = await supabase.from('bookings').select('total_price').eq('payment_status', 'paid');
      const { data: payouts, error: payoutsErr } = await supabase.from('withdrawal_requests').select('*, profiles(name, email, business_name)').neq('status', 'completed');

      if (bksErr || vnsErr || totalErr || payoutsErr) throw new Error('Refresh failed');

      setPendingBookings(bks || []);
      setPendingVenues(vns || []);
      setPendingWithdrawals(payouts || []);
      
      const totalRev = totalData?.reduce((acc, curr) => acc + (curr.total_price || 0), 0) || 0;
      setStats({
        totalRevenue: totalRev,
        commission: totalRev * 0.05,
        pendingBookings: bks?.length || 0,
        pendingVenues: vns?.length || 0,
        pendingPayouts: payouts?.filter((p: any) => p.status === 'pending').length || 0
      });
    } catch (err) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const completePayout = async (withdrawal: any) => {
    try {
      // 1. Update withdrawal request
      await supabase
        .from('withdrawal_requests')
        .update({ status: 'completed', processed_at: new Date().toISOString() })
        .eq('id', withdrawal.id);

      // 2. Update ledger records
      await supabase
        .from('ledger')
        .update({ status: 'paid', withdrawal_id: withdrawal.id })
        .eq('owner_id', withdrawal.owner_id)
        .eq('status', 'payout_scheduled');

      // 3. Notify Owner
      await createNotification({
        userId: withdrawal.owner_id,
        title: "Payout Disbursed!",
        message: `Your payout of ${withdrawal.currency_code} ${withdrawal.amount.toLocaleString()} has been processed and sent to your account.`,
        type: "SYSTEM",
        link: "/owner/earnings"
      });

      toast.success('Payout marked as COMPLETED');
      fetchInitialData();
    } catch (err) {
      toast.error('Failed to complete payout');
    }
  };

  const approveBooking = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ payment_status: 'paid', status: 'CONFIRMED' })
        .eq('id', id);

      if (error) throw error;

      // 1. Fetch booking again with venue context for notification and ledger
      const { data: bk } = await supabase.from('bookings').select('*, venues(name, owner_id)').eq('id', id).single();
      
      if (bk) {
        // --- LEDGER INSERTION ---
        const amount = bk.total_price || 0;
        const platformFee = amount * 0.05;
        const ownerRevenue = amount * 0.95;

        await supabase.from('ledger').insert({
          booking_id: bk.id,
          facility_id: bk.facility_id,
          owner_id: bk.venues?.owner_id,
          total_amount: amount,
          platform_fee: platformFee,
          owner_amount: ownerRevenue,
          status: 'pending', // Pending payout
          currency_code: bk.currency_code || 'PHP'
        });

        // 2. Notify User 
        await createNotification({
          userId: bk.user_id,
          title: "Payment Verified!",
          message: `Your booking at ${bk.venues?.name} has been confirmed. Your digital ticket is now active.`,
          type: "PAYMENT_VERIFIED",
          link: "/my-bookings"
        });

        // 3. Notify Owner (New Paid Booking alert)
        if (bk.venues?.owner_id) {
          await createNotification({
            userId: bk.venues.owner_id,
            title: "New Booking Alert!",
            message: `A new reservation at ${bk.venues?.name} was just paid and confirmed. Check your schedule.`,
            type: "NEW_BOOKING",
            link: "/owner/schedule"
          });
        }
      }

      toast.success('Booking approved & notifications dispatched');
      fetchInitialData();
    } catch (err) {
      toast.error('Failed to approve booking');
    }
  };

  const approveVenue = async (id: string) => {
    try {
      const { error } = await supabase
        .from('venues')
        .update({ status: 'LIVE' })
        .eq('id', id);

      if (error) throw error;

      // Notify Owner
      const { data: venue } = await supabase.from('venues').select('owner_id, name').eq('id', id).single();
      if (venue?.owner_id) {
        await createNotification({
          userId: venue.owner_id,
          title: "Venue is LIVE!",
          message: `Congratulations! ${venue.name} has been vetted and is now appearing in global search results.`,
          type: "VENUE_LIVE",
          link: "/owner"
        });
      }

      toast.success('Venue is now LIVE & Owner notified');
      fetchInitialData();
    } catch (err) {
      toast.error('Failed to approve venue');
    }
  };

  const searchUser = async () => {
    if (!userSearch) return;
    setSearchingUser(true);
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', userSearch.toLowerCase().trim())
        .single();
      
      if (profileError || !profile) {
        toast.error('User not found');
        setFoundUser(null);
        return;
      }

      const { data: bks } = await supabase
        .from('bookings')
        .select('*, venues(name)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      setFoundUser(profile);
      setUserBookings(bks || []);
    } catch (err) {
      toast.error('Search failed');
    } finally {
      setSearchingUser(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-white relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-lime/10 via-transparent to-transparent opacity-30" />
        <div className="absolute -top-1/4 -right-1/4 w-[60%] h-[60%] bg-lime/10 rounded-full blur-[140px] animate-pulse" />
      </div>
      {/* Admin Header */}
      <div className="glass border-b border-white/5 p-8 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-lime rounded-2xl flex items-center justify-center text-charcoal shadow-xl shadow-lime/20">
              <Shield size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-display font-black uppercase italic tracking-tighter">Master <span className="text-lime">Control</span></h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Platform Administrator Panel</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="flex gap-2 p-1.5 glass border-white/5 rounded-[32px]">
            {(['overview', 'verifications', 'venues', 'users', 'payouts'] as AdminTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all relative ${
                  activeTab === tab ? 'bg-lime text-charcoal' : 'text-slate-500 hover:text-white'
                }`}
              >
                {tab}
                {tab === 'payouts' && stats.pendingPayouts > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] border-2 border-charcoal">
                    {stats.pendingPayouts}
                  </span>
                )}
              </button>
            ))}
            </div>
          </div>
        </div>
      </div>


      <main className="max-w-7xl mx-auto p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <div className="glass p-8 rounded-[40px] border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Revenue</p>
                       <DollarSign className="text-lime" size={18} />
                    </div>
                    <div className="text-4xl font-display font-black italic tracking-tighter text-white">
                       ${stats.totalRevenue.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-black text-lime uppercase tracking-widest bg-lime/10 w-fit px-3 py-1 rounded-full">
                       <ArrowUpRight size={10} /> 100% Gross
                    </div>
                 </div>

                 <div className="glass p-8 rounded-[40px] border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Net Commission</p>
                       <TrendingUp className="text-lime" size={18} />
                    </div>
                    <div className="text-4xl font-display font-black italic tracking-tighter text-lime">
                       ${stats.commission.toLocaleString()}
                    </div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">5% OF PLATFORM TOTAL</p>
                 </div>

                 <div className="glass p-8 rounded-[40px] border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pending Pay</p>
                       <AlertCircle className="text-amber-500" size={18} />
                    </div>
                    <div className="text-4xl font-display font-black italic tracking-tighter text-white">
                       {stats.pendingBookings}
                    </div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Manual Approvals</p>
                 </div>

                 <div className="glass p-8 rounded-[40px] border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">New Venues</p>
                       <Building2 className="text-pink-500" size={18} />
                    </div>
                    <div className="text-4xl font-display font-black italic tracking-tighter text-white">
                       {stats.pendingVenues}
                    </div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Waiting for vetting</p>
                 </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'verifications' && (
            <motion.div key="verif" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
               <div className="glass rounded-[48px] border-white/5 overflow-hidden">
                  <div className="p-8 border-b border-white/5">
                    <h2 className="text-xl font-display font-black uppercase italic tracking-tight">Payment <span className="text-white/40">Queue</span></h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead>
                          <tr className="border-b border-white/5">
                            <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Reference</th>
                            <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Player</th>
                            <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Venue</th>
                            <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Amount</th>
                            <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Actions</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                         {pendingBookings.map((bk) => (
                           <tr key={bk.id} className="group hover:bg-white/[0.02] transition-colors">
                             <td className="p-8 font-mono text-xs text-lime">{bk.booking_reference}</td>
                             <td className="p-8">
                                <div className="text-xs font-black uppercase">{bk.profiles?.name}</div>
                                <div className="text-[9px] text-slate-500">{bk.profiles?.email}</div>
                             </td>
                             <td className="p-8 text-xs font-black uppercase text-white/60">{bk.facilities?.name}</td>
                             <td className="p-8 text-xs font-black">${bk.total_price}</td>
                             <td className="p-8">
                                <div className="flex gap-2">
                                   <button 
                                      onClick={() => setViewingProof(bk.payment_proof_url)}
                                      className="p-3 glass border-white/10 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white"
                                   >
                                      <Eye size={16} />
                                   </button>
                                   <button 
                                      onClick={() => approveBooking(bk.id)}
                                      className="px-6 py-3 bg-lime/10 border border-lime/20 text-lime rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-lime hover:text-charcoal transition-all"
                                   >
                                      Approve
                                   </button>
                                </div>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                    </table>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'venues' && (
             <motion.div key="ven" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {pendingVenues.map((venue) => (
                  <div key={venue.id} className="glass rounded-[48px] border-white/5 p-8 flex flex-col justify-between group hover:border-pink-500/40 transition-all">
                     <div className="space-y-6">
                        <div className="w-20 h-20 glass rounded-[28px] overflow-hidden">
                           <img src={venue.images?.[0] || 'https://images.unsplash.com/photo-1541252260730-0412e8e2108e'} className="w-full h-full object-cover" />
                        </div>
                        <div>
                           <h3 className="text-2xl font-display font-black uppercase italic tracking-tight text-white">{venue.name}</h3>
                           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{venue.city}, {venue.country_code}</p>
                        </div>
                        <div className="flex gap-2">
                           <span className="px-3 py-1 glass border-white/5 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-500">Contact: {venue.contact_email}</span>
                        </div>
                     </div>
                     <div className="pt-8 mt-8 border-t border-white/5 flex gap-4">
                        <button className="flex-1 px-8 py-4 glass border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500">Reject</button>
                        <button 
                           onClick={() => approveVenue(venue.id)}
                           className="flex-1 px-8 py-4 bg-pink-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-pink-600/20"
                        >Activate</button>
                     </div>
                  </div>
                ))}
             </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div key="usr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
               <div className="max-w-2xl mx-auto space-y-6">
                  <div className="relative group">
                     <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-lime transition-colors" size={20} />
                     <input 
                        type="email" 
                        placeholder="ENTER USER EMAIL..."
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        className="w-full h-20 glass border-white/10 p-8 pl-16 rounded-[32px] text-xs font-black uppercase tracking-widest focus:border-lime/60 outline-none text-white"
                     />
                     <button 
                        onClick={searchUser}
                        disabled={searchingUser || !userSearch}
                        className="absolute right-4 top-1/2 -translate-y-1/2 h-12 px-8 bg-lime text-charcoal rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all"
                     >
                        Search
                     </button>
                  </div>

                  {foundUser && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                       <div className="glass p-8 rounded-[40px] border-white/5 flex items-center gap-6">
                          <div className="w-16 h-16 bg-lime/10 rounded-full flex items-center justify-center text-lime text-2xl font-display font-black italic">{foundUser.name?.charAt(0) || 'U'}</div>
                          <div>
                             <h3 className="text-xl font-display font-black uppercase italic tracking-tight text-white">{foundUser.name}</h3>
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{foundUser.email}</p>
                          </div>
                          <div className="ml-auto px-5 py-2 glass border-white/5 rounded-full text-[9px] font-black uppercase tracking-widest text-lime">{foundUser.role}</div>
                       </div>

                       <div className="glass rounded-[48px] border-white/5 overflow-hidden">
                          <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                               <History size={18} className="text-slate-500" />
                               <h3 className="text-xs font-black uppercase tracking-widest">Booking History</h3>
                            </div>
                            <span className="text-[10px] font-black uppercase text-slate-500">{userBookings.length} Matches</span>
                          </div>
                          <div className="divide-y divide-white/5">
                             {userBookings.map((bk) => (
                                <div key={bk.id} className="p-8 flex justify-between items-center text-xs">
                                   <div>
                                      <div className="font-black uppercase tracking-widest mb-1 text-white">{bk.venues?.name}</div>
                                      <div className="text-[10px] text-slate-500 uppercase">{format(new Date(bk.start_time), 'MMM dd, HH:mm')}</div>
                                   </div>
                                   <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                      bk.payment_status === 'paid' ? 'bg-lime/10 text-lime' : 'bg-amber-500/10 text-amber-500'
                                   }`}>
                                      {bk.payment_status}
                                   </div>
                                </div>
                             ))}
                          </div>
                       </div>
                    </motion.div>
                  )}
               </div>
            </motion.div>
          )}

          {activeTab === 'payouts' && (
            <motion.div key="payouts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
               <div className="glass rounded-[48px] border-white/5 overflow-hidden">
                  <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-display font-black uppercase italic tracking-tight text-white">Settlement <span className="text-white/40">Queue</span></h2>
                      <p className="text-[10px] font-black uppercase tracking-widest text-lime mt-1">Pending Venue Withdrawals</p>
                    </div>
                    <div className="px-6 py-2 glass border-white/10 rounded-full text-xs font-black uppercase tracking-widest text-slate-400">
                       {pendingWithdrawals.length} REQUESTS
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead>
                          <tr className="border-b border-white/5">
                             <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Business / Owner</th>
                             <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Amount</th>
                             <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Method</th>
                             <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Payment Details</th>
                             <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Actions</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                         {pendingWithdrawals.map((withdrawal) => (
                           <tr key={withdrawal.id} className="group hover:bg-white/[0.02] transition-colors">
                              <td className="p-8">
                                 <div className="text-xs font-black uppercase text-white">{withdrawal.profiles?.business_name || withdrawal.profiles?.name}</div>
                                 <div className="text-[9px] text-slate-500 uppercase tracking-widest">{withdrawal.profiles?.email}</div>
                              </td>
                              <td className="p-8">
                                 <div className="text-xl font-display font-black italic text-lime">₱{withdrawal.amount.toLocaleString()}</div>
                                 <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{format(new Date(withdrawal.created_at), 'MMM dd, HH:mm')}</div>
                              </td>
                              <td className="p-8">
                                 <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest w-fit ${
                                   withdrawal.method === 'bank' ? 'bg-blue-500/10 text-blue-500' : 'bg-lime/10 text-lime'
                                 }`}>
                                    {withdrawal.method.replace('-', ' ')}
                                 </div>
                              </td>
                              <td className="p-8">
                                 <div className="text-[10px] font-bold text-white uppercase tracking-tight">{withdrawal.details.account_name}</div>
                                 <div className="font-mono text-[10px] text-slate-500 mt-1">
                                    {withdrawal.method === 'bank' ? (
                                      `${withdrawal.details.bank_name} • ${withdrawal.details.account_number}`
                                    ) : (
                                      `${withdrawal.details.provider} • ${withdrawal.details.account_number}`
                                    )}
                                 </div>
                              </td>
                              <td className="p-8">
                                 <button 
                                   onClick={() => completePayout(withdrawal)}
                                   className="px-6 py-3 bg-lime text-charcoal rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-lime/10"
                                 >
                                    Mark as Paid
                                 </button>
                              </td>
                           </tr>
                         ))}
                       </tbody>
                    </table>

                    {pendingWithdrawals.length === 0 && (
                      <div className="p-20 text-center space-y-4">
                         <div className="w-20 h-20 glass rounded-full mx-auto flex items-center justify-center text-slate-800">
                            <CheckCircle2 size={40} />
                         </div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Clear Skies • No Pending Pay</p>
                      </div>
                    )}
                  </div>
               </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Proof Modal */}
      <AnimatePresence>
        {viewingProof && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingProof(null)} className="absolute inset-0 bg-charcoal/90 backdrop-blur-3xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative max-w-xl w-full glass rounded-[48px] border-white/10 overflow-hidden shadow-2xl">
               <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                  <h3 className="text-xs font-black uppercase tracking-widest">Payment Verification</h3>
                  <button onClick={() => setViewingProof(null)} className="p-2 glass border-white/10 rounded-xl text-slate-500 hover:text-white"><X size={20}/></button>
               </div>
               <div className="aspect-[4/5] bg-white">
                  <img src={viewingProof} className="w-full h-full object-contain" alt="Payment Proof" />
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
