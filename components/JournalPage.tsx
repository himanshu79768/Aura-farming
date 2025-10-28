import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, ChevronLeft, ChevronRight, X, Link as LinkIcon } from 'lucide-react';
import { useAppContext } from '../App';
import { JournalEntry } from '../types';
import Header from './Header';
import SearchBar from './SearchBar';

const JournalPage: React.FC = () => {
    const { journalEntries, navigateTo, focusHistory } = useAppContext();
    const [searchQuery, setSearchQuery] = useState('');
    const [showCalendar, setShowCalendar] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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
        
        // Create a map of session IDs to session names for efficient lookup
        const sessionNameMap = new Map<string, string>();
        focusHistory.forEach(session => {
            if (session.name) {
                sessionNameMap.set(session.id, session.name.toLowerCase());
            }
        });

        return entries.filter(entry => {
            // 1. Check title and content
            if (entry.title?.toLowerCase().includes(lowerCaseQuery) || entry.content.toLowerCase().includes(lowerCaseQuery)) {
                return true;
            }

            // 2. Check linked session names
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
                                isSelected ? 'bg-blue-500 text-white font-semibold' : isToday ? 'bg-black/5 dark:bg-white/5' : 'hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                        >
                            <span>{day.getDate()}</span>
                            {hasEntry && !isSelected && <div className="absolute bottom-1.5 w-1 h-1 bg-blue-500 rounded-full"></div>}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="w-full h-full flex flex-col">
            <Header 
                title="Journal"
                rightAction={
                    <motion.button 
                        onClick={() => setShowCalendar(s => !s)}
                        className={`p-2 rounded-full transition-colors ${showCalendar ? 'bg-blue-500/20 text-blue-500' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                        whileTap={{ scale: 0.9 }}
                    >
                        <Calendar size={20} />
                    </motion.button>
                }
            />
            <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 flex-shrink-0">
                <AnimatePresence>
                    {showCalendar && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}
                            className="overflow-hidden"
                        >
                           {calendarView}
                        </motion.div>
                    )}
                </AnimatePresence>
                <div className="pt-2 pb-2">
                    <SearchBar
                        placeholder="Search content or linked sessions..."
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
            <div className="flex-grow w-full max-w-md md:max-w-2xl lg:max-w-4xl mx-auto overflow-y-auto">
                <AnimatePresence>
                    {journalEntries.length === 0 ? (
                         <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center text-light-text-secondary dark:text-dark-text-secondary h-full flex flex-col justify-center items-center px-4 pb-28 md:pb-8"
                        >
                            <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">Your space is clear.</h2>
                            <p>Tap the '+' button to capture your first thought.</p>
                        </motion.div>
                    ) : filteredEntries.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center text-light-text-secondary dark:text-dark-text-secondary h-full flex flex-col justify-center items-center px-4 pb-28 md:pb-8"
                        >
                             <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                                {selectedDate ? 'No entries for this day' : 'No entries found'}
                            </h2>
                            <p>
                                {selectedDate ? 'Tap the date again to clear.' : 'Try a different search term.'}
                            </p>
                        </motion.div>
                    ) : (
                        <div className="pt-2 pb-28 md:pb-8 px-4">
                        {/* Fix: Use Object.keys to iterate over grouped entries, ensuring proper type inference. */}
                        {Object.keys(groupedEntries).map((date) => (
                            <div key={date} className="mb-6">
                                <h2 className="font-medium text-xs uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary mb-2 sticky top-0 bg-light-bg/80 dark:bg-dark-bg/80 backdrop-blur-md py-1.5 text-center">{date}</h2>
                                <div className="space-y-3">
                                {groupedEntries[date].map(entry => (
                                    <motion.button 
                                        key={entry.id}
                                        onClick={() => navigateTo('journalView', { entry })}
                                        className="w-full text-left p-4 bg-light-glass dark:bg-dark-glass rounded-xl border border-white/10"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold truncate pr-2">{entry.title || 'Untitled Entry'}</p>
                                            {entry.linkedSessionIds && entry.linkedSessionIds.length > 0 && (
                                                <LinkIcon size={14} className="text-light-text-secondary dark:text-dark-text-secondary shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">
                                            {new Date(entry.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
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
                className="absolute bottom-28 md:bottom-8 right-6 w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg z-20"
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
