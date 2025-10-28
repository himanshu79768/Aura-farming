import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trash2, Loader, Heading2, List, ListOrdered, Minus, Link as LinkIcon, Paperclip, LoaderCircle } from 'lucide-react';
import { useAppContext } from '../App';
import { JournalEntry, Attachment } from '../types';
import { fetchJournalPrompt } from '../services/geminiService';
import Header from './Header';
import AttachmentPreview from './AttachmentPreview';

interface JournalEntryPageProps {
    entry?: JournalEntry;
}

const JournalEntryPage: React.FC<JournalEntryPageProps> = ({ entry }) => {
    const { 
        navigateBack, addJournalEntry, updateJournalEntry, deleteJournalEntry, vibrate, 
        showConfirmationModal, navigateTo, currentUser, showAlertModal, deleteAttachment 
    } = useAppContext();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [linkedSessionIds, setLinkedSessionIds] = useState<string[]>([]);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isPromptLoading, setIsPromptLoading] = useState(false);
    
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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleUpload(file);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };
    
    const handleUpload = async (file: File) => {
        if (!currentUser) return;
        setIsUploading(true);
    
        const { storage, storageRef, uploadBytes, getDownloadURL } = (window as any).firebase;
    
        const entryId = entry?.id || Date.now().toString();
        const storagePath = `attachments/${currentUser.uid}/${entryId}/${Date.now()}-${file.name}`;
        const fileRef = storageRef(storage, storagePath);
    
        try {
            const snapshot = await uploadBytes(fileRef, file);
            const url = await getDownloadURL(snapshot.ref);
    
            const newAttachment: Attachment = {
                name: file.name,
                type: file.type || 'application/octet-stream',
                url: url,
                storagePath: storagePath,
            };
    
            setAttachments(prev => [...prev, newAttachment]);
    
        } catch (error) {
            console.error("Error uploading file:", error);
            showAlertModal({ title: "Upload Failed", message: "Could not upload your file. Please try again." });
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveAttachment = async (attachmentToRemove: Attachment) => {
        setAttachments(prev => prev.filter(att => att.storagePath !== attachmentToRemove.storagePath));
        const success = await deleteAttachment(attachmentToRemove);
        if (!success) {
            setAttachments(prev => [...prev, attachmentToRemove]);
            showAlertModal({ title: "Delete Failed", message: "Could not remove the attachment. Please try again." });
        }
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
            <div className="flex-grow w-full max-w-md mx-auto p-4 flex flex-col overflow-hidden">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title..."
                    className="w-full bg-transparent text-3xl font-bold focus:outline-none mb-4 pb-2 border-b border-white/10 placeholder:text-light-text-secondary/50 dark:placeholder:text-dark-text-secondary/50"
                    autoFocus={!!entry}
                />
                <div className="relative flex-grow w-full journal-editor-container">
                    <div
                        ref={editorRef}
                        contentEditable={true}
                        onInput={handleContentChange}
                        onKeyDown={handleKeyDown}
                        onBlur={() => setTimeout(() => setShowCommandPopup(false), 200)}
                        data-placeholder="Start writing... type '/' for commands"
                        className="w-full h-full bg-transparent text-lg focus:outline-none resize-none caret-light-text dark:caret-dark-text leading-7 overflow-y-auto"
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
                                className="flex flex-wrap gap-2"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                {attachments.map(att => <AttachmentPreview key={att.storagePath} attachment={att} onRemove={handleRemoveAttachment} />)}
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
                                <span>Uploading...</span>
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

                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".jpg,.jpeg,.png,.pdf,.ppt,.pptx" style={{ display: 'none' }} />
                    <motion.button
                        onClick={() => fileInputRef.current?.click()}
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