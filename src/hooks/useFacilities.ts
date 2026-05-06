import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Facility } from '../types';

export function useFacilities(userId: string | undefined) {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setFacilities([]);
      setLoading(false);
      return;
    }

    const fetchFacilities = async () => {
      const { data, error: fetchError } = await supabase
        .from('venues')
        .select('*')
        .eq('owner_id', userId);

      if (fetchError) {
        setError(fetchError as any);
      } else {
        setFacilities(data as Facility[]);
      }
      setLoading(false);
    };

    fetchFacilities();

    const channel = supabase
      .channel(`venues-${userId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'venues', filter: `owner_id=eq.${userId}` }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setFacilities(prev => [...prev, payload.new as Facility]);
          } else if (payload.eventType === 'UPDATE') {
            setFacilities(prev => prev.map(f => f.id === payload.new.id ? payload.new as Facility : f));
          } else if (payload.eventType === 'DELETE') {
            setFacilities(prev => prev.filter(f => f.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { facilities, loading, error };
}
