import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Bell, Timer } from 'lucide-react';
import { useAppContext } from '../App';

const formatDateKey = (d: Date) => d.toISOString().split('T')[0];

const getHolidays = (year: number): Record<string, { title: string; type: 'reminder'; time: string; }[]> => ({
    [`${year}-01-01`]: [{ title: "New Year's Day", type: 'reminder', time: 'All Day' }],
    [`${year}-01-26`]: [{ title: "Republic Day (India)", type: 'reminder', time: 'All Day' }],
    [`${year}-02-14`]: [{ title: "Valentine's Day", type: 'reminder', time: 'All Day' }],
    [`${year}-04-22`]: [{ title: "Earth Day", type: 'reminder', time: 'All Day' }],
    [`${year}-08-15`]: [{ title: "Independence Day (India)", type: 'reminder', time: 'All Day' }],
    [`${year}-10-31`]: [{ title: 'Halloween', type: 'reminder', time: 'All Day' }],
    [`${year}-12-25`]: [{ title: 'Christmas Day', type: 'reminder', time: 'All Day' }],
});

const generateEvents = () => {
    // FIX: Add explicit type to `allEvents` to match the usage with both 'reminder' and 'focus' types.
    const allEvents: Record<string, { title: string; type: 'reminder' | 'focus'; time: string }[]> = getHolidays(new Date().getFullYear());
    
    const addDays = (date: Date, days: number) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    };
    
    const today = new Date();

    const upcoming1 = addDays(today, 3);
    const key1 = formatDateKey(upcoming1);
    allEvents[key1] = [...(allEvents[key1] || []), { title: 'Project brainstorming', type: 'focus', time: '10:00 AM' }];
    
    const upcoming2 = addDays(today, 5);
    const key2 = formatDateKey(upcoming2);
    allEvents[key2] = [...(allEvents[key2] || []), { title: 'Doctor\'s appointment', type: 'reminder', time: '02:30 PM' }];

    return allEvents;
};


const EVENT_ICONS = {
    reminder: <Bell size={16} className="text-yellow-500" />,
    focus: <Timer size={16} className="text-blue-500" />
};

const HomeCalendarWidget: React.FC = () => {
    const { vibrate, playUISound } = useAppContext();
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    const allEvents = useMemo(() => generateEvents(), []);

    const generateCalendarDays = (date: Date) => {
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
    };

    const calendarDays = useMemo(() => generateCalendarDays(viewDate), [viewDate]);
    const todayDate = new Date();
    
    const eventsForSelectedDate = allEvents[formatDateKey(selectedDate)] || [];
    
    const upcomingEvents = useMemo(() => {
        const events: { date: Date; events: { title: string; type: "reminder" | "focus"; time: string; }[] }[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let i = 1; i <= 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            const dateKey = formatDateKey(date);
            if (allEvents[dateKey]) {
                events.push({
                    date: date,
                    events: allEvents[dateKey]
                });
            }
        }
        return events;
    }, [allEvents]);


    const handleMonthChange = (direction: -1 | 1) => {
        vibrate();
        playUISound('tap');
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + direction, 1));
    };
    
    const handleDateClick = (day: Date) => {
        vibrate();
        playUISound('tap');
        setSelectedDate(day);
    };

    return (
        <motion.div 
            className="w-full p-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
        >
            <div className="flex items-center justify-between px-2 mb-2">
                <button onClick={() => handleMonthChange(-1)} className="p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ChevronLeft size={20} /></button>
                <h3 className="font-semibold text-center w-36">
                    {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={() => handleMonthChange(1)} className="p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ChevronRight size={20} /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-light-text-secondary dark:text-dark-text-secondary mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 place-items-center">
                {calendarDays.map((day, index) => {
                    if (!day) return <div key={`empty-${index}`} className="w-9 h-9"></div>;
                    const isToday = day.toDateString() === todayDate.toDateString();
                    const hasEvent = !!allEvents[formatDateKey(day)];
                    const isSelected = selectedDate.toDateString() === day.toDateString();
                    return (
                        <button
                            key={day.toISOString()}
                            onClick={() => handleDateClick(day)}
                            className={`relative w-9 h-9 flex items-center justify-center rounded-full transition-colors text-sm ${
                                isSelected ? 'bg-light-primary/80 dark:bg-dark-primary/80 text-white font-semibold' : isToday ? 'bg-black/5 dark:bg-white/5' : 'hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                        >
                            <span>{day.getDate()}</span>
                            {hasEvent && !isSelected && <div className="absolute bottom-1 w-1 h-1 bg-light-primary dark:bg-dark-primary rounded-full"></div>}
                        </button>
                    );
                })}
            </div>
            
            <div className="mt-2 pt-2 border-t border-white/10 dark:border-white/20 min-h-[5rem]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={selectedDate.toDateString()}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <h4 className="font-semibold text-sm mb-2 px-1">
                            {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h4>
                        {eventsForSelectedDate.length > 0 ? (
                            <div className="space-y-2">
                                {eventsForSelectedDate.map(event => (
                                    <div key={event.title} className="flex items-center gap-3 px-2 py-1.5 bg-black/5 dark:bg-white/5 rounded-md text-sm">
                                        {EVENT_ICONS[event.type]}
                                        <span className="flex-grow">{event.title}</span>
                                        <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary opacity-80">{event.time}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-center text-light-text-secondary dark:text-dark-text-secondary pt-4">No events scheduled.</p>
                        )}
                    </motion.div>
                </AnimatePresence>

                 {upcomingEvents.length > 0 && (
                    <div className="mt-4 pt-2 border-t border-white/10 dark:border-white/20">
                        <h4 className="font-semibold text-sm mb-2 px-1">Upcoming</h4>
                        <div className="space-y-2">
                            {upcomingEvents.slice(0, 2).map(({ date, events }) => (
                                <div key={date.toISOString()}>
                                    {events.map(event => (
                                        <div key={event.title} className="flex items-center gap-3 px-2 py-1.5 bg-black/5 dark:bg-white/5 rounded-md text-sm">
                                            <div className="flex flex-col items-center w-8">
                                                <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">{date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                                                <span className="font-bold">{date.getDate()}</span>
                                            </div>
                                            <div className="w-px h-6 bg-black/10 dark:bg-white/10"></div>
                                            {EVENT_ICONS[event.type]}
                                            <span className="flex-grow">{event.title}</span>
                                            <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary opacity-80">{event.time}</span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default HomeCalendarWidget;