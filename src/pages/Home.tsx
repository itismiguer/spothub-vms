import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Star, Clock, Activity, Zap, Search, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import DiscoveryMap from '../components/DiscoveryMap';
import Selector from '../components/Selector';
import { Facility } from '../types';

export default function Home() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedSport, setSelectedSport] = useState('All');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [forcedCenter, setForcedCenter] = useState<{ lat: number; lng: number } | null>(null);
  const navigate = useNavigate();

  const CITIES = [
    { name: 'All', lat: 9.3068, lng: 123.3039 },
    { name: 'Dumaguete', lat: 9.3068, lng: 123.3039 },
    { name: 'Valencia', lat: 9.2828, lng: 123.2458 },
    { name: 'Sibulan', lat: 9.3562, lng: 123.2847 },
    { name: 'Bacong', lat: 9.2472, lng: 123.2950 }
  ];

  const SPORTS = [
    'All', 'Basketball', 'Pickleball', 'Tennis', 'Badminton', 'Volleyball', 
    'Gym', 'Swimming Pool', 'Football', 'Futsal', 'Padel'
  ];

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          // If the user denies or there's an issue, we just log it once gently
          // and don't spam the console if it's code 1 (PERMISSION_DENIED)
          if (error.code !== 1) {
            console.warn("Geolocation non-critical error:", error.message);
          }
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
      );
    }
  }, []);

  useEffect(() => {
    async function fetchFacilities() {
      try {
        const { data, error } = await supabase
          .from('facilities')
          .select('*')
          .limit(20);
        
        if (error) throw error;
        
        setFacilities((data || []).filter(f => f.status !== 'DEACTIVATED') as Facility[]);
      } catch (error) {
        console.error('Error fetching facilities:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchFacilities();
  }, []);

  const filteredFacilities = facilities
    .filter(f => {
      const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.address.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCity = selectedCity === 'All' || f.address.toLowerCase().includes(selectedCity.toLowerCase());
      const matchesSport = selectedSport === 'All' || f.type.toLowerCase().includes(selectedSport.toLowerCase());
      return matchesSearch && matchesCity && matchesSport;
    })
    .sort((a, b) => {
      if (!userLocation) return 0;
      const distA = Math.sqrt(Math.pow(a.lat - userLocation.lat, 2) + Math.pow(a.lng - userLocation.lng, 2));
      const distB = Math.sqrt(Math.pow(b.lat - userLocation.lat, 2) + Math.pow(b.lng - userLocation.lng, 2));
      return distA - distB;
    });

  return (
    <div className="space-y-12 pb-20">
      {/* Hero Section */}
      <section className="pt-10 relative">
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 relative z-10"
          >
            <div className="inline-flex items-center gap-2 bg-lime/10 backdrop-blur-md px-4 py-2 rounded-full border border-lime/20">
              <Zap size={14} className="text-lime fill-lime" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime">New Venues Added</span>
            </div>
            
            <h1 className="text-6xl sm:text-8xl font-display font-black tracking-tighter uppercase italic leading-[0.85]">
              Own The <span className="text-lime">Court</span>
              <br />
              Define The <span className="text-white/40">Game</span>
            </h1>
            
            <p className="text-slate-400 text-lg max-w-md leading-relaxed">
              Experience the future of sports reservations. Instant booking and real-time availability at your fingertips.
            </p>

            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                <input 
                  type="text"
                  placeholder="Search club or city..."
                  className="w-full h-14 bg-white/5 backdrop-blur-2xl border border-white/10 px-12 rounded-2xl focus:outline-none focus:border-lime/40 transition-colors focus:ring-2 focus:ring-lime/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative lg:block"
          >
            <div className="absolute inset-0 bg-lime/20 rounded-[40px] blur-3xl" />
            <div className="relative aspect-[4/3] sm:aspect-video glass rounded-[40px] overflow-hidden group">
              <DiscoveryMap 
                facilities={filteredFacilities} 
                onSelectFacility={(id) => navigate(`/facility/${id}`)} 
                userLocation={userLocation} 
                forcedCenter={forcedCenter}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Venues */}
      <section className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-4xl font-display font-black uppercase italic tracking-tight">Premium <span className="text-white/40">Venues</span></h2>
            <p className="text-slate-400 text-sm">Discover top-rated facilities near you.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* City Filter */}
            <div className="w-full sm:w-48">
              <Selector 
                options={CITIES.map(c => ({ id: c.name, label: c.name === 'All' ? 'Every City' : c.name }))}
                selectedId={selectedCity}
                onSelect={(id) => {
                  setSelectedCity(id);
                  const cityData = CITIES.find(c => c.name === id);
                  if (cityData && id !== 'All') {
                    setForcedCenter({ lat: cityData.lat, lng: cityData.lng });
                  } else {
                    setForcedCenter(null);
                  }
                }}
                variant="compact"
                placeholder="Choose City"
              />
            </div>

            {/* Sport Filter */}
            <div className="w-full sm:w-48">
              <Selector 
                options={SPORTS.map(s => ({ id: s, label: s === 'All' ? 'All Sports' : s }))}
                selectedId={selectedSport}
                onSelect={setSelectedSport}
                variant="compact"
                placeholder="Filter Sport"
              />
            </div>

            <button 
              onClick={() => { setSelectedCity('All'); setSelectedSport('All'); setSearchQuery(''); }}
              className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors ml-2"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="aspect-[4/3] glass rounded-[32px] animate-pulse" />)
          ) : filteredFacilities.length === 0 ? (
            <div className="col-span-full py-20 text-center">
               <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 border border-white/10 mb-4">
                 <Search size={24} className="text-white/20" />
               </div>
               <h3 className="text-xl font-display font-bold uppercase italic mb-2">No venues found</h3>
               <p className="text-slate-500 text-sm">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            filteredFacilities.map((f, idx) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Link to={`/facility/${f.id}`} className="group block space-y-4">
                  <div className="relative aspect-[4/3] rounded-[32px] overflow-hidden glass mb-4">
                    <img 
                      src={f.images?.[0] || 'https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=800'} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      alt={f.name} 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                    
                    <div className="absolute top-4 left-4 bg-lime/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-lime tracking-widest uppercase border border-lime/20">
                      {f.type}
                    </div>
                    
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white/80 text-xs">
                        <MapPin size={12} className="text-lime" />
                        {f.address.split(',')[0]}
                      </div>
                      <div className="flex items-center gap-1 glass px-2 py-1 rounded-lg text-[10px] font-bold">
                        <Star size={10} className="text-lime fill-lime" />
                        4.9
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1 px-2">
                    <h3 className="text-2xl font-display font-bold uppercase group-hover:text-lime transition-colors italic">
                      {f.name}
                    </h3>
                    <div className="flex items-center gap-4 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                       <span className="flex items-center gap-1"><Activity size={12} className="text-lime" /> Live Booking</span>
                       <span className="flex items-center gap-1"><Clock size={12} /> Open Now</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
