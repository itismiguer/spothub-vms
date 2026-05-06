import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface FavoriteButtonProps {
  facilityId: string;
  size?: number;
  className?: string;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({ facilityId, size = 20, className = "" }) => {
  const { user } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkFavorite();
    } else {
      setLoading(false);
    }
  }, [user, facilityId]);

  const checkFavorite = async () => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user?.id)
        .eq('facility_id', facilityId)
        .maybeSingle();

      if (error) throw error;
      setIsFavorited(!!data);
    } catch (err) {
      console.error('Error checking favorite:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error('Sign in to save favorites');
      return;
    }

    const previousState = isFavorited;
    setIsFavorited(!previousState);

    try {
      if (previousState) {
        // Remove
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('facility_id', facilityId);
        toast.success('Removed from favorites');
      } else {
        // Add
        await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            facility_id: facilityId
          });
        toast.success('Added to favorites!');
      }
    } catch (err) {
      setIsFavorited(previousState);
      toast.error('Failed to update favorites');
    }
  };

  if (loading) return <div className={`w-8 h-8 rounded-full bg-white/5 animate-pulse ${className}`} />;

  return (
    <button
      onClick={toggleFavorite}
      className={`group relative p-2 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 ${
        isFavorited 
          ? 'bg-red-500/10 text-red-500' 
          : 'bg-black/20 backdrop-blur-md text-white hover:bg-white hover:text-charcoal'
      } ${className}`}
    >
      <Heart
        size={size}
        className={`transition-all duration-300 ${isFavorited ? 'fill-red-500 scale-110' : 'group-hover:scale-110'}`}
      />
    </button>
  );
};
