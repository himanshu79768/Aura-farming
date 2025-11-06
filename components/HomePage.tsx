import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Sparkles, Wind, Gauge, Check, Plus, Calendar as CalendarIcon, CalendarDays, CloudSun, BarChart3, TrendingUp, Clock, Timer as TimerIcon } from 'lucide-react';
import { useAppContext } from '../App';
import Header from './Header';
import { MORNING_GREETINGS, AFTERNOON_GREETINGS, EVENING_GREETINGS, DAILY_THOUGHTS } from '../constants';
import HomeCalendarWidget from './HomeCalendarWidget';
import DaysCountdownWidget from './DaysCountdownWidget';
import { View, WidgetType } from '../types';
import CompactCalendarWidget from './CompactCalendarWidget';
import WeatherWidget from './WeatherWidget';
import StatsWidget from './StatsWidget';
import FocusAnalyticsWidget from './FocusAnalyticsWidget';
import AnalogClockWidget from './AnalogClockWidget';
import DigitalClockWidget from './DigitalClockWidget';

interface WidgetSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentWidget: WidgetType;
    onSelectWidget: (widget: WidgetType) => void;
}

const WIDGETS = [
    { id: 'calendar', name: 'Calendar', icon: <CalendarIcon size={32} /> },
    { id: 'analog-clock', name: 'Analog Clock', icon: <Clock size={32} /> },
    { id: 'stats', name: 'Focus Stats', icon: <BarChart3 size={32} /> },
    { id: 'weather', name: 'Weather', icon: <CloudSun size={32} /> },
    { id: 'digital-clock', name: 'Digital Clock', icon: <TimerIcon size={32} /> },
    { id: 'focus-analytics', name: 'Focus Analytics', icon: <TrendingUp size={32} /> },
    { id: 'compact-calendar', name: 'Compact Calendar', icon: <CalendarDays size={32} /> },
    { id: 'countdown', name: 'Days Countdown', icon: <Gauge size={32} /> },
] as const;


const widgetCovers: Record<WidgetType, string> = {
    calendar: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3e%3crect width='100' height='100' fill='%23a78bfa' /%3e%3crect x='10' y='10' width='80' height='80' rx='8' fill='white'/%3e%3crect x='10' y='10' width='80' height='20' rx='8' ry='8' fill='%23f87171'/%3e%3cg fill='%23a1a1aa'%3e%3crect x='20' y='40' width='10' height='10' rx='2'/%3e%3crect x='35' y='40' width='10' height='10' rx='2'/%3e%3crect x='50' y='40' width='10' height='10' rx='2'/%3e%3crect x='65' y='40' width='10' height='10' rx='2'/%3e%3crect x='80' y='40' width='10' height='10' rx='2'/%3e%3crect x='20' y='55' width='10' height='10' rx='2'/%3e%3crect x='35' y='55' width='10' height='10' rx='2'/%3e%3crect x='50' y='55' width='10' height='10' rx='2' fill='%2360a5fa' stroke='%233b82f6' stroke-width='1'/%3e%3crect x='65' y='55' width='10' height='10' rx='2'/%3e%3crect x='80' y='55' width='10' height='10' rx='2'/%3e%3crect x='20' y='70' width='10' height='10' rx='2'/%3e%3c/g%3e%3c/svg%3e")`,
    stats: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3e%3crect width='100' height='100' fill='hsl(142, 70%25, 70%25)' /%3e%3crect x='10' y='10' width='80' height='80' rx='8' fill='white'/%3e%3ctext x='50' y='45' font-family='sans-serif' font-size='24' font-weight='bold' text-anchor='middle' fill='%231a1a1a'%3e45%3c/text%3e%3ctext x='50' y='60' font-family='sans-serif' font-size='8' text-anchor='middle' fill='%23606060'%3eMINUTES%3c/text%3e%3crect x='20' y='70' width='60' height='8' rx='4' fill='%23f1f5f9' /%3e%3crect x='20' y='70' width='45' height='8' rx='4' fill='hsl(142, 60%25, 45%25)' /%3e%3c/svg%3e")`,
    weather: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3e%3crect width='100' height='100' fill='hsl(221, 90%25, 75%25)' /%3e%3crect x='10' y='10' width='80' height='80' rx='8' fill='white'/%3e%3ccircle cx='50' cy='40' r='15' fill='%23facc15' /%3e%3ctext x='50' y='75' font-family='sans-serif' font-size='16' font-weight='bold' text-anchor='middle' fill='%231a1a1a'%3eSunny%3c/text%3e%3c/svg%3e")`,
    countdown: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 100'%3e%3crect width='200' height='100' fill='%23f472b6' /%3e%3cdefs%3e%3clinearGradient id='g' x1='0' y1='0' x2='0' y2='1'%3e%3cstop offset='0%25' stop-color='rgba(0,0,0,0.2)'/%3e%3cstop offset='100%25' stop-color='rgba(0,0,0,0)'/%3e%3c/linearGradient%3e%3c/defs%3e%3ccircle cx='100' cy='50' r='40' fill='rgba(255,255,255,0.1)' stroke='rgba(255,255,255,0.3)' stroke-width='4' /%3e%3cpath d='M 100 10 A 40 40 0 0 1 140 50' fill='none' stroke='white' stroke-width='6' stroke-linecap='round'/%3e%3ccircle cx='100' cy='50' r='4' fill='white'/%3e%3crect width='200' height='100' fill='url(%23g)' /%3e%3c/svg%3e")`,
    'compact-calendar': `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 100'%3e%3crect width='200' height='100' fill='%2327272a'/%3e%3ctext x='15' y='25' font-family='sans-serif' font-size='10' font-weight='bold' fill='%23ef4444'%3eFRIDAY%3c/text%3e%3ctext x='15' y='65' font-family='sans-serif' font-size='40' font-weight='200' fill='white'%3e26%3c/text%3e%3ctext x='15' y='85' font-family='sans-serif' font-size='10' fill='%23a1a1aa'%3eNo events today%3c/text%3e%3ctext x='110' y='25' font-family='sans-serif' font-size='10' font-weight='bold' fill='%23ef4444'%3eJULY%3c/text%3e%3ccircle cx='155' cy='60' r='8' fill='%23ef4444' /%3e%3ctext x='150' y='64' font-family='sans-serif' font-size='10' fill='white'%3e26%3c/text%3e%3c/svg%3e")`,
    'focus-analytics': `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3e%3crect width='100' height='100' fill='hsl(262, 85%25, 80%25)' /%3e%3crect x='10' y='10' width='80' height='80' rx='8' fill='white'/%3e%3crect x='20' y='60' width='10' height='20' rx='2' fill='%23c084fc'/%3e%3crect x='35' y='45' width='10' height='35' rx='2' fill='%23c084fc'/%3e%3crect x='50' y='50' width='10' height='30' rx='2' fill='%23c084fc'/%3e%3crect x='65' y='30' width='10' height='50' rx='2' fill='%23c084fc'/%3e%3ctext x='50' y='30' font-family='sans-serif' font-size='10' font-weight='bold' text-anchor='middle' fill='%231a1a1a'%3eWeekly Focus%3c/text%3e%3c/svg%3e")`,
    'analog-clock': `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3e%3crect width='100' height='100' fill='%2360a5fa' /%3e%3ccircle cx='50' cy='50' r='40' fill='white' stroke='%23e5e7eb' stroke-width='2'/%3e%3cline x1='50' y1='50' x2='50' y2='30' stroke='%231a1a1a' stroke-width='3' stroke-linecap='round'/%3e%3cline x1='50' y1='50' x2='70' y2='50' stroke='%231a1a1a' stroke-width='2' stroke-linecap='round'/%3e%3ccircle cx='50' cy='50' r='3' fill='%231a1a1a'/%3e%3c/svg%3e")`,
    'digital-clock': `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 100'%3e%3crect width='200' height='100' fill='%234ade80' /%3e%3ctext x='100' y='60' font-family='monospace' font-size='40' font-weight='bold' text-anchor='middle' fill='white'%3e10:10%3c/text%3e%3ctext x='100' y='80' font-family='sans-serif' font-size='12' text-anchor='middle' fill='white' opacity='0.8'%3eTuesday, July 23%3c/text%3e%3c/svg%3e")`,
};

const WidgetSelectionModal: React.FC<WidgetSelectionModalProps> = ({ isOpen, onClose, currentWidget, onSelectWidget }) => {
    const { vibrate, playUISound } = useAppContext();

    const handleSelect = (widgetId: WidgetType) => {
        vibrate();
        playUISound('tap');
        onSelectWidget(widgetId);
        onClose();
    };

    return (
        <AnimatePresence>
        {isOpen && (
            <motion.div
                className="fixed inset-0 z-[60] bg-transparent backdrop-blur-[1.5px] flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="w-full max-w-sm bg-light-bg-secondary/80 dark:bg-dark-bg-secondary/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-3xl flex flex-col max-h-[90vh]"
                    onClick={e => e.stopPropagation()}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                    <div className="flex-shrink-0 p-6 text-center border-b border-white/10">
                        <h1 className="text-2xl font-bold text-light-text dark:text-dark-text">
                            Widget Stack
                        </h1>
                    </div>

                    <div className="overflow-y-auto p-6">
                        <div className="grid grid-cols-2 gap-4">
                            {WIDGETS.map(widget => (
                                 <motion.button
                                    key={widget.id}
                                    onClick={() => handleSelect(widget.id as WidgetType)}
                                    className={`relative flex flex-col overflow-hidden bg-transparent rounded-xl border-2 transition-colors aspect-square ${
                                        currentWidget === widget.id ? 'border-light-primary dark:border-dark-primary' : 'border-transparent hover:border-white/20'
                                    }`}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <div 
                                        className="flex-grow w-full bg-cover bg-center rounded-t-lg" 
                                        style={{ 
                                            backgroundImage: widgetCovers[widget.id as WidgetType],
                                            backgroundSize: 'cover',
                                        }}
                                    ></div>
                                    <div className="flex-shrink-0 w-full flex flex-col items-center justify-center p-2 text-center h-12">
                                        <span className="text-xs font-medium">{widget.name}</span>
                                    </div>
                                    {currentWidget === widget.id && (
                                        <div className="absolute top-2 right-2 w-5 h-5 bg-light-primary dark:bg-dark-primary rounded-full flex items-center justify-center">
                                            <Check size={12} className="text-white"/>
                                        </div>
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        )}
        </AnimatePresence>
    );
};


const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}

const HomePage: React.FC = () => {
  const { userProfile, vibrate, navigateTo, playUISound, triggerMagicTransition, settings, setSettings } = useAppContext();
  const [greeting, setGreeting] = useState('');
  const [thought, setThought] = useState('');
  const auraAiButtonRef = useRef<HTMLButtonElement>(null);
  
  const selectedWidget = settings.homeWidget || 'calendar';
  const setSelectedWidget = (widget: WidgetType) => {
    setSettings(s => ({ ...s, homeWidget: widget }));
  };

  const [isWidgetSelectionOpen, setIsWidgetSelectionOpen] = useState(false);
  const longPressTimer = useRef<number>();
  
  const handleWidgetPointerDown = () => {
      longPressTimer.current = window.setTimeout(() => {
          vibrate();
          setIsWidgetSelectionOpen(true);
      }, 500); // 500ms for long press
  };

  const handleWidgetPointerUp = () => {
      clearTimeout(longPressTimer.current);
  };

  const renderWidget = () => {
      switch (selectedWidget) {
          case 'calendar':
              return <HomeCalendarWidget onMonthChange={() => refreshContent(false)} />;
          case 'weather':
              return <WeatherWidget />;
          case 'stats':
              return <StatsWidget />;
          case 'focus-analytics':
              return <FocusAnalyticsWidget />;
          case 'countdown':
              return <DaysCountdownWidget />;
          case 'compact-calendar':
              return <CompactCalendarWidget />;
          case 'analog-clock':
              return <AnalogClockWidget />;
          case 'digital-clock':
              return <DigitalClockWidget />;
          default:
              return <HomeCalendarWidget onMonthChange={() => refreshContent(false)} />;
      }
  };

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

  const refreshContent = useCallback((vibrateFeedback = true) => {
    const tod = getTimeOfDay();
    
    let greetingList: string[];
    if (tod === 'morning') greetingList = MORNING_GREETINGS;
    else if (tod === 'afternoon') greetingList = AFTERNOON_GREETINGS;
    else greetingList = EVENING_GREETINGS;

    const randomGreeting = greetingList[Math.floor(Math.random() * greetingList.length)];
    const randomThought = DAILY_THOUGHTS[Math.floor(Math.random() * DAILY_THOUGHTS.length)];

    setGreeting(randomGreeting.replace('{name}', userProfile.name || 'friend'));
    setThought(randomThought);
    if (vibrateFeedback) {
        vibrate();
        playUISound('tap');
    }
  }, [userProfile.name, vibrate, playUISound]);


  useEffect(() => {
    refreshContent(false); // don't vibrate on initial load
  }, [refreshContent, userProfile.name]);
  
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

  const isLargeWidget = ['calendar', 'weather', 'stats', 'focus-analytics', 'analog-clock'].includes(selectedWidget);
  const isMediumWidget = selectedWidget === 'compact-calendar';
  const widgetHeight = isLargeWidget ? 'h-[300px]' : isMediumWidget ? 'h-52' : 'h-36';

  return (
    <div className="w-full h-full flex flex-col">
      <Header showCenteredMoodSelector={true} />
      
      <div className={`flex-grow w-full flex flex-col items-center ${!(settings.showHomeWidget ?? true) ? 'justify-center' : !isLargeWidget ? 'justify-end' : 'justify-center'} text-center px-8 -mt-16 md:-mt-20 pb-12 transition-all duration-300 ease-in-out`}>
        {/* Greeting Section */}
        <AnimatePresence mode="wait">
            <motion.div
              key={greeting + thought} // Change key to trigger animation on refresh
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="flex flex-col items-center mb-2"
            >
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-light-text dark:from-dark-text to-light-text-secondary/80 dark:to-dark-text-secondary/80">
                {greetingContent}
              </h1>
              <p className="mt-3 max-w-md text-base md:text-lg font-light text-light-text-secondary dark:text-dark-text-secondary">
                {thought}
              </p>
            </motion.div>
        </AnimatePresence>

        {/* Widget Container */}
        <AnimatePresence>
            {(settings.showHomeWidget ?? true) && (
                <motion.div
                    className="w-full max-w-md mt-6 flex flex-col items-center"
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                >
                    <div 
                        className={`relative w-full ${widgetHeight} ${(settings.transparentWidget ?? false) ? '' : 'bg-light-glass/80 dark:bg-dark-glass/80 backdrop-blur-md rounded-2xl border border-white/10'} transition-all duration-300 ease-in-out opacity-90`}
                        onPointerDown={handleWidgetPointerDown}
                        onPointerUp={handleWidgetPointerUp}
                        onPointerLeave={handleWidgetPointerUp}
                        title="Long-press to change widget"
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={selectedWidget}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3 }}
                                className="w-full h-full"
                            >
                                {renderWidget()}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* Bottom Buttons */}
      <div className="flex-shrink-0 flex items-center justify-center gap-4 pb-28 md:pb-12">
         <motion.button
            ref={auraAiButtonRef}
            onClick={handleAuraAiClick}
            className="relative inline-flex items-center justify-center rounded-full group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <div className="absolute -inset-px bg-flow-gradient bg-400% animate-gradient-flow rounded-full blur-sm opacity-75 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative flex items-center gap-2 px-5 py-2.5 bg-light-bg-secondary dark:bg-dark-bg-secondary rounded-full shadow-lg text-sm md:text-base">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <span>Aura AI</span>
            </div>
        </motion.button>
        <motion.button 
            onClick={() => handleNavigate('breathing')}
            className="flex items-center gap-2 px-5 py-2.5 bg-light-glass dark:bg-dark-glass rounded-full border border-white/20 dark:border-white/10 shadow-lg text-sm md:text-base"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Wind className="w-5 h-5 text-blue-400" />
            <span>Breathe</span>
        </motion.button>
        <motion.button 
          onClick={() => refreshContent()} 
          className="p-3 bg-light-glass dark:bg-dark-glass rounded-full border border-white/20 dark:border-white/10 shadow-lg"
          aria-label="Refresh content"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }} 
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <RefreshCw className="w-5 h-5" />
        </motion.button>
      </div>
      <WidgetSelectionModal 
          isOpen={isWidgetSelectionOpen}
          onClose={() => setIsWidgetSelectionOpen(false)}
          currentWidget={selectedWidget}
          onSelectWidget={setSelectedWidget}
      />
    </div>
  );
};

export default HomePage;