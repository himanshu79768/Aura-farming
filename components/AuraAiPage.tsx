

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, User as UserIcon, Copy, Share2, ThumbsUp, ThumbsDown, Check, Mic, Paperclip, SquarePen, MicOff, X, Image as ImageIcon, FileText, Clock, BookText, BrainCircuit, Wind, CheckCircle, MessageSquare, Search, BookOpen, ChevronDown } from 'lucide-react';
import { GoogleGenAI, Chat, Part, Modality } from "@google/genai";
import * as pdfjsLib from 'pdfjs-dist';
import { useAppContext } from '../App';
import Header from './Header';
import { ChatMessage, JournalEntry } from '../types';
import AttachmentTypeModal from './AttachmentTypeModal';
import OverscrollContainer from './OverscrollContainer';
import SearchBar from './SearchBar';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const API_KEY = "AIzaSyA49vGVlbtSfVov5eCgQ4ZtHRIdeRI1d9s";

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
];

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

const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    const html = useMemo(() => {
        const lines = text.split('\n');
        const htmlElements: string[] = [];
        let inList: 'ul' | 'ol' | null = null;

        const closeList = () => {
            if (inList) {
                htmlElements.push(`</${inList}>`);
                inList = null;
            }
        };

        lines.forEach(line => {
            // Corrected the order of replacements. Bold (**) must be processed before italic (*).
            let processedLine = line
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>');

            const ulMatch = processedLine.match(/^(\s*)(\*|-)\s+(.*)/);
            if (ulMatch) {
                if (inList !== 'ul') {
                    closeList();
                    htmlElements.push('<ul>');
                    inList = 'ul';
                }
                htmlElements.push(`<li>${ulMatch[3]}</li>`);
                return;
            }

            const olMatch = processedLine.match(/^(\s*)(\d+\.)\s+(.*)/);
            if (olMatch) {
                if (inList !== 'ol') {
                    closeList();
                    htmlElements.push('<ol>');
                    inList = 'ol';
                }
                htmlElements.push(`<li>${olMatch[3]}</li>`);
                return;
            }

            closeList();
            if (processedLine.trim()) {
                htmlElements.push(`<p>${processedLine}</p>`);
            }
        });

        closeList();
        return htmlElements.join('');
    }, [text]);

    return <div className="prose-styles" dangerouslySetInnerHTML={{ __html: html }} />;
};


const ActionButtons: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const [isCopied, setIsCopied] = useState(false);
    const { showAlertModal } = useAppContext();

    const handleCopy = () => {
        const textToCopy = message.parts.reduce((acc, part) => 'text' in part ? acc + part.text : acc, '');
        navigator.clipboard.writeText(textToCopy);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };
    
    const handleUnsupported = () => {
        showAlertModal({ title: "Coming Soon", message: "This feature is not yet implemented."});
    };

    return (
        <div className="flex items-center gap-2">
            <button onClick={handleCopy} className="p-1.5 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text transition-colors" aria-label="Copy response">
                {isCopied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
            <button onClick={handleUnsupported} className="p-1.5 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text transition-colors" aria-label="Share response"><Share2 size={16} /></button>
            <button onClick={handleUnsupported} className="p-1.5 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text transition-colors" aria-label="Like response"><ThumbsUp size={16} /></button>
            <button onClick={handleUnsupported} className="p-1.5 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text transition-colors" aria-label="Dislike response"><ThumbsDown size={16} /></button>
        </div>
    );
};

const WordIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className={className}>
      <defs>
        <linearGradient id="wordGradient" x1="9" x2="33.506" y1="364.445" y2="364.445" gradientTransform="translate(0 -339.89)" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#66c0ff" />
          <stop offset=".26" stopColor="#0094f0" />
        </linearGradient>
      </defs>
      <path fill="#283593" d="M9,33.595l14.911-18.706L41,26v13.306C41,41.346,39.346,43,37.306,43H15.332 C11.835,43,9,40.164,9,36.667C9,36.667,9,33.595,9,33.595z"></path>
      <path fill="url(#wordGradient)" d="M9,20.208c0-2.624,2.126-4.75,4.749-4.75h21.857L41,12.778v13.527 C41,28.346,39.346,30,37.306,30H15.332C11.835,30,9,32.836,9,36.333L9,20.208L9,20.208z"></path>
      <path fill="#1e88e5" fillOpacity=".6" d="M9,20.208c0-2.624,2.126-4.75,4.749-4.75h21.857L41,12.778v13.527 C41,28.346,39.346,30,37.306,30H15.332C11.835,30,9,32.836,9,36.333L9,20.208L9,20.208z"></path>
      <path fill="#00e5ff" d="M9,10.333C9,6.836,11.835,4,15.332,4h21.975C39.346,4,41,5.654,41,7.694v5.611 C41,15.346,39.346,17,37.306,17H15.332C11.835,17,9,19.836,9,23.333C9,23.333,9,10.333,9,10.333z"></path>
      <path fill="#1565c0" d="M7.5,23h10c1.933,0,3.5,1.567,3.5,3.5v10c0,1.933-1.567,3.5-3.5,3.5h-10C5.567,40,4,38.433,4,36.5 v-10C4,24.567,5.567,23,7.5,23z"></path>
      <path fill="#fff" d="M18.327,26.643l-2.092,9.713l-2.501,0.002L12.5,30.529l-1.293,5.829H8.683l-2.01-9.713h2.062 l1.24,6.41l1.232-6.41h2.528l1.291,6.41l1.21-6.41L18.327,26.643L18.327,26.643z"></path>
    </svg>
);

const PdfIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-label="PDF" role="img" viewBox="0 0 512 512" className={className}>
      <rect width="512" height="512" rx="15%" fill="#c80a0a" />
      <path fill="#ffffff" d="M413 302c-9-10-29-15-56-15-16 0-33 2-53 5a252 252 0 0 1-52-69c10-30 17-59 17-81 0-17-6-44-30-44-7 0-13 4-17 10-10 18-6 58 13 100a898 898 0 0 1-50 117c-53 22-88 46-91 65-2 9 4 24 25 24 31 0 65-45 91-91a626 626 0 0 1 92-24c38 33 71 38 87 38 32 0 35-23 24-35zM227 111c8-12 26-8 26 16 0 16-5 42-15 72-18-42-18-75-11-88zM100 391c3-16 33-38 80-57-26 44-52 72-68 72-10 0-13-9-12-15zm197-98a574 574 0 0 0-83 22 453 453 0 0 0 36-84 327 327 0 0 0 47 62zm13 4c32-5 59-4 71-2 29 6 19 41-13 33-23-5-42-18-58-31z"/>
    </svg>
);

const PptIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className={className}>
        <defs>
            <linearGradient id="a" x1="4.494" y1="-1748.086" x2="13.832" y2="-1731.914" gradientTransform="translate(0 1756)" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ca4c28" />
            <stop offset="0.5" stopColor="#c5401e" />
            <stop offset="1" stopColor="#b62f14" />
            </linearGradient>
        </defs>
        <path d="M18.93,17.3,16.977,3h-.146A12.9,12.9,0,0,0,3.953,15.854V16Z" fill="#ed6c47" />
        <path d="M17.123,3h-.146V16l6.511,2.6L30,16v-.146A12.9,12.9,0,0,0,17.123,3Z" fill="#ff8f6b" />
        <path d="M30,16v.143A12.905,12.905,0,0,1,17.12,29h-.287A12.907,12.907,0,0,1,3.953,16.143V16Z" fill="#d35230" />
        <path d="M3.194,8.85H15.132a1.193,1.193,0,0,1,1.194,1.191V21.959a1.193,1.193,0,0,1-1.194,1.191H3.194A1.192,1.192,0,0,1,2,21.959V10.041A1.192,1.192,0,0,1,3.194,8.85Z" fill="url(#a)" />
        <path d="M9.293,12.028a3.287,3.287,0,0,1,2.174.636,2.27,2.27,0,0,1,.756,1.841,2.555,2.555,0,0,1-.373,1.376,2.49,2.49,0,0,1-1.059.935A3.607,3.607,0,0,1,9.2,17.15H7.687v2.8H6.141V12.028ZM7.686,15.94H9.017a1.735,1.735,0,0,0,1.177-.351,1.3,1.3,0,0,0,.4-1.025q0-1.309-1.525-1.31H7.686V15.94Z" fill="#fff" />
    </svg>
);

const AttachmentIcon: React.FC<{ type: string }> = ({ type }) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-full h-full text-purple-400 shrink-0" />;
    if (type === 'application/pdf') return <PdfIcon className="w-full h-full" />;
    if (type.includes('word')) return <WordIcon className="w-full h-full" />;
    if (type.includes('presentation') || type.includes('powerpoint')) return <PptIcon className="w-full h-full" />;
    if (type === 'application/vnd.aura.journal') return <BookText className="w-full h-full text-blue-400 shrink-0" />;
    return <FileText className="w-full h-full text-gray-400 shrink-0" />;
};

type LocalAttachment = { id: string; data: string; mimeType: string; name: string };

const AttachmentPreview: React.FC<{ attachment: LocalAttachment; onRemove: () => void; }> = ({ attachment, onRemove }) => {
    const isImage = attachment.mimeType.startsWith('image/');
    return (
        <motion.div
            layout
            className="relative flex-shrink-0 mt-2 mr-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
            <div className="w-32 h-32 rounded-xl border border-white/10 bg-light-bg-secondary dark:bg-dark-bg">
                {isImage ? (
                    <img src={attachment.data} alt={attachment.name} className="w-full h-full object-contain rounded-xl" />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-2">
                        <div className="w-14 h-14">
                            <AttachmentIcon type={attachment.mimeType} />
                        </div>
                        <p className="text-xs mt-2 leading-tight break-words w-full line-clamp-3">{attachment.name}</p>
                    </div>
                )}
            </div>
            <button onClick={onRemove} className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-gray-600 text-white rounded-full flex items-center justify-center border-2 border-light-bg-secondary dark:border-dark-bg-secondary shadow-md">
                <X size={14} />
            </button>
        </motion.div>
    );
};

// --- Audio Helper Functions ---
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


interface JournalContextModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddContext: (selectedJournals: JournalEntry[]) => void;
}

const JournalContextModal: React.FC<JournalContextModalProps> = ({ isOpen, onClose, onAddContext }) => {
    const { journalEntries, vibrate, playUISound } = useAppContext();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredJournals = useMemo(() => {
        if (!searchQuery.trim()) {
            return journalEntries;
        }
        const lowerCaseQuery = searchQuery.toLowerCase();
        return journalEntries.filter(entry =>
            entry.title?.toLowerCase().includes(lowerCaseQuery) ||
            entry.content.toLowerCase().includes(lowerCaseQuery)
        );
    }, [journalEntries, searchQuery]);

    const handleToggle = (id: string) => {
        vibrate();
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleAddContext = () => {
        playUISound('success');
        const selectedJournals = journalEntries.filter(j => selectedIds.includes(j.id));
        onAddContext(selectedJournals);
        onClose();
        // Reset state for next time
        setSelectedIds([]);
        setSearchQuery('');
    };
    
    const handleClose = () => {
        playUISound('tap');
        onClose();
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-end justify-center p-2 bg-black/50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                >
                    <motion.div
                        className="relative w-full max-w-lg h-[70vh] md:h-[70vh] bg-light-bg-secondary/95 dark:bg-dark-bg-secondary/95 backdrop-blur-md rounded-2xl border border-white/10 shadow-3xl flex flex-col overflow-hidden"
                        initial={{ y: "100%" }}
                        animate={{ y: "0%" }}
                        exit={{ y: "100%" }}
                        transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                        drag="y"
                        dragConstraints={{ top: 0 }}
                        onDragEnd={(_, info) => { if (info.offset.y > 100) handleClose(); }}
                        dragElastic={{ top: 0, bottom: 0.5 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute top-0 left-0 right-0 flex justify-center pt-3 cursor-grab">
                            <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                        </div>
                        <div className="flex-shrink-0 p-4 pt-6 flex items-center justify-between border-b border-white/10">
                            <h2 className="text-xl font-bold">Add Journal Context</h2>
                            <button onClick={handleClose} className="p-2 -mr-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><X size={20}/></button>
                        </div>
                        <div className="flex-shrink-0 p-4">
                            <SearchBar
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                placeholder="Search journals..."
                            />
                        </div>

                        <OverscrollContainer className="flex-grow overflow-y-auto">
                            <div className="p-4 pt-0 space-y-2">
                                {filteredJournals.length > 0 ? filteredJournals.map(entry => (
                                    <motion.button
                                        key={entry.id}
                                        onClick={() => handleToggle(entry.id)}
                                        className={`w-full flex items-center gap-4 text-left p-3 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 ${selectedIds.includes(entry.id) ? 'selected-journal-item' : 'border-transparent'}`}
                                    >
                                        <div className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-md border-2 transition-all ${selectedIds.includes(entry.id) ? 'bg-light-primary dark:bg-dark-primary border-transparent' : 'border-gray-400'}`}>
                                            {selectedIds.includes(entry.id) && <Check size={16} className="text-white"/>}
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="font-semibold truncate">{entry.title || "Untitled Entry"}</p>
                                            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                                {new Date(entry.date).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </motion.button>
                                )) : (
                                    <div className="text-center py-16 text-light-text-secondary dark:text-dark-text-secondary">
                                        <BookOpen size={32} className="mx-auto mb-2" />
                                        <p>No journals found.</p>
                                    </div>
                                )}
                            </div>
                        </OverscrollContainer>
                        
                        <div className="flex-shrink-0 p-4 border-t border-white/10 flex justify-center">
                            <motion.button
                                onClick={handleAddContext}
                                disabled={selectedIds.length === 0}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold bg-flow-gradient bg-400% animate-gradient-flow text-white rounded-full shadow-lg disabled:opacity-50"
                                whileTap={{ scale: 0.98 }}
                            >
                                Add Context ({selectedIds.length})
                            </motion.button>
                        </div>
                         <style>{`
                            .dark\\:bg-dark-primary {
                                background-color: hsl(var(--accent-dark));
                            }
                            .bg-light-primary {
                                background-color: hsl(var(--accent-light));
                            }
                            .selected-journal-item {
                                background-color: hsla(var(--accent-light), 0.1);
                                border-color: hsla(var(--accent-light), 0.3);
                            }
                            html.dark .selected-journal-item {
                                background-color: hsla(var(--accent-dark), 0.1);
                                border-color: hsla(var(--accent-dark), 0.3);
                            }
                         `}</style>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};


const AuraAiPage: React.FC = () => {
    const { journalEntries, navigateBack, vibrate, showAlertModal, auraChatSessions, saveChatSession, settings } = useAppContext();
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
    const [isListening, setIsListening] = useState(false);
    const [showAttachmentModal, setShowAttachmentModal] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [chatState, setChatState] = useState<'initial' | 'chat'>(messages.length > 0 ? 'chat' : 'initial');
    const [isJournalContextModalOpen, setIsJournalContextModalOpen] = useState(false);
    const [isTextareaFocused, setIsTextareaFocused] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);
    const [isResearchMode, setIsResearchMode] = useState(false);
    const [thinkingLogVisible, setThinkingLogVisible] = useState(false);
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);
    const wasLoading = useRef(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const audioQueueRef = useRef<AudioBuffer[]>([]);
    const isPlayingRef = useRef<boolean>(false);
    const audioSourceNodesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef<number>(0);

    useEffect(() => {
        setIsDesktop(!('ontouchstart' in window) || navigator.maxTouchPoints === 0);
    }, []);

    const processAudioQueue = useCallback(() => {
        const audioContext = audioContextRef.current;
        if (isPlayingRef.current || audioQueueRef.current.length === 0 || !audioContext || audioContext.state === 'closed') {
            isPlayingRef.current = false;
            return;
        }
        isPlayingRef.current = true;
        
        const audioBuffer = audioQueueRef.current.shift();
        if (!audioBuffer) {
            isPlayingRef.current = false;
            return;
        }

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);

        audioSourceNodesRef.current.add(source);
        source.onended = () => {
            audioSourceNodesRef.current.delete(source);
            isPlayingRef.current = false;
            processAudioQueue(); // Process next in queue
        };

        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContext.currentTime);
        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;
    }, []);

    const cancelSpeech = useCallback(() => {
        audioQueueRef.current = [];
        isPlayingRef.current = false;
        audioSourceNodesRef.current.forEach(source => {
            try { source.stop(); } catch (e) {}
        });
        audioSourceNodesRef.current.clear();
    }, []);

    const speakText = useCallback(async (text: string) => {
        if (!text.trim() || !('AudioContext' in window || 'webkitAudioContext' in window)) {
            return;
        }

        cancelSpeech();

        try {
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            const audioContext = audioContextRef.current;
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            nextStartTimeRef.current = audioContext.currentTime;

            const cleanedText = text.replace(/[*#]/g, '').replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
            if (!cleanedText.trim()) return;

            const sentences = cleanedText.match(/[^.!?]+[.!?]*(\s|$)/g) || [cleanedText];

            const fetchAndQueue = async (sentence: string) => {
                if (!sentence.trim()) return;
                
                const ai = new GoogleGenAI({ apiKey: API_KEY });
                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash-preview-tts",
                    contents: [{ parts: [{ text: sentence }] }],
                    config: {
                        responseModalities: [Modality.AUDIO],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: { voiceName: 'Kore' },
                            },
                        },
                    },
                });
                
                const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                if (base64Audio && audioContextRef.current && audioContextRef.current.state !== 'closed') {
                    const audioData = decode(base64Audio);
                    const audioBuffer = await decodeAudioData(audioData, audioContext, 24000, 1);
                    audioQueueRef.current.push(audioBuffer);
                    
                    if (!isPlayingRef.current) {
                        processAudioQueue();
                    }
                }
            };
            
            sentences.forEach(fetchAndQueue);

        } catch (error) {
            console.error("Error with Gemini TTS:", error);
            showAlertModal({title: "Speech Error", message: "Sorry, I couldn't generate the audio for that response."});
        }
    }, [cancelSpeech, showAlertModal, processAudioQueue]);

    const initializeChat = useCallback(() => {
        try {
            const ai = new GoogleGenAI({ apiKey: API_KEY });
            const newChat = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: "You are Aura, a helpful and friendly AI assistant within a focus and wellness app. Your goal is to provide clear, concise, and supportive answers to user's doubts. Keep your responses encouraging and brief. You MUST use markdown for formatting like bold, italics, and lists.",
                }
            });
            setChat(newChat);
        } catch (error) {
            console.error("Failed to initialize Aura AI:", error);
            showAlertModal({title: "Connection Error", message: "Could not connect to Aura AI. Please check your connection and try again."})
        }
    }, [showAlertModal]);

    const messagesRef = useRef(messages);
    messagesRef.current = messages;
    
    useEffect(() => {
        return () => {
            if (messagesRef.current.length > 0) {
                saveChatSession(messagesRef.current);
            }
        };
    }, [saveChatSession]);

    // Speech Recognition & TTS cleanup
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                setInput(input + finalTranscript);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                showAlertModal({ title: "Mic Error", message: `An error occurred: ${event.error}` });
                setIsListening(false);
            };
        }

        return () => {
            cancelSpeech();
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(console.error);
                audioContextRef.current = null;
            }
             if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [input, showAlertModal, cancelSpeech]);

    useEffect(() => {
        if (wasLoading.current && !isLoading) {
            const lastMessage = messages[messages.length - 1];
            if (settings.speakAuraAI && lastMessage?.role === 'model' && lastMessage.parts[0] && 'text' in lastMessage.parts[0]) {
                speakText(lastMessage.parts[0].text);
            }
        }
        wasLoading.current = isLoading;
    }, [isLoading, messages, settings.speakAuraAI, speakText]);


    // Initialize Chat
    useEffect(() => {
        initializeChat();
    }, [initializeChat]);

    // Scroll to bottom
    useEffect(() => {
        if (chatState === 'chat' && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading, chatState]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            const el = textareaRef.current;
            el.style.height = 'auto'; // Reset height to shrink if text is deleted
            el.style.height = `${el.scrollHeight}px`; // Set to content height
        }
    }, [input]);


    const handleSend = async (e?: React.FormEvent | string) => {
        const isProgrammaticSend = typeof e === 'string';
        if (!isProgrammaticSend) e?.preventDefault();

        if (isLoading || !chat) return;

        const currentInput = isProgrammaticSend ? e : input;
        
        if (!currentInput.trim() && attachments.length === 0) return;

        if (chatState === 'initial') {
            setChatState('chat');
        }

        const userMessagePartsForDisplay: Part[] = [];
        const userMessagePartsForApi: Part[] = [];

        if (attachments.length > 0) {
            for (const attachment of attachments) {
                 if (attachment.mimeType === 'application/vnd.aura.journal') {
                    userMessagePartsForDisplay.push({
                        inlineData: {
                            data: '', // Not used for rendering
                            mimeType: attachment.mimeType,
                            name: attachment.name,
                        }
                    });
                    const journal = journalEntries.find(j => j.id === attachment.id);
                    if (journal) {
                        const plainTextContent = new DOMParser().parseFromString(journal.content, 'text/html').body.textContent || '';
                        const journalContextForModel = `The user has attached context from a journal entry titled "${journal.title}". Its content is as follows:\n\n---\n${plainTextContent}\n---`;
                        userMessagePartsForApi.push({ text: journalContextForModel });
                    }
                    continue; // Skip to next attachment
                }

                userMessagePartsForDisplay.push({
                    inlineData: {
                        data: attachment.data.split(',')[1],
                        mimeType: attachment.mimeType,
                        name: attachment.name,
                    }
                });

                if (attachment.mimeType.startsWith('image/')) {
                    userMessagePartsForApi.push({
                        inlineData: {
                            data: attachment.data.split(',')[1],
                            mimeType: attachment.mimeType,
                        }
                    });
                } else if (attachment.mimeType === 'application/pdf') {
                    const pdfData = dataURLToUint8Array(attachment.data);
                    try {
                        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
                        let pdfText = '';
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const textContent = await page.getTextContent();
                            pdfText += textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
                        }
                        const pdfContentForModel = `The user attached a PDF named "${attachment.name}". Its content is: ${pdfText}`;
                        userMessagePartsForApi.push({ text: pdfContentForModel });
                    } catch (error) {
                        console.error("PDF processing error:", error);
                        showAlertModal({ title: "PDF Error", message: "Could not process the attached PDF." });
                        return;
                    }
                } else {
                    const otherFileContentForModel = `The user has attached a file named "${attachment.name}" of type ${attachment.mimeType}. You cannot process its contents, but you should acknowledge that it has been attached.`;
                    userMessagePartsForApi.push({ text: otherFileContentForModel });
                }
            }
        }
        
        if (currentInput.trim()) {
            const textPart = { text: currentInput.trim() };
            userMessagePartsForDisplay.push(textPart);
            userMessagePartsForApi.push(textPart);
        }

        if (userMessagePartsForApi.length === 0) return;

        vibrate();
        const userMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            parts: userMessagePartsForDisplay
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setAttachments([]);
        setIsLoading(true);
        let modelResponseText = '';

        try {
            const streamOptions: { message: Part[]; config?: any } = { message: userMessagePartsForApi };
            if (isResearchMode) {
                streamOptions.config = {
                    thinkingConfig: { thinkingBudget: 24576 } // Max for flash
                };
            }

            const result = await chat.sendMessageStream(streamOptions);
            
            const modelMessageId = crypto.randomUUID();
            
            setMessages(prev => [...prev, { id: modelMessageId, role: 'model', parts: [{ text: '' }], thinkingSteps: [] }]);

            for await (const chunk of result) {
                modelResponseText += chunk.text;
                
                setMessages(prev => prev.map(msg => {
                    if (msg.id === modelMessageId) {
                        const newMsg = { ...msg };
                        
                        // Append text
                        newMsg.parts = [{ text: modelResponseText }];
                        
                        // Handle thinking state
                        if (chunk.thinkingState?.lastAction) {
                            const newThinkingStep = chunk.thinkingState.lastAction;
                            const existingSteps = newMsg.thinkingSteps || [];
                            
                            // Avoid adding duplicate consecutive steps
                            if (existingSteps[existingSteps.length - 1] !== newThinkingStep) {
                                newMsg.thinkingSteps = [...existingSteps, newThinkingStep];
                            }
                        }
                        return newMsg;
                    }
                    return msg;
                }));
            }

        } catch (error) {
            console.error("Aura AI Error:", error);
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'model',
                parts: [{ text: "Sorry, I'm having trouble connecting right now. Please try again later." }]
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (isDesktop && e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };
    
    const handleAttachmentClick = () => {
        setShowAttachmentModal(true);
    };

    const handleAttachmentTypeSelect = (acceptType: string) => {
        setShowAttachmentModal(false);
        if (fileInputRef.current) {
            fileInputRef.current.accept = acceptType;
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (fileInputRef.current) { fileInputRef.current.value = ""; }
        if (!file) return;

        if (!ALLOWED_MIME_TYPES.some(type => file.type.startsWith(type) || file.type === type)) {
            showAlertModal({ title: "Unsupported File", message: "Please select a supported file type (Image, PDF, Word, PowerPoint)." });
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            const newAttachment: LocalAttachment = {
                id: crypto.randomUUID(),
                data: dataUrl,
                mimeType: file.type,
                name: file.name
            };
            setAttachments(prev => [...prev, newAttachment]);
        };
        reader.onerror = () => {
            showAlertModal({ title: "Error", message: "Failed to read the file." });
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveAttachment = (idToRemove: string) => {
        setAttachments(prev => prev.filter(att => att.id !== idToRemove));
    };

    const handleMicClick = () => {
        if (!recognitionRef.current) {
            showAlertModal({ title: "Not Supported", message: "Speech recognition is not supported in your browser." });
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            cancelSpeech();
            vibrate();
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const handleNewChat = () => {
        cancelSpeech();
        vibrate();
        if (messages.length > 0) {
            saveChatSession(messages);
        }
        setMessages([]);
        setInput('');
        setAttachments([]);
        initializeChat();
        setChatState('initial');
    };
    
    const handleHistoryClick = () => {
        vibrate();
        setIsHistoryOpen(true);
    };
    
    const handleAddContextClick = () => {
        vibrate();
        setIsJournalContextModalOpen(true);
    };

    const handleAddJournalContext = (selectedJournals: JournalEntry[]) => {
        if (selectedJournals.length === 0) return;
    
        const journalAttachments: LocalAttachment[] = selectedJournals.map(j => ({
            id: j.id,
            mimeType: 'application/vnd.aura.journal',
            name: j.title || 'Untitled Journal',
            data: j.id, // Store ID, data url not needed for this type
        }));
    
        setAttachments(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newAttachments = journalAttachments.filter(j => !existingIds.has(j.id));
            return [...prev, ...newAttachments];
        });
    };

    const loadHistory = (historyMessages: ChatMessage[]) => {
        if (messages.length > 0) {
            saveChatSession(messages);
        }
        setMessages(historyMessages);
        setChatState('chat');
        setIsHistoryOpen(false);
    };

    const handleBack = () => {
        if (messages.length > 0) {
            saveChatSession(messages);
        }
        navigateBack();
    };

    const HeaderActions = (
        <div className="flex items-center gap-1">
            <button onClick={handleHistoryClick} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors" aria-label="Chat history">
                <Clock size={20} />
            </button>
            <button onClick={handleNewChat} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors" aria-label="New chat">
                <SquarePen size={20} />
            </button>
        </div>
    );
    
    const starterPrompts = [
        { text: "Journal prompt for self-reflection", icon: <BookText size={20} /> },
        { text: "Motivational quote for focus", icon: <MessageSquare size={20} /> },
        { text: "Breathing exercise for calm", icon: <Wind size={20} /> },
        { text: "Plan my day for wellness", icon: <CheckCircle size={20} /> },
    ];

    const InitialView = (
        <motion.div
            key="initial-view"
            className="flex-grow flex flex-col items-center justify-center text-center px-4"
        >
            <motion.div
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col items-center"
            >
                <div className="w-20 h-20 mb-4 rounded-full flex items-center justify-center bg-light-glass/80 dark:bg-dark-glass/80 border border-white/10">
                    <Sparkles size={40} className="text-cyan-400"/>
                </div>
                <h2 className="text-2xl font-semibold">How can I help you today?</h2>
            </motion.div>
            
            <div className="w-full my-6">
                <motion.form
                    layoutId="aura-ai-input-form"
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    onSubmit={handleSend}
                    className="group w-full max-w-xl md:max-w-3xl mx-auto"
                >
                    <div className="relative rounded-2xl shadow-xl dark:shadow-3xl p-[2px]">
                        <div className={`absolute inset-0 rounded-2xl bg-flow-gradient bg-400% animate-gradient-flow transition-opacity duration-300 ${isTextareaFocused ? 'opacity-100' : 'opacity-0'}`} />
                        <div className="relative flex flex-col bg-light-bg-secondary dark:bg-dark-bg-secondary rounded-[14px] min-h-[136px] transition-colors duration-300">
                            <div className="p-3 flex gap-2">
                                <motion.button 
                                    type="button" 
                                    onClick={handleAddContextClick}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="flex items-center gap-1.5 px-3 h-9 text-sm rounded-full text-light-text-secondary dark:text-dark-text-secondary bg-black/5 dark:bg-white/10 hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 hover:text-light-primary dark:hover:text-dark-primary transition-colors"
                                >
                                    <BookText size={16} />
                                    <span className="text-sm">Add context</span>
                                </motion.button>
                                <motion.button 
                                    type="button" 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        vibrate();
                                        setIsResearchMode(prev => !prev);
                                    }} 
                                    className={`flex items-center gap-2 px-3 h-9 text-sm rounded-full transition-colors ${isResearchMode 
                                        ? 'bg-light-primary/10 dark:bg-dark-primary/10 text-light-primary dark:text-dark-primary' 
                                        : 'text-light-text-secondary dark:text-dark-text-secondary bg-black/5 dark:bg-white/10'
                                    }`}>
                                    <BrainCircuit size={16}/>
                                    <span>Research {isResearchMode ? 'On' : 'Off'}</span>
                                </motion.button>
                            </div>
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onFocus={() => setIsTextareaFocused(true)}
                                onBlur={() => setIsTextareaFocused(false)}
                                onKeyDown={handleKeyDown}
                                placeholder={isListening ? "Listening..." : "Ask, search, or make anything..."}
                                disabled={isLoading}
                                rows={1}
                                className="w-full flex-grow bg-transparent focus:outline-none resize-none overflow-y-hidden self-center px-4 py-2 text-base"
                            />
                            <div className="p-2 flex justify-between items-center">
                                <div className="flex items-center gap-1">
                                    <button type="button" onClick={handleAttachmentClick} className="p-2 text-light-text-secondary dark:text-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors flex-shrink-0">
                                        <Paperclip size={20} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button type="button" onClick={handleMicClick} className={`p-2 rounded-full transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-light-text-secondary dark:text-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                                    </button>
                                    <button type="submit" disabled={(!input.trim() && attachments.length === 0) || isLoading} className="w-9 h-9 flex items-center justify-center bg-flow-gradient bg-400% animate-gradient-flow text-white rounded-full disabled:opacity-50 transition-transform duration-200">
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.form>
            </div>

            <AnimatePresence>
                {attachments.length > 0 && (
                    <motion.div 
                        className="w-full max-w-xl md:max-w-3xl mx-auto px-4"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {attachments.map(att => (
                                <AttachmentPreview key={att.id} attachment={att} onRemove={() => handleRemoveAttachment(att.id)} />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <motion.div
                layout
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.15 }}
                className="w-full max-w-xl md:max-w-3xl mt-4"
            >
                <h3 className="text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-3 text-left">Get Started</h3>
                <div className="grid grid-cols-2 gap-3 w-full">
                    {starterPrompts.map(prompt => (
                        <button key={prompt.text} onClick={() => handleSend(prompt.text)} className="p-4 bg-light-glass dark:bg-dark-glass rounded-xl text-left text-sm border border-white/20 dark:border-white/10 shadow-lg hover:shadow-xl transition-all flex items-center gap-3">
                            <span className="text-gray-500 dark:text-gray-400">{prompt.icon}</span>
                            <span>{prompt.text}</span>
                        </button>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
    
    const ChatView = (
        <motion.div
            key="chat-view"
            className="flex-grow flex flex-col w-full min-h-0"
        >
            <OverscrollContainer ref={scrollRef} className="flex-grow w-full overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                >
                    <div className="p-4 space-y-6">
                        {messages.map((msg, index) => {
                            const lastThinkingStep = msg.thinkingSteps?.[msg.thinkingSteps.length - 1];
                            return (
                                <div key={msg.id} className={`flex flex-col w-full ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`flex items-start gap-3 w-full max-w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {msg.role === 'model' && (
                                            <div className="w-8 h-8 mt-1 flex-shrink-0 rounded-full flex items-center justify-center bg-light-primary/10 dark:bg-dark-primary/10 text-light-primary dark:text-dark-primary">
                                                <Sparkles size={18} />
                                            </div>
                                        )}
                                        <div className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-light-primary dark:bg-dark-primary text-white rounded-br-lg' : 'bg-light-glass dark:bg-dark-glass rounded-bl-lg'}`}>
                                            {msg.role === 'model' ? 
                                                (<div>
                                                    {isLoading && index === messages.length - 1 && lastThinkingStep && (
                                                        <div className="mb-2 border-b border-white/10 pb-2">
                                                            <button onClick={() => setThinkingLogVisible(prev => !prev)} className="w-full flex items-center justify-between gap-2 text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                                                <div className="flex items-center gap-2 overflow-hidden">
                                                                    <BrainCircuit size={14} className="text-light-primary dark:text-dark-primary animate-pulse flex-shrink-0"/>
                                                                    <span className="truncate text-left">{lastThinkingStep}</span>
                                                                </div>
                                                                <ChevronDown size={16} className={`transition-transform flex-shrink-0 ${thinkingLogVisible ? 'rotate-180' : ''}`} />
                                                            </button>
                                                            <AnimatePresence>
                                                                {thinkingLogVisible && msg.thinkingSteps && msg.thinkingSteps.length > 1 && (
                                                                    <motion.div
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: 'auto', opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        className="overflow-hidden"
                                                                    >
                                                                        <ul className="mt-2 pl-5 text-xs text-light-text-secondary dark:text-dark-text-secondary list-disc space-y-1">
                                                                            {msg.thinkingSteps.slice(0, -1).map((step, i) => (
                                                                                <li key={i} className="opacity-70">{step}</li>
                                                                            ))}
                                                                        </ul>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    )}
                                                    <div className={isLoading && index === messages.length - 1 && !lastThinkingStep ? 'typing-cursor' : ''}>
                                                        {msg.parts[0] && 'text' in msg.parts[0] ? <MarkdownRenderer text={msg.parts[0].text} /> : <span className="opacity-0">.</span>}
                                                    </div>
                                                </div>) : 
                                                (<div className="flex flex-col gap-2">
                                                    {msg.parts.map((part, i) => {
                                                        if ('inlineData' in part && typeof part.inlineData === 'object') {
                                                            const { mimeType, data, name } = part.inlineData;
                                                            const fullDataUrl = `data:${mimeType};base64,${data}`;
                                                            if (mimeType === 'application/vnd.aura.journal') {
                                                                return (
                                                                    <div key={i} className="flex items-center gap-2 p-2 bg-black/10 dark:bg-white/10 rounded-lg">
                                                                        <BookText size={16} />
                                                                        <span className="truncate text-sm font-medium">{name || 'Journal Context'}</span>
                                                                    </div>
                                                                );
                                                            }
                                                            if (mimeType?.startsWith('image/')) {
                                                                return <img key={i} src={fullDataUrl} alt={name || "User upload"} className="rounded-lg max-w-full h-auto max-h-64 object-contain" />;
                                                            } else {
                                                                return (<div key={i} className="flex items-center gap-2 p-2 bg-black/10 dark:bg-white/10 rounded-lg"><AttachmentIcon type={mimeType || ''} /><span className="truncate text-sm font-medium">{name || 'Attached File'}</span></div>);
                                                            }
                                                        }
                                                        if ('text' in part && part.text) {
                                                            return <div key={i} style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{part.text}</div>;
                                                        }
                                                        return null;
                                                    })}
                                                </div>)
                                            }
                                        </div>
                                        {msg.role === 'user' && (
                                            <div className="w-8 h-8 mt-1 flex-shrink-0 rounded-full flex items-center justify-center bg-gray-500/10 text-gray-400">
                                                <UserIcon size={18} />
                                            </div>
                                        )}
                                    </div>
                                    {msg.role === 'model' && !(isLoading && index === messages.length - 1) && msg.parts[0] && 'text' in msg.parts[0] && msg.parts[0].text && (
                                        <div className="flex flex-col items-start gap-2 mt-2 ml-11">
                                            <ActionButtons message={msg} />
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </motion.div>
            </OverscrollContainer>
            <div className="flex-shrink-0 w-full p-4 pt-2 bg-light-glass/50 dark:bg-dark-glass/50 shadow-xl dark:shadow-3xl">
                <AnimatePresence>
                    {attachments.length > 0 && (
                        <motion.div 
                            className="w-full pb-2"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <div className="flex gap-3 overflow-x-auto pb-2">
                                {attachments.map(att => (
                                    <AttachmentPreview key={att.id} attachment={att} onRemove={() => handleRemoveAttachment(att.id)} />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                 <motion.div
                    layoutId="aura-ai-input-form"
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    className="relative rounded-2xl p-[2px]"
                >
                    <div className={`absolute inset-0 rounded-2xl bg-flow-gradient bg-400% animate-gradient-flow transition-opacity duration-300 ${isTextareaFocused ? 'opacity-100' : 'opacity-0'}`} />
                    <form
                        onSubmit={handleSend}
                        className="relative flex gap-2 items-center p-1 rounded-[14px] bg-light-bg-secondary dark:bg-dark-bg-secondary"
                    >
                        <button type="button" onClick={handleAddContextClick} className="p-2 text-light-text-secondary dark:text-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors flex-shrink-0" aria-label="Add journal context">
                            <BookText size={20} />
                        </button>
                        <button type="button" onClick={handleAttachmentClick} className="p-2 text-light-text-secondary dark:text-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors flex-shrink-0" aria-label="Attach file">
                            <Paperclip size={20} />
                        </button>
                        <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onFocus={() => setIsTextareaFocused(true)} onBlur={() => setIsTextareaFocused(false)} onKeyDown={handleKeyDown} placeholder={isListening ? "Listening..." : "Ask anything..."} disabled={isLoading} rows={1} className="w-full bg-transparent focus:outline-none resize-none overflow-y-hidden self-center max-h-32 text-base px-2 py-2" />
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button type="button" onClick={handleMicClick} className={`p-1 rounded-full transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-light-text-secondary dark:text-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                            </button>
                            <button type="submit" disabled={(!input.trim() && attachments.length === 0) || isLoading} className="w-9 h-9 flex items-center justify-center bg-flow-gradient bg-400% animate-gradient-flow text-white rounded-full disabled:opacity-50 transition-transform duration-200">
                               <Send size={18} />
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </motion.div>
    );

    return (
        <div className="w-full h-full flex flex-col bg-light-bg dark:bg-dark-bg">
            <Header title="Aura AI" showBackButton onBack={handleBack} rightAction={HeaderActions} />
            
            <AnimatePresence>
                {isHistoryOpen && (
                    <motion.div
                        className="fixed inset-0 z-40 bg-black/50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsHistoryOpen(false)}
                    >
                        <motion.div
                            className="absolute top-0 right-0 bottom-0 w-full max-w-sm bg-light-bg-secondary/95 dark:bg-dark-bg-secondary/95 backdrop-blur-md border-l border-white/10"
                            initial={{ x: "100%" }}
                            animate={{ x: "0%" }}
                            exit={{ x: "100%" }}
                            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <Header title="History" showBackButton onBack={() => setIsHistoryOpen(false)} />
                            <OverscrollContainer className="h-full overflow-y-auto">
                                <div className="p-4 space-y-3">
                                    {auraChatSessions.length > 0 ? auraChatSessions.map((session, index) => {
                                        const firstUserMessage = session.find(msg => msg.role === 'user')?.parts.find(p => 'text' in p) as { text: string } | undefined;
                                        return (
                                            <button key={index} onClick={() => loadHistory(session)} className="w-full p-3 bg-light-glass dark:bg-dark-glass rounded-lg text-left">
                                                <p className="font-medium truncate">{firstUserMessage?.text || "Chat with attachments"}</p>
                                                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">{session.length} messages</p>
                                            </button>
                                        );
                                    }) : (
                                        <div className="text-center text-light-text-secondary dark:text-dark-text-secondary pt-16">
                                            <BookText size={40} className="mx-auto mb-4" />
                                            <p>No recent chats.</p>
                                        </div>
                                    )}
                                </div>
                            </OverscrollContainer>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <JournalContextModal 
                isOpen={isJournalContextModalOpen}
                onClose={() => setIsJournalContextModalOpen(false)}
                onAddContext={handleAddJournalContext}
            />

            <div className="flex-grow flex flex-col w-full overflow-hidden">
                <AnimatePresence mode="wait">
                    {chatState === 'initial' ? InitialView : ChatView}
                </AnimatePresence>
            </div>
             <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
             <AttachmentTypeModal 
                isOpen={showAttachmentModal} 
                onClose={() => setShowAttachmentModal(false)} 
                onSelect={handleAttachmentTypeSelect} 
            />
             <style>{`
                @keyframes blink-cursor {
                    50% { opacity: 0; }
                }
                .typing-cursor::after {
                    content: '▋';
                    animation: blink-cursor 1s step-end infinite;
                    display: inline-block;
                    margin-left: 2px;
                    font-weight: 300;
                    color: currentColor;
                    opacity: 0.7;
                }
                .dark\\:bg-dark-primary {
                    background-color: hsl(var(--accent-dark));
                }
                .bg-light-primary {
                    background-color: hsl(var(--accent-light));
                }
                .text-light-primary {
                    color: hsl(var(--accent-light));
                }
                .dark\\:text-dark-primary {
                    color: hsl(var(--accent-dark));
                }
                .bg-light-primary\\/10 {
                    background-color: hsla(var(--accent-light), 0.1);
                }
                .dark\\:bg-dark-primary\\/10 {
                    background-color: hsla(var(--accent-dark), 0.1);
                }
                 .border-light-primary {
                    border-color: hsl(var(--accent-light));
                }
                .dark\\:border-dark-primary {
                    border-color: hsl(var(--accent-dark));
                }
                .border-light-primary\\/20 {
                    border-color: hsla(var(--accent-light), 0.2);
                }
                .dark\\:border-dark-primary\\/20 {
                    border-color: hsla(var(--accent-dark), 0.2);
                }
                 .hover\\:bg-light-primary\\/10:hover {
                    background-color: hsla(var(--accent-light), 0.1);
                }
                .dark\\:hover\\:bg-dark-primary\\/10:hover {
                    background-color: hsla(var(--accent-dark), 0.1);
                }
                .hover\\:text-light-primary:hover {
                    color: hsl(var(--accent-light));
                }
                .dark\\:hover\\:text-dark-primary:hover {
                    color: hsl(var(--accent-dark));
                }
                .hover\\:border-light-primary\\/50:hover {
                    border-color: hsla(var(--accent-light), 0.5);
                }
                .dark\\:hover\\:border-dark-primary\\/50:hover {
                    border-color: hsla(var(--accent-dark), 0.5);
                }
                .focus-within\\:border-light-primary:focus-within {
                     border-color: hsl(var(--accent-light));
                }
                .dark\\:focus-within\\:border-dark-primary:focus-within {
                    border-color: hsl(var(--accent-dark));
                }
                .prose-styles p:not(:last-child) { margin-bottom: 0.75rem; }
                .prose-styles ul, .prose-styles ol { margin-left: 1.25rem; margin-top: 0.5rem; margin-bottom: 0.75rem; }
                .prose-styles ul { list-style-type: disc; }
                .prose-styles ol { list-style-type: decimal; }
                .prose-styles li:not(:last-child) { margin-bottom: 0.25rem; }
                .prose-styles strong { font-weight: 600; }
                .prose-styles em { font-style: italic; }
                .line-clamp-2 {
                    overflow: hidden;
                    display: -webkit-box;
                    -webkit-box-orient: vertical;
                    -webkit-line-clamp: 2;
                }
                 .line-clamp-3 {
                    overflow: hidden;
                    display: -webkit-box;
                    -webkit-box-orient: vertical;
                    -webkit-line-clamp: 3;
                }
            `}</style>
        </div>
    );
};

export default AuraAiPage;