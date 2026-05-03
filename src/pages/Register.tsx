import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Star, ShieldCheck, Trophy, ArrowRight, Lock, Mail, Phone, User as UserIcon, Building2, MapPin, Upload, FileCheck, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

export default function Register() {
  const { login, loginWithApple, registerWithEmail, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/";

  React.useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const [step, setStep] = React.useState<'ROLE' | 'FORM' | 'VERIFICATION'>('ROLE');
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'PLAYER' as 'PLAYER' | 'OWNER',
    business_name: '',
    business_address: '',
  });
  const [honeypot, setHoneypot] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (honeypot) return;

    if (step === 'FORM') {
      if (formData.role === 'OWNER') {
        setStep('VERIFICATION');
        return;
      }
    }

    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Complete your profile to continue.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      let verification_doc_url = '';
      if (formData.role === 'OWNER' && file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `verification/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);
        
        verification_doc_url = publicUrl;
      }

      await registerWithEmail(formData.email, formData.password, formData.name, formData.role, {
        business_name: formData.business_name,
        business_address: formData.business_address,
        verification_doc_url,
        verification_status: formData.role === 'OWNER' ? 'pending' : undefined
      });
      
      toast.success(formData.role === 'OWNER' ? "Registration pending admin approval." : "Welcome to RESERVE!");
    } catch (err: any) {
      toast.error(err.message || "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal flex flex-col items-center justify-center p-6 relative overflow-x-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-charcoal" />
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-lime/20 via-transparent to-transparent opacity-50" />
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-lime/10 rounded-full blur-[160px] animate-pulse" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-[95%] max-w-lg space-y-10 relative z-10 py-12 mx-auto"
      >
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 bg-lime rounded-[32px] flex items-center justify-center shadow-[0_0_50px_rgba(181,245,90,0.5)] rotate-6">
            <Activity className="text-charcoal fill-charcoal" size={40} />
          </div>
          <div className="space-y-4">
            <h1 className="text-6xl sm:text-7xl font-display font-black uppercase italic tracking-tighter text-white leading-[0.8]">
              Join <br/><span className="text-lime">RESERVE</span>
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-xs italic">The Ultimate Athlete Registry</p>
          </div>
        </div>

        <form onSubmit={handleAction} className="glass p-8 sm:p-10 rounded-[56px] border border-white/5 space-y-8 backdrop-blur-3xl shadow-[0_40px_80px_rgba(0,0,0,0.6)]">
          <AnimatePresence mode="wait">
            {step === 'ROLE' && (
              <motion.div 
                key="role-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-2xl text-white font-black uppercase italic italic tracking-tighter">Choose Your Role</h2>
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.2em]">Select how you will use the platform</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, role: 'PLAYER' }));
                      setStep('FORM');
                    }}
                    className="group relative overflow-hidden glass p-8 rounded-[40px] border border-white/5 hover:border-lime/50 transition-all text-left flex items-center gap-6"
                  >
                    <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center group-hover:bg-lime group-hover:text-charcoal transition-all">
                      <Trophy size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl text-white font-black uppercase italic leading-none mb-1">I am a Player</h3>
                      <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Book courts and join tournaments</p>
                    </div>
                    <ArrowRight className="ml-auto text-slate-700 group-hover:text-lime group-hover:translate-x-2 transition-all" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, role: 'OWNER' }));
                      setStep('FORM');
                    }}
                    className="group relative overflow-hidden glass p-8 rounded-[40px] border border-white/5 hover:border-lime/50 transition-all text-left flex items-center gap-6"
                  >
                    <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center group-hover:bg-lime group-hover:text-charcoal transition-all">
                      <ShieldCheck size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl text-white font-black uppercase italic leading-none mb-1">I am a Court Owner</h3>
                      <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Manage facilities and staff</p>
                    </div>
                    <ArrowRight className="ml-auto text-slate-700 group-hover:text-lime group-hover:translate-x-2 transition-all" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'FORM' && (
              <motion.div 
                key="form-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <input 
                  type="text" 
                  name="user_birth_year" 
                  className="hidden" 
                  autoComplete="off"
                  tabIndex={-1}
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={() => setStep('ROLE')}
                  className="flex items-center gap-2 text-slate-500 hover:text-white mb-4 transition-colors"
                >
                  <ArrowLeft size={16} />
                  <span className="text-[10px] uppercase font-black tracking-widest">Back to Origin</span>
                </button>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-2">Full Athlete Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        required
                        type="text" 
                        placeholder="Ex. ROGER FEDERER"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
                        className="w-full glass border-white/10 p-5 pl-14 rounded-3xl text-sm font-black uppercase italic tracking-widest focus:border-lime/60 transition-all text-white placeholder:text-white/10"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        required
                        type="email" 
                        placeholder="ROGER@CHAMPION.COM"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full glass border-white/10 p-5 pl-14 rounded-3xl text-sm font-black uppercase italic tracking-widest focus:border-lime/60 transition-all text-white placeholder:text-white/10"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-2">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        required
                        type="password" 
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full glass border-white/10 p-5 pl-14 rounded-3xl text-sm font-black uppercase italic tracking-widest focus:border-lime/60 transition-all text-white placeholder:text-white/10"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-lime text-charcoal py-7 rounded-[32px] font-display font-black uppercase italic tracking-tighter text-3xl hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-lime/20 flex items-center justify-center gap-4 group"
                  >
                    {formData.role === 'OWNER' ? 'Next Step' : 'Sign Up'} <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'VERIFICATION' && (
              <motion.div 
                key="verification-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <button 
                  type="button"
                  onClick={() => setStep('FORM')}
                  className="flex items-center gap-2 text-slate-500 hover:text-white mb-4 transition-colors"
                >
                  <ArrowLeft size={16} />
                  <span className="text-[10px] uppercase font-black tracking-widest">Back to Profile</span>
                </button>

                <div className="text-center space-y-2 mb-4">
                  <h2 className="text-2xl text-white font-black uppercase italic tracking-tighter">Verification</h2>
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.2em]">Required for Court Owners</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-2">Business Name</label>
                    <div className="relative">
                      <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        required
                        type="text" 
                        placeholder="Ex. LUKAS SPORT CENTER"
                        value={formData.business_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value.toUpperCase() }))}
                        className="w-full glass border-white/10 p-5 pl-14 rounded-3xl text-sm font-black uppercase italic tracking-widest focus:border-lime/60 transition-all text-white placeholder:text-white/10"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-2">Business Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        required
                        type="text" 
                        placeholder="STREET, CITY, PROVINCE"
                        value={formData.business_address}
                        onChange={(e) => setFormData(prev => ({ ...prev, business_address: e.target.value.toUpperCase() }))}
                        className="w-full glass border-white/10 p-5 pl-14 rounded-3xl text-sm font-black uppercase italic tracking-widest focus:border-lime/60 transition-all text-white placeholder:text-white/10"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-2">Proof of Ownership</label>
                    <div className="relative">
                      <label className="flex flex-col items-center justify-center w-full glass border-2 border-dashed border-white/10 hover:border-lime/50 p-8 rounded-[40px] cursor-pointer transition-all space-y-4 group">
                        {file ? (
                          <>
                            <div className="w-16 h-16 bg-lime text-charcoal rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(181,245,90,0.3)]">
                              <FileCheck size={32} />
                            </div>
                            <div className="text-center">
                              <p className="text-white text-xs font-black uppercase italic">{file.name}</p>
                              <p className="text-lime text-[10px] uppercase font-black tracking-widest mt-1">Ready to sync</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-16 h-16 bg-white/5 text-slate-500 rounded-3xl flex items-center justify-center group-hover:bg-lime group-hover:text-charcoal transition-all">
                              <Upload size={32} />
                            </div>
                            <div className="text-center">
                              <p className="text-white text-xs font-black uppercase italic">Upload Permit / DTI</p>
                              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">PDF or Image (Max 10MB)</p>
                            </div>
                          </>
                        )}
                        <input 
                          type="file" 
                          className="hidden" 
                          accept=".pdf,image/*"
                          onChange={handleFileChange}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    disabled={isSubmitting || !file}
                    type="submit"
                    className="w-full bg-lime text-charcoal py-7 rounded-[32px] font-display font-black uppercase italic tracking-tighter text-3xl hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-lime/20 flex items-center justify-center gap-4 group disabled:opacity-50"
                  >
                    {isSubmitting ? 'Syncing...' : 'Complete Registration'} <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {step === 'ROLE' && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-4">
                <div className="h-[1px] flex-1 bg-white/10" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">SOCIAL CONNECT</span>
                <div className="h-[1px] flex-1 bg-white/10" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => login()}
                  className="w-full glass border-white/10 py-5 rounded-[24px] font-bold uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all flex items-center justify-center gap-3 text-white"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </button>

                <button
                  type="button"
                  onClick={() => loginWithApple()}
                  className="w-full glass border-white/10 py-5 rounded-[24px] font-bold uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all flex items-center justify-center gap-3 text-white"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M17.05 20.28c-.96.95-2.04 1.72-3.23 1.72-1.12 0-1.46-.71-2.81-.71-1.35 0-1.74.7-2.81.71-1.14.01-2.11-.69-3.15-1.72C3.12 18.35 1 15.35 1 12.39c0-3.37 2.19-5.15 4.31-5.15 1.13 0 2.2.78 2.88.78.68 0 1.95-.87 3.32-.87 1.43 0 2.6.48 3.43 1.43-2.6 1.4-2.18 4.99.31 6.02-1.07 2.41-2.31 4.79-3.2 5.68zM12.03 6.25c-.02-2.15 1.77-3.99 3.86-4.25.17 2.45-2.22 4.41-3.86 4.25z" />
                  </svg>
                  Apple
                </button>
              </div>
            </div>
          )}
        </form>

        <div className="flex flex-col items-center gap-4">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
            Already registered? <button onClick={() => navigate('/login')} className="text-lime hover:underline font-bold">Log In</button>
          </p>
          <button 
            onClick={() => navigate('/')}
            className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px] hover:text-white transition-colors p-4"
          >
            Return to home
          </button>
        </div>
      </motion.div>
    </div>
  );
}
