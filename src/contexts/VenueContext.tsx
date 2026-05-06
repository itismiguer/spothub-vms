import React, { createContext, useContext, useState, useEffect } from 'react';

interface VenueContextType {
  selectedVenueId: string | null;
  setSelectedVenueId: (id: string | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const VenueContext = createContext<VenueContextType | undefined>(undefined);

export function VenueProvider({ children }: { children: React.ReactNode }) {
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(() => {
    return localStorage.getItem('active_venue_id');
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (selectedVenueId) {
      localStorage.setItem('active_venue_id', selectedVenueId);
    }
  }, [selectedVenueId]);

  return (
    <VenueContext.Provider value={{ selectedVenueId, setSelectedVenueId, isLoading, setIsLoading }}>
      {children}
    </VenueContext.Provider>
  );
}

export function useVenue() {
  const context = useContext(VenueContext);
  if (context === undefined) {
    throw new Error('useVenue must be used within a VenueProvider');
  }
  return context;
}
