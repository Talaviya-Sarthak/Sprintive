import { motion } from 'framer-motion';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`relative w-full ${maxWidth} max-h-[90vh] overflow-y-auto bg-[#141417] border border-[#27272a] rounded-2xl shadow-2xl`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f23]">
          <h2 className="text-base font-semibold text-[#f4f4f5]">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[#1c1c21] flex items-center justify-center text-[#a1a1aa] hover:text-[#f4f4f5] transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
}