import React from 'react';

export const TableSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-20 glass rounded-3xl border-white/5" />
    ))}
  </div>
);

export const DashboardSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="h-32 glass rounded-[32px] border-white/5" />
    ))}
    <div className="md:col-span-2 lg:col-span-3 h-[400px] glass rounded-[48px] border-white/5" />
    <div className="md:col-span-1 lg:col-span-1 h-[400px] glass rounded-[48px] border-white/5" />
  </div>
);

export const DetailSkeleton = () => (
  <div className="space-y-12 animate-pulse">
    <div className="h-64 glass rounded-[56px] border-white/5" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
      <div className="lg:col-span-2 space-y-8">
         <div className="h-8 w-1/3 bg-white/10 rounded-full" />
         <div className="h-32 bg-white/5 rounded-[32px]" />
      </div>
      <div className="space-y-8">
         <div className="h-64 bg-white/5 rounded-[40px]" />
      </div>
    </div>
  </div>
);
