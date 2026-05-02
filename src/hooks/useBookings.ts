import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Booking } from '../types';

export function useBookings(facilityId: string | null) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!facilityId) {
      setBookings([]);
      setLoading(false);
      return;
    }

    const fetchBookings = async () => {
      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('facility_id', facilityId);

      if (fetchError) {
        setError(fetchError as any);
      } else {
        setBookings(data as Booking[]);
      }
      setLoading(false);
    };

    fetchBookings();

    // Set up realtime subscription
    const channel = supabase
      .channel(`bookings-${facilityId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'bookings', filter: `facility_id=eq.${facilityId}` }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setBookings(prev => [...prev, payload.new as Booking]);
          } else if (payload.eventType === 'UPDATE') {
            setBookings(prev => prev.map(b => b.id === payload.new.id ? payload.new as Booking : b));
          } else if (payload.eventType === 'DELETE') {
            setBookings(prev => prev.filter(b => b.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [facilityId]);

  return { bookings, loading, error };
}
