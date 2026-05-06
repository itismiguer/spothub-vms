import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Calendar, User, LayoutDashboard, Settings, LogIn, LogOut, Search, Activity, MessageSquare, ShieldAlert, ChevronDown, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Selector from './Selector';
import NotificationDrawer from './NotificationDrawer';

export default function Layout() {
  const { user, profile, login, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = React.useState(false);
  const [hasPendingBookings, setHasPendingBookings] = React.useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = React.useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;

    // Listen for unread notifications
    const fetchUnreadNotifications = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      setHasUnreadNotifications((count || 0) > 0);
    };

    fetchUnreadNotifications();

    const notificationsChannel = supabase.channel('unread-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
        fetchUnreadNotifications();
      })
      .subscribe();

    // Listen for unread messages
    const fetchUnreadMessages = async () => {
      const field = profile?.role === 'OWNER' ? 'unread_count_owner' : 'unread_count_player';
      const userField = profile?.role === 'OWNER' ? 'facility_owner_id' : 'player_id';
      
      const { data } = await supabase
        .from('chats')
        .select(field)
        .eq(userField, user.id);
      
      const unread = data?.some(d => (d as any)[field] > 0) || false;
      setHasUnreadMessages(unread);
    };

    fetchUnreadMessages();

    const chatsChannel = supabase.channel('unread-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => {
        fetchUnreadMessages();
      })
      .subscribe();

    // Listen for pending bookings for owners
    if (profile?.role === 'OWNER' || profile?.role === 'ADMIN') {
      const fetchPendingBookings = async () => {
        let query = supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'PENDING');
        
        if (profile.role !== 'ADMIN') {
          query = query.eq('facility_owner_id', user.id);
        }

        const { count } = await query;
        setHasPendingBookings((count || 0) > 0);
      };

      fetchPendingBookings();

      const bookingsChannel = supabase.channel('pending-bookings')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
          fetchPendingBookings();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(notificationsChannel);
        supabase.removeChannel(chatsChannel);
        supabase.removeChannel(bookingsChannel);
      };
    }

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(chatsChannel);
    };
  }, [user, profile]);

  React.useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsModalOpen(document.body.classList.contains('modal-open'));
        }
      });
    });

    observer.observe(document.body, { attributes: true });
    setIsModalOpen(document.body.classList.contains('modal-open'));

    return () => observer.disconnect();
  }, []);

  const navItems = [
    { label: 'Home', path: '/', icon: Search, roles: ['GUEST', 'PLAYER', 'OWNER', 'STAFF', 'ADMIN'] },
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['PLAYER', 'ADMIN'] },
    { label: 'Bookings', path: '/my-bookings', icon: Calendar, roles: ['PLAYER', 'ADMIN'] },
    { label: 'Schedule', path: '/owner?tab=schedule', icon: Activity, roles: ['OWNER', 'STAFF', 'ADMIN'] },
    { label: 'Earnings', path: '/owner?tab=earnings', icon: ShieldAlert, roles: ['OWNER'] },
    { label: 'Messages', path: '/messages', icon: MessageSquare, roles: ['PLAYER', 'OWNER', 'STAFF', 'ADMIN'] },
    { label: 'Manage', path: '/owner', icon: LayoutDashboard, roles: ['OWNER', 'STAFF', 'ADMIN'] },
    { label: 'Admin', path: '/admin', icon: Settings, roles: ['ADMIN'] },
    { label: 'Profile', path: '/profile', icon: User, roles: ['PLAYER', 'OWNER', 'STAFF', 'ADMIN'] },
  ];

  const filteredNav = navItems.filter((item) => {
    // 1. Unauthenticated users (Guests)
    if (!user) return item.roles.includes('GUEST');
    
    // 2. Identify the user
    const role = (profile?.role || 'PLAYER').toUpperCase().trim();
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN' || user.email === 'miguel@builtbymiguel.net';
    
    // 3. Logic-based filtering
    
    // Always show these for any authenticated user
    if (['Home', 'Profile', 'Messages'].includes(item.label)) return true;
    
    // Role-specific visibility
    if (role === 'PLAYER') {
      return ['Bookings', 'Dashboard'].includes(item.label);
    }
    
    if (role === 'OWNER' || role === 'STAFF') {
      if (['Schedule', 'Manage'].includes(item.label)) return true;
      if (item.label === 'Earnings' && role === 'OWNER') return true;
    }

    // Admin & Super Admin see everything else that has ADMIN role
    if (isAdmin && item.roles.includes('ADMIN')) return true;

    return false;
  });

  const isAuthPage = 
    location.pathname === '/register' || 
    location.pathname === '/login' || 
    location.pathname === '/complete-profile' ||
    location.pathname.startsWith('/onboarding') ||
    location.pathname.startsWith('/manage/venues');

  const isManagementPage =
    location.pathname.startsWith('/owner') ||
    location.pathname.startsWith('/manage') ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/management') ||
    location.pathname.startsWith('/onboarding') ||
    location.pathname.startsWith('/facility-hub/live-monitor');

  return (
    <div className="min-h-screen relative bg-[#0A0A0A] selection:bg-[#B5F55A]/30 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* Dynamic Background Accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#B5F55A]/[0.05] rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#B5F55A]/[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10">

      {!isAuthPage && (
        <nav className="fixed top-0 inset-x-0 h-20 glass z-[1000] flex flex-col justify-center backdrop-blur-3xl border-b border-white/5">
          <div className="w-full max-w-[1440px] mx-auto flex items-center justify-between px-2 sm:px-6 md:px-12 gap-2 sm:gap-6">
            <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#B5F55A] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(181,245,90,0.4)] flex-shrink-0">
                <Activity className="text-black fill-black" size={20} />
              </div>
              <span className="hidden xs:block sm:block text-sm sm:text-lg lg:text-xl font-display font-black tracking-tighter uppercase italic text-white whitespace-nowrap">
                SPOT<span className="text-[#B5F55A]">HUB</span>
              </span>
            </div>

            {/* Mobile Page Selector - Visible on Mobile only */}
            <div className="flex-1 md:hidden min-w-0 max-w-[160px] xs:max-w-[220px] mx-auto">
              <Selector
                options={filteredNav.map((item) => ({
                  id: item.path,
                  label: item.label,
                  icon: item.icon,
                }))}
                selectedId={location.pathname}
                onSelect={(id) => navigate(id)}
                placeholder="NAVIGATE"
                variant="compact"
              />
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {user && !user.email_confirmed_at && user.app_metadata?.provider === 'email' && (
                <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full animate-pulse">
                  <ShieldAlert size={12} className="text-red-400" />
                  <span className="text-[9px] font-black text-red-100 uppercase tracking-widest whitespace-nowrap">Verification Required</span>
                </div>
              )}
              {user && (
                <>
                  <button 
                    onClick={logout}
                    className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-white/10 transition-all text-slate-400 hover:text-red-500 border border-white/10"
                    title="Sign Out"
                  >
                    <LogOut size={20} />
                  </button>
                  <button 
                    onClick={() => setIsNotificationDrawerOpen(true)}
                    className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-white/10 transition-all text-slate-400 hover:text-[#B5F55A] border border-white/10 relative"
                  >
                    <Bell size={20} />
                    {hasUnreadNotifications && (
                      <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#B5F55A] rounded-full shadow-[0_0_10px_rgba(181,245,90,0.8)] animate-pulse" />
                    )}
                  </button>
                </>
              )}
              {user ? (
                <div className="hidden xs:flex items-center gap-3 bg-white/5 backdrop-blur-md px-3 sm:px-4 py-2 rounded-full border border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 hidden sm:inline">{profile?.role}</span>
                  <div className="w-7 h-7 bg-[#B5F55A] rounded-full flex items-center justify-center text-charcoal text-[11px] font-black italic shadow-[0_0_15px_rgba(181,245,90,0.3)]">
                    {profile?.name ? profile.name[0] : 'U'}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 sm:gap-4">
                  <Link 
                    to="/login"
                    className="bg-[#B5F55A] text-black px-5 sm:px-8 py-2.5 rounded-full font-black uppercase tracking-widest text-[9px] sm:text-[10px] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#B5F55A]/20 flex items-center justify-center"
                  >
                    Sign In
                  </Link>
                </div>
              )}
            </div>
          </div>
        </nav>
      )}

      <main className={`relative ${isAuthPage ? 'pt-0 pb-0' : 'pt-24 pb-32'} min-h-screen`}>
        <div className={`w-full ${isAuthPage ? 'h-full' : 'max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {!isAuthPage && !['/', '/dashboard', '/owner', '/admin', '/login', '/register', '/complete-profile'].includes(location.pathname) && (
                <div className="mb-8 flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (window.history.length > 2) {
                        navigate(-1);
                      } else {
                        navigate('/owner');
                      }
                    }}
                    className="flex items-center gap-2 text-lime hover:gap-4 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-full border border-lime/30 flex items-center justify-center group-hover:border-lime transition-all">
                      <ChevronDown className="rotate-90" size={16} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">← Back to Operations</span>
                  </button>

                  <div className="hidden sm:flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-6 py-2 rounded-full border border-white/5">
                    <span className="text-lime/40">Secure Tunnel</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
                    <span>{location.pathname}</span>
                  </div>
                </div>
              )}
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <NotificationDrawer 
        isOpen={isNotificationDrawerOpen} 
        onClose={() => setIsNotificationDrawerOpen(false)} 
      />

      {/* Floating Navigator - Fixed to viewport with safe area awareness */}
      {user && !isAuthPage && (
        <div
          className={`fixed bottom-4 inset-x-0 z-[5000] flex justify-center px-4 sm:px-6 pb-[env(safe-area-inset-bottom)] transition-all duration-500 pointer-events-none ${
            isModalOpen ? 'translate-y-32 opacity-0' : 'translate-y-0 opacity-100'
          }`}
        >
        <div className={`glass px-1 sm:px-2 py-2 rounded-[32px] flex items-center justify-around shadow-[0_20px_50px_rgba(0,0,0,0.5)] h-20 w-full max-w-[520px] transition-all duration-300 border-white/10 overflow-hidden pointer-events-auto ${
          isModalOpen ? 'pointer-events-none' : 'pointer-events-auto'
        }`}>
          {filteredNav.map((item) => {
            const itemBasePath = item.path.split('?')[0];
            const itemSearch = item.path.split('?')[1] || '';
            
            // Refined active logic:
            // 1. If item has search params (tab), it must match both path and search
            // 2. If item is base path (Manage), it matches if path is correct and no active tab search matches other items
            const isActive = itemSearch 
              ? location.pathname === itemBasePath && location.search.includes(itemSearch)
              : location.pathname === itemBasePath && (!location.search || !['tab=schedule', 'tab=earnings'].some(s => location.search.includes(s)));
            
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-1 flex flex-col items-center justify-center gap-1 relative h-full transition-all duration-300 rounded-2xl group focus:outline-none min-w-0 ${
                  isActive ? 'text-black' : 'text-white/60 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="navIndicator"
                    className="absolute inset-0 bg-lime rounded-2xl border border-lime/40 shadow-[0_10px_30px_rgba(181,245,90,0.4)]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <div className="relative z-10 flex flex-col items-center gap-1 w-full">
                  <div className="relative flex-shrink-0">
                    <Icon size={20} className={`${isActive ? 'text-charcoal' : 'group-hover:scale-110 group-active:scale-90'} transition-transform flex-shrink-0`} />
                    {item.label === 'Messages' && hasUnreadMessages && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-charcoal shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                    )}
                    {item.label === 'Manage' && hasPendingBookings && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-charcoal shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                    )}
                  </div>
              <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-[0.1em] sm:tracking-[0.15em] bg-transparent leading-none flex-shrink-0 whitespace-nowrap px-1 ${isActive ? 'text-black' : 'text-white/60 group-hover:text-white'}`}>
                {item.label}
              </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      )}
      </div>
    </div>
  );
}
