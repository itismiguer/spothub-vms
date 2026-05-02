import React, { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export default function GlobalNotifications() {
  const { user, profile } = useAuth();
  const lastBookingId = useRef<string | null>(null);
  const lastMessageId = useRef<string | null>(null);
  const lastReviewId = useRef<string | null>(null);
  const audioContext = useRef<AudioContext | null>(null);

  const playChime = () => {
    try {
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContext.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5); // A4

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn('Audio chime failed (interaction required?):', e);
    }
  };

  useEffect(() => {
    if (!user || !profile) return;

    // Listen for new bookings
    const bookingsChannel = supabase.channel('global-bookings')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, (payload) => {
        const booking = payload.new;
        const isSuperAdmin = profile.email === 'miguel@builtbymiguel.net';
        
        // Filter logic
        let shouldShow = false;
        if (isSuperAdmin || profile.role === 'ADMIN') {
          shouldShow = true;
        } else if (profile.role === 'OWNER') {
          shouldShow = (booking as any).facility_owner_id === user.id;
        } else {
          shouldShow = (booking as any).user_id === user.id;
        }

        if (shouldShow && lastBookingId.current !== payload.new.id) {
          toast.info(`New Activity Detected`, {
            description: `A new record has been added to the matrix.`,
          });
          playChime();
          lastBookingId.current = payload.new.id;
        }
      })
      .subscribe();

    // Listen for new messages
    const messagesChannel = supabase.channel('global-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new;
        if ((msg as any).sender_id !== user.id && lastMessageId.current !== msg.id) {
          toast.success(`Incoming Message`, {
            description: (msg as any).text?.substring(0, 50) + ((msg as any).text?.length > 50 ? '...' : ''),
          });
          playChime();
          lastMessageId.current = msg.id;
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [user, profile]);

  return null;
}
