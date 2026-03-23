import React, { useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, ChevronLeft, ChevronRight, X, Link as LinkIcon, Trash2, Check, Filter } from 'lucide-react';
import { useAppContext } from '../App';
import { JournalEntry } from '../types';
import Header from './Header';
import SearchBar from './SearchBar';
import OverscrollContainer from './OverscrollContainer';

interface JournalListItemProps {
    entry: JournalEntry;
    isSelected: boolean;
    isSelectionMode: boolean;
    onClick: (entry: JournalEntry) => void;
    onPointerDown: (id: string) => void;
    onPointerUpOrLeave: () => void;
}

const JournalListItem: React.FC<JournalListItemProps> = React.memo(({ entry, isSelected, isSelectionMode, onClick, onPointerDown, onPointerUpOrLeave }) => {
    const { settings } = useAppContext();
    
    const getSubjectColor = (title: string) => {
        if (!title) return 'bg-gray-500/20 text-gray-500';
        const upperTitle = title.toUpperCase();
        if (upperTitle.includes('ACCOUNTING')) return 'bg-blue-500/20 text-blue-500';
        if (upperTitle.includes('LAWS')) return 'bg-slate-500/20 text-slate-500';
        if (upperTitle.includes('APTITUDE')) return 'bg-yellow-500/20 text-yellow-500';
        if (upperTitle.includes('ECONOMICS')) return 'bg-red-500/20 text-red-500';
        return 'bg-light-accent/20 text-light-accent dark:text-dark-accent';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{
                opacity: 1,
                y: 0,
                scale: isSelected ? 0.98 : 1,
            }}
            exit={{ opacity: 0, y: -20 }}
            onClick={() => onClick(entry)}
            onPointerDown={() => onPointerDown(entry.id)}
            onPointerUp={onPointerUpOrLeave}
            onPointerLeave={onPointerUpOrLeave}
            className={`w-full text-left p-4 rounded-xl border flex items-center gap-4 transition-all duration-200 ${isSelected ? 'journal-item-selected border-light-primary dark:border-dark-primary' : 'border-white/10'}`}
            style={{ contain: 'layout paint' }}
        >
            <AnimatePresence>
                {isSelectionMode && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="w-6 h-6 flex-shrink-0"
                    >
                        <div className={`w-full h-full rounded-full border-2 flex items-center justify-center transition-all duration-200 ${isSelected ? 'bg-light-primary dark:bg-dark-primary border-transparent' : 'border-gray-500'}`}>
                            {isSelected && <Check size={16} className="text-white" />}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="flex-grow overflow-hidden">
                <div className="flex items-center justify-between">
                    <p className="font-semibold truncate pr-2 text-lg">{entry.title || 'Untitled Entry'}</p>
                    {entry.linkedSessionIds && entry.linkedSessionIds.length > 0 && (
                        <LinkIcon size={14} className="text-light-text-secondary dark:text-dark-text-secondary shrink-0" />
                    )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                        {new Date(entry.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </p>
                    {entry.subject && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getSubjectColor(entry.subject)}`}>
                            {entry.subject}
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    );
});


const JournalPage: React.FC = () => {
    const { journalEntries, navigateTo, focusHistory, deleteMultipleJournalEntries, showConfirmationModal, vibrate, playUISound } = useAppContext();
    const [searchQuery, setSearchQuery] = useState('');
    const [showCalendar, setShowCalendar] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<'date' | 'subject'>('date');
    
    const longPressTimerRef = useRef<number>();
    const isLongPress = useRef(false);


    const entryDates = useMemo(() => {
        return new Set(journalEntries.map(entry => new Date(entry.date).toDateString()));
    }, [journalEntries]);

    const filteredEntries = useMemo(() => {
        let entries = journalEntries;

        if (selectedDate) {
            entries = entries.filter(entry => new Date(entry.date).toDateString() === selectedDate.toDateString());
        }

        if (!searchQuery.trim()) {
            return entries;
        }

        const lowerCaseQuery = searchQuery.toLowerCase();
        
        const sessionNameMap = new Map<string, string>();
        focusHistory.forEach(session => {
            if (session.name) {
                sessionNameMap.set(session.id, session.name.toLowerCase());
            }
        });

        return entries.filter(entry => {
            if (entry.title?.toLowerCase().includes(lowerCaseQuery) || entry.content.toLowerCase().includes(lowerCaseQuery)) {
                return true;
            }

            if (entry.linkedSessionIds) {
                for (const sessionId of entry.linkedSessionIds) {
                    const sessionName = sessionNameMap.get(sessionId);
                    if (sessionName && sessionName.includes(lowerCaseQuery)) {
                        return true;
                    }
                }
            }
            
            return false;
        });
    }, [journalEntries, searchQuery, selectedDate, focusHistory]);
    
    const groupedEntries = useMemo(() => {
        if (sortBy === 'subject') {
            return filteredEntries.reduce<Record<string, JournalEntry[]>>((acc, entry) => {
                const subject = entry.subject || 'No Subject';
                if (!acc[subject]) {
                    acc[subject] = [];
                }
                acc[subject].push(entry);
                return acc;
            }, {});
        }

        return filteredEntries.reduce<Record<string, JournalEntry[]>>((acc, entry) => {
            const date = new Date(entry.date).toLocaleDateString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric'
            });
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(entry);
            return acc;
        }, {});
    }, [filteredEntries, sortBy]);

    const generateCalendarDays = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        const startDayOfWeek = firstDayOfMonth.getDay();

        const days: (Date | null)[] = [];
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };

    const calendarDays = generateCalendarDays(viewDate);
    const today = new Date();

    const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    const handleDateClick = (day: Date) => {
        setSelectedDate(prev => (prev && prev.toDateString() === day.toDateString() ? null : day));
    };

    const exitSelectionMode = () => {
        setIsSelectionMode(false);
        setSelectedIds([]);
    };

    const handleDeleteSelected = () => {
        if (selectedIds.length === 0) return;
        showConfirmationModal({
            title: `Delete ${selectedIds.length} entr${selectedIds.length > 1 ? 'ies' : 'y'}?`,
            message: 'This action cannot be undone and will permanently remove the selected entries.',
            confirmText: 'Delete',
            onConfirm: async () => {
                const success = await deleteMultipleJournalEntries(selectedIds);
                if (success) {
                    exitSelectionMode();
                }
            },
        });
    };

    const handleItemClick = useCallback((entry: JournalEntry) => {
        if (isLongPress.current) {
            isLongPress.current = false;
            return;
        }

        if (isSelectionMode) {
            setSelectedIds(prev => {
                const newIds = prev.includes(entry.id)
                    ? prev.filter(id => id !== entry.id)
                    : [...prev, entry.id];
                
                if (newIds.length === 0) {
                    setIsSelectionMode(false);
                }
                
                return newIds;
            });
        } else {
            navigateTo('journalView', { entry });
        }
    }, [isSelectionMode, navigateTo]);

    const handlePointerDown = useCallback((entryId: string) => {
        isLongPress.current = false;
        longPressTimerRef.current = window.setTimeout(() => {
            isLongPress.current = true;
            if (!isSelectionMode) {
                setIsSelectionMode(true);
            }
            setSelectedIds(prev => (prev.includes(entryId) ? prev : [...prev, entryId]));
        }, 500);
    }, [isSelectionMode]);

    const handlePointerUpOrLeave = useCallback(() => {
        clearTimeout(longPressTimerRef.current);
    }, []);

    const handleToggleCalendar = () => {
        vibrate();
        playUISound('tap');
        setShowCalendar(s => !s);
    };

    const handleNewEntry = () => {
        vibrate();
        playUISound('tap');
        navigateTo('journalEntry');
    };

    const headerProps = isSelectionMode ? {
        leftAction: (
            <motion.button onClick={exitSelectionMode} className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                <X size={24} />
            </motion.button>
        ),
        title: `${selectedIds.length} selected`,
        rightAction: (
            <motion.button onClick={handleDeleteSelected} disabled={selectedIds.length === 0} className="p-2 rounded-full hover:bg-red-500/10 text-red-500 disabled:opacity-50">
                <Trash2 size={20} />
            </motion.button>
        )
    } : {
        title: "Journal",
        leftAction: (
            <motion.button 
                onClick={() => setSortBy(prev => prev === 'date' ? 'subject' : 'date')}
                className={`p-2 rounded-full transition-colors ${sortBy === 'subject' ? 'bg-light-primary/20 dark:bg-dark-primary/20 text-light-primary dark:text-dark-primary' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                whileTap={{ scale: 0.9 }}
            >
                <Filter size={20} />
            </motion.button>
        ),
        rightAction: (
            <motion.button 
                onClick={handleToggleCalendar}
                className={`p-2 rounded-full transition-colors ${showCalendar ? 'bg-light-primary/20 dark:bg-dark-primary/20 text-light-primary dark:text-dark-primary' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                whileTap={{ scale: 0.9 }}
            >
                <Calendar size={20} />
            </motion.button>
        )
    };

    const calendarView = (
        <div className="p-2 bg-light-glass/80 dark:bg-dark-glass/80 backdrop-blur-md rounded-2xl border border-white/10 my-2">
            <div className="flex items-center justify-between px-2 mb-2">
                <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ChevronLeft size={20} /></button>
                <h3 className="font-semibold text-center w-32">
                    {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ChevronRight size={20} /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-light-text-secondary dark:text-dark-text-secondary mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 place-items-center">
                {calendarDays.map((day, index) => {
                    if (!day) return <div key={`empty-${index}`}></div>;
                    const isToday = day.toDateString() === today.toDateString();
                    const hasEntry = entryDates.has(day.toDateString());
                    const isSelected = selectedDate ? day.toDateString() === selectedDate.toDateString() : false;
                    return (
                        <button
                            key={day.toISOString()}
                            onClick={() => handleDateClick(day)}
                            className={`relative w-9 h-9 flex items-center justify-center rounded-full transition-colors text-sm ${
                                isSelected ? 'bg-light-primary dark:bg-dark-primary text-white font-semibold' : isToday ? 'bg-black/5 dark:bg-white/5' : 'hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                        >
                            <span>{day.getDate()}</span>
                            {hasEntry && !isSelected && <div className="absolute bottom-1.5 w-1 h-1 bg-light-primary dark:bg-dark-primary rounded-full"></div>}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="w-full h-full flex flex-col">
            <Header {...headerProps} />
            <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 flex-shrink-0">
                <AnimatePresence>
                    {showCalendar && !isSelectionMode && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                            className="overflow-hidden"
                        >
                           {calendarView}
                        </motion.div>
                    )}
                </AnimatePresence>
                <div className="pt-2 pb-2">
                    <SearchBar
                        placeholder="Search content or connections..."
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                    />
                </div>
                 {selectedDate && (
                    <div className="pt-1 pb-1">
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-center"
                        >
                            <div className="flex items-center gap-2 px-3 py-1 bg-light-glass dark:bg-dark-glass rounded-full border border-white/10 text-xs">
                                <span>
                                    Showing entries for {selectedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                                </span>
                                <button onClick={() => setSelectedDate(null)} className="p-0.5 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20">
                                    <X size={12} />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
            <OverscrollContainer className="flex-grow w-full overflow-y-auto">
                <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl mx-auto">
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
                                <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                                    {selectedDate ? 'No entries for this day' : 'No entries found'}
                                </h2>
                                <p>
                                    {selectedDate ? 'Tap the date again to clear.' : 'Try a different search term.'}
                                </p>
                            </motion.div>
                        ) : (
                            <div className="pt-2 pb-28 px-4">
                            {Object.keys(groupedEntries).map((date) => (
                                <div key={date} className="mb-6">
                                    <h2 className="font-medium text-xs uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary mb-2 sticky top-0 bg-light-bg/80 dark:bg-dark-bg/80 backdrop-blur-md py-1.5 text-center">{date}</h2>
                                    <div className="space-y-3">
                                    {groupedEntries[date].map(entry => (
                                        <JournalListItem
                                            key={entry.id}
                                            entry={entry}
                                            isSelected={selectedIds.includes(entry.id)}
                                            isSelectionMode={isSelectionMode}
                                            onClick={handleItemClick}
                                            onPointerDown={handlePointerDown}
                                            onPointerUpOrLeave={handlePointerUpOrLeave}
                                        />
                                    ))}
                                    </div>
                                </div>
                            ))}
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </OverscrollContainer>
             <AnimatePresence>
             {!isSelectionMode && (
                <motion.button
                    onClick={handleNewEntry}
                    className="absolute bottom-28 right-6 w-16 h-16 bg-light-primary dark:bg-dark-primary text-white rounded-full flex items-center justify-center shadow-lg z-20"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 600, damping: 30 }}
                    aria-label="New journal entry"
                    initial={{ scale: 0, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0, y: 50 }}
                >
                    <Plus size={32} />
                </motion.button>
             )}
            </AnimatePresence>
            <style>{`
                html.dark .dark\\:bg-dark-primary {
                    background-color: hsl(var(--accent-dark));
                }
                .bg-light-primary {
                    background-color: hsl(var(--accent-light));
                }
                .journal-item-selected {
                    background-color: hsla(var(--accent-light), 0.2);
                }
                html.dark .journal-item-selected {
                    background-color: hsla(var(--accent-dark), 0.2);
                }
                .border-light-primary {
                     border-color: hsl(var(--accent-light));
                }
                html.dark .dark\\:border-dark-primary {
                    border-color: hsl(var(--accent-dark));
                }
                .text-light-primary {
                     color: hsl(var(--accent-light));
                }
                html.dark .dark\\:text-dark-primary {
                    color: hsl(var(--accent-dark));
                }
                 .bg-light-primary\\/20 {
                    background-color: hsla(var(--accent-light), 0.2);
                }
                 html.dark .dark\\:bg-dark-primary\\/20 {
                    background-color: hsla(var(--accent-dark), 0.2);
                }
            `}</style>
        </div>
    );
};

export default JournalPage;
