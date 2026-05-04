import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Mail, Lock, ArrowRight, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export default function Login() {
  const { login, loginWithApple, loginWithEmail, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/";

  React.useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const [formData, setFormData] = React.useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error("Credentials required for entry.");
      return;
    }

    setIsSubmitting(true);
    try {
      await loginWithEmail(formData.email.toLowerCase().trim(), formData.password);
      toast.success("Welcome back, Athlete.");
    } catch (error: any) {
      toast.error(error.message || "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-charcoal" />
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-lime/20 via-transparent to-transparent opacity-50" />
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-lime/10 rounded-full blur-[160px] animate-pulse" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-[95%] max-w-lg space-y-10 relative z-10 mx-auto"
      >
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 bg-lime rounded-[32px] flex items-center justify-center shadow-[0_0_50px_rgba(181,245,90,0.5)] rotate-6">
            <Activity className="text-charcoal fill-charcoal" size={40} />
          </div>
          <div className="space-y-4">
            <h1 className="text-6xl sm:text-7xl font-display font-black uppercase italic tracking-tighter text-white leading-[0.8]">
              Welcome <br/><span className="text-lime">Back</span>
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-xs italic">Secure Access to the Arena</p>
          </div>
        </div>

        <form onSubmit={handleAction} className="glass p-10 rounded-[56px] border border-white/5 space-y-8 backdrop-blur-3xl shadow-[0_40px_80px_rgba(0,0,0,0.6)]">
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  required
                  type="email" 
                  placeholder="Athlete Email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full glass border-white/10 p-5 pl-14 rounded-3xl text-sm font-bold italic tracking-widest focus:border-lime/60 transition-all text-white placeholder:text-white/10"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  required
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full glass border-white/10 p-5 pl-14 pr-14 rounded-3xl text-sm font-bold italic tracking-widest focus:border-lime/60 transition-all text-white placeholder:text-white/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 space-y-6">
            <button
              disabled={isSubmitting}
              type="submit"
              className="w-full bg-lime text-charcoal py-7 rounded-[32px] font-display font-black uppercase italic tracking-tighter text-3xl hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-lime/20 flex items-center justify-center gap-4 group disabled:opacity-50"
            >
              Connect <ArrowRight className="group-hover:translate-x-2 transition-transform" />
            </button>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-[1px] flex-1 bg-white/10" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">OR CONTINUE WITH</span>
                <div className="h-[1px] flex-1 bg-white/10" />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => login()}
                  className="w-full glass border-white/10 py-5 rounded-[24px] font-bold uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all flex items-center justify-center gap-3 text-white group"
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
                  className="w-full glass border-white/10 py-5 rounded-[24px] font-bold uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all flex items-center justify-center gap-3 text-white group"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M17.05 20.28c-.96.95-2.04 1.72-3.23 1.72-1.12 0-1.46-.71-2.81-.71-1.35 0-1.74.7-2.81.71-1.14.01-2.11-.69-3.15-1.72C3.12 18.35 1 15.35 1 12.39c0-3.37 2.19-5.15 4.31-5.15 1.13 0 2.2.78 2.88.78.68 0 1.95-.87 3.32-.87 1.43 0 2.6.48 3.43 1.43-2.6 1.4-2.18 4.99.31 6.02-1.07 2.41-2.31 4.79-3.2 5.68zM12.03 6.25c-.02-2.15 1.77-3.99 3.86-4.25.17 2.45-2.22 4.41-3.86 4.25z" />
                  </svg>
                  Apple
                </button>
              </div>
            </div>
          </div>
        </form>

        <div className="flex flex-col items-center gap-4">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
            First time in the arena? <button onClick={() => navigate('/register')} className="text-lime hover:underline font-bold">Sign Up</button>
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
