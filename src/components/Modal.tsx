import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = '500px' }: ModalProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
          id="modal-container"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-3xl"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 30, stiffness: 450 }}
            style={{ maxWidth }}
            className="relative w-[92%] bg-white/[0.03] backdrop-blur-3xl rounded-[32px] sm:rounded-[48px] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh] h-auto"
          >
            <div className="p-6 sm:p-8 flex items-center justify-between border-b border-white/5 bg-white/[0.02] shrink-0 relative">
              <h3 className="text-xl sm:text-2xl md:text-3xl font-display font-black uppercase italic tracking-tighter text-[#B5F55A] pr-14 leading-tight whitespace-normal break-words">
                {title.split(' ').map((word, i) => (
                   <span key={i} className={i === 0 ? 'text-[#B5F55A]' : 'text-white/60 ml-1.5'}>{word}</span>
                ))}
              </h3>
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 w-12 h-12 glass rounded-full flex items-center justify-center hover:bg-[#B5F55A] hover:text-black transition-all text-white border border-white/20 hover:border-[#B5F55A] z-50 focus:outline-none"
                id="modal-close-button"
              >
                <X size={28} className="text-white" />
              </button>
            </div>
            
            <div className="p-6 sm:p-8 overflow-y-auto no-scrollbar flex-1 whitespace-normal break-words leading-relaxed text-[13px] sm:text-sm md:text-base text-slate-100">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
