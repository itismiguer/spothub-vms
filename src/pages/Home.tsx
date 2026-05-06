import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  MapPin, 
  ArrowRight, 
  Activity,
  ChevronRight,
  Star,
  Zap,
  Globe,
  Radio,
  Clock,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Facility } from '../types';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [citySearch, setCitySearch] = useState('');
  const [cities, setCities] = useState<{ city: string; country_code: string }[]>([]);
  const [showCities, setShowCities] = useState(false);
  const [trending, setTrending] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: cityData } = await supabase
        .from('venues')
        .select('city, country_code')
        .eq('status', 'LIVE');
      
      if (cityData) {
        const uniqueCities = Array.from(new Set(cityData.map(c => `${c.city}|${c.country_code}`)))
          .map(str => {
            const [city, country_code] = str.split('|');
            return { city, country_code };
          });
        setCities(uniqueCities);
      }

      const { data: trendData } = await supabase
        .from('venues')
        .select('*')
        .eq('status', 'LIVE')
        .order('id', { ascending: true }) // Using alphabetical for "Premium" feel
        .limit(6);
      
      setTrending(trendData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCities = cities.filter(c => 
    c.city?.toLowerCase().includes(citySearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-transparent text-white relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-lime/10 via-transparent to-transparent opacity-50" />
        <div className="absolute -top-1/4 -right-1/4 w-[60%] h-[60%] bg-lime/10 rounded-full blur-[140px] animate-pulse" />
      </div>
      <Helmet>
        <title>Reserve | Book Elite Sports Venues Locally and Globally</title>
        <meta name="description" content="Discover and book professional sports courts near you. Padel, Pickleball, Tennis and more." />
      </Helmet>

      {/* Hero Section */}
      <section className="relative pt-20 pb-8 px-8 overflow-hidden">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          
          {/* Left Column: Content */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-10"
          >
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-lime/30 rounded-full text-lime bg-lime/5">
                <Zap size={14} fill="currentColor" />
                <span className="text-[10px] font-black uppercase tracking-widest">New Venues Added</span>
              </div>
              
              <h1 className="text-6xl md:text-8xl font-display font-black uppercase italic tracking-tighter leading-[0.85] text-white">
                Own the <br /> 
                <span className="text-lime">Court</span> <br />
                Define the <br />
                <span className="text-white/40">Game</span>
              </h1>
              
              <p className="max-w-md text-slate-400 text-lg leading-relaxed font-medium">
                Experience the future of sports reservations. Instant booking and real-time availability at your fingertips.
              </p>

        <div className="flex flex-wrap gap-4 pt-4">
          {!user ? (
            <>
              <Link 
                to="/register"
                className="bg-lime text-charcoal px-8 py-5 rounded-[32px] font-black uppercase tracking-widest text-[11px] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-lime/20 flex items-center gap-3 group"
              >
                Join the Network
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                to="/login"
                className="px-8 py-5 rounded-[32px] font-black uppercase tracking-widest text-[11px] border border-white/10 hover:bg-white/5 transition-all flex items-center justify-center text-white"
              >
                Operator Login
              </Link>
            </>
          ) : (
            <Link 
              to="/owner"
              className="bg-lime text-charcoal px-8 py-5 rounded-[32px] font-black uppercase tracking-widest text-[11px] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-lime/20 flex items-center gap-3 group"
            >
              Enter Control Center
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>
            </div>

            <div className="max-w-md relative group">
              <div className="relative flex items-center">
                <input 
                  type="text" 
                  placeholder="Search club or city..."
                  value={citySearch}
                  onChange={(e) => {
                    setCitySearch(e.target.value);
                    setShowCities(true);
                  }}
                  onFocus={() => setShowCities(true)}
                  className="w-full h-16 bg-white/[0.03] border border-white/5 p-6 rounded-2xl text-sm focus:border-lime/40 outline-none transition-all placeholder:text-slate-600"
                />
                
                <AnimatePresence>
                  {showCities && citySearch && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-18 left-0 right-0 glass border-white/10 p-2 rounded-2xl z-50 max-h-[300px] overflow-y-auto"
                    >
                      {filteredCities.map((c) => (
                        <button
                          key={`${c.city}-${c.country_code}`}
                          onClick={() => {
                            navigate(`/${c.country_code.toLowerCase()}/${c.city.toLowerCase()}`);
                            setShowCities(false);
                          }}
                          className="w-full p-4 flex items-center justify-between hover:bg-white/5 rounded-xl transition-all group/item text-left"
                        >
                          <div className="flex items-center gap-3">
                             <MapPin className="text-slate-500 group-hover/item:text-lime" size={16} />
                             <span className="text-[11px] font-bold uppercase tracking-widest">{c.city}, {c.country_code}</span>
                          </div>
                          <ChevronRight size={14} className="text-slate-500 group-hover/item:translate-x-1 transition-all" />
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Interactive Card */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden lg:block relative"
          >
            <div className="glass rounded-[48px] border-white/5 p-12 aspect-[4/3] flex flex-col items-center justify-center text-center space-y-8 relative overflow-hidden group">
              {/* Background Map-like texture */}
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#333_1px,_transparent_1px)] [background-size:20px_20px]" />
              </div>
              
              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-[0_0_50px_rgba(255,255,255,0.05)]">
                <Globe className="text-white/40" size={40} />
              </div>

              <div className="space-y-4 relative z-10">
                <h3 className="text-2xl font-display font-black uppercase italic tracking-tight">Interactive Network</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 max-w-[200px] mx-auto leading-relaxed">
                  Visualizing {trending.length} Premium Sport Venues Across the Region.
                </p>
              </div>

              <div className="px-6 py-2 bg-white/5 border border-white/10 rounded-full flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-lime rounded-full animate-ping" />
                <span className="text-[9px] font-black uppercase tracking-widest">Incredoball Sports Center</span>
              </div>

              <div className="pt-8 flex items-center gap-2 text-lime/40">
                <Radio size={14} />
                <span className="text-[8px] font-black uppercase tracking-widest">Coordinates Active / Live Monitoring</span>
              </div>

              {/* Glow effect */}
              <div className="absolute -inset-[100%] bg-lime/10 blur-[120px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Premium Venues Section */}
      <section className="max-w-[1440px] mx-auto px-8 pt-4 pb-32 space-y-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-12">
          <div className="space-y-2">
            <h2 className="text-4xl font-display font-black uppercase italic tracking-tight">
              Premium <span className="text-white/40">Venues</span>
            </h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Discover top-rated facilities near you.</p>
          </div>

          <div className="flex items-center gap-3">
             <button 
               onClick={() => navigate('/search')}
               className="h-12 px-6 glass rounded-2xl border-white/5 hover:border-white/20 transition-all flex items-center gap-3 group"
             >
                <div className="w-1.5 h-1.5 bg-lime rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-widest">Every City</span>
                <ChevronRight size={14} className="rotate-90 text-slate-500" />
             </button>
             <button 
               onClick={() => navigate('/search')}
               className="h-12 px-6 glass rounded-2xl border-white/5 hover:border-white/20 transition-all flex items-center gap-3 group"
             >
                <div className="w-1.5 h-1.5 bg-lime rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-widest">All Sports</span>
                <ChevronRight size={14} className="rotate-90 text-slate-500" />
             </button>
             <button 
               onClick={() => {
                 setCitySearch('');
                 navigate('/search');
               }}
               className="h-12 px-6 text-slate-500 hover:text-white transition-all"
             >
                <span className="text-[10px] font-black uppercase tracking-widest">Reset</span>
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {trending.map((v) => (
            <Link 
              key={v.id} 
              to={`/${v.country_code?.toLowerCase()}/${v.city?.toLowerCase()}/${v.slug}`}
              className="group space-y-6"
            >
              <div className="h-[400px] relative rounded-[40px] overflow-hidden border border-white/5">
                <img 
                  loading="lazy" 
                  src={v.images?.[0]} 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                
                {/* Bottom Left: Location */}
                <div className="absolute bottom-10 left-10 flex items-center gap-2">
                  <MapPin size={14} className="text-lime" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{v.city.toUpperCase()} ROAD</span>
                </div>

                {/* Bottom Right: Rating */}
                <div className="absolute bottom-10 right-10 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                  <Star size={10} className="text-lime" fill="currentColor" />
                  <span className="text-[10px] font-black">4.9</span>
                </div>
              </div>

              <div className="px-4 space-y-3">
                <h3 className="text-3xl font-display font-black uppercase italic tracking-tight">{v.name}</h3>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-lime" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Booking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-lime" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Open Now</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
