import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';

interface LiveFeedTabProps {
  selectedFacilityId: string | null;
}

export const LiveFeedTab: React.FC<LiveFeedTabProps> = ({ selectedFacilityId }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter">Live <span className="text-white/40">Feed</span></h2>
          <p className="text-[10px] font-black text-lime uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-lime animate-ping" /> Real-time Court Telemetry
          </p>
        </div>
        <button 
          onClick={() => navigate('/facility-hub/live-monitor')}
          className="glass px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-lime hover:text-charcoal transition-all border-white/10"
        >
          Launch Dedicated Monitor
        </button>
      </div>
      <div className="glass rounded-[56px] border-white/5 h-[600px] overflow-hidden">
        <iframe 
          src={`/facility-hub/live-monitor?facilityId=${selectedFacilityId}`} 
          className="w-full h-full border-none grayscale contrast-125 brightness-75 hover:grayscale-0 transition-all duration-1000" 
        />
      </div>
    </div>
  );
};
