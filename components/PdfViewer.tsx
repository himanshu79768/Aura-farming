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
    // Initialize scale to 0 to indicate it needs to be auto-calculated for full view
    const [scale, setScale] = useState(isThumbnail ? 1 : 0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadPdf = async () => {
            setIsLoading(true);
            setError(null);
            setPdf(null); // Reset pdf on dataUrl change
            setCurrentPage(1); // Reset to first page
            setScale(isThumbnail ? 1 : 0); // Reset scale for recalculation

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

        return () => {
            // pdf.destroy() is called in the component unmount, but also needs to be available if the component re-renders with a new pdf.
            // The current implementation re-initializes pdf state so the old one is garbage collected.
        };
    }, [dataUrl, isThumbnail]);

    useEffect(() => {
        if (!pdf) return;

        const render = async () => {
            setIsLoading(true);
            try {
                const pageNum = isThumbnail ? 1 : currentPage;
                const page = await pdf.getPage(pageNum);
                const canvas = canvasRef.current;
                const container = containerRef.current;
                if (!canvas || !container) return;
                
                let renderScale = scale;

                if (isThumbnail) {
                    if (container.clientWidth > 0) {
                        const viewport = page.getViewport({ scale: 1 });
                        renderScale = container.clientWidth / viewport.width;
                    } else {
                        setTimeout(render, 50);
                        return;
                    }
                } else if (scale === 0) { // Auto-calculate initial scale for full view
                    if (container.clientWidth > 0 && container.clientHeight > 0) {
                        const viewport = page.getViewport({ scale: 1 });
                        
                        const isPortrait = container.clientHeight > container.clientWidth;
                        let calculatedScale;

                        if (isPortrait) {
                            // Mobile view: fit-to-width
                            // Container has `p-4` (1rem padding on all sides). Total horizontal padding is 32px.
                            calculatedScale = (container.clientWidth - 32) / viewport.width;
                        } else {
                            // Desktop view: fit-to-height
                            // Container has `p-4` (1rem padding on all sides). Total vertical padding is 32px.
                            calculatedScale = (container.clientHeight - 32) / viewport.height;
                        }
                        
                        setScale(calculatedScale);
                        // The state update will trigger a re-render, so we can exit.
                        return;
                    } else {
                        // Wait for container to have dimensions
                        setTimeout(render, 50);
                        return;
                    }
                }

                if (renderScale <= 0) {
                    // Don't render if scale is not yet calculated
                    setIsLoading(false);
                    return;
                }
                
                const viewport = page.getViewport({ scale: renderScale });
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: canvas.getContext('2d')!,
                    viewport: viewport,
                };
                await page.render(renderContext).promise;

            } catch (e) {
                console.error("Error rendering PDF page:", e);
                setError("Could not render PDF page.");
            } finally {
                setIsLoading(false);
            }
        };

        render();
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
            <div className={`flex-grow w-full flex items-center justify-center overflow-auto ${isThumbnail ? '' : 'p-4'}`}>
                <canvas ref={canvasRef} className={`${isThumbnail ? '' : 'shadow-lg'}`}/>
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