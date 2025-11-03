import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Sparkles, Wind } from 'lucide-react';
import { useAppContext } from '../App';
import Header from './Header';
import { MORNING_GREETINGS, AFTERNOON_GREETINGS, EVENING_GREETINGS, DAILY_THOUGHTS } from '../constants';
import { View } from '../types';

const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}

const HomePage: React.FC = () => {
  const { userProfile, vibrate, navigateTo, playUISound, triggerMagicTransition } = useAppContext();
  const [greeting, setGreeting] = useState('');
  const [thought, setThought] = useState('');
  const auraAiButtonRef = useRef<HTMLButtonElement>(null);

  const greetingContent = useMemo(() => {
    if (!greeting) return '';
    const firstDotIndex = greeting.indexOf('.');
    // Ensure there's text after the first period to break onto a new line.
    if (firstDotIndex > -1 && firstDotIndex < greeting.length - 1) {
        const part1 = greeting.substring(0, firstDotIndex + 1);
        const part2 = greeting.substring(firstDotIndex + 1);
        return (
            <>
                {part1}
                <br className="hidden md:block" />
                {part2.trim()}
            </>
        );
    }
    return greeting;
  }, [greeting]);

  const refreshContent = useCallback(() => {
    const tod = getTimeOfDay();
    
    let greetingList: string[];
    if (tod === 'morning') greetingList = MORNING_GREETINGS;
    else if (tod === 'afternoon') greetingList = AFTERNOON_GREETINGS;
    else greetingList = EVENING_GREETINGS;

    const randomGreeting = greetingList[Math.floor(Math.random() * greetingList.length)];
    const randomThought = DAILY_THOUGHTS[Math.floor(Math.random() * DAILY_THOUGHTS.length)];

    setGreeting(randomGreeting.replace('{name}', userProfile.name || 'friend'));
    setThought(randomThought);
  }, [userProfile.name]);


  useEffect(() => {
    refreshContent();
  }, [refreshContent, userProfile.name]);

  const handleRefresh = () => {
    vibrate();
    playUISound('tap');
    refreshContent();
  };
  
  const handleNavigate = (view: View) => {
      vibrate();
      playUISound('tap');
      navigateTo(view);
  };
  
  const handleAuraAiClick = () => {
    if (auraAiButtonRef.current) {
        const rect = auraAiButtonRef.current.getBoundingClientRect();
        const origin = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        };
        vibrate();
        playUISound('tap');
        triggerMagicTransition(origin, 'auraAI');
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <Header showCenteredMoodSelector={true} />
      <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
        <AnimatePresence mode="wait">
            <motion.div
              key={greeting + thought} // Change key to trigger animation on refresh
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 100, damping: 20, duration: 0.8 }}
              className="flex flex-col items-center"
            >
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-light-text dark:from-dark-text to-light-text-secondary dark:to-dark-text-secondary">
                {greetingContent}
              </h1>
              <p className="mt-4 max-w-md text-lg md:text-xl font-light text-light-text-secondary dark:text-dark-text-secondary">
                {thought}
              </p>
            </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-4 pb-28">
         <motion.button
            ref={auraAiButtonRef}
            onClick={handleAuraAiClick}
            className="relative inline-flex items-center justify-center rounded-full group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <div className="absolute -inset-px bg-flow-gradient bg-400% animate-gradient-flow rounded-full blur-sm opacity-75 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative flex items-center gap-2 px-6 py-3 bg-light-bg-secondary dark:bg-dark-bg-secondary rounded-full shadow-lg">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <span>Aura AI</span>
            </div>
        </motion.button>
        <motion.button 
            onClick={() => handleNavigate('breathing')}
            className="flex items-center gap-2 px-6 py-3 bg-light-glass dark:bg-dark-glass rounded-full border border-white/20 dark:border-white/10 shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Wind className="w-5 h-5 text-blue-400" />
            <span>Breathe</span>
        </motion.button>
        <motion.button 
          onClick={handleRefresh} 
          className="p-3 bg-light-glass dark:bg-dark-glass rounded-full border border-white/20 dark:border-white/10 shadow-lg"
          aria-label="Refresh content"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <RefreshCw className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
};

export default HomePage;