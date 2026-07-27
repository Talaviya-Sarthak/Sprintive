import { motion } from 'framer-motion';
import Button from '../ui/Button';

interface DeleteMeetingDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  meetingTitle: string;
  loading?: boolean;
}

export default function DeleteMeetingDialog({ open, onClose, onConfirm, meetingTitle, loading }: DeleteMeetingDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative w-full max-w-sm bg-[#111827] border border-white/8 rounded-2xl p-6 shadow-2xl"
      >
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-[#F8FAFC] mb-1">Delete Meeting</h3>
          <p className="text-sm text-[#94A3B8] mb-2">
            Are you sure you want to delete "{meetingTitle}"?
          </p>
          <p className="text-xs text-[#475569] mb-6">This action cannot be undone.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" fullWidth onClick={onConfirm} loading={loading}>
            Delete
          </Button>
        </div>
      </motion.div>
    </div>
  );
}