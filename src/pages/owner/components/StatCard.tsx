import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: LucideIcon;
  color?: 'lime' | 'blue' | 'orange';
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  label, 
  value, 
  subValue, 
  icon: Icon, 
  color = 'lime',
  trend 
}) => {
  const colorClasses = {
    lime: 'bg-lime/10 blur-2xl group-hover:scale-150',
    blue: 'bg-blue-500/10 blur-2xl group-hover:scale-150',
    orange: 'bg-orange-500/10 blur-2xl group-hover:scale-150',
  };

  return (
    <div className="glass p-8 rounded-[40px] border-white/5 relative overflow-hidden group h-full">
      <div className={`absolute -right-4 -top-4 w-24 h-24 ${colorClasses[color]} transition-transform duration-700`} />
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 relative z-10">{label}</p>
      <div className="flex items-end gap-3 relative z-10">
        <span className="text-5xl font-display font-black italic tracking-tighter text-white">
          {value}
        </span>
        {subValue && (
          <span className="text-lime text-[10px] font-black uppercase tracking-widest pb-2 flex items-center gap-1">
            {Icon && <Icon size={12} />} {subValue}
          </span>
        )}
      </div>
      {trend && (
        <p className="mt-2 text-[9px] font-bold text-slate-400 tracking-widest uppercase relative z-10">{trend}</p>
      )}
    </div>
  );
};
