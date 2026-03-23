import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../App';
import { BookOpen } from 'lucide-react';

const getSubjectColor = (subject: string): string => {
    const t = subject.toUpperCase();
    if (t.includes('ACCOUNTING')) return '#3b82f6'; // blue-500
    if (t.includes('LAWS'))       return '#64748b'; // slate-500
    if (t.includes('APTITUDE'))   return '#eab308'; // yellow-500
    if (t.includes('ECONOMICS'))  return '#ef4444'; // red-500
    return '#8b5cf6'; // fallback accent
};

const SubjectAnalyticsWidget: React.FC = () => {
    const { focusHistory } = useAppContext();

    const subjectData = useMemo(() => {
        const data: Record<string, number> = {};
        
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
            .slice(0, 4);

        const total = sortedData.reduce((sum, [, val]) => sum + val, 0);

        return { items: sortedData, total };
    }, [focusHistory]);

    return (
        <div className="w-full h-full p-6 flex flex-col justify-between text-light-card-foreground dark:text-dark-card-foreground" style={{ marginBottom: '9.5rem' }}>
            <div>
                <h3 className="font-semibold text-left text-base flex items-center gap-2">
                    <BookOpen size={16} /> Top Subjects
                </h3>
                <p className="text-left text-xs text-light-muted-foreground dark:text-dark-muted-foreground">Last 7 days</p>
            </div>
            
            <div className="flex-grow flex flex-col justify-center my-2 gap-3">
                {subjectData.items.length > 0 ? (
                    subjectData.items.map(([subject, minutes]) => {
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
                        No subjects recorded yet.
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubjectAnalyticsWidget;
