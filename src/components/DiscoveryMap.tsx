import React from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useAdvancedMarkerRef, useMap } from '@vis.gl/react-google-maps';
import { motion } from 'motion/react';

import { Dumbbell, Waves, Trophy, Target, Users } from 'lucide-react';

interface MapFacility {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
}

interface DiscoveryMapProps {
  facilities: MapFacility[];
  onSelectFacility: (id: string) => void;
  userLocation?: { lat: number; lng: number } | null;
  forcedCenter?: { lat: number; lng: number } | null;
}

const DUMAGUETE_CENTER = { lat: 9.3068, lng: 123.3039 };

export default function DiscoveryMap({ facilities, onSelectFacility, userLocation, forcedCenter }: DiscoveryMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const [openInfoWindowId, setOpenInfoWindowId] = React.useState<string | null>(null);

  if (!apiKey) {
    return (
      <div className="h-full w-full bg-charcoal rounded-[40px] flex items-center justify-center p-8 text-center border border-white/5">
        <p className="text-slate-400 text-sm italic font-medium">
          Google Maps API Key not detected. <br />
          <span className="text-white/40 uppercase text-[10px] tracking-widest font-bold block mt-2">Configure VITE_GOOGLE_MAPS_API_KEY in Secrets</span>
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-[40px] overflow-hidden border border-white/5 relative pointer-events-auto">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={userLocation || DUMAGUETE_CENTER}
          defaultZoom={14}
          mapId="DISCOVERY_MAP_ID"
          colorScheme="DARK"
          disableDefaultUI={false}
          gestureHandling={'greedy'}
        >
          <MapController forcedCenter={forcedCenter} />
          {userLocation && (
            <UserLocationMarker position={userLocation} />
          )}
          {facilities.map((facility) => (
            <FacilityMarker 
              key={facility.id} 
              facility={facility} 
              onSelect={() => onSelectFacility(facility.id)} 
              isOpen={openInfoWindowId === facility.id}
              onOpen={() => setOpenInfoWindowId(facility.id)}
              onClose={() => setOpenInfoWindowId(null)}
            />
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}

function MapController({ forcedCenter }: { forcedCenter: { lat: number; lng: number } | null }) {
  const map = useMap();
  React.useEffect(() => {
    if (map && forcedCenter) {
      map.panTo(forcedCenter);
      map.setZoom(14);
    }
  }, [map, forcedCenter]);
  return null;
}

function UserLocationMarker({ position }: { position: { lat: number; lng: number } }) {
  const map = useMap();
  
  React.useEffect(() => {
    if (map && position) {
      map.panTo(position);
    }
  }, [map, position]);

  return (
    <AdvancedMarker position={position}>
      <div className="relative">
        <div className="absolute -inset-4 bg-blue-500/30 rounded-full blur-xl animate-pulse" />
        <div className="relative w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-[0_0_20px_rgba(59,130,246,0.6)]" />
      </div>
    </AdvancedMarker>
  );
}

function FacilityMarker({ facility, onSelect, isOpen, onOpen, onClose }: { facility: MapFacility; onSelect: () => void; isOpen: boolean; onOpen: () => void; onClose: () => void; key?: string }) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: facility.lat, lng: facility.lng }}
        onClick={() => onOpen()}
      >
        <div className="relative group cursor-pointer">
          <div className="absolute -inset-2 bg-lime/40 rounded-full blur-md animate-pulse opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative w-10 h-10 bg-charcoal border-2 border-lime rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(163,230,53,0.3)] transform hover:scale-110 transition-all duration-300">
             <div className="w-7 h-7 bg-lime rounded-xl flex items-center justify-center shadow-inner overflow-hidden">
               {facility.type.toLowerCase().includes('basketball') ? (
                 <div className="relative w-full h-full flex items-center justify-center">
                    <div className="absolute inset-0 border border-charcoal/20 rounded-full scale-90" />
                    <div className="absolute inset-y-0 left-1/2 w-[1.5px] bg-charcoal/40 -translate-x-1/2" />
                    <div className="absolute inset-x-0 top-1/2 h-[1.5px] bg-charcoal/40 -translate-y-1/2" />
                    <div className="absolute inset-0 border-l-[1.5px] border-charcoal/40 rounded-full -translate-x-1/2 scale-x-75" />
                    <div className="absolute inset-0 border-r-[1.5px] border-charcoal/40 rounded-full translate-x-1/2 scale-x-75" />
                 </div>
               ) : (facility.type.toLowerCase().includes('gym') || facility.type.toLowerCase().includes('fitness')) ? (
                 <Dumbbell className="text-charcoal" size={14} strokeWidth={3} />
               ) : (facility.type.toLowerCase().includes('swimming') || facility.type.toLowerCase().includes('pool')) ? (
                 <Waves className="text-charcoal" size={14} strokeWidth={3} />
               ) : (facility.type.toLowerCase().includes('football') || facility.type.toLowerCase().includes('soccer')) ? (
                 <div className="relative w-full h-full flex items-center justify-center">
                    <div className="absolute inset-0 border-[1.5px] border-charcoal/40 rotate-45 scale-[0.6] bg-charcoal/10" />
                    <div className="absolute inset-0 border-[1.5px] border-charcoal/40 -rotate-45 scale-[0.6]" />
                    <div className="w-2.5 h-2.5 border-[1.5px] border-charcoal/40 rounded-full" />
                 </div>
               ) : (facility.type.toLowerCase().includes('pickleball') || facility.type.toLowerCase().includes('padel')) ? (
                 <div className="relative w-full h-full flex items-center justify-center">
                    <div className="grid grid-cols-2 gap-1 scale-90">
                      <div className="w-1 h-1 bg-charcoal/60 rounded-full" />
                      <div className="w-1 h-1 bg-charcoal/60 rounded-full" />
                      <div className="w-1 h-1 bg-charcoal/60 rounded-full" />
                      <div className="w-1 h-1 bg-charcoal/60 rounded-full" />
                    </div>
                 </div>
               ) : facility.type.toLowerCase().includes('tennis') ? (
                 <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                   <div className="absolute inset-0 border-[1.5px] border-charcoal/40 rounded-full -translate-x-1/2 scale-125" />
                   <div className="absolute inset-0 border-[1.5px] border-charcoal/40 rounded-full translate-x-1/2 scale-125" />
                   <div className="absolute inset-y-1/2 w-full h-[1px] bg-charcoal/20" />
                 </div>
               ) : (facility.type.toLowerCase().includes('volleyball') || facility.type.toLowerCase().includes('futsal')) ? (
                 <div className="relative w-full h-full flex items-center justify-center">
                    <div className="absolute inset-0 border-[1px] border-charcoal/40 rounded-full scale-100" />
                    <div className="w-full h-[1px] bg-charcoal/20 rotate-45 transform" />
                    <div className="w-full h-[1px] bg-charcoal/20 -rotate-45 transform" />
                    <div className="w-[1px] h-full bg-charcoal/20" />
                 </div>
               ) : facility.type.toLowerCase().includes('badminton') ? (
                  <Trophy className="text-charcoal" size={14} strokeWidth={3} />
               ) : (
                 <Target className="text-charcoal" size={14} strokeWidth={3} />
               )}
             </div>
          </div>
        </div>
      </AdvancedMarker>

      {isOpen && (
        <InfoWindow
          anchor={marker}
          onCloseClick={() => onClose()}
        >
          <div className="p-3 min-w-[160px] bg-charcoal text-white rounded-2xl">
            <p className="text-[10px] text-lime uppercase font-bold tracking-widest mb-1">{facility.type}</p>
            <p className="font-display font-black text-lg uppercase italic tracking-tight mb-3 leading-none">{facility.name}</p>
            <button 
              onClick={onSelect}
              className="w-full bg-lime text-charcoal text-[10px] font-bold py-2 rounded-xl uppercase tracking-widest hover:brightness-110 transition-all"
            >
              Book Court
            </button>
          </div>
        </InfoWindow>
      )}
    </>
  );
}
