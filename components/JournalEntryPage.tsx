
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, Trash2, Loader, Link as LinkIcon, Paperclip, 
    LoaderCircle, FileImage, FileText, FileQuestion, MoreHorizontal, Search, Copy, Repeat, ArrowLeftRight,
    Lock, Undo, Redo, ChevronsRight, Check
} from 'lucide-react';
import { useAppContext } from '../App';
import { JournalEntry, Attachment } from '../types';
import { fetchJournalPrompt } from '../services/geminiService';
import Header from './Header';
import AttachmentTypeModal from './AttachmentTypeModal';

interface JournalEntryPageProps {
    entry?: JournalEntry;
}

const compressImage = (file: File, options: { quality?: number; maxWidth?: number; maxHeight?: number }): Promise<File> => {
    return new Promise((resolve, reject) => {
        const { quality = 0.85, maxWidth = 1920, maxHeight = 1920 } = options;
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new window.Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context'));
                }
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            resolve(newFile);
                        } else {
                            reject(new Error('Canvas to Blob conversion failed'));
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const AttachmentIcon = ({ type }: { type: string }) => {
    if (type.startsWith('image/')) return <FileImage size={24} className="text-purple-400 shrink-0" />;
    if (type === 'application/pdf') return <FileText size={24} className="text-red-400 shrink-0" />;
    return <FileQuestion size={24} className="text-gray-400 shrink-0" />;
};

const JournalEntryPage: React.FC<JournalEntryPageProps> = ({ entry }) => {
    const { 
        navigateBack, addJournalEntry, updateJournalEntry, deleteJournalEntry, duplicateJournalEntry, vibrate, 
        showConfirmationModal, navigateTo, showAlertModal, userProfile
    } = useAppContext();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [linkedSessionIds, setLinkedSessionIds] = useState<string[]>([]);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isPromptLoading, setIsPromptLoading] = useState(false);
    const [showAttachmentModal, setShowAttachmentModal] = useState(false);
    
    const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
    const [fontStyle, setFontStyle] = useState<'default' | 'serif' | 'mono'>(entry?.fontStyle || 'default');
    const [isSmallText, setIsSmallText] = useState(entry?.isSmallText || false);
    const [isFullWidth, setIsFullWidth] = useState(entry?.isFullWidth || false);
    const [isLocked, setIsLocked] = useState(entry?.isLocked || false);
    const [wordCount, setWordCount] = useState(0);
    const [lastModified, setLastModified] = useState<Date>(entry ? new Date(entry.date) : new Date());
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'unsaved'>('idle');
    
    const [history, setHistory] = useState<string[]>(['']);
    const [historyIndex, setHistoryIndex] = useState(0);
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    const [searchQuery, setSearchQuery] = useState('');
    const [searchMatches, setSearchMatches] = useState<HTMLElement[]>([]);
    const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

    const editorRef = useRef<HTMLDivElement>(null);
    const hasSetInitialContent = useRef(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const debounceTimeoutRef = useRef<number | null>(null);

    const markAsChanged = useCallback(() => {
        if (!hasUnsavedChanges) {
            setHasUnsavedChanges(true);
        }
        setSaveStatus('unsaved');
    }, [hasUnsavedChanges]);

    // --- Search Functionality ---
    const clearSearchHighlighting = useCallback(() => {
        if (!editorRef.current) return;
        const editor = editorRef.current;
        const marks = Array.from(editor.querySelectorAll('mark.search-highlight'));
        marks.forEach(mark => {
            // FIX: Cast `mark` to `Node` to fix TypeScript errors where its type was inferred as `unknown`.
            const markNode = mark as Node;
            const parent = markNode.parentNode;
            if (parent) {
                while (markNode.firstChild) {
                    parent.insertBefore(markNode.firstChild, markNode);
                }
                parent.removeChild(markNode);
                parent.normalize();
            }
        });
        setSearchMatches([]);
        setCurrentMatchIndex(-1);
    }, []);

    const performSearch = useCallback((query: string) => {
        clearSearchHighlighting();
        if (!query || !editorRef.current) return;

        const editor = editorRef.current;
        const regex = new RegExp(query, 'gi');
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
        const nodesToProcess: Node[] = [];
        let node;
        while ((node = walker.nextNode())) {
            nodesToProcess.push(node);
        }
        
        let matchesFound: HTMLElement[] = [];

        nodesToProcess.forEach(textNode => {
            if (!textNode.textContent || !regex.test(textNode.textContent)) return;
            const parent = textNode.parentNode;
            if (!parent || (parent as HTMLElement).tagName === 'MARK') return;

            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            textNode.textContent.replace(regex, (match, offset) => {
                if (offset > lastIndex) {
                    fragment.appendChild(document.createTextNode(textNode.textContent!.slice(lastIndex, offset)));
                }
                const mark = document.createElement('mark');
                mark.className = 'search-highlight';
                mark.textContent = match;
                fragment.appendChild(mark);
                matchesFound.push(mark);
                lastIndex = offset + match.length;
                return match;
            });

            if (lastIndex < textNode.textContent.length) {
                fragment.appendChild(document.createTextNode(textNode.textContent.slice(lastIndex)));
            }
            parent.replaceChild(fragment, textNode);
        });
        
        setSearchMatches(matchesFound);
        setCurrentMatchIndex(matchesFound.length > 0 ? 0 : -1);
    }, [clearSearchHighlighting]);

    useEffect(() => {
        searchMatches.forEach((match, index) => {
            match.classList.toggle('current', index === currentMatchIndex);
        });
        if (currentMatchIndex !== -1 && searchMatches[currentMatchIndex]) {
            searchMatches[currentMatchIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [currentMatchIndex, searchMatches]);
    
    const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query) {
            performSearch(query);
        } else {
            clearSearchHighlighting();
        }
    };
    
    const goToNextMatch = () => searchMatches.length > 0 && setCurrentMatchIndex(prev => (prev + 1) % searchMatches.length);
    const goToPrevMatch = () => searchMatches.length > 0 && setCurrentMatchIndex(prev => (prev - 1 + searchMatches.length) % searchMatches.length);

    const closeAndClearSearch = useCallback(() => {
        setIsOptionsMenuOpen(false);
        if (searchQuery) {
            clearSearchHighlighting();
            setSearchQuery('');
        }
    }, [searchQuery, clearSearchHighlighting]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                closeAndClearSearch();
            }
        };
        if (isOptionsMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOptionsMenuOpen, closeAndClearSearch]);
    
    // --- End of Search Functionality ---

    useEffect(() => {
        if (entry) {
            setTitle(entry.title || '');
            setContent(entry.content);
            setLinkedSessionIds(entry.linkedSessionIds || []);
            setAttachments(entry.attachments || []);
            setFontStyle(entry.fontStyle || 'default');
            setIsSmallText(entry.isSmallText || false);
            setIsFullWidth(entry.isFullWidth || false);
            setIsLocked(entry.isLocked || false);
            setLastModified(new Date(entry.date));
            setHistory([entry.content || '']);
            setHistoryIndex(0);
            setSaveStatus('idle');
            setHasUnsavedChanges(false);
        }
    }, [entry]);

    useEffect(() => {
        if (editorRef.current) {
            if (content && !hasSetInitialContent.current) {
                editorRef.current.innerHTML = content;
                hasSetInitialContent.current = true;
            }
            const text = editorRef.current.innerText || '';
            setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
        }
    }, [content]);
    
    const handleSave = useCallback(async () => {
        if (!hasUnsavedChanges) return;

        setSaveStatus('saving');
        vibrate('light');
        const currentContent = editorRef.current?.innerHTML.trim() || '';
        const currentText = editorRef.current?.innerText.trim() || '';
        
        if (currentText || title.trim() || attachments.length > 0) {
            const entryTitle = title.trim() || currentText.split('\n')[0].substring(0, 50) || "Journal Entry";
            const modifiedDate = new Date().toISOString();
            let success = false;

            const commonData = {
                title: entryTitle,
                content: currentContent,
                linkedSessionIds,
                attachments,
                fontStyle,
                isSmallText,
                isFullWidth,
                isLocked,
                date: modifiedDate,
            };

            if (entry) {
                const updatedEntry: JournalEntry = { ...entry, ...commonData };
                success = await updateJournalEntry(updatedEntry);
            } else {
                const newEntry: Omit<JournalEntry, 'id' | 'createdAt'> = commonData;
                success = await addJournalEntry(newEntry);
            }
            
            if (success) {
                setHasUnsavedChanges(false);
                setSaveStatus('saved');
                setLastModified(new Date(modifiedDate));
            } else {
                setSaveStatus('unsaved');
            }
        } else {
            setSaveStatus('idle');
            setHasUnsavedChanges(false);
        }
    }, [title, attachments, linkedSessionIds, fontStyle, isSmallText, isFullWidth, isLocked, entry, hasUnsavedChanges, updateJournalEntry, addJournalEntry, vibrate]);

    // Auto-save on change
    useEffect(() => {
        if (saveStatus === 'unsaved') {
            const timer = setTimeout(() => {
                handleSave();
            }, 2000); // 2-second debounce
            return () => clearTimeout(timer);
        }
    }, [saveStatus, title, attachments, linkedSessionIds, fontStyle, isSmallText, isFullWidth, isLocked, handleSave]);

    // Reset "Saved" status to idle
    useEffect(() => {
        if (saveStatus === 'saved') {
            const timer = setTimeout(() => {
                setSaveStatus('idle');
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [saveStatus]);
    
    // Save on unmount (as a fallback)
    const handleSaveRef = useRef(handleSave);
    useEffect(() => { handleSaveRef.current = handleSave; }, [handleSave]);
    const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
    useEffect(() => { hasUnsavedChangesRef.current = hasUnsavedChanges; }, [hasUnsavedChanges]);

    useEffect(() => {
        return () => {
            if (hasUnsavedChangesRef.current) {
                handleSaveRef.current();
            }
        };
    }, []);

    const handleDelete = async () => {
        if (entry) {
            showConfirmationModal({
                title: 'Move to Trash?',
                message: 'This action cannot be undone. Are you sure you want to permanently delete this entry?',
                confirmText: 'Delete',
                onConfirm: async () => {
                    vibrate('heavy');
                    const success = await deleteJournalEntry(entry.id);
                    if (success) {
                        navigateBack();
                        setTimeout(() => navigateBack(), 100);
                    }
                }
            });
        }
    };
    
     const handleDuplicate = async () => {
        if (entry) {
            const success = await duplicateJournalEntry(entry.id);
            if (success) {
                setIsOptionsMenuOpen(false);
            }
        }
    };
    
    const handleCopyText = () => {
        const htmlToPlainText = (html: string): string => {
            const tempDiv = document.createElement('div');
            let formattedHtml = html.replace(/<li>/gi, '\n• ').replace(/<\/li>/gi, '');
            tempDiv.innerHTML = formattedHtml;
            return tempDiv.textContent || tempDiv.innerText || '';
        };
        const currentContent = editorRef.current?.innerHTML || '';
        const plainText = htmlToPlainText(currentContent);
        const textToCopy = `${title.trim() || 'Untitled Entry'}\n\n${plainText}`;
        navigator.clipboard.writeText(textToCopy).then(() => {
            showAlertModal({ title: "Copied!", message: "Journal content copied to clipboard." });
            setIsOptionsMenuOpen(false);
        });
    };

    const handleAttachmentTypeSelect = (acceptType: string) => {
        setShowAttachmentModal(false);
        if (fileInputRef.current) {
            fileInputRef.current.accept = acceptType;
            fileInputRef.current.click();
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (fileInputRef.current) { fileInputRef.current.value = ""; }
        if (!file) return;
        setIsUploading(true);
        try {
            let fileToProcess = file;
            if (file.type.startsWith('image/')) {
                fileToProcess = await compressImage(file, { quality: 0.85, maxWidth: 1920, maxHeight: 1920 });
            }
            const dataUrl = await fileToDataURL(fileToProcess);
            const newAttachment: Attachment = {
                id: crypto.randomUUID(), name: fileToProcess.name,
                type: fileToProcess.type || 'application/octet-stream', data: dataUrl,
            };
            setAttachments(prev => [...prev, newAttachment]);
            markAsChanged();
        } catch (error) {
            console.error("Error processing attachment:", error);
            showAlertModal({ title: "Processing Failed", message: "Could not process the attachment." });
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveAttachment = async (attachmentToRemove: Attachment) => {
        setAttachments(prev => prev.filter(att => att.id !== attachmentToRemove.id));
        markAsChanged();
    };
    
    const handleGetPrompt = async () => {
        vibrate();
        setIsPromptLoading(true);
        const prompt = await fetchJournalPrompt();
        const currentHtml = editorRef.current?.innerHTML || '';
        if (editorRef.current) {
            editorRef.current.innerHTML = `<p>${prompt}</p><p><br></p>${currentHtml}`;
        }
        setIsPromptLoading(false);
        editorRef.current?.focus();
        markAsChanged();
    };

    const handleContentChange = (e: React.FormEvent<HTMLDivElement>) => {
        markAsChanged();
        const text = e.currentTarget.innerText || '';
        const currentHtml = e.currentTarget.innerHTML || '';
        setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
        if (debounceTimeoutRef.current) { clearTimeout(debounceTimeoutRef.current); }
        debounceTimeoutRef.current = window.setTimeout(() => {
            setHistory(prevHistory => {
                const newHistory = prevHistory.slice(0, historyIndex + 1);
                if (newHistory[newHistory.length - 1] !== currentHtml) {
                    newHistory.push(currentHtml);
                    setHistoryIndex(newHistory.length - 1);
                    return newHistory;
                }
                return prevHistory;
            });
        }, 500);
    };
    
    const handleUndo = useCallback(() => {
        if (canUndo) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            if (editorRef.current) {
                const newContent = history[newIndex];
                editorRef.current.innerHTML = newContent;
                const text = editorRef.current.innerText || '';
                setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
            }
        }
    }, [canUndo, history, historyIndex]);

    const handleRedo = useCallback(() => {
        if (canRedo) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            if (editorRef.current) {
                const newContent = history[newIndex];
                editorRef.current.innerHTML = newContent;
                const text = editorRef.current.innerText || '';
                setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
            }
        }
    }, [canRedo, history, historyIndex]);
    
    const handleLinkSession = () => {
        navigateTo('sessionLinking', {
            selectedIds: linkedSessionIds,
            onSave: (newSelectedIds: string[]) => { setLinkedSessionIds(newSelectedIds); markAsChanged(); },
        });
    };
    
    const fontClasses: Record<typeof fontStyle, string> = { default: 'font-sans', serif: 'font-serif', mono: 'font-mono' };
    
    const ToggleSwitch = ({ checked, onToggle }: { checked: boolean, onToggle: () => void }) => {
        const spring = { type: "spring", stiffness: 700, damping: 30 };
        return (
             <div 
                className={`w-9 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 ${checked ? 'bg-blue-500 justify-end' : 'bg-gray-200 dark:bg-gray-700 justify-start'}`}
                onClick={onToggle}
            >
                <motion.div
                    className="w-4 h-4 bg-white rounded-full shadow-sm"
                    layout
                    transition={spring}
                />
            </div>
        );
    };

    const MenuItem = ({ icon, label, onClick, danger = false, disabled = false }: { icon: React.ReactNode, label: string, onClick?: () => void, danger?: boolean, disabled?: boolean }) => (
        <button onClick={onClick} disabled={disabled} className={`w-full flex items-center justify-between text-left px-2 py-2.5 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${danger ? 'text-red-500' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <div className="flex items-center gap-3">{icon}{label}</div>
        </button>
    );

    const MenuToggleItem = ({ icon, label, checked, onChange }: { icon: React.ReactNode, label: string, checked: boolean, onChange: () => void }) => (
        <div className="w-full flex items-center justify-between text-left px-2 py-2.5">
            <div className="flex items-center gap-3">{icon}{label}</div>
            <ToggleSwitch checked={checked} onToggle={onChange}/>
        </div>
    );

    const MenuDivider = () => <div className="h-px bg-black/10 dark:bg-white/10 my-1"/>;

    const SaveIndicator = () => (
        <div className="flex items-center justify-end w-24 text-sm text-light-text-secondary dark:text-dark-text-secondary">
            <AnimatePresence mode="wait">
                {saveStatus === 'saving' && (
                    <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                        <Loader size={14} className="animate-spin" />
                        <span>Saving...</span>
                    </motion.div>
                )}
                {saveStatus === 'saved' && (
                    <motion.div key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-green-500">
                        <Check size={16} />
                        <span>Saved</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    const HeaderActions = (
        <div className="flex items-center gap-2">
            <SaveIndicator />
            <motion.button 
                onClick={() => {vibrate(); setIsOptionsMenuOpen(o => !o);}} 
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                whileTap={{ scale: 0.9 }} aria-label="More options"
            >
                <MoreHorizontal size={24} />
            </motion.button>
        </div>
    );

    return (
        <div className={`w-full h-full flex flex-col bg-light-bg dark:bg-dark-bg ${fontClasses[fontStyle]}`}>
            <Header title="" showBackButton onBack={navigateBack} rightAction={HeaderActions} />
             <AnimatePresence>
                {isOptionsMenuOpen && (
                     <motion.div
                        ref={menuRef}
                        className="absolute top-16 right-4 w-64 max-h-[calc(100dvh-5rem)] overflow-y-auto bg-light-bg-secondary/95 dark:bg-dark-bg-secondary/95 rounded-xl border border-white/10 shadow-3xl origin-top-right z-30 p-3 text-base"
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                      <div className="space-y-1">
                        <div className="relative mb-2">
                            <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 rounded-md">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-light-text-secondary dark:text-dark-text-secondary pointer-events-none"/>
                                <input 
                                    type="text" 
                                    placeholder="Find in page..." 
                                    value={searchQuery}
                                    onChange={handleSearchInputChange}
                                    className="w-full pl-8 pr-2 py-2.5 text-sm bg-transparent focus:outline-none"/>
                                {searchQuery && (
                                    <div className="flex items-center gap-1 pr-2">
                                        <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary whitespace-nowrap">
                                            {searchMatches.length > 0 ? `${currentMatchIndex + 1} of ${searchMatches.length}` : '0/0'}
                                        </span>
                                        <button onClick={goToPrevMatch} disabled={searchMatches.length === 0} className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-50 font-sans text-lg leading-none">↑</button>
                                        <button onClick={goToNextMatch} disabled={searchMatches.length === 0} className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-50 font-sans text-lg leading-none">↓</button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="relative flex items-center justify-between bg-black/5 dark:bg-white/5 p-1 rounded-md mb-2">
                            {(['default', 'serif', 'mono'] as const).map(style => (
                                <button 
                                    key={style} 
                                    onClick={() => {setFontStyle(style); markAsChanged();}} 
                                    className={`relative w-full flex flex-col items-center justify-center gap-1 text-center px-2 py-1.5 rounded z-10`}
                                >
                                    {fontStyle === style && (
                                        <motion.div
                                            layoutId="font-style-active-bg"
                                            className="absolute inset-0 bg-light-bg dark:bg-dark-bg rounded shadow-sm"
                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                        />
                                    )}
                                    <span className="relative text-xs capitalize font-medium">{style === 'default' ? 'Sans' : style}</span>
                                    <span className={`relative ${fontClasses[style]} text-xl`}>Aa</span>
                                </button>
                            ))}
                        </div>
                        {(canUndo || canRedo) && (<>
                            <MenuItem icon={<Undo size={16}/>} label="Undo" onClick={handleUndo} disabled={!canUndo} />
                            <MenuItem icon={<Redo size={16}/>} label="Redo" onClick={handleRedo} disabled={!canRedo} />
                            <MenuDivider/>
                        </>)}
                        <MenuItem icon={<Copy size={16}/>} label="Copy text" onClick={handleCopyText} />
                        {entry && <MenuItem icon={<Repeat size={16}/>} label="Duplicate" onClick={handleDuplicate} />}
                        <MenuItem icon={<Trash2 size={16}/>} label="Move to Trash" onClick={handleDelete} danger/>
                        <MenuDivider/>
                        <MenuToggleItem icon={<ArrowLeftRight size={16}/>} label="Small text" checked={isSmallText} onChange={() => {setIsSmallText(s => !s); markAsChanged();}} />
                        <MenuToggleItem icon={<ChevronsRight size={16}/>} label="Full width" checked={isFullWidth} onChange={() => {setIsFullWidth(s => !s); markAsChanged();}} />
                        <MenuDivider/>
                        <MenuToggleItem icon={<Lock size={16}/>} label="Lock page" checked={isLocked} onChange={() => {setIsLocked(l => !l); markAsChanged();}} />
                         <MenuDivider/>
                         <MenuItem icon={<LinkIcon size={16}/>} label={`Connections (${linkedSessionIds.length})`} onClick={handleLinkSession}/>
                         <MenuDivider/>
                         <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary px-2 pt-2 space-y-1">
                             <p>Word count: {wordCount}</p>
                             <p>Last edited by {userProfile.name}</p>
                             <p>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(lastModified)}</p>
                         </div>
                      </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <div className={`flex-grow w-full ${isFullWidth ? 'px-4 md:px-8 lg:px-12' : 'max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4'} flex flex-col overflow-hidden transition-all duration-300`}>
                <input
                    type="text" value={title} onChange={(e) => {setTitle(e.target.value); markAsChanged();}}
                    placeholder="Title..."
                    className="w-full bg-transparent text-3xl font-bold focus:outline-none mb-4 pb-2 border-b border-white/10 placeholder:text-light-text-secondary/50 dark:placeholder:text-dark-text-secondary/50"
                    autoFocus={!entry} readOnly={isLocked}
                />
                <div className="relative flex-grow w-full journal-editor-container overflow-y-auto">
                    <div
                        ref={editorRef} contentEditable={!isLocked} onInput={handleContentChange}
                        data-placeholder="Start writing..."
                        className={`w-full h-full bg-transparent focus:outline-none resize-none caret-light-text dark:caret-dark-text leading-7 ${isSmallText ? 'text-base' : 'text-lg'}`}
                        autoFocus={!entry}
                    />
                </div>
                <div className="flex-shrink-0 pt-4">
                     <AnimatePresence>
                        {attachments.length > 0 && (
                            <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4">
                                <div className="bg-light-glass/80 dark:bg-dark-glass/80 rounded-2xl border border-white/10 overflow-hidden">
                                    <div className="flex items-center justify-between p-3 border-b border-white/10">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <AttachmentIcon type={attachments[0].type} />
                                            <span className="font-semibold truncate pr-2">{attachments[0].name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button onClick={() => handleRemoveAttachment(attachments[0])} className="p-2 text-light-text-secondary dark:text-dark-text-secondary rounded-full hover:bg-black/10 dark:hover:bg-white/10" aria-label="Remove attachment"><Trash2 size={16} /></button>
                                            <button onClick={() => navigateTo('attachmentViewer', { attachments, startIndex: 0 })} className="px-4 py-1.5 text-sm font-semibold bg-light-bg-secondary dark:bg-dark-bg-secondary rounded-full shadow-sm">{attachments.length > 1 ? `View All (${attachments.length})` : 'View'}</button>
                                        </div>
                                    </div>
                                    <div onClick={() => navigateTo('attachmentViewer', { attachments, startIndex: 0 })} className="h-48 flex items-center justify-center bg-black/5 dark:bg-white/5 cursor-pointer">
                                        {attachments[0].type.startsWith('image/') ? <img src={attachments[0].data} alt={attachments[0].name} className="max-w-full max-h-full object-contain" /> : <div className="flex flex-col items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary"><AttachmentIcon type={attachments[0].type} /><span>Click to View</span></div>}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <AnimatePresence>
                        {isUploading && <motion.div className="flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary mt-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><LoaderCircle size={16} className="animate-spin" /><span>Compressing & preparing...</span></motion.div>}
                    </AnimatePresence>
                </div>
                <div className="relative flex-shrink-0 py-4 flex items-center justify-between">
                    <button onClick={handleGetPrompt} disabled={isPromptLoading} className="flex items-center gap-2 px-4 py-2 text-sm bg-light-glass dark:bg-dark-glass rounded-full border border-white/20">
                        {isPromptLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-yellow-400" />}
                        Get a prompt
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />
                    <motion.button onClick={() => setShowAttachmentModal(true)} disabled={isUploading} className="w-12 h-12 bg-light-glass dark:bg-dark-glass rounded-full flex items-center justify-center shadow-lg border border-white/20 disabled:opacity-50" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} aria-label="Attach file">
                        <Paperclip size={24} />
                    </motion.button>
                </div>
            </div>
            <AttachmentTypeModal isOpen={showAttachmentModal} onClose={() => setShowAttachmentModal(false)} onSelect={handleAttachmentTypeSelect} />
            <style>{`
                .journal-editor-container [contentEditable=true]:empty:before { content: attr(data-placeholder); color: #a0a0a0; opacity: 0.5; }
                .journal-editor-container h2 { font-size: 1.25rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.25rem; }
                .journal-editor-container ul, .journal-editor-container ol { padding-left: 1.5rem; margin: 0.5rem 0; }
                .journal-editor-container ul { list-style-type: disc; }
                .journal-editor-container ol { list-style-type: decimal; }
                .journal-editor-container li { margin-bottom: 0.25rem; }
                .journal-editor-container hr { border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 1.5rem 0; }
                html.light .journal-editor-container hr { border-top-color: rgba(0, 0, 0, 0.1); }
                .font-serif { font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif; }
                .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
                mark.search-highlight { background-color: #facc15; color: black; border-radius: 3px; }
                mark.search-highlight.current { background-color: #fb923c; }
            `}</style>
        </div>
    );
};

export default JournalEntryPage;
