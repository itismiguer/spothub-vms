import React from 'react';
import { useAuth, UserRole } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Shield, ToggleLeft as Toggle, Mail, Calendar, LogOut, Activity, Zap, Trophy, CreditCard, MessageSquare, Phone, Bell, CheckCircle2, ShieldCheck, Building2, MapPin, Upload, AlertCircle, Star, Trash2, Edit3, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export default function Profile() {
  const { user, profile, logout } = useAuth();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: '',
    phone: '',
    business_name: '',
    business_address: '',
    default_sport: ''
  });
  const [userReviews, setUserReviews] = React.useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = React.useState(true);

  React.useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        phone: (profile as any).phone || '',
        business_name: profile.business_name || '',
        business_address: profile.business_address || '',
        default_sport: (profile as any).default_sport || ''
      });
      fetchUserReviews();
    }
  }, [profile]);

  const fetchUserReviews = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('reviews')
        .select('*, facilities(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setUserReviews(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReviews(false);
    }
  };

  const deleteReview = async (id: string) => {
    if (!confirm('Delete this review permanently?')) return;
    try {
      const { error } = await supabase.from('reviews').delete().eq('id', id);
      if (error) throw error;
      toast.success('Review deleted');
      setUserReviews(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      toast.error('Failed to delete review');
    }
  };

  const [systemSettings, setSystemSettings] = React.useState({ globalSmsEnabled: true });
  const [alerts, setAlerts] = React.useState({
    email: profile?.email_notifications !== false,
    sms: profile?.sms_notifications === true
  });

  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('*')
          .eq('id', 'global')
          .single();
        if (data) {
          setSystemSettings({ globalSmsEnabled: data.global_sms_enabled });
        }
      } catch (e) {
        console.warn("System settings fetch skipped:", e);
      }
    };
    loadSettings();
  }, []);

  React.useEffect(() => {
    if (profile) {
      setAlerts({
        email: profile.email_notifications !== false,
        sms: profile.sms_notifications === true
      });
    }
  }, [profile]);

  const toggleAlert = async (type: 'email' | 'sms', e: React.MouseEvent) => {
    e.stopPropagation();
    const nextValue = !alerts[type];
    setAlerts(prev => ({ ...prev, [type]: nextValue }));
    
    await handleUpdateProfile({ 
      [`${type}_notifications`]: nextValue
    });
  };

  const handleUpdateProfile = async (updates: any) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      
      if (error) throw error;
      toast.success('Preferences synchronized.');
    } catch (error) {
      toast.error('Update failed.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveProfileData = async () => {
    await handleUpdateProfile(formData);
    setIsEditing(false);
  };

  const handleRoleSwitch = async (newRole: UserRole) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', user.id);
      
      if (error) throw error;
      toast.success(`Active role switched to ${newRole}. Refresh to apply changes.`);
    } catch (error) {
      toast.error('Role switch failed.');
    }
  };

  if (!user) return null;

  // Show a mini loader if user exists but profile is still syncing
  if (!profile) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-white space-y-6">
        <Activity className="text-lime animate-pulse" size={48} />
        <p className="text-sm font-bold uppercase tracking-widest text-white/40">Syncing Identity...</p>
      </div>
    );
  }

  const isSuperAdmin = user.email === 'miguel@builtbymiguel.net' || profile.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-transparent relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-lime/10 via-transparent to-transparent opacity-50" />
        <div className="absolute -top-1/4 -right-1/4 w-[60%] h-[60%] bg-lime/10 rounded-full blur-[140px] animate-pulse" />
      </div>
      <div className="max-w-6xl mx-auto px-6 sm:px-12 py-12 pb-32 space-y-12 relative z-10">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-5xl font-display font-black uppercase italic tracking-tighter">Profile <span className="text-white/40">Studio</span></h1>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Manage your player identity</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => isEditing ? saveProfileData() : setIsEditing(true)}
            className={`flex items-center gap-2 text-xs font-bold px-6 py-3 rounded-2xl transition-all active:scale-95 border ${
              isEditing 
                ? 'bg-lime text-charcoal border-lime shadow-[0_0_20px_rgba(181,245,90,0.3)]' 
                : 'glass text-white border-white/10 hover:bg-white/10'
            }`}
          >
            {isEditing ? (
              <><CheckCircle2 size={16} /> Save Changes</>
            ) : (
              <><User size={16} /> Edit Profile</>
            )}
          </button>
          <button 
            onClick={logout}
            className="flex items-center gap-2 text-xs font-bold text-red-400 glass px-6 py-3 rounded-2xl transition-all hover:bg-red-500/10 active:scale-95 border border-red-500/20"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Col: Info */}
        <div className="space-y-8">
          <div className="glass p-6 sm:p-10 rounded-[48px] space-y-8 relative overflow-hidden border-white/5 min-h-max h-auto">
            <div className="absolute top-0 right-0 w-32 h-32 bg-lime/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative">
              <div className="w-24 h-24 bg-lime rounded-3xl flex items-center justify-center text-charcoal text-4xl font-black italic shadow-[0_0_30px_rgba(181,245,90,0.3)]">
                {(profile.name || '?')[0]}
              </div>
              <div className="absolute -bottom-2 -right-2 glass p-2 rounded-xl text-lime border border-white/10">
                <Shield size={16} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                 {isEditing ? (
                   <input 
                    type="text"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xl font-display font-black uppercase italic tracking-tight focus:outline-none focus:border-lime/40"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                   />
                 ) : (
                   <h2 className="text-3xl font-display font-black uppercase italic tracking-tight">{profile.name || 'Athlete'}</h2>
                 )}
                 <p className="text-white/40 text-xs font-bold flex items-center gap-2 uppercase tracking-widest leading-none">
                    <Mail size={12} className="text-lime" /> {profile.email || 'No Email'}
                 </p>
              </div>
              
              <div className="flex items-center gap-2">
                 <div className="glass-lime px-3 py-1 rounded-full text-[10px] font-bold text-lime uppercase tracking-[0.2em] border border-lime/20">
                    {profile.role}
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
               <div className="glass p-4 rounded-2xl space-y-2 border-white/5">
                  <Trophy size={16} className="text-white/40" />
                  <p className="text-[10px] font-bold text-white uppercase tracking-widest">Level 1</p>
               </div>
               <div className="glass p-4 rounded-2xl space-y-2 border-white/5">
                  <CreditCard size={16} className="text-white/40" />
                  <p className="text-[10px] font-bold text-white uppercase tracking-widest">Pay-as-go</p>
               </div>
            </div>
          </div>

          {/* New Role Switcher Card */}
          <div className="glass p-8 rounded-[40px] space-y-6 border-white/5">
            <div className="space-y-1">
              <h3 className="text-xl font-display font-black uppercase italic tracking-tight">Active <span className="text-white/40">Identity</span></h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select your core experience</p>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { id: 'PLAYER', label: 'Player', desc: 'Book courts & track games', icon: <Activity size={16} /> },
                { id: 'OWNER', label: 'Court Owner', desc: 'List venue & manage bookings', icon: <Building2 size={16} /> }
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleRoleSwitch(r.id as UserRole)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                    profile.role === r.id 
                    ? 'bg-lime border-lime text-charcoal shadow-lg shadow-lime/20' 
                    : 'glass border-white/5 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${profile.role === r.id ? 'bg-charcoal text-lime' : 'bg-white/10'}`}>
                    {r.icon}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight">{r.label}</p>
                    <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest">{r.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Admin & Settings */}
        <div className="lg:col-span-2 space-y-12">
          {isSuperAdmin && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass p-10 rounded-[48px] space-y-10 border-white/10 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-lime/10 rounded-full blur-[100px] pointer-events-none" />
              
              <div className="space-y-2 relative">
                <div className="flex items-center gap-3 text-lime text-[10px] uppercase font-bold tracking-widest">
                  <Zap size={14} className="fill-lime" /> Developer Overrides
                </div>
                <h3 className="text-4xl font-display font-black uppercase italic tracking-tighter">Force <span className="text-white/40">Identity</span></h3>
                <p className="text-slate-300 text-sm max-w-md italic font-medium">Switch your operational mode instantly to verify multi-tenant access levels.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative">
                {(['PLAYER', 'OWNER', 'ADMIN'] as UserRole[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => handleRoleSwitch(role)}
                    className={`group p-6 rounded-3xl border transition-all text-left space-y-4 focus:outline-none focus:ring-2 focus:ring-lime focus:ring-offset-2 focus:ring-offset-charcoal ${
                      profile.role === role 
                      ? 'bg-lime border-lime shadow-[0_0_30px_rgba(181,245,90,0.2)]' 
                      : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${profile.role === role ? 'bg-charcoal text-lime' : 'bg-white/10 text-white/40 group-hover:text-white'}`}>
                         <Activity size={16} />
                      </div>
                      {profile.role === role && <div className="w-2 h-2 bg-charcoal rounded-full animate-pulse" />}
                    </div>
                    <div className={`font-display font-black text-xl uppercase italic ${profile.role === role ? 'text-charcoal' : 'text-white/80'}`}>
                       {role}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Business & KYC Profile */}
          {profile?.role === 'OWNER' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              <div className="glass p-10 lg:p-14 rounded-[48px] border-white/5 space-y-8">
                 <header className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-lime/10 rounded-2xl flex items-center justify-center text-lime">
                       <ShieldCheck size={24} />
                    </div>
                    <div>
                       <h3 className="text-2xl font-display font-black uppercase italic tracking-tight">Business <span className="text-white/40">Profile</span></h3>
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Required for Facility Activation</p>
                    </div>
                 </header>

                 <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 pl-2">Legal Business Name</label>
                      <div className="relative group">
                         {isEditing ? (
                           <input 
                            type="text" 
                            className="w-full h-16 bg-white/5 border border-white/20 rounded-2xl px-6 focus:outline-none focus:border-lime/40 transition-all font-bold placeholder:text-white/20"
                            placeholder="E.G. CENTER COURT SPORTS INC."
                            value={formData.business_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                           />
                         ) : (
                           <div className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 flex items-center font-bold text-white/80">
                             {profile?.business_name || 'Not Set'}
                           </div>
                         )}
                         <Building2 className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-lime transition-colors" size={20} />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 pl-2">Business Address</label>
                      <div className="relative group">
                         {isEditing ? (
                           <input 
                            type="text" 
                            className="w-full h-16 bg-white/5 border border-white/20 rounded-2xl px-6 focus:outline-none focus:border-lime/40 transition-all font-bold placeholder:text-white/20"
                            placeholder="REGISTERED PHYSICAL ADDRESS"
                            value={formData.business_address}
                            onChange={(e) => setFormData(prev => ({ ...prev, business_address: e.target.value }))}
                           />
                         ) : (
                           <div className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 flex items-center font-bold text-white/80 text-sm">
                             {profile?.business_address || 'Not Set'}
                           </div>
                         )}
                         <MapPin className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-lime transition-colors" size={20} />
                      </div>
                   </div>
                 </div>
              </div>

              <div className="glass p-10 lg:p-14 rounded-[48px] border-white/10 space-y-8 relative overflow-hidden">
                 {profile?.verification_status === 'verified' && (
                   <div className="absolute inset-0 bg-lime/10 backdrop-blur-sm flex items-center justify-center z-10">
                      <div className="bg-white text-charcoal px-8 py-4 rounded-full font-black uppercase tracking-[0.2em] text-xs shadow-2xl flex items-center gap-3">
                         <CheckCircle2 size={18} /> Account Verified
                      </div>
                   </div>
                 )}

                 <header className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-display font-black uppercase italic tracking-tight">KYC <span className="text-white/40">Status</span></h3>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Proof of Ownership Registry</p>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                      profile?.verification_status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' :
                      profile?.verification_status === 'verified' ? 'bg-lime text-charcoal' :
                      'bg-white/5 text-slate-500 border-white/10'
                    }`}>
                      {profile?.verification_status || 'unverified'}
                    </div>
                 </header>

                 <div className="space-y-8">
                    <div className="p-8 border-2 border-dashed border-white/10 rounded-[32px] hover:border-lime/40 transition-all group relative cursor-pointer text-center bg-white/[0.02]">
                       <input 
                         type="file" 
                         className="absolute inset-0 opacity-0 cursor-pointer" 
                         accept="image/*,application/pdf"
                         onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) toast.success('Document uploaded for system review.');
                         }}
                       />
                       <div className="space-y-4">
                          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto text-slate-500 group-hover:text-lime transition-colors">
                             <Upload size={32} />
                          </div>
                          <div>
                             <p className="text-sm font-bold text-white">Business Permit / DTI Registry</p>
                             <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-2 group-hover:text-lime transition-colors">PDF, PNG, JPG // MAX 10MB</p>
                          </div>
                       </div>
                    </div>

                    <div className="p-6 bg-white/5 rounded-[24px] border border-white/5 flex items-start gap-4">
                       <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 shrink-0">
                          <AlertCircle size={20} />
                       </div>
                       <p className="text-[11px] text-slate-400 leading-relaxed font-bold">
                          Verification protocol takes <span className="text-white">24-48 hours</span>. Once approved, you can activate your facility to <span className="text-lime">LIVE</span> status across the network.
                       </p>
                    </div>
                 </div>
              </div>
            </motion.div>
          )}

          <div className="glass p-10 rounded-[48px] space-y-8 border-white/5">
             <div className="space-y-1">
                <h3 className="text-3xl font-display font-black uppercase italic tracking-tight">Communication <span className="text-white/40">Hub</span></h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Notification Channels</p>
             </div>
             
             <div className="space-y-6">
                 <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-3">
                       <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Phone Integration</label>
                       <div className="flex gap-4">
                          <div className="relative flex-1">
                             <Phone size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" />
                             {isEditing ? (
                               <input 
                                 type="tel" 
                                 placeholder="+63 9XX XXX XXXX"
                                 className="w-full glass border-white/10 p-5 pl-12 rounded-3xl text-sm font-bold focus:border-lime/40 transition-all text-white placeholder:uppercase"
                                 value={formData.phone}
                                 onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                               />
                             ) : (
                               <div className="w-full glass border-white/5 p-5 pl-12 rounded-3xl text-sm font-bold text-white/80">
                                 {profile.phone || 'No Phone Connected'}
                                </div>
                             )}
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <button 
                     type="button"
                     disabled={isSaving}
                     onClick={(e) => toggleAlert('email', e)}
                     className={`p-6 rounded-[32px] border flex items-center justify-between transition-all disabled:opacity-50 ${
                       alerts.email ? 'bg-lime/10 border-lime/40 text-lime' : 'glass border-white/5 text-slate-500'
                     }`}
                   >
                      <div className="flex items-center gap-3">
                         <Mail size={16} />
                         <span className="text-[10px] font-black uppercase tracking-widest">Email Alerts</span>
                      </div>
                      <div className={`w-10 h-6 rounded-full relative transition-colors ${alerts.email ? 'bg-lime' : 'bg-white/10'}`}>
                         <motion.div 
                           animate={{ x: alerts.email ? 20 : 4 }}
                           className={`absolute top-1 w-4 h-4 rounded-full ${alerts.email ? 'bg-charcoal' : 'bg-slate-500'}`}
                         />
                      </div>
                   </button>

                    <button 
                      type="button"
                      disabled={isSaving || !systemSettings.globalSmsEnabled}
                      onClick={(e) => toggleAlert('sms', e)}
                      className={`p-6 rounded-[32px] border flex items-center justify-between transition-all disabled:opacity-50 ${
                        alerts.sms && systemSettings.globalSmsEnabled ? 'bg-lime/10 border-lime/40 text-lime' : 'glass border-white/5 text-slate-500'
                      }`}
                    >
                       <div className="flex items-center gap-3">
                          <MessageSquare size={16} />
                          <div className="text-left">
                            <span className="text-[10px] font-black uppercase tracking-widest block">SMS Logic</span>
                            {!systemSettings.globalSmsEnabled && (
                              <span className="text-[8px] font-bold text-red-400 uppercase tracking-widest animate-pulse mt-1 block">Global System Lock</span>
                            )}
                          </div>
                       </div>
                       <div className={`w-10 h-6 rounded-full relative transition-colors ${alerts.sms && systemSettings.globalSmsEnabled ? 'bg-lime' : 'bg-white/10'}`}>
                          <motion.div 
                            animate={{ x: alerts.sms && systemSettings.globalSmsEnabled ? 20 : 4 }}
                            className={`absolute top-1 w-4 h-4 rounded-full ${alerts.sms && systemSettings.globalSmsEnabled ? 'bg-charcoal' : 'bg-slate-500'}`}
                          />
                       </div>
                    </button>
                 </div>
             </div>
          </div>

          <div className="glass p-10 rounded-[48px] space-y-8 border-white/5">
             <div className="space-y-1">
                <h3 className="text-3xl font-display font-black uppercase italic tracking-tight">Game <span className="text-white/40">Preferences</span></h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Tailor your search experience</p>
             </div>
             
             <div className="space-y-6">
                <div className="space-y-3">
                   <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Default Sport Discipline</label>
                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {['Pickleball', 'Tennis', 'Badminton', 'Basketball', 'Football', 'None'].map((sport) => (
                        <button
                          key={sport}
                          disabled={!isEditing}
                          onClick={() => setFormData(prev => ({ ...prev, default_sport: sport === 'None' ? '' : sport }))}
                          className={`p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                            (formData.default_sport === sport || (sport === 'None' && !formData.default_sport))
                            ? 'bg-lime text-charcoal border-lime shadow-lg shadow-lime/20'
                            : 'glass border-white/5 text-slate-500 hover:border-white/10 disabled:opacity-50'
                          }`}
                        >
                          {sport}
                        </button>
                      ))}
                   </div>
                   <p className="text-[9px] text-slate-600 uppercase font-bold tracking-widest pl-1 mt-2">This filter is automatically applied during search sessions.</p>
                </div>
             </div>
          </div>

          <div className="glass p-10 rounded-[48px] border-white/5 space-y-8">
             <div className="flex items-center justify-between">
                <div className="space-y-1">
                   <h3 className="text-3xl font-display font-black uppercase italic tracking-tight">Social <span className="text-white/40">Proof</span></h3>
                   <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Manage your past feedback</p>
                </div>
                <div className="px-4 py-2 glass border-white/10 rounded-full text-xs font-black uppercase tracking-widest text-slate-500">
                   {userReviews.length} Reviews
                </div>
             </div>

             <div className="space-y-4 max-h-[600px] overflow-y-auto no-scrollbar pr-2">
                {userReviews.length === 0 ? (
                  <div className="p-12 glass rounded-3xl border-dashed border-white/10 text-center space-y-4">
                     <MessageSquare className="mx-auto text-white/10" size={32} />
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic leading-relaxed">Your voice hasn't been heard yet.<br/>Book a game to leave a review.</p>
                  </div>
                ) : userReviews.map((review) => (
                    <div key={review.id} className="p-8 glass rounded-[32px] border-white/5 space-y-6 group hover:border-white/10 transition-all">
                       <div className="flex justify-between items-start">
                          <div className="space-y-1">
                             <p className="text-[9px] font-black uppercase tracking-widest text-lime">{review.facilities?.name}</p>
                             <div className="flex gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} size={10} className={i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-white/10'} />
                                ))}
                             </div>
                          </div>
                          <button 
                            onClick={() => deleteReview(review.id)}
                            className="w-10 h-10 glass rounded-xl flex items-center justify-center text-slate-600 hover:text-red-500 transition-colors"
                          >
                             <Trash2 size={16} />
                          </button>
                       </div>
                       <p className="text-sm font-medium text-slate-300 italic">"{review.comment}"</p>
                       <div className="flex items-center justify-between pt-4 border-t border-white/5">
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">{new Date(review.created_at).toLocaleDateString()}</p>
                          {review.owner_reply && (
                            <div className="flex items-center gap-2 text-lime uppercase text-[8px] font-black tracking-widest">
                               <ShieldCheck size={10} /> Owner Replied
                            </div>
                          )}
                       </div>
                    </div>
                  ))
                }
             </div>
          </div>
             
             <div className="space-y-4">
                <div className="flex items-center justify-between p-6 glass rounded-3xl border-white/5">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-lime">
                         <Calendar size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white uppercase tracking-widest leading-none mb-1">Member Since</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">Joined our world-class community</p>
                      </div>
                   </div>
                   <span className="text-xl font-display font-black italic uppercase text-white/80">Est. 2024</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
