import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search as SearchIcon, 
  Filter, 
  Map as MapIcon, 
  LayoutGrid, 
  Star, 
  MapPin, 
  Activity, 
  Utensils, 
  Car, 
  Home,
  ChevronDown,
  X,
  SlidersHorizontal,
  Navigation,
  Loader2
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Facility, Court } from '../types';
import DiscoveryMap from '../components/DiscoveryMap';
import { FavoriteButton } from '../components/FavoriteButton';

export default function SearchPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [facilities, setFacilities] = useState<any[]>([]);
  
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSport, setSelectedSport] = useState('All');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [lifestyle, setLifestyle] = useState({
    food: false,
    indoor: false,
    parking: false
  });

  useEffect(() => {
    if (profile?.default_sport) {
      setSelectedSport(profile.default_sport);
    }
  }, [profile]);

  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    try {
      // Fetch facilities with their courts and average ratings
      const { data, error } = await supabase
        .from('facilities')
        .select(`
          *,
          courts (*),
          reviews (rating)
        `)
        .eq('status', 'LIVE');

      if (error) throw error;

      const processed = data?.map(f => {
        const ratings = f.reviews?.map((r: any) => r.rating) || [];
        const avgRating = ratings.length > 0 
          ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length 
          : 0;
        
        // Find starting price
        const filteredCourts = f.courts?.filter((c: any) => !c.deleted_at);
        const minPrice = filteredCourts?.length > 0 
          ? Math.min(...filteredCourts.map((c: any) => c.hourly_rate))
          : 0;

        // Get unique sports
        const sports = Array.from(new Set(filteredCourts?.map((c: any) => c.sport) || []));

        return {
          ...f,
          courts: filteredCourts,
          avgRating,
          minPrice,
          sports
        };
      });

      setFacilities(processed || []);
    } catch (err: any) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const allAvailableSports = useMemo(() => {
    const sportsSet = new Set<string>();
    facilities.forEach(f => f.sports?.forEach((s: string) => sportsSet.add(s)));
    return ['All', ...Array.from(sportsSet)];
  }, [facilities]);

  const filteredFacilities = useMemo(() => {
    return facilities.filter(f => {
      const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           f.city.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSport = selectedSport === 'All' || f.sports?.includes(selectedSport);
      const matchesPrice = f.minPrice >= priceRange[0] && f.minPrice <= priceRange[1];
      const matchesFood = !lifestyle.food || f.has_canteen || f.allow_outside_food;
      const matchesIndoor = !lifestyle.indoor || f.courts?.some((c: any) => c.environment === 'INDOOR');
      const matchesParking = !lifestyle.parking || f.amenities?.includes('parking');

      return matchesSearch && matchesSport && matchesPrice && matchesFood && matchesIndoor && matchesParking;
    });
  }, [facilities, searchTerm, selectedSport, priceRange, lifestyle]);

  return (
    <div className="min-h-screen bg-transparent relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-lime/10 via-transparent to-transparent opacity-50" />
        <div className="absolute -top-1/4 -right-1/4 w-[60%] h-[60%] bg-lime/10 rounded-full blur-[140px] animate-pulse" />
      </div>
      <Helmet>
        <title>Discover Championship Venues | Reserve</title>
        <meta name="description" content="Find and book the best sports venues near you. Pickleball, Padel, Tennis and more." />
      </Helmet>
      {/* Search Header */}
      <div className="glass border-b border-white/5 p-6 sticky top-0 z-[50]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 items-center">
          <div className="relative flex-1 group">
            <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-lime transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search by city or venue name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full glass border-white/10 p-5 pl-16 rounded-[28px] text-xs font-black uppercase tracking-widest focus:border-lime/60 transition-all outline-none text-white placeholder:text-white/20"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => setShowMap(!showMap)}
              className="flex-1 md:flex-none glass border-white/5 px-8 py-5 rounded-[28px] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white/5 transition-all text-white"
            >
              {showMap ? <LayoutGrid size={16} className="text-lime" /> : <MapIcon size={16} className="text-lime" />}
              {showMap ? 'Show Grid' : 'Show Map'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row min-h-[calc(100vh-113px)]">
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-80 glass border-r border-white/5 p-8 lg:sticky lg:top-[113px] h-fit lg:h-[calc(100vh-113px)] overflow-y-auto space-y-10 custom-scrollbar">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <SlidersHorizontal size={16} className="text-lime" />
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Experience Filters</h3>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Sport Discipline</label>
              <div className="flex flex-wrap gap-2">
                {allAvailableSports.map(sport => (
                  <button 
                    key={sport}
                    onClick={() => setSelectedSport(sport)}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                      selectedSport === sport ? 'bg-lime text-charcoal border-lime' : 'glass border-white/5 text-slate-500 hover:border-white/10'
                    }`}
                  >
                    {sport}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Hourly Price</label>
                 <span className="text-[10px] font-black text-lime">UP TO {priceRange[1]}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="5000" 
                step="100"
                value={priceRange[1]}
                onChange={e => setPriceRange([0, parseInt(e.target.value)])}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-lime"
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Lifestyle & Amenities</label>
              <div className="space-y-3">
                {[
                  { id: 'food', label: 'Food Available', icon: <Utensils size={14} /> },
                  { id: 'indoor', label: 'Indoor Facility', icon: <Home size={14} /> },
                  { id: 'parking', label: 'Free Parking', icon: <Car size={14} /> }
                ].map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => setLifestyle(p => ({ ...p, [item.id]: !p[item.id as keyof typeof p] }))}
                    className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all group ${
                      lifestyle[item.id as keyof typeof lifestyle] ? 'bg-lime/10 border-lime/30 text-lime' : 'glass border-white/5 text-slate-500 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                    </div>
                    <div className={`w-2 h-2 rounded-full transition-all ${lifestyle[item.id as keyof typeof lifestyle] ? 'bg-lime shadow-[0_0_8px_rgba(190,242,2,0.6)]' : 'bg-white/10'}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Results Area */}
        <main className="flex-1 p-8">
           <AnimatePresence mode="wait">
             {loading ? (
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="flex flex-col items-center justify-center py-32 gap-4"
               >
                 <Loader2 size={40} className="text-lime animate-spin" />
                 <p className="text-[10px] font-black uppercase tracking-widest text-lime">Scanning Global Venues...</p>
               </motion.div>
             ) : showMap ? (
               <motion.div 
                 key="map"
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 className="h-[calc(100vh-180px)] rounded-[48px] overflow-hidden glass border-white/5 shadow-2xl relative"
               >
                  <DiscoveryMap 
                    facilities={filteredFacilities.map(f => ({
                      ...f,
                      lat: f.latitude,
                      lng: f.longitude,
                      type: 'FACILITY' // generic type for markers
                    }))} 
                    onSelectFacility={(f) => navigate(`/${f.country_code?.toLowerCase()}/${f.city?.toLowerCase()}/${f.slug}`)} 
                  />
                  <div className="absolute top-8 left-8 glass p-6 rounded-3xl border-white/10 z-10">
                     <p className="text-[10px] font-black uppercase tracking-widest text-white">{filteredFacilities.length} Venues in View</p>
                  </div>
               </motion.div>
             ) : (
               <motion.div 
                 key="grid"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8"
               >
                 {filteredFacilities.map((facility) => (
                   <Link 
                     key={facility.id}
                     to={`/${facility.country_code?.toLowerCase()}/${facility.city?.toLowerCase()}/${facility.slug}`}
                     className="glass rounded-[48px] border-white/5 overflow-hidden group hover:border-lime/40 transition-all flex flex-col"
                   >
                     <div className="aspect-[16/10] relative overflow-hidden bg-white/5">
                        <img 
                          src={facility.images?.[0] || 'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?q=80&w=1200&auto=format&fit=crop'} 
                          alt={facility.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-6 left-6 flex gap-2">
                           <div className="px-4 py-2 glass rounded-full flex items-center gap-2 border-white/10">
                              <Star size={10} className="text-lime fill-lime" />
                              <span className="text-[10px] font-black text-white">{facility.avgRating > 0 ? facility.avgRating.toFixed(1) : 'NEW'}</span>
                           </div>
                        </div>
                        <div className="absolute top-6 right-6">
                           <FavoriteButton facilityId={facility.id} />
                        </div>
                        <div className="absolute bottom-6 right-6">
                           <div className="px-6 py-3 bg-lime text-charcoal rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-lime/20">
                             STARTS {facility.currency_code} {facility.minPrice}
                           </div>
                        </div>
                     </div>

                     <div className="p-8 space-y-6">
                        <div className="space-y-2">
                           <div className="flex items-center gap-2 text-[9px] font-black text-lime uppercase tracking-widest">
                              <Navigation size={10} />
                              {facility.city}, {facility.state_province}
                           </div>
                           <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white group-hover:text-lime transition-colors">{facility.name}</h3>
                        </div>

                        <div className="flex flex-wrap gap-2">
                           {facility.sports?.map((s: string) => (
                             <span key={s} className="px-3 py-1 glass border-white/5 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-400">
                                {s}
                             </span>
                           ))}
                           {facility.amenities?.slice(0, 3).map((a: string) => (
                             <span key={a} className="px-3 py-1 glass border-white/5 rounded-full text-[8px] font-black uppercase tracking-widest text-lime/40">
                                {a}
                             </span>
                           ))}
                        </div>

                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500 pt-4 border-t border-white/5">
                           <MapPin size={10} />
                           {facility.street_address}
                        </div>
                     </div>
                   </Link>
                 ))}

                 {filteredFacilities.length === 0 && (
                   <div className="col-span-full py-40 flex flex-col items-center justify-center text-center gap-6">
                      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-white/10">
                         <SearchIcon size={40} />
                      </div>
                      <div className="space-y-2">
                         <h3 className="text-xl font-display font-black uppercase italic tracking-tight">Zone <span className="text-white/40">Empty</span></h3>
                         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Adjust filters to find more championship venues</p>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedSport('All');
                          setPriceRange([0, 5000]);
                          setLifestyle({ food: false, indoor: false, parking: false });
                        }}
                        className="text-lime text-[10px] font-black uppercase tracking-widest border-b border-lime/30 hover:border-lime transition-all"
                      >
                         Reset All Filters
                      </button>
                   </div>
                 )}
               </motion.div>
             )}
           </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
