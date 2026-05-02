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
    { label: 'Home', path: '/', icon: Search, roles: ['GUEST', 'PLAYER', 'OWNER', 'ADMIN'] },
    { label: 'Bookings', path: '/my-bookings', icon: Calendar, roles: ['PLAYER', 'ADMIN'] },
    { label: 'Schedule', path: '/owner?tab=schedule', icon: Activity, roles: ['OWNER', 'ADMIN'] },
    { label: 'Earnings', path: '/owner?tab=earnings', icon: ShieldAlert, roles: ['OWNER'] },
    { label: 'Messages', path: '/messages', icon: MessageSquare, roles: ['PLAYER', 'OWNER', 'ADMIN'] },
    { label: 'Manage', path: '/owner', icon: LayoutDashboard, roles: ['OWNER', 'ADMIN'] },
    { label: 'Admin', path: '/admin', icon: Settings, roles: ['ADMIN'] },
    { label: 'Profile', path: '/profile', icon: User, roles: ['PLAYER', 'OWNER', 'ADMIN'] },
  ];

  const filteredNav = navItems.filter((item) => {
    if (!user) return item.roles.includes('GUEST');
    // Hide 'Manage' for Players
    if (profile?.role === 'PLAYER' && (item.path === '/owner' || item.path === '/owner?tab=schedule' || item.path === '/owner?tab=earnings')) return false;
    // Hide 'Bookings' for Owners as requested (Home, Messages, Manage, Profile)
    if (profile?.role === 'OWNER' && item.path === '/my-bookings') return false;
    return profile ? item.roles.includes(profile.role) : item.roles.includes('PLAYER');
  });

  const isAuthPage = location.pathname === '/register' || location.pathname === '/login';

  const isManagementPage =
    location.pathname.startsWith('/owner') ||
    location.pathname.startsWith('/manage') ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/management') ||
    location.pathname.startsWith('/facility-hub/live-monitor');

  return (
    <div className="min-h-screen relative bg-[#0A0A0A] selection:bg-[#CCFF00]/30 selection:text-white font-sans antialiased">
      {/* Dynamic Background Accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-[#CCFF00]/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-[#CCFF00]/3 rounded-full blur-[100px]" />
      </div>

      {!isAuthPage && (
        <nav className="fixed top-0 inset-x-0 h-20 glass z-[1000] flex flex-col justify-center backdrop-blur-3xl border-b border-white/5">
          <div className="w-full max-w-[1440px] mx-auto flex items-center justify-between px-2 sm:px-6 md:px-12 gap-2 sm:gap-6">
            <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#CCFF00] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(204,255,0,0.4)] flex-shrink-0">
                <Activity className="text-black fill-black" size={20} />
              </div>
              <span className="hidden xs:block sm:block text-sm sm:text-lg lg:text-xl font-display font-black tracking-tighter uppercase italic text-white whitespace-nowrap">
                SPOT<span className="text-[#CCFF00]">HUB</span>
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
                placeholder="Navigate"
                variant="compact"
              />
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {user && !user.emailVerified && user.providerData?.[0]?.providerId === 'password' && (
                <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full animate-pulse">
                  <ShieldAlert size={12} className="text-red-400" />
                  <span className="text-[9px] font-black text-red-100 uppercase tracking-widest whitespace-nowrap">Verification Required</span>
                </div>
              )}
              {user && (
                <button 
                  onClick={() => setIsNotificationDrawerOpen(true)}
                  className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-white/10 transition-all text-slate-400 hover:text-[#CCFF00] border border-white/10 relative"
                >
                  <Bell size={20} />
                  {hasUnreadNotifications && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#CCFF00] rounded-full shadow-[0_0_10px_rgba(204,255,0,0.8)] animate-pulse" />
                  )}
                </button>
              )}
              {user ? (
                <div className="hidden xs:flex items-center gap-3 bg-white/5 backdrop-blur-md px-3 sm:px-4 py-2 rounded-full border border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 hidden sm:inline">{profile?.role}</span>
                  <div className="w-7 h-7 bg-[#CCFF00] rounded-full flex items-center justify-center text-charcoal text-[11px] font-black italic">
                    {profile?.name ? profile.name[0] : 'U'}
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => navigate('/login')}
                  className="bg-[#CCFF00] text-black px-5 sm:px-8 py-2.5 rounded-full font-black uppercase tracking-widest text-[9px] sm:text-[10px] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#CCFF00]/20"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </nav>
      )}

      <main className={`relative ${isAuthPage ? 'pt-0' : 'pt-24'} pb-32 min-h-screen`}>
        <div className={`w-full max-w-[1440px] mx-auto ${isAuthPage ? '' : 'px-4 sm:px-8 md:px-12'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
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
      {!isAuthPage && (
        <div
          className={`fixed bottom-0 inset-x-0 z-40 hidden md:flex justify-center px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] transition-all duration-500 pointer-events-none ${
            isModalOpen ? 'translate-y-32 opacity-0' : 'translate-y-0 opacity-100'
          } ${location.pathname.includes('facility-hub') ? 'lg:flex hidden' : ''}`}
        >
        <div className={`glass px-1 sm:px-2 py-2 rounded-[32px] flex items-center justify-around shadow-[0_20px_50px_rgba(0,0,0,0.5)] h-20 w-full max-w-[520px] transition-all duration-300 border-white/10 overflow-hidden ${
          isModalOpen ? 'pointer-events-none' : 'pointer-events-auto'
        }`}>
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-1 flex flex-col items-center justify-center gap-1 relative h-full transition-all duration-300 rounded-2xl group focus:outline-none min-w-0 ${
                  isActive ? 'text-charcoal' : 'text-slate-500 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="navIndicator"
                    className="absolute inset-0 bg-[#CCFF00] rounded-2xl border border-[#CCFF00]/40 shadow-[0_10px_30px_rgba(204,255,0,0.4)]"
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
              <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-[0.1em] sm:tracking-[0.15em] bg-transparent leading-none flex-shrink-0 whitespace-nowrap px-1 ${isActive ? 'text-charcoal' : 'text-slate-500 group-hover:text-white'}`}>
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
  );
}
