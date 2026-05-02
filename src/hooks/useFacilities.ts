import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
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

    const q = query(collection(db, 'facilities'), where('ownerId', '==', userId));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Facility));
        setFacilities(data);
        setLoading(false);
      },
      (err) => {
        setError(err as Error);
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, 'facilities');
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { facilities, loading, error };
}
