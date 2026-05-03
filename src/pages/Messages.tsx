import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Send, MessageSquare, User, Building2, Search, ArrowLeft, Zap, Check, CheckCheck, Loader2, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Chat {
  id: string;
  player_id: string;
  facility_id: string;
  facility_name: string;
  player_name: string;
  last_message?: string;
  last_timestamp?: string;
  unread_count_player?: number;
  unread_count_owner?: number;
}

interface Message {
  id: string;
  text: string;
  sender_id: string;
  created_at: string;
}

const QUICK_REPLIES = [
  "Yes, we have lights available until 10 PM.",
  "Parking is free for all players.",
  "The court is currently dry and ready for play.",
  "We have rackets and balls for rent at the desk.",
  "Yes, there are shower facilities available.",
  "Please check in at the counter 15 mins before."
];

export default function Messages() {
  const { user, profile } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isOwner = profile?.role === 'OWNER';

  // Fetch Chats
  useEffect(() => {
    if (!user) return;

    async function fetchChats() {
      try {
        let query = supabase
          .from('chats')
          .select('*')
          .order('last_timestamp', { ascending: false });

        if (isOwner) {
          query = query.eq('facility_owner_id', user.id);
        } else {
          query = query.eq('player_id', user.id);
        }

        const { data, error } = await query;
        if (error) throw error;
        setChats(data as Chat[]);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching chats:', error);
        setLoading(false);
      }
    }

    fetchChats();

    // Subscribe to chat changes
    const chatSubscription = supabase.channel('chats-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => {
        fetchChats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chatSubscription);
    };
  }, [user, isOwner]);

  // Fetch Messages for Active Chat
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }

    async function fetchMessages() {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', activeChat.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data as Message[]);
        scrollToBottom();
        
        // Reset unread count
        if (isOwner && activeChat.unread_count_owner && activeChat.unread_count_owner > 0) {
          await supabase.from('chats').update({ unread_count_owner: 0 }).eq('id', activeChat.id);
        } else if (!isOwner && activeChat.unread_count_player && activeChat.unread_count_player > 0) {
          await supabase.from('chats').update({ unread_count_player: 0 }).eq('id', activeChat.id);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    }

    fetchMessages();

    // Subscribe to new messages
    const messageSubscription = supabase.channel(`messages-${activeChat.id}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${activeChat.id}` }, 
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageSubscription);
    };
  }, [activeChat, isOwner]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const sendMessage = async (text: string) => {
    if (!activeChat || !user || !text.trim()) return;
    
    setSending(true);
    try {
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          chat_id: activeChat.id,
          text: text.trim(),
          sender_id: user.id
        });

      if (msgError) throw msgError;

      const updateData: any = {
        last_message: text.trim(),
        last_timestamp: new Date().toISOString()
      };

      if (isOwner) {
        updateData.unread_count_player = (activeChat.unread_count_player || 0) + 1;
      } else {
        updateData.unread_count_owner = (activeChat.unread_count_owner || 0) + 1;
      }

      await supabase.from('chats').update(updateData).eq('id', activeChat.id);
      setNewMessage('');
    } catch (error) {
      toast.error('Message failed to launch.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-lime" size={48} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10">
      <div className="flex bg-white/5 border border-white/10 rounded-[40px] sm:rounded-[56px] overflow-hidden min-h-[600px] h-auto lg:h-[75vh] glass relative">
        
        {/* Chat List */}
        <div className={`w-full lg:w-96 border-r border-white/10 flex flex-col ${activeChat ? 'hidden lg:flex' : 'flex'}`}>
           <header className="p-10 pb-6 border-b border-white/10">
              <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter mb-4">Messages</h2>
              <div className="relative">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                <input 
                  placeholder="Filter conversations..." 
                  className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-lime/40 transition-all text-white" 
                />
              </div>
           </header>
           
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
               {chats.length > 0 ? chats.map((chat) => {
                 const unread = isOwner ? chat.unread_count_owner : chat.unread_count_player;
                 const isActive = activeChat?.id === chat.id;
                 
                 return (
                   <motion.button
                     key={chat.id}
                     onClick={() => setActiveChat(chat)}
                     whileHover={{ scale: 1.02 }}
                     whileTap={{ scale: 0.98 }}
                     className={`w-full p-6 rounded-[32px] border text-left transition-all relative overflow-hidden group ${
                       isActive ? 'bg-lime/10 border-lime/40' : 'bg-white/5 border-white/10'
                     }`}
                   >
                     <div className="flex gap-4 items-center">
                        <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center border-white/10 text-lime shrink-0">
                           {isOwner ? <User size={24} /> : <Building2 size={24} />}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-start mb-1">
                              <h4 className="font-display font-black uppercase italic text-sm truncate mr-2">
                                {isOwner ? chat.player_name : chat.facility_name}
                              </h4>
                              {chat.last_timestamp && (
                                <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest whitespace-nowrap">
                                  {format(new Date(chat.last_timestamp), 'HH:mm')}
                                </span>
                              )}
                           </div>
                           <p className={`text-[10px] font-medium truncate ${isActive ? 'text-white/60' : 'text-slate-400'}`}>
                             {chat.last_message || 'Initial contact started...'}
                           </p>
                        </div>
                     </div>
                     {unread && unread > 0 && (
                       <div className="absolute top-6 right-6 w-5 h-5 bg-lime text-charcoal rounded-full flex items-center justify-center text-[9px] font-black italic shadow-lg shadow-lime/20">
                         {unread}
                       </div>
                     )}
                   </motion.button>
                );
              }) : (
                <div className="text-center py-20 px-10">
                   <div className="w-16 h-16 glass rounded-full flex items-center justify-center mx-auto mb-6 text-white/10 border-white/5">
                      <MessageSquare size={32} />
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 italic">Static Silence. No active transmissions.</p>
                </div>
              )}
           </div>
        </div>

        {/* Chat Window */}
        <div className={`flex-1 flex flex-col relative bg-white/[0.02] ${!activeChat ? 'hidden lg:flex' : 'flex'}`}>
           {activeChat ? (
             <>
               <header className="p-8 lg:p-10 border-b border-white/10 flex items-center justify-between glass z-10">
                  <div className="flex items-center gap-6 text-white">
                     <button onClick={() => setActiveChat(null)} className="lg:hidden p-2 -ml-2 text-white/40 hover:text-white transition-colors">
                        <ArrowLeft size={24} />
                     </button>
                     <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center border-white/10 text-lime">
                        {isOwner ? <User size={20} /> : <Building2 size={20} />}
                     </div>
                     <div>
                        <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter leading-none">
                          {isOwner ? activeChat.player_name : activeChat.facility_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                           <div className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
                           <span className="text-[9px] font-black uppercase text-lime tracking-widest leading-none">Live Link</span>
                        </div>
                     </div>
                  </div>
               </header>

               <div className="flex-1 overflow-y-auto p-10 space-y-6 no-scrollbar backdrop-blur-3xl relative">
                  {/* Decorative mesh */}
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(circle_at_center,_#b5f55a_1px,_transparent_1px)] bg-[size:32px_32px]" />
                  
                  {messages.map((msg, i) => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                         <div className={`max-w-[80%] rounded-[32px] p-6 text-sm font-medium leading-relaxed relative ${
                           isMe 
                           ? 'bg-lime text-charcoal shadow-xl shadow-lime/10' 
                           : 'glass border-white/10 text-white'
                         }`}>
                            {msg.text}
                            <div className={`text-[8px] font-black uppercase tracking-widest mt-3 flex items-center gap-2 ${isMe ? 'text-charcoal/40' : 'text-white/20'}`}>
                               {msg.created_at ? format(new Date(msg.created_at), 'HH:mm') : 'Syncing...'}
                               {isMe && <CheckCheck size={10} />}
                            </div>
                         </div>
                      </motion.div>
                    );
                  })}
                  <div ref={messagesEndRef} />
               </div>

               {/* Quick Replies for Owners */}
               {isOwner && (
                 <div className="px-10 py-4 flex gap-3 overflow-x-auto no-scrollbar border-t border-white/5 bg-white/[0.01]">
                    {QUICK_REPLIES.map((reply, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(reply)}
                        className="whitespace-nowrap px-6 py-3 rounded-full glass border-white/10 text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-lime hover:border-lime/40 transition-all active:scale-95 shrink-0"
                      >
                         <Sparkles size={10} className="inline mr-2 text-lime" />
                         {reply}
                      </button>
                    ))}
                 </div>
               )}

               <footer className="p-8 lg:p-10 border-t border-white/10 bg-white/[0.02]">
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendMessage(newMessage);
                    }}
                    className="relative flex gap-4"
                  >
                     <input 
                       value={newMessage}
                       onChange={(e) => setNewMessage(e.target.value)}
                       placeholder="Transmission..."
                       className="flex-1 bg-white/5 border border-white/10 p-4 sm:p-6 rounded-2xl sm:rounded-3xl text-sm font-bold focus:outline-none focus:border-lime/40 transition-all text-white placeholder:text-white/10"
                     />
                     <button
                       disabled={sending || !newMessage.trim()}
                       className="w-14 h-14 sm:w-20 sm:h-20 bg-lime rounded-2xl sm:rounded-3xl flex items-center justify-center text-charcoal hover:scale-105 active:scale-95 transition-all shadow-xl shadow-lime/20 disabled:opacity-50 disabled:scale-100 shrink-0"
                     >
                        {sending ? <Loader2 className="animate-spin" /> : <Send size={24} />}
                     </button>
                  </form>
               </footer>
             </>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center p-20 text-center opacity-40">
                <div className="w-24 h-24 glass rounded-[40px] flex items-center justify-center mb-10 border-white/10">
                   <MessageSquare size={48} className="text-white" strokeWidth={1} />
                </div>
                <h3 className="text-3xl font-display font-black uppercase italic tracking-tighter mb-4">Select Communication</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] max-w-sm leading-relaxed">Establish a secure link with your venue operators or players.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
