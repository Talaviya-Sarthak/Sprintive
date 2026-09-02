import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export interface AppModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | string;
}

export function AppModal({
  isOpen,
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
}: AppModalProps) {
  const isModalOpen = open ?? isOpen ?? false;

  const widthClasses: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  const resolvedMaxWidth = maxWidth.startsWith('max-w-')
    ? maxWidth
    : widthClasses[maxWidth] ?? 'max-w-md';

  return (
    <AnimatePresence>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`relative w-full ${resolvedMaxWidth} bg-[#141417] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden z-10`}
          >
            {(title || description) && (
              <div className="flex items-start justify-between px-6 py-5 border-b border-[#1a1a1e]">
                <div>
                  {title && <h3 className="text-[15px] font-semibold text-[#f4f4f5] tracking-tight">{title}</h3>}
                  {description && (
                    <p className="text-[13px] text-[#71717a] mt-0.5 leading-relaxed">{description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-[#71717a] hover:text-[#f4f4f5] rounded-lg hover:bg-[#1c1c21] transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="p-6">{children}</div>

            {footer && (
              <div className="px-6 py-4 bg-[#111215] border-t border-[#1a1a1e] flex items-center justify-end gap-2.5">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
