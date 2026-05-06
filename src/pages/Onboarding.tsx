import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Building2, MapPin, Camera, CheckCircle2, ArrowRight, Loader2, Plus, Trash2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

import DiscoveryMap from '../components/DiscoveryMap';

import { useMapsLibrary } from '@vis.gl/react-google-maps';

export default function Onboarding() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const geocodingLib = useMapsLibrary('geocoding');
  const placesLib = useMapsLibrary('places');
  const autocompleteRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    owner_name: '',
    name: '',
    slug: '',
    street_address: '',
    unit_number: '',
    city: '',
    state_province: '',
    postal_code: '',
    country_code: 'PH',
    timezone: 'Asia/Manila',
    phone_country_code: '+63',
    phone_number: '',
    description: '',
    images: [] as string[],
    amenities: [] as string[],
    has_canteen: false,
    allow_outside_food: false,
    corkage_fee_amount: 0,
    currency_code: 'PHP',
    latitude: 14.5995,
    longitude: 120.9842
  });

  const currencyMap: Record<string, string> = {
    'PH': 'PHP',
    'US': 'USD',
    'UK': 'GBP',
    'AE': 'AED',
    'SG': 'SGD',
    'AU': 'AUD'
  };

  const handleCountryChange = (country: string) => {
    const currency = currencyMap[country] || 'USD';
    setFormData(prev => ({ ...prev, country_code: country, currency_code: currency }));
  };

  useEffect(() => {
    if (!placesLib || !autocompleteRef.current) return;

    const options = {
      fields: ['address_components', 'geometry', 'formatted_address'],
      types: ['address'],
    };

    const autocomplete = new placesLib.Autocomplete(autocompleteRef.current, options);

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        
        let street = '';
        let city = '';
        let state = '';
        let zip = '';
        let country = '';

        place.address_components?.forEach((c: any) => {
          if (c.types.includes('street_number')) street = c.long_name + ' ' + street;
          if (c.types.includes('route')) street += c.long_name;
          if (c.types.includes('locality')) city = c.long_name;
          if (c.types.includes('administrative_area_level_1')) state = c.long_name;
          if (c.types.includes('postal_code')) zip = c.long_name;
          if (c.types.includes('country')) country = c.short_name;
        });

        const currency = currencyMap[country] || 'USD';

        setFormData(prev => ({
          ...prev,
          street_address: street.trim() || prev.street_address,
          city: city || prev.city,
          state_province: state || prev.state_province,
          postal_code: zip || prev.postal_code,
          country_code: country || prev.country_code,
          currency_code: currency,
          latitude: lat,
          longitude: lng
        }));

        toast.success("Address autocompleted! Pin moved.");
      }
    });
  }, [placesLib, step]); // Re-init if placesLib loads or step changes to 2

  const handleLocationPick = async (lat: number, lng: number) => {
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
    if (!geocodingLib) return;

    const geocoder = new geocodingLib.Geocoder();
    
    try {
      const response = await geocoder.geocode({ location: { lat, lng } });
      
      if (response.results && response.results[0]) {
        const address = response.results[0];
        const components = address.address_components;
        
        let street = '';
        let city = '';
        let state = '';
        let zip = '';
        let country = 'PH';

        components.forEach((c: any) => {
          if (c.types.includes('street_number')) street = c.long_name + ' ' + street;
          if (c.types.includes('route')) street += c.long_name;
          if (c.types.includes('locality')) city = c.long_name;
          if (c.types.includes('administrative_area_level_1')) state = c.long_name;
          if (c.types.includes('postal_code')) zip = c.long_name;
          if (c.types.includes('country')) country = c.short_name;
        });

        setFormData(prev => ({
          ...prev,
          street_address: street.trim() || prev.street_address,
          city: city || prev.city,
          state_province: state || prev.state_province,
          postal_code: zip || prev.postal_code,
          country_code: country || prev.country_code
        }));

        toast.success("Location identified! Address fields suggested.");
      }
    } catch (error) {
      console.error("Geocoding failed:", error);
    }
  };

  // Sync profile name to owner_name once profile loads
  React.useEffect(() => {
    if (profile && !formData.owner_name) {
      setFormData(prev => ({ ...prev, owner_name: profile.name || '' }));
    }
  }, [profile]);

  const amenitiesList = [
    { id: 'wifi', label: 'WiFi', icon: 'WF' },
    { id: 'parking', label: 'Parking', icon: 'PK' },
    { id: 'showers', label: 'Showers', icon: 'SH' },
    { id: 'water', label: 'Water', icon: 'WT' }
  ];

  const timezones = [
    'Pacific/Honolulu',
    'America/Los_Angeles',
    'America/Denver',
    'America/Chicago',
    'America/New_York',
    'Europe/London',
    'Europe/Paris',
    'Asia/Dubai',
    'Asia/Singapore',
    'Asia/Manila',
    'Asia/Tokyo',
    'Australia/Sydney'
  ];

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  const handleNameChange = (name: string) => {
    const slug = generateSlug(name);
    setFormData(p => ({ ...p, name, slug }));
  };

  const [uploading, setUploading] = useState(false);

  // Mock facility for DiscoveryMap - always show at least one preview marker
  const mockFacilityForMap = [{
    id: 'preview',
    name: formData.name || 'NEW FACILITY',
    lat: formData.latitude,
    lng: formData.longitude,
    type: 'PREVIEW'
  }];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newImages = [...formData.images];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `facilities/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);
        
        newImages.push(publicUrl);
      }
      setFormData(prev => ({ ...prev, images: newImages }));
      toast.success("Images uploaded successfully.");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 0. Slug Uniqueness Check
      const { data: existingSlug } = await supabase
        .from('venues')
        .select('id')
        .eq('slug', formData.slug)
        .maybeSingle();

      if (existingSlug) {
        toast.error("A venue with this name/slug already exists. Please try a different name.");
        setStep(1);
        setLoading(false);
        return;
      }

      // 1. Transactional Update: Update Profile Role to OWNER and set Name/Phone
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          role: 'OWNER',
          name: formData.owner_name,
          phone: `${formData.phone_country_code}${formData.phone_number}`
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 2. Create Venue
      const fullAddress = [
        formData.street_address,
        formData.unit_number,
        formData.city,
        formData.state_province,
        formData.postal_code,
        formData.country_code
      ].filter(Boolean).join(', ');

      const formattedPhone = `${formData.phone_country_code}${formData.phone_number}`;

      const { data: venue, error: venueError } = await supabase
        .from('venues')
        .insert({
          owner_id: user.id,
          name: formData.name.toUpperCase(),
          slug: formData.slug,
          street_address: formData.street_address.toUpperCase(),
          unit_number: formData.unit_number?.toUpperCase(),
          city: formData.city.toUpperCase(),
          state_province: formData.state_province.toUpperCase(),
          postal_code: formData.postal_code.toUpperCase(),
          country_code: formData.country_code,
          timezone: formData.timezone,
          currency_code: formData.currency_code,
          
          // Triple mapping to ensure compatibility
          phone_number: formattedPhone,
          contact_number: formattedPhone,
          phone: formattedPhone,

          description: formData.description.toUpperCase(),
          images: formData.images,
          amenities: formData.amenities,
          has_canteen: formData.has_canteen,
          allow_outside_food: formData.allow_outside_food,
          corkage_fee_amount: formData.corkage_fee_amount,
          latitude: formData.latitude,
          longitude: formData.longitude,
          status: 'ACTIVE',
          address: fullAddress.toUpperCase()
        })
        .select()
        .single();

      if (venueError) throw venueError;

      toast.success("Venue registered! Now, let's add your first courts.");
      navigate(`/manage/venues/${venue.id}/courts`);
    } catch (err: any) {
      toast.error("Registration failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col items-center justify-center p-6 relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-lime/10 via-transparent to-transparent opacity-30" />
        <div className="absolute -top-1/4 -right-1/4 w-[60%] h-[60%] bg-lime/10 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px] animate-pulse" />
      </div>

      <div className="w-full max-w-2xl space-y-8 relative z-10">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-lime rounded-3xl flex items-center justify-center text-charcoal shadow-2xl shadow-lime/20 mb-2">
            <Building2 size={32} />
          </div>
          <div className="space-y-1">
            <h1 className="text-5xl font-display font-black uppercase italic tracking-tighter">Venue <span className="text-lime">Wizard</span></h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic">Step {step} of 3 // {step === 1 ? 'Identity' : step === 2 ? 'Location' : 'Logistics'}</p>
          </div>
        </div>

        <div className="glass p-8 sm:p-12 rounded-[56px] border border-white/5 space-y-10 relative overflow-hidden">
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-2">Owner Full Name</label>
                    <input 
                      type="text" 
                      placeholder="YOUR LEGAL NAME"
                      value={formData.owner_name}
                      onChange={e => setFormData(p => ({ ...p, owner_name: e.target.value }))}
                      className="w-full glass border-white/10 p-5 rounded-3xl text-sm font-black uppercase italic tracking-widest focus:border-lime/60 transition-all text-white placeholder:text-white/10"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-2">Venue Name</label>
                    <input 
                      type="text" 
                      placeholder="EX. METRO PADEL CLUB"
                      value={formData.name}
                      onChange={e => handleNameChange(e.target.value)}
                      className="w-full glass border-white/10 p-5 rounded-3xl text-sm font-black uppercase italic tracking-widest focus:border-lime/60 transition-all text-white placeholder:text-white/10"
                    />
                    {formData.slug && (
                      <p className="text-[9px] font-black text-lime/50 uppercase tracking-widest ml-2 italic">
                        Public Slug: /{formData.slug}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-2">Contact Number</label>
                  <div className="flex gap-3">
                    <div className="relative group/select w-40">
                      <select 
                        value={formData.phone_country_code}
                        onChange={e => setFormData(p => ({ ...p, phone_country_code: e.target.value }))}
                        className="w-full bg-[#1A1A1A] border border-white/10 p-5 rounded-3xl text-[10px] font-black uppercase tracking-widest text-white appearance-none cursor-pointer focus:border-lime/60 transition-all pr-12"
                      >
                        <option value="+63">+63 (PH)</option>
                        <option value="+1">+1 (US)</option>
                        <option value="+44">+44 (UK)</option>
                        <option value="+971">+971 (AE)</option>
                        <option value="+65">+65 (SG)</option>
                        <option value="+61">+61 (AU)</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-lime">
                        <ChevronDown size={14} />
                      </div>
                    </div>
                    <input 
                      type="tel" 
                      placeholder="9XX XXX XXXX"
                      value={formData.phone_number}
                      onChange={e => setFormData(p => ({ ...p, phone_number: e.target.value.replace(/[^0-9]/g, '') }))}
                      className="flex-1 glass border-white/10 p-5 rounded-3xl text-sm font-black italic tracking-widest focus:border-lime/60 transition-all text-white placeholder:text-white/10"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-2">Venue Description</label>
                  <textarea 
                    placeholder="TELL US ABOUT THE EXPERIENCE..."
                    value={formData.description}
                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    className="w-full glass border-white/10 p-6 rounded-3xl text-sm font-bold uppercase tracking-widest focus:border-lime/60 transition-all text-white placeholder:text-white/10 min-h-[120px] resize-none"
                  />
                </div>
              </div>
              <button 
                onClick={() => setStep(2)}
                disabled={!formData.name || !formData.phone_number || !formData.owner_name}
                className="w-full bg-lime text-charcoal py-6 rounded-3xl font-display font-black uppercase italic tracking-tighter text-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-lime/20 flex items-center justify-center gap-4 disabled:opacity-50"
              >
                Proceed to Location <ArrowRight size={20} />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-2">Venue Location</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2 space-y-2">
                       <input 
                        ref={autocompleteRef}
                        type="text" 
                        placeholder="STREET ADDRESS (AUTOCOMPLETE)"
                        value={formData.street_address}
                        onChange={e => setFormData(p => ({ ...p, street_address: e.target.value }))}
                        className="w-full glass border-white/10 p-5 rounded-3xl text-sm font-black uppercase italic tracking-widest focus:border-lime/60 transition-all text-white placeholder:text-white/10 shadow-2xl"
                      />
                    </div>
                    <input 
                      type="text" 
                      placeholder="UNIT/SUITE (OPT)"
                      value={formData.unit_number || ''}
                      onChange={e => setFormData(p => ({ ...p, unit_number: e.target.value }))}
                      className="w-full glass border-white/10 p-4 rounded-2xl text-[10px] font-black uppercase italic tracking-widest focus:border-lime/60 shadow-lg"
                    />
                    <input 
                      type="text" 
                      placeholder="CITY"
                      value={formData.city}
                      onChange={e => setFormData(p => ({ ...p, city: e.target.value }))}
                      className="w-full glass border-white/10 p-4 rounded-2xl text-[10px] font-black uppercase italic tracking-widest focus:border-lime/60"
                    />
                    <input 
                      type="text" 
                      placeholder="STATE/PROVINCE"
                      value={formData.state_province}
                      onChange={e => setFormData(p => ({ ...p, state_province: e.target.value }))}
                      className="w-full glass border-white/10 p-4 rounded-2xl text-[10px] font-black uppercase italic tracking-widest focus:border-lime/60"
                    />
                    <input 
                      type="text" 
                      placeholder="POSTAL CODE"
                      value={formData.postal_code}
                      onChange={e => setFormData(p => ({ ...p, postal_code: e.target.value }))}
                      className="w-full glass border-white/10 p-4 rounded-2xl text-[10px] font-black uppercase italic tracking-widest focus:border-lime/60"
                    />
                    <div className="relative group/select">
                      <select 
                        value={formData.country_code}
                        onChange={e => handleCountryChange(e.target.value)}
                        className="w-full bg-[#1A1A1A] border border-white/10 p-4 rounded-2xl text-[10px] font-black uppercase italic tracking-widest text-white appearance-none cursor-pointer focus:border-lime/60 transition-all pr-12"
                      >
                        <option value="PH">Philippines</option>
                        <option value="US">USA</option>
                        <option value="UK">UK</option>
                        <option value="AE">UAE</option>
                        <option value="SG">Singapore</option>
                        <option value="AU">Australia</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-lime">
                        <ChevronDown size={14} />
                      </div>
                    </div>

                    <div className="sm:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Location Timezone</label>
                      <div className="relative group/select">
                        <select 
                          value={formData.timezone}
                          onChange={e => setFormData(p => ({ ...p, timezone: e.target.value }))}
                          className="w-full bg-[#1A1A1A] border border-white/10 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white appearance-none cursor-pointer focus:border-lime/60 transition-all pr-12"
                        >
                          {timezones.map(tz => (
                            <option key={tz} value={tz}>{tz}</option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-lime">
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-2">Map Placement</label>
                  <div className="h-[450px] relative rounded-3xl overflow-hidden border border-white/10">
                    <DiscoveryMap 
                      facilities={mockFacilityForMap} 
                      onSelectFacility={() => {}} 
                      onLocationPick={handleLocationPick}
                      forcedCenter={{ lat: formData.latitude, lng: formData.longitude }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setStep(1)}
                  className="flex-1 glass border-white/10 py-6 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-white/5 transition-all text-slate-400"
                >
                  Back
                </button>
                <button 
                  onClick={() => setStep(3)}
                  disabled={!formData.street_address || !formData.city || !formData.postal_code}
                  className="flex-[2] bg-lime text-charcoal py-6 rounded-3xl font-display font-black uppercase italic tracking-tighter text-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-lime/20"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-2">Business Rules</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Base Currency</label>
                      <div className="relative group/select">
                        <select 
                          value={formData.currency_code}
                          onChange={e => setFormData(p => ({ ...p, currency_code: e.target.value }))}
                          className="w-full bg-[#1A1A1A] border border-white/10 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white appearance-none cursor-pointer focus:border-lime/60 transition-all pr-12"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="PHP">PHP (₱)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="AED">AED (Dh)</option>
                          <option value="SGD">SGD (S$)</option>
                          <option value="AUD">AUD (A$)</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-lime">
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Toggles</label>
                       <div className="space-y-3">
                        <button 
                          onClick={() => setFormData(p => ({ ...p, has_canteen: !p.has_canteen }))}
                          className={`w-full p-4 rounded-xl flex items-center justify-between transition-all border ${formData.has_canteen ? 'bg-lime/10 border-lime/30 text-lime' : 'glass border-white/5 text-slate-500'}`}
                        >
                          <span className="text-[9px] font-black uppercase tracking-widest">Canteen Service Available</span>
                          <div className={`w-6 h-3 rounded-full relative transition-colors ${formData.has_canteen ? 'bg-lime' : 'bg-white/10'}`}>
                            <div className={`absolute top-0.5 w-2 h-2 bg-white rounded-full transition-all ${formData.has_canteen ? 'right-0.5' : 'left-0.5'}`} />
                          </div>
                        </button>

                        <button 
                          onClick={() => setFormData(p => ({ ...p, allow_outside_food: !p.allow_outside_food }))}
                          className={`w-full p-4 rounded-xl flex items-center justify-between transition-all border ${formData.allow_outside_food ? 'bg-lime/10 border-lime/30 text-lime' : 'glass border-white/5 text-slate-500'}`}
                        >
                          <span className="text-[9px] font-black uppercase tracking-widest">Allow Outside Food</span>
                          <div className={`w-6 h-3 rounded-full relative transition-colors ${formData.allow_outside_food ? 'bg-lime' : 'bg-white/10'}`}>
                            <div className={`absolute top-0.5 w-2 h-2 bg-white rounded-full transition-all ${formData.allow_outside_food ? 'right-0.5' : 'left-0.5'}`} />
                          </div>
                        </button>
                       </div>
                    </div>

                    {formData.allow_outside_food && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="md:col-span-2 glass p-5 rounded-2xl border-white/10 space-y-2">
                         <label className="text-[8px] font-black uppercase tracking-widest text-slate-500">Corkage Fee ({formData.currency_code})</label>
                         <input 
                           type="number"
                           placeholder="0.00"
                           value={formData.corkage_fee_amount}
                           onChange={e => setFormData(p => ({ ...p, corkage_fee_amount: parseFloat(e.target.value) }))}
                           className="w-full bg-transparent border-none text-lime font-display font-black text-2xl italic outline-none"
                         />
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-2">Amenities Checklist</label>
                  <div className="grid grid-cols-2 gap-3">
                    {amenitiesList.map(item => {
                      const selected = formData.amenities.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setFormData(p => ({
                              ...p,
                              amenities: selected ? p.amenities.filter(a => a !== item.id) : [...p.amenities, item.id]
                            }));
                          }}
                          className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${selected ? 'bg-white/10 text-lime border-lime/40' : 'glass border-white/5 text-slate-500'}`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-display font-black italic text-[10px] ${selected ? 'bg-lime text-charcoal' : 'glass'}`}>
                            {item.icon}
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                 <button 
                   onClick={() => setStep(2)}
                   className="flex-1 glass border-white/10 py-6 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-white/5 transition-all text-slate-400"
                 >
                   Back
                 </button>
                 <button 
                   onClick={handleComplete}
                   disabled={loading}
                   className="flex-[2] bg-white text-charcoal py-6 rounded-[32px] font-display font-black uppercase italic tracking-tighter text-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-white/10 flex items-center justify-center gap-4"
                 >
                   {loading ? <Loader2 size={24} className="animate-spin text-charcoal" /> : 'Register Venue'}
                 </button>
              </div>
            </motion.div>
          )}
        </div>

        <p className="text-center text-slate-500 text-[9px] font-black uppercase tracking-[0.4em] italic opacity-50">
          Secure Registration Infrastructure v2.1
        </p>
      </div>
    </div>
  );
}
