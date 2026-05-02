import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Type } from 'lucide-react';

interface PromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  description?: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
}

export default function PromptDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  placeholder = 'Type here...',
  initialValue = '',
  confirmLabel = 'Submit',
  cancelLabel = 'Cancel',
  loading = false
}: PromptDialogProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
    }
  }, [isOpen, initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onConfirm(value);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="450px">
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center text-lime">
            <Type size={32} />
          </div>
          {description && (
            <p className="text-slate-400 font-medium leading-relaxed italic whitespace-normal break-words text-[13px] sm:text-sm md:text-base px-2">{description}</p>
          )}
        </div>

        <div className="space-y-2">
          <input
            autoFocus
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full glass border-white/10 px-6 py-4 rounded-2xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-lime/40 placeholder:text-white/20 transition-all"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 glass border-white/10 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 active:scale-95 transition-all text-slate-400"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={loading || !value.trim()}
            className="flex-1 bg-lime text-charcoal shadow-lime/20 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <div className="w-4 h-4 border-2 border-charcoal border-t-transparent rounded-full animate-spin" /> : confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
