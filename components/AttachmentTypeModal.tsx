import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, FileText } from 'lucide-react';

interface AttachmentTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (acceptType: string) => void;
}

const attachmentOptions = [
  { label: 'Photo', icon: Image, accept: 'image/jpeg, image/png, image/gif, image/webp', description: 'JPG, PNG, GIF, WebP' },
  { label: 'Document', icon: FileText, accept: 'application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.ms-powerpoint, application/vnd.openxmlformats-officedocument.presentationml.presentation', description: 'PDF, Word, PowerPoint' }
];

const AttachmentTypeModal: React.FC<AttachmentTypeModalProps> = ({ isOpen, onClose, onSelect }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end p-2 bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-md mx-auto bg-light-bg-secondary/95 dark:bg-dark-bg-secondary/95 backdrop-blur-md rounded-2xl border border-white/10 shadow-3xl p-4"
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "100%" }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            onDragEnd={(_, info) => { if (info.offset.y > 100) onClose(); }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 flex justify-center pt-3 cursor-grab">
              <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
            </div>
            <div className="pt-4">
              <h3 className="text-lg font-semibold text-center mb-4">Add Attachment</h3>
              <div className="space-y-2">
                {attachmentOptions.map(option => (
                  <button
                    key={option.label}
                    onClick={() => onSelect(option.accept)}
                    className="w-full flex items-center gap-4 text-left p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="p-2 bg-light-accent/10 dark:bg-dark-accent/10 text-light-accent dark:text-dark-accent rounded-lg"><option.icon size={20} /></div>
                    <div>
                      <p className="font-semibold">{option.label}</p>
                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{option.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AttachmentTypeModal;