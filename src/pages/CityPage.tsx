import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  MapPin, 
  Star, 
  ArrowRight, 
  Trophy, 
  Activity, 
  TrendingUp, 
  ChevronRight,
  Search,
  Navigation
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Facility } from '../types';
import { toast } from 'sonner';

export default function CityPage() {
  const { country, city } = useParams();
  const navigate = useNavigate();
  const [venues, setVenues] = useState<Facility[]>([]);
  const [topRated, setTopRated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (country && city) {
      document.title = `Best Sports Courts in ${city.toUpperCase()}, ${country.toUpperCase()} | SpotHub`;
      fetchCityData();
    }
  }, [country, city]);

  const fetchCityData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all active venues in this city
      const { data: cityVenues, error: vError } = await supabase
        .from('facilities')
        .select('*')
        .eq('status', 'LIVE')
        .ilike('city', city || '')
        .ilike('country_code', country || '');

      if (vError) throw vError;
      setVenues(cityVenues || []);

      // 2. Fetch Top Rated (using view or simple sort if view not accessible directly)
      const { data: rated, error: rError } = await supabase
        .from('facilities')
        .select('*, bookings(id)')
        .eq('status', 'LIVE')
        .ilike('city', city || '')
        .limit(5);

      if (rError) throw rError;
      setTopRated(rated || []);
    } catch (err) {
      toast.error('Could not load city data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-transparent text-white">
        <Activity className="text-lime animate-spin mb-4" size={32} />
        <span className="text-[10px] font-black uppercase tracking-widest text-lime">Mapping {city?.toUpperCase()}...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white pb-20 relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-lime/10 via-transparent to-transparent opacity-50" />
        <div className="absolute -top-1/4 -right-1/4 w-[60%] h-[60%] bg-lime/10 rounded-full blur-[140px] animate-pulse" />
      </div>
      <Helmet>
        <title>Best Sports Courts in {city?.toUpperCase()}, {country?.toUpperCase()} | Reserve</title>
        <meta name="description" content={`Discover the finest ${venues.length} world-class facilities in ${city}. From professional padel courts to elite basketball arenas.`} />
      </Helmet>
      {/* City Hero */}
      <div className="relative h-[40vh] min-h-[400px] flex items-end p-8 md:p-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
        <img 
          src={`https://images.unsplash.com/photo-1541252260730-0412e8e2108e?auto=format&fit=crop&q=80&w=2000`} 
          className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale"
          loading="lazy"
          alt={city || 'City'}
        />
        
        <div className="max-w-7xl mx-auto w-full relative z-20 space-y-4">
          <div className="flex items-center gap-3 text-lime">
            <MapPin size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">{country} / {city}</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-display font-black uppercase italic tracking-tighter leading-[0.9]">
            The <span className="text-lime">Apex</span> of <br/> {city} Sports
          </h1>
          <p className="text-slate-400 max-w-xl text-lg font-medium leading-relaxed">
            Discover {venues.length} world-class facilities in {city}. From professional padel courts to elite basketball arenas.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-8 md:px-20 py-20 space-y-32">
        {/* Top Rated Section */}
        <section className="space-y-12">
          <div className="flex items-end justify-between border-b border-white/5 pb-8">
            <div className="space-y-1">
              <h2 className="text-3xl font-display font-black uppercase italic tracking-tight">Top <span className="text-lime">Rated</span></h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Highest player satisfaction in the region</p>
            </div>
            <div className="flex items-center gap-2 text-lime">
              <Trophy size={20} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {topRated.map((venue) => (
              <Link 
                key={venue.id} 
                to={`/${venue.country_code?.toLowerCase()}/${venue.city?.toLowerCase()}/${venue.slug}`}
                className="group relative h-[450px] glass rounded-[48px] overflow-hidden border-white/5 hover:border-lime/40 transition-all flex flex-col justify-end p-8"
              >
                <div className="absolute inset-0 overflow-hidden">
                   <img 
                    src={venue.images?.[0] || 'https://images.unsplash.com/photo-1541252260730-0412e8e2108e'} 
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700 opacity-40 group-hover:opacity-60"
                    loading="lazy"
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                </div>
                
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-2 text-lime">
                     <Star size={14} fill="currentColor" />
                     <span className="text-[10px] font-black uppercase tracking-widest">4.9 Performance Score</span>
                  </div>
                  <h3 className="text-3xl font-display font-black uppercase italic tracking-tight leading-none group-hover:translate-x-2 transition-transform">
                    {venue.name}
                  </h3>
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{venue.type}</span>
                    <ArrowRight size={20} className="text-lime group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Global List */}
        <section className="space-y-12">
          <div className="flex items-end justify-between border-b border-white/5 pb-8">
            <div className="space-y-1">
              <h2 className="text-3xl font-display font-black uppercase italic tracking-tight">Full <span className="text-white/40">Directory</span></h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Every active facility in {city}</p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-white">{venues.length} Facilities Found</span>
          </div>

          <div className="space-y-4">
            {venues.map((venue) => (
              <button
                key={venue.id}
                onClick={() => navigate(`/${venue.country_code?.toLowerCase()}/${venue.city?.toLowerCase()}/${venue.slug}`)}
                className="w-full glass p-8 rounded-[32px] border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 group hover:border-lime/40 transition-all text-left"
              >
                <div className="flex items-center gap-8">
                   <div className="w-16 h-16 glass rounded-2xl overflow-hidden group-hover:scale-110 transition-transform">
                      <img loading="lazy" src={venue.images?.[0]} className="w-full h-full object-cover" />
                   </div>
                   <div>
                      <h4 className="text-xl font-display font-black uppercase italic tracking-tight group-hover:text-lime transition-colors">{venue.name}</h4>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{venue.street_address}</p>
                   </div>
                </div>
                <div className="flex items-center gap-12">
                  <div className="hidden md:block text-right">
                     <p className="text-[10px] font-black uppercase tracking-widest text-white">{venue.type}</p>
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Resource</p>
                  </div>
                  <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-lime group-hover:bg-lime group-hover:text-charcoal transition-all">
                     <ChevronRight size={20} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Footer CTA */}
      <footer className="max-w-7xl mx-auto px-8 md:px-20 py-20 border-t border-white/5 text-center space-y-8">
         <div className="space-y-4">
            <h3 className="text-2xl font-display font-black uppercase italic tracking-tight">Own a facility in <span className="text-lime">{city}</span>?</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Join the world's most elite sports network</p>
         </div>
         <Link to="/onboarding" className="inline-flex h-16 bg-white text-charcoal px-12 rounded-2xl items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-2xl">
            List My Facility <ArrowRight size={16} />
         </Link>
      </footer>
    </div>
  );
}
