import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, User as UserIcon, Copy, Share2, ThumbsUp, ThumbsDown, Check, Mic, Paperclip, SquarePen, MicOff, X, Image as ImageIcon, FileText, Clock, BookText, BrainCircuit, Wind, CheckCircle, MessageSquare } from 'lucide-react';
import { GoogleGenAI, Chat, Part, Modality } from "@google/genai";
import * as pdfjsLib from 'pdfjs-dist';
import { useAppContext } from '../App';
import Header from './Header';
import { ChatMessage } from '../types';
import AttachmentTypeModal from './AttachmentTypeModal';
import OverscrollContainer from './OverscrollContainer';

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

const AttachmentIcon: React.FC<{ type: string }> = ({ type }) => {
    if (type.startsWith('image/')) return <ImageIcon size={24} className="text-purple-400 shrink-0" />;
    if (type === 'application/pdf') return <FileText size={24} className="text-red-400 shrink-0" />;
    if (type.includes('word')) return <FileText size={24} className="text-blue-500 shrink-0" />;
    if (type.includes('presentation') || type.includes('powerpoint')) return <FileText size={24} className="text-orange-500 shrink-0" />;
    return <FileText size={24} className="text-gray-400 shrink-0" />;
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


const AuraAiPage: React.FC = () => {
    const { navigateBack, vibrate, showAlertModal, auraChatSessions, saveChatSession, settings } = useAppContext();
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [attachment, setAttachment] = useState<{ data: string; mimeType: string; name: string } | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [showAttachmentModal, setShowAttachmentModal] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [chatState, setChatState] = useState<'initial' | 'chat'>(messages.length > 0 ? 'chat' : 'initial');
    
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
            // A small timeout helps the browser calculate scrollHeight correctly after state changes
            setTimeout(() => {
                if (textareaRef.current) {
                    el.style.height = `${el.scrollHeight}px`;
                }
            }, 0);
        }
    }, [input]);


    const handleSend = async (e?: React.FormEvent | string) => {
        const isProgrammaticSend = typeof e === 'string';
        if (!isProgrammaticSend) e?.preventDefault();

        if (isLoading || !chat) return;

        const currentInput = isProgrammaticSend ? e : input;
        
        if (!currentInput.trim() && !attachment) return;

        if (chatState === 'initial') {
            setChatState('chat');
        }

        const userMessagePartsForDisplay: Part[] = [];
        const userMessagePartsForApi: Part[] = [];

        if (attachment) {
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
        setAttachment(null);
        setIsLoading(true);
        let modelResponseText = '';

        try {
            const result = await chat.sendMessageStream({ message: userMessagePartsForApi });
            
            const modelMessageId = crypto.randomUUID();
            
            setMessages(prev => [...prev, { id: modelMessageId, role: 'model', parts: [{ text: '' }] }]);

            for await (const chunk of result) {
                modelResponseText += chunk.text;
                setMessages(prev => prev.map(msg => 
                    msg.id === modelMessageId 
                    ? { ...msg, parts: [{ text: modelResponseText }] }
                    : msg
                ));
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
            setAttachment({ data: dataUrl, mimeType: file.type, name: file.name });
        };
        reader.onerror = () => {
            showAlertModal({ title: "Error", message: "Failed to read the file." });
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveAttachment = () => {
        setAttachment(null);
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
        setAttachment(null);
        initializeChat();
        setChatState('initial');
    };
    
    const handleHistoryClick = () => {
        vibrate();
        setIsHistoryOpen(true);
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
                <div className="w-20 h-20 mb-4 rounded-full flex items-center justify-center bg-light-primary/10 dark:bg-dark-primary/10 text-light-primary dark:text-dark-primary border border-light-primary/20 dark:border-dark-primary/20">
                    <Sparkles size={40} />
                </div>
                <h2 className="text-2xl font-semibold">How can I help you today?</h2>
            </motion.div>
            
            <motion.form
                layoutId="aura-ai-input-form"
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                onSubmit={handleSend}
                className="group w-full max-w-xl mx-auto my-6"
            >
                <div className="relative flex flex-col bg-light-glass/50 dark:bg-dark-glass/50 rounded-2xl min-h-[140px] border-2 border-transparent focus-within:border-light-primary dark:focus-within:border-dark-primary transition-colors duration-300 shadow-lg dark:shadow-2xl">
                    <div className="p-3">
                        <motion.button 
                            type="button" 
                            onClick={handleHistoryClick}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center gap-1.5 px-3 h-9 text-sm rounded-full text-light-text-secondary dark:text-dark-text-secondary bg-black/5 dark:bg-white/10 hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 hover:text-light-primary dark:hover:text-dark-primary transition-colors">
                            <BookText size={16}/>
                            Add context
                        </motion.button>
                    </div>
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder={isListening ? "Listening..." : "Ask, search, or make anything..."}
                        disabled={isLoading}
                        rows={1}
                        className="w-full flex-grow bg-transparent focus:outline-none resize-none overflow-y-hidden self-center px-4 py-2 text-base"
                    />
                    <div className="p-2 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={handleAttachmentClick} className="p-2 text-light-text-secondary dark:text-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors flex-shrink-0">
                                <Paperclip size={20} />
                            </button>
                            <motion.button 
                                type="button" 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => showAlertModal({ title: "Coming Soon", message: "Research mode will enable deeper thinking for complex tasks."})} 
                                className="flex items-center gap-1.5 px-3 h-9 text-sm rounded-full text-light-text-secondary dark:text-dark-text-secondary bg-black/5 dark:bg-white/10 hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 hover:text-light-primary dark:hover:text-dark-primary transition-colors">
                                <BrainCircuit size={16}/>
                                Research
                            </motion.button>
                        </div>
                        <div className="flex items-center gap-1">
                            <button type="button" onClick={handleMicClick} className={`p-2 rounded-full transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-light-text-secondary dark:text-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                            </button>
                            <button type="submit" disabled={(!input.trim() && !attachment) || isLoading} className="w-9 h-9 flex items-center justify-center bg-light-accent dark:bg-dark-accent text-white rounded-full disabled:opacity-50 transition-transform duration-200">
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </motion.form>

            <motion.div
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-2 gap-3 w-full max-w-xl"
            >
                {starterPrompts.map(prompt => (
                    <button key={prompt.text} onClick={() => handleSend(prompt.text)} className="p-4 bg-light-glass dark:bg-dark-glass rounded-xl text-left text-sm border border-transparent hover:border-light-primary/50 dark:hover:border-dark-primary/50 transition-all flex items-center gap-3">
                        <span className="text-light-primary dark:text-dark-primary">{prompt.icon}</span>
                        <span>{prompt.text}</span>
                    </button>
                ))}
            </motion.div>
        </motion.div>
    );
    
    const ChatView = (
        <motion.div
            key="chat-view"
            className="flex-grow flex flex-col w-full overflow-hidden"
        >
            <motion.div
                className="flex-grow"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.15 }}
            >
                <OverscrollContainer ref={scrollRef} className="h-full overflow-y-auto">
                    <div className="p-4 space-y-6">
                        {messages.map((msg, index) => (
                            <div key={msg.id} className={`flex flex-col w-full ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`flex items-start gap-3 w-full max-w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'model' && (
                                        <div className="w-8 h-8 mt-1 flex-shrink-0 rounded-full flex items-center justify-center bg-light-primary/10 dark:bg-dark-primary/10 text-light-primary dark:text-dark-primary">
                                            <Sparkles size={18} />
                                        </div>
                                    )}
                                    <div className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-light-primary dark:bg-dark-primary text-white rounded-br-lg' : 'bg-light-glass dark:bg-dark-glass rounded-bl-lg'}`}>
                                        {msg.role === 'model' ? 
                                            (<div className={isLoading && index === messages.length - 1 ? 'typing-cursor' : ''}>
                                                {msg.parts[0] && 'text' in msg.parts[0] ? <MarkdownRenderer text={msg.parts[0].text} /> : <span className="opacity-0">.</span>}
                                            </div>) : 
                                            (<div className="flex flex-col gap-2">
                                                {msg.parts.map((part, i) => {
                                                    if ('inlineData' in part && typeof part.inlineData === 'object') {
                                                        const { mimeType, data, name } = part.inlineData;
                                                        const fullDataUrl = `data:${mimeType};base64,${data}`;
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
                        ))}
                    </div>
                </OverscrollContainer>
            </motion.div>
            <div className="flex-shrink-0 w-full p-4 border-t border-white/10">
                <AnimatePresence>
                    {attachment && (
                        <motion.div className="mb-2 p-2 bg-light-glass dark:bg-dark-glass rounded-lg flex items-center justify-between" initial={{ opacity: 0, height: 0, marginBottom: 0 }} animate={{ opacity: 1, height: 'auto', marginBottom: '0.5rem' }} exit={{ opacity: 0, height: 0, marginBottom: 0 }}>
                            <div className="flex items-center gap-2 overflow-hidden">
                                <AttachmentIcon type={attachment.mimeType} />
                                <span className="text-sm truncate">{attachment.name}</span>
                            </div>
                            <button onClick={handleRemoveAttachment} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full flex-shrink-0">
                                <X size={16} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
                <motion.form
                    layoutId="aura-ai-input-form"
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    onSubmit={handleSend}
                    className="relative flex gap-2 items-center"
                >
                    <button type="button" onClick={handleAttachmentClick} className="p-3 text-light-text-secondary dark:text-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors flex-shrink-0">
                        <Paperclip size={20} />
                    </button>
                    <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder={isListening ? "Listening..." : "Ask anything..."} disabled={isLoading} rows={1} className="w-full bg-transparent focus:outline-none resize-none overflow-y-hidden self-center max-h-32 text-base px-2 py-2" />
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button type="button" onClick={handleMicClick} className={`p-2 rounded-full transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-light-text-secondary dark:text-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5'}`}>
                            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>
                        <button type="submit" disabled={(!input.trim() && !attachment) || isLoading} className="w-9 h-9 flex items-center justify-center bg-light-primary dark:bg-dark-primary text-white rounded-full disabled:opacity-50 transition-transform duration-200">
                           <Send size={18} />
                        </button>
                    </div>
                </motion.form>
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
            `}</style>
        </div>
    );
};

export default AuraAiPage;
