import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
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

    const q = query(collection(db, 'bookings'), where('facilityId', '==', facilityId));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
        setBookings(data);
        setLoading(false);
      },
      (err) => {
        setError(err as Error);
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, 'bookings');
      }
    );

    return () => unsubscribe();
  }, [facilityId]);

  return { bookings, loading, error };
}
