import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, FileText, Presentation } from 'lucide-react';

interface AttachmentTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (acceptType: string) => void;
}

const attachmentOptions = [
  { label: 'Photo', icon: Image, accept: 'image/jpeg, image/png' },
  { label: 'PDF', icon: FileText, accept: 'application/pdf' },
  { label: 'PPT', icon: Presentation, accept: '.ppt, .pptx, application/vnd.ms-powerpoint, application/vnd.openxmlformats-officedocument.presentationml.presentation' }
];

const AttachmentTypeModal: React.FC<AttachmentTypeModalProps> = ({ isOpen, onClose, onSelect }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-40"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute bottom-20 right-4 w-48 bg-light-bg-secondary/90 dark:bg-dark-bg-secondary/90 backdrop-blur-lg rounded-xl border border-white/10 shadow-lg p-2"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {attachmentOptions.map(option => (
              <button
                key={option.label}
                onClick={() => onSelect(option.accept)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <option.icon size={20} />
                <span className="font-medium">{option.label}</span>
              </button>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AttachmentTypeModal;
