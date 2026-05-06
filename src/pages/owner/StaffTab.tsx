import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { UserPlus, Mail, Shield, Trash2, Loader2, Search, User, ArrowRight } from 'lucide-react';
import { Facility, UserProfile } from '../../types';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface StaffTabProps {
  facility_id: string;
}

interface StaffMember {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    name: string;
    email: string;
  };
}

export const StaffTab: React.FC<StaffTabProps> = ({ facility_id }) => {
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [email, setEmail] = useState('');

  useEffect(() => {
    fetchStaff();
  }, [facility_id]);

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_access')
        .select(`
          id,
          user_id,
          role,
          profiles (name, email)
        `)
        .eq('facility_id', facility_id);

      if (error) throw error;
      setStaff(data as unknown as StaffMember[]);
    } catch (err: any) {
      toast.error('Failed to load staff list');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!email) return;
    setInviting(true);

    try {
      // 1. Check if user exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('email', email.toLowerCase())
        .single();

      if (profileError || !profile) {
        toast.error('User not found. They must register as a Player first.');
        return;
      }

      // 2. Check if already staff
      const isAlreadyStaff = staff.some(s => s.user_id === profile.id);
      if (isAlreadyStaff) {
        toast.error('User is already part of your staff');
        return;
      }

      // 3. Add to staff_access
      const { error: accessError } = await supabase
        .from('staff_access')
        .insert({
          facility_id,
          user_id: profile.id,
          role: 'STAFF'
        });

      if (accessError) throw accessError;

      toast.success(`Staff access granted to ${profile.name}`);
      setEmail('');
      fetchStaff();
    } catch (err: any) {
      toast.error('Invitation failed: ' + err.message);
    } finally {
      setInviting(false);
    }
  };

  const removeStaff = async (id: string, name: string) => {
    if (!confirm(`Revoke staff access for ${name}?`)) return;

    try {
      const { error } = await supabase
        .from('staff_access')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setStaff(prev => prev.filter(s => s.id !== id));
      toast.success('Access revoked');
    } catch (err: any) {
      toast.error('Failed to revoke access');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-display font-black uppercase italic tracking-tighter">Team <span className="text-white/40">Access</span></h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Delegate check-ins and court management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <section className="glass p-8 rounded-[40px] border-white/5 space-y-6">
            <Link 
              to="/staff/check-in"
              className="flex items-center justify-between p-6 rounded-[32px] bg-lime/10 border border-lime/20 group hover:bg-lime/20 transition-all shadow-xl shadow-lime/10"
            >
               <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-lime">Check-In Portal</p>
                  <p className="text-[8px] font-bold text-slate-500 uppercase">Live QR Terminal</p>
               </div>
               <div className="w-10 h-10 rounded-xl bg-lime text-charcoal flex items-center justify-center group-hover:translate-x-1 transition-transform">
                  <ArrowRight size={20} />
               </div>
            </Link>

            <div className="text-center space-y-6 pt-4">
            <div className="w-20 h-20 bg-lime/10 rounded-full flex items-center justify-center mx-auto">
              <UserPlus className="text-lime" size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-display font-black uppercase italic tracking-tight">Invite <span className="text-white/40">Staff</span></h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                Enter the email address of the person you want to grant check-in access to.
              </p>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="email" 
                  placeholder="STAFF@EMAIL.COM"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full glass border-white/10 p-5 pl-14 rounded-3xl text-xs font-black uppercase tracking-widest focus:border-lime/60 transition-all text-white placeholder:text-white/10 outline-none"
                />
              </div>
              <button 
                onClick={handleInvite}
                disabled={inviting || !email}
                className="w-full bg-lime text-charcoal py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-lime/20 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {inviting ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
                Grant Access
              </button>
            </div>
            </div>
          </section>

          <div className="glass p-8 rounded-[40px] border-white/5 space-y-4">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                   <Shield size={20} />
                </div>
                <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-white">Privilege Level</p>
                   <p className="text-[9px] font-bold text-slate-500 uppercase">General Staff</p>
                </div>
             </div>
             <p className="text-[9px] font-bold text-slate-500 uppercase leading-relaxed">
                Staff can view bookings and perform QR check-ins but cannot modify venue pricing or billing information.
             </p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <section className="glass rounded-[48px] border-white/5 overflow-hidden">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xl font-display font-black uppercase italic tracking-tight">Active <span className="text-white/40">Roster</span></h3>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <User size={14} /> {staff.length} Members
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-8 flex items-center gap-4 animate-pulse">
                    <div className="w-14 h-14 bg-white/5 rounded-2xl" />
                    <div className="space-y-2 flex-grow">
                      <div className="h-4 bg-white/5 rounded-md w-1/3" />
                      <div className="h-3 bg-white/5 rounded-md w-1/4" />
                    </div>
                  </div>
                ))
              ) : staff.length === 0 ? (
                <div className="p-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/10">
                    <Search size={32} />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500 italic">No staff members configured yet</p>
                </div>
              ) : staff.map((member) => (
                <motion.div 
                  layout
                  key={member.id} 
                  className="p-8 flex items-center justify-between group hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center text-lime group-hover:scale-110 transition-transform font-display font-black italic">
                      {member.profiles.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-lg font-display font-black uppercase italic tracking-tight">{member.profiles.name}</h4>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{member.profiles.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="px-5 py-2 glass border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-white/60">
                      {member.role}
                    </div>
                    <button 
                      onClick={() => removeStaff(member.id, member.profiles.name)}
                      className="w-12 h-12 glass border-white/5 rounded-2xl flex items-center justify-center text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-400/20 hover:border-red-400/40"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
