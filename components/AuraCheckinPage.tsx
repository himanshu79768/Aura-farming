import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wind, CheckCircle, Zap, Heart } from 'lucide-react';
import { useAppContext } from '../App';
import { fetchAuraCheckin } from '../services/geminiService';
import Header from './Header';
import { Mood } from '../types';

const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}

interface AuraData {
    auraReading: string;
    affirmation: string;
    suggestion: string;
}

const moodStyles: Record<Mood, { color: string; button: string, aura: { main: string; glow: string; scan: string } }> = {
    [Mood.Calm]: {
        color: '#3b82f6', // blue-500
        button: 'text-blue-400',
        aura: { main: 'rgba(59, 130, 246, 0.2)', glow: 'rgba(96, 165, 250, 0.5)', scan: '#93c5fd' }
    },
    [Mood.Focus]: {
        color: '#a855f7', // purple-500
        button: 'text-purple-400',
        aura: { main: 'rgba(168, 85, 247, 0.2)', glow: 'rgba(192, 132, 252, 0.5)', scan: '#d8b4fe' }
    },
    [Mood.Energize]: {
        color: '#f59e0b', // amber-500
        button: 'text-yellow-400',
        aura: { main: 'rgba(245, 158, 11, 0.2)', glow: 'rgba(250, 204, 21, 0.5)', scan: '#fde047' }
    },
};

const AuraScanner: React.FC<{ mood: Mood }> = ({ mood }) => {
    const colors = moodStyles[mood].aura;
    return (
        <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Background glow */}
            <motion.div
                className="absolute w-full h-full rounded-full"
                style={{ background: `radial-gradient(circle, transparent 40%, ${colors.glow} 100%)` }}
                animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            
            {/* Main "breathing" circle */}
            <motion.div
                className="absolute w-3/4 h-3/4 rounded-full border-2"
                style={{ borderColor: colors.glow }}
                animate={{ scale: [1, 0.95, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Scan line container */}
            <div className="absolute w-full h-full rounded-full overflow-hidden">
                <motion.div
                    className="absolute top-0 left-0 w-full h-1.5"
                    style={{ background: `radial-gradient(ellipse at center, ${colors.scan} 0%, transparent 70%)` }}
                    animate={{ y: ['-10%', '100%'] }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        repeatType: 'reverse',
                        ease: 'easeInOut'
                    }}
                />
            </div>
            
            <p className="text-light-text-secondary dark:text-dark-text-secondary z-10">Reading your aura...</p>
        </div>
    );
};


const AuraCheckinPage: React.FC = () => {
    const { navigateBack, navigateTo, mood, userProfile, playSound, vibrate } = useAppContext();
    const [isLoading, setIsLoading] = useState(true);
    const [auraData, setAuraData] = useState<AuraData | null>(null);

    useEffect(() => {
        const getAuraData = async () => {
            setIsLoading(true);
            vibrate('light');
            const data = await fetchAuraCheckin(mood, userProfile.name || 'friend', getTimeOfDay());
            setAuraData(data);
            setIsLoading(false);
            vibrate('medium');
            playSound('complete');
        };
        getAuraData();
    }, [mood, userProfile.name, playSound, vibrate]);
    
    const handleSuggestionClick = () => {
        if (auraData?.suggestion.toLowerCase().includes('breath')) {
            navigateTo('breathing');
        } else {
            navigateBack();
        }
    }

    return (
        <div className="w-full h-full flex flex-col bg-light-bg dark:bg-dark-bg">
            <Header title="Your Aura" showBackButton onBack={navigateBack} />
            <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <motion.div
                            key="loader"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                        >
                            <AuraScanner mood={mood} />
                        </motion.div>
                    ) : (
                        auraData && (
                            <div className="relative w-full max-w-md">
                                <motion.div 
                                    style={{ backgroundColor: moodStyles[mood].color }}
                                    className={`absolute -inset-16 rounded-full blur-3xl opacity-20 dark:opacity-15`}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: [1, 1.05, 1], opacity: [0.2, 0.3, 0.2] }}
                                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                                />
                                <motion.div
                                    key="content"
                                    initial="hidden"
                                    animate="visible"
                                    variants={{
                                        hidden: { opacity: 0 },
                                        visible: {
                                            opacity: 1,
                                            transition: { staggerChildren: 0.3, delayChildren: 0.2 }
                                        }
                                    }}
                                    className="w-full space-y-8 relative z-10"
                                >
                                    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                                        <div className="flex items-center justify-center gap-3 mb-2">
                                            <Zap className="w-5 h-5 text-purple-400"/>
                                            <h2 className="text-sm font-semibold tracking-widest uppercase text-light-text-secondary dark:text-dark-text-secondary">Your Aura Today</h2>
                                        </div>
                                        <p className="text-xl">{auraData.auraReading}</p>
                                    </motion.div>
                                    
                                    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                                        <div className="px-4 py-6 bg-light-glass dark:bg-dark-glass rounded-2xl border border-white/10">
                                            <div className="flex items-center justify-center gap-3 mb-2">
                                                <Heart className="w-5 h-5 text-red-400"/>
                                                <h2 className="text-sm font-semibold tracking-widest uppercase text-light-text-secondary dark:text-dark-text-secondary">Affirmation</h2>
                                            </div>
                                            <p className="text-2xl font-semibold">"{auraData.affirmation}"</p>
                                        </div>
                                    </motion.div>

                                    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                                        <h2 className="text-sm font-semibold tracking-widest uppercase text-light-text-secondary dark:text-dark-text-secondary">Try This</h2>
                                         <button onClick={handleSuggestionClick} className={`mt-2 flex items-center justify-center gap-2 w-full px-6 py-4 bg-light-glass dark:bg-dark-glass rounded-full shadow-lg text-lg font-medium border border-white/20 dark:border-white/10 ${moodStyles[mood].button}`}>
                                            {auraData.suggestion.toLowerCase().includes('breath') ? <Wind className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                                            <span>{auraData.suggestion}</span>
                                        </button>
                                    </motion.div>
                                </motion.div>
                            </div>
                        )
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AuraCheckinPage;