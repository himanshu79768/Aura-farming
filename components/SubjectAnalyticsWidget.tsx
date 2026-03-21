import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../App';
import { BookOpen } from 'lucide-react';
import { ACCENT_COLORS } from '../constants';
import { AccentColor } from '../types';

const SubjectAnalyticsWidget: React.FC = () => {
    const { focusHistory, settings } = useAppContext();

    const chartColors = useMemo(() => {
        const isDark = settings.theme === 'dark' || (settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        const themeKey = isDark ? 'dark' : 'light';
        const palette: AccentColor[] = ['blue', 'purple', 'pink', 'orange', 'green', 'teal', 'cyan'];
        return palette.map(colorName => `hsl(${ACCENT_COLORS[colorName][themeKey]})`);
    }, [settings.theme]);

    const subjectData = useMemo(() => {
        const data: Record<string, number> = {};
        
        // Only consider last 7 days for widget
        const now = new Date();
        const cutoffDate = new Date(now.setDate(now.getDate() - 7));
        cutoffDate.setHours(0, 0, 0, 0);

        focusHistory.forEach(session => {
            if (new Date(session.date) >= cutoffDate) {
                const subject = session.subject || 'Uncategorized';
                data[subject] = (data[subject] || 0) + session.duration / 60;
            }
        });

        const sortedData = Object.entries(data)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 4); // Top 4 subjects

        const total = sortedData.reduce((sum, [, val]) => sum + val, 0);

        return { items: sortedData, total };
    }, [focusHistory]);

return (
    <div className="w-full h-full p-6 flex flex-col justify-between 
        bg-light-card dark:bg-dark-card 
        text-light-card-foreground dark:text-dark-card-foreground 
        rounded-2xl">
        
        <div>
            <h3 className="font-semibold text-left text-base flex items-center gap-2">
                <BookOpen size={16} /> Top Subjects
            </h3>
            <p className="text-left text-xs text-light-muted-foreground dark:text-dark-muted-foreground">
                Last 7 days
            </p>
        </div>

    </div>
)

    </div>
)
            
            <div className="flex-grow flex flex-col justify-center my-2 gap-3">
                {subjectData.items.length > 0 ? (
                    subjectData.items.map(([subject, minutes], index) => {
                        const percentage = subjectData.total > 0 ? (minutes / subjectData.total) * 100 : 0;
                        return (
                            <div key={subject} className="w-full">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="truncate pr-2">{subject}</span>
                                    <span className="font-medium shrink-0">{Math.round(minutes)}m</span>
                                </div>
                                <div className="w-full h-2 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                    <motion.div 
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: chartColors[index % chartColors.length] }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percentage}%` }}
                                        transition={{ type: 'spring', stiffness: 100, damping: 20, delay: index * 0.1 }}
                                    />
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center text-sm text-light-muted-foreground dark:text-dark-muted-foreground">
                        No subjects recorded yet.
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubjectAnalyticsWidget;
