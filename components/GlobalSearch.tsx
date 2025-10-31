import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, X, BookOpen, MessageSquare, Timer, Settings, Wind, Plus } from 'lucide-react';
import { useAppContext } from '../App';
import { JournalEntry, Quote, FocusSession } from '../types';

type SearchResult = {
    id: string;
    type: 'journal' | 'quote' | 'focus' | 'action';
    title: string;
    description?: string;
    icon: React.ReactNode;
    action: () => void;
};

const iconMap = {
    journal: <BookOpen size={18} />,
    quote: <MessageSquare size={18} />,
    focus: <Timer size={18} />,
    action: <Settings size={18} />,
};

// Helper to highlight matches
const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => {
    if (!query) return <>{text}</>;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
        <span>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase() ? (
                    <span key={i} className="text-light-text dark:text-dark-text bg-light-primary/20 dark:bg-dark-primary/20 rounded-sm">
                        {part}
                    </span>
                ) : (
                    part
                )
            )}
        </span>
    );
};

const GlobalSearch: React.FC = () => {
    const { journalEntries, quotes, focusHistory, navigateTo, toggleSearch } = useAppContext();
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const searchableActions: Omit<SearchResult, 'id'>[] = useMemo(() => [
        { type: 'action', title: 'New Journal Entry', description: 'Start writing a new entry.', icon: <Plus size={18} />, action: () => navigateTo('journalEntry') },
        { type: 'action', title: 'Start Breathing Exercise', description: 'Calm your mind with a guided session.', icon: <Wind size={18} />, action: () => navigateTo('breathing') },
        { type: 'action', title: 'Open Settings', description: 'Customize theme, sounds, and more.', icon: <Settings size={18} />, action: () => navigateTo('settings') },
    ], [navigateTo]);

    const allResults = useMemo((): SearchResult[] => {
        if (!query.trim()) return [];

        const lowerCaseQuery = query.toLowerCase();
        
        const actions = searchableActions
            .filter(a => a.title.toLowerCase().includes(lowerCaseQuery) || a.description?.toLowerCase().includes(lowerCaseQuery))
            .map((a, i) => ({ ...a, id: `action-${i}` }));
        
        const journals = journalEntries
            .filter(j => j.title?.toLowerCase().includes(lowerCaseQuery) || j.content.toLowerCase().includes(lowerCaseQuery))
            .map(j => ({
                id: `journal-${j.id}`,
                type: 'journal' as const,
                title: j.title || 'Untitled Entry',
                description: new DOMParser().parseFromString(j.content, 'text/html').body.textContent?.substring(0, 100) + '...' || 'No content preview.',
                icon: iconMap.journal,
                action: () => navigateTo('journalView', { entry: j }),
            }));

        const focusSessions = focusHistory
            .filter(f => f.name?.toLowerCase().includes(lowerCaseQuery))
            .map(f => ({
                id: `focus-${f.id}`,
                type: 'focus' as const,
                title: f.name || 'Unnamed Session',
                description: `Focused for ${Math.round(f.duration / 60)} minutes.`,
                icon: iconMap.focus,
                action: () => navigateTo('linkedJournals', { session: f }),
            }));

        const allQuotes = quotes
            .filter(q => q.text.toLowerCase().includes(lowerCaseQuery) || q.author.toLowerCase().includes(lowerCaseQuery))
            .map(q => ({
                id: `quote-${q.id}`,
                type: 'quote' as const,
                title: q.text,
                description: `- ${q.author}`,
                icon: iconMap.quote,
                action: () => navigateTo('quotes'), // Simple navigation to quotes page
            }));

        return [...actions, ...journals, ...focusSessions, ...allQuotes];
    }, [query, journalEntries, quotes, focusHistory, searchableActions, navigateTo]);
    
    // Fix: Explicitly type the accumulator in the `reduce` function to ensure correct type inference for `groupedResults`.
    const groupedResults = useMemo(() => {
        return allResults.reduce((acc: Record<string, SearchResult[]>, result) => {
            const key = result.type.charAt(0).toUpperCase() + result.type.slice(1) + 's';
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(result);
            return acc;
        }, {});
    }, [allResults]);

    useEffect(() => {
        // Reset active index when query changes
        setActiveIndex(0);
    }, [query]);

    useEffect(() => {
        inputRef.current?.focus();
        
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                toggleSearch();
            } else if (allResults.length > 0) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActiveIndex(prev => (prev + 1) % allResults.length);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActiveIndex(prev => (prev - 1 + allResults.length) % allResults.length);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const result = allResults[activeIndex];
                    if (result) {
                        result.action();
                        toggleSearch();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleSearch, allResults, activeIndex]);
    
    // Scroll to active item
    useEffect(() => {
        const activeElement = document.getElementById(`search-result-${activeIndex}`);
        activeElement?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    const handleAction = (result: SearchResult) => {
        result.action();
        toggleSearch();
    };

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] md:pt-[15vh] bg-black/30 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={toggleSearch}
        >
            <motion.div
                className="w-full max-w-2xl bg-light-bg-secondary/80 dark:bg-dark-bg-secondary/80 rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden"
                initial={{ scale: 0.95, y: -20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: -20 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-2 p-3 border-b border-white/10">
                    <SearchIcon className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search journals, quotes, actions..."
                        className="w-full bg-transparent text-lg focus:outline-none"
                    />
                    <button onClick={toggleSearch} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto max-h-[60vh] p-2">
                    <AnimatePresence>
                        {query.trim() ? (
                            allResults.length > 0 ? (
                                Object.entries(groupedResults).map(([groupName, items]) => (
                                    <div key={groupName} className="mb-2">
                                        <h3 className="px-2 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">{groupName}</h3>
                                        {items.map((result, index) => {
                                            const globalIndex = allResults.findIndex(r => r.id === result.id);
                                            return (
                                                <motion.button
                                                    key={result.id}
                                                    id={`search-result-${globalIndex}`}
                                                    onClick={() => handleAction(result)}
                                                    className={`w-full flex items-center gap-3 p-2 text-left rounded-lg transition-colors ${activeIndex === globalIndex ? 'bg-light-primary/10 dark:bg-dark-primary/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.02 }}
                                                >
                                                    <div className="text-light-primary dark:text-dark-primary">{result.icon}</div>
                                                    <div className="overflow-hidden">
                                                        <p className="font-medium truncate"><Highlight text={result.title} query={query} /></p>
                                                        {result.description && <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary truncate"><Highlight text={result.description} query={query} /></p>}
                                                    </div>
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                ))
                            ) : (
                                <motion.div className="p-8 text-center text-light-text-secondary dark:text-dark-text-secondary" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    No results found for "{query}"
                                </motion.div>
                            )
                        ) : (
                             <motion.div className="p-8 text-center text-light-text-secondary dark:text-dark-text-secondary" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                Start typing to search the app.
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default GlobalSearch;