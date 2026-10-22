import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = true,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} maxWidth="max-w-md">
      <div className="flex items-start gap-4 mb-6">
        <div className={`p-3 rounded-xl shrink-0 ${isDestructive ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-studio-accent/10 text-studio-accent'}`}>
          <AlertTriangle size={24} />
        </div>
        <p className="text-slate-300 text-sm leading-relaxed mt-1">
          {message}
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-studio-800 hover:bg-studio-700 rounded-xl transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`px-4 py-2 text-sm font-semibold text-white rounded-xl transition-all shadow-md ${
            isDestructive 
              ? 'bg-red-600 hover:bg-red-500 shadow-red-900/30' 
              : 'bg-studio-accent hover:bg-studio-accent-hover shadow-indigo-900/30'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
};
