
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Trash2, Loader, Link as LinkIcon, Paperclip, 
    LoaderCircle, FileImage, FileText, FileQuestion, MoreHorizontal, Search, Copy, Repeat, ArrowLeftRight,
    Lock, Undo, Redo, ChevronsRight, Check, Heading2, List, ListOrdered, Minus,
    Bold, Italic, Underline, Strikethrough, Highlighter, Palette as PaletteIcon, TextSelect,
    Sparkles, Wand2, BookText, BrainCircuit, MessageSquare, ArrowLeft
} from 'lucide-react';
import { useAppContext } from '../App';
import { JournalEntry, Attachment, AITask } from '../types';
import Header from './Header';
import AttachmentTypeModal from './AttachmentTypeModal';
import PdfViewer from './PdfViewer';
import { processJournalWithAI } from '../services/geminiService';

const FONT_COLORS = [
  { name: 'Default', value: 'inherit', isDefault: true },
  { name: 'Red', value: '#ef4444' }, // red-500
  { name: 'Orange', value: '#f97316' }, // orange-500
  { name: 'Green', value: '#16a34a' }, // green-600
  { name: 'Blue', value: '#2563eb' }, // blue-600
  { name: 'Purple', value: '#7e22ce' }, // purple-700
];

const HIGHLIGHT_COLORS = [
  { name: 'None', value: 'transparent', isNone: true },
  { name: 'Yellow', value: '#fef08a' }, // yellow-200
  { name: 'Pink', value: '#fbcfe8' }, // pink-200
  { name: 'Blue', value: '#bfdbfe' }, // blue-200
  { name: 'Green', value: '#a7f3d0' }, // emerald-200
  { name: 'Purple', value: '#e9d5ff' }, // purple-200
];

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
        settings, navigateBack, addJournalEntry, updateJournalEntry, deleteJournalEntry, duplicateJournalEntry, vibrate, 
        showConfirmationModal, navigateTo, showAlertModal, userProfile, setIsAiLoading
    } = useAppContext();

    const [currentEntry, setCurrentEntry] = useState<JournalEntry | undefined>(entry);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [linkedSessionIds, setLinkedSessionIds] = useState<string[]>([]);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isUploading, setIsUploading] = useState(false);
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

    const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);
    const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
    const [slashMenuFilter, setSlashMenuFilter] = useState('');
    const [activeCommandIndex, setActiveCommandIndex] = useState(0);

    const [isFormattingMenuOpen, setIsFormattingMenuOpen] = useState(false);
    const [formattingMenuPosition, setFormattingMenuPosition] = useState({ top: 0, left: 0 });
    const [activePalette, setActivePalette] = useState<'font' | 'highlight' | null>(null);
    const [activeFormats, setActiveFormats] = useState({
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false,
    });
    const [isMouseOverMenu, setIsMouseOverMenu] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);

    // AI State
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiCustomPrompt, setAiCustomPrompt] = useState('');
    const [currentAiTask, setCurrentAiTask] = useState<AITask | null>(null);


    const editorRef = useRef<HTMLDivElement>(null);
    const positioningContainerRef = useRef<HTMLDivElement>(null);
    const slashCommandRef = useRef<HTMLElement | null>(null);
    const hasSetInitialContent = useRef(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const contentChangeDebounceRef = useRef<number | null>(null);
    const formattingMenuRef = useRef<HTMLDivElement>(null);
    const paletteRef = useRef<HTMLDivElement>(null);
    
    const saveDebounceTimeoutRef = useRef<number | null>(null);
    const handleSaveRef = useRef<() => void>();
    const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
    useEffect(() => { hasUnsavedChangesRef.current = hasUnsavedChanges; }, [hasUnsavedChanges]);
    
    useEffect(() => {
        // A simple check for non-touch devices, commonly desktops.
        setIsDesktop(!('ontouchstart' in window) || navigator.maxTouchPoints === 0);
    }, []);


    const handleSave = useCallback(async () => {
        if (!hasUnsavedChangesRef.current) return;

        const currentContent = editorRef.current?.innerHTML.trim() || '';
        const currentText = editorRef.current?.innerText.trim() || '';

        const isNewEntry = !currentEntry;
        const hasOnlyTitle = !!title.trim() && !currentText && attachments.length === 0;

        if (isNewEntry && hasOnlyTitle) {
            return; 
        }

        if (!title.trim() && !currentText && attachments.length === 0) {
            setHasUnsavedChanges(false);
            setSaveStatus('idle');
            return;
        }
        
        vibrate('light');
        setSaveStatus('saving');
        
        const entryTitle = title.trim() || currentText.split('\n')[0].substring(0, 50) || "Journal Entry";
        const modifiedDate = new Date().toISOString();
        let success = false;
        let newEntryId: string | null = null;

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

        if (currentEntry) {
            const updatedEntry: JournalEntry = { ...currentEntry, ...commonData };
            success = await updateJournalEntry(updatedEntry);
        } else {
            const newEntry: Omit<JournalEntry, 'id' | 'createdAt'> = commonData;
            newEntryId = await addJournalEntry(newEntry);
            success = !!newEntryId;
        }
        
        if (success) {
            setHasUnsavedChanges(false);
            setSaveStatus('saved');
            setLastModified(new Date(modifiedDate));
            if (newEntryId) {
                setCurrentEntry({
                    id: newEntryId,
                    createdAt: Date.now(),
                    ...commonData,
                });
            }
        } else {
            setSaveStatus('unsaved');
        }
    }, [
        title, attachments, linkedSessionIds, fontStyle, 
        isSmallText, isFullWidth, isLocked, currentEntry, updateJournalEntry, 
        addJournalEntry, vibrate
    ]);
    
    useEffect(() => { handleSaveRef.current = handleSave; }, [handleSave]);
    
    const markAsChanged = useCallback(() => {
        if (!hasUnsavedChanges) {
            setHasUnsavedChanges(true);
        }
        setSaveStatus('unsaved');

        if (saveDebounceTimeoutRef.current) {
            clearTimeout(saveDebounceTimeoutRef.current);
        }
        saveDebounceTimeoutRef.current = window.setTimeout(() => {
            handleSaveRef.current?.();
        }, 500);
    }, [hasUnsavedChanges]);


    // --- Search Functionality ---
    const clearSearchHighlighting = useCallback(() => {
        if (!editorRef.current) return;
        const editor = editorRef.current;
        const marks = Array.from(editor.querySelectorAll('mark.search-highlight'));
        marks.forEach(mark => {
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
            if (!parent || (parent as HTMLElement).tagName === 'MARK' || (parent as HTMLElement).closest('[data-highlight="true"]')) return;

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
    
     // --- Formatting Menu Logic ---
    useEffect(() => {
        const editorContainer = document.querySelector('.journal-editor-container');
        if (!editorContainer) return;
        
        const formattingDebounceTimeoutRef = { current: null as number | null };

        const hideMenu = () => {
            setIsFormattingMenuOpen(false);
            setActivePalette(null);
        };

        const handleSelectionChange = () => {
            if (formattingDebounceTimeoutRef.current) {
                clearTimeout(formattingDebounceTimeoutRef.current);
            }

            formattingDebounceTimeoutRef.current = window.setTimeout(() => {
                if (isOptionsMenuOpen) {
                    hideMenu();
                    return;
                }

                const selection = window.getSelection();
                if ((!selection || selection.isCollapsed || selection.rangeCount === 0) && !isMouseOverMenu) {
                    hideMenu();
                    return;
                }
                if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

                const range = selection.getRangeAt(0);
                const positioningContainer = positioningContainerRef.current;
                const editorNode = editorRef.current;

                if (!positioningContainer || !editorNode || !editorNode.contains(range.commonAncestorContainer)) {
                    hideMenu();
                    return;
                }

                // Update active formats
                setActiveFormats({
                    bold: document.queryCommandState('bold'),
                    italic: document.queryCommandState('italic'),
                    underline: document.queryCommandState('underline'),
                    strikethrough: document.queryCommandState('strikeThrough'),
                });

                const selectionRect = range.getBoundingClientRect();
                const containerRect = positioningContainer.getBoundingClientRect();

                if (selectionRect.width === 0 && selectionRect.height === 0) {
                    hideMenu();
                    return;
                }
                
                const MENU_WIDTH = 320;
                const MENU_HEIGHT = 44;
                const MENU_OFFSET = 10;

                let top = selectionRect.top - containerRect.top - MENU_HEIGHT - MENU_OFFSET;
                
                const selectionCenter = selectionRect.left - containerRect.left + selectionRect.width / 2;
                let left = selectionCenter - MENU_WIDTH / 2;

                if (top < 0) {
                    top = selectionRect.bottom - containerRect.top + MENU_OFFSET;
                }
                
                const minLeft = 0;
                const maxLeft = containerRect.width - MENU_WIDTH;
                left = Math.max(minLeft, Math.min(left, maxLeft));

                setFormattingMenuPosition({ top, left });
                if (!isFormattingMenuOpen) {
                    setIsFormattingMenuOpen(true);
                }
            }, 50);
        };
        
        document.addEventListener('selectionchange', handleSelectionChange);
        editorContainer.addEventListener('scroll', hideMenu);

        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            editorContainer.removeEventListener('scroll', hideMenu);
            if (formattingDebounceTimeoutRef.current) {
                clearTimeout(formattingDebounceTimeoutRef.current);
            }
        };
    }, [isFormattingMenuOpen, isOptionsMenuOpen, isMouseOverMenu]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOptionsMenuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOptionsMenuOpen(false);
                if (searchQuery) {
                    clearSearchHighlighting();
                    setSearchQuery('');
                }
            }
            if (isSlashMenuOpen) {
                setIsSlashMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOptionsMenuOpen, searchQuery, clearSearchHighlighting, isSlashMenuOpen]);
    
    // --- End of Search & Formatting Functionality ---

    useEffect(() => {
        if (entry) {
            setCurrentEntry(entry);
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
        } else {
            setCurrentEntry(undefined);
            setTitle('');
            setContent('');
            setLinkedSessionIds([]);
            setAttachments([]);
            setFontStyle('default');
            setIsSmallText(false);
            setIsFullWidth(false);
            setIsLocked(false);
            setLastModified(new Date());
            setHistory(['']);
            setHistoryIndex(0);
            setSaveStatus('idle');
            setHasUnsavedChanges(false);
            if (editorRef.current) {
                editorRef.current.innerHTML = '';
            }
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
    useEffect(() => {
        return () => {
            if (saveDebounceTimeoutRef.current) {
                clearTimeout(saveDebounceTimeoutRef.current);
            }
            if (hasUnsavedChangesRef.current) {
                handleSaveRef.current?.();
            }
        };
    }, []);

    const handleDelete = useCallback(async () => {
        if (currentEntry) {
            showConfirmationModal({
                title: 'Move to Trash?',
                message: 'This action cannot be undone. Are you sure you want to permanently delete this entry?',
                confirmText: 'Delete',
                onConfirm: async () => {
                    vibrate('heavy');
                    const success = await deleteJournalEntry(currentEntry.id);
                    if (success) {
                        navigateBack();
                        setTimeout(() => navigateBack(), 100);
                    }
                }
            });
        }
    }, [currentEntry, showConfirmationModal, vibrate, deleteJournalEntry, navigateBack]);
    
     const handleDuplicate = useCallback(async () => {
        if (currentEntry) {
            const success = await duplicateJournalEntry(currentEntry.id);
            if (success) {
                setIsOptionsMenuOpen(false);
            }
        }
    }, [currentEntry, duplicateJournalEntry]);
    
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
            showAlertModal({ title: "Copied!", message: "Journal content copied to clipboard.", type: 'success' });
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
    
    const handleContentChange = () => {
        markAsChanged();

        if (contentChangeDebounceRef.current) {
            clearTimeout(contentChangeDebounceRef.current);
        }

        contentChangeDebounceRef.current = window.setTimeout(() => {
            const editor = editorRef.current;
            if (!editor) return;

            const currentHtml = editor.innerHTML || '';
            const text = editor.innerText || '';
            setWordCount(text.trim().split(/\s+/).filter(Boolean).length);

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
    
    const handleLinkSession = useCallback(() => {
        navigateTo('sessionLinking', {
            selectedIds: linkedSessionIds,
            onSave: (newSelectedIds: string[]) => { setLinkedSessionIds(newSelectedIds); markAsChanged(); },
        });
    }, [navigateTo, linkedSessionIds, markAsChanged]);

    useEffect(() => {
        if (!isDesktop) return;
    
        const handleKeyDown = (e: KeyboardEvent) => {
            // The 'Fn' key is not reliably detectable in browsers.
            // We use the 'Alt' key as a functional equivalent for a simpler, single-modifier shortcut.
            if (e.altKey) {
                let handled = false;
                switch (e.key.toUpperCase()) {
                    case 'D': // Duplicate
                        if (currentEntry) {
                            handleDuplicate();
                            handled = true;
                        }
                        break;
                    case 'T': // Trash
                        if (currentEntry) {
                            handleDelete();
                            handled = true;
                        }
                        break;
                    case 'C': // Connections
                        handleLinkSession();
                        handled = true;
                        break;
                }
        
                if (handled) {
                    e.preventDefault();
                }
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isDesktop, currentEntry, handleDuplicate, handleDelete, handleLinkSession]);

     // --- Slash Command Logic ---
    const COMMANDS = [
        {
            icon: <Heading2 size={18} />, title: 'Heading', description: 'Large section heading.',
            action: () => document.execCommand('formatBlock', false, '<h2>'),
        },
        {
            icon: <List size={18} />, title: 'Bulleted List', description: 'Create a simple bulleted list.',
            action: () => document.execCommand('insertUnorderedList', false),
        },
        {
            icon: <ListOrdered size={18} />, title: 'Numbered List', description: 'Create a list with numbering.',
            action: () => document.execCommand('insertOrderedList', false),
        },
        {
            icon: <Minus size={18} />, title: 'Divider', description: 'Visually separate sections.',
            action: () => document.execCommand('insertHorizontalRule', false),
        },
    ];

    const filteredCommands = COMMANDS.filter(cmd => cmd.title.toLowerCase().startsWith(slashMenuFilter.toLowerCase()));

    const handleCommandSelect = useCallback((command: typeof COMMANDS[0]) => {
        const block = slashCommandRef.current;
        if (!block) return;

        block.innerHTML = '';
        
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(block);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
        
        command.action();

        editorRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));

        setIsSlashMenuOpen(false);
        slashCommandRef.current = null;
    }, []);

    const checkSlashCommand = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        
        let parentBlock = node;
        while (parentBlock && parentBlock.nodeType !== Node.ELEMENT_NODE) {
            parentBlock = parentBlock.parentNode!;
        }
        while (parentBlock && !['P', 'DIV'].includes((parentBlock as HTMLElement).tagName)) {
             if ((parentBlock as HTMLElement) === editorRef.current) break;
            parentBlock = parentBlock.parentNode!;
        }

        const text = (parentBlock as HTMLElement)?.innerText;

        if (text?.startsWith('/')) {
            const rect = range.getBoundingClientRect();
            setSlashMenuPosition({ top: rect.bottom + 5, left: rect.left });
            setSlashMenuFilter(text.substring(1));
            slashCommandRef.current = parentBlock as HTMLElement;
            if (!isSlashMenuOpen) {
                setActiveCommandIndex(0);
                setIsSlashMenuOpen(true);
            }
        } else {
            if (isSlashMenuOpen) {
                setIsSlashMenuOpen(false);
                slashCommandRef.current = null;
            }
        }
    }, [isSlashMenuOpen]);
    
    const handleEditorKeyUp = () => {
        setTimeout(checkSlashCommand, 0);
    };

    const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!isSlashMenuOpen) return;
        
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveCommandIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveCommandIndex(prev => (prev + 1) % filteredCommands.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            handleCommandSelect(filteredCommands[activeCommandIndex]);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setIsSlashMenuOpen(false);
        }
    };
     // --- End Slash Command Logic ---

     // --- AI Logic ---
    const handleAiAction = async (task: AITask, promptOverride?: string) => {
        vibrate();
        setIsAiModalOpen(false);
        setIsAiLoading(true);
        setCurrentAiTask(null);

        const currentContent = editorRef.current?.innerHTML || '';
        const currentTextContent = editorRef.current?.innerText || '';
        const customPrompt = promptOverride || aiCustomPrompt;

        if (task === 'ASK') {
            const answer = await processJournalWithAI(task, currentTextContent, customPrompt);
            setIsAiLoading(false);
            showAlertModal({ title: "Aura's Insight", message: answer });
            setAiCustomPrompt('');
            return;
        }

        const result = await processJournalWithAI(task, currentContent, customPrompt);

        if (result.includes("couldn't process that request")) {
            showAlertModal({ title: "AI Error", message: result });
        } else if (editorRef.current) {
            switch (task) {
                case 'GENERATE':
                case 'IMPROVE':
                    editorRef.current.innerHTML = result;
                    break;
                case 'CONTINUE':
                    editorRef.current.innerHTML += `<p>${result}</p>`;
                    break;
                case 'SUMMARIZE':
                    const formattedSummary = '<ul>' + result.trim().replace(/^\s*[\*\-]\s*/gm, '<li>').replace(/(\r\n|\n|\r)/gm, '</li>') + '</li></ul>';
                    editorRef.current.innerHTML = `<h2>Summary</h2><hr>${formattedSummary}<br>` + currentContent;
                    break;
            }
            
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(editorRef.current);
            range.collapse(false);
            sel?.removeAllRanges();
            sel?.addRange(range);
            editorRef.current.focus();

            handleContentChange();
        }

        setIsAiLoading(false);
        setAiCustomPrompt('');
    };

    const handleAiModalClose = () => {
        setIsAiModalOpen(false);
        setCurrentAiTask(null);
        setAiCustomPrompt('');
    };
     // --- End AI Logic ---

    const fontClasses: Record<typeof fontStyle, string> = { default: 'font-sans', serif: 'font-serif', mono: 'font-mono' };

    const ToggleSwitch = ({ checked, onToggle }: { checked: boolean, onToggle: () => void }) => {
        const spring = { type: "spring" as const, stiffness: 700, damping: 30 };
        return (
             <div 
                className={`w-9 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 ${checked ? 'bg-light-primary dark:bg-dark-primary justify-end' : 'bg-gray-200 dark:bg-gray-700 justify-start'}`}
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

    const ShortcutDisplay = ({ shortcut }: { shortcut: string }) => {
        if (!shortcut) return null;
        return (
            <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                {shortcut}
            </span>
        );
    };

    const MenuItem = ({ icon, label, onClick, danger = false, disabled = false, shortcut }: { icon: React.ReactNode, label: string, onClick?: () => void, danger?: boolean, disabled?: boolean, shortcut?: string }) => (
        <button onClick={onClick} disabled={disabled} className={`w-full flex items-center justify-between text-left px-2 py-2.5 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${danger ? 'text-red-500' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <div className="flex items-center gap-3">{icon}{label}</div>
            {shortcut && <ShortcutDisplay shortcut={shortcut} />}
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
        <div className="flex items-center gap-1">
            <SaveIndicator />
            <AnimatePresence>
                {linkedSessionIds.length > 0 && (
                    <motion.div
                        className="flex items-center gap-1.5 p-2 rounded-full text-light-primary dark:text-dark-primary"
                        aria-label={`${linkedSessionIds.length} connections`}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                    >
                        <LinkIcon size={18} />
                        <span className="text-sm font-semibold">{linkedSessionIds.length}</span>
                    </motion.div>
                )}
            </AnimatePresence>
            <motion.button 
                onClick={() => {vibrate(); setIsOptionsMenuOpen(o => !o);}} 
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                whileTap={{ scale: 0.9 }} aria-label="More options"
            >
                <MoreHorizontal size={20} />
            </motion.button>
        </div>
    );

     const SlashCommandMenu = () => (
        <motion.div
            style={{ top: slashMenuPosition.top, left: slashMenuPosition.left }}
            className="absolute z-50 w-64 bg-light-bg-secondary/85 dark:bg-dark-bg-secondary/85 backdrop-blur-md rounded-lg shadow-xl border border-white/10 p-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 600, damping: 35 }}
            onClick={(e) => e.stopPropagation()}
        >
            <p className="px-2 pt-1 pb-2 text-xs font-semibold uppercase text-light-text-secondary dark:text-dark-text-secondary">Blocks</p>
            {filteredCommands.length > 0 ? filteredCommands.map((cmd, index) => (
                <button
                    key={cmd.title}
                    onClick={() => handleCommandSelect(cmd)}
                    className={`w-full flex items-start gap-3 p-2 rounded-md text-left transition-colors ${index === activeCommandIndex ? 'bg-black/5 dark:bg-white/5' : ''}`}
                >
                    <div className="p-1 bg-light-glass dark:bg-dark-glass rounded text-light-text dark:text-dark-text">{cmd.icon}</div>
                    <div>
                        <p className="font-semibold">{cmd.title}</p>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{cmd.description}</p>
                    </div>
                </button>
            )) : <p className="p-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">No matching commands.</p>}
        </motion.div>
    );
    
    const handleRemoveHighlight = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        let node = selection.getRangeAt(0).commonAncestorContainer;
        
        while(node && node !== editorRef.current) {
            if (node.nodeType === 1 && (node as HTMLElement).dataset.highlight === 'true') {
                const span = node as HTMLElement;
                const parent = span.parentNode;
                if (parent) {
                    while (span.firstChild) {
                        parent.insertBefore(span.firstChild, span);
                    }
                    parent.removeChild(span);
                    parent.normalize();
                }
                // Continue search in case of nested highlights
            }
            node = node.parentNode;
        }
        // Fallback for simple browser highlights
        document.execCommand('backColor', false, 'transparent');
    }, []);
    
    const handleApplyHighlight = useCallback((color: string) => {
        handleRemoveHighlight(); // Clear existing highlights in selection first
        
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || color === 'transparent') return;
    
        const thickness = 75; // Default thickness
        const calculatedPosition = 65 + (thickness / 4);
    
        const span = document.createElement('span');
        span.dataset.highlight = 'true';
        span.style.backgroundColor = color;
        span.style.backgroundImage = `linear-gradient(to top, ${color}, ${color})`;
        span.style.backgroundRepeat = 'no-repeat';
        span.style.backgroundSize = `100% ${thickness}%`;
        span.style.backgroundPosition = `0% ${calculatedPosition}%`;
        span.className = 'custom-highlight';
    
        const range = selection.getRangeAt(0);
        try {
            range.surroundContents(span);
        } catch (e) {
            console.warn("Could not apply custom highlight due to complex selection. Falling back to simple highlight.", e);
            document.execCommand('backColor', false, color);
        }
    
        editorRef.current?.focus();
        editorRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }, [handleRemoveHighlight]);


    const FormattingMenu = () => {
        const handleFormat = (command: string, value?: string) => {
            document.execCommand(command, false, value);
            editorRef.current?.focus();
            editorRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
             setActiveFormats({
                bold: document.queryCommandState('bold'),
                italic: document.queryCommandState('italic'),
                underline: document.queryCommandState('underline'),
                strikethrough: document.queryCommandState('strikeThrough'),
            });
        };
    
        const handleHighlightFormat = (color: string) => {
            if (color === 'transparent') {
                handleRemoveHighlight();
            } else {
                handleApplyHighlight(color);
            }
            setActivePalette(null);
        };
    
        const handleSelectAll = () => {
            if (editorRef.current) {
                editorRef.current.focus();
                const range = document.createRange();
                range.selectNodeContents(editorRef.current);
                const selection = window.getSelection();
                if (selection) {
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }
        };

        useEffect(() => {
            if (activePalette && paletteRef.current && formattingMenuRef.current && positioningContainerRef.current) {
                const palette = paletteRef.current;
                const menu = formattingMenuRef.current;
                const container = positioningContainerRef.current;
    
                const menuRect = menu.getBoundingClientRect();
                const paletteRect = palette.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                
                if (paletteRect.width === 0) return;
    
                let left = (menuRect.width / 2) - (paletteRect.width / 2);
                const absoluteLeft = menuRect.left + left;
    
                if (absoluteLeft < containerRect.left) {
                    left = containerRect.left - menuRect.left;
                } else if (absoluteLeft + paletteRect.width > containerRect.right) {
                    left = containerRect.right - menuRect.left - paletteRect.width - 5;
                }
    
                palette.style.left = `${left}px`;
            }
        }, [activePalette, isFormattingMenuOpen]);
    
        return (
            <AnimatePresence>
                {isFormattingMenuOpen && (
                    <motion.div
                        ref={formattingMenuRef}
                        style={{ top: formattingMenuPosition.top, left: formattingMenuPosition.left }}
                        className="absolute z-40 cursor-grab"
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 700, damping: 40 }}
                        drag
                        dragConstraints={positioningContainerRef}
                        dragMomentum={false}
                        whileTap={{ cursor: 'grabbing' }}
                        onMouseEnter={() => setIsMouseOverMenu(true)}
                        onMouseLeave={() => setIsMouseOverMenu(false)}
                    >
                        <div className="p-1 bg-light-bg-secondary/85 dark:bg-dark-bg-secondary/85 backdrop-blur-md rounded-xl shadow-2xl dark:shadow-[0_10px_50px_rgba(0,0,0,0.4)] border border-white/10 flex items-center gap-1 relative z-10">
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat('bold')} className={`p-2 rounded ${activeFormats.bold ? 'bg-black/10 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}><Bold size={18} /></button>
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat('italic')} className={`p-2 rounded ${activeFormats.italic ? 'bg-black/10 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}><Italic size={18} /></button>
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat('underline')} className={`p-2 rounded ${activeFormats.underline ? 'bg-black/10 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}><Underline size={18} /></button>
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat('strikeThrough')} className={`p-2 rounded ${activeFormats.strikethrough ? 'bg-black/10 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}><Strikethrough size={18} /></button>
                            <button onMouseDown={(e) => e.preventDefault()} onClick={handleSelectAll} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded" title="Select All"><TextSelect size={18} /></button>
                            <div className="w-px h-5 bg-black/10 dark:bg-white/10 mx-1"></div>
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat('copy')} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded"><Copy size={18} /></button>
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => setActivePalette(p => p === 'highlight' ? null : 'highlight')} className={`p-2 rounded ${activePalette === 'highlight' ? 'bg-black/10 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}><Highlighter size={18} /></button>
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => setActivePalette(p => p === 'font' ? null : 'font')} className={`p-2 rounded ${activePalette === 'font' ? 'bg-black/10 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}><PaletteIcon size={18} /></button>
                        </div>
                        
                        <AnimatePresence>
                        {activePalette && (
                            <motion.div
                                ref={paletteRef}
                                className="absolute top-full mt-2 p-2 bg-light-bg-secondary/85 dark:bg-dark-bg-secondary/85 backdrop-blur-md rounded-lg shadow-xl border border-white/10"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ type: 'spring', stiffness: 600, damping: 35 }}
                            >
                                {activePalette === 'font' && (
                                    <div className="flex gap-2">
                                        {FONT_COLORS.map(({ name, value, isDefault }) => (
                                            <button key={name} title={name} onMouseDown={(e) => e.preventDefault()} onClick={() => {handleFormat('foreColor', value); setActivePalette(null);}} className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center" style={!isDefault ? { backgroundColor: value } : {}}>
                                                {isDefault && <span className="text-sm font-serif">A</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {activePalette === 'highlight' && (
                                    <div className="flex gap-2 items-center">
                                        {HIGHLIGHT_COLORS.map(({ name, value, isNone }) => (
                                            <button key={name} title={name} onMouseDown={(e) => e.preventDefault()} onClick={() => handleHighlightFormat(value)} className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center" style={!isNone ? { backgroundColor: value } : {}}>
                                                    {isNone && <div className="w-full h-0.5 bg-red-500 transform -rotate-45" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        );
    };

    const AiTaskButton = ({ icon, title, description, task, requiresInput = false }: { icon: React.ReactNode, title: string, description: string, task: AITask, requiresInput?: boolean }) => (
        <button
            onClick={() => requiresInput ? setCurrentAiTask(task) : handleAiAction(task)}
            className="w-full flex items-center gap-4 text-left p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
            <div className="p-2 bg-light-accent/10 dark:bg-dark-accent/10 text-light-accent dark:text-dark-accent rounded-lg">{icon}</div>
            <div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{description}</p>
            </div>
        </button>
    );

    return (
        <div className="w-full h-full flex flex-col bg-light-bg dark:bg-dark-bg">
            <AnimatePresence>
                {isSlashMenuOpen && <SlashCommandMenu />}
            </AnimatePresence>
            <Header title={entry ? 'Edit Entry' : 'New Entry'} showBackButton onBack={navigateBack} rightAction={HeaderActions} />
             <AnimatePresence>
                {isOptionsMenuOpen && (
                     <motion.div
                        key="journal-options-menu"
                        ref={menuRef}
                        className="absolute top-16 right-4 w-64 max-h-[calc(100dvh-5rem)] overflow-y-auto bg-light-bg-secondary/85 dark:bg-dark-bg-secondary/85 backdrop-blur-md rounded-xl border border-white/10 dark:border-white/5 shadow-3xl origin-top-right z-30 p-3 text-base"
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
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
                        <div className="flex items-center justify-around mb-2">
                            {([
                                { style: 'default', label: 'Sans', char: 'Ag' },
                                { style: 'serif', label: 'Serif', char: 'Ag' },
                                { style: 'mono', label: 'Mono', char: 'Ag' },
                            ] as const).map(({ style, label, char }) => (
                                <button
                                    key={style}
                                    onClick={() => { setFontStyle(style); markAsChanged(); }}
                                    className="flex flex-col items-center gap-1 p-2 rounded-md"
                                >
                                    <span className={`text-2xl font-semibold transition-colors mt-1 ${fontClasses[style]} ${fontStyle === style ? 'text-light-primary dark:text-dark-primary' : ''}`}>
                                        {char}
                                    </span>
                                    <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">{label}</span>
                                </button>
                            ))}
                        </div>
                        <MenuDivider/>
                        {(canUndo || canRedo) && (<>
                            <MenuItem icon={<Undo size={16}/>} label="Undo" onClick={handleUndo} disabled={!canUndo} />
                            <MenuItem icon={<Redo size={16}/>} label="Redo" onClick={handleRedo} disabled={!canRedo} />
                            <MenuDivider/>
                        </>)}
                        <MenuItem icon={<Copy size={16}/>} label="Copy text" onClick={handleCopyText} />
                        <MenuItem icon={<Repeat size={16}/>} label="Duplicate" shortcut={isDesktop ? 'Alt+D' : undefined} onClick={handleDuplicate} disabled={!currentEntry} />
                        <MenuItem icon={<Trash2 size={16}/>} label="Move to Trash" shortcut={isDesktop ? 'Alt+T' : undefined} onClick={handleDelete} danger disabled={!currentEntry} />
                        <MenuDivider/>
                        <MenuToggleItem icon={<ArrowLeftRight size={16}/>} label="Small text" checked={isSmallText} onChange={() => {setIsSmallText(s => !s); markAsChanged();}} />
                        <MenuToggleItem icon={<ChevronsRight size={16}/>} label="Full width" checked={isFullWidth} onChange={() => {setIsFullWidth(s => !s); markAsChanged();}} />
                        <MenuDivider/>
                        <MenuToggleItem icon={<Lock size={16}/>} label="Lock page" checked={isLocked} onChange={() => {setIsLocked(l => !l); markAsChanged();}} />
                         <MenuDivider/>
                         <MenuItem icon={<LinkIcon size={16}/>} label={`Connections (${linkedSessionIds.length})`} shortcut={isDesktop ? 'Alt+C' : undefined} onClick={handleLinkSession}/>
                         <MenuDivider/>
                         <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary opacity-75 px-2 pt-2 space-y-1">
                             <p>Word count: {wordCount}</p>
                             <p>Last edited by {userProfile.name}</p>
                             <p>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', hour12: true }).format(lastModified)}</p>
                         </div>
                      </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <div 
                ref={positioningContainerRef}
                className={`relative flex-grow w-full ${isFullWidth ? 'px-4 md:px-8 lg:px-12' : 'max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4'} flex flex-col transition-all duration-300 overflow-hidden`}>
                <FormattingMenu />
                <div className={`${fontClasses[fontStyle]}`}>
                    <input
                        type="text" value={title} onChange={(e) => {setTitle(e.target.value); markAsChanged();}}
                        placeholder="Title..."
                        className="w-full bg-transparent text-3xl font-bold focus:outline-none mb-4 pb-2 border-b border-white/10 placeholder:text-light-text-secondary/50 dark:placeholder:text-dark-text-secondary/50"
                        autoFocus={!entry} readOnly={isLocked}
                    />
                </div>
                <div className="relative flex-grow w-full journal-editor-container overflow-y-auto pb-24">
                    <div
                        ref={editorRef} contentEditable={!isLocked} onInput={handleContentChange}
                        onKeyUp={handleEditorKeyUp} onKeyDown={handleEditorKeyDown}
                        onContextMenu={(e) => e.preventDefault()}
                        data-placeholder="Start writing..."
                        className={`w-full min-h-full bg-transparent focus:outline-none resize-none caret-light-text dark:caret-dark-text leading-7 ${isSmallText ? 'text-base' : 'text-lg'} ${fontClasses[fontStyle]}`}
                        autoFocus={!entry}
                    />
                     <div className="mt-8 pt-6 border-t border-white/10">
                        <AnimatePresence>
                            {attachments.length > 0 && (
                                <div className="space-y-3">
                                <h2 className="font-semibold text-sm uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary mb-3">Attachments</h2>
                                {attachments.map((att, index) => (
                                    <motion.div
                                        key={att.id}
                                        layout
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
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button onClick={() => handleRemoveAttachment(att)} className="p-2 text-light-text-secondary dark:text-dark-text-secondary rounded-full hover:bg-black/10 dark:hover:bg-white/10" aria-label="Remove attachment"><Trash2 size={16} /></button>
                                                <button onClick={() => navigateTo('attachmentViewer', { attachments, startIndex: index })} className="px-4 py-1.5 text-sm font-semibold bg-light-bg-secondary dark:bg-dark-bg-secondary rounded-full shadow-sm">View</button>
                                            </div>
                                        </div>
                                        <div onClick={() => navigateTo('attachmentViewer', { attachments, startIndex: index })} className="h-48 flex items-center justify-center bg-black/5 dark:bg-white/5 cursor-pointer">
                                            {att.type.startsWith('image/') ? <img src={att.data} alt={att.name} className="max-w-full max-h-full object-contain" /> : att.type === 'application/pdf' ? <PdfViewer dataUrl={att.data} isThumbnail={true} /> : <div className="flex flex-col items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary"><AttachmentIcon type={att.type} /><span>Click to View</span></div>}
                                        </div>
                                    </motion.div>
                                ))}
                                </div>
                            )}
                        </AnimatePresence>
                        <AnimatePresence>
                            {isUploading && <motion.div className="flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary mt-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><LoaderCircle size={16} className="animate-spin" /><span>Compressing & preparing...</span></motion.div>}
                        </AnimatePresence>
                    </div>
                </div>
                <AnimatePresence>
                    {!isLocked && (
                        <>
                        <motion.button
                            onClick={() => {vibrate(); setIsAiModalOpen(true);}}
                            className="absolute bottom-6 left-6 w-16 h-16 bg-flow-gradient bg-400% animate-gradient-flow text-white rounded-full flex items-center justify-center shadow-lg z-20"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            aria-label="Aura AI Assistant"
                            initial={{ scale: 0, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0, y: 50 }}
                        >
                           <Sparkles size={24} />
                        </motion.button>
                        <motion.button
                            onClick={() => setShowAttachmentModal(true)}
                            disabled={isUploading}
                            className="absolute bottom-6 right-6 w-16 h-16 bg-light-primary dark:bg-dark-primary text-white rounded-full flex items-center justify-center shadow-lg z-20 disabled:opacity-50"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            aria-label="Attach file"
                            initial={{ scale: 0, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0, y: 50 }}
                        >
                           <AnimatePresence mode="wait">
                            {isUploading 
                                ? <motion.div key="loader" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><LoaderCircle size={24} className="animate-spin" /></motion.div>
                                : <motion.div key="icon" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><Paperclip size={24} /></motion.div>
                            }
                            </AnimatePresence>
                        </motion.button>
                        </>
                    )}
                </AnimatePresence>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />
            </div>
            <AttachmentTypeModal isOpen={showAttachmentModal} onClose={() => setShowAttachmentModal(false)} onSelect={handleAttachmentTypeSelect} />
            <AnimatePresence>
                {isAiModalOpen && (
                    <motion.div
                        className="fixed inset-0 z-40 flex flex-col justify-end bg-black/50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleAiModalClose}
                    >
                        <motion.div
                            className="w-full bg-light-bg-secondary/95 dark:bg-dark-bg-secondary/95 backdrop-blur-md rounded-t-2xl border-t border-white/10 shadow-3xl p-4"
                            initial={{ y: "100%" }}
                            animate={{ y: "0%" }}
                            exit={{ y: "100%" }}
                            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                           <AnimatePresence mode="wait">
                            {currentAiTask ? (
                                <motion.div
                                    key="ai-input"
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        <button onClick={() => setCurrentAiTask(null)} className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ArrowLeft size={18}/></button>
                                        <h3 className="text-lg font-semibold">{currentAiTask === 'GENERATE' ? 'Generate from Prompt' : 'Ask about your entry'}</h3>
                                    </div>
                                    <textarea
                                        value={aiCustomPrompt}
                                        onChange={(e) => setAiCustomPrompt(e.target.value)}
                                        placeholder={currentAiTask === 'GENERATE' ? 'e.g., about my productive day...' : 'e.g., what themes are present?'}
                                        className="w-full h-24 p-2 bg-light-glass dark:bg-dark-glass rounded-lg border border-white/10 focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary"
                                        autoFocus
                                    />
                                    <button onClick={() => handleAiAction(currentAiTask)} className="w-full mt-2 py-3 bg-light-primary dark:bg-dark-primary text-white rounded-full font-semibold">
                                        {currentAiTask === 'GENERATE' ? 'Generate' : 'Ask'}
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="ai-menu"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <h3 className="text-lg font-semibold text-center mb-3">Aura AI Assistant</h3>
                                    <div className="space-y-2">
                                        <AiTaskButton icon={<Wand2 size={20}/>} title="Organize & Refine" description="Automatically structure, format, and proofread." task="IMPROVE" />
                                        <AiTaskButton icon={<BookText size={20}/>} title="Continue Writing" description="Generate what comes next" task="CONTINUE" />
                                        <AiTaskButton icon={<BrainCircuit size={20}/>} title="Summarize" description="Get the key points" task="SUMMARIZE" />
                                        <AiTaskButton icon={<Sparkles size={20}/>} title="Generate from Prompt" description="Create a new entry from an idea" task="GENERATE" requiresInput/>
                                        <AiTaskButton icon={<MessageSquare size={20}/>} title="Ask a Question" description="Get insights about your entry" task="ASK" requiresInput/>
                                    </div>
                                </motion.div>
                            )}
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <style>{`
                .journal-editor-container [contentEditable=true] { -webkit-user-select: text; user-select: text; }
                .journal-editor-container [contentEditable=true]:empty:before { content: attr(data-placeholder); color: #a0a0a0; opacity: 0.5; }
                .journal-editor-container p { min-height: 1.75rem; }
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
                .custom-highlight { color: inherit; }
                html.dark .journal-editor-container .custom-highlight { color: #1a1a1a !important; }
                html.dark .journal-editor-container [style*="rgb(254, 240, 138)"],
                html.dark .journal-editor-container [style*="rgb(251, 207, 232)"],
                html.dark .journal-editor-container [style*="rgb(191, 219, 254)"],
                html.dark .journal-editor-container [style*="rgb(167, 243, 208)"],
                html.dark .journal-editor-container [style*="rgb(233, 213, 255)"] {
                    color: #1a1a1a !important;
                }
            `}</style>
        </div>
    );
};

export default JournalEntryPage;