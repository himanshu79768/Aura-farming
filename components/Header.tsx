import React, { useState, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Zap, Droplet, Sun } from 'lucide-react';
import { useAppContext } from '../App';
import { Mood } from '../types';

interface HeaderProps {
    title?: string;
    showBackButton?: boolean;
    onBack?: () => void;
    rightAction?: React.ReactNode;
    showCenteredMoodSelector?: boolean;
    titleClassName?: string;
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

const Header: React.FC<HeaderProps> = ({ title, showBackButton = false, onBack, rightAction, showCenteredMoodSelector = false, titleClassName }) => {
    const measureRef = useRef<HTMLHeadingElement>(null);
    const [effectiveTitleClass, setEffectiveTitleClass] = useState(titleClassName || 'text-lg');

    useLayoutEffect(() => {
        const checkWrap = () => {
            const element = measureRef.current;
            if (element) {
                const originalClass = titleClassName || 'text-lg';
                const smallerClass = originalClass === 'text-base' ? 'text-sm' : 'text-base';
    
                const style = getComputedStyle(element);
                const lineHeight = parseFloat(style.lineHeight);
                const isWrapped = element.clientHeight > lineHeight + 2;
    
                setEffectiveTitleClass(isWrapped ? smallerClass : originalClass);
            }
        };

        checkWrap();
        window.addEventListener('resize', checkWrap);
        return () => window.removeEventListener('resize', checkWrap);
    }, [title, titleClassName]);
    
    return (
        <header className="relative w-full min-h-[5rem] h-auto flex items-center justify-center p-4 z-20 flex-shrink-0">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
                {showBackButton && (
                    <motion.button 
                        onClick={onBack} 
                        className="flex items-center gap-1 text-light-primary dark:text-dark-primary"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                    >
                        <ChevronLeft className="w-6 h-6" />
                        <span className="text-lg">Back</span>
                    </motion.button>
                )}
            </div>
            
            {showCenteredMoodSelector ? (
                <MoodSelector />
            ) : (
                <div className="relative flex items-center justify-center">
                    {/* The actual visible title */}
                    <motion.h1 
                        key={title}
                        className={`font-semibold text-center max-w-[calc(100vw-11rem)] ${effectiveTitleClass}`}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {title}
                    </motion.h1>

                    {/* A hidden element used ONLY for measuring if the title *would* wrap with the original font size */}
                    <h1 ref={measureRef} className={`font-semibold text-center max-w-[calc(100vw-11rem)] absolute invisible -z-10 ${titleClassName || 'text-lg'}`}>{title}</h1>
                </div>
            )}

            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                 {!showCenteredMoodSelector && (rightAction ? rightAction : (!showBackButton && <MoodSelector />))}
            </div>
        </header>
    );
};

export default Header;