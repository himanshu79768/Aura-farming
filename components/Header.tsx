import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Zap, Droplet, Sun } from 'lucide-react';
import { useAppContext } from '../App';
import { Mood } from '../types';

interface HeaderProps {
    title?: string;
    showBackButton?: boolean;
    onBack?: () => void;
    rightAction?: React.ReactNode;
}

const moodIcons: Record<Mood, React.ReactNode> = {
    [Mood.Calm]: <Droplet className="w-5 h-5 text-blue-400"/>,
    [Mood.Focus]: <Zap className="w-5 h-5 text-purple-400"/>,
    [Mood.Energize]: <Sun className="w-5 h-5 text-yellow-400"/>,
};

const moodCycle: Mood[] = [Mood.Calm, Mood.Focus, Mood.Energize];

const MoodSelector: React.FC = () => {
    const { mood, setMood, vibrate } = useAppContext();

    const changeMood = () => {
        vibrate();
        const currentIndex = moodCycle.indexOf(mood);
        const nextIndex = (currentIndex + 1) % moodCycle.length;
        setMood(moodCycle[nextIndex]);
    };

    return (
         <motion.button 
            onClick={changeMood}
            className="flex items-center gap-2 px-3 py-1.5 bg-light-glass/80 dark:bg-dark-glass/80 backdrop-blur-md rounded-full border border-white/20 dark:border-white/10"
            whileTap={{ scale: 0.95 }}
            aria-label={`Change mood, current is ${mood}`}
        >
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={mood}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className="flex items-center gap-2"
                >
                    {moodIcons[mood]}
                    <span className="text-sm font-medium">{mood}</span>
                </motion.div>
            </AnimatePresence>
        </motion.button>
    )
}

const Header: React.FC<HeaderProps> = ({ title, showBackButton = false, onBack, rightAction }) => {
    return (
        <header className="relative w-full h-20 flex items-center justify-center p-4 z-20 flex-shrink-0">
            <div className="absolute left-4">
                {showBackButton && (
                    <motion.button 
                        onClick={onBack} 
                        className="flex items-center gap-1 text-blue-500"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                    >
                        <ChevronLeft className="w-6 h-6" />
                        <span className="text-lg">Back</span>
                    </motion.button>
                )}
            </div>
            
            <motion.h1 
                key={title}
                className="text-lg font-semibold"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                {title}
            </motion.h1>

            <div className="absolute right-4">
                 {rightAction ? rightAction : (!showBackButton && <MoodSelector />)}
            </div>
        </header>
    );
};

export default Header;