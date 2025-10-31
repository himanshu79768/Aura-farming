import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Loader, Sparkles, Wind } from 'lucide-react';
import { useAppContext } from '../App';
import { fetchHomepageContent } from '../services/geminiService';
import Header from './Header';

const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' => {
  // Fix: Removed extra 'new' keyword.
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}

const HomePage: React.FC = () => {
  const { mood, userProfile, playSound, vibrate, navigateTo } = useAppContext();
  const [content, setContent] = useState({ greeting: '', thought: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [timeOfDay, setTimeOfDay] = useState(getTimeOfDay());

  const loadContent = useCallback(async () => {
    setIsLoading(true);
    const newContent = await fetchHomepageContent(mood, userProfile.name || 'friend', timeOfDay);
    setContent(newContent);
    setIsLoading(false);
  }, [mood, userProfile.name, timeOfDay]);

  useEffect(() => {
    const intervalId = setInterval(() => {
        setTimeOfDay(getTimeOfDay());
    }, 5 * 60 * 1000); // Update every 5 minutes
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (userProfile.name) {
      loadContent();
    } else {
        setContent({ greeting: `Good ${timeOfDay}, friend.`, thought: 'Let\'s get you set up. Your name can be added in your profile.' });
        setIsLoading(false);
    }
  }, [loadContent, userProfile.name, timeOfDay]);

  const handleRefresh = () => {
    vibrate();
    setTimeOfDay(getTimeOfDay());
    loadContent();
  };

  return (
    <div className="w-full h-full flex flex-col">
      <Header showCenteredMoodSelector={true} />
      <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Loader className="w-12 h-12 animate-spin text-light-text-secondary dark:text-dark-text-secondary" />
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 100, damping: 20, duration: 0.8 }}
              className="flex flex-col items-center"
            >
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-light-text dark:from-dark-text to-light-text-secondary dark:to-dark-text-secondary">
                {content.greeting}
              </h1>
              <p className="mt-4 max-w-md text-lg md:text-xl font-light text-light-text-secondary dark:text-dark-text-secondary">
                {content.thought}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-4 pb-28">
         <motion.button 
            onClick={() => navigateTo('auraCheckin')}
            className="flex items-center gap-2 px-6 py-3 bg-light-glass dark:bg-dark-glass rounded-full border border-white/20 dark:border-white/10 shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <span>Check Aura</span>
        </motion.button>
        <motion.button 
            onClick={() => navigateTo('breathing')}
            className="flex items-center gap-2 px-6 py-3 bg-light-glass dark:bg-dark-glass rounded-full border border-white/20 dark:border-white/10 shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Wind className="w-5 h-5 text-blue-400" />
            <span>Breathe</span>
        </motion.button>
        <motion.button 
          onClick={handleRefresh} 
          className="p-3 bg-light-glass dark:bg-dark-glass rounded-full border border-white/20 dark:border-white/10 shadow-lg"
          aria-label="Refresh content"
          disabled={isLoading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </motion.button>
      </div>
    </div>
  );
};

export default HomePage;
