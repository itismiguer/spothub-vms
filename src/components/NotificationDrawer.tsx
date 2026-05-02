import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, CheckCircle2, AlertCircle, Clock, FileText } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'booking_confirmed' | 'booking_expired' | 'proof_uploaded' | 'new_booking';
  read: boolean;
  createdAt: any;
  relatedId?: string;
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user || !isOpen) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Notification[]);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'drawer_notifications', false);
      setLoading(false);
    });

    return () => unsub();
  }, [user, isOpen]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (e) {
      console.error("Failed to mark notification as read", e);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true })));
    } catch (e) {
      console.error("Failed to mark all as read", e);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'booking_confirmed': return <CheckCircle2 className="text-lime" size={16} />;
      case 'booking_expired': return <AlertCircle className="text-red-400" size={16} />;
      case 'proof_uploaded': return <FileText className="text-blue-400" size={16} />;
      case 'new_booking': return <Bell className="text-cyan" size={16} />;
      default: return <Bell size={16} />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-[2000]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-[400px] bg-[#1A1A1A] border-l border-white/10 z-[2001] shadow-2xl flex flex-col"
          >
            <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div>
                <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter text-lime">Intelligence <span className="text-white/40">Feed</span></h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Real-time status updates</p>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 glass rounded-full flex items-center justify-center hover:bg-white/10 transition-all text-white border border-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
              {notifications.length > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="w-full py-3 border border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white hover:bg-white/5 transition-all mb-4"
                >
                  Mark All As Read
                </button>
              )}

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-20">
                  <Clock className="animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Accessing Logs...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-20">
                  <Bell size={48} />
                  <span className="text-[10px] font-black uppercase tracking-widest">No Signals Detected</span>
                </div>
              ) : (
                notifications.map((n) => (
                  <motion.div
                    key={n.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-5 rounded-3xl border transition-all cursor-pointer relative group ${
                      n.read ? 'glass border-white/5' : 'bg-lime/5 border-lime/30 shadow-[0_0_20px_rgba(181,245,90,0.05)]'
                    }`}
                    onClick={() => markAsRead(n.id)}
                  >
                    {!n.read && (
                      <span className="absolute top-4 right-4 w-2 h-2 bg-lime rounded-full shadow-[0_0_10px_rgba(181,245,90,0.8)]" />
                    )}
                    <div className="flex gap-4">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${n.read ? 'bg-white/5 text-slate-500' : 'bg-lime/20 text-lime'}`}>
                        {getIcon(n.type)}
                      </div>
                      <div className="space-y-1">
                        <h4 className={`text-[11px] font-black uppercase tracking-wider leading-none ${n.read ? 'text-slate-200' : 'text-white'}`}>
                          {n.title}
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium">
                          {n.message}
                        </p>
                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-2">
                          {n.createdAt?.toMillis ? format(n.createdAt.toMillis(), 'MMM d, h:mm a') : 'Just now'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <div className="p-8 border-t border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-3 text-lime/40">
                <Clock size={14} />
                <p className="text-[9px] font-black uppercase tracking-[0.2em]">Live Protocol Active</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
