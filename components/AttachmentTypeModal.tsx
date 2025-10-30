

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, FileText } from 'lucide-react';

interface AttachmentTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (acceptType: string) => void;
}

const attachmentOptions = [
  { label: 'Photo', icon: Image, accept: 'image/jpeg, image/png' },
  { label: 'Files', icon: FileText, accept: 'application/pdf, .ppt, .pptx, application/vnd.ms-powerpoint, application/vnd.openxmlformats-officedocument.presentationml.presentation, .doc, .docx, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
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
            className="absolute bottom-20 right-4 w-48 bg-light-bg-secondary/60 dark:bg-dark-bg-secondary/60 backdrop-blur-md rounded-xl border border-white/10 shadow-3xl p-2"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {attachmentOptions.map((option, index) => (
              <React.Fragment key={option.label}>
                <button
                  onClick={() => onSelect(option.accept)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <option.icon size={20} />
                  <span className="font-medium">{option.label}</span>
                </button>
                {index < attachmentOptions.length - 1 && (
                  <div className="h-px bg-black/10 dark:bg-white/10 mx-2"></div>
                )}
              </React.Fragment>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AttachmentTypeModal;