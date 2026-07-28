import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export function AppModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
}: AppModalProps) {
  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`relative w-full ${widthClasses[maxWidth]} bg-[#11131C] border border-[#1E2232] rounded-xl shadow-2xl overflow-hidden z-10`}
          >
            {(title || description) && (
              <div className="flex items-start justify-between px-5 py-4 border-b border-[#181A26]">
                <div>
                  {title && <h3 className="text-sm font-bold text-[#F8FAFC]">{title}</h3>}
                  {description && (
                    <p className="text-xs text-[#64748B] mt-0.5">{description}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-1 text-[#64748B] hover:text-[#F8FAFC] rounded-lg hover:bg-[#181A26] transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            <div className="p-5">{children}</div>

            {footer && (
              <div className="px-5 py-3.5 bg-[#0C0D14] border-t border-[#181A26] flex items-center justify-end gap-2">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
