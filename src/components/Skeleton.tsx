import React from 'react';

interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div 
      className={`animate-pulse bg-white/5 rounded-2xl ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
        backgroundSize: '200% 100%',
      }}
    />
  );
}
