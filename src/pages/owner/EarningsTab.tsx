import React, { useState, useEffect } from 'react';
import { Wallet, Calendar, Clock, Users, Activity, FileText, Download, Send, CreditCard, Landmark, ArrowRight, Loader2 } from 'lucide-react';
import { Booking, LedgerEntry, WithdrawalRequest } from '../../types';
import { TableSkeleton } from '../../components/Skeletons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface EarningsTabProps {
  bookings: Booking[];
  loading: boolean;
  selectedVenueId: string | null;
}

export const EarningsTab: React.FC<EarningsTabProps> = ({ bookings, loading: bookingsLoading, selectedVenueId }) => {
  const { user } = useAuth();
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [withdrawForm, setWithdrawForm] = useState({
    method: 'bank' as 'bank' | 'e-wallet',
    account_name: '',
    account_number: '',
    bank_name: '',
    swift_code: '',
    provider: 'GCash'
  });

  useEffect(() => {
    if (user && selectedVenueId) fetchFinancialData();
  }, [user, selectedVenueId]);

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      const { data: ledgerData } = await supabase
        .from('ledger')
        .select('*')
        .eq('owner_id', user?.id)
        .eq('facility_id', selectedVenueId)
        .order('created_at', { ascending: false });
      
      const { data: withdrawalData } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      setLedger(ledgerData || []);
      setWithdrawals(withdrawalData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = ledger.reduce((acc, l) => acc + l.total_amount, 0);
  const netEarnings = ledger.reduce((acc, l) => acc + l.owner_amount, 0);
  const pendingPayout = ledger
    .filter(l => l.status === 'pending')
    .reduce((acc, l) => acc + l.owner_amount, 0);
  
  const handleWithdrawal = async () => {
    if (pendingPayout <= 0) {
      toast.error('No pending balance to withdraw.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('withdrawal_requests').insert({
        owner_id: user?.id,
        amount: pendingPayout,
        currency_code: 'PHP',
        method: withdrawForm.method,
        details: {
          account_name: withdrawForm.account_name,
          account_number: withdrawForm.account_number,
          bank_name: withdrawForm.bank_name,
          swift_code: withdrawForm.swift_code,
          provider: withdrawForm.provider
        },
        status: 'pending'
      });

      if (error) throw error;

      // Mark ledger entries as scheduled
      await supabase
        .from('ledger')
        .update({ status: 'payout_scheduled' })
        .eq('owner_id', user?.id)
        .eq('status', 'pending');

      toast.success('Withdrawal request submitted!');
      setShowWithdrawalModal(false);
      fetchFinancialData();
    } catch (err) {
      toast.error('Submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Date', 'Booking ID', 'Total Amount', 'Platform Fee', 'Net Amount', 'Status'];
    const rows = ledger.map(l => [
      format(new Date(l.created_at), 'yyyy-MM-dd'),
      l.booking_id,
      l.total_amount,
      l.platform_fee,
      l.owner_amount,
      l.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `earnings_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || bookingsLoading) return <TableSkeleton />;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass p-10 rounded-[48px] border-white/5 space-y-4 relative overflow-hidden group">
             <div className="absolute right-0 top-0 p-8 opacity-10 text-lime group-hover:scale-110 transition-transform duration-700">
                <Wallet size={48} />
             </div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Net Earnings</p>
             <h4 className="text-5xl font-display font-black italic tracking-tighter text-white">
                ₱{netEarnings.toLocaleString()}
             </h4>
             <p className="text-[9px] font-bold text-lime uppercase tracking-widest flex items-center gap-1">
                <Activity size={10} /> After 5% Platform Fee
             </p>
          </div>

          <div className="glass p-10 rounded-[48px] border-white/5 space-y-4 relative overflow-hidden group">
             <div className="absolute right-0 top-0 p-8 opacity-10 text-blue-500 group-hover:scale-110 transition-transform duration-700">
                <CreditCard size={48} />
             </div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Available for Payout</p>
             <h4 className="text-5xl font-display font-black italic tracking-tighter text-white">
                ₱{pendingPayout.toLocaleString()}
             </h4>
             <button 
               onClick={() => setShowWithdrawalModal(true)}
               disabled={pendingPayout <= 0}
               className="w-full h-12 bg-lime text-charcoal rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
             >
                Initiate Withdrawal
             </button>
          </div>

          <div className="glass p-10 rounded-[48px] border-white/5 space-y-4 relative overflow-hidden group">
             <div className="absolute right-0 top-0 p-8 opacity-10 text-slate-500 group-hover:scale-110 transition-transform duration-700">
                <Download size={48} />
             </div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reports</p>
             <h4 className="text-2xl font-display font-black italic tracking-tighter text-white">Financial Export</h4>
             <button 
               onClick={exportCSV}
               className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
             >
                Download Ledger (CSV) <FileText size={14} />
             </button>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Ledger History */}
          <div className="glass p-10  rounded-[56px] border-white/5 space-y-10">
             <header className="flex items-center justify-between">
                <div>
                   <h3 className="text-3xl font-display font-black uppercase italic tracking-tighter">Settlement <span className="text-white/40">Log</span></h3>
                   <p className="text-[10px] font-black text-lime uppercase tracking-widest mt-1">Real-time revenue split records</p>
                </div>
             </header>

             <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-separate border-spacing-y-4">
                   <thead>
                      <tr className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                         <th className="px-6 pb-2">Reference</th>
                         <th className="px-6 pb-2">Timestamp</th>
                         <th className="px-6 pb-2">Total</th>
                         <th className="px-6 pb-2">Platform Fee</th>
                         <th className="px-6 pb-2 text-right">Net Settlement</th>
                         <th className="px-6 pb-2 text-right">Status</th>
                      </tr>
                   </thead>
                   <tbody>
                      {ledger.map(entry => (
                         <tr key={entry.id} className="group glass border-white/5 hover:border-white/10 transition-all">
                            <td className="px-6 py-5 rounded-l-3xl">
                               <p className="text-xs font-black uppercase tracking-widest text-white">#{entry.booking_id.slice(-6).toUpperCase()}</p>
                            </td>
                            <td className="px-6 py-5">
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(new Date(entry.created_at), 'MMM dd, HH:mm')}</p>
                            </td>
                            <td className="px-6 py-5">
                               <p className="text-[10px] font-black text-white">₱{entry.total_amount.toLocaleString()}</p>
                            </td>
                            <td className="px-6 py-5">
                               <p className="text-[10px] font-black text-red-400/60">-₱{entry.platform_fee.toLocaleString()}</p>
                            </td>
                            <td className="px-6 py-5 text-right">
                               <p className="text-sm font-display font-black italic text-lime">₱{entry.owner_amount.toLocaleString()}</p>
                            </td>
                            <td className="px-6 py-5 text-right rounded-r-3xl">
                               <div className={`inline-flex px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${entry.status === 'paid' ? 'bg-lime/20 text-lime' : 'bg-white/10 text-slate-500'}`}>
                                  {entry.status.replace('_', ' ')}
                               </div>
                            </td>
                         </tr>
                      ))}
                      {ledger.length === 0 && (
                        <tr>
                           <td colSpan={6} className="py-20 text-center">
                              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">No settlement records found for this operation.</p>
                           </td>
                        </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>

          {/* Withdrawal History */}
          <div className="glass p-10 rounded-[56px] border-white/5 space-y-10">
              <header className="flex items-center justify-between">
                <div>
                   <h3 className="text-3xl font-display font-black uppercase italic tracking-tighter">Payout <span className="text-white/40">Queue</span></h3>
                   <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">Track your funds arrival</p>
                </div>
                <Send className="text-blue-500" size={24} />
             </header>

             <div className="space-y-4">
                {withdrawals.length === 0 ? (
                  <div className="py-20 text-center space-y-4">
                     <Clock className="mx-auto text-white/5" size={40} />
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No payout history yet</p>
                  </div>
                ) : (
                  withdrawals.map(w => (
                    <div key={w.id} className="p-8 bg-white/5 rounded-3xl border border-white/5 space-y-4 group">
                       <div className="flex items-center justify-between">
                          <div className="space-y-1">
                             <p className="text-xl font-display font-black italic text-white">₱{w.amount.toLocaleString()}</p>
                             <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Requested {format(new Date(w.created_at), 'MMM dd')}</p>
                          </div>
                          <div className={`px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                            w.status === 'completed' ? 'bg-lime/20 text-lime' : 
                            w.status === 'pending' ? 'bg-blue-500/20 text-blue-500' : 'bg-red-500/20 text-red-500'
                          }`}>
                            {w.status}
                          </div>
                       </div>
                       <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[8px] font-bold text-slate-400 tracking-widest uppercase">
                          <span>{w.method === 'bank' ? `${w.details.bank_name} ***${w.details.account_number.slice(-4)}` : `${w.details.provider} Account`}</span>
                          <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                       </div>
                    </div>
                  ))
                )}
             </div>
          </div>
       </div>

       {/* Withdrawal Form Modal */}
       {showWithdrawalModal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-charcoal/90 backdrop-blur-xl" onClick={() => setShowWithdrawalModal(false)} />
            <div className="relative w-full max-w-xl glass border-white/10 rounded-[48px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
               <div className="p-10 space-y-8">
                  <div className="space-y-1">
                     <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter">Settlement <span className="text-lime">Target</span></h3>
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Define where your earnings will be sent</p>
                  </div>

                  <div className="space-y-6">
                     <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => setWithdrawForm(prev => ({ ...prev, method: 'bank' }))}
                          className={`h-24 rounded-3xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${withdrawForm.method === 'bank' ? 'border-lime bg-lime/10' : 'border-white/5 hover:border-white/20'}`}
                        >
                           <Landmark size={24} className={withdrawForm.method === 'bank' ? 'text-lime' : 'text-slate-500'} />
                           <span className="text-[10px] font-black uppercase tracking-widest">Bank Transfer</span>
                        </button>
                        <button 
                          onClick={() => setWithdrawForm(prev => ({ ...prev, method: 'e-wallet' }))}
                          className={`h-24 rounded-3xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${withdrawForm.method === 'e-wallet' ? 'border-lime bg-lime/10' : 'border-white/5 hover:border-white/20'}`}
                        >
                           <Wallet size={24} className={withdrawForm.method === 'e-wallet' ? 'text-lime' : 'text-slate-500'} />
                           <span className="text-[10px] font-black uppercase tracking-widest">E-Wallet</span>
                        </button>
                     </div>

                     <div className="space-y-4">
                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Full Account Name</label>
                           <input 
                              type="text" 
                              placeholder="JUAN DELA CRUZ"
                              value={withdrawForm.account_name}
                              onChange={e => setWithdrawForm(prev => ({ ...prev, account_name: e.target.value.toUpperCase() }))}
                              className="w-full glass border-white/5 px-6 py-4 rounded-xl text-xs font-bold uppercase tracking-widest outline-none focus:border-lime/40"
                           />
                        </div>

                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Account / Phone Number</label>
                           <input 
                              type="text" 
                              placeholder="0917 XXX XXXX"
                              value={withdrawForm.account_number}
                              onChange={e => setWithdrawForm(prev => ({ ...prev, account_number: e.target.value }))}
                              className="w-full glass border-white/5 px-6 py-4 rounded-xl text-xs font-bold uppercase tracking-widest outline-none focus:border-lime/40"
                           />
                        </div>

                        {withdrawForm.method === 'bank' ? (
                           <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Bank Name</label>
                                <input 
                                   type="text" 
                                   placeholder="BPI / BDO / METRO"
                                   value={withdrawForm.bank_name}
                                   onChange={e => setWithdrawForm(prev => ({ ...prev, bank_name: e.target.value.toUpperCase() }))}
                                   className="w-full glass border-white/5 px-6 py-4 rounded-xl text-xs font-bold uppercase tracking-widest outline-none focus:border-lime/40"
                                />
                             </div>
                             <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">SWIFT (Optional)</label>
                                <input 
                                   type="text" 
                                   placeholder="CODE..."
                                   value={withdrawForm.swift_code}
                                   onChange={e => setWithdrawForm(prev => ({ ...prev, swift_code: e.target.value.toUpperCase() }))}
                                   className="w-full glass border-white/5 px-6 py-4 rounded-xl text-xs font-bold uppercase tracking-widest outline-none focus:border-lime/40"
                                />
                             </div>
                           </div>
                        ) : (
                           <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Wallet Provider</label>
                               <select 
                                 value={withdrawForm.provider}
                                 onChange={e => setWithdrawForm(prev => ({ ...prev, provider: e.target.value }))}
                                 className="w-full text-xs font-bold uppercase tracking-widest outline-none"
                               >
                                  <option value="GCash" className="bg-charcoal">GCash</option>
                                  <option value="PayMaya" className="bg-charcoal">Maya</option>
                                  <option value="GrabPay" className="bg-charcoal">GrabPay</option>
                               </select>
                           </div>
                        )}
                     </div>

                     <button 
                        onClick={handleWithdrawal}
                        disabled={isSubmitting || !withdrawForm.account_name || !withdrawForm.account_number}
                        className="w-full h-16 bg-lime text-charcoal rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
                     >
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <>Request ₱{pendingPayout.toLocaleString()} Payout <ArrowRight size={16} /></>}
                     </button>
                  </div>
               </div>
            </div>
         </div>
       )}
    </div>
  );
};

