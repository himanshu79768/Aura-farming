import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useAppContext } from '../App';
import AddEventModal from './AddEventModal';

const calendarVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
    transition: { duration: 0.3 }
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    transition: { duration: 0.3 }
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 50 : -50,
    opacity: 0,
    transition: { duration: 0.3 }
  }),
};

const textAnimationVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { type: 'spring', stiffness: 400, damping: 30, duration: 0.2 }
};


const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

const formatDateKey = (d: Date) => d.toISOString().split('T')[0];

const CompactCalendarWidget: React.FC = () => {
    const { myEvents, vibrate, playUISound, addMyEvent } = useAppContext();
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [direction, setDirection] = useState(0);
    const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);

    const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const dayNumber = selectedDate.getDate();
    const monthName = viewDate.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
    
    const eventsForSelectedDate = useMemo(() => {
        const selectedKey = formatDateKey(selectedDate);
        return myEvents.filter(event => event.date === selectedKey);
    }, [myEvents, selectedDate]);

    const eventDates = useMemo(() => {
        const dateSet = new Set<string>();
        myEvents.forEach(event => {
            dateSet.add(event.date); // event.date is already YYYY-MM-DD
        });
        return dateSet;
    }, [myEvents]);

    const handleMonthChange = (dir: 1 | -1) => {
        vibrate();
        playUISound('tap');
        setDirection(dir);
        const newViewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + dir, 1);
        setViewDate(newViewDate);
        
        const today = new Date();
        if (newViewDate.getFullYear() === today.getFullYear() && newViewDate.getMonth() === today.getMonth()) {
            setSelectedDate(today);
        } else {
            setSelectedDate(newViewDate);
        }
    };

    const handleDateClick = (day: number | null) => {
        if (day === null) return;
        vibrate();
        playUISound('tap');
        setSelectedDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
    };
    
    const handleAddEventClick = () => {
        vibrate();
        playUISound('tap');
        setIsAddEventModalOpen(true);
    };

    const calendarDays = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startDayOfWeek = firstDayOfMonth.getDay();

        const days: (number | null)[] = [];
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }
        return days;
    }, [viewDate]);
    
    const today = new Date();
    const isTodaySelected = selectedDate.toDateString() === today.toDateString();

    return (
        <>
            <motion.div 
                className="w-full h-full p-4 flex text-light-text dark:text-dark-text overflow-hidden"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, { offset, velocity }) => {
                    const swipe = swipePower(offset.x, velocity.x);
                    if (swipe < -swipeConfidenceThreshold) {
                        handleMonthChange(1);
                    } else if (swipe > swipeConfidenceThreshold) {
                        handleMonthChange(-1);
                    }
                }}
            >
                {/* Left Side */}
                <div className="w-1/2 flex flex-col justify-between pr-3">
                    <div className="text-left overflow-hidden">
                        <AnimatePresence mode="wait">
                            <motion.p
                                key={`dow-${selectedDate.toDateString()}`}
                                initial="initial" animate="animate" exit="exit"
                                variants={textAnimationVariants}
                                className="text-red-500 font-bold text-sm tracking-wider"
                            >
                                {dayOfWeek}
                            </motion.p>
                        </AnimatePresence>
                        <AnimatePresence mode="wait">
                            <motion.p
                                key={`day-${selectedDate.toDateString()}`}
                                initial="initial" animate="animate" exit="exit"
                                variants={textAnimationVariants}
                                transition={{...textAnimationVariants.transition, delay: 0.05}}
                                className="text-6xl font-semibold"
                            >
                                {dayNumber}
                            </motion.p>
                        </AnimatePresence>
                    </div>
                    <div className="text-left text-xs text-light-text-secondary dark:text-gray-400 overflow-hidden h-10 flex flex-col justify-end">
                       <AnimatePresence mode="wait">
                            <motion.div
                                key={`events-${selectedDate.toDateString()}`}
                                initial="initial" animate="animate" exit="exit"
                                variants={textAnimationVariants}
                            >
                                {eventsForSelectedDate.length > 0 ? (
                                    eventsForSelectedDate.slice(0, 2).map((event, index) => (
                                        <div key={index} className="truncate text-light-text dark:text-gray-200">• {event.title}</div>
                                    ))
                                ) : (
                                    <button onClick={handleAddEventClick} className="flex items-center gap-1.5 text-light-text-secondary dark:text-gray-400 hover:text-light-text dark:hover:text-gray-200 transition-colors">
                                        <Plus size={12} />
                                        <span>{isTodaySelected ? "No events today" : "No events"}</span>
                                    </button>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Right Side */}
                <div className="w-1/2 flex flex-col pl-1">
                    <div className="flex justify-between items-center mb-1">
                        <button onClick={() => handleMonthChange(-1)} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ChevronLeft size={16} /></button>
                        <p className="text-red-500 font-bold text-xs tracking-wider">{monthName}</p>
                        <button onClick={() => handleMonthChange(1)} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ChevronRight size={16} /></button>
                    </div>
                    <div className="grid grid-cols-7 text-center text-[10px] font-medium text-light-text-secondary dark:text-dark-text-secondary">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => <div key={day}>{day}</div>)}
                    </div>
                    <div className="relative flex-grow">
                        <AnimatePresence initial={false} custom={direction}>
                            <motion.div
                                key={viewDate.toISOString()}
                                custom={direction}
                                variants={calendarVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                className="grid grid-cols-7 text-center text-sm mt-1 place-items-center gap-y-1 absolute w-full"
                            >
                                {calendarDays.map((day, index) => {
                                    if (!day) return <div key={`empty-${index}`} className="w-6 h-6"></div>;
                                    const isSelected = day === selectedDate.getDate() && viewDate.getMonth() === selectedDate.getMonth() && viewDate.getFullYear() === selectedDate.getFullYear();
                                    const isToday = day === today.getDate() && viewDate.getMonth() === today.getMonth() && viewDate.getFullYear() === today.getFullYear();
                                    const dateKey = formatDateKey(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
                                    const hasEvent = eventDates.has(dateKey);

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => handleDateClick(day)}
                                            className={`relative flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
                                                !isSelected && (isToday ? 'bg-black/10 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5')
                                            }`}
                                        >
                                            {isSelected && (
                                                <motion.div
                                                    layoutId="compact-calendar-selected-day"
                                                    className="absolute inset-0 bg-red-500 rounded-full"
                                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                />
                                            )}
                                            <span className={`relative z-10 transition-colors ${isSelected ? 'text-white' : ''}`}>{day}</span>
                                            {hasEvent && !isSelected && (
                                                <div className="absolute bottom-1 w-1 h-1 bg-gray-400 rounded-full"></div>
                                            )}
                                        </button>
                                    );
                                })}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
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
        </>
    );
};

export default CompactCalendarWidget;