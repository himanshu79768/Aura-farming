import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles, User as UserIcon } from 'lucide-react';
import { GoogleGenAI, Chat } from "@google/genai";
import { useAppContext } from '../App';
import Header from './Header';
import { ChatMessage } from '../types';

const AuraAiPage: React.FC = () => {
    const { navigateBack, vibrate, showAlertModal } = useAppContext();
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initialize Chat
    useEffect(() => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const newChat = ai.chats.create({
                model: 'gemini-flash-lite-latest',
                config: {
                    systemInstruction: "You are Aura, a helpful and friendly AI assistant within a focus and wellness app. Your goal is to provide clear, concise, and supportive answers to user's doubts. When appropriate, use Google Search to find up-to-date and accurate information. Keep your responses encouraging and brief.",
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
            <div ref={scrollRef} className="flex-grow w-full overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <motion.div
                        key={msg.id}
                        className={`flex items-start gap-3 w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                    >
                        {msg.role === 'model' && (
                            <div className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center bg-purple-500/10 text-purple-400">
                                <Sparkles size={18} />
                            </div>
                        )}
                        <div
                            className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-light-primary dark:bg-dark-primary text-white rounded-br-lg' : 'bg-light-glass dark:bg-dark-glass rounded-bl-lg'}`}
                            style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}
                        >
                             {msg.parts[0].text}
                            {msg.sources && msg.sources.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-white/10">
                                    <h4 className="text-xs font-semibold mb-2 text-light-text-secondary dark:text-dark-text-secondary">Sources:</h4>
                                    <ul className="text-sm space-y-1.5">
                                        {msg.sources.map((source, index) => (
                                            <li key={index} className="flex items-start gap-2">
                                                <span className="opacity-75 mt-0.5">{index + 1}.</span>
                                                <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">
                                                    {source.title || source.uri}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                        {msg.role === 'user' && (
                            <div className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center bg-gray-500/10 text-gray-400">
                                <UserIcon size={18} />
                            </div>
                        )}
                    </motion.div>
                ))}
                {isLoading && (
                    <motion.div
                        className="flex items-start gap-3 w-full justify-start"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center bg-purple-500/10 text-purple-400">
                            <Sparkles size={18} />
                        </div>
                        <div className="max-w-[80%] p-3 rounded-2xl bg-light-glass dark:bg-dark-glass rounded-bl-lg flex items-center gap-2">
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
             <style>{`
                .dark\\:bg-dark-primary {
                    background-color: hsl(var(--accent-dark));
                }
                .bg-light-primary {
                    background-color: hsl(var(--accent-light));
                }
            `}</style>
        </div>
    );
};

export default AuraAiPage;