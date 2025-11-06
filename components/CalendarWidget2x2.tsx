import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Bell, Timer } from 'lucide-react';
import { useAppContext } from '../App';
import { MyEvent } from '../types';

const formatDateKey = (d: Date) => d.toISOString().split('T')[0];

const EVENT_ICONS = {
    reminder: <Bell size={14} className="text-yellow-500 shrink-0" />,
    focus: <Timer size={14} className="text-blue-500 shrink-0" />
};

const calendarVariants = {
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

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

const CalendarWidget2x2: React.FC = () => {
    const { vibrate, playUISound, myEvents } = useAppContext();
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [direction, setDirection] = useState(0);

    const eventMap = useMemo(() => {
        const map = new Map<string, MyEvent[]>();
        myEvents.forEach(event => {
            const dateKey = event.date;
            const eventsForDate = map.get(dateKey) || [];
            eventsForDate.push(event);
            map.set(dateKey, eventsForDate);
        });
        return map;
    }, [myEvents]);

    const calendarDays = useMemo(() => {
        const date = viewDate;
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        const startDayOfWeek = firstDayOfMonth.getDay();

        const days: (Date | null)[] = [];
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    }, [viewDate]);
    
    const todayDate = new Date();

    const handleMonthChange = (dir: 1 | -1) => {
        vibrate();
        playUISound('tap');
        setDirection(dir);
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + dir, 1));
        setSelectedDate(null); // Clear selected date when changing month
    };
    
    const handleDateClick = (day: Date) => {
        vibrate();
        playUISound('tap');
        if (selectedDate && selectedDate.toDateString() === day.toDateString()) {
            setSelectedDate(null); // Toggle off if same day is clicked
        } else {
            setSelectedDate(day);
        }
    };

    const eventsForSelectedDate = selectedDate ? eventMap.get(formatDateKey(selectedDate)) || [] : [];
    eventsForSelectedDate.sort((a, b) => {
        if (a.time === 'All Day') return -1;
        if (b.time === 'All Day') return 1;
        return a.time.localeCompare(b.time);
    });

    return (
        <div className="w-full h-full p-4 flex flex-col overflow-hidden">
            <div className="flex-shrink-0">
                <div className="flex items-center justify-between px-1 mb-2">
                    <button onClick={() => handleMonthChange(-1)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ChevronLeft size={18} /></button>
                     <h4 className="font-semibold text-sm">
                        {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                     </h4>
                    <button onClick={() => handleMonthChange(1)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ChevronRight size={18} /></button>
                </div>
            </div>
            
            <div className="relative flex-grow flex flex-col">
                <AnimatePresence mode="wait">
                    {selectedDate ? (
                        <motion.div
                            key="events-view"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="w-full h-full flex flex-col"
                        >
                            <div className="flex justify-between items-center mb-2 px-1">
                                <h4 className="font-semibold text-sm text-light-primary dark:text-dark-primary">
                                    {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                </h4>
                                <button onClick={() => setSelectedDate(null)} className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary hover:underline">
                                    Back to Calendar
                                </button>
                            </div>
                            {eventsForSelectedDate.length > 0 ? (
                                <div className="space-y-2 overflow-y-auto flex-grow pr-1">
                                    {eventsForSelectedDate.map(event => (
                                        <div key={event.id} className="flex items-center gap-2 p-2 bg-black/5 dark:bg-white/5 rounded-md text-sm">
                                            {EVENT_ICONS[event.type]}
                                            <span className="flex-grow truncate">{event.title}</span>
                                            <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary opacity-80 shrink-0">{event.time}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex-grow flex items-center justify-center text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                    <p>No events scheduled for this day.</p>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="calendar-view"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="w-full h-full"
                        >
                            <div className="grid grid-cols-7 text-center text-xs text-light-text-secondary dark:text-dark-text-secondary mb-2">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => <div key={day}>{day}</div>)}
                            </div>
                            <motion.div
                                className="relative overflow-hidden"
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                dragElastic={0.1}
                                onDragEnd={(e, { offset, velocity }) => {
                                    const swipe = swipePower(offset.x, velocity.x);
                                    if (swipe < -swipeConfidenceThreshold) handleMonthChange(1);
                                    else if (swipe > swipeConfidenceThreshold) handleMonthChange(-1);
                                }}
                            >
                                <AnimatePresence initial={false} custom={direction}>
                                    <motion.div
                                        key={viewDate.getMonth()}
                                        custom={direction}
                                        variants={calendarVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                                        className="grid grid-cols-7 gap-y-2 place-items-center absolute w-full"
                                    >
                                        {calendarDays.map((day, index) => {
                                            if (!day) return <div key={`empty-${index}`} className="w-9 h-9"></div>;
                                            const isToday = day.toDateString() === todayDate.toDateString();
                                            const hasEvent = eventMap.has(formatDateKey(day));
                                            return (
                                                <button
                                                    key={day.toISOString()}
                                                    onClick={() => handleDateClick(day)}
                                                    className={`relative w-9 h-9 flex items-center justify-center rounded-full transition-colors text-sm ${
                                                        isToday ? 'bg-light-primary/80 dark:bg-dark-primary/80 text-white font-semibold' : 'hover:bg-black/5 dark:hover:bg-white/5'
                                                    }`}
                                                >
                                                    <span>{day.getDate()}</span>
                                                    {hasEvent && <div className={`absolute bottom-1.5 w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-light-primary dark:bg-dark-primary'}`}></div>}
                                                </button>
                                            );
                                        })}
                                    </motion.div>
                                </AnimatePresence>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default CalendarWidget2x2;