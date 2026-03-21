import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../App';
import { TrendingUp } from 'lucide-react';

const FocusAnalyticsWidget: React.FC = () => {
    const { focusHistory, settings } = useAppContext();

    const weeklyStats = useMemo(() => {
        const today = new Date();
        const days = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            d.setHours(0, 0, 0, 0);
            return {
                date: d,
                label: d.toLocaleDateString('en-US', { weekday: 'short' })[0],
                minutes: 0,
            };
        }).reverse();

        focusHistory.forEach(session => {
            const sessionDate = new Date(session.date);
            sessionDate.setHours(0, 0, 0, 0);
            const dayIndex = days.findIndex(d => d.date.getTime() === sessionDate.getTime());
            if (dayIndex > -1) {
                days[dayIndex].minutes += session.duration / 60;
            }
        });
        
        days.forEach(d => { d.minutes = Math.round(d.minutes); });

        const totalMinutes = days.reduce((sum, day) => sum + day.minutes, 0);
        const targetMinutes = (settings.dailyTargetHours || 4) * 60;
        const maxMinutes = Math.max(...days.map(d => d.minutes), targetMinutes, 1); // Avoid division by zero

        return { days, totalMinutes, maxMinutes, targetMinutes };
    }, [focusHistory, settings.dailyTargetHours]);

    return (
        <div className="w-full h-full p-6 flex flex-col justify-between bg-light-card dark:bg-dark-card text-light-card-foreground dark:text-dark-card-foreground">
            <div>
                <h3 className="font-semibold text-left text-base flex items-center gap-2">
                    <TrendingUp size={16} /> Weekly Focus
                </h3>
                <p className="text-left text-xs text-light-muted-foreground dark:text-dark-muted-foreground">Your activity for the last 7 days</p>
            </div>
            
            <div className="flex-grow flex flex-col justify-end my-4 relative">
                 {/* Target Line */}
                 <div className="absolute w-full border-t border-dashed border-light-accent dark:border-dark-accent opacity-50 z-0" style={{ bottom: `calc(${(weeklyStats.targetMinutes / weeklyStats.maxMinutes) * 100}% + 20px)` }}>
                 </div>
                 <div className="w-full h-full flex justify-around items-end gap-2 px-2 z-10 pb-[20px]">
                    {weeklyStats.days.map((day, index) => {
                        const height = (day.minutes / weeklyStats.maxMinutes) * 100;
                        const isTargetMet = day.minutes >= weeklyStats.targetMinutes;
                        return (
                            <div key={index} className="flex flex-col items-center flex-grow h-full justify-end text-center relative">
                                <motion.div
                                    className={`w-full rounded-t-sm ${isTargetMet ? 'bg-green-500' : 'bg-light-primary/70 dark:bg-dark-primary/70'}`}
                                    initial={{ height: '0%' }}
                                    animate={{ height: `${height}%` }}
                                    transition={{ type: 'spring', stiffness: 200, damping: 20, delay: index * 0.05 }}
                                />
                                <span className="text-xs absolute -bottom-[20px] text-light-muted-foreground dark:text-dark-muted-foreground">{day.label}</span>
                            </div>
                        );
                    })}
                 </div>
            </div>
            
            <div className="text-center">
                <p className="text-sm text-light-muted-foreground dark:text-dark-muted-foreground">Total this week</p>
                <p className="text-2xl font-bold">{weeklyStats.totalMinutes} min</p>
            </div>
        </div>
    );
};

export default FocusAnalyticsWidget;
