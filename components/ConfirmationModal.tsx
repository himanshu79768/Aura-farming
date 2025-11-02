import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TriangleAlert } from 'lucide-react';
import { useAppContext } from '../App';

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
  const { vibrate, playUISound } = useAppContext();
  
  const handleConfirm = () => {
    vibrate('medium');
    playUISound('delete');
    onConfirm();
  };
  
  const handleCancel = () => {
    vibrate();
    playUISound('tap');
    onCancel();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleCancel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          {/* Modal Content */}
          <motion.div
            className="relative w-full max-w-sm p-6 bg-light-bg-secondary/85 dark:bg-dark-bg-secondary/85 rounded-2xl border border-white/10 dark:border-white/5 shadow-3xl text-center"
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
              <motion.button
                onClick={handleConfirm}
                className="w-full py-3 text-lg font-semibold bg-red-500 text-white rounded-full shadow-md"
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                {confirmText}
              </motion.button>
              <motion.button
                onClick={handleCancel}
                className="w-full py-3 text-lg font-semibold bg-light-glass dark:bg-dark-glass rounded-full shadow-md"
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                {cancelText}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;