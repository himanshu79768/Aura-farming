import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, User as UserIcon, Copy, Share2, ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { GoogleGenAI, Chat } from "@google/genai";
import { useAppContext } from '../App';
import Header from './Header';
import { ChatMessage } from '../types';

const GEMINI_API_KEY = "AIzaSyA49vGVlbtSfVov5eCgQ4ZtHRIdeRI1d9s";

// FIX: Added a helper function to extract the direct URL from Google's redirect links to ensure correct favicon fetching and navigation.
const getDirectUrl = (uri: string): string => {
    try {
        const url = new URL(uri);
        // Check if it's a Google redirect URL
        if (url.hostname.includes('google.com') && url.pathname === '/url' && url.searchParams.has('q')) {
            const finalUrl = url.searchParams.get('q');
            if (finalUrl) {
                return finalUrl;
            }
        }
    } catch (e) {
        // If parsing fails (e.g., not a valid URL), return the original URI
        console.warn("Could not parse URL, falling back to original:", uri);
    }
    return uri;
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
            // FIX: Corrected the order of replacements. Bold (**) must be processed before italic (*) to prevent incorrect parsing.
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
        navigator.clipboard.writeText(message.parts[0].text);
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


const SourcesPill: React.FC<{ message: ChatMessage; onOpen: (sources: ChatMessage['sources']) => void }> = ({ message, onOpen }) => {
    if (!message.sources || message.sources.length === 0) return null;

    return (
        <motion.button 
            onClick={() => onOpen(message.sources)}
            className="flex items-center gap-2 pl-2 pr-4 py-2 bg-light-glass dark:bg-dark-glass rounded-full border border-white/10"
            whileTap={{ scale: 0.95 }}
        >
            <div className="flex items-center -space-x-2">
                {message.sources.slice(0, 3).map((source, i) => {
                    try {
                        // FIX: Use the helper to get the direct URL's domain for the favicon.
                        const directUrl = getDirectUrl(source.uri);
                        const domain = new URL(directUrl).hostname;
                        return (
                            <img
                                key={i}
                                src={`https://www.google.com/s2/favicons?sz=64&domain_url=${domain}`}
                                alt={domain}
                                className="w-6 h-6 rounded-full border-2 border-light-bg-secondary dark:border-dark-bg-secondary bg-white object-contain"
                                style={{ zIndex: 3-i }}
                            />
                        );
                    } catch (e) {
                        return null;
                    }
                })}
            </div>
            <span className="text-sm font-medium">Sources</span>
        </motion.button>
    );
}

const SourcesSheet: React.FC<{ sources: ChatMessage['sources']; onClose: () => void }> = ({ sources, onClose }) => {
    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="w-full max-w-2xl bg-light-bg-secondary dark:bg-dark-bg-secondary rounded-t-2xl p-4 border-t border-white/10"
                onClick={(e) => e.stopPropagation()}
                initial={{ y: "100%" }}
                animate={{ y: "0%" }}
                exit={{ y: "100%" }}
                transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            >
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />
                <h2 className="text-lg font-semibold mb-4 text-center">Sources</h2>
                <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                    {sources?.map((source, index) => {
                        // FIX: Use the helper to get direct URLs for links and favicons.
                        const directUrl = getDirectUrl(source.uri);
                        const domain = new URL(directUrl).hostname;
                        return (
                         <a 
                            key={index}
                            href={directUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-start gap-3 text-sm hover:bg-black/5 dark:hover:bg-white/5 p-2 rounded-md transition-colors"
                        >
                             <img
                                src={`https://www.google.com/s2/favicons?sz=64&domain_url=${domain}`}
                                alt={domain}
                                className="w-5 h-5 mt-0.5 rounded-sm bg-white"
                            />
                            <div>
                                <p className="font-medium text-light-text dark:text-dark-text break-all">{source.title || domain}</p>
                                <p className="text-xs text-blue-400 break-all">{directUrl}</p>
                            </div>
                       </a>
                    )})}
                </div>
            </motion.div>
        </motion.div>
    );
};


const AuraAiPage: React.FC = () => {
    const { navigateBack, vibrate, showAlertModal } = useAppContext();
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSourcesSheetOpen, setIsSourcesSheetOpen] = useState(false);
    const [activeSources, setActiveSources] = useState<ChatMessage['sources']>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    const openSourcesSheet = (sources: ChatMessage['sources']) => {
        setActiveSources(sources);
        setIsSourcesSheetOpen(true);
    };

    const closeSourcesSheet = () => {
        setIsSourcesSheetOpen(false);
    };

    // Initialize Chat
    useEffect(() => {
        try {
            const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
            const newChat = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: "You are Aura, a helpful and friendly AI assistant within a focus and wellness app. Your goal is to provide clear, concise, and supportive answers to user's doubts. When appropriate, use Google Search to find up-to-date and accurate information. Keep your responses encouraging and brief. You MUST use markdown for formatting like bold, italics, and lists.",
                    tools: [{googleSearch: {}}],
                }
            });
            setChat(newChat);
        } catch (error) {
            console.error("Failed to initialize Aura AI:", error);
            showAlertModal({title: "Connection Error", message: "Could not connect to Aura AI. Please check your connection and try again."})
        }
    }, [showAlertModal]);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading || !chat) return;

        vibrate();
        const userMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            parts: [{ text: input.trim() }]
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const result = await chat.sendMessageStream({ message: userMessage.parts[0].text });
            
            let modelResponse = '';
            const modelMessageId = crypto.randomUUID();
            let groundingChunks: any[] = [];

            // Add an empty model message to start streaming into
            setMessages(prev => [...prev, { id: modelMessageId, role: 'model', parts: [{ text: '' }] }]);

            for await (const chunk of result) {
                modelResponse += chunk.text;
                if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                    groundingChunks = chunk.candidates[0].groundingMetadata.groundingChunks;
                }
                setMessages(prev => prev.map(msg => 
                    msg.id === modelMessageId 
                    ? { ...msg, parts: [{ text: modelResponse }] }
                    : msg
                ));
            }

            if (groundingChunks.length > 0) {
                const sources = groundingChunks
                    .map((chunk: any) => chunk.web ? { title: chunk.web.title, uri: chunk.web.uri } : null)
                    .filter(Boolean) as { title: string; uri: string }[];
                
                if (sources.length > 0) {
                    setMessages(prev => prev.map(msg => 
                        msg.id === modelMessageId 
                        ? { ...msg, sources }
                        : msg
                    ));
                }
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

    return (
        <div className="w-full h-full flex flex-col bg-light-bg dark:bg-dark-bg">
            <Header title="Aura AI" showBackButton onBack={navigateBack} />
            <div ref={scrollRef} className="flex-grow w-full overflow-y-auto p-4 space-y-6">
                {messages.map((msg, index) => (
                    <div
                        key={msg.id}
                        className={`flex flex-col w-full ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                        <motion.div
                            className={`flex items-start gap-3 w-full max-w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                        >
                             {msg.role === 'model' && (
                                <div className="w-8 h-8 mt-1 flex-shrink-0 rounded-full flex items-center justify-center bg-purple-500/10 text-purple-400">
                                    <Sparkles size={18} />
                                </div>
                            )}
                            <div
                                className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-light-primary dark:bg-dark-primary text-white rounded-br-lg' : 'bg-light-glass dark:bg-dark-glass rounded-bl-lg'}`}
                                style={ msg.role === 'user' ? { whiteSpace: 'pre-wrap', wordWrap: 'break-word' } : { wordWrap: 'break-word' } }
                            >
                                {msg.role === 'model' ? 
                                    (msg.parts[0].text ? <MarkdownRenderer text={msg.parts[0].text} /> : <span className="opacity-0">.</span>) : 
                                    (msg.parts[0].text || <span className="opacity-0">.</span>)
                                }
                            </div>
                            {msg.role === 'user' && (
                                <div className="w-8 h-8 mt-1 flex-shrink-0 rounded-full flex items-center justify-center bg-gray-500/10 text-gray-400">
                                    <UserIcon size={18} />
                                </div>
                            )}
                        </motion.div>
                        
                        {msg.role === 'model' && !(isLoading && index === messages.length - 1) && msg.parts[0].text && (
                            <motion.div 
                                className="flex flex-col items-start gap-2 mt-2 ml-11"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <ActionButtons message={msg} />
                                <SourcesPill message={msg} onOpen={openSourcesSheet} />
                            </motion.div>
                        )}
                    </div>
                ))}
                {isLoading && messages[messages.length-1]?.role !== 'user' && (
                     <motion.div
                        className="flex items-start gap-3 w-full justify-start"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                         <div className="w-8 h-8 mt-1 flex-shrink-0 rounded-full flex items-center justify-center bg-purple-500/10 text-purple-400">
                            <Sparkles size={18} />
                        </div>
                         <div className="p-3 rounded-2xl bg-light-glass dark:bg-dark-glass rounded-bl-lg flex items-center gap-2">
                             <motion.div className="w-2 h-2 bg-purple-400 rounded-full" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0 }} />
                             <motion.div className="w-2 h-2 bg-purple-400 rounded-full" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}/>
                             <motion.div className="w-2 h-2 bg-purple-400 rounded-full" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}/>
                         </div>
                    </motion.div>
                )}
            </div>
            <div className="p-4 border-t border-white/10">
                <form onSubmit={handleSend} className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Ask a doubt..."
                        disabled={isLoading}
                        className="w-full pl-4 pr-12 py-3 bg-light-glass dark:bg-dark-glass rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-light-primary dark:bg-dark-primary text-white rounded-full disabled:opacity-50 transition-transform duration-200"
                        aria-label="Send message"
                    >
                       <Send size={18} />
                    </button>
                </form>
            </div>
            <AnimatePresence>
                {isSourcesSheetOpen && (
                    <SourcesSheet sources={activeSources} onClose={closeSourcesSheet} />
                )}
            </AnimatePresence>
             <style>{`
                .dark\\:bg-dark-primary {
                    background-color: hsl(var(--accent-dark));
                }
                .bg-light-primary {
                    background-color: hsl(var(--accent-light));
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