import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/35"
        aria-label="Sulje"
        onClick={onClose}
      />
      <div className="relative w-full max-w-app mx-auto bg-[var(--w)] rounded-t-3xl sm:rounded-3xl border border-[var(--line)] shadow-xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[var(--g0)] text-[var(--mid)] font-bold"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
