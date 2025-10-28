import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './Header';
import { useAppContext } from '../App';
import { Attachment } from '../types';
import { FileQuestion, Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface AttachmentViewerPageProps {
    attachments: Attachment[];
    startIndex: number;
}

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
  }),
};

const AttachmentViewerPage: React.FC<AttachmentViewerPageProps> = ({ attachments, startIndex }) => {
    const { navigateBack } = useAppContext();
    const [[page, direction], setPage] = useState([startIndex, 0]);

    const currentIndex = page;
    const currentAttachment = attachments[currentIndex];

    const paginate = (newDirection: number) => {
        let newIndex = page + newDirection;
        if (newIndex < 0) {
            newIndex = attachments.length - 1;
        } else if (newIndex >= attachments.length) {
            newIndex = 0;
        }
        setPage([newIndex, newDirection]);
    };

    const renderContent = (attachment: Attachment) => {
        if (!attachment || !attachment.data) {
             return (
                <div className="text-center p-8 flex flex-col items-center justify-center gap-4">
                    <FileQuestion size={64} className="text-light-text-secondary dark:text-dark-text-secondary" />
                    <h2 className="text-xl font-semibold">Could not load file</h2>
                </div>
            );
        }

        const type = attachment.type.toLowerCase();
        if (type.startsWith('image/')) {
            return <img src={attachment.data} alt={attachment.name} className="max-w-full max-h-full object-contain" />;
        }
        if (type === 'application/pdf') {
            return <iframe src={attachment.data} className="w-full h-full border-none" title={attachment.name} />;
        }
        
        return (
            <div className="text-center p-8 flex flex-col items-center justify-center gap-4">
                <FileQuestion size={64} className="text-light-text-secondary dark:text-dark-text-secondary" />
                <h2 className="text-xl font-semibold">Preview not available</h2>
                <p className="text-light-text-secondary dark:text-dark-text-secondary">{attachment.name}</p>
            </div>
        );
    };
    
    const DownloadButton = (
         <a href={currentAttachment.data} download={currentAttachment.name} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
            <Download size={20} />
        </a>
    );

    return (
        <div className="w-full h-full flex flex-col bg-light-bg dark:bg-dark-bg">
            <Header 
                title={currentAttachment.name} 
                showBackButton 
                onBack={navigateBack}
                rightAction={DownloadButton}
            />
            <div className="relative flex-grow w-full h-full flex items-center justify-center p-1 overflow-hidden">
                <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                        key={page}
                        className="absolute w-full h-full flex items-center justify-center"
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: 'spring', stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 },
                        }}
                    >
                         {renderContent(currentAttachment)}
                    </motion.div>
                </AnimatePresence>

                {attachments.length > 1 && (
                    <>
                        <button 
                            onClick={() => paginate(-1)} 
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/20 text-white rounded-full backdrop-blur-sm"
                        >
                            <ChevronLeft size={24} />
                        </button>
                         <button 
                            onClick={() => paginate(1)} 
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/20 text-white rounded-full backdrop-blur-sm"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default AttachmentViewerPage;
