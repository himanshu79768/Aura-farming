import React from 'react';
import { motion } from 'framer-motion';
import { FileImage, FileText, FileQuestion, X } from 'lucide-react';
import { Attachment } from '../types';

interface AttachmentPreviewProps {
    attachment: Attachment;
    onRemove?: (attachment: Attachment) => void;
    onClick?: () => void;
}

const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({ attachment, onRemove, onClick }) => {
    const getIcon = () => {
        const type = attachment.type.toLowerCase();
        if (type.startsWith('image/')) return <FileImage size={20} className="text-blue-400" />;
        if (type === 'application/pdf') return <FileText size={20} className="text-red-400" />;
        if (type.includes('powerpoint') || type.includes('presentation')) return <FileQuestion size={20} className="text-orange-400" />;
        return <FileQuestion size={20} />;
    };

    const Wrapper = onClick ? motion.button : motion.div;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="relative"
        >
            <Wrapper
                onClick={onClick}
                className="flex items-center gap-2 p-2 pr-3 bg-light-glass/80 dark:bg-dark-glass/80 rounded-lg border border-white/10"
                whileHover={onClick ? { scale: 1.05 } : {}}
                whileTap={onClick ? { scale: 0.95 } : {}}
            >
                {getIcon()}
                <span className="text-sm max-w-[120px] truncate" title={attachment.name}>{attachment.name}</span>
            </Wrapper>
            {onRemove && (
                 <button 
                    onClick={() => onRemove(attachment)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-500 text-white rounded-full flex items-center justify-center text-xs shadow-md z-10"
                    aria-label="Remove attachment"
                 >
                     <X size={12} />
                 </button>
            )}
        </motion.div>
    );
};

export default AttachmentPreview;
