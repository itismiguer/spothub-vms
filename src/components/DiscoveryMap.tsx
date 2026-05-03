import React from 'react';
import { motion } from 'motion/react';
import { Dumbbell, Waves, Trophy, Target, Map as MapIcon, Navigation } from 'lucide-react';

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

export default function DiscoveryMap({ facilities, onSelectFacility }: DiscoveryMapProps) {
  return (
    <div className="h-full w-full rounded-[40px] overflow-hidden border border-white/5 relative bg-charcoal/50 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center group">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(181,245,90,0.05)_0%,transparent_70%)] opacity-50" />
      
      {/* Decorative Grid */}
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      
      <div className="relative z-10 space-y-6">
        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10 group-hover:border-lime/30 transition-colors duration-500">
          <MapIcon size={40} className="text-white/20 group-hover:text-lime/50 transition-colors duration-500" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white">Interactive Network</h3>
          <p className="text-slate-500 text-xs font-black uppercase tracking-[0.2em] max-w-xs mx-auto">
            Visualizing {facilities.length} premium sport venues across the region.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 pt-4">
          {facilities.slice(0, 3).map((f) => (
            <button 
              key={f.id}
              onClick={() => onSelectFacility(f.id)}
              className="px-4 py-2 glass border-white/10 rounded-full flex items-center gap-2 hover:border-lime/40 transition-all active:scale-95"
            >
              <div className="w-1.5 h-1.5 bg-lime rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{f.name}</span>
            </button>
          ))}
        </div>

        <div className="pt-8">
          <div className="flex items-center justify-center gap-2 text-lime/40 text-[9px] font-black uppercase tracking-[0.3em]">
            <Navigation size={12} />
            Coordinates active / Live Monitoring
          </div>
        </div>
      </div>
    </div>
  );
}
