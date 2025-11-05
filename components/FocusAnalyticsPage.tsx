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
        // FIX: The HSL string components must be parsed to numbers before arithmetic operations.
        const hslValues = accentHsl.split(' ').map(v => parseFloat(v));
        const h = hslValues[0] || 0;
        const s = hslValues[1] || 0;
        const l = hslValues[2] || 0;
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
        const longestSession = Math.round(Math.max(...filteredHistory.map(s => s.duration), 0) / 60);

        // Most Productive Day & Daily Trend
        const dailyMinutes = filteredHistory.reduce<Record<string, number>>((acc, s) => {
            const day = getDayKey(new Date(s.date));
            acc[day] = (acc[day] || 0) + s.duration / 60;
            return acc;
        }, {});
        
        // FIX: Explicitly type array destructuring to resolve type inference issue where 'minutes' was 'unknown'.
        const mostProductiveDay = Object.entries(dailyMinutes).reduce(
            (max, [date, minutes]: [string, number]) => (minutes > max.minutes ? { date, minutes } : max),
            { date: '', minutes: 0 }
        );
        mostProductiveDay.minutes = Math.round(mostProductiveDay.minutes);
        
        // FIX: Explicitly type array destructuring to resolve type inference issue where 'minutes' was 'unknown'.
        const dailyTrendData = Object.entries(dailyMinutes).map(([date, minutes]: [string, number]) => ({ date, minutes: Math.round(minutes) })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Time of Day, Day of Week, Session Length
        const timeOfDayData: Record<string, number> = { 'Morning (6-12)': 0, 'Afternoon (12-6)': 0, 'Evening (6-12)': 0, 'Night (12-6)': 0 };
        const dayOfWeekData: Record<string, number> = { 'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0 };
        const sessionLengthData: Record<string, number> = { '0-15m': 0, '15-30m': 0, '30-60m': 0, '60m+': 0 };

        filteredHistory.forEach(session => {
            const date = new Date(session.date);
            const hour = date.getHours();
            const day = date.getDay();
            const minutes = session.duration / 60;

            if (hour >= 6 && hour < 12) timeOfDayData['Morning (6-12)']++;
            else if (hour >= 12 && hour < 18) timeOfDayData['Afternoon (12-6)']++;
            else if (hour >= 18 && hour < 24) timeOfDayData['Evening (6-12)']++;
            else timeOfDayData['Night (12-6)']++;
            
            dayOfWeekData[Object.keys(dayOfWeekData)[day]]++;

            if (minutes <= 15) sessionLengthData['0-15m']++;
            else if (minutes <= 30) sessionLengthData['15-30m']++;
            else if (minutes <= 60) sessionLengthData['30-60m']++;
            else sessionLengthData['60m+']++;
        });

        return { totalSeconds, longestSession, mostProductiveDay, timeOfDayData, dayOfWeekData, sessionLengthData, dailyTrendData };
    }, [filteredHistory]);

    return (
        <div className="w-full h-full flex flex-col">
            <Header title="Analytics" showBackButton onBack={navigateBack} />
            <OverscrollContainer className="flex-grow w-full overflow-y-auto">
                <div className="w-full max-w-md md:max-w-4xl mx-auto p-4">
                    <div className="pt-8 pb-24">
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
                        </div>

                        {analyticsData ? (
                            <motion.div 
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                                initial="hidden"
                                animate="visible"
                                variants={{
                                    visible: { transition: { staggerChildren: 0.1 } }
                                }}
                            >
                                <ChartCard title="Total Time" icon={<Clock size={16}/>}>
                                    <p className="text-4xl font-bold">{Math.round(analyticsData.totalSeconds / 60)} <span className="text-xl font-medium text-light-text-secondary dark:text-dark-text-secondary">min</span></p>
                                </ChartCard>
                                <ChartCard title="Longest Session" icon={<Award size={16}/>}>
                                    <p className="text-4xl font-bold">{analyticsData.longestSession} <span className="text-xl font-medium text-light-text-secondary dark:text-dark-text-secondary">min</span></p>
                                </ChartCard>
                                <ChartCard title="Most Productive Day" icon={<TrendingUp size={16}/>}>
                                    <p className="text-2xl font-bold">{analyticsData.mostProductiveDay.minutes} <span className="text-base font-medium text-light-text-secondary dark:text-dark-text-secondary">min</span></p>
                                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">{new Date(analyticsData.mostProductiveDay.date).toLocaleDateString(undefined, { weekday: 'long' })}</p>
                                </ChartCard>
                                
                                <ChartCard title="Sessions by Time of Day" icon={<PieChartIcon size={16}/>} className="md:col-span-1 lg:col-span-1">
                                    <PieChart 
                                        data={Object.entries(analyticsData.timeOfDayData).map(([label, value]) => ({ label, value }))} 
                                        colors={chartColors}
                                        hole={40}
                                    />
                                </ChartCard>
                                 <ChartCard title="Sessions by Day" icon={<CalendarDays size={16}/>} className="md:col-span-2 lg:col-span-2">
                                     <div className="flex justify-around items-end h-40 gap-1 text-xs text-center text-light-text-secondary dark:text-dark-text-secondary">
                                        {(() => {
                                            // FIX: Cast Object.values to number[] to satisfy Math.max, and calculate maxCount once outside the loop for efficiency.
                                            const maxCount = Math.max(...(Object.values(analyticsData.dayOfWeekData) as number[]));
                                            // FIX: Explicitly type map parameters to ensure `count` is a number, resolving arithmetic operation error.
                                            return Object.entries(analyticsData.dayOfWeekData).map(([day, count]: [string, number]) => {
                                                const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                                                return (
                                                    <div key={day} className="flex flex-col items-center flex-grow h-full justify-end">
                                                        <div className="font-semibold text-light-text dark:text-dark-text">{count}</div>
                                                        <motion.div
                                                            className="w-full rounded-t-sm"
                                                            style={{ backgroundColor: chartColors[0], height: `${height}%` }}
                                                            initial={{ scaleY: 0, originY: 1 }}
                                                            animate={{ scaleY: 1 }}
                                                            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                                                        />
                                                        <div className="mt-1">{day}</div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                     </div>
                                 </ChartCard>
                                 <ChartCard title="Session Length Distribution" icon={<Timer size={16}/>} className="md:col-span-2 lg:col-span-3">
                                     <PieChart 
                                        data={Object.entries(analyticsData.sessionLengthData).map(([label, value]) => ({ label, value }))} 
                                        colors={chartColors}
                                    />
                                 </ChartCard>
                            </motion.div>
                        ) : (
                            <motion.div 
                                className="text-center text-light-text-secondary dark:text-dark-text-secondary py-24"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            >
                                <p>No focus data available for this period.</p>
                            </motion.div>
                        )}
                    </div>
                </div>
            </OverscrollContainer>
        </div>
    );
};

// FIX: Added default export.
export default FocusAnalyticsPage;
