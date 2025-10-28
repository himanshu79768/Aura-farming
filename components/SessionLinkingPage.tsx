import React, { useState, useMemo } from 'react';
// Fix: Imported `AnimatePresence` from framer-motion to resolve component not found errors.
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { useAppContext } from '../App';
import Header from './Header';
import SearchBar from './SearchBar';

interface SessionLinkingPageProps {
    selectedIds: string[];
    onSave: (newSelectedIds: string[]) => void;
}

const SessionLinkingPage: React.FC<SessionLinkingPageProps> = ({ selectedIds, onSave }) => {
    const { focusHistory, navigateBack } = useAppContext();
    const [currentSelectedIds, setCurrentSelectedIds] = useState<string[]>(selectedIds || []);
    const [searchQuery, setSearchQuery] = useState('');

    const handleToggleSession = (id: string) => {
        setCurrentSelectedIds(prev =>
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    const handleDone = () => {
        onSave(currentSelectedIds);
        navigateBack();
    };

    const filteredHistory = useMemo(() => focusHistory.filter(session => 
        session.name?.toLowerCase().includes(searchQuery.toLowerCase())
    ), [focusHistory, searchQuery]);

    const allFilteredSelected = useMemo(() => {
        if (filteredHistory.length === 0) return false;
        return filteredHistory.every(session => currentSelectedIds.includes(session.id));
    }, [filteredHistory, currentSelectedIds]);

    const handleSelectAll = () => {
        if (allFilteredSelected) {
            // Deselect all filtered
            const filteredIds = new Set(filteredHistory.map(s => s.id));
            setCurrentSelectedIds(prev => prev.filter(id => !filteredIds.has(id)));
        } else {
            // Select all filtered
            const filteredIds = filteredHistory.map(s => s.id);
            setCurrentSelectedIds(prev => [...new Set([...prev, ...filteredIds])]);
        }
    };

    const HeaderActions = (
        <button onClick={handleDone} className="px-4 py-1.5 text-base font-semibold bg-blue-500 text-white rounded-full shadow-sm">
            Done
        </button>
    );

    return (
        <div className="w-full h-full flex flex-col bg-light-bg dark:bg-dark-bg">
            <Header title="Link Sessions" showBackButton onBack={navigateBack} rightAction={HeaderActions} />
             <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 pt-2 flex-shrink-0">
                <SearchBar
                    placeholder="Search sessions..."
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                />
            </div>
            <div className="flex-grow w-full max-w-md md:max-w-2xl lg:max-w-4xl mx-auto p-4 overflow-y-auto">
                <div className="flex justify-start mb-2 px-1">
                    <button onClick={handleSelectAll} className="px-4 py-1.5 text-sm font-semibold text-blue-500 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        {allFilteredSelected ? 'Deselect All' : 'Select All'}
                    </button>
                </div>
                <div className="space-y-3 pb-24 md:pb-8">
                    {filteredHistory.length > 0 ? (
                        filteredHistory.map(session => (
                            <motion.button
                                key={session.id}
                                onClick={() => handleToggleSession(session.id)}
                                className="w-full flex items-center justify-between text-left p-4 bg-light-glass dark:bg-dark-glass rounded-xl border border-white/10"
                                whileTap={{ scale: 0.98 }}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            >
                                <div className="pr-4">
                                    <p className="font-medium">{session.name || 'Focus Session'}</p>
                                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                        {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {Math.round(session.duration / 60)} min
                                    </p>
                                </div>
                                <div className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full border-2 transition-all duration-200 ease-in-out ${currentSelectedIds.includes(session.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-500'}`}>
                                    <AnimatePresence>
                                    {currentSelectedIds.includes(session.id) && (
                                        <motion.div
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.5, opacity: 0 }}
                                        >
                                            <Check className="w-4 h-4 text-white" />
                                        </motion.div>
                                    )}
                                    </AnimatePresence>
                                </div>
                            </motion.button>
                        ))
                    ) : (
                        <div className="text-center text-light-text-secondary dark:text-dark-text-secondary py-16">
                            <p>No focus sessions found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SessionLinkingPage;
