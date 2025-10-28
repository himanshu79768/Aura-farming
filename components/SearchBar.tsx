import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ searchQuery, setSearchQuery, placeholder = "Search..." }) => {
    return (
        <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary pointer-events-none z-10" />
            <input
                type="text"
                placeholder={placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-2.5 bg-light-glass/80 dark:bg-dark-glass/80 rounded-full border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-light-text-secondary dark:placeholder:text-dark-text-secondary"
            />
            <div className="absolute right-3 top-0 h-full flex items-center">
                <AnimatePresence>
                    {searchQuery && (
                        <motion.button
                            onClick={() => setSearchQuery('')}
                            className="p-1 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            aria-label="Clear search"
                        >
                            <X size={16} />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default SearchBar;