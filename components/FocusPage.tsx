import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Edit, Sparkles, Coffee, Book } from 'lucide-react';
import { useAppContext } from '../App';
import Header from './Header';
import { Mood } from '../types';
import { MUSIC_PRESETS } from '../constants';

const FOCUS_DURATIONS = [5, 10, 15, 20]; // in minutes
const POMODORO_DURATIONS = {
    focus: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
};
const SESSIONS_BEFORE_LONG_BREAK = 3;

const moodColors: Record<Mood, { gradient: [string, string, string], shine: string }> = {
    [Mood.Calm]: { gradient: ['#3b82f6', '#60a5fa', '#818cf8'], shine: '#60a5fa' }, // blue-500, blue-400, indigo-400
    [Mood.Focus]: { gradient: ['#a855f7', '#c084fc', '#f472b6'], shine: '#c084fc' }, // purple-500, purple-400, pink-400
    [Mood.Energize]: { gradient: ['#f59e0b', '#facc15', '#fb923c'], shine: '#facc15' }, // orange-500, yellow-400, orange-400
};

const TimerRing: React.FC<{ progress: number; mood: Mood; isShining: boolean }> = ({ progress, mood, isShining }) => {
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const gradientId = `timer-gradient-${mood}`;
    const colors = moodColors[mood];
    const smoothProgress = useSpring(progress, { stiffness: 30, damping: 20 });
    const strokeDashoffset = useTransform(smoothProgress, (p) => circumference - p * circumference);
    
    useEffect(() => {
        smoothProgress.set(progress);
    }, [progress, smoothProgress]);

    return (
        <div className="relative w-64 h-64 flex items-center justify-center">
            <svg className="w-64 h-64 absolute" viewBox="0 0 200 200">
                <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={colors.gradient[0]} />
                        <stop offset="50%" stopColor={colors.gradient[1]} />
                        <stop offset="100%" stopColor={colors.gradient[2]} />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                <circle cx="100" cy="100" r={radius} strokeWidth="10" className="stroke-current text-light-text/10 dark:text-dark-text/10" fill="transparent"/>
                <AnimatePresence>
                    {isShining && (
                        <motion.circle cx="100" cy="100" r={radius} strokeWidth="10" stroke={colors.shine} fill="transparent" filter="url(#glow)" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.6, 0] }} exit={{ opacity: 0 }} transition={{ duration: 1, ease: "easeInOut" }}/>
                    )}
                </AnimatePresence>
                <motion.circle cx="100" cy="100" r={radius} strokeWidth="10" stroke={`url(#${gradientId})`} fill="transparent" strokeLinecap="round" transform="rotate(-90 100 100)" style={{ strokeDasharray: circumference, strokeDashoffset }}/>
            </svg>
        </div>
    );
};

type PomodoroPhase = 'focus' | 'shortBreak' | 'longBreak';

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
  }),
};

const FocusPage: React.FC = () => {
  const modes = ['timer', 'pomodoro'] as const;
  const [modeIndex, setModeIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const mode = modes[modeIndex];

  const [pomodoroState, setPomodoroState] = useState<{ round: number; phase: PomodoroPhase }>({ round: 1, phase: 'focus' });
  const [isCustomInput, setIsCustomInput] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const [showShine, setShowShine] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const {
      settings, vibrate, mood,
      timeLeft, timerDuration, isTimerActive, isTimerFinished,
      selectTimerDuration, toggleTimer, resetTimer: resetTimerContext,
      sessionName, setSessionName, navigateTo, addFocusSession
  } = useAppContext();

  const resetPomodoro = () => {
      setPomodoroState({ round: 1, phase: 'focus' });
      selectTimerDuration(POMODORO_DURATIONS.focus / 60);
      resetTimerContext(false); // No vibrate on auto-reset
      setSessionName('');
  };

  const handleModeChange = (index: number) => {
    if (modeIndex === index) return;
    vibrate();
    setDirection(index > modeIndex ? 1 : -1);
    setModeIndex(index);
    if (modes[index] === 'pomodoro') {
        resetPomodoro();
    } else {
        resetTimerContext();
    }
  };
  
  // Pomodoro Logic
  useEffect(() => {
    if (mode !== 'pomodoro' || !isTimerActive) return;
    if (timeLeft > 1) return;

    const currentPhaseDuration = POMODORO_DURATIONS[pomodoroState.phase];
    addFocusSession(currentPhaseDuration, sessionName || `Pomodoro Cycle ${pomodoroState.round}`);
    
    if (pomodoroState.phase === 'focus') {
      const isLongBreak = pomodoroState.round % SESSIONS_BEFORE_LONG_BREAK === 0;
      if (isLongBreak) {
        setPomodoroState(prev => ({ ...prev, phase: 'longBreak' }));
        selectTimerDuration(POMODORO_DURATIONS.longBreak / 60);
      } else {
        setPomodoroState(prev => ({ ...prev, phase: 'shortBreak' }));
        selectTimerDuration(POMODORO_DURATIONS.shortBreak / 60);
      }
    } else { // 'shortBreak' or 'longBreak'
      setPomodoroState(prev => ({ round: prev.round + 1, phase: 'focus' }));
      selectTimerDuration(POMODORO_DURATIONS.focus / 60);
    }
  }, [timeLeft, isTimerActive, mode, pomodoroState]);


  // Audio Logic
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !settings.sound;

    const manageAudioPlayback = async () => {
      try {
        const selectedMusic = MUSIC_PRESETS.find(m => m.name === settings.focusMusic);
        const newSrc = selectedMusic ? selectedMusic.src : '';

        if (audio.src !== newSrc) {
          audio.src = newSrc;
        }

        const shouldPlay = isTimerActive && settings.focusMusic !== 'None';

        if (shouldPlay) {
          if (audio.paused && audio.src) {
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

    manageAudioPlayback();
  }, [isTimerActive, settings.focusMusic, settings.sound]);
  
  const handleReset = () => {
    vibrate();
    if (mode === 'pomodoro') {
      resetPomodoro();
    } else {
      resetTimerContext();
    }
  };

  const handleToggleTimer = () => {
    if (!isTimerActive && timeLeft > 0 && timeLeft === timerDuration) {
        vibrate();
        setShowShine(true);
        setTimeout(() => setShowShine(false), 1000);
    } else {
        vibrate();
    }
    toggleTimer();
  };

  const handleSetCustomDuration = () => {
    const minutes = parseInt(customMinutes, 10);
    if (!isNaN(minutes) && minutes > 0) {
        vibrate();
        selectTimerDuration(minutes);
        setIsCustomInput(false);
        setCustomMinutes('');
    }
  };

  const progress = useMemo(() => {
    if (timerDuration === 0) return 0;
    return (timerDuration - timeLeft) / timerDuration;
  }, [timeLeft, timerDuration]);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const ModeSelector = () => (
    <div className="flex justify-center items-center bg-black/5 dark:bg-white/5 p-1 rounded-full w-full max-w-xs mb-4">
        {modes.map((m, index) => (
            <button 
                key={m} 
                onClick={() => handleModeChange(index)} 
                className={`relative w-full py-2 text-sm font-medium rounded-full capitalize transition-colors ${modeIndex === index ? 'text-light-text dark:text-dark-text' : 'text-light-text-secondary dark:text-dark-text-secondary'}`}
            >
            <span>{m}</span>
            {modeIndex === index && <motion.div layoutId="focus-mode-selector" className="absolute inset-0 bg-light-bg-secondary dark:bg-dark-bg-secondary rounded-full shadow-md z-[-1]" />}
            </button>
        ))}
    </div>
  );

  const renderTimerContent = () => (
    <AnimatePresence mode="wait">
        {isTimerFinished ? (
          <motion.div key="finished-timer" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="text-center">
            <h2 className="text-3xl font-bold">Done beautifully.</h2>
            <p className="mt-2 text-light-text-secondary dark:text-dark-text-secondary">{sessionName}</p>
            <button onClick={toggleTimer} className="mt-8 flex items-center gap-2 px-6 py-3 bg-light-glass dark:bg-dark-glass rounded-full border border-white/20 dark:border-white/10 shadow-lg">
                <RotateCcw className="w-5 h-5" />
                <span>Start New Session</span>
            </button>
          </motion.div>
        ) : (
          <motion.div key="timer-active" className="flex flex-col items-center justify-center w-full">
              <div className="relative flex items-center justify-center">
                  <TimerRing progress={progress} mood={mood} isShining={showShine} />
                  <div className="absolute text-5xl font-mono tracking-tighter pointer-events-none">{formatTime(timeLeft)}</div>
              </div>
              <div className="w-full max-w-xs my-6">
                  <input type="text" value={sessionName} onChange={(e) => setSessionName(e.target.value)} placeholder="Name your session (e.g., Chapter 1)" disabled={isTimerActive} className="w-full px-4 py-3 bg-light-glass/80 dark:bg-dark-glass/80 rounded-full border border-white/10 focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary transition-all text-center placeholder:text-light-text-secondary dark:placeholder:text-dark-text-secondary disabled:opacity-50"/>
              </div>
              <div className="flex space-x-2 mb-8 items-center justify-center h-10">
                  <AnimatePresence mode="wait">
                  {isCustomInput ? (
                      <motion.div key="custom-input" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2">
                          <input type="number" value={customMinutes} onChange={(e) => setCustomMinutes(e.target.value)} placeholder="Mins" className="w-20 px-4 py-2 bg-transparent border-b-2 border-white/20 focus:border-white/50 focus:outline-none text-center" autoFocus/>
                          <button onClick={handleSetCustomDuration} className="px-4 py-2 rounded-full bg-light-accent dark:bg-dark-accent text-light-bg dark:text-dark-bg">Set</button>
                          <button onClick={() => setIsCustomInput(false)} className="px-4 py-2 rounded-full bg-light-glass dark:bg-dark-glass">Cancel</button>
                      </motion.div>
                  ) : (
                      <motion.div key="presets" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex space-x-2">
                          {FOCUS_DURATIONS.map(min => (<button key={min} onClick={() => selectTimerDuration(min)} className={`px-4 py-2 rounded-full border transition-colors ${timerDuration === min * 60 && !isTimerActive ? 'bg-light-accent dark:bg-dark-accent text-light-bg dark:text-dark-bg border-transparent' : 'bg-transparent border-white/20 dark:border-white/10'}`}>{min}m</button>))}
                          <button onClick={() => { vibrate(); setIsCustomInput(true); }} className="p-2.5 rounded-full border bg-transparent border-white/20 dark:border-white/10"><Edit size={16} /></button>
                      </motion.div>
                  )}
                  </AnimatePresence>
              </div>
              <div className="relative flex items-center space-x-6">
                  <button onClick={() => handleReset()} className="p-4 bg-light-glass dark:bg-dark-glass rounded-full border border-white/20 dark:border-white/10 shadow-lg"><RotateCcw className="w-6 h-6" /></button>
                  <button onClick={handleToggleTimer} className="w-20 h-20 bg-light-accent dark:bg-dark-accent text-light-bg dark:text-dark-bg rounded-full flex items-center justify-center shadow-lg">{isTimerActive ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}</button>
                  <button onClick={() => navigateTo('soundOptions')} className="p-4 bg-light-glass dark:bg-dark-glass rounded-full border border-white/20 dark:border-white/10 shadow-lg">{settings.sound ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}</button>
              </div>
          </motion.div>
        )}
      </AnimatePresence>
  );

  const PomodoroStatus = () => {
    let icon, text;
    switch(pomodoroState.phase) {
      case 'focus':
        icon = <Book size={16}/>;
        text = `Focus #${pomodoroState.round}`;
        break;
      case 'shortBreak':
        icon = <Coffee size={16}/>;
        text = 'Short Break';
        break;
      case 'longBreak':
        icon = <Coffee size={16}/>;
        text = 'Long Break';
        break;
    }
    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-light-glass dark:bg-dark-glass rounded-full border border-white/10 text-sm mb-8">
            {icon}
            <span>{text}</span>
        </div>
    )
  };

  const renderPomodoroContent = () => (
    <div className="flex flex-col items-center justify-center w-full">
        <PomodoroStatus />
        <div className="relative flex items-center justify-center">
            <TimerRing progress={progress} mood={mood} isShining={showShine} />
            <div className="absolute text-5xl font-mono tracking-tighter pointer-events-none">{formatTime(timeLeft)}</div>
        </div>
        <div className="w-full max-w-xs my-6">
             <input type="text" value={sessionName} onChange={(e) => setSessionName(e.target.value)} placeholder="Name your session..." disabled={isTimerActive} className="w-full px-4 py-3 bg-light-glass/80 dark:bg-dark-glass/80 rounded-full border border-white/10 focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary transition-all text-center placeholder:text-light-text-secondary dark:placeholder:text-dark-text-secondary disabled:opacity-50"/>
        </div>
        <div className="h-10 mb-8" />
        <div className="relative flex items-center space-x-6">
            <button onClick={() => handleReset()} className="p-4 bg-light-glass dark:bg-dark-glass rounded-full border border-white/20 dark:border-white/10 shadow-lg"><RotateCcw className="w-6 h-6" /></button>
            <button onClick={handleToggleTimer} className="w-20 h-20 bg-light-accent dark:bg-dark-accent text-light-bg dark:text-dark-bg rounded-full flex items-center justify-center shadow-lg">{isTimerActive ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}</button>
            <button onClick={() => navigateTo('soundOptions')} className="p-4 bg-light-glass dark:bg-dark-glass rounded-full border border-white/20 dark:border-white/10 shadow-lg">{settings.sound ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}</button>
        </div>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col">
       <audio ref={audioRef} loop />
       <Header title="Focus"/>
       <div className="flex-grow p-4 overflow-hidden flex flex-col items-center justify-center">
        <ModeSelector />
        <motion.div
          className="relative flex flex-col items-center justify-center flex-grow w-full"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          onDragEnd={(e, { offset, velocity }) => {
            const swipe = swipePower(offset.x, velocity.x);
            if (swipe < -swipeConfidenceThreshold) { // swipe left
              if (modeIndex === 0) handleModeChange(1);
            } else if (swipe > swipeConfidenceThreshold) { // swipe right
              if (modeIndex === 1) handleModeChange(0);
            }
          }}
        >
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={modeIndex}
              className="absolute w-full h-full flex flex-col items-center justify-center"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 }
              }}
            >
              {mode === 'timer' ? renderTimerContent() : renderPomodoroContent()}
            </motion.div>
          </AnimatePresence>
        </motion.div>
       </div>
    </div>
  );
};

export default FocusPage;