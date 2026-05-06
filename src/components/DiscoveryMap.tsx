import React, { useState, useCallback } from 'react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin, 
  useMap,
} from '@vis.gl/react-google-maps';
import { motion, AnimatePresence } from 'motion/react';
import { Map as MapIcon, Loader2, Crosshair } from 'lucide-react';
import { toast } from 'sonner';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

interface MapFacility {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  country_code?: string;
  city?: string;
  slug?: string;
}

interface DiscoveryMapProps {
  facilities: MapFacility[];
  onSelectFacility?: (facility: MapFacility) => void;
  onLocationPick?: (lat: number, lng: number) => void;
  userLocation?: { lat: number; lng: number } | null;
  forcedCenter?: { lat: number; lng: number } | null;
  interactive?: boolean;
}

export default function DiscoveryMap(props: DiscoveryMapProps) {
  if (!hasValidKey) {
    return (
      <div className="h-full w-full bg-charcoal/50 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center glass rounded-[40px]">
        <MapIcon size={40} className="text-white/20 mb-4" />
        <h3 className="text-lg font-black uppercase tracking-widest text-slate-500">Google Maps Key Required</h3>
        <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-2 max-w-[200px]">Add GOOGLE_MAPS_PLATFORM_KEY to secrets to enable mapping features.</p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <MapContainer {...props} />
    </APIProvider>
  );
}

function MapContainer({ facilities, onSelectFacility, onLocationPick, forcedCenter, interactive = true }: DiscoveryMapProps) {
  const map = useMap();
  const [pickedLocation, setPickedLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [finding, setFinding] = useState(false);
  const isPreview = facilities.some(f => f.type === 'PREVIEW');

  // Handle forced center updates
  React.useEffect(() => {
    if (map && forcedCenter) {
      map.panTo(forcedCenter);
    }
  }, [map, forcedCenter]);

  // Handle manual picking
  const handleMapClick = (ev: any) => {
    if (!onLocationPick || !interactive) return;
    const lat = ev.detail?.latLng?.lat || ev.latLng?.lat?.();
    const lng = ev.detail?.latLng?.lng || ev.latLng?.lng?.();
    if (lat && lng) {
      setPickedLocation({ lat, lng });
      onLocationPick(lat, lng);
    }
  };

  const centerOnMe = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setFinding(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (map) {
          map.panTo({ lat, lng });
          map.setZoom(16);
          if (onLocationPick) {
            setPickedLocation({ lat, lng });
            onLocationPick(lat, lng);
          }
        }
        setFinding(false);
      },
      (err) => {
        toast.error("Unable to retrieve your location");
        setFinding(false);
      }
    );
  }, [map, onLocationPick]);

  return (
    <div className="h-full w-full relative group">
      <Map
        defaultCenter={forcedCenter || { lat: 14.5995, lng: 120.9842 }}
        defaultZoom={12}
        mapId="SPOTHUB_NETWORK"
        onClick={handleMapClick}
        gestureHandling={interactive ? 'greedy' : 'none'}
        disableDefaultUI={!interactive}
        className="w-full h-full"
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
      >
        {/* Render facilities */}
        {facilities.map((f) => (
          <AdvancedMarker 
            key={f.id} 
            position={{ lat: f.lat, lng: f.lng }}
            onClick={() => onSelectFacility?.(f)}
          >
            <Pin 
              background={f.type === 'PREVIEW' ? '#B5F55A' : '#4285F4'} 
              glyphColor="#000"
              scale={f.type === 'PREVIEW' ? 1.2 : 1}
            />
          </AdvancedMarker>
        ))}

        {/* Render picked location marker */}
        {pickedLocation && (
          <AdvancedMarker position={pickedLocation}>
            <Pin background="#B5F55A" glyphColor="#000" scale={1.3} />
          </AdvancedMarker>
        )}
      </Map>

      {/* Map Controls */}
      {interactive && (
        <button 
          onClick={centerOnMe}
          disabled={finding}
          className="absolute top-6 right-6 w-12 h-12 glass rounded-2xl flex items-center justify-center text-white hover:text-lime hover:scale-110 active:scale-95 transition-all z-20 shadow-2xl"
        >
          {finding ? <Loader2 size={20} className="animate-spin" /> : <Crosshair size={20} />}
        </button>
      )}

      {/* Overlay UI */}
      <AnimatePresence>
        {isPreview && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-6 left-6 right-6 glass p-4 rounded-2xl border-white/10 pointer-events-none z-10"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-lime animate-ping" />
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white">Tap Map to Set Facility Coordinates</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
