import React, { useState, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Zap, Droplet, Sun, Maximize2, Minimize2 } from 'lucide-react';
import { useAppContext } from '../App';
import { Mood } from '../types';
import Breadcrumbs from './Breadcrumbs';

const SearchIcon = ({ size = 20 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 50 50" fill="currentColor">
        <path d="M 21 3 C 11.622998 3 4 10.623005 4 20 C 4 29.376995 11.622998 37 21 37 C 24.712383 37 28.139151 35.791079 30.9375 33.765625 L 44.085938 46.914062 L 46.914062 44.085938 L 33.886719 31.058594 C 36.443536 28.083 38 24.223631 38 20 C 38 10.623005 30.377002 3 21 3 z M 21 5 C 29.296122 5 36 11.703883 36 20 C 36 28.296117 29.296122 35 21 35 C 12.703878 35 6 28.296117 6 20 C 6 11.703883 12.703878 5 21 5 z"></path>
    </svg>
);

interface HeaderProps {
    title?: string;
    showBackButton?: boolean;
    onBack?: () => void;
    leftAction?: React.ReactNode;
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

const Header: React.FC<HeaderProps> = ({ title, showBackButton = false, onBack, leftAction, rightAction, showCenteredMoodSelector = false, titleClassName }) => {
    const { navigateBack, navigateForward, canGoBack, canGoForward, isImmersive, toggleImmersive, toggleSearch } = useAppContext();
    const measureRef = useRef<HTMLHeadingElement>(null);
    const [effectiveTitleClass, setEffectiveTitleClass] = useState(titleClassName || 'text-base');

    useLayoutEffect(() => {
        const checkWrap = () => {
            const element = measureRef.current;
            if (element) {
                const originalClass = titleClassName || 'text-base';
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

    const ImmersiveButton = (
        <motion.button
          onClick={toggleImmersive}
          className="p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5"
          aria-label={isImmersive ? "Exit immersive mode" : "Enter immersive mode"}
          whileTap={{ scale: 0.9 }}
          key="immersive-button"
        >
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={isImmersive ? 'minimize' : 'expand'}
                    initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                    transition={{ duration: 0.2 }}
                >
                    {isImmersive ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </motion.div>
            </AnimatePresence>
        </motion.button>
    );

    const SearchButton = (
        <motion.button
          onClick={toggleSearch}
          className="p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5"
          aria-label="Search"
          whileTap={{ scale: 0.9 }}
          key="search-button"
        >
            <SearchIcon size={20} />
        </motion.button>
      );
    
    return (
        <header className="relative w-full min-h-[5rem] h-auto flex items-center p-4 z-20 flex-shrink-0">
            
            {/* --- Mobile Layout (uses absolute positioning) --- */}
            <div className="w-full flex items-center justify-center md:hidden">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-0">
                    {leftAction ? leftAction : (showBackButton && (
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
                    ))}
                </div>
                
                {showCenteredMoodSelector ? (
                    <MoodSelector />
                ) : (
                    <div className="relative flex items-center justify-center">
                        <motion.h1 
                            key={title}
                            className={`font-semibold text-center max-w-[calc(100vw-14rem)] ${effectiveTitleClass}`}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            {title}
                        </motion.h1>

                        <h1 ref={measureRef} className={`font-semibold text-center max-w-[calc(100vw-14rem)] absolute invisible -z-10 ${titleClassName || 'text-base'}`}>{title}</h1>
                    </div>
                )}

                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {rightAction ? rightAction : (!showCenteredMoodSelector && !showBackButton && !leftAction && <MoodSelector />)}
                    {!showBackButton && SearchButton}
                </div>
            </div>

            {/* --- Desktop Layout (uses flex column) --- */}
            <div className="hidden md:flex flex-col w-full items-start">
                <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {leftAction ? leftAction : (
                            <>
                                <motion.button 
                                    onClick={navigateBack} 
                                    disabled={!canGoBack}
                                    className="flex items-center p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                                    aria-label="Back"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </motion.button>
                                <motion.button
                                    onClick={navigateForward}
                                    disabled={!canGoForward}
                                    className="flex items-center p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                                    aria-label="Forward"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </motion.button>
                            </>
                        )}
                        {!showCenteredMoodSelector && (
                            <motion.h1 
                                key={title}
                                className={`font-semibold ml-1 ${titleClassName || 'text-base'}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                {title}
                            </motion.h1>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {rightAction ? rightAction : ((showCenteredMoodSelector || (!showBackButton && !leftAction)) && <MoodSelector />)}
                        {ImmersiveButton}
                        {SearchButton}
                    </div>
                </div>
                 <div className="mt-2">
                    <Breadcrumbs />
                </div>
            </div>
        </header>
    );
};

export default Header;