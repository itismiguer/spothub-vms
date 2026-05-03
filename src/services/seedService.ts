import { supabase } from '../lib/supabase';

export const seedDemoData = async (userEmail: string, userId: string) => {
  try {
    console.log('Starting seed process...');

    // 1. Update/Ensure User Profile
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: userEmail,
        name: 'System Admin',
        role: 'ADMIN',
        created_at: new Date().toISOString()
      });

    if (profileError) throw profileError;

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
        owner_id: userId
      },
      {
        name: 'Boulevard Smash Courts',
        type: 'Badminton',
        description: 'Scenic courts right by the Rizal Boulevard. Fresh breeze and high-quality acrylic flooring for peak performance.',
        address: 'Rizal Boulevard, Dumaguete City, Negros Oriental',
        lat: 9.3117,
        lng: 123.3155,
        images: ['https://images.unsplash.com/photo-1521412644187-c49fa0b4e6d3?auto=format&fit=crop&q=80&w=1200'],
        owner_id: userId
      },
      {
        name: 'Valencia Green Courts',
        type: 'Tennis',
        description: 'Cool mountain air meets professional indoor tennis standards. Perfect for long rallies and year-round training.',
        address: 'Valencia, Negros Oriental (Near Dumaguete)',
        lat: 9.2825,
        lng: 123.2450,
        images: ['https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=1200'],
        owner_id: userId
      }
    ];

    for (const facData of dummyFacilities) {
      // Check if already exists
      const { data: existing } = await supabase
        .from('facilities')
        .select('id')
        .eq('name', facData.name)
        .maybeSingle();
      
      if (!existing) {
        const { data: newFac, error: facError } = await supabase
          .from('facilities')
          .insert(facData)
          .select()
          .single();
        
        if (facError) throw facError;

        // Add 2 courts per facility
        const courtNames = ['Main Court 1', 'Pro Court 2'];
        const courtsToInsert = courtNames.map(cName => ({
          facility_id: newFac.id,
          name: cName,
          hourly_rate: 350,
          is_active: true
        }));

        const { error: courtError } = await supabase
          .from('courts')
          .insert(courtsToInsert);

        if (courtError) throw courtError;
      }
    }

    return true;
  } catch (error) {
    console.error('Seed Error:', error);
    throw error;
  }
};
