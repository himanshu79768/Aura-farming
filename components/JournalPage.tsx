import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search } from 'lucide-react';
import { useAppContext } from '../App';
import { JournalEntry } from '../types';
import Header from './Header';

const JournalPage: React.FC = () => {
    const { journalEntries, navigateTo } = useAppContext();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredEntries = useMemo(() => {
        if (!searchQuery.trim()) {
            return journalEntries;
        }
        return journalEntries.filter(entry =>
            entry.content.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [journalEntries, searchQuery]);

    // Fix: Use a generic argument with `reduce` to correctly type the accumulator and ensure proper type inference for `groupedEntries`.
    const groupedEntries = filteredEntries.reduce<Record<string, JournalEntry[]>>((acc, entry) => {
        const date = new Date(entry.date).toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(entry);
        return acc;
    }, {});

    return (
        <div className="w-full h-full flex flex-col">
            <Header title="Journal" />
             <div className="w-full max-w-md mx-auto px-4 pt-2 pb-2">
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search journal..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-light-glass/80 dark:bg-dark-glass/80 rounded-full border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-light-text-secondary dark:placeholder:text-dark-text-secondary"
                    />
                </div>
            </div>
            <div className="flex-grow w-full max-w-md mx-auto overflow-y-auto">
                <AnimatePresence>
                    {journalEntries.length === 0 ? (
                         <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center text-light-text-secondary dark:text-dark-text-secondary h-full flex flex-col justify-center items-center px-4 pb-24"
                        >
                            <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">Your space is clear.</h2>
                            <p>Tap the '+' button to capture your first thought.</p>
                        </motion.div>
                    ) : filteredEntries.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center text-light-text-secondary dark:text-dark-text-secondary h-full flex flex-col justify-center items-center px-4 pb-24"
                        >
                            <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">No entries found.</h2>
                            <p>Try a different search term.</p>
                        </motion.div>
                    ) : (
                        <div className="pt-2 pb-28 px-4">
                        {/* Fix: Use Object.keys to iterate over grouped entries, ensuring proper type inference. */}
                        {Object.keys(groupedEntries).map((date) => (
                            <div key={date} className="mb-6">
                                <h2 className="font-medium text-xs uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary mb-2 sticky top-0 bg-light-bg/80 dark:bg-dark-bg/80 backdrop-blur-md py-1.5 text-center">{date}</h2>
                                <div className="space-y-3">
                                {groupedEntries[date].map(entry => (
                                    <motion.button 
                                        key={entry.id}
                                        onClick={() => navigateTo('journalEntry', { entry })}
                                        className="w-full text-left p-4 bg-light-glass dark:bg-dark-glass rounded-xl border border-white/10"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <p className="truncate">{entry.content}</p>
                                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">
                                            {new Date(entry.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                                        </p>
                                    </motion.button>
                                ))}
                                </div>
                            </div>
                        ))}
                        </div>
                    )}
                </AnimatePresence>
            </div>
             <motion.button
                onClick={() => navigateTo('journalEntry')}
                className="absolute bottom-28 right-6 w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg z-20"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="New journal entry"
            >
                <Plus size={32} />
            </motion.button>
        </div>
    );
};

export default JournalPage;