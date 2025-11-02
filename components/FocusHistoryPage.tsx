import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Timer, BarChart, Clock, Download, BookOpen } from 'lucide-react';
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
    onClick: () => void;
}

const SessionItem: React.FC<SessionItemProps> = React.memo(({ session, isLinked, onClick }) => {
    return (
        <motion.button
            onClick={onClick}
            className="w-full flex justify-between items-center p-4 bg-black/5 dark:bg-white/5 rounded-xl text-left"
            variants={{
                hidden: { opacity: 0, x: -20 },
                visible: { opacity: 1, x: 0 }
            }}
            whileTap={{ scale: 0.98 }}
            layout
        >
            <div>
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
            <div className="font-medium text-right">
                {Math.round(session.duration / 60)} min
            </div>
        </motion.button>
    );
});

const FocusHistoryPage: React.FC = () => {
    const { focusHistory, navigateBack, navigateTo, focusSearchQuery, setFocusSearchQuery, journalEntries } = useAppContext();
    const [filter, setFilter] = useState<FilterRange>('all');

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

    return (
        <div className="w-full h-full flex flex-col bg-light-bg dark:bg-dark-bg">
            <Header title="Focus History" showBackButton onBack={navigateBack} />
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
                                        onClick={() => navigateTo('linkedJournals', { session })}
                                    />
                                ))}
                            </motion.div>
                        </div>
                    )}
                </div>
            </OverscrollContainer>
        </div>
    );
};

export default FocusHistoryPage;