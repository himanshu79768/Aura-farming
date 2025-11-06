import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../App';
import { TrendingUp } from 'lucide-react';

const FocusAnalyticsWidget: React.FC = () => {
    const { focusHistory } = useAppContext();

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
        const maxMinutes = Math.max(...days.map(d => d.minutes), 1); // Avoid division by zero

        return { days, totalMinutes, maxMinutes };
    }, [focusHistory]);

    return (
        <div className="w-full h-full p-6 flex flex-col justify-between bg-light-card dark:bg-dark-card text-light-card-foreground dark:text-dark-card-foreground">
            <div>
                <h3 className="font-semibold text-left text-base flex items-center gap-2">
                    <TrendingUp size={16} /> Weekly Focus
                </h3>
                <p className="text-left text-xs text-light-muted-foreground dark:text-dark-muted-foreground">Your activity for the last 7 days</p>
            </div>
            
            <div className="flex-grow flex flex-col items-center justify-center my-4">
                 <div className="w-full h-full flex justify-around items-end gap-2 px-2">
                    {weeklyStats.days.map((day, index) => {
                        const height = (day.minutes / weeklyStats.maxMinutes) * 100;
                        return (
                            <div key={index} className="flex flex-col items-center flex-grow h-full justify-end text-center">
                                <motion.div
                                    className="w-full bg-light-primary/70 dark:bg-dark-primary/70 rounded-t-sm"
                                    initial={{ height: '0%' }}
                                    animate={{ height: `${height}%` }}
                                    transition={{ type: 'spring', stiffness: 200, damping: 20, delay: index * 0.05 }}
                                />
                                <span className="text-xs mt-1 text-light-muted-foreground dark:text-dark-muted-foreground">{day.label}</span>
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