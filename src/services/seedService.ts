import { collection, doc, setDoc, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const seedDemoData = async (userEmail: string, userId: string) => {
  try {
    console.log('Starting seed process...');

    // 1. Update/Ensure User Role
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      uid: userId,
      email: userEmail,
      name: 'System Admin',
      role: 'ADMIN',
      createdAt: serverTimestamp()
    }, { merge: true });

    // 2. Define Facilities
    const dummyFacilities = [
      {
        name: 'Pala-Pala Pickleball Hub',
        type: 'Pickleball',
        description: 'Elite outdoor pickleball hub with professional lighting and high-performance concrete surfaces. The heart of competitive play in Dumaguete.',
        address: 'Pala-Pala, Dumaguete City, Negros Oriental',
        lat: 9.3068,
        lng: 123.3011,
        images: ['https://images.unsplash.com/photo-1626225454341-3343160a2b53?auto=format&fit=crop&q=80&w=1200'],
        ownerId: userId,
        createdAt: serverTimestamp()
      },
      {
        name: 'Boulevard Smash Courts',
        type: 'Badminton',
        description: 'Scenic courts right by the Rizal Boulevard. Fresh breeze and high-quality acrylic flooring for peak performance.',
        address: 'Rizal Boulevard, Dumaguete City, Negros Oriental',
        lat: 9.3117,
        lng: 123.3155,
        images: ['https://images.unsplash.com/photo-1626225454341-3343160a2b53?auto=format&fit=crop&q=80&w=1200'], // Different one
        ownerId: userId,
        createdAt: serverTimestamp()
      },
      {
        name: 'Valencia Green Courts',
        type: 'Tennis',
        description: 'Cool mountain air meets professional indoor tennis standards. Perfect for long rallies and year-round training.',
        address: 'Valencia, Negros Oriental (Near Dumaguete)',
        lat: 9.2825,
        lng: 123.2450,
        images: ['https://images.unsplash.com/photo-1595435063435-08169992f155?auto=format&fit=crop&q=80&w=1200'],
        ownerId: userId,
        createdAt: serverTimestamp()
      }
    ];

    // Better images
    dummyFacilities[0].images = ['https://images.unsplash.com/photo-1626225454341-3343160a2b53?auto=format&fit=crop&q=80&w=1200'];
    dummyFacilities[1].images = ['https://images.unsplash.com/photo-1521412644187-c49fa0b4e6d3?auto=format&fit=crop&q=80&w=1200'];
    dummyFacilities[2].images = ['https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=1200'];

    for (const facData of dummyFacilities) {
      // Check if already exists to avoid duplicates (optional but safer)
      const q = query(collection(db, 'facilities'), where('name', '==', facData.name));
      const existing = await getDocs(q);
      
      if (existing.empty) {
        const facRef = await addDoc(collection(db, 'facilities'), facData);
        
        // Add 2 courts per facility
        const courtNames = ['Main Court 1', 'Pro Court 2'];
        for (const cName of courtNames) {
          await addDoc(collection(db, 'facilities', facRef.id, 'courts'), {
            facilityId: facRef.id,
            name: cName,
            hourlyRate: 350,
            isActive: true
          });
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Seed Error:', error);
    throw error;
  }
};
