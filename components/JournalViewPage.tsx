

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, Edit, Share2, Trash2, FileText, Copy, FileImage, FileQuestion, Link as LinkIcon } from 'lucide-react';
import { useAppContext } from '../App';
import { JournalEntry, Mood, Theme, Attachment } from '../types';
import Header from './Header';
import PdfViewer from './PdfViewer';

// Simplified HTML to Plain Text converter for copy-paste
const htmlToPlainText = (html: string): string => {
    const tempDiv = document.createElement('div');
    // Replace list items with bullet points for better text representation
    let formattedHtml = html
        .replace(/<li>/gi, '\n• ')
        .replace(/<\/li>/gi, '');
    tempDiv.innerHTML = formattedHtml;
    return tempDiv.textContent || tempDiv.innerText || '';
};

interface JournalViewPageProps {
    entry: JournalEntry;
}

const AttachmentIcon = ({ type }: { type: string }) => {
    if (type.startsWith('image/')) return <FileImage size={24} className="text-purple-400 shrink-0" />;
    if (type === 'application/pdf') return <FileText size={24} className="text-red-400 shrink-0" />;
    return <FileQuestion size={24} className="text-gray-400 shrink-0" />;
};

const fontClasses: Record<'default' | 'serif' | 'mono', string> = {
    default: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono'
};

const JournalViewPage: React.FC<JournalViewPageProps> = ({ entry: initialEntry }) => {
    const { 
        navigateBack, 
        navigateTo, 
        deleteJournalEntry, 
        showConfirmationModal, 
        vibrate, 
        settings, 
        focusHistory,
        journalEntries
    } = useAppContext();

    // Find the most up-to-date version of the entry from the global state to prevent stale data.
    const entry = useMemo(() => 
        journalEntries.find(e => e.id === initialEntry.id) || initialEntry,
        [journalEntries, initialEntry]
    );

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const menuRef = useRef<HTMLDivElement>(null);
    const shareMenuRef = useRef<HTMLDivElement>(null);

    const linkedSessions = useMemo(() => {
        if (!entry.linkedSessionIds || !focusHistory) return [];
        return focusHistory.filter(session => entry.linkedSessionIds!.includes(session.id));
    }, [entry.linkedSessionIds, focusHistory]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
            if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
                setIsShareMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const toggleMenu = () => {
        vibrate();
        setIsMenuOpen(prev => !prev);
        setIsShareMenuOpen(false); // Close share menu if main menu is toggled
    };

    const handleEdit = () => {
        setIsMenuOpen(false);
        navigateTo('journalEntry', { entry });
    };

    const handleShare = () => {
        setIsMenuOpen(false);
        // Use timeout to allow the main menu to close before the share menu opens, preventing the click-outside handler from misfiring.
        setTimeout(() => setIsShareMenuOpen(true), 10);
    };
    
    const handleSavePdf = () => {
        setIsShareMenuOpen(false);
        const date = new Date(entry.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const time = new Date(entry.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
        
        const title = entry.title || 'Untitled Entry';
    
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Aura Journal - ${title}</title>
                        <link rel="preconnect" href="https://fonts.googleapis.com">
                        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                        <style>
                            @page {
                                size: A4;
                                margin: 0.5in;
                            }
                            html, body {
                                margin: 0;
                                padding: 0;
                            }
                            body {
                                font-family: 'Inter', sans-serif;
                                line-height: 1.6;
                                font-size: 11pt;
                                color: #1a1a1a;
                                background-color: #ffffff;
                            }
                            .header {
                                text-align: left;
                                border-bottom: 1px solid #ddd;
                                padding-bottom: 1rem;
                                margin-bottom: 1rem;
                            }
                            .header h1 {
                                font-size: 22pt;
                                font-weight: 700;
                                margin: 0;
                                color: #000;
                            }
                            .header .meta-info {
                                font-size: 10pt;
                                color: #555;
                                margin-top: 0.5rem;
                            }
                            .content h2 { font-size: 15pt; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.5rem; border-bottom: 1px solid #eee; padding-bottom: 0.25rem; }
                            .content p { margin-bottom: 1rem; }
                            .content ul, .content ol { padding-left: 1.5rem; margin-bottom: 1rem; }
                            .content li { margin-bottom: 0.25rem; }
                            .content hr { border: none; border-top: 1px solid #ccc; margin: 2rem 0; }
                            .custom-highlight, [data-highlight="true"] { background-color: #fef9c3 !important; -webkit-print-color-adjust: exact; color-adjust: exact; padding: 0.1em 0; }
                        </style>
                    </head>
                    <body>
                        <div>
                            <div class="header">
                                <h1>${title}</h1>
                                <p class="meta-info">${date} &bull; ${time}</p>
                            </div>
                            <div class="content">${entry.content}</div>
                        </div>
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => { printWindow.print(); }, 500);
        }
    };

    const handleCopyText = () => {
        const plainText = htmlToPlainText(entry.content);
        const textToCopy = `${entry.title || 'Untitled Entry'}\n\n${plainText}`;
        navigator.clipboard.writeText(textToCopy).then(() => {
            setIsCopied(true);
            setTimeout(() => {
                setIsShareMenuOpen(false);
                setIsCopied(false);
            }, 1000);
        });
    };


    const handleDelete = () => {
        setIsMenuOpen(false);
        showConfirmationModal({
            title: 'Delete Entry?',
            message: 'This action cannot be undone. Are you sure you want to permanently delete this journal entry?',
            confirmText: 'Delete',
            onConfirm: async () => {
                vibrate('heavy');
                const success = await deleteJournalEntry(entry.id);
                if (success) {
                    navigateBack();
                }
            }
        });
    };
    
    const formattedDate = new Date(entry.date).toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const formattedTime = new Date(entry.date).toLocaleTimeString(undefined, {
        hour: 'numeric', minute: '2-digit'
    });

    const menuVariants = {
        hidden: { opacity: 0, scale: 0.95, y: -10 },
        visible: { opacity: 1, scale: 1, y: 0 },
    };

    const HeaderActions = (
        <div className="flex items-center gap-1">
            <AnimatePresence>
                {entry.linkedSessionIds && entry.linkedSessionIds.length > 0 && (
                    <motion.div
                        className="flex items-center gap-1.5 p-2 rounded-full text-light-primary dark:text-dark-primary"
                        aria-label={`${entry.linkedSessionIds.length} connections`}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                    >
                        <LinkIcon size={18} />
                        <span className="text-sm font-semibold">{entry.linkedSessionIds.length}</span>
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="relative">
                <motion.button 
                    onClick={toggleMenu} 
                    className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                    whileTap={{ scale: 0.9 }}
                    aria-label="More options"
                >
                    <MoreVertical size={20} />
                </motion.button>
                <AnimatePresence>
                    {isMenuOpen && (
                        <motion.div
                            ref={menuRef}
                            className="absolute top-12 right-0 w-48 bg-light-bg-secondary/95 dark:bg-dark-bg-secondary/95 backdrop-blur-sm rounded-xl border border-white/10 shadow-xl origin-top-right z-10"
                            variants={menuVariants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                        >
                            <div className="p-2">
                                 <button onClick={handleEdit} className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                    <Edit size={16} />
                                    <span>Edit</span>
                                </button>
                                 <button onClick={handleShare} className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                    <Share2 size={16} />
                                    <span>Share...</span>
                                </button>
                                <div className="h-[1px] bg-black/10 dark:bg-white/10 my-1 mx-2"></div>
                                 <button onClick={handleDelete} className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-md text-red-500 hover:bg-red-500/10 transition-colors">
                                    <Trash2 size={16} />
                                    <span>Delete</span>
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                 <AnimatePresence>
                    {isShareMenuOpen && (
                        <motion.div
                            ref={shareMenuRef}
                            className="absolute top-12 right-0 w-48 bg-light-bg-secondary/95 dark:bg-dark-bg-secondary/95 backdrop-blur-sm rounded-xl border border-white/10 shadow-xl origin-top-right z-10"
                            variants={menuVariants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                        >
                            <div className="p-2">
                                 <button onClick={handleSavePdf} className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                    <FileText size={16} />
                                    <span>Save as PDF</span>
                                </button>
                                 <button onClick={handleCopyText} className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                    <Copy size={16} />
                                    <span>{isCopied ? 'Copied!' : 'Copy Text'}</span>
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );

    const selectedFontStyle = entry.fontStyle || 'default';
    const useSmallText = entry.isSmallText || false;
    const useFullWidth = entry.isFullWidth || false;

    return (
        <div className={`w-full h-full flex flex-col bg-light-bg dark:bg-dark-bg ${fontClasses[selectedFontStyle]}`}>
            <Header 
                title={entry.title || 'Untitled Entry'}
                showBackButton 
                onBack={navigateBack}
                rightAction={HeaderActions}
            />
            <div className={`flex-grow w-full ${useFullWidth ? 'px-4 md:px-8 lg:px-12' : 'max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4'} overflow-y-auto transition-all duration-300`}>
                <div className="pb-24">
                    <h1 className="text-3xl font-bold mt-4 mb-2 break-words">
                        {entry.title || 'Untitled Entry'}
                    </h1>
                    <div className="mb-6 border-b border-white/10 pb-4">
                        <p className="font-medium text-light-text-secondary dark:text-dark-text-secondary">{formattedDate}</p>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{formattedTime}</p>
                    </div>
                    <div
                        className={`journal-view-content leading-relaxed ${useSmallText ? 'text-base' : 'text-lg'}`}
                        dangerouslySetInnerHTML={{ __html: entry.content }}
                    />
                    {entry.attachments && entry.attachments.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-white/10">
                            <h2 className="font-semibold text-sm uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary mb-3">Attachments</h2>
                            <div className="space-y-3">
                                {entry.attachments.map((att, index) => (
                                    <motion.div
                                        key={att.id}
                                        className="bg-light-glass/80 dark:bg-dark-glass/80 rounded-2xl border border-white/10 overflow-hidden"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                    >
                                        <div className="flex items-center justify-between p-3 border-b border-white/10">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <AttachmentIcon type={att.type} />
                                                <span className="font-semibold truncate pr-2">{att.name}</span>
                                            </div>
                                            <button
                                                onClick={() => navigateTo('attachmentViewer', { attachments: entry.attachments, startIndex: index })}
                                                className="px-4 py-1.5 text-sm font-semibold bg-light-bg-secondary dark:bg-dark-bg-secondary rounded-full shadow-sm"
                                            >
                                                View
                                            </button>
                                        </div>
                                        <div 
                                            onClick={() => navigateTo('attachmentViewer', { attachments: entry.attachments, startIndex: index })}
                                            className="h-48 flex items-center justify-center bg-black/5 dark:bg-white/5 cursor-pointer"
                                        >
                                            {att.type.startsWith('image/') ? (
                                                <img src={att.data} alt={att.name} className="max-w-full max-h-full object-contain" />
                                            ) : att.type === 'application/pdf' ? (
                                                <PdfViewer dataUrl={att.data} isThumbnail={true} />
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary">
                                                    <AttachmentIcon type={att.type} />
                                                    <span>Click to View</span>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}
                     {linkedSessions.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-white/10">
                            <h2 className="font-semibold text-sm uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary mb-3">Connections</h2>
                            <div className="space-y-3">
                                {linkedSessions.map(session => (
                                    <div key={session.id} className="flex justify-between items-center p-4 bg-black/5 dark:bg-white/5 rounded-xl">
                                        <div>
                                            <p className="font-medium">{session.name || 'Focus Session'}</p>
                                            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                                {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </p>
                                        </div>
                                        <div className="font-medium text-right">
                                            {Math.round(session.duration / 60)} min
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
             <style>{`
                .journal-view-content h2 { font-size: 1.25rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.25rem; }
                .journal-view-content ul, .journal-view-content ol { padding-left: 1.5rem; margin: 0.5rem 0; }
                .journal-view-content ul { list-style-type: disc; }
                .journal-view-content ol { list-style-type: decimal; }
                .journal-view-content li { margin-bottom: 0.25rem; }
                .journal-view-content hr { border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 1.5rem 0; }
                html.light .journal-view-content hr { border-top-color: rgba(0, 0, 0, 0.1); }
                .font-serif { font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif; }
                .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
                .journal-view-content .custom-highlight, .journal-view-content [data-highlight="true"] {
                    color: inherit;
                    background-image: none !important;
                }
                html.dark .journal-view-content .custom-highlight, html.dark .journal-view-content [data-highlight="true"] {
                    color: #1a1a1a !important;
                }
            `}</style>
        </div>
    );
};

export default JournalViewPage;