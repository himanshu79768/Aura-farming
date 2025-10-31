import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../App';
import Header from './Header';

const PHASES = {
    idle: { duration: 0, instruction: "Ready to begin?" },
    inhale: { duration: 4, instruction: "Inhale..." },
    hold1: { duration: 4, instruction: "Hold" },
    exhale: { duration: 4, instruction: "Exhale..." },
    hold2: { duration: 4, instruction: "Hold" },
};

type Phase = keyof typeof PHASES;
const CYCLE: Phase[] = ['inhale', 'hold1', 'exhale', 'hold2'];

const BreathingPage: React.FC = () => {
    const { navigateBack, playSound, vibrate } = useAppContext();
    const [phase, setPhase] = useState<Phase>('idle');
    const [cyclesLeft, setCyclesLeft] = useState(5);
    const [isActive, setIsActive] = useState(false);
    
    useEffect(() => {
        if (!isActive || phase === 'idle') return;

        const { duration } = PHASES[phase];
        
        if (phase === 'inhale') playSound('inhale');
        if (phase === 'exhale') playSound('exhale');
        vibrate('light');

        const timer = setTimeout(() => {
            const currentPhaseIndex = CYCLE.indexOf(phase);
            const nextPhaseIndex = (currentPhaseIndex + 1) % CYCLE.length;
            
            if (nextPhaseIndex === 0) {
                if (cyclesLeft - 1 === 0) {
                    setIsActive(false);
                    setPhase('idle');
                    setCyclesLeft(5); // Reset
                } else {
                    setCyclesLeft(prev => prev - 1);
                    setPhase(CYCLE[nextPhaseIndex]);
                }
            } else {
                setPhase(CYCLE[nextPhaseIndex]);
            }

        }, duration * 1000);

        return () => clearTimeout(timer);
    }, [phase, isActive, cyclesLeft, playSound, vibrate]);

    const handleStart = () => {
        setIsActive(true);
        setPhase('inhale');
    };

    const handleStop = () => {
        setIsActive(false);
        setPhase('idle');
        setCyclesLeft(5);
    };

    // Fix: Corrected Transition type for framer-motion by using 'as const' to assert literal types for 'ease'.
    const circleVariants = {
        idle: { scale: 0.8 },
        inhale: { scale: 1.2, transition: { duration: 4, ease: 'easeInOut' as const } },
        hold1: { scale: 1.2, transition: { duration: 4, ease: 'easeInOut' as const } },
        exhale: { scale: 0.8, transition: { duration: 4, ease: 'easeInOut' as const } },
        hold2: { scale: 0.8, transition: { duration: 4, ease: 'easeInOut' as const } },
    }

    return (
        <div className="w-full h-full flex flex-col bg-light-bg dark:bg-dark-bg">
            <Header title="Breathe" showBackButton onBack={navigateBack} />
            <div className="flex-grow flex flex-col items-center justify-center p-4 pb-24 text-center">
                <div className="relative w-64 h-64 flex items-center justify-center">
                    <motion.div 
                        className="absolute w-full h-full bg-light-primary/20 dark:bg-dark-primary/20 rounded-full"
                        variants={circleVariants}
                        animate={phase}
                    />
                    <motion.div 
                        className="w-48 h-48 bg-light-primary/30 dark:bg-dark-primary/30 rounded-full" 
                        variants={circleVariants}
                        animate={phase}
                        transition={{ delay: 0.1 }}
                    />
                     <AnimatePresence mode="wait">
                        <motion.p
                            key={PHASES[phase].instruction}
                            className="absolute text-2xl font-medium text-light-text dark:text-dark-text"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        >
                            {PHASES[phase].instruction}
                        </motion.p>
                    </AnimatePresence>
                </div>
                
                <div className="mt-16">
                    {isActive ? (
                        <motion.button
                            onClick={handleStop}
                            className="px-8 py-3 bg-red-500/80 text-white font-semibold rounded-full shadow-lg"
                            whileTap={{ scale: 0.95 }}
                        >
                            Stop
                        </motion.button>
                    ) : (
                        <motion.button
                            onClick={handleStart}
                            className="px-8 py-3 bg-light-primary/80 dark:bg-dark-primary/80 text-white font-semibold rounded-full shadow-lg"
                            whileTap={{ scale: 0.95 }}
                        >
                            Start
                        </motion.button>
                    )}
                </div>
                 {isActive && <p className="mt-4 text-light-text-secondary dark:text-dark-text-secondary">{cyclesLeft} cycles left</p>}
            </div>
        </div>
    );
};

export default BreathingPage;
