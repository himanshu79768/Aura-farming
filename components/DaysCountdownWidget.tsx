import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus, Edit, Trash2, GripVertical, Check, X } from 'lucide-react';
import { useAppContext } from '../App';
import { CountdownEvent } from '../types';

// --- Framer Motion Variants ---
const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => Math.abs(offset) * velocity;
const variants = {
  enter: (direction: number) => ({ x: direction > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { zIndex: 1, x: 0, opacity: 1 },
  exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? '100%' : '-100%', opacity: 0 }),
};

// --- Sub-components ---
const CountdownCard: React.FC<{ event: CountdownEvent }> = ({ event }) => {
    const { daysUntil } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [year, month, day] = event.date.split('-').map(Number);
        const eventDate = new Date(year, month - 1, day);
        eventDate.setHours(0, 0, 0, 0);
        
        const diffTime = eventDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { daysUntil: diffDays };
    }, [event.date]);

    return (
        <div className="w-full h-full p-6 flex flex-col justify-center items-center text-center">
            <h1 className="text-6xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-light-text dark:from-dark-text to-light-text-secondary/80 dark:to-dark-text-secondary/80">
                {daysUntil}
            </h1>
            <p className="text-base text-light-text-secondary dark:text-dark-text-secondary -mt-1">
                {daysUntil === 1 ? 'day until' : 'days until'}
            </p>
            <p className="mt-1 font-medium text-base truncate max-w-full px-4">{event.name}</p>
        </div>
    );
};

const AddCountdownCard: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button onClick={onClick} className="w-full h-full flex flex-col items-center justify-center text-light-muted-foreground dark:text-dark-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
        <Plus size={48} />
        <p className="mt-2 font-semibold">Add Countdown</p>
    </button>
);

// --- Main Widget Component ---
const DaysCountdownWidget: React.FC = () => {
    const { settings, setSettings } = useAppContext();
    const { countdownEvents = [] } = settings;
    const [[page, direction], setPage] = useState([0, 0]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editableCountdowns, setEditableCountdowns] = useState(countdownEvents);
    
    // Form state for new countdown
    const [newName, setNewName] = useState('');
    const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

    const paginate = (newDirection: number) => {
        const totalPages = countdownEvents.length + 1;
        setPage([(page + newDirection + totalPages) % totalPages, newDirection]);
    };

    const handleAddCountdown = () => {
        const trimmedName = newName.trim();
        if (trimmedName && newDate) {
            const newEvent: CountdownEvent = { id: crypto.randomUUID(), name: trimmedName, date: newDate };
            const newEvents = [...(settings.countdownEvents || []), newEvent];
            setSettings(s => ({ ...s, countdownEvents: newEvents }));
        }
        setNewName('');
        setNewDate(new Date().toISOString().split('T')[0]);
        setIsAddModalOpen(false);
    };
    
    const handleRemoveCountdown = (idToRemove: string) => {
        setEditableCountdowns(events => events.filter(event => event.id !== idToRemove));
    };
    
    const handleSaveOrder = () => {
        setSettings(s => ({ ...s, countdownEvents: editableCountdowns }));
        setIsEditMode(false);
    };

    const displayItems = [...countdownEvents, { id: 'add' }];

    return (
        <div className="w-full h-full flex flex-col justify-between bg-light-card dark:bg-dark-card text-light-card-foreground dark:text-dark-card-foreground">
            <AnimatePresence>
                {isEditMode ? (
                    <motion.div key="edit-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 bg-light-card dark:bg-dark-card p-4 flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold">Edit Countdowns</h3>
                            <button onClick={handleSaveOrder} className="px-3 py-1 text-sm font-semibold bg-light-primary dark:bg-dark-primary text-white rounded-full"><Check size={16}/></button>
                        </div>
                        <div className="space-y-2 overflow-y-auto">
                            {editableCountdowns.map((event) => (
                                <div key={event.id} className="flex items-center gap-2 p-2 rounded-lg bg-black/5 dark:bg-white/5">
                                    <GripVertical size={20} className="text-light-muted-foreground dark:text-dark-muted-foreground cursor-grab" />
                                    <div className="flex-grow">
                                        <p className="font-medium text-sm">{event.name}</p>
                                        <p className="text-xs text-light-muted-foreground dark:text-dark-muted-foreground">{new Date(event.date).toLocaleDateString()}</p>
                                    </div>
                                    <button onClick={() => handleRemoveCountdown(event.id)} className="p-1 rounded-full hover:bg-red-500/10 text-red-500"><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div key="main-view" className="w-full h-full flex flex-col">
                        <div className="flex justify-between items-center p-2 h-10">
                            <h4 className="font-semibold text-sm px-2">Days Countdown</h4>
                            {countdownEvents.length > 0 && <button onClick={() => setIsEditMode(true)} className="p-2 text-light-muted-foreground dark:text-dark-muted-foreground"><Edit size={16}/></button>}
                        </div>
                        <motion.div
                            className="relative flex-grow"
                            drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.1}
                            onDragEnd={(e, { offset, velocity }) => {
                                const swipe = swipePower(offset.x, velocity.x);
                                if (swipe < -swipeConfidenceThreshold) paginate(1);
                                else if (swipe > swipeConfidenceThreshold) paginate(-1);
                            }}
                        >
                            <AnimatePresence initial={false} custom={direction}>
                                <motion.div
                                    key={page} className="absolute w-full h-full"
                                    custom={direction} variants={variants}
                                    initial="enter" animate="center" exit="exit"
                                    transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                                >
                                    {page < displayItems.length - 1 ? (
                                        <CountdownCard event={displayItems[page] as CountdownEvent} />
                                    ) : <AddCountdownCard onClick={() => setIsAddModalOpen(true)} />}
                                </motion.div>
                            </AnimatePresence>
                        </motion.div>
                        <div className="flex justify-center items-center gap-2 h-6">
                            {displayItems.map((_, i) => <div key={i} className={`w-2 h-2 rounded-full transition-all ${page === i ? 'bg-light-text dark:bg-dark-text' : 'bg-light-muted-foreground/50 dark:bg-dark-muted-foreground/50'}`} />)}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isAddModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-transparent backdrop-blur-[1.5px]">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="w-full max-w-xs p-6 bg-light-bg-secondary/80 dark:bg-dark-bg-secondary/80 backdrop-blur-lg rounded-2xl border border-white/10 shadow-3xl">
                             <h3 className="text-lg font-bold mb-4">New Countdown</h3>
                             <div className="space-y-3">
                                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Event Name" autoFocus className="w-full px-4 py-3 bg-light-glass dark:bg-dark-glass rounded-lg border border-white/10 focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary" />
                                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full px-4 py-3 bg-light-glass dark:bg-dark-glass rounded-lg border border-white/10 focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary" />
                             </div>
                             <div className="flex justify-end gap-3 mt-4">
                                <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-semibold bg-light-glass dark:bg-dark-glass rounded-full">Cancel</button>
                                <button onClick={handleAddCountdown} disabled={!newName.trim()} className="px-4 py-2 text-sm font-semibold bg-light-primary dark:bg-dark-primary text-white rounded-full disabled:opacity-50">Add</button>
                             </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DaysCountdownWidget;