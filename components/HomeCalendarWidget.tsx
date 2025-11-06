import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Bell, Timer, Plus, Trash2 } from 'lucide-react';
import { useAppContext } from '../App';
import AddEventModal from './AddEventModal';
import { MyEvent } from '../types';

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

const EVENT_ICONS = {
    reminder: <Bell size={16} className="text-yellow-500" />,
    focus: <Timer size={16} className="text-blue-500" />
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

interface HomeCalendarWidgetProps {
    onMonthChange: () => void;
}

const HomeCalendarWidget: React.FC<HomeCalendarWidgetProps> = ({ onMonthChange }) => {
    const { vibrate, playUISound, myEvents, addMyEvent, deleteMyEvent, showConfirmationModal } = useAppContext();
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [direction, setDirection] = useState(0);
    const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);

    const allEventsByDate = useMemo(() => {
        const combined: Record<string, (MyEvent & { isHoliday?: boolean })[]> = {};
        const holidays = getHolidays(viewDate.getFullYear());

        Object.keys(holidays).forEach(dateKey => {
            combined[dateKey] = holidays[dateKey].map(h => ({ ...h, id: `holiday-${dateKey}`, isHoliday: true, date: dateKey, createdAt: 0 }));
        });

        myEvents.forEach(event => {
            const dateKey = event.date;
            if (!combined[dateKey]) {
                combined[dateKey] = [];
            }
            combined[dateKey].push(event);
        });

        return combined;
    }, [viewDate, myEvents]);


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
    
    const eventsForSelectedDate = useMemo(() => {
        const dateKey = formatDateKey(selectedDate);
        const events = allEventsByDate[dateKey] || [];
        events.sort((a, b) => {
            if (a.time === 'All Day') return -1;
            if (b.time === 'All Day') return 1;
            return a.time.localeCompare(b.time);
        });
        return events;
    }, [allEventsByDate, selectedDate]);


    const handleMonthChange = (dir: 1 | -1) => {
        vibrate();
        playUISound('tap');
        setDirection(dir);
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + dir, 1));
        if (onMonthChange) {
            onMonthChange();
        }
    };
    
    const handleDateClick = (day: Date) => {
        vibrate();
        playUISound('tap');
        setSelectedDate(day);
    };

    const handleAddEventClick = () => {
        vibrate();
        playUISound('tap');
        setIsAddEventModalOpen(true);
    };

    const handleDeleteEvent = (eventId: string, eventTitle: string) => {
        showConfirmationModal({
            title: 'Delete Event?',
            message: `Are you sure you want to delete "${eventTitle}"?`,
            confirmText: 'Delete',
            onConfirm: () => deleteMyEvent(eventId),
        });
    };

    return (
        <div 
            className="w-full h-full p-2 flex flex-col"
        >
            <div className="opacity-90 flex-shrink-0">
                <div className="flex items-center justify-between px-2 mb-2">
                    <button onClick={() => handleMonthChange(-1)} className="p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ChevronLeft size={20} /></button>
                     <div className="text-center">
                         <h4 className="font-semibold text-sm">Calendar</h4>
                         <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary -mt-0.5">
                            {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                         </p>
                    </div>
                    <button onClick={() => handleMonthChange(1)} className="p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-light-text-secondary dark:text-dark-text-secondary mb-1">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => <div key={day}>{day}</div>)}
                </div>
                 <motion.div
                    className="relative overflow-hidden h-[180px]"
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.1}
                    onDragEnd={(e, { offset, velocity }) => {
                        const swipe = swipePower(offset.x, velocity.x);
                        if (swipe < -swipeConfidenceThreshold) {
                            handleMonthChange(1);
                        } else if (swipe > swipeConfidenceThreshold) {
                            handleMonthChange(-1);
                        }
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
                            transition={{ type: 'spring', stiffness: 500, damping: 45 }}
                            className="grid grid-cols-7 gap-0.5 place-items-center absolute w-full"
                        >
                            {calendarDays.map((day, index) => {
                                if (!day) return <div key={`empty-${index}`} className="w-8 h-8"></div>;
                                const isToday = day.toDateString() === todayDate.toDateString();
                                const hasEvent = !!allEventsByDate[formatDateKey(day)];
                                const isSelected = selectedDate.toDateString() === day.toDateString();
                                return (
                                    <button
                                        key={day.toISOString()}
                                        onClick={() => handleDateClick(day)}
                                        className={`relative w-8 h-8 flex items-center justify-center rounded-full transition-colors text-sm ${
                                            isSelected ? 'bg-light-primary/80 dark:bg-dark-primary/80 text-white font-semibold' : isToday ? 'bg-black/5 dark:bg-white/5' : 'hover:bg-black/5 dark:hover:bg-white/5'
                                        }`}
                                    >
                                        <span>{day.getDate()}</span>
                                        {hasEvent && !isSelected && <div className="absolute bottom-1 w-1 h-1 bg-light-primary dark:bg-dark-primary rounded-full"></div>}
                                    </button>
                                );
                            })}
                        </motion.div>
                    </AnimatePresence>
                </motion.div>
            </div>
            
            <div className="mt-2 pt-2 border-t border-white/10 dark:border-white/20 min-h-[7rem] flex-grow overflow-y-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={selectedDate.toDateString()}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="flex justify-between items-center mb-2 px-1">
                            <h4 className="font-semibold text-sm">
                                {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                            </h4>
                             <button onClick={handleAddEventClick} className="p-2 -mr-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                                <Plus size={18} />
                            </button>
                        </div>

                        {eventsForSelectedDate.length > 0 ? (
                            <div className="space-y-2">
                                {eventsForSelectedDate.map(event => (
                                    <div key={event.id} className="group flex items-center gap-3 px-2 py-1.5 bg-black/5 dark:bg-white/5 rounded-md text-sm">
                                        {EVENT_ICONS[event.type]}
                                        <span className="flex-grow">{event.title}</span>
                                        <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary opacity-80">{event.time}</span>
                                        {!event.isHoliday && (
                                            <button onClick={() => handleDeleteEvent(event.id, event.title)} className="p-1 -mr-1 rounded-full text-red-500/50 hover:bg-red-500/10 hover:text-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-center text-light-text-secondary dark:text-dark-text-secondary pt-4">No events scheduled.</p>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
             <AddEventModal
                isOpen={isAddEventModalOpen}
                onClose={() => setIsAddEventModalOpen(false)}
                date={selectedDate}
                onSave={async (newEvent) => {
                    await addMyEvent({
                        ...newEvent,
                        date: formatDateKey(selectedDate),
                    });
                    setIsAddEventModalOpen(false);
                }}
            />
        </div>
    );
};

export default HomeCalendarWidget;