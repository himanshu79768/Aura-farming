import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Edit, Check, Award, Maximize, Minimize, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppContext } from '../App';
import Header from './Header';
import { Mood, TopicNode } from '../types';
import { MUSIC_PRESETS, SESSION_COMPLETE_AFFIRMATIONS } from '../constants';
import SyllabusCard from './SyllabusCard';
import FlipClock from './FlipClock';

const FOCUS_DURATIONS = [5, 10, 15, 20];
const POMODORO_DURATIONS = { focus: 25 * 60, shortBreak: 5 * 60, longBreak: 15 * 60 };
const SESSIONS_BEFORE_LONG_BREAK = 3;

const moodColors: Record<Mood, { gradient: [string, string, string], shine: string, particle: string }> = {
    [Mood.Calm]: { gradient: ['#3b82f6', '#60a5fa', '#818cf8'], shine: '#60a5fa', particle: '#60a5fa' },
    [Mood.Focus]: { gradient: ['#a855f7', '#c084fc', '#f472b6'], shine: '#c084fc', particle: '#c084fc' },
    [Mood.Energize]: { gradient: ['#f59e0b', '#facc15', '#fb923c'], shine: '#facc15', particle: '#facc15' },
};

const TimerRing: React.FC<{ progress: number; mood: Mood; isShining: boolean }> = ({ progress, mood, isShining }) => {
    const radius = 100;
    const circumference = 2 * Math.PI * radius;
    const gradientId = `timer-gradient-${mood}`;
    const colors = moodColors[mood];
    const smoothProgress = useSpring(progress, { stiffness: 30, damping: 20 });
    const strokeDashoffset = useTransform(smoothProgress, (p) => circumference - p * circumference);
    
    useEffect(() => { smoothProgress.set(progress); }, [progress, smoothProgress]);

    return (
        <div className="relative w-72 h-72 flex items-center justify-center">
            <svg className="w-72 h-72 absolute" viewBox="0 0 240 240">
                <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={colors.gradient[0]} />
                        <stop offset="50%" stopColor={colors.gradient[1]} />
                        <stop offset="100%" stopColor={colors.gradient[2]} />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>
                <circle cx="120" cy="120" r={radius} strokeWidth="12" className="stroke-current text-gray-200 dark:text-gray-800" fill="transparent"/>
                <AnimatePresence>
                    {isShining && (
                        <motion.circle cx="120" cy="120" r={radius} strokeWidth="12" stroke={colors.shine} fill="transparent" filter="url(#glow)" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.6, 0] }} exit={{ opacity: 0 }} transition={{ duration: 1, ease: "easeInOut" }}/>
                    )}
                </AnimatePresence>
                <motion.circle cx="120" cy="120" r={radius} strokeWidth="12" stroke={`url(#${gradientId})`} fill="transparent" strokeLinecap="round" transform="rotate(-90 120 120)" style={{ strokeDasharray: circumference, strokeDashoffset }}/>
            </svg>
        </div>
    );
};

const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
};

const formatTimerTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const calculateProgress = (node: TopicNode): number => {
  const children = node.children || [];
  if (children.length === 0) return node.isCompleted ? 100 : 0;
  const total = children.reduce((acc, child) => acc + calculateProgress(child), 0);
  return total / children.length;
};

const FocusPage: React.FC = () => {
  const { settings, setSettings, focusHistory, vibrate, mood, timeLeft, timerDuration, isTimerActive, isTimerFinished, selectTimerDuration, toggleTimer, resetTimer, sessionName, setSessionName, sessionSubject, setSessionSubject, navigateTo, addFocusSession, showAlertModal } = useAppContext();
  
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [modeIndex, setModeIndex] = useState(0);
  const modes = ['timer', 'pomodoro'] as const;
  const mode = modes[modeIndex];
  const [pomodoroState, setPomodoroState] = useState<{ round: number; phase: 'focus' | 'shortBreak' | 'longBreak' }>({ round: 1, phase: 'focus' });
  const [isCustomInput, setIsCustomInput] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const [showShine, setShowShine] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const timerContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const tingAudioRef = useRef<HTMLAudioElement>(null);

  // Dashboard calculations
  const overallProgress = useMemo(() => {
      if (!settings.syllabus || settings.syllabus.length === 0) return 0;
      const total = settings.syllabus.reduce((acc, node) => acc + calculateProgress(node), 0);
      return total / settings.syllabus.length;
  }, [settings.syllabus]);

  const todayTimeSpent = useMemo(() => {
      const today = new Date().toDateString();
      return focusHistory
          .filter(session => new Date(session.date).toDateString() === today)
          .reduce((acc, session) => acc + session.duration, 0);
  }, [focusHistory]);

  // Timer logic
  const timerStateRef = useRef({ isTimerActive, timeLeft, timerDuration, sessionName, sessionSubject, mode, pomodoroState, isTimerFinished });
  useEffect(() => {
      timerStateRef.current = { isTimerActive, timeLeft, timerDuration, sessionName, sessionSubject, mode, pomodoroState, isTimerFinished };
  });

  useEffect(() => {
      return () => {
          const { isTimerActive, timeLeft, timerDuration, sessionName, sessionSubject, mode, pomodoroState, isTimerFinished } = timerStateRef.current;
          const isPaused = !isTimerActive && timeLeft < timerDuration && timeLeft > 0 && !isTimerFinished;
          if (isPaused) {
              const elapsed = timerDuration - timeLeft;
              if (elapsed >= 300) {
                  const name = sessionName || sessionSubject || (mode === 'pomodoro' ? `Pomodoro: ${pomodoroState.phase}` : '');
                  addFocusSession(elapsed, name, sessionSubject);
              }
          }
      };
  }, [addFocusSession]);

  useEffect(() => {
      if (isTimerFinished && tingAudioRef.current) {
          tingAudioRef.current.play().catch(e => console.log('Audio play failed', e));
      }
      if (mode !== 'pomodoro' || !isTimerFinished) return;
      const startNextPhase = () => {
          setShowShine(true);
          setTimeout(() => setShowShine(false), 1000);
          if (pomodoroState.phase === 'focus') {
              const isLongBreakTime = pomodoroState.round % SESSIONS_BEFORE_LONG_BREAK === 0;
              if (isLongBreakTime) {
                  setPomodoroState(s => ({ ...s, phase: 'longBreak' }));
                  selectTimerDuration(POMODORO_DURATIONS.longBreak / 60, false);
              } else {
                  setPomodoroState(s => ({ ...s, phase: 'shortBreak' }));
                  selectTimerDuration(POMODORO_DURATIONS.shortBreak / 60, false);
              }
          } else {
              const newRound = pomodoroState.phase === 'longBreak' ? 1 : pomodoroState.round + 1;
              setPomodoroState({ round: newRound, phase: 'focus' });
              selectTimerDuration(POMODORO_DURATIONS.focus / 60, false);
          }
      }
      const timer = setTimeout(startNextPhase, 5000);
      return () => clearTimeout(timer);
  }, [isTimerFinished, mode, selectTimerDuration, pomodoroState]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !settings.sound;
    const manageAudioPlayback = async () => {
      try {
        const selectedMusic = MUSIC_PRESETS.find(m => m.name === settings.focusMusic);
        const newSrc = selectedMusic ? selectedMusic.src : '';
        if (audio.src !== newSrc) audio.src = newSrc;
        const shouldPlay = isTimerActive && settings.focusMusic !== 'None';
        if (shouldPlay) {
          if (audio.paused && audio.src) await audio.play();
        } else {
          if (!audio.paused) audio.pause();
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') console.error("Audio operation failed:", error);
      }
    };
    manageAudioPlayback();
  }, [isTimerActive, settings.focusMusic, settings.sound]);

  const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
          timerContainerRef.current?.requestFullscreen().catch(err => {
              console.log(`Error attempting to enable fullscreen: ${err.message}`);
          });
          if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
              window.screen.orientation.lock('landscape').catch(e => console.log(e));
          }
      } else {
          document.exitFullscreen();
          if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
              window.screen.orientation.unlock();
          }
      }
  };

  useEffect(() => {
      const handleFullscreenChange = () => {
          setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handlePlaySubject = (subject: string) => {
      setActiveSubject(subject);
      setSessionSubject(subject);
      setSessionName(subject);
      setSelectedChapterId('');
      setSelectedUnitId('');
      setSelectedTopicId('');
  };

  const handleBackToDashboard = () => {
      if (isTimerActive) {
          showAlertModal({ title: "Timer Active", message: "Please pause or stop the timer before going back." });
          return;
      }
      setActiveSubject(null);
  };

  const handleSave = () => {
      vibrate();
      const elapsed = timerDuration - timeLeft;
      if (elapsed >= 300) {
        const name = sessionName || sessionSubject || (mode === 'pomodoro' ? `Pomodoro: ${pomodoroState.phase}` : '');
        addFocusSession(elapsed, name, sessionSubject);
        showAlertModal({ title: "Session Saved", message: `You've saved a ${Math.round(elapsed / 60)} minute session.`, type: 'success' });
      } else if (elapsed > 1) {
        showAlertModal({ title: "Session Not Saved", message: "Focus sessions must be at least 5 minutes to be recorded." });
      }
      if (mode === 'pomodoro') {
          setPomodoroState({ round: 1, phase: 'focus' });
          selectTimerDuration(POMODORO_DURATIONS.focus / 60);
          setSessionName(sessionSubject || '');
      } else {
          resetTimer();
      }
  };

  const progress = timerDuration === 0 ? 0 : (timerDuration - timeLeft) / timerDuration;

  const getSubjectBgColor = (title: string) => {
    if (title.includes('ACCOUNTING')) return 'bg-blue-500 hover:bg-blue-600 text-white';
    if (title.includes('LAWS')) return 'bg-slate-500 hover:bg-slate-600 text-white';
    if (title.includes('APTITUDE')) return 'bg-yellow-500 hover:bg-yellow-600 text-white';
    if (title.includes('ECONOMICS')) return 'bg-red-500 hover:bg-red-600 text-white';
    return 'bg-light-accent hover:bg-light-accent/90 text-white';
  };

  if (activeSubject) {
      const isPaused = !isTimerActive && timeLeft < timerDuration && timeLeft > 0 && !isTimerFinished;
      const subjectColorClass = getSubjectBgColor(activeSubject);
      
      const activeSubjectNode = settings.syllabus?.find(s => s.title === activeSubject);
      const chapters = activeSubjectNode?.children || [];
      const activeChapterNode = chapters.find(c => c.id === selectedChapterId);
      const units = activeChapterNode?.children || [];
      const activeUnitNode = units.find(u => u.id === selectedUnitId);
      const topics = activeUnitNode?.children || [];

      const updateSessionName = (chapterId: string, unitId: string, topicId: string) => {
          const chapter = chapters.find(c => c.id === chapterId)?.title || '';
          const unit = units.find(u => u.id === unitId)?.title || '';
          const parts = [activeSubject, chapter, unit].filter(Boolean);
          if (parts.length > 0) {
              setSessionName(parts.join(' : '));
          } else {
              setSessionName(activeSubject || '');
          }
      };

      return (
          <div ref={timerContainerRef} className={`w-full h-full flex flex-col ${isFullscreen ? 'bg-white dark:bg-black' : ''}`}>
              <audio ref={audioRef} loop />
              <audio ref={tingAudioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" />
              
              {!isFullscreen && <Header title={activeSubject} leftNode={<button onClick={handleBackToDashboard} className="p-2"><ChevronLeft /></button>} />}
              
              <div className="flex-grow p-4 flex flex-col items-center justify-center relative">
                  {isTimerActive && isFullscreen && (
                      <button onClick={toggleFullscreen} className="absolute top-4 right-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-full z-50">
                          <Minimize size={24} />
                      </button>
                  )}
                  {isTimerActive && !isFullscreen && (
                      <button onClick={toggleFullscreen} className="absolute top-4 right-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-full z-50">
                          <Maximize size={24} />
                      </button>
                  )}

                  <div className="flex justify-center items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-full w-full max-w-xs mb-6">
                      {modes.map((m, index) => (
                          <button 
                            key={m} 
                            onClick={() => { 
                                if (isTimerActive) return;
                                setModeIndex(index); 
                                if (modes[index] === 'pomodoro') {
                                    setPomodoroState({ round: 1, phase: 'focus' });
                                    selectTimerDuration(POMODORO_DURATIONS.focus / 60, false);
                                } else {
                                    resetTimer(); 
                                }
                            }} 
                            disabled={isTimerActive}
                            className={`relative w-full py-2 text-sm font-medium rounded-full capitalize transition-colors ${modeIndex === index ? 'text-gray-900 dark:text-white' : 'text-gray-500'} ${isTimerActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                              <span>{m}</span>
                              {modeIndex === index && <motion.div layoutId="focus-mode" className="absolute inset-0 bg-white dark:bg-gray-700 rounded-full shadow-sm z-[-1]" />}
                          </button>
                      ))}
                  </div>

                  {mode === 'pomodoro' && (
                      <p className="text-gray-500 dark:text-gray-400 mb-4 font-medium uppercase tracking-widest text-sm">
                          {pomodoroState.phase === 'focus' ? `Focus Round ${pomodoroState.round}` : pomodoroState.phase === 'shortBreak' ? 'Short Break' : 'Long Break'}
                      </p>
                  )}

                  <div className="relative flex items-center justify-center mb-6 scale-90">
                      {isFullscreen ? (
                          <FlipClock seconds={timeLeft} />
                      ) : (
                          <>
                              <TimerRing progress={progress} mood={mood} isShining={showShine} />
                              <div className="absolute text-5xl font-mono font-bold tracking-tighter text-gray-900 dark:text-white">{formatTimerTime(timeLeft)}</div>
                          </>
                      )}
                  </div>

                  <div className="w-full max-w-sm flex flex-col gap-3 mb-6">
                      <select 
                          value={selectedChapterId} 
                          onChange={(e) => { 
                              setSelectedChapterId(e.target.value); 
                              setSelectedUnitId(''); 
                              setSelectedTopicId(''); 
                              updateSessionName(e.target.value, '', '');
                          }}
                          disabled={isTimerActive}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm disabled:opacity-50 text-gray-900 dark:text-white"
                      >
                          <option value="">Select Chapter...</option>
                          {chapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                      
                      {chapters.length > 0 && selectedChapterId && (
                          <select 
                              value={selectedUnitId} 
                              onChange={(e) => { 
                                  setSelectedUnitId(e.target.value); 
                                  setSelectedTopicId(''); 
                                  updateSessionName(selectedChapterId, e.target.value, '');
                              }}
                              disabled={isTimerActive}
                              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm disabled:opacity-50 text-gray-900 dark:text-white"
                          >
                              <option value="">Select Unit...</option>
                              {units.map(u => <option key={u.id} value={u.id}>{u.title}</option>)}
                          </select>
                      )}

                      {units.length > 0 && selectedUnitId && (
                          <select 
                              value={selectedTopicId} 
                              onChange={(e) => {
                                  setSelectedTopicId(e.target.value);
                                  updateSessionName(selectedChapterId, selectedUnitId, e.target.value);
                              }}
                              disabled={isTimerActive}
                              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm disabled:opacity-50 text-gray-900 dark:text-white"
                          >
                              <option value="">Select Topic...</option>
                              {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                          </select>
                      )}
                  </div>

                  {!isTimerActive && !isPaused && mode === 'timer' && (
                      <div className="flex flex-wrap justify-center gap-3 mb-6">
                          {FOCUS_DURATIONS.map(min => (
                              <button key={min} onClick={() => selectTimerDuration(min)} className={`px-5 py-2 rounded-full font-medium transition-colors ${timerDuration === min * 60 ? subjectColorClass : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>{min}m</button>
                          ))}
                          {isCustomInput ? (
                              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-1">
                                  <input 
                                      type="number" 
                                      value={customMinutes} 
                                      onChange={e => setCustomMinutes(e.target.value)} 
                                      className="w-12 bg-transparent text-center focus:outline-none dark:text-white text-gray-900 font-medium" 
                                      placeholder="Min"
                                      autoFocus
                                      onBlur={() => {
                                          if (customMinutes && !isNaN(Number(customMinutes)) && Number(customMinutes) > 0) {
                                              selectTimerDuration(Number(customMinutes));
                                          }
                                          setIsCustomInput(false);
                                      }}
                                      onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                              if (customMinutes && !isNaN(Number(customMinutes)) && Number(customMinutes) > 0) {
                                                  selectTimerDuration(Number(customMinutes));
                                              }
                                              setIsCustomInput(false);
                                          }
                                      }}
                                  />
                              </div>
                          ) : (
                              <button onClick={() => setIsCustomInput(true)} className={`px-5 py-2 rounded-full font-medium transition-colors ${!FOCUS_DURATIONS.includes(timerDuration / 60) && timerDuration > 0 ? subjectColorClass : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                                  {!FOCUS_DURATIONS.includes(timerDuration / 60) && timerDuration > 0 ? `${Math.floor(timerDuration / 60)}m` : 'Custom'}
                              </button>
                          )}
                      </div>
                  )}

                  <div className="flex items-center space-x-8">
                      <button onClick={() => resetTimer()} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-700 dark:text-gray-300"><RotateCcw size={24} /></button>
                      <button onClick={() => { vibrate(); toggleTimer(); }} className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-transform active:scale-95 ${subjectColorClass}`}>
                          {isTimerActive ? <Pause size={32} /> : <Play size={32} className="ml-2" />}
                      </button>
                      {isPaused ? (
                          <button onClick={handleSave} className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full"><Check size={24} /></button>
                      ) : (
                          <button onClick={() => navigateTo('soundOptions')} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-700 dark:text-gray-300">
                              {settings.sound ? <Volume2 size={24} /> : <VolumeX size={24} />}
                          </button>
                      )}
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="w-full h-full flex flex-col bg-light-bg dark:bg-dark-bg">
       <Header title="Focus"/>
       <div className="flex-grow p-4 overflow-y-auto">
            <div className="sticky top-0 z-10 bg-light-bg dark:bg-dark-bg pt-2 pb-4 flex justify-between items-center mb-2 gap-4">
                <div className="flex flex-col items-center justify-center bg-light-glass dark:bg-dark-glass p-4 rounded-2xl shadow-sm border border-white/20 dark:border-white/10 flex-1">
                    <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider mb-1">Completed</span>
                    <span className="text-2xl text-light-text dark:text-dark-text">{overallProgress.toFixed(2)}%</span>
                </div>
                <div className="flex flex-col items-center justify-center bg-light-glass dark:bg-dark-glass p-4 rounded-2xl shadow-sm border border-white/20 dark:border-white/10 flex-1">
                    <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider mb-1">Time Spent</span>
                    <span className="text-2xl text-light-text dark:text-dark-text">{formatTime(todayTimeSpent)}</span>
                </div>
            </div>
            
            <div className="flex flex-col">
                {(settings.syllabus || []).map(node => (
                    <SyllabusCard 
                        key={node.id} 
                        node={node} 
                        onUpdate={(updated) => {
                            const newSyllabus = settings.syllabus!.map(n => n.id === updated.id ? updated : n);
                            setSettings({ ...settings, syllabus: newSyllabus });
                        }}
                        onDelete={(id) => {
                            const newSyllabus = settings.syllabus!.filter(n => n.id !== id);
                            setSettings({ ...settings, syllabus: newSyllabus });
                        }}
                        onPlay={handlePlaySubject}
                        subjectTitle={node.title}
                        timeSpent={focusHistory.filter(s => s.subject === node.title).reduce((acc, s) => acc + s.duration, 0)}
                    />
                ))}
            </div>
       </div>
    </div>
  );
};

export default FocusPage;
