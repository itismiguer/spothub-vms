import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Option {
  id: string;
  label: string;
  icon?: React.ElementType;
}

interface SelectorProps {
  options: Option[];
  selectedId: string;
  onSelect: (id: string) => void;
  label?: string;
  placeholder?: string;
  loading?: boolean;
  className?: string;
  variant?: 'default' | 'compact';
  footerAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ElementType;
  };
}

export default function Selector({ 
  options, 
  selectedId, 
  onSelect, 
  label, 
  placeholder = 'Select an option', 
  loading = false,
  className = '',
  variant = 'default',
  footerAction
}: SelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(opt => opt.id === selectedId);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className={`w-full glass border-white/5 p-4 rounded-2xl flex items-center gap-3 animate-pulse ${className}`}>
        <div className="w-4 h-4 bg-lime/20 rounded-full" />
        <div className="h-4 bg-white/10 rounded w-1/2" />
        <Loader2 size={14} className="ml-auto text-lime animate-spin opacity-40" />
      </div>
    );
  }

  const Icon = selectedOption?.icon;

  return (
    <div ref={containerRef} className={`relative w-full ${className} ${isOpen ? 'z-[900]' : 'z-[5]'}`}>
      {label && (
        <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1 mb-2 block">
          {label}
        </label>
      )}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-12 flex items-center gap-4 px-6 glass border border-white/10 rounded-2xl transition-all duration-300 group hover:border-lime/40 focus:outline-none focus:ring-2 focus:ring-lime/20 ${isOpen ? 'border-lime/40 ring-2 ring-lime/20' : ''}`}
      >
        <div className="flex-shrink-0 w-4 font-bold flex items-center justify-center">
          {Icon ? <Icon size={16} className="text-lime" /> : <div className="w-1.5 h-1.5 rounded-full bg-lime" />}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-white text-left flex-1 whitespace-normal break-words leading-relaxed">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={16} 
          className={`flex-shrink-0 text-lime transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 5, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a0a] border border-white/10 rounded-[28px] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-[500] p-1.5 backdrop-blur-3xl"
          >
            <div className="max-h-60 overflow-y-auto no-scrollbar py-1">
              {options.map((option) => {
                const isSelected = option.id === selectedId;
                const OptionIcon = option.icon;
                
                return (
                  <button
                    key={option.id}
                    onClick={() => {
                      onSelect(option.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl transition-all group ${
                      isSelected 
                        ? 'bg-lime text-charcoal shadow-lg shadow-lime/20 font-black' 
                        : 'hover:bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex-shrink-0 w-4 flex items-center justify-center">
                      {OptionIcon ? <OptionIcon size={14} className={isSelected ? 'text-charcoal' : 'text-lime'} /> : <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-charcoal' : 'bg-lime'}`} />}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-left flex-1 whitespace-normal break-words leading-relaxed">
                      {option.label}
                    </span>
                    {isSelected && (
                      <motion.div 
                        layoutId="activeOption"
                        className="w-1.5 h-1.5 rounded-full bg-charcoal"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {footerAction && (
              <div className="border-t border-white/10 p-1">
                <button
                  onClick={() => {
                    footerAction.onClick();
                    setIsOpen(false);
                  }}
                  className="w-full h-[60px] flex items-center gap-4 px-6 hover:bg-lime/10 text-lime rounded-2xl transition-all group"
                >
                  <div className="flex-shrink-0 w-4 flex items-center justify-center">
                    {footerAction.icon ? <footerAction.icon size={16} /> : <div className="w-1.5 h-1.5 rounded-full bg-lime" />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-left flex-1">
                    {footerAction.label}
                  </span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
