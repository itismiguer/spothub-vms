import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, updateDoc, serverTimestamp, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Shield, FileText, CheckCircle, XCircle, Loader2, ArrowLeft, Building2, MapPin, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface UserProfile {
  uid: string;
  id?: string;
  email: string;
  name: string;
  role: string;
  businessName?: string;
  businessAddress?: string;
  kycUrl?: string;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
}

export default function AdminVerify() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Real-time listener for pending verifications
    const q = query(collection(db, 'users'), where('verificationStatus', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })) as UserProfile[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users_verification');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleVerify = async (uid: string, status: 'verified' | 'rejected') => {
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'users', uid), { 
        verificationStatus: status,
        verifiedAt: serverTimestamp()
      });

      // Synchronize facility verification
      const fSnap = await getDocs(query(collection(db, 'facilities'), where('ownerId', '==', uid)));
      const facilityPromises = fSnap.docs.map(d => updateDoc(d.ref, { 
        isVerified: status === 'verified',
        verificationStatus: status 
      }));
      await Promise.all(facilityPromises);

      toast.success(`Account ${status === 'verified' ? 'Approved' : 'Rejected'}`);
    } catch (error) {
      toast.error('Failed to update status.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-charcoal">
       <div className="animate-pulse flex flex-col items-center gap-4">
          <Shield size={48} className="text-lime/20" />
          <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em]">Opening Security Portal...</p>
       </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-0 sm:px-12 py-12 pb-32 space-y-12">
      <header className="flex flex-col sm:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6">
           <button 
             onClick={() => navigate('/admin')}
             className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all border-white/5"
           >
              <ArrowLeft size={20} />
           </button>
           <div>
              <div className="flex items-center gap-2 text-lime text-[10px] uppercase font-bold tracking-[0.2em] mb-1">
                 <Shield size={14} className="fill-lime/20" /> Identity verification
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-black uppercase italic tracking-tighter whitespace-normal break-words">Owner <span className="text-white/40">Approvals</span></h1>
           </div>
        </div>
        <div className="glass px-6 py-3 rounded-2xl border-white/10 flex items-center gap-4">
           <div className="w-3 h-3 bg-lime rounded-full animate-pulse shadow-lg shadow-lime/50" />
           <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
             {users.length} Pending Applications
           </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence mode="popLayout">
          {users.map((u) => (
            <motion.div 
              key={u.id || u.uid}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass p-8 sm:p-12 rounded-[56px] border-white/5 flex flex-col lg:flex-row gap-12 group hover:border-white/10 transition-all bg-white/[0.02]"
            >
              <div className="flex-1 space-y-8">
                 <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-lime/10 rounded-[32px] flex items-center justify-center text-lime font-display font-black italic text-3xl italic shadow-2xl border border-lime/20">
                       {u.name[0]}
                    </div>
                    <div>
                       <h2 className="text-3xl font-display font-black uppercase italic tracking-tighter text-white">{u.name}</h2>
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{u.email}</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                   <div className="flex items-start gap-4">
                      <div className="w-10 h-10 glass rounded-xl flex items-center justify-center text-white/20"><Building2 size={18} /></div>
                      <div>
                         <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Business Name</p>
                         <p className="text-xs font-bold text-slate-300">{u.businessName || 'N/A'}</p>
                      </div>
                   </div>
                   <div className="flex items-start gap-4">
                      <div className="w-10 h-10 glass rounded-xl flex items-center justify-center text-white/20"><MapPin size={18} /></div>
                      <div>
                         <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Registered Address</p>
                         <p className="text-xs font-bold text-slate-300 line-clamp-1">{u.businessAddress || 'N/A'}</p>
                      </div>
                   </div>
                 </div>
              </div>

              <div className="lg:w-80 flex flex-col justify-end gap-6 border-l lg:border-l border-white/5 lg:pl-12">
                 <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center lg:text-left">Legal Evidence</p>
                    {u.kycUrl ? (
                      <button 
                        onClick={() => window.open(u.kycUrl, '_blank')}
                        className="w-full h-40 glass rounded-[32px] border-white/10 flex flex-col items-center justify-center gap-3 group/btn hover:border-lime/40 transition-all relative overflow-hidden"
                      >
                         <div className="absolute inset-0 bg-lime/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                         <FileText size={32} className="text-lime" />
                         <span className="text-[9px] font-black uppercase tracking-widest text-white/40 group-hover/btn:text-white transition-colors">Digital Permit.pdf</span>
                         <ExternalLink size={12} className="absolute top-4 right-4 text-white/20" />
                      </button>
                    ) : (
                      <div className="w-full h-40 glass rounded-[32px] border-dashed border-white/10 flex flex-col items-center justify-center gap-2">
                         <XCircle size={24} className="text-slate-800" />
                         <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">No Image Attached</span>
                      </div>
                    )}
                 </div>

                 <div className="flex gap-4">
                    <button 
                      disabled={isUpdating}
                      onClick={() => handleVerify(u.id || u.uid, 'rejected')}
                      className="flex-1 py-5 glass border-red-500/20 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-all"
                    >
                       Reject
                    </button>
                    <button 
                      disabled={isUpdating || !u.kycUrl}
                      onClick={() => handleVerify(u.id || u.uid, 'verified')}
                      className="flex-1 py-5 bg-lime text-charcoal rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-lime/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                       Approve
                    </button>
                 </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {users.length === 0 && (
          <div className="glass p-32 rounded-[64px] border-white/5 text-center space-y-6">
             <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={48} className="text-white/5" />
             </div>
             <div>
                <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white/20">All Clear <span className="text-white/5">/ Queue Empty</span></h3>
                <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Zero pending identity verifications in buffer.</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
