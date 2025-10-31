import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TriangleAlert, CheckCircle } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  closeText?: string;
  type?: 'alert' | 'success';
}

const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  title,
  message,
  onClose,
  closeText = 'OK',
  type = 'alert',
}) => {

  const iconConfig = {
    alert: {
      icon: <TriangleAlert className="w-8 h-8 text-yellow-500" />,
      bg: 'bg-yellow-500/10'
    },
    success: {
      icon: <CheckCircle className="w-8 h-8 text-green-500" />,
      bg: 'bg-green-500/10'
    }
  };

  const currentConfig = iconConfig[type];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
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
              <div className={`p-3 rounded-full ${currentConfig.bg}`}>
                {currentConfig.icon}
              </div>
            </div>
            <h2 className="text-xl font-bold mb-2">{title}</h2>
            <p className="text-light-text-secondary dark:text-dark-text-secondary mb-6">
              {message}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={onClose}
                className="w-full py-3 text-lg font-semibold bg-light-accent dark:bg-dark-accent text-light-bg dark:text-dark-bg rounded-full shadow-md transition-transform hover:scale-105 active:scale-95"
              >
                {closeText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AlertModal;