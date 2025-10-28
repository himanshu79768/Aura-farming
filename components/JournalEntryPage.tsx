import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trash2, Loader, Heading2, List, ListOrdered, Minus, Link as LinkIcon, Paperclip, LoaderCircle, FileImage, FileText, FileQuestion } from 'lucide-react';
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
        navigateBack, addJournalEntry, updateJournalEntry, deleteJournalEntry, vibrate, 
        showConfirmationModal, navigateTo, showAlertModal,
    } = useAppContext();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [linkedSessionIds, setLinkedSessionIds] = useState<string[]>([]);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isPromptLoading, setIsPromptLoading] = useState(false);
    const [showAttachmentModal, setShowAttachmentModal] = useState(false);
    
    const [showCommandPopup, setShowCommandPopup] = useState(false);
    const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });

    const editorRef = useRef<HTMLDivElement>(null);
    const hasSetInitialContent = useRef(false);
    const fileInputRef = useRef<HTMLInputElement>(null);


    useEffect(() => {
        if (entry) {
            setTitle(entry.title || '');
            setContent(entry.content);
            setLinkedSessionIds(entry.linkedSessionIds || []);
            setAttachments(entry.attachments || []);
        }
    }, [entry]);

    // Set initial content for the editor
    useEffect(() => {
        if (editorRef.current && content && !hasSetInitialContent.current) {
            editorRef.current.innerHTML = content;
            hasSetInitialContent.current = true;
        }
    }, [content]);

    const handleSave = async () => {
        vibrate('medium');
        const currentContent = editorRef.current?.innerHTML.trim() || '';
        const currentText = editorRef.current?.innerText.trim() || '';
        
        if (currentText || title.trim() || attachments.length > 0) {
            const entryTitle = title.trim() || currentText.split('\n')[0].substring(0, 50) || "Journal Entry";
            let success = false;

            if (entry) {
                // Update existing entry
                const updatedEntry: JournalEntry = {
                    ...entry,
                    title: entryTitle,
                    content: currentContent,
                    linkedSessionIds: linkedSessionIds,
                    attachments: attachments,
                };
                success = await updateJournalEntry(updatedEntry);
            } else {
                // Add new entry
                const newEntry: Omit<JournalEntry, 'id' | 'createdAt'> = {
                    date: new Date().toISOString(),
                    title: entryTitle,
                    content: currentContent,
                    linkedSessionIds: linkedSessionIds,
                    attachments: attachments,
                };
                success = await addJournalEntry(newEntry);
            }
            
            if (success) {
                navigateBack();
            }
        }
    };
    
    const handleDelete = async () => {
        if (entry) {
            showConfirmationModal({
                title: 'Delete Entry?',
                message: 'This action cannot be undone. Are you sure you want to permanently delete this journal entry and all its attachments?',
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

    const handleAttachmentTypeSelect = (acceptType: string) => {
        setShowAttachmentModal(false);
        if (fileInputRef.current) {
            fileInputRef.current.accept = acceptType;
            fileInputRef.current.click();
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (fileInputRef.current) {
            fileInputRef.current.value = ""; // Clear file input immediately
        }
        if (!file) return;
    
        setIsUploading(true);
    
        try {
            let fileToProcess = file;
            
            if (file.type.startsWith('image/')) {
                try {
                    fileToProcess = await compressImage(file, { quality: 0.85, maxWidth: 1920, maxHeight: 1920 });
                } catch (compressionError) {
                    console.error("Image compression failed, using original:", compressionError);
                    showAlertModal({ title: "Compression Warning", message: "Could not process the image, attempting to use original file." });
                }
            }

            const dataUrl = await fileToDataURL(fileToProcess);
            
            const newAttachment: Attachment = {
                id: crypto.randomUUID(),
                name: fileToProcess.name,
                type: fileToProcess.type || 'application/octet-stream',
                data: dataUrl,
            };
        
            setAttachments(prev => [...prev, newAttachment]);
    
        } catch (error) {
            console.error("Error processing attachment:", error);
            showAlertModal({ title: "Processing Failed", message: "Could not process the attachment. Please try again." });
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveAttachment = async (attachmentToRemove: Attachment) => {
        setAttachments(prev => prev.filter(att => att.id !== attachmentToRemove.id));
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
    };

    const handleContentChange = (e: React.FormEvent<HTMLDivElement>) => {
        const editor = e.currentTarget;
        setContent(editor.innerHTML);
        
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        if (range.startContainer.nodeType !== Node.TEXT_NODE) {
             setShowCommandPopup(false);
             return;
        }
        const text = range.startContainer.textContent || '';
        const cursorPosition = range.startOffset;

        const line = text.substring(0, cursorPosition);
        
        if (line.endsWith('/')) {
            const rect = range.getBoundingClientRect();
            const editorRect = editor.getBoundingClientRect();
             setPopupPosition({
                top: rect.bottom - editorRect.top + 5,
                left: rect.left - editorRect.left,
            });
            setShowCommandPopup(true);
        } else {
            setShowCommandPopup(false);
        }
    };

    const handleCommandSelect = (command: string) => {
        setShowCommandPopup(false);
        const editor = editorRef.current;
        if (!editor) return;
        
        editor.focus();
        
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const node = range.startContainer;

        if (node.nodeType === Node.TEXT_NODE && node.textContent) {
            const textBeforeCursor = node.textContent.substring(0, range.startOffset);
            const commandStart = textBeforeCursor.lastIndexOf('/');
            if (commandStart !== -1) {
                range.setStart(node, commandStart);
                range.deleteContents();
            }
        }
        
        switch (command) {
            case 'h2':
                document.execCommand('formatBlock', false, '<h2>');
                break;
            case 'list':
                document.execCommand('insertUnorderedList');
                break;
            case 'numlist':
                document.execCommand('insertOrderedList');
                break;
            case 'hr':
                document.execCommand('insertHorizontalRule');
                document.execCommand('insertParagraph', false, '');
                break;
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (showCommandPopup && ['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) {
            e.preventDefault();
            setShowCommandPopup(false);
            return;
        }

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        if (e.key === 'Enter') {
            const node = selection.focusNode;
            const heading = ((node?.nodeType === 1 ? node : node?.parentElement) as Element | null)?.closest('h2');
            if (heading) {
                e.preventDefault();
                document.execCommand('insertParagraph', false);
            }
        } else if (e.key === 'Backspace') {
            const range = selection.getRangeAt(0);
            const node = range.startContainer;
            const listItem = ((node.nodeType === 1 ? node : node.parentElement) as Element | null)?.closest('li');

            if (listItem && range.startOffset === 0 && !listItem.textContent?.trim()) {
                e.preventDefault();
                document.execCommand('outdent');
            }
        }
    };
    
    const COMMANDS = [
        { cmd: 'h2', icon: Heading2, label: 'Subheading', desc: 'Medium-sized heading' },
        { cmd: 'list', icon: List, label: 'Bulleted List', desc: 'Create a simple list' },
        { cmd: 'numlist', icon: ListOrdered, label: 'Numbered List', desc: 'Create a numbered list' },
        { cmd: 'hr', icon: Minus, label: 'Divider', desc: 'Insert a horizontal line' },
    ];
    
    const handleLinkSession = () => {
        navigateTo('sessionLinking', {
            selectedIds: linkedSessionIds,
            onSave: (newSelectedIds: string[]) => {
                setLinkedSessionIds(newSelectedIds);
            },
        });
    };

    const HeaderActions = (
        <div className="flex items-center gap-2">
             <button onClick={handleLinkSession} className="flex items-center gap-1.5 p-2 text-light-text-secondary dark:text-dark-text-secondary rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                <LinkIcon className="w-5 h-5" />
                {linkedSessionIds.length > 0 && <span className="text-xs font-semibold">({linkedSessionIds.length})</span>}
            </button>
            {entry && (
                <button onClick={handleDelete} className="p-2 text-red-500 rounded-full hover:bg-red-500/10 transition-colors">
                   <Trash2 className="w-5 h-5" />
                </button>
            )}
            <button
                onClick={handleSave}
                disabled={!content.trim() && !title.trim() && attachments.length === 0}
                className="px-4 py-1.5 text-base font-semibold bg-blue-500 text-white rounded-full shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
                Save
            </button>
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
            <div className="flex-grow w-full max-w-md md:max-w-2xl lg:max-w-4xl mx-auto p-4 flex flex-col overflow-hidden">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title..."
                    className="w-full bg-transparent text-3xl font-bold focus:outline-none mb-4 pb-2 border-b border-white/10 placeholder:text-light-text-secondary/50 dark:placeholder:text-dark-text-secondary/50"
                    autoFocus={!!entry}
                />
                <div className="relative flex-grow w-full journal-editor-container overflow-y-auto">
                    <div
                        ref={editorRef}
                        contentEditable={true}
                        onInput={handleContentChange}
                        onKeyDown={handleKeyDown}
                        onBlur={() => setTimeout(() => setShowCommandPopup(false), 200)}
                        data-placeholder="Start writing... type '/' for commands"
                        className="w-full h-full bg-transparent text-lg focus:outline-none resize-none caret-light-text dark:caret-dark-text leading-7"
                        autoFocus={!entry}
                    />
                    <AnimatePresence>
                        {showCommandPopup && (
                            <motion.div
                                className="absolute z-10 w-56 bg-light-bg-secondary dark:bg-dark-bg-secondary rounded-lg shadow-xl border border-white/10 p-1.5"
                                style={{ top: popupPosition.top, left: popupPosition.left }}
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            >
                                {COMMANDS.map(command => (
                                    <button 
                                        key={command.cmd}
                                        onClick={() => handleCommandSelect(command.cmd)} 
                                        className="w-full flex items-center gap-3 text-left px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors"
                                    >
                                        <command.icon className="w-5 h-5" />
                                        <div>
                                            <p className="font-semibold">{command.label}</p>
                                            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">{command.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex-shrink-0 pt-4">
                     <AnimatePresence>
                        {attachments.length > 0 && (
                            <motion.div
                                layout
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4"
                            >
                                <div className="bg-light-glass/80 dark:bg-dark-glass/80 rounded-2xl border border-white/10 overflow-hidden">
                                    <div className="flex items-center justify-between p-3 border-b border-white/10">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <AttachmentIcon type={attachments[0].type} />
                                            <span className="font-semibold truncate pr-2">{attachments[0].name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button 
                                                onClick={() => handleRemoveAttachment(attachments[0])}
                                                className="p-2 text-light-text-secondary dark:text-dark-text-secondary rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                                                aria-label="Remove attachment"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => navigateTo('attachmentViewer', { attachments, startIndex: 0 })}
                                                className="px-4 py-1.5 text-sm font-semibold bg-light-bg-secondary dark:bg-dark-bg-secondary rounded-full shadow-sm"
                                            >
                                                {attachments.length > 1 ? `View All (${attachments.length})` : 'View'}
                                            </button>
                                        </div>
                                    </div>
                                    <div 
                                        onClick={() => navigateTo('attachmentViewer', { attachments, startIndex: 0 })}
                                        className="h-48 flex items-center justify-center bg-black/5 dark:bg-white/5 cursor-pointer"
                                    >
                                        {attachments[0].type.startsWith('image/') ? (
                                            <img src={attachments[0].data} alt={attachments[0].name} className="max-w-full max-h-full object-contain" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary">
                                                <AttachmentIcon type={attachments[0].type} />
                                                <span>Click to View</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <AnimatePresence>
                        {isUploading && (
                            <motion.div
                                className="flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary mt-2"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            >
                                <LoaderCircle size={16} className="animate-spin" />
                                <span>Compressing & preparing...</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="relative flex-shrink-0 py-4 flex items-center justify-between">
                    <button
                        onClick={handleGetPrompt}
                        disabled={isPromptLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-light-glass dark:bg-dark-glass rounded-full border border-white/20"
                    >
                        {isPromptLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-yellow-400" />}
                        Get a prompt
                    </button>

                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />
                    <motion.button
                        onClick={() => setShowAttachmentModal(true)}
                        disabled={isUploading}
                        className="w-12 h-12 bg-light-glass dark:bg-dark-glass rounded-full flex items-center justify-center shadow-lg border border-white/20 disabled:opacity-50"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        aria-label="Attach file"
                    >
                        <Paperclip size={24} />
                    </motion.button>
                </div>
            </div>
            <AttachmentTypeModal
                isOpen={showAttachmentModal}
                onClose={() => setShowAttachmentModal(false)}
                onSelect={handleAttachmentTypeSelect}
            />
            <style>{`
                .journal-editor-container [contentEditable=true]:empty:before {
                    content: attr(data-placeholder);
                    color: #a0a0a0;
                    opacity: 0.5;
                }
                .journal-editor-container h2 { font-size: 1.25rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.25rem; }
                .journal-editor-container ul, .journal-editor-container ol { padding-left: 1.5rem; margin: 0.5rem 0; }
                .journal-editor-container ul { list-style-type: disc; }
                .journal-editor-container ol { list-style-type: decimal; }
                .journal-editor-container li { margin-bottom: 0.25rem; }
                .journal-editor-container hr { border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 1.5rem 0; }
                html.light .journal-editor-container hr { border-top-color: rgba(0, 0, 0, 0.1); }
            `}</style>
        </div>
    );
};

export default JournalEntryPage;