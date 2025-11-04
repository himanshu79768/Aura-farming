import React, { useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, BarChart, Clock, Download, BookOpen, X, Trash2, Check } from 'lucide-react';
import { useAppContext } from '../App';
import Header from './Header';
import SearchBar from './SearchBar';
import { FocusSession } from '../types';
import OverscrollContainer from './OverscrollContainer';

interface SummaryCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    onClick?: () => void;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, label, value, onClick }) => {
    const commonClasses = "p-4 bg-light-glass dark:bg-dark-glass rounded-xl border border-white/10 flex-grow text-center flex flex-col items-center justify-center h-full";
    const buttonClasses = "transition-transform duration-200 ease-in-out";

    const content = (
        <>
            <div className="p-2 bg-light-accent/10 dark:bg-dark-accent/10 text-light-accent dark:text-dark-accent rounded-lg mb-2">
                {icon}
            </div>
            <p className="text-xl font-semibold">{value}</p>
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">{label}</p>
        </>
    );

    return onClick ? (
        <motion.button
            onClick={onClick}
            className={`${commonClasses} ${buttonClasses}`}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
        >
            {content}
        </motion.button>
    ) : (
        <div className={commonClasses}>{content}</div>
    );
};

const formatTotalTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    let result = '';
    if (hours > 0) result += `${hours}h `;
    result += `${minutes}m`;
    return result || '0m';
};

type FilterRange = '7d' | '30d' | 'all';

interface SessionItemProps {
    session: FocusSession;
    isLinked: boolean;
    isSelected: boolean;
    isSelectionMode: boolean;
    onClick: () => void;
    onPointerDown: (id: string) => void;
    onPointerUpOrLeave: () => void;
}

const SessionItem: React.FC<SessionItemProps> = React.memo(({ session, isLinked, isSelected, isSelectionMode, onClick, onPointerDown, onPointerUpOrLeave }) => {
    return (
        <motion.div
            onClick={onClick}
            onPointerDown={() => onPointerDown(session.id)}
            onPointerUp={onPointerUpOrLeave}
            onPointerLeave={onPointerUpOrLeave}
            className={`w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200 ${isSelected ? 'bg-light-primary/20 dark:bg-dark-primary/20 border-light-primary/50 dark:border-dark-primary/50' : 'bg-black/5 dark:bg-white/5 border-transparent'} border`}
            variants={{
                hidden: { opacity: 0, x: -20 },
                visible: { opacity: 1, x: 0 }
            }}
            whileTap={{ scale: 0.98 }}
            layout
        >
            <AnimatePresence>
                {isSelectionMode && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="w-6 h-6 flex-shrink-0"
                    >
                        <div className={`w-full h-full rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-light-primary dark:bg-dark-primary border-transparent' : 'border-gray-500'}`}>
                            {isSelected && <Check size={16} className="text-white" />}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="flex-grow overflow-hidden">
                <p className="font-medium flex items-center gap-2">
                    <span>{session.name || 'Focus Session'}</span>
                    {isLinked && (
                        <BookOpen size={14} className="text-light-primary dark:text-dark-primary shrink-0" />
                    )}
                </p>
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, {new Date(session.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                </p>
            </div>
            <div className="font-medium text-right flex-shrink-0">
                {Math.round(session.duration / 60)} min
            </div>
        </motion.div>
    );
});


const FocusHistoryPage: React.FC = () => {
    const { 
        focusHistory, navigateBack, navigateTo, focusSearchQuery, setFocusSearchQuery, 
        journalEntries, showConfirmationModal, deleteMultipleFocusSessions, vibrate, playUISound 
    } = useAppContext();
    const [filter, setFilter] = useState<FilterRange>('all');
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    const longPressTimerRef = useRef<number>();
    const isLongPress = useRef(false);

    const linkedSessionIds = useMemo(() => {
        const ids = new Set<string>();
        journalEntries.forEach(entry => {
            entry.linkedSessionIds?.forEach(id => ids.add(id));
        });
        return ids;
    }, [journalEntries]);

    const filteredHistory = useMemo(() => {
        let dateFiltered = focusHistory;
        if (filter !== 'all') {
            const now = new Date();
            const daysToSubtract = filter === '7d' ? 7 : 30;
            const cutoffDate = new Date(new Date().setDate(now.getDate() - daysToSubtract));
            dateFiltered = focusHistory.filter(session => new Date(session.date) >= cutoffDate);
        }
        
        if (!focusSearchQuery.trim()) {
            return dateFiltered;
        }

        return dateFiltered.filter(session => 
            session.name?.toLowerCase().includes(focusSearchQuery.toLowerCase())
        );
    }, [focusHistory, filter, focusSearchQuery]);

    const stats = useMemo(() => {
        if (!filteredHistory || filteredHistory.length === 0) {
            return { totalSessions: 0, totalSeconds: 0, averageMinutes: 0 };
        }
        const totalSessions = filteredHistory.length;
        const totalSeconds = filteredHistory.reduce((acc, session) => acc + session.duration, 0);
        const averageSeconds = totalSeconds / totalSessions;
        const averageMinutes = Math.round(averageSeconds / 60);

        return { totalSessions, totalSeconds, averageMinutes };
    }, [filteredHistory]);

    const handleExport = () => {
        if (filteredHistory.length === 0) return;

        const headers = "ID,Date,Time,Name,Duration (seconds)\n";
        const csvContent = filteredHistory.map(s => {
            const date = new Date(s.date);
            const dateString = date.toLocaleDateString();
            const timeString = date.toLocaleTimeString();
            const name = s.name ? `"${s.name.replace(/"/g, '""')}"` : ''; // Handle quotes in name
            return `${s.id},${dateString},${timeString},${name},${s.duration}`;
        }).join("\n");
        
        const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `aura-focus-history-${filter}-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePointerDown = useCallback((sessionId: string) => {
        isLongPress.current = false;
        longPressTimerRef.current = window.setTimeout(() => {
            isLongPress.current = true;
            vibrate();
            playUISound('tap');
            if (!isSelectionMode) {
                setIsSelectionMode(true);
            }
            setSelectedIds(prev => (prev.includes(sessionId) ? prev : [...prev, sessionId]));
        }, 500); // 500ms for long press
    }, [isSelectionMode, vibrate, playUISound]);

    const handlePointerUpOrLeave = useCallback(() => {
        clearTimeout(longPressTimerRef.current);
    }, []);

    const handleItemClick = useCallback((session: FocusSession) => {
        if (isLongPress.current) {
            isLongPress.current = false;
            return;
        }

        if (isSelectionMode) {
            vibrate();
            playUISound('tap');
            setSelectedIds(prev => {
                const newIds = prev.includes(session.id)
                    ? prev.filter(id => id !== session.id)
                    : [...prev, session.id];
                
                if (newIds.length === 0) {
                    setIsSelectionMode(false);
                }
                
                return newIds;
            });
        } else {
            vibrate();
            playUISound('tap');
            navigateTo('linkedJournals', { session });
        }
    }, [isSelectionMode, navigateTo, vibrate, playUISound]);
    
    const exitSelectionMode = () => {
        setIsSelectionMode(false);
        setSelectedIds([]);
    };

    const handleDeleteSelected = () => {
        if (selectedIds.length === 0) return;
        showConfirmationModal({
            title: `Delete ${selectedIds.length} session${selectedIds.length > 1 ? 's' : ''}?`,
            message: 'This action cannot be undone and will permanently remove the selected sessions.',
            confirmText: 'Delete',
            onConfirm: async () => {
                const success = await deleteMultipleFocusSessions(selectedIds);
                if (success) {
                    exitSelectionMode();
                }
            },
        });
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
        title: "Focus History",
        showBackButton: true,
        onBack: navigateBack,
    };

    return (
        <div className="w-full h-full flex flex-col bg-light-bg dark:bg-dark-bg">
            <Header {...headerProps} />
            <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 pt-2 flex-shrink-0">
                <SearchBar
                    placeholder="Search sessions..."
                    searchQuery={focusSearchQuery}
                    setSearchQuery={setFocusSearchQuery}
                />
            </div>
            <OverscrollContainer className="flex-grow w-full overflow-y-auto">
                <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl mx-auto p-4">
                    {focusHistory.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center text-light-text-secondary dark:text-dark-text-secondary h-full flex flex-col justify-center items-center px-4 pb-24"
                        >
                            <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">No sessions yet.</h2>
                            <p>Complete a focus timer to see your history.</p>
                        </motion.div>
                    ) : (
                        <div className="pt-2 pb-24">
                            <div className="flex justify-between items-center mb-4 px-1">
                                <div className="flex items-center bg-light-glass dark:bg-dark-glass p-1 rounded-full border border-white/10">
                                    {(['7d', '30d', 'all'] as FilterRange[]).map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setFilter(f)}
                                            className={`px-3 py-1 text-sm rounded-full transition-colors ${filter === f ? 'bg-light-bg-secondary dark:bg-dark-bg-secondary' : 'text-light-text-secondary dark:text-dark-text-secondary'}`}
                                        >
                                            {f === 'all' ? 'All Time' : `Last ${f.replace('d', '')} days`}
                                        </button>
                                    ))}
                                </div>
                                <button onClick={handleExport} className="p-2.5 bg-light-glass dark:bg-dark-glass rounded-full border border-white/10" aria-label="Export history">
                                    <Download size={16} />
                                </button>
                            </div>
                            
                            <motion.div
                                className="grid grid-cols-3 gap-3 mb-8"
                                initial="hidden"
                                animate="visible"
                                variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
                            >
                                <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                                    <SummaryCard icon={<Timer size={20} />} label="Total Sessions" value={stats.totalSessions} />
                                </motion.div>
                                <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                                    <SummaryCard icon={<Clock size={20} />} label="Total Time" value={formatTotalTime(stats.totalSeconds)} />
                                </motion.div>
                                <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                                    <SummaryCard icon={<BarChart size={20} />} label="Avg Session" value={`${stats.averageMinutes} min`} onClick={() => navigateTo('focusAnalytics')} />
                                </motion.div>
                            </motion.div>

                            <h2 className="font-semibold px-1 mb-3">Sessions ({filteredHistory.length})</h2>
                            <motion.div
                                className="space-y-3"
                                initial="hidden"
                                animate="visible"
                                variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                            >
                                {filteredHistory.map(session => (
                                <SessionItem
                                        key={session.id}
                                        session={session}
                                        isLinked={linkedSessionIds.has(session.id)}
                                        isSelected={selectedIds.includes(session.id)}
                                        isSelectionMode={isSelectionMode}
                                        onClick={() => handleItemClick(session)}
                                        onPointerDown={handlePointerDown}
                                        onPointerUpOrLeave={handlePointerUpOrLeave}
                                    />
                                ))}
                            </motion.div>
                        </div>
                    )}
                </div>
            </OverscrollContainer>
             <style>{`
                .dark\\:bg-dark-primary { background-color: hsl(var(--accent-dark)); }
                .bg-light-primary { background-color: hsl(var(--accent-light)); }
                .dark\\:text-dark-primary { color: hsl(var(--accent-dark)); }
                .text-light-primary { color: hsl(var(--accent-light)); }
                .bg-light-primary\\/20 { background-color: hsla(var(--accent-light), 0.2); }
                .dark\\:bg-dark-primary\\/20 { background-color: hsla(var(--accent-dark), 0.2); }
                .border-light-primary\\/50 { border-color: hsla(var(--accent-light), 0.5); }
                .dark\\:border-dark-primary\\/50 { border-color: hsla(var(--accent-dark), 0.5); }
            `}</style>
        </div>
    );
};

export default FocusHistoryPage;