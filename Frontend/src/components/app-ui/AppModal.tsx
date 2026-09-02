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
            className="fixed inset-0 backdrop-blur-xs"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`relative w-full ${resolvedMaxWidth} border rounded-2xl shadow-2xl overflow-hidden z-10`}
            style={{
              backgroundColor: 'var(--app-surface-card)',
              borderColor: 'var(--app-border)'
            }}
          >
            {(title || description) && (
              <div className="flex items-start justify-between px-6 py-4.5 border-b" style={{ borderColor: 'var(--app-border-subtle)' }}>
                <div>
                  {title && <h3 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--app-text-primary)' }}>{title}</h3>}
                  {description && (
                    <p className="text-xs mt-0.5 leading-normal" style={{ color: 'var(--app-text-secondary)' }}>{description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-lg transition-colors cursor-pointer"
                  style={{ color: 'var(--app-text-muted)' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = 'var(--app-text-primary)';
                    e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = 'var(--app-text-muted)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="p-6">{children}</div>

            {footer && (
              <div className="px-6 py-4 border-t flex items-center justify-end gap-2.5" style={{ backgroundColor: 'var(--app-surface-subtle)', borderColor: 'var(--app-border-subtle)' }}>
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
