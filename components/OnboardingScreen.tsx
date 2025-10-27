import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader } from 'lucide-react';

interface OnboardingScreenProps {
    onComplete: (name: string) => void;
    isLoading?: boolean;
}

const AnimatedCubicTexture: React.FC<{ isSystemDark: boolean; onAnimationComplete: () => void; }> = ({ isSystemDark, onAnimationComplete }) => {
    const strokeColor = isSystemDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.15)';
    return (
        <div 
            className="absolute -top-1/4 left-0 w-full h-full origin-center pointer-events-none"
            style={{ 
                transform: 'rotate(-15deg) scale(1.5)',
                maskImage: 'linear-gradient(to bottom, black 20%, transparent 50%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 20%, transparent 50%)',
            }}
        >
            <svg width="100%" height="100%" xmlns='http://www.w3.org/2000/svg'>
                <defs>
                    <pattern id='grid' width='10' height='10' patternUnits='userSpaceOnUse'>
                        <motion.path 
                            d='M0 10V0h10' 
                            fill='none' 
                            stroke={strokeColor} 
                            strokeWidth='0.75'
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1.5, ease: 'easeInOut' }}
                            onAnimationComplete={onAnimationComplete}
                        />
                    </pattern>
                </defs>
                <rect width='100%' height='100%' fill='url(#grid)'/>
            </svg>
        </div>
    );
};

const screenVariants = {
  initial: { opacity: 1, x: 0 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -300 },
};
// Fix: Corrected Transition type for framer-motion by using 'as const' to assert literal types.
const transition = { type: 'tween' as const, ease: 'easeInOut' as const, duration: 0.5 };

const contentContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.2,
            delayChildren: 0.1,
        },
    },
};

const contentItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            // Fix: Corrected Transition type for framer-motion by using 'as const' to assert literal types.
            type: 'tween' as const,
            ease: 'easeOut' as const,
            duration: 0.5,
        },
    },
};


const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete, isLoading }) => {
    const [name, setName] = useState('');
    const [screenHeight, setScreenHeight] = useState('100vh');
    const [isDrawingComplete, setIsDrawingComplete] = useState(false);

    const [isSystemDark, setIsSystemDark] = useState(
        () => window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false
    );

    useEffect(() => {
        const root = document.documentElement;
        if (isSystemDark) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [isSystemDark]);

    useEffect(() => {
        if (!window.matchMedia) return;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => setIsSystemDark(e.matches);
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    useEffect(() => {
        const handleResize = () => {
            if (window.visualViewport) setScreenHeight(`${window.visualViewport.height}px`);
            else setScreenHeight(`${window.innerHeight}px`);
        };
        handleResize();
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
            return () => window.visualViewport.removeEventListener('resize', handleResize);
        } else {
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);

    const handleNext = () => {
        if (name.trim() && !isLoading) {
            onComplete(name.trim());
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleNext();
    };

    return (
        <motion.div
            style={{ height: screenHeight }}
            className="w-screen fixed inset-0 bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text overflow-hidden"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition}
        >
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-blue-500/10 to-transparent blur-2xl" />
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-purple-500/10 to-transparent blur-2xl" />
                <div className="absolute top-0 bottom-0 left-0 w-20 bg-gradient-to-r from-yellow-400/10 to-transparent blur-2xl" />
                <div className="absolute top-0 bottom-0 right-0 w-20 bg-gradient-to-l from-blue-500/10 to-transparent blur-2xl" />
            </div>

            <AnimatedCubicTexture isSystemDark={isSystemDark} onAnimationComplete={() => setIsDrawingComplete(true)} />
            
            <div className="relative z-10 flex flex-col items-center w-full h-full p-8">
                 <AnimatePresence>
                    {isDrawingComplete && (
                        <motion.div 
                            className="flex-grow flex flex-col items-center justify-center text-center w-full"
                            variants={contentContainerVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            <motion.div className="flex flex-col items-center" variants={contentItemVariants}>
                                <h1 className="text-6xl font-bold tracking-tighter">Aura</h1>
                                <p className="mt-2 text-lg text-light-text-secondary dark:text-dark-text-secondary">Find your focus, calm your mind.</p>
                            </motion.div>
                            
                            <motion.form onSubmit={handleSubmit} className="w-full max-w-xs mt-12" variants={contentItemVariants}>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="What should we call you?"
                                        className="w-full px-5 py-3 text-center text-lg bg-black/5 dark:bg-white/5 border-2 border-black/10 dark:border-white/10 rounded-full focus:outline-none focus:border-black/20 dark:focus:border-white/30 transition-colors placeholder:text-light-text-secondary dark:placeholder:text-dark-text-secondary"
                                        autoFocus
                                    />
                                </div>
                            </motion.form>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {isDrawingComplete && (
                        <motion.div className="w-full" variants={contentItemVariants} initial="hidden" animate="visible">
                            <motion.button
                                onClick={handleNext}
                                disabled={!name.trim() || isLoading}
                                className="w-full flex items-center justify-center gap-2 py-4 text-lg font-semibold bg-light-accent dark:bg-dark-accent text-light-bg dark:text-dark-bg rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                aria-label="Continue"
                            >
                                {isLoading ? <Loader className="animate-spin" /> : <><span>Continue</span> <ArrowRight size={20} /></>}
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default OnboardingScreen;