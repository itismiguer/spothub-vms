import React from 'react';
import Modal from './Modal';
import { AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';

interface ActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export default function ActionDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  type = 'info',
  loading = false
}: ActionDialogProps) {
  const getIcon = () => {
    switch (type) {
      case 'danger': return <AlertCircle className="text-red-500" size={32} />;
      case 'warning': return <HelpCircle className="text-orange-500" size={32} />;
      default: return <CheckCircle2 className="text-lime" size={32} />;
    }
  };

  const getConfirmStyles = () => {
    switch (type) {
      case 'danger': return 'bg-red-500 text-white shadow-red-500/20';
      case 'warning': return 'bg-orange-500 text-white shadow-orange-500/20';
      default: return 'bg-lime text-charcoal shadow-lime/20';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="450px">
      <div className="space-y-8 flex flex-col items-center text-center">
        <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center">
          {getIcon()}
        </div>
        
        <div className="space-y-4 px-2">
          <p className="text-slate-300 font-medium leading-relaxed italic whitespace-normal break-words text-[13px] sm:text-sm md:text-base">{description}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
          <button
            onClick={onClose}
            className="flex-1 glass border-white/10 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 active:scale-95 transition-all text-white"
          >
            {cancelLabel}
          </button>
          <button
            disabled={loading}
            onClick={() => {
              onConfirm();
            }}
            className={`flex-1 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2 ${getConfirmStyles()} disabled:opacity-50`}
          >
            {loading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
