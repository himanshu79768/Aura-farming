import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TriangleAlert } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur"
          onClick={onCancel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {/* Modal Content */}
          <motion.div
            className="relative w-full max-w-sm p-6 bg-light-bg-secondary/60 dark:bg-dark-bg-secondary/60 rounded-2xl border border-white/10 dark:border-white/5 shadow-3xl text-center"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-500/10 rounded-full">
                <TriangleAlert className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <h2 className="text-xl font-bold mb-2">{title}</h2>
            <p className="text-light-text-secondary dark:text-dark-text-secondary mb-6">
              {message}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={onConfirm}
                className="w-full py-3 text-lg font-semibold bg-red-500 text-white rounded-full shadow-md transition-transform hover:scale-105 active:scale-95"
              >
                {confirmText}
              </button>
              <button
                onClick={onCancel}
                className="w-full py-3 text-lg font-semibold bg-light-glass dark:bg-dark-glass rounded-full shadow-md transition-transform hover:scale-105 active:scale-95"
              >
                {cancelText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;