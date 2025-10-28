import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, Edit, Share2, Trash2, Download, FileText, Copy, Loader } from 'lucide-react';
import { useAppContext } from '../App';
import { JournalEntry, Mood, Theme } from '../types';
import Header from './Header';
import AttachmentPreview from './AttachmentPreview';

const moodColors: Record<Mood, { gradient: [string, string, string] }> = {
    [Mood.Calm]: { gradient: ['#3b82f6', '#60a5fa', '#818cf8'] },
    [Mood.Focus]: { gradient: ['#a855f7', '#c084fc', '#f472b6'] },
    [Mood.Energize]: { gradient: ['#f59e0b', '#facc15', '#fb923c'] },
};

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

const generateShareableImage = async (entry: JournalEntry, theme: Theme.Light | Theme.Dark, mood: Mood): Promise<Blob | null> => {
    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    const width = 1080;
    const height = 1920; // Portrait FHD
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;
    ctx.scale(dpr, dpr);

    // Theme-based colors to match the app's look and feel
    const bgColor = theme === Theme.Light ? '#f8f9fb' : '#0f0f0f';
    const textColor = theme === Theme.Light ? '#1a1a1a' : '#f8f9fb';
    const secondaryColor = theme === Theme.Light ? 'rgba(26, 26, 26, 0.7)' : 'rgba(248, 249, 251, 0.7)';
    const hrColor = theme === Theme.Light ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';

    // 1. Solid background color
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // 2. Subtle mood gradient overlay (bottom to top, like in the app)
    const moodGradientColors = {
        [Mood.Calm]: 'rgba(96, 165, 250, 0.15)',
        [Mood.Focus]: 'rgba(192, 132, 252, 0.15)',
        [Mood.Energize]: 'rgba(250, 204, 21, 0.15)',
    };
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, moodGradientColors[mood]);
    gradient.addColorStop(0.6, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const padding = 80;
    const maxWidth = width - padding * 2;
    let y = padding + 40;

    // --- Title & Date ---
    ctx.fillStyle = secondaryColor;
    ctx.font = '32px Inter, sans-serif';
    const date = new Date(entry.date);
    const dateString = date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    ctx.fillText(dateString, padding, y);
    y += 80;

    ctx.fillStyle = textColor;
    ctx.font = 'bold 52px Inter, sans-serif';
    const titleText = entry.title || 'Untitled Entry';
    // Use a basic text wrapper for the title
    const wrapSimpleText = (text: string, startY: number, font: string, lineHeight: number, indent = 0) => {
        ctx.font = font;
        const words = text.split(' ');
        let line = '';
        let currentY = startY;
        for (const word of words) {
            const testLine = line + word + ' ';
            if (ctx.measureText(testLine).width > maxWidth - indent) {
                ctx.fillText(line.trim(), padding + indent, currentY);
                line = word + ' ';
                currentY += lineHeight;
            } else { line = testLine; }
        }
        ctx.fillText(line.trim(), padding + indent, currentY);
        return currentY;
    };
    y = wrapSimpleText(titleText, y, 'bold 52px Inter, sans-serif', 65) + 65 + 20;

    // --- Content Renderer ---
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = entry.content;

    let x = padding;
    
    const renderText = (text: string, font: string, indent = 0) => {
        ctx.font = font;
        const words = text.split(' ');
        for (const word of words) {
            const wordWidth = ctx.measureText(word + ' ').width;
            if (x + wordWidth > width - padding) {
                y += 60; // Line height
                x = padding + indent;
            }
            ctx.fillText(word, x, y);
            x += ctx.measureText(word + ' ').width;
        }
    };
    
    const renderNode = (node: ChildNode, listType: 'ol' | 'ul' | null = null, nextListCounter: { count: number; type: 'ol' | 'ul' } | null = null) => {
        const tagName = (node as HTMLElement).tagName?.toLowerCase();

        if (tagName && ['p', 'h2', 'ul', 'ol', 'li', 'hr', 'div'].includes(tagName)) {
             y += (x > padding ? 60 : 20); // Add space between block elements
             x = padding;
        }
        
        if (node.nodeType === Node.TEXT_NODE) {
            ctx.fillStyle = textColor;
            renderText(node.textContent || '', '40px Inter, sans-serif', listType ? 40 : 0);
        } else if (tagName) {
            switch (tagName) {
                case 'h2':
                    y += 15;
                    ctx.fillStyle = textColor;
                    renderText(node.textContent || '', '600 38px Inter, sans-serif');
                    y += 15;
                    break;
                case 'ul':
                case 'ol':
                    node.childNodes.forEach(child => renderNode(child, tagName, { count: 1, type: tagName }));
                    break;
                case 'li':
                    x = padding + 40;
                    ctx.font = '40px Inter, sans-serif';
                    ctx.fillStyle = textColor;
                    const bullet = listType === 'ol' && nextListCounter ? `${nextListCounter.count++}.` : '•';
                    ctx.fillText(bullet, x - 35, y);
                    node.childNodes.forEach(child => renderNode(child));
                    break;
                case 'hr':
                    y += 30;
                    ctx.fillStyle = hrColor;
                    ctx.fillRect(padding, y, maxWidth, 2);
                    y += 30;
                    x = padding;
                    break;
                default:
                    node.childNodes.forEach(child => renderNode(child, listType, nextListCounter));
                    break;
            }
        }
    };
    
    Array.from(tempDiv.childNodes).forEach(node => renderNode(node));


    // --- Footer ---
    ctx.fillStyle = secondaryColor;
    ctx.globalAlpha = 0.7;
    ctx.font = '28px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Shared from Aura • Find your calm', width / 2, height - padding + 20);
    ctx.globalAlpha = 1.0;

    return new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.95);
    });
};

interface JournalViewPageProps {
    entry: JournalEntry;
}

const JournalViewPage: React.FC<JournalViewPageProps> = ({ entry: initialEntry }) => {
    const { 
        navigateBack, 
        navigateTo, 
        deleteJournalEntry, 
        showConfirmationModal, 
        vibrate, 
        mood, 
        settings, 
        showAlertModal, 
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
    const [isGenerating, setIsGenerating] = useState(false);
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

    const resolvedTheme = useMemo((): Theme.Light | Theme.Dark => {
        if (settings.theme !== Theme.Auto) return settings.theme;
        return document.documentElement.classList.contains('dark') ? Theme.Dark : Theme.Light;
    }, [settings.theme]);

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

    const handleDownloadImage = async () => {
        setIsGenerating(true);
        const blob = await generateShareableImage(entry, resolvedTheme, mood);
        setIsGenerating(false);
        setIsShareMenuOpen(false);

        if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const safeTitle = (entry.title || 'aura-journal-entry').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            link.download = `${safeTitle}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } else {
             showAlertModal({ title: "Download Failed", message: "Could not generate the image. Please try again." });
        }
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
                            body { font-family: 'Inter', sans-serif; line-height: 1.6; padding: 2rem; font-size: 1.1rem; }
                            h1 { font-size: 1.8rem; font-weight: 700; margin-bottom: 0.5rem; }
                            h2.date { font-size: 1rem; font-weight: 400; color: #666; margin-top: 0; }
                            h2 { font-size: 1.4rem; font-weight: 600; margin-top: 1.8rem; margin-bottom: 0.5rem; }
                            ul, ol { padding-left: 1.5rem; }
                            li { margin-bottom: 0.25rem; }
                            hr { border: none; border-top: 1px solid #eee; margin: 1.5rem 0; }
                            footer { margin-top: 3rem; font-size: 0.8rem; color: #999; text-align: center; }
                            @page { size: auto; margin: 1in; }
                        </style>
                    </head>
                    <body>
                        <h1>${title}</h1>
                        <h2 class="date">${date} &bull; ${time}</h2>
                        <hr style="margin: 1.5rem 0;" />
                        <div>${entry.content}</div>
                        <footer>Shared from Aura</footer>
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
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
                        className="absolute top-12 right-0 w-48 bg-light-bg-secondary/90 dark:bg-dark-bg-secondary/90 backdrop-blur-lg rounded-xl border border-white/10 shadow-lg origin-top-right z-10"
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
                        className="absolute top-12 right-0 w-48 bg-light-bg-secondary/90 dark:bg-dark-bg-secondary/90 backdrop-blur-lg rounded-xl border border-white/10 shadow-lg origin-top-right z-10"
                        variants={menuVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                        <div className="p-2">
                             <button onClick={handleDownloadImage} disabled={isGenerating} className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50">
                                {isGenerating ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
                                <span>Save as JPG</span>
                            </button>
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
    );

    return (
        <div className="w-full h-full flex flex-col bg-light-bg dark:bg-dark-bg">
            <Header 
                title=""
                showBackButton 
                onBack={navigateBack}
                rightAction={HeaderActions}
            />
            <div className="flex-grow w-full max-w-md mx-auto p-4 overflow-y-auto">
                <div className="pb-24">
                    <div className="mb-6 border-b border-white/10 pb-4">
                        <h1 className="text-3xl font-bold mb-2">{entry.title || 'Untitled Entry'}</h1>
                        <p className="font-medium text-light-text-secondary dark:text-dark-text-secondary">{formattedDate}</p>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{formattedTime}</p>
                    </div>
                    <div
                        className="journal-view-content text-lg leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: entry.content }}
                    />
                    {entry.attachments && entry.attachments.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-white/10">
                            <h2 className="font-semibold text-sm uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary mb-3">Attachments</h2>
                            <div className="flex flex-wrap gap-2">
                                {entry.attachments.map(att => (
                                    <AttachmentPreview
                                        key={att.storagePath}
                                        attachment={att}
                                        onClick={() => navigateTo('attachmentViewer', { attachment: att })}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                     {linkedSessions.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-white/10">
                            <h2 className="font-semibold text-sm uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary mb-3">Linked Sessions</h2>
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
            `}</style>
        </div>
    );
};

export default JournalViewPage;