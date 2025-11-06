import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Timer, X } from 'lucide-react';
import { useAppContext } from '../App';

interface SegmentedControlProps<T extends string> {
    options: { value: T; label: React.ReactNode; }[];
    selectedValue: T;
    onChange: (value: T) => void;
    layoutId: string;
}

const SegmentedControl = <T extends string>({ options, selectedValue, onChange, layoutId }: SegmentedControlProps<T>) => {
  const { vibrate, playUISound } = useAppContext();
  const handleChange = (value: T) => {
    vibrate();
    playUISound('tap');
    onChange(value);
  };
  return (
    <div className="flex justify-around items-center bg-black/5 dark:bg-white/5 p-1 rounded-full w-full">
      {options.map(({ value, label }) => (
        <button 
            key={value} 
            onClick={() => handleChange(value)} 
            className={`relative w-full py-2 text-sm font-medium rounded-full capitalize transition-colors ${selectedValue !== value ? 'hover:bg-black/5 dark:hover:bg-white/5' : ''}`}
        >
          <span className="flex items-center justify-center gap-1.5">{label}</span>
          {selectedValue === value && <motion.div layoutId={layoutId} className="absolute inset-0 bg-light-bg-secondary dark:bg-dark-bg-secondary rounded-full shadow-md z-[-1]" transition={{ type: 'spring', stiffness: 600, damping: 35 }} />}
        </button>
      ))}
    </div>
  );
};

interface AddEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (event: { title: string; time: string; type: 'reminder' | 'focus' }) => void;
    date: Date;
}

const AddEventModal: React.FC<AddEventModalProps> = ({ isOpen, onClose, onSave, date }) => {
    const { vibrate, playUISound } = useAppContext();
    const [title, setTitle] = useState('');
    const [time, setTime] = useState('10:00');
    const [type, setType] = useState<'reminder' | 'focus'>('reminder');

    useEffect(() => {
        if (isOpen) {
            // Reset form when opening
            setTitle('');
            setTime('10:00');
            setType('reminder');
        }
    }, [isOpen]);
    
    const handleSave = () => {
        if (!title.trim()) return;
        onSave({ title: title.trim(), time, type });
    };

    const handleClose = () => {
        vibrate();
        playUISound('tap');
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-transparent backdrop-blur-[1.5px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="relative w-full max-w-sm p-6 bg-light-bg-secondary/80 dark:bg-dark-bg-secondary/80 backdrop-blur-lg rounded-2xl border border-white/10 shadow-3xl"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    >
                        <button onClick={handleClose} className="absolute top-3 right-3 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-bold mb-1">Add Event</h2>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">
                            For {date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>

                        <div className="space-y-4">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Event Title (e.g., Team Meeting)"
                                className="w-full px-4 py-3 bg-light-glass dark:bg-dark-glass rounded-lg border border-white/10 focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary"
                                autoFocus
                            />
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full px-4 py-3 bg-light-glass dark:bg-dark-glass rounded-lg border border-white/10 focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary"
                            />
                            <SegmentedControl<'reminder' | 'focus'>
                                options={[
                                    { value: 'reminder', label: <><Bell size={16}/> Reminder</> },
                                    { value: 'focus', label: <><Timer size={16}/> Focus</> },
                                ]}
                                selectedValue={type}
                                onChange={setType}
                                layoutId="event-type-selector"
                            />
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <motion.button
                                onClick={handleClose}
                                className="px-5 py-2 text-base font-semibold bg-light-glass dark:bg-dark-glass rounded-full"
                                whileTap={{ scale: 0.95 }}
                            >
                                Cancel
                            </motion.button>
                            <motion.button
                                onClick={handleSave}
                                disabled={!title.trim()}
                                className="px-5 py-2 text-base font-semibold bg-light-primary dark:bg-dark-primary text-white rounded-full disabled:opacity-50"
                                whileTap={{ scale: 0.95 }}
                            >
                                Save
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AddEventModal;