import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../App';
import { Award, BarChart3, Clock, Sparkles } from 'lucide-react';

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
  }),
};

const formatTotalTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    let result = '';
    if (hours > 0) result += `${hours}h `;
    result += `${minutes}m`;
    return result || '0m';
};


const StatsWidget: React.FC = () => {
    const { focusHistory } = useAppContext();
    const [[page, direction], setPage] = useState([0, 0]);

    const stats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todaysSessions = focusHistory.filter(session => new Date(session.date) >= today);
        const todaysMinutes = Math.round(todaysSessions.reduce((acc, s) => acc + s.duration, 0) / 60);
        
        const totalSessions = focusHistory.length;
        const totalSeconds = focusHistory.reduce((acc, s) => acc + s.duration, 0);
        
        const recentSession = focusHistory.length > 0 ? focusHistory[0] : null;
        const maxSessionMinutes = focusHistory.length > 0 ? Math.round(Math.max(...focusHistory.map(s => s.duration)) / 60) : 0;

        return { todaysMinutes, totalSessions, todaysSessionsCount: todaysSessions.length, totalSeconds, recentSession, maxSessionMinutes };
    }, [focusHistory]);

    const statPages = [
        { icon: <BarChart3 size={18} />, title: "Today's Focus", value: stats.todaysMinutes, unit: 'minutes' },
        { icon: <Clock size={18} />, title: 'Total Time', value: formatTotalTime(stats.totalSeconds), unit: '' },
        { icon: <BarChart3 size={18} />, title: 'Total Sessions', value: stats.totalSessions, unit: 'sessions' },
        { icon: <Award size={18} />, title: 'Longest Session', value: stats.maxSessionMinutes, unit: 'minutes' },
        { icon: <Sparkles size={18} />, title: 'Most Recent', value: stats.recentSession ? stats.recentSession.name || 'Focus Session' : 'None', unit: stats.recentSession ? `${Math.round(stats.recentSession.duration / 60)} min` : '' },
    ];

    const paginate = (newDirection: number) => {
        setPage([(page + newDirection + statPages.length) % statPages.length, newDirection]);
    };

    const currentPage = statPages[page];

    return (
        <div className="w-full h-full p-6 flex flex-col justify-between bg-light-card dark:bg-dark-card text-light-card-foreground dark:text-dark-card-foreground overflow-hidden">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold text-left text-base flex items-center gap-2">
                    {currentPage.icon} {currentPage.title}
                </h3>
            </div>
            
            <motion.div
                className="relative flex-grow flex flex-col items-center justify-center text-center -mt-4"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.1}
                onDragEnd={(e, { offset, velocity }) => {
                    const swipe = swipePower(offset.x, velocity.x);
                    if (swipe < -swipeConfidenceThreshold) paginate(1);
                    else if (swipe > swipeConfidenceThreshold) paginate(-1);
                }}
            >
                <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                        key={page}
                        className="absolute w-full h-full flex flex-col items-center justify-center"
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 }
                        }}
                    >
                        {typeof currentPage.value === 'string' && currentPage.value.length > 15 ? (
                            <>
                                <p className="text-2xl font-semibold tracking-tight truncate w-full px-2">{currentPage.value}</p>
                                {currentPage.unit && <p className="text-lg text-light-muted-foreground dark:text-dark-muted-foreground mt-1">{currentPage.unit}</p>}
                            </>
                        ) : (
                             <>
                                <p className="text-7xl font-bold tracking-tighter">{currentPage.value}</p>
                                {currentPage.unit && <p className="text-lg text-light-muted-foreground dark:text-dark-muted-foreground -mt-1">{currentPage.unit}</p>}
                            </>
                        )}
                       
                    </motion.div>
                </AnimatePresence>
            </motion.div>
            
            <div className="flex justify-center items-center gap-2 h-4">
                {statPages.map((_, i) => (
                    <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-all ${page === i ? 'bg-light-text dark:bg-dark-text' : 'bg-light-muted-foreground/50 dark:bg-dark-muted-foreground/50'}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default StatsWidget;