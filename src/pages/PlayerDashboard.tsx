import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Heart, 
  Clock, 
  MapPin, 
  ChevronRight, 
  Activity, 
  Calendar, 
  Star,
  Settings,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format, isAfter, differenceInHours, differenceInMinutes } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FavoriteButton } from '../components/FavoriteButton';

export default function PlayerDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Favorites
      const { data: favs } = await supabase
        .from('favorites')
        .select('*, facilities(*)')
        .eq('user_id', user?.id);
      
      // 2. Fetch Bookings
      const { data: bks } = await supabase
        .from('bookings')
        .select('*, facilities(*), courts(*)')
        .eq('user_id', user?.id)
        .order('start_time', { ascending: false });

      // 3. Fetch User Reviews
      const { data: revs } = await supabase
        .from('reviews')
        .select('*, facilities(name)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      setFavorites(favs || []);
      setBookings(bks || []);
      setReviews(revs || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const upcomingBookings = useMemo(() => 
    bookings.filter(b => isAfter(new Date(b.start_time), new Date()) && b.status !== 'CANCELLED')
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  , [bookings]);

  const nextGame = upcomingBookings[0];

  const recentVenues = useMemo(() => {
    const venuesMap = new Map();
    bookings.filter(b => !isAfter(new Date(b.start_time), new Date()))
      .forEach(b => {
        if (!venuesMap.has(b.facility_id)) {
          venuesMap.set(b.facility_id, b.facilities);
        }
      });
    return Array.from(venuesMap.values()).slice(0, 5);
  }, [bookings]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-transparent text-white">
        <Activity className="text-lime animate-spin mb-4" size={32} />
        <span className="text-[10px] font-black uppercase tracking-widest text-lime">Loading Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent pb-32 space-y-16 py-12 relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-lime/10 via-transparent to-transparent opacity-50" />
        <div className="absolute -top-1/4 -right-1/4 w-[60%] h-[60%] bg-lime/10 rounded-full blur-[140px] animate-pulse" />
      </div>
      {/* Header & Stats */}
      <section className="space-y-10 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
           <div className="space-y-2">
              <h1 className="text-5xl md:text-7xl font-display font-black uppercase italic tracking-tighter text-white leading-none">
                 Player <span className="text-lime">HQ</span>
              </h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Welcome back, {profile?.name || 'Champ'}</p>
           </div>
           <div className="flex gap-4">
              <Link 
                to="/search"
                className="h-16 bg-lime text-charcoal px-8 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-lime/20"
              >
                 Book Next Session <ArrowRight size={18} />
              </Link>
           </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <div className="glass p-8 rounded-[40px] border-white/5 space-y-4 group">
              <Trophy className="text-lime group-hover:scale-110 transition-transform" size={24} />
              <div>
                <p className="text-4xl font-display font-black italic text-white">{bookings.length}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total Games</p>
              </div>
           </div>
           <div className="glass p-8 rounded-[40px] border-white/5 space-y-4 group">
              <Heart className="text-red-500 group-hover:scale-110 transition-transform" size={24} />
              <div>
                <p className="text-4xl font-display font-black italic text-white">{favorites.length}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Favorited Venues</p>
              </div>
           </div>
           <div className="glass p-8 rounded-[40px] border-white/5 space-y-4 group">
              <Star className="text-amber-500 group-hover:scale-110 transition-transform" size={24} />
              <div>
                <p className="text-4xl font-display font-black italic text-white">{reviews.length}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Reviews Written</p>
              </div>
           </div>
           <div className="glass p-8 rounded-[40px] border-white/5 space-y-4 group">
              <Activity className="text-blue-500 group-hover:scale-110 transition-transform" size={24} />
              <div>
                <p className="text-4xl font-display font-black italic text-white">{upcomingBookings.length}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Live & Upcoming</p>
              </div>
           </div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Next Game (Left/Center Column) */}
        <div className="lg:col-span-2 space-y-12">
           {nextGame ? (
             <div className="space-y-8">
                <h3 className="text-2xl font-display font-black uppercase italic tracking-tight text-white/40">Next <span className="text-white">Game</span></h3>
                <Link 
                  to={`/my-bookings/${nextGame.id}`}
                  className="block glass p-10 rounded-[56px] border-white/5 bg-gradient-to-br from-lime/10 to-transparent relative overflow-hidden group hover:border-lime/30 transition-all"
                >
                   <div className="relative z-10 space-y-8">
                      <div className="flex items-center justify-between">
                         <div className="px-5 py-2 glass border-lime/30 rounded-full text-lime text-[10px] font-black uppercase tracking-widest">
                            {differenceInHours(new Date(nextGame.start_time), new Date()) > 0 
                              ? `In ${differenceInHours(new Date(nextGame.start_time), new Date())} Hours`
                              : `In ${differenceInMinutes(new Date(nextGame.start_time), new Date())} Minutes`}
                         </div>
                         <Clock className="text-lime group-hover:rotate-12 transition-transform" size={32} />
                      </div>

                      <div className="space-y-2">
                         <h2 className="text-4xl md:text-6xl font-display font-black uppercase italic tracking-tighter text-white">
                            {nextGame.facilities?.name}
                         </h2>
                         <p className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            {nextGame.courts?.name} • {nextGame.courts?.sport}
                         </p>
                      </div>

                      <div className="flex flex-wrap gap-12">
                         <div className="space-y-1 text-white">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Date</p>
                            <p className="text-2xl font-display font-black italic">{format(new Date(nextGame.start_time), 'EEEE, MMM dd')}</p>
                         </div>
                         <div className="space-y-1 text-white">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Kickoff</p>
                            <p className="text-2xl font-display font-black italic">{format(new Date(nextGame.start_time), 'h:mm aa')}</p>
                         </div>
                      </div>
                   </div>
                   
                   <div className="absolute right-0 bottom-0 opacity-10 translate-x-10 translate-y-10 group-hover:scale-110 transition-transform duration-1000">
                      <Calendar size={300} />
                   </div>
                </Link>
             </div>
           ) : (
             <div className="space-y-8">
                <h3 className="text-2xl font-display font-black uppercase italic tracking-tight text-white/40">Next <span className="text-white">Game</span></h3>
                <div className="p-16 glass rounded-[56px] border-dashed border-white/10 flex flex-col items-center justify-center text-center gap-6">
                   <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-white/10">
                      <Activity size={40} />
                   </div>
                   <div className="space-y-2">
                      <p className="text-xl font-display font-black uppercase italic tracking-tight text-white">No pending matches</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Your championship journey awaits. Book your next win below.</p>
                   </div>
                   <button onClick={() => navigate('/search')} className="text-lime text-[10px] font-black uppercase tracking-widest border-b border-lime/30 hover:border-lime transition-all">Start Searching</button>
                </div>
             </div>
           )}

           {/* Favorites Section */}
           <div className="space-y-8">
              <div className="flex items-center justify-between">
                 <h3 className="text-2xl font-display font-black uppercase italic tracking-tight text-white/40">Hearted <span className="text-white">Venues</span></h3>
                 <Link to="/search" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">See All</Link>
              </div>

              <div className="flex gap-6 overflow-x-auto no-scrollbar pb-6 pr-8">
                 {favorites.length === 0 ? (
                   <div className="w-full glass p-10 rounded-[48px] border-dashed border-white/10 text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No venues hearted yet</p>
                   </div>
                 ) : (
                   favorites.map((fav) => (
                    <Link 
                      key={fav.id}
                      to={`/${fav.facilities?.country_code?.toLowerCase()}/${fav.facilities?.city?.toLowerCase()}/${fav.facilities?.slug}`}
                      className="flex-shrink-0 w-80 glass rounded-[40px] border-white/5 overflow-hidden group hover:border-lime/40 transition-all flex flex-col"
                    >
                       <div className="h-44 relative overflow-hidden bg-white/5">
                          <img src={fav.facilities?.images?.[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={fav.facilities?.name} referrerPolicy="no-referrer" />
                          <div className="absolute top-4 right-4 z-10">
                             <FavoriteButton facilityId={fav.facilities?.id} />
                          </div>
                       </div>
                       <div className="p-6 space-y-4">
                          <h4 className="text-xl font-display font-black uppercase italic text-white truncate">{fav.facilities?.name}</h4>
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
                                <MapPin size={10} className="text-lime" />
                                {fav.facilities?.city}
                             </div>
                             <ChevronRight className="text-slate-700 group-hover:text-lime group-hover:translate-x-1 transition-all" size={16} />
                          </div>
                       </div>
                    </Link>
                   ))
                 )}
              </div>
           </div>
        </div>

        {/* Right Sidebar: Recent Activity & Profile */}
        <div className="space-y-12">
           {/* Recent Activity */}
           <div className="space-y-8">
              <h3 className="text-2xl font-display font-black uppercase italic tracking-tight text-white/40">Recently <span className="text-white">Played</span></h3>
              <div className="glass rounded-[48px] border-white/5 p-8 space-y-6">
                 {recentVenues.length === 0 ? (
                   <p className="text-center py-10 text-[10px] font-black uppercase tracking-widest text-slate-500">Initial Match Pending</p>
                 ) : (
                   recentVenues.map((venue) => (
                    <Link 
                      key={venue.id} 
                      to={`/${venue.country_code?.toLowerCase()}/${venue.city?.toLowerCase()}/${venue.slug}`}
                      className="flex items-center gap-4 p-4 rounded-3xl hover:bg-white/5 transition-all group"
                    >
                       <div className="w-16 h-16 rounded-2xl overflow-hidden glass border-white/10">
                          <img src={venue.images?.[0]} className="w-full h-full object-cover" alt={venue.name} referrerPolicy="no-referrer" />
                       </div>
                       <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-black uppercase italic text-white truncate group-hover:text-lime transition-colors">{venue.name}</h5>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{venue.city}</p>
                       </div>
                       <ChevronRight className="text-slate-800" size={16} />
                    </Link>
                   ))
                 )}
              </div>
           </div>

           {/* Quick Actions */}
           <div className="glass p-8 rounded-[48px] border-white/5 space-y-6">
              <h3 className="text-lg font-display font-black uppercase italic tracking-tight text-white">Account <span className="text-white/40">Control</span></h3>
              <div className="space-y-3">
                 <button 
                  onClick={() => navigate('/profile')}
                  className="w-full flex items-center justify-between p-5 rounded-2xl glass border-white/5 hover:bg-white/10 transition-all group"
                 >
                    <div className="flex items-center gap-3">
                       <Settings className="text-slate-500 group-hover:text-lime transition-colors" size={18} />
                       <span className="text-[10px] font-black uppercase tracking-widest">Profile Settings</span>
                    </div>
                    <ChevronRight size={14} className="text-slate-800" />
                 </button>
                 <button 
                  onClick={() => navigate('/my-bookings')}
                  className="w-full flex items-center justify-between p-5 rounded-2xl glass border-white/5 hover:bg-white/10 transition-all group"
                 >
                    <div className="flex items-center gap-3">
                       <Calendar className="text-slate-500 group-hover:text-lime transition-colors" size={18} />
                       <span className="text-[10px] font-black uppercase tracking-widest">View All Bookings</span>
                    </div>
                    <ChevronRight size={14} className="text-slate-800" />
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
