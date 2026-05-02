import React, { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
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

    // 1. Listen for new Bookings
    const bookingsRef = collection(db, 'bookings');
    let bookingsQuery;
    
    // Only 'isListAdmin' can query all bookings. 
    // Regular owners MUST filter by facilityOwnerId.
    const isSuperAdmin = profile.email === 'miguel@builtbymiguel.net';

    if (profile.role === 'ADMIN' && isSuperAdmin) {
      bookingsQuery = query(
        bookingsRef,
        orderBy('createdAt', 'desc'),
        limit(1)
      );
    } else if (profile.role === 'OWNER' || profile.role === 'ADMIN') {
      bookingsQuery = query(
        bookingsRef,
        where('facilityOwnerId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
    } else {
      bookingsQuery = query(
        bookingsRef,
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
    }

    const unsubBookings = onSnapshot(bookingsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const booking = change.doc.data();
          if (lastBookingId.current && change.doc.id !== lastBookingId.current) {
            toast.info(`New Booking: ${booking.facilityName}`, {
              description: `A new activity has been recorded.`,
            });
            playChime();
          }
          lastBookingId.current = change.doc.id;
        }
      });
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'bookings', false);
    });

    // 2. Listen for new Messages
    const roomsRef = collection(db, 'chats');
    const roomsQuery = isSuperAdmin 
      ? query(roomsRef, limit(20))
      : query(
          roomsRef,
          where(profile.role === 'OWNER' ? 'facilityOwnerId' : 'playerId', '==', user.uid)
        );

    const unsubMessages = onSnapshot(roomsQuery, (snapshot) => {
      snapshot.docs.forEach(roomDoc => {
        const messagesRef = collection(db, 'chats', roomDoc.id, 'messages');
        const msgQuery = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));
        
        onSnapshot(msgQuery, (msgSnap) => {
          msgSnap.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const msg = change.doc.data();
              if (msg.senderId !== user.uid) {
                if (lastMessageId.current && change.doc.id !== lastMessageId.current) {
                  toast.success(`New Message`, {
                    description: msg.text?.substring(0, 50) + (msg.text?.length > 50 ? '...' : ''),
                  });
                  playChime();
                }
                lastMessageId.current = change.doc.id;
              }
            }
          });
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, 'chat_messages', false);
        });
      });
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'chats', false);
    });

    // 3. Listen for new Reviews
    const reviewsRef = collection(db, 'reviews');
    let reviewsQuery;
    if (profile.role === 'OWNER' || profile.role === 'ADMIN') {
      reviewsQuery = isSuperAdmin 
        ? query(reviewsRef, orderBy('createdAt', 'desc'), limit(1))
        : query(reviewsRef, where('facilityOwnerId', '==', user.uid), orderBy('createdAt', 'desc'), limit(1));

      const unsubReviews = onSnapshot(reviewsQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const review = change.doc.data();
            if (lastReviewId.current && change.doc.id !== lastReviewId.current) {
              toast.info(`New Review Received`, {
                description: `${review.rating} Stars for ${review.facilityName}`,
              });
              playChime();
            }
            lastReviewId.current = change.doc.id;
          }
        });
      }, (err) => {
        if (err.code === 'permission-denied') {
          console.warn('Review listener permission denied.');
        }
      });

      return () => {
        unsubBookings();
        unsubMessages();
        unsubReviews();
      };
    }

    return () => {
      unsubBookings();
      unsubMessages();
    };
  }, [user, profile]);

  return null;
}
