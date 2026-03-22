import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../App';
import { Award, Target } from 'lucide-react';

const DailyTargetWidget: React.FC = () => {
    const { focusHistory, settings } = useAppContext();

    const stats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todaysSessions = focusHistory.filter(session => new Date(session.date) >= today);
        const todaysMinutes = Math.round(todaysSessions.reduce((acc, s) => acc + s.duration, 0) / 60);
        
        const targetHours = settings.dailyTargetHours || 4;
        const targetMinutes = targetHours * 60;
        const progress = Math.min((todaysMinutes / targetMinutes) * 100, 100);

        return { todaysMinutes, targetMinutes, targetHours, progress };
    }, [focusHistory, settings.dailyTargetHours]);

    return (
        <div className="w-full h-full p-6 flex flex-col justify-between text-light-card-foreground dark:text-dark-card-foreground overflow-hidden relative">
            <div className="flex justify-between items-center z-10">
                <h3 className="font-semibold text-left text-base flex items-center gap-2">
                    <Target size={18} /> Daily Target
                </h3>
                <Award size={18} className={stats.progress >= 100 ? 'text-yellow-500' : 'text-light-text-secondary dark:text-dark-text-secondary'} />
            </div>
            
            <div className="flex-grow flex flex-col items-center justify-center z-10">
                <div className="text-4xl font-bold mb-1">
                    {Math.round(stats.todaysMinutes / 60)}<span className="text-xl font-medium text-light-text-secondary dark:text-dark-text-secondary">h</span> {stats.todaysMinutes % 60}<span className="text-xl font-medium text-light-text-secondary dark:text-dark-text-secondary">m</span>
                </div>
                <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">
                    of {stats.targetHours}h goal
                </div>
                
                <div className="w-full h-3 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                        className={`h-full ${stats.progress >= 100 ? 'bg-green-500' : 'bg-light-primary dark:bg-dark-primary'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.progress}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    />
                </div>
            </div>
            
            {/* Background decorative element */}
            <div className="absolute -bottom-10 -right-10 opacity-5 pointer-events-none">
                <Target size={150} />
            </div>
        </div>
    );
};

export default DailyTargetWidget;
