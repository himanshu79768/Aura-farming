import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Award, CalendarDays, PieChart as PieChartIcon, Clock, Coffee, Sun, Moon, Sunrise, Sunset, Timer } from 'lucide-react';
import { useAppContext } from '../App';
import Header from './Header';
import { ACCENT_COLORS } from '../constants';
import OverscrollContainer from './OverscrollContainer';

const getDayKey = (date: Date) => date.toISOString().split('T')[0];

type FilterRange = '7d' | '30d' | 'all';

const ChartCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className }) => (
    <motion.div
        className={`p-4 bg-light-glass dark:bg-dark-glass rounded-xl border border-white/10 ${className}`}
        variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 }
        }}
    >
        <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
            <div className="p-1.5 bg-light-accent/10 dark:bg-dark-accent/10 text-light-accent dark:text-dark-accent rounded-lg">{icon}</div>
            {title}
        </h3>
        {children}
    </motion.div>
);

const PieChart: React.FC<{ data: { label: string; value: number }[]; colors: string[]; hole?: number; }> = ({ data, colors, hole = 0 }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return <div className="flex items-center justify-center h-40 text-sm text-light-text-secondary dark:text-dark-text-secondary">No data for this period</div>;

    let cumulative = 0;
    const slices = data.map((item, index) => {
        if (item.value === 0) return null;
        const percentage = item.value / total;
        const startAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
        const endAngle = ((cumulative + item.value) / total) * 2 * Math.PI - Math.PI / 2;
        cumulative += item.value;

        const largeArcFlag = percentage > 0.5 ? 1 : 0;
        const r = 50;
        const rHole = r * (hole / 100);

        const x1 = 50 + r * Math.cos(startAngle);
        const y1 = 50 + r * Math.sin(startAngle);
        const x2 = 50 + r * Math.cos(endAngle);
        const y2 = 50 + r * Math.sin(endAngle);

        let d = `M ${50 + rHole * Math.cos(startAngle)} ${50 + rHole * Math.sin(startAngle)} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${50 + rHole * Math.cos(endAngle)} ${50 + rHole * Math.sin(endAngle)}`;

        if (hole > 0) {
            d += ` A ${rHole} ${rHole} 0 ${largeArcFlag} 0 ${50 + rHole * Math.cos(startAngle)} ${50 + rHole * Math.sin(startAngle)}`;
        }
        
        d += ' Z';
        
        return <motion.path key={index} d={d} fill={colors[index % colors.length]} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, ease: 'easeInOut', delay: index * 0.1 }} />;
    });

    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <div className="w-40 h-40">
                <svg viewBox="0 0 100 100">{slices}</svg>
            </div>
            <div className="flex flex-col gap-2 text-xs">
                {data.map((item, index) => (
                    item.value > 0 && <div key={index} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors[index % colors.length] }}></div>
                        <span>{item.label} ({Math.round((item.value / total) * 100)}%)</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Added an interface for analytics data to provide strong typing for the `useMemo` hook's return value.
interface AnalyticsData {
    totalSeconds: number;
    longestSession: number;
    mostProductiveDay: { date: string; minutes: number; };
    timeOfDayData: Record<string, number>;
    dayOfWeekData: Record<string, number>;
    sessionLengthData: Record<string, number>;
    dailyTrendData: { date: string; minutes: number; }[];
}

const FocusAnalyticsPage: React.FC = () => {
    const { focusHistory, navigateBack, focusSearchQuery, settings } = useAppContext();
    const [filter, setFilter] = useState<FilterRange>('7d');

    const chartColors = useMemo(() => {
        const isDark = settings.theme === 'dark' || (settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        const colorKey = settings.accentColor || 'blue';
        const accentHsl = ACCENT_COLORS[colorKey][isDark ? 'dark' : 'light'];
        // The HSL string components must be parsed to numbers before arithmetic operations.
        // FIX: Destructure with default values to ensure h, s, and l are always numbers, preventing a TypeScript error.
        const [h = 0, s = 0, l = 0] = accentHsl.split(' ').map(v => parseFloat(v));
        return [
            `hsl(${h}, ${s}%, ${l}%)`,
            `hsl(${h}, ${s}%, ${l - 10}%)`,
            `hsl(${h}, ${s}%, ${l + 10}%)`,
            `hsl(${h - 20}, ${s}%, ${l}%)`,
            `hsl(${h}, ${s}%, ${l - 20}%)`,
            `hsl(${h}, ${s}%, ${l + 20}%)`,
            `hsl(${h + 30}, ${s}%, ${l}%)`,
        ];
    }, [settings.theme, settings.accentColor]);

    const filteredHistory = useMemo(() => {
        const searchFilteredHistory = focusSearchQuery.trim()
            ? focusHistory.filter(session => session.name?.toLowerCase().includes(focusSearchQuery.toLowerCase()))
            : focusHistory;

        if (filter === 'all') return searchFilteredHistory;

        const now = new Date();
        const daysToSubtract = filter === '7d' ? 7 : 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(now.getDate() - daysToSubtract);
        cutoffDate.setHours(0, 0, 0, 0);

        return searchFilteredHistory.filter(session => new Date(session.date) >= cutoffDate);
    }, [focusHistory, filter, focusSearchQuery]);

    // Explicitly set return type for useMemo to help TypeScript with type inference.
    const analyticsData = useMemo<AnalyticsData | null>(() => {
        if (filteredHistory.length === 0) return null;
        
        // Key Metrics
        const totalSeconds = filteredHistory.reduce((acc, s) => acc + s.duration, 0);
        const longestSession = Math.round(Math.max(...filteredHistory.map(s => s.duration)) / 60);

        // Most Productive Day
        const dailyTotals = filteredHistory.reduce((acc, session) => {
            const day = getDayKey(new Date(session.date));
            acc[day] = (acc[day] || 0) + session.duration;
            return acc;
        }, {} as Record<string, number>);

        let mostProductiveDay = { date: '', minutes: 0 };
        if (Object.keys(dailyTotals).length > 0) {
            const [date, duration] = Object.entries(dailyTotals).reduce((max, current) => current[1] > max[1] ? current : max);
            mostProductiveDay = { date, minutes: Math.round(duration / 60) };
        }

        // Time of Day Data (Donut Chart)
        const timeOfDayData: Record<string, number> = { 'Morning': 0, 'Afternoon': 0, 'Evening': 0, 'Night': 0 };
        filteredHistory.forEach(s => {
            const hour = new Date(s.date).getHours();
            if (hour >= 5 && hour < 12) timeOfDayData['Morning'] += s.duration;
            else if (hour >= 12 && hour < 17) timeOfDayData['Afternoon'] += s.duration;
            else if (hour >= 17 && hour < 21) timeOfDayData['Evening'] += s.duration;
            else timeOfDayData['Night'] += s.duration;
        });

        // Day of Week Data (Pie Chart)
        const dayOfWeekData: Record<string, number> = { 'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0 };
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        filteredHistory.forEach(s => {
            const dayIndex = new Date(s.date).getDay();
            dayOfWeekData[days[dayIndex] as keyof typeof dayOfWeekData] += s.duration;
        });
        
        // Session Length Data (Bar Chart)
        const sessionLengthData: Record<string, number> = { '0-15m': 0, '15-30m': 0, '30-45m': 0, '45-60m': 0, '60+m': 0 };
        filteredHistory.forEach(s => {
            const mins = s.duration / 60;
            if (mins <= 15) sessionLengthData['0-15m']++;
            else if (mins <= 30) sessionLengthData['15-30m']++;
            else if (mins <= 45) sessionLengthData['30-45m']++;
            else if (mins <= 60) sessionLengthData['45-60m']++;
            else sessionLengthData['60+m']++;
        });

        // Daily Trend (Line Chart)
        const dayDiff = Math.floor((new Date().getTime() - new Date(filteredHistory[filteredHistory.length - 1].date).getTime()) / (1000 * 60 * 60 * 24));
        const daysToAnalyze: number = filter === 'all' ? Math.max(7, isNaN(dayDiff) ? 7 : dayDiff) : (filter === '7d' ? 7 : 30);
        const trendDataByDate: Record<string, number> = {};
        for (let i = daysToAnalyze - 1; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            trendDataByDate[getDayKey(d)] = 0;
        }
        filteredHistory.forEach(s => {
            const key = getDayKey(new Date(s.date));
            if (trendDataByDate[key] !== undefined) trendDataByDate[key] += s.duration / 60;
        });
        const dailyTrendData = Object.entries(trendDataByDate).map(([date, minutes]) => ({ date, minutes: Math.round(minutes) }));

        return {
            totalSeconds,
            longestSession,
            mostProductiveDay,
            timeOfDayData,
            dayOfWeekData,
            sessionLengthData,
            dailyTrendData,
        };
    }, [filteredHistory, filter]);

    return (
        <div className="w-full h-full flex flex-col bg-light-bg dark:bg-dark-bg">
            <Header title="Focus Analytics" showBackButton onBack={navigateBack} />
            <OverscrollContainer className="flex-grow w-full overflow-y-auto">
                <div className="w-full max-w-md md:max-w-4xl mx-auto p-4 pt-4 pb-24">
                    <div className="flex justify-center mb-6">
                        <div className="flex items-center bg-light-glass dark:bg-dark-glass p-1 rounded-full border border-white/10">
                            {(['7d', '30d', 'all'] as FilterRange[]).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-1.5 text-sm rounded-full transition-colors ${filter === f ? 'bg-light-bg-secondary dark:bg-dark-bg-secondary' : 'text-light-text-secondary dark:text-dark-text-secondary'}`}
                                >
                                    {f === 'all' ? 'All Time' : `Last ${f.replace('d', '')} Days`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {!analyticsData ? (
                        <div className="text-center text-light-text-secondary dark:text-dark-text-secondary h-full flex flex-col justify-center items-center px-4 -mt-16">
                            <PieChartIcon className="w-12 h-12 mb-4" />
                            <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">No focus data available.</h2>
                            <p>Complete some sessions to see your analytics.</p>
                        </div>
                    ) : (
                        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <ChartCard title="Total Sessions" icon={<Timer size={16} />} className="md:col-span-1 h-36">
                                <p className="text-4xl font-bold">{filteredHistory.length}</p>
                            </ChartCard>
                            <ChartCard title="Total Time" icon={<Clock size={16} />} className="md:col-span-1 h-36">
                                <p className="text-4xl font-bold">{Math.floor(analyticsData.totalSeconds / 3600)}<span className="text-xl">h</span> {Math.floor((analyticsData.totalSeconds % 3600) / 60)}<span className="text-xl">m</span></p>
                            </ChartCard>
                            <ChartCard title="Longest Session" icon={<Award size={16} />} className="md:col-span-1 h-36">
                                <p className="text-4xl font-bold">{analyticsData.longestSession}<span className="text-xl">m</span></p>
                            </ChartCard>
                             <ChartCard title="Peak Day" icon={<CalendarDays size={16} />} className="md:col-span-1 h-36">
                                <p className="text-3xl font-bold">{analyticsData.mostProductiveDay.minutes}<span className="text-xl">m</span></p>
                                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">{new Date(analyticsData.mostProductiveDay.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                            </ChartCard>

                            <ChartCard title="Focus by Time of Day" icon={<Coffee size={16} />} className="md:col-span-2">
                                <PieChart
                                    data={[
                                        { label: 'Morning', value: analyticsData.timeOfDayData['Morning'] },
                                        { label: 'Afternoon', value: analyticsData.timeOfDayData['Afternoon'] },
                                        { label: 'Evening', value: analyticsData.timeOfDayData['Evening'] },
                                        { label: 'Night', value: analyticsData.timeOfDayData['Night'] },
                                    ]}
                                    colors={chartColors}
                                    hole={60}
                                />
                            </ChartCard>

                            <ChartCard title="Focus by Day" icon={<PieChartIcon size={16} />} className="md:col-span-2">
                                <PieChart data={Object.entries(analyticsData.dayOfWeekData).map(([label, value]) => ({ label, value }))} colors={chartColors} />
                            </ChartCard>
                            
                             <ChartCard title="Session Length" icon={<TrendingUp size={16} />} className="md:col-span-4">
                                <div className="space-y-3 text-xs">
                                    {/* FIX: Explicitly type map arguments to ensure correct type inference for `count`. */}
                                    {Object.entries(analyticsData.sessionLengthData).map(([label, count]: [string, number]) => (
                                        <div key={label} className="flex items-center gap-2">
                                            <span className="w-16 text-right shrink-0 text-light-text-secondary dark:text-dark-text-secondary">{label}</span>
                                            <div className="w-full bg-black/5 dark:bg-white/5 rounded-full h-4">
                                                <motion.div
                                                    className="h-4 rounded-full bg-light-primary dark:bg-dark-primary flex items-center justify-end pr-2 text-white font-bold"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(count / Math.max(1, ...Object.values(analyticsData.sessionLengthData).map(Number))) * 100}%` }}
                                                    transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                                                >
                                                   {count > 0 && <span>{count}</span>}
                                                </motion.div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ChartCard>
                        </motion.div>
                    )}
                </div>
            </OverscrollContainer>
        </div>
    );
};

export default FocusAnalyticsPage;
