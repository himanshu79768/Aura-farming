import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './Header';
import { useAppContext } from '../App';
import { Attachment } from '../types';
import { FileQuestion, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import PdfViewer from './PdfViewer';

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
    const [imageScale, setImageScale] = useState(1);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const [dragConstraints, setDragConstraints] = useState({ top: 0, left: 0, right: 0, bottom: 0 });
    
    const currentIndex = page;
    const currentAttachment = attachments[currentIndex];
    
    useEffect(() => {
        setImageScale(1); // Reset scale on page change
    }, [page]);

    const calculateConstraints = useCallback(() => {
        if (imageScale <= 1 || !containerRef.current || !imageRef.current) {
            setDragConstraints({ top: 0, left: 0, right: 0, bottom: 0 });
            return;
        }

        const container = containerRef.current;
        const image = imageRef.current;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Get the rendered size of the image, which accounts for `object-contain`
        const displayedWidth = image.clientWidth;
        const displayedHeight = image.clientHeight;

        const scaledWidth = displayedWidth * imageScale;
        const scaledHeight = displayedHeight * imageScale;

        const overflowX = Math.max(0, (scaledWidth - containerWidth) / 2);
        const overflowY = Math.max(0, (scaledHeight - containerHeight) / 2);

        setDragConstraints({
            left: -overflowX,
            right: overflowX,
            top: -overflowY,
            bottom: overflowY,
        });
    }, [imageScale]);

    useEffect(() => {
        // A timeout ensures the DOM is updated before we measure.
        const timeoutId = setTimeout(calculateConstraints, 0);
        
        window.addEventListener('resize', calculateConstraints);
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', calculateConstraints);
        };
    }, [calculateConstraints, page]);

    const zoomInImage = () => setImageScale(s => s + 0.2);
    const zoomOutImage = () => setImageScale(s => Math.max(0.2, s - 0.2));

    const paginate = (newDirection: number) => {
        let newIndex = page + newDirection;
        if (newIndex < 0) {
            newIndex = attachments.length - 1;
        } else if (newIndex >= attachments.length) {
            newIndex = 0;
        }
        setPage([newIndex, newDirection]);
    };

    const content = useMemo(() => {
        const attachment = attachments[page];
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
            return (
                <div ref={containerRef} className="w-full h-full flex items-center justify-center overflow-hidden">
                    <motion.img
                        ref={imageRef}
                        src={attachment.data} 
                        alt={attachment.name} 
                        className="max-w-full max-h-full object-contain"
                        style={{
                            scale: imageScale,
                            cursor: imageScale > 1 ? 'grab' : 'auto'
                        }}
                        whileTap={{ cursor: imageScale > 1 ? 'grabbing' : 'auto' }}
                        drag={imageScale > 1}
                        dragConstraints={dragConstraints}
                        dragElastic={0.1}
                    />
                </div>
            );
        }
        if (type === 'application/pdf') {
            return <PdfViewer dataUrl={attachment.data} />;
        }
        
        return (
            <div className="text-center p-8 flex flex-col items-center justify-center gap-4">
                <FileQuestion size={64} className="text-light-text-secondary dark:text-dark-text-secondary" />
                <h2 className="text-xl font-semibold">Preview not available</h2>
                <p className="text-light-text-secondary dark:text-dark-text-secondary">{attachment.name}</p>
            </div>
        );
    }, [page, attachments, imageScale, dragConstraints]);
    
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
                titleClassName="text-base"
            />
            <div className="relative flex-grow w-full flex items-center justify-center p-1 overflow-hidden">
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
                         {content}
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
            {currentAttachment.type.startsWith('image/') && (
                <div className="flex-shrink-0 flex items-center justify-center gap-4 p-2 z-10">
                    <div className="flex items-center justify-center gap-4 p-2 bg-light-glass/80 dark:bg-dark-glass/80 backdrop-blur-md rounded-full border border-white/10 shadow-lg my-2">
                        <button onClick={zoomOutImage} disabled={imageScale <= 0.2} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"><ZoomOut size={20} /></button>
                        <button onClick={() => setImageScale(1)} disabled={imageScale === 1} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-sm font-medium disabled:opacity-50">Reset</button>
                        <button onClick={zoomInImage} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ZoomIn size={20} /></button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttachmentViewerPage;