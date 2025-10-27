import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart2, TrendingUp } from 'lucide-react';
import { useAppContext } from '../App';
import Header from './Header';

// Helper function to format date for grouping (YYYY-MM-DD)
const getDayKey = (date: Date) => date.toISOString().split('T')[0];

type FilterRange = '7d' | '30d';

const FocusAnalyticsPage: React.FC = () => {
    const { focusHistory, navigateBack, focusSearchQuery } = useAppContext();
    const [filter, setFilter] = useState<FilterRange>('7d');

    const chartData = useMemo(() => {
        const searchFilteredHistory = focusSearchQuery.trim()
            ? focusHistory.filter(session => session.name?.toLowerCase().includes(focusSearchQuery.toLowerCase()))
            : focusHistory;

        if (!searchFilteredHistory || searchFilteredHistory.length === 0) return { labels: [], data: [] };
        
        const daysToAnalyze = filter === '7d' ? 7 : 30;
        const dataByDate: Record<string, number> = {};

        // Initialize last N days with 0 minutes
        for (let i = daysToAnalyze - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dataByDate[getDayKey(d)] = 0;
        }

        searchFilteredHistory.forEach(session => {
            const date = new Date(session.date);
            const key = getDayKey(date);
            if (dataByDate[key] !== undefined) {
                dataByDate[key] += session.duration / 60; // store in minutes
            }
        });

        const sortedEntries = Object.entries(dataByDate).sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime());

        const labels = sortedEntries.map(([date], index) => {
            const d = new Date(date);
            if (filter === '7d') {
                return d.toLocaleDateString(undefined, { weekday: 'short' });
            } else { // filter is '30d'
                // Show label for the first day, last day, and every 5th day to avoid clutter.
                if (index === 0 || index === sortedEntries.length - 1 || (index + 1) % 5 === 0) {
                     return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
                }
                return ''; // Return empty string for other labels
            }
        });

        return {
            labels,
            data: sortedEntries.map(([, minutes]) => Math.round(minutes)),
        };

    }, [focusHistory, filter, focusSearchQuery]);

    const maxMinutes = Math.max(...chartData.data, 30); // Ensure a minimum height for the chart

    const linePath = useMemo(() => {
        if (chartData.data.length < 2) return "";
        const width = 300; // SVG width
        const height = 150; // SVG height
        const points = chartData.data.map((minutes, index) => {
            const x = (index / (chartData.data.length - 1)) * width;
            const y = height - (minutes / maxMinutes) * height;
            return `${x},${y}`;
        });
        return `M ${points.join(' ')}`;
    }, [chartData.data, maxMinutes]);


    return (
        <div className="w-full h-full flex flex-col bg-light-bg dark:bg-dark-bg">
            <Header title="Focus Analytics" showBackButton onBack={navigateBack} />
            <div className="flex-grow w-full max-w-md mx-auto p-4 overflow-y-auto pt-4 pb-24">
                 {focusSearchQuery && (
                    <p className="text-center text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">
                        Showing results for: <span className="font-semibold text-light-text dark:text-dark-text">"{focusSearchQuery}"</span>
                    </p>
                )}
                 <div className="flex justify-center mb-6">
                    <div className="flex items-center bg-light-glass dark:bg-dark-glass p-1 rounded-full border border-white/10">
                        {(['7d', '30d'] as FilterRange[]).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 text-sm rounded-full transition-colors ${filter === f ? 'bg-light-bg-secondary dark:bg-dark-bg-secondary' : 'text-light-text-secondary dark:text-dark-text-secondary'}`}
                            >
                                {`Last ${f.replace('d', '')} days`}
                            </button>
                        ))}
                    </div>
                </div>

                {focusHistory.length === 0 ? (
                     <div className="text-center text-light-text-secondary dark:text-dark-text-secondary h-full flex flex-col justify-center items-center px-4 -mt-16">
                        <BarChart2 className="w-12 h-12 mb-4" />
                        <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">Not enough data.</h2>
                        <p>Complete some focus sessions to see your analytics.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div>
                            <h2 className="font-semibold px-1 mb-4 flex items-center gap-2"><BarChart2 size={16}/> Daily Summary</h2>
                            <div className="w-full h-64 p-4 bg-light-glass dark:bg-dark-glass rounded-xl border border-white/10 flex items-end justify-around gap-1">
                                {chartData.data.map((minutes, index) => (
                                    <div key={index} className="flex flex-col items-center h-full flex-grow relative pt-5">
                                        <motion.div
                                            className="w-full bg-blue-500 rounded-t-md"
                                            initial={{ height: 0 }}
                                            animate={{ height: `${(minutes / maxMinutes) * 100}%` }}
                                            transition={{ type: 'spring', stiffness: 100, damping: 15, delay: index * 0.02 }}
                                        >
                                            <AnimatePresence>
                                            {minutes > 0 && (
                                                <motion.span 
                                                    className="absolute -top-0 left-1/2 -translate-x-1/2 text-xs font-bold"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                >
                                                    {minutes}
                                                </motion.span>
                                            )}
                                            </AnimatePresence>
                                        </motion.div>
                                        <p className="text-xs mt-2 text-light-text-secondary dark:text-dark-text-secondary">{chartData.labels[index]}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                             <h2 className="font-semibold px-1 mb-4 flex items-center gap-2"><TrendingUp size={16}/> Focus Trend</h2>
                              <div className="w-full h-48 p-4 bg-light-glass dark:bg-dark-glass rounded-xl border border-white/10">
                                 <svg width="100%" height="100%" viewBox="0 0 300 150" preserveAspectRatio="none">
                                    <motion.path
                                        d={linePath}
                                        fill="none"
                                        stroke="url(#line-gradient)"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 1.5, ease: "easeInOut" }}
                                    />
                                    <defs>
                                        <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#818cf8" />
                                            <stop offset="100%" stopColor="#3b82f6" />
                                        </linearGradient>
                                    </defs>
                                 </svg>
                              </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FocusAnalyticsPage;