import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, AlertTriangle } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const dataURLToUint8Array = (dataURL: string) => {
    const base64 = dataURL.split(',')[1];
    if (!base64) return new Uint8Array(0);
    try {
        const binary_string = window.atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes;
    } catch (e) {
        console.error("Failed to decode base64 string:", e);
        return new Uint8Array(0);
    }
};

interface PdfViewerProps {
    dataUrl: string;
    isThumbnail?: boolean;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ dataUrl, isThumbnail = false }) => {
    const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [scale, setScale] = useState(isThumbnail ? 1 : 0); // scale is CSS pixels scale
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dragConstraints, setDragConstraints] = useState({ top: 0, left: 0, right: 0, bottom: 0 });
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadPdf = async () => {
            setIsLoading(true);
            setError(null);
            setPdf(null);
            setCurrentPage(1);
            setScale(isThumbnail ? 1 : 0);

            const pdfData = dataURLToUint8Array(dataUrl);
            if (pdfData.length === 0) {
                setError("Invalid PDF data.");
                setIsLoading(false);
                return;
            }
            try {
                const loadingTask = pdfjsLib.getDocument({ data: pdfData });
                const loadedPdf = await loadingTask.promise;
                setPdf(loadedPdf);
                setNumPages(loadedPdf.numPages);
            } catch (error) {
                console.error("Error loading PDF:", error);
                setError("Could not load PDF file.");
                setIsLoading(false);
            }
        };

        if (dataUrl) {
            loadPdf();
        }
    }, [dataUrl, isThumbnail]);

    useEffect(() => {
        const render = async () => {
            if (!pdf) return;
            setIsLoading(true);

            try {
                const pageNum = isThumbnail ? 1 : currentPage;
                const page = await pdf.getPage(pageNum);
                const canvas = canvasRef.current;
                const container = containerRef.current;
                if (!canvas || !container) return;

                const dpr = window.devicePixelRatio || 1;
                const ctx = canvas.getContext('2d')!;
                
                let cssScale = scale;

                if (isThumbnail) {
                    if (container.clientWidth > 0) {
                        const viewport = page.getViewport({ scale: 1 });
                        cssScale = container.clientWidth / viewport.width;
                    } else {
                        setTimeout(render, 50);
                        return;
                    }
                } else if (scale === 0) { // Initial "fit to screen" for full viewer
                    if (container.clientWidth > 0 && container.clientHeight > 0) {
                        const viewport = page.getViewport({ scale: 1 });
                        const scaleToFitWidth = (container.clientWidth - 32) / viewport.width;
                        const scaleToFitHeight = (container.clientHeight - 32) / viewport.height;
                        const initialScale = Math.min(scaleToFitWidth, scaleToFitHeight);
                        setScale(initialScale);
                        return;
                    } else {
                        setTimeout(render, 50);
                        return;
                    }
                }

                if (cssScale <= 0) {
                    setIsLoading(false);
                    return;
                }

                const viewport = page.getViewport({ scale: cssScale * dpr });
                
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                const cssWidth = viewport.width / dpr;
                const cssHeight = viewport.height / dpr;

                canvas.style.width = `${cssWidth}px`;
                canvas.style.height = `${cssHeight}px`;

                const renderContext = {
                    canvasContext: ctx,
                    viewport: viewport,
                };
                await page.render(renderContext).promise;
                
                if (!isThumbnail) {
                    const containerEl = canvasContainerRef.current;
                    if (containerEl) {
                        const containerWidth = containerEl.clientWidth;
                        const containerHeight = containerEl.clientHeight;
                        const overflowX = Math.max(0, (cssWidth - containerWidth) / 2);
                        const overflowY = Math.max(0, (cssHeight - containerHeight) / 2);
                        setDragConstraints({ left: -overflowX, right: overflowX, top: -overflowY, bottom: overflowY });
                    }
                } else {
                    setDragConstraints({ top: 0, left: 0, right: 0, bottom: 0 });
                }

            } catch (e) {
                console.error("Error rendering PDF page:", e);
                setError("Could not render PDF page.");
            } finally {
                setIsLoading(false);
            }
        };

        if(pdf) render();
    }, [pdf, currentPage, scale, isThumbnail]);

    const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
    const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, numPages));
    const zoomIn = () => setScale(prev => (prev === 0 ? 1.2 : prev + 0.2));
    const zoomOut = () => setScale(prev => Math.max(0.2, (prev === 0 ? 0.8 : prev - 0.2)));

    if (error) {
        return <div className="w-full h-full flex flex-col items-center justify-center text-red-400 p-4 text-center">
            <AlertTriangle className="w-8 h-8 mb-2" />
            <p className="font-semibold">PDF Error</p>
            <p className="text-sm">{error}</p>
        </div>;
    }

    const isDraggable = !isThumbnail && (dragConstraints.left < 0 || dragConstraints.top < 0);

    return (
        <div ref={containerRef} className={`relative w-full h-full flex flex-col items-center justify-center ${isThumbnail ? '' : 'bg-black/10 dark:bg-white/5'}`}>
            <AnimatePresence>
                {isLoading && (
                    <motion.div 
                        className="absolute inset-0 flex items-center justify-center bg-light-bg/50 dark:bg-dark-bg/50 z-20"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <Loader className="animate-spin" />
                    </motion.div>
                )}
            </AnimatePresence>
            <div ref={canvasContainerRef} className={`flex-grow w-full flex items-center justify-center overflow-hidden ${isThumbnail ? '' : 'p-4'}`}>
                 <motion.div
                    drag={isDraggable}
                    dragConstraints={dragConstraints}
                    dragElastic={0.1}
                    style={{ cursor: isDraggable ? 'grab' : 'auto' }}
                    whileTap={{ cursor: isDraggable ? 'grabbing' : 'auto' }}
                    className="flex items-center justify-center"
                >
                    <canvas ref={canvasRef} className={`${isThumbnail ? '' : 'shadow-lg'}`}/>
                </motion.div>
            </div>
            {!isThumbnail && numPages > 0 && (
                <div className="flex-shrink-0 flex items-center justify-center gap-4 p-2 bg-light-glass/80 dark:bg-dark-glass/80 backdrop-blur-md rounded-full border border-white/10 shadow-lg my-2 z-10">
                    <button onClick={zoomOut} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ZoomOut size={20} /></button>
                    <button onClick={goToPrevPage} disabled={currentPage <= 1} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"><ChevronLeft size={20} /></button>
                    <span className="text-sm font-medium w-20 text-center">Page {currentPage} / {numPages}</span>
                    <button onClick={goToNextPage} disabled={currentPage >= numPages} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"><ChevronRight size={20} /></button>
                    <button onClick={zoomIn} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ZoomIn size={20} /></button>
                </div>
            )}
        </div>
    );
};

export default PdfViewer;
