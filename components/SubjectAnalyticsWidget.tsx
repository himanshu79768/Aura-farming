import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../App';
import { BookOpen } from 'lucide-react';

const DAILY_GOAL_MINUTES = 60;

const getSubjectColor = (subject: string): string => {
    const t = subject.toUpperCase();
    if (t.includes('ACCOUNTING')) return '#60a5fa';
    if (t.includes('LAWS'))       return '#facc15';
    if (t.includes('APTITUDE'))   return '#f472b6';
    if (t.includes('ECONOMICS'))  return '#c084fc';
    return '#8b5cf6';
};

const SubjectAnalyticsWidget: React.FC = () => {
    const { focusHistory } = useAppContext();

    const subjectData = useMemo(() => {
        const data: Record<string, number> = {};

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        focusHistory.forEach(session => {
            const sessionDate = new Date(session.date);
            sessionDate.setHours(0, 0, 0, 0);
            if (sessionDate.getTime() === today.getTime()) {
                const subject = session.subject || 'Uncategorized';
                data[subject] = (data[subject] || 0) + session.duration / 60;
            }
        });

        const sortedData = Object.entries(data)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 4);

        return { items: sortedData };
    }, [focusHistory]);

    return (
        <div className="w-full h-full p-6 flex flex-col justify-between text-light-card-foreground dark:text-dark-card-foreground">
            <div>
                <h3 className="font-semibold text-left text-base flex items-center gap-2">
                    <BookOpen size={16} /> Today's Subjects
                </h3>
                <p className="text-left text-xs text-light-muted-foreground dark:text-dark-muted-foreground">Goal: 1 hr per subject</p>
            </div>
            
            <div className="flex-grow flex flex-col justify-center my-2 gap-3">
                {subjectData.items.length > 0 ? (
                    subjectData.items.map(([subject, minutes]) => {
                        const percentage = Math.min((minutes / DAILY_GOAL_MINUTES) * 100, 100);
                        return (
                            <div key={subject} className="w-full">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="truncate pr-2">{subject}</span>
                                    <span className="font-medium shrink-0">{Math.round(minutes)}m / 60m</span>
                                </div>
                                <div className="w-full h-2 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                    <motion.div 
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: getSubjectColor(subject) }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percentage}%` }}
                                        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                                    />
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center text-sm text-light-muted-foreground dark:text-dark-muted-foreground">
                        No sessions today yet.
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubjectAnalyticsWidget;
