import React, { useState, useEffect } from 'react';
import { Bell, Check, Circle, X, ExternalLink, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AppNotification } from '../types';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    // Real-time subscription
    const channel = supabase
      .channel('notifications-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as AppNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id);
    
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    
    setNotifications((prev) => 
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-12 h-12 glass border-white/5 rounded-2xl flex items-center justify-center text-slate-500 hover:text-lime transition-all relative group"
      >
        <Bell size={20} className={unreadCount > 0 ? 'animate-bounce' : ''} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-lime text-charcoal text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-lime/40">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {showDropdown && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowDropdown(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-4 w-80 md:w-96 glass border border-white/10 rounded-[32px] overflow-hidden z-50 shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-white">Alert Center</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-[9px] font-black uppercase tracking-widest text-lime hover:text-white transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="max-h-[400px] overflow-y-auto divide-y divide-white/5 custom-scrollbar">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-6 transition-colors hover:bg-white/[0.02] relative group ${!n.is_read ? 'bg-lime/[0.02]' : ''}`}
                    >
                      <div className="flex gap-4">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? 'bg-lime animate-pulse shadow-[0_0_8px_rgba(190,242,2,0.6)]' : 'bg-white/10'}`} />
                        <div className="space-y-1 flex-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white">{n.title}</p>
                          <p className="text-[11px] text-slate-500 leading-relaxed">{n.message}</p>
                          <div className="flex items-center justify-between pt-2">
                             <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">
                               {format(new Date(n.created_at), 'MMM dd, HH:mm')}
                             </p>
                             {n.link && (
                               <Link 
                                 to={n.link} 
                                 onClick={() => markAsRead(n.id)}
                                 className="flex items-center gap-1 text-[8px] font-black uppercase text-lime hover:underline"
                               >
                                 View <ExternalLink size={8} />
                               </Link>
                             )}
                          </div>
                        </div>
                      </div>
                      {!n.is_read && (
                        <button 
                          onClick={() => markAsRead(n.id)}
                          className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-white"
                        >
                          <Check size={14} />
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-center gap-4">
                    <Mail className="text-white/5" size={40} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">No active signals</p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-white/[0.02] border-t border-white/5">
                <button className="w-full text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">
                  Notification Settings
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
