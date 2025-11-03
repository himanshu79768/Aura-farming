import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { useAppContext } from '../App';
import { MUSIC_PRESETS } from '../constants';
import Header from './Header';

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const MusicPill: React.FC = () => (
    <div className="absolute bottom-12 flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-purple-600 via-pink-500 through-blue-500 to-teal-400 bg-400% animate-gradient-flow rounded-full shadow-lg">
        <div className="flex items-end gap-1.5 h-6">
            <motion.div className="w-1.5 bg-white/80 rounded-full" initial={{ height: '20%' }} animate={{ height: ['20%', '100%', '20%'] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 0.1 }} />
            <motion.div className="w-1.5 bg-white/80 rounded-full" initial={{ height: '50%' }} animate={{ height: ['50%', '30%', '80%', '50%'] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }} />
            <motion.div className="w-1.5 bg-white/80 rounded-full" initial={{ height: '80%' }} animate={{ height: ['80%', '40%', '100%', '80%'] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }} />
            <motion.div className="w-1.5 bg-white/80 rounded-full" initial={{ height: '30%' }} animate={{ height: ['30%', '90%', '30%'] }} transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }} />
        </div>
        <span className="text-base font-medium text-white/90">Rain Drops</span>
    </div>
);

const FlowPage: React.FC = () => {
    const { navigateBack, addFocusSession, settings, playFocusSound, vibrate } = useAppContext();
    const [mode, setMode] = useState<'counting' | 'focus' | 'break' | 'finished'>('counting');
    const [countdown, setCountdown] = useState(3);
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (mode === 'finished') return;

        const interval = setInterval(() => {
            if (mode === 'counting') {
                setCountdown(prev => {
                    if (prev <= 1) {
                        playFocusSound(settings.focusSound);
                        vibrate('medium');
                        setMode('focus');
                        setTimeLeft(25 * 60);
                        return 0; // Countdown is done
                    }
                    return prev - 1;
                });
            } else if (mode === 'focus' || mode === 'break') {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        if (mode === 'focus') {
                            addFocusSession(25 * 60, 'Flow Session');
                            vibrate('heavy');
                            playFocusSound(settings.focusSound);
                            setMode('break');
                            return 5 * 60;
                        } else { // mode is 'break'
                            vibrate('heavy');
                            playFocusSound(settings.focusSound);
                            setMode('finished');
                            return 0;
                        }
                    }
                    return prev - 1;
                });
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [mode, addFocusSession, settings.focusSound, playFocusSound, vibrate]);


    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.muted = !settings.sound;

        const manageAudio = async () => {
            try {
                if (mode === 'focus' && settings.sound) {
                    if (audio.paused) {
                        await audio.play();
                    }
                } else {
                    if (!audio.paused) {
                        audio.pause();
                    }
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error("Audio operation failed:", error);
                }
            }
        };

        manageAudio();
    }, [mode, settings.sound]);

    const rainDropsSrc = MUSIC_PRESETS.find(m => m.name === 'Rain Drops')?.src || '';

    return (
        <div className="w-full h-full flex flex-col">
            <Header title="Flow Mode" showBackButton onBack={navigateBack} />
            <audio ref={audioRef} loop src={rainDropsSrc} />

            <div className="relative z-10 flex-grow flex flex-col items-center justify-center h-full w-full text-center">
                <AnimatePresence mode="wait">
                    {mode === 'finished' ? (
                        <motion.div
                            key="finished"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center"
                        >
                            <CheckCircle size={80} className="text-green-400 mb-4" />
                            <h2 className="text-3xl font-bold">Flow Complete</h2>
                            <p className="text-light-text-secondary dark:text-dark-text-secondary mt-2">You focused for 25 minutes. Great work.</p>
                            <button
                                onClick={navigateBack}
                                className="mt-8 px-8 py-3 bg-light-glass dark:bg-dark-glass rounded-full font-semibold text-lg border border-white/10"
                            >
                                Done
                            </button>
                        </motion.div>
                    ) : mode === 'counting' ? (
                         <motion.div
                            key="countdown"
                            initial={{ opacity: 0, scale: 1.2 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className="flex flex-col items-center"
                        >
                            <h1 className="text-9xl md:text-[10rem] font-thin tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400 dark:to-gray-500">
                                {countdown}
                            </h1>
                            <p className="text-light-text-secondary dark:text-dark-text-secondary mt-2">Get ready to focus...</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="timer"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center"
                        >
                             <h1 className="text-9xl md:text-[10rem] font-thin tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400 dark:to-gray-500" style={{ fontFeatureSettings: "'tnum' on, 'lnum' on" }}>
                                {formatTime(timeLeft)}
                            </h1>
                            <MusicPill />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default FlowPage;