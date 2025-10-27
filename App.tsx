import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Theme, Mood, View, Settings, Quote, UserProfile, JournalEntry, FocusSession, UserData } from './types';
import HomePage from './components/HomePage';
import FocusPage from './components/FocusPage';
import QuotesPage from './components/QuotesPage';
import SettingsPage from './components/SettingsPage';
import ProfilePage from './components/ProfilePage';
import BreathingPage from './components/BreathingPage';
import OnboardingScreen from './components/OnboardingScreen';
import IntroductionScreen from './components/IntroductionScreen';
import BottomNav from './components/BottomNav';
import AuraCheckinPage from './components/AuraCheckinPage';
import JournalPage from './components/JournalPage';
import JournalEntryPage from './components/JournalEntryPage';
import { fetchQuotes } from './services/geminiService';
import { INITIAL_QUOTES } from './constants';
import TimerPill from './components/TimerPill';
import DeleteZone from './components/DeleteZone';
import FavoritesPage from './components/FavoritesPage';
import FocusHistoryPage from './components/FocusHistoryPage';
import FocusAnalyticsPage from './components/FocusAnalyticsPage';
import SoundOptionsPage from './components/SoundOptionsPage';

const { 
    auth, db, signInAnonymously, signOut, onAuthStateChanged, ref, onValue, 
    set, update, push, remove, serverTimestamp, query, orderByChild, equalTo, get
} = (window as any).firebase;

interface AppContextType {
  mood: Mood;
  setMood: (mood: Mood) => void;
  settings: Settings;
  setSettings: (settings: Settings | ((s: Settings) => Settings)) => void;
  quotes: Quote[];
  setQuotes: (quotes: Quote[]) => void;
  favoriteQuotes: string[];
  toggleFavorite: (id: string) => void;
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile | ((p: UserProfile) => UserProfile)) => void;
  journalEntries: JournalEntry[];
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => void;
  updateJournalEntry: (entry: JournalEntry) => void;
  deleteJournalEntry: (id: string) => void;
  focusHistory: FocusSession[];
  addFocusSession: (durationInSeconds: number, name?: string) => void;
  playSound: (sound: string) => void;
  vibrate: (style?: 'light' | 'medium' | 'heavy') => void;
  navigateTo: (view: View, params?: any) => void;
  navigateBack: () => void;
  timeLeft: number;
  timerDuration: number;
  isTimerActive: boolean;
  isTimerFinished: boolean;
  selectTimerDuration: (minutes: number) => void;
  toggleTimer: () => void;
  resetTimer: () => void;
  setIsPillDragging: (isDragging: boolean) => void;
  sessionName: string;
  setSessionName: (name: string) => void;
  focusSearchQuery: string;
  setFocusSearchQuery: (query: string) => void;
  logoutUser: () => void;
  loginUserByName: (name: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// --- Motion Variants & Transitions ---
const pageVariants = { initial: { opacity: 0, scale: 0.98 }, in: { opacity: 1, scale: 1 }, out: { opacity: 0, scale: 0.98 } };
const modalVariants = { initial: { opacity: 0, y: '100%' }, in: { opacity: 1, y: '0%' }, out: { opacity: 0, y: '100%' } };
const pageTransition = { type: 'tween', ease: 'easeInOut', duration: 0.3 };
const modalTransition = { type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.35 };
const moodFromColors: Record<Mood, string> = {
  [Mood.Calm]: 'from-blue-400/20',
  [Mood.Focus]: 'from-purple-400/20',
  [Mood.Energize]: 'from-yellow-400/20',
};

// --- Default States ---
const DEFAULT_SETTINGS: Settings = {
    theme: Theme.Auto, sound: true, haptics: true, minimalism: false,
    focusSound: 'chime', appIcon: 'default', hapticIntensity: 'medium', focusMusic: 'Rain Drops',
};
const DEFAULT_PROFILE: UserProfile = { name: '', completedSessions: 0 };
const DEFAULT_USER_DATA: UserData = {
    ...DEFAULT_SETTINGS,
    ...DEFAULT_PROFILE,
    mood: Mood.Calm,
    favoriteQuotes: {},
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  // App State
  const [currentView, setCurrentView] = useState<View>('home');
  const [activeModal, setActiveModal] = useState<{ view: View; params?: any } | null>(null);
  const [mood, setMood] = useState<Mood>(Mood.Calm);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [quotes, setQuotes] = useState<Quote[]>(INITIAL_QUOTES);
  const [favoriteQuotes, setFavoriteQuotes] = useState<string[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [focusHistory, setFocusHistory] = useState<FocusSession[]>([]);
  const [focusSearchQuery, setFocusSearchQuery] = useState('');
  
  // Timer state
  const [timerState, setTimerState] = useState({ duration: 15 * 60, endTime: 0, isActive: false });
  const [timeLeft, setTimeLeft] = useState(timerState.duration);
  const [isTimerFinished, setIsTimerFinished] = useState(false);
  const [sessionName, setSessionName] = useState('');

  const [isPillDragging, setIsPillDragging] = useState(false);
  const constraintsRef = useRef(null);
  const [appHeight, setAppHeight] = useState('100vh');

  // --- Firebase Auth & Data Sync ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: any) => {
      if (user) {
        setCurrentUser(user);
      } else {
        signInAnonymously().catch((error: any) => console.error("Anonymous sign-in failed:", error));
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const userRef = ref(db, 'users/' + currentUser.uid);
    const unsubscribeUser = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val() as UserData & { journalEntries?: Record<string, any>, focusHistory?: Record<string, any> };
            setUserProfile({ name: data.name || '', completedSessions: data.completedSessions || 0 });
            setSettings({
                theme: data.theme || Theme.Auto, sound: data.sound ?? true, haptics: data.haptics ?? true,
                minimalism: data.minimalism ?? false, focusSound: data.focusSound || 'chime', appIcon: data.appIcon || 'default',
                hapticIntensity: data.hapticIntensity || 'medium', focusMusic: data.focusMusic || 'Rain Drops',
            });
            setMood(data.mood || Mood.Calm);
            setFavoriteQuotes(data.favoriteQuotes ? Object.keys(data.favoriteQuotes) : []);

            const journalEntriesArray = data.journalEntries 
                ? Object.entries(data.journalEntries).map(([id, entry]) => ({ id, ...entry } as JournalEntry)).sort((a,b) => b.createdAt - a.createdAt)
                : [];
            setJournalEntries(journalEntriesArray);
            
            const focusHistoryArray = data.focusHistory
                ? Object.entries(data.focusHistory).map(([id, session]) => ({ id, ...session } as FocusSession)).sort((a,b) => b.createdAt - a.createdAt)
                : [];
            setFocusHistory(focusHistoryArray);

        } else {
            set(userRef, DEFAULT_USER_DATA);
        }
        setIsLoading(false);
    });

    return () => unsubscribeUser();
  }, [currentUser]);
  
  const vibrate = useCallback((style: 'light' | 'medium' | 'heavy' = 'light') => {
    if (navigator.vibrate && settings.hapticIntensity !== 'off') {
        let intensity: number | number[] = 10;
        if (settings.hapticIntensity === 'medium') {
            if (style === 'medium') intensity = [10, 50, 10];
            else if (style === 'heavy') intensity = 50;
        }
        navigator.vibrate(intensity);
    }
  }, [settings.hapticIntensity]);

  const updateUserData = useCallback((data: Partial<UserData>) => {
    if (!currentUser) return;
    update(ref(db, 'users/' + currentUser.uid), data);
  }, [currentUser]);

  const handleSetMood = (newMood: Mood) => updateUserData({ mood: newMood });
  const handleSetSettings = (value: Settings | ((s: Settings) => Settings)) => {
    const newSettings = value instanceof Function ? value(settings) : value;
    updateUserData(newSettings);
  };
   const handleSetUserProfile = (value: UserProfile | ((p: UserProfile) => UserProfile)) => {
    const newProfile = value instanceof Function ? value(userProfile) : value;
    updateUserData(newProfile);
  };
  
   const loginUserByName = useCallback(async (name: string) => {
    if (!currentUser) return;
    setIsLoggingIn(true);

    const usersRef = ref(db, 'users');
    const nameQuery = query(usersRef, orderByChild('name'), equalTo(name));
    
    try {
        const snapshot = await get(nameQuery);
        if (snapshot.exists()) {
            const [[oldUserUid, oldUserData]] = Object.entries(snapshot.val());
            
            if (oldUserUid !== currentUser.uid) {
                const newUserRef = ref(db, `users/${currentUser.uid}`);
                await set(newUserRef, { ...(oldUserData as object), name });
                const oldUserRef = ref(db, `users/${oldUserUid}`);
                await remove(oldUserRef);
            }
        } else {
            handleSetUserProfile(p => ({ ...p, name }));
            setShowIntro(true);
        }
    } catch (error) {
        console.error("Error during login by name:", error);
        handleSetUserProfile(p => ({ ...p, name }));
        setShowIntro(true);
    } finally {
        setIsLoggingIn(false);
    }
  }, [currentUser]);

  const logoutUser = useCallback(async () => {
      vibrate();
      await signOut(auth);
      setCurrentUser(null);
      setIsLoading(true);
      setUserProfile(DEFAULT_PROFILE);
      setSettings(DEFAULT_SETTINGS);
      setMood(Mood.Calm);
      setFavoriteQuotes([]);
      setJournalEntries([]);
      setFocusHistory([]);
      setShowIntro(false);
  }, [vibrate]);

  useEffect(() => {
    const initialHeight = window.innerHeight;
    setAppHeight(`${initialHeight}px`);
    const handleResize = () => { if (window.innerHeight >= initialHeight - 50) setAppHeight(`${window.innerHeight}px`); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // This effect is now only for the main app, OnboardingScreen handles its own theme
    if (userProfile.name) {
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', settings.theme === Theme.Auto ? isSystemDark : settings.theme === Theme.Dark);
    }
  }, [settings.theme, userProfile.name]);

  useEffect(() => {
    let animationFrameId: number;
    const updateTimer = () => {
      if (timerState.isActive && timerState.endTime > 0) {
        const remaining = Math.round((timerState.endTime - Date.now()) / 1000);
        if (remaining <= 0) {
          setTimeLeft(0);
          setTimerState(s => ({ ...s, isActive: false }));
          setIsTimerFinished(true);
          addFocusSession(timerState.duration, sessionName);
        } else {
          setTimeLeft(remaining);
        }
      }
      animationFrameId = requestAnimationFrame(updateTimer);
    };
    animationFrameId = requestAnimationFrame(updateTimer);
    return () => cancelAnimationFrame(animationFrameId);
  }, [timerState]);

  const playSound = useCallback((sound: string) => settings.sound && console.log(`Playing sound: ${sound}`), [settings.sound]);
  
  const navigateTo = (view: View, params?: any) => {
    if (['settings', 'breathing', 'auraCheckin', 'journalEntry', 'favorites', 'focusHistory', 'focusAnalytics', 'soundOptions'].includes(view)) {
        setActiveModal({ view, params });
    } else {
        setCurrentView(view);
    }
  };
  const navigateBack = () => {
    if (activeModal?.view === 'focusAnalytics') setActiveModal({ view: 'focusHistory' });
    else setActiveModal(null);
  };
  const toggleFavorite = (id: string) => {
    if (!currentUser) return;
    vibrate();
    const favRef = ref(db, `users/${currentUser.uid}/favoriteQuotes/${id}`);
    if (favoriteQuotes.includes(id)) {
        remove(favRef);
    } else {
        set(favRef, true);
    }
  };
  const addJournalEntry = (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => {
    if (!currentUser) return;
    const journalRef = ref(db, `users/${currentUser.uid}/journalEntries`);
    const newEntryRef = push(journalRef);
    set(newEntryRef, { ...entry, createdAt: serverTimestamp() });
  };
  const updateJournalEntry = (updatedEntry: JournalEntry) => {
    if (!currentUser) return;
    const { id, ...data } = updatedEntry;
    const entryRef = ref(db, `users/${currentUser.uid}/journalEntries/${id}`);
    update(entryRef, data);
  };
  const deleteJournalEntry = (id: string) => {
    if (!currentUser) return;
    const entryRef = ref(db, `users/${currentUser.uid}/journalEntries/${id}`);
    remove(entryRef);
  };
  const addFocusSession = (durationInSeconds: number, name?: string) => {
    playSound(settings.focusSound);
    vibrate('heavy');
    if (!currentUser) return;
    const historyRef = ref(db, `users/${currentUser.uid}/focusHistory`);
    const newSessionRef = push(historyRef);
    set(newSessionRef, {
      date: new Date().toISOString(), duration: durationInSeconds, name: name || '', createdAt: serverTimestamp()
    });
    updateUserData({ completedSessions: (userProfile.completedSessions || 0) + 1 });
  };
  const selectTimerDuration = (minutes: number) => {
      vibrate();
      const newDuration = minutes * 60;
      setTimerState({ duration: newDuration, endTime: 0, isActive: false });
      setTimeLeft(newDuration);
      setIsTimerFinished(false);
  };
  const toggleTimer = () => {
    if (isTimerFinished) { resetTimer(false); return; }
    if (timerState.isActive) {
      setTimerState(s => ({ ...s, isActive: false }));
    } else if (timeLeft > 0) {
      setTimerState(s => ({ ...s, isActive: true, endTime: Date.now() + timeLeft * 1000 }));
    }
  };
  const resetTimer = (vibrateFeedback = true) => {
    if (vibrateFeedback) vibrate();
    setTimerState(s => ({ ...s, endTime: 0, isActive: false }));
    setTimeLeft(timerState.duration);
    setIsTimerFinished(false);
    setSessionName('');
  };
  
  // --- Render Logic ---
  const renderView = () => {
    switch (currentView) {
      case 'home': return <HomePage />;
      case 'focus': return <FocusPage />;
      case 'quotes': return <QuotesPage />;
      case 'profile': return <ProfilePage />;
      case 'journal': return <JournalPage />;
      default: return <HomePage />;
    }
  };
  const renderModal = () => {
    if (!activeModal) return null;
    switch (activeModal.view) {
      case 'settings': return <SettingsPage />;
      case 'breathing': return <BreathingPage />;
      case 'auraCheckin': return <AuraCheckinPage />;
      case 'journalEntry': return <JournalEntryPage {...activeModal.params} />;
      case 'favorites': return <FavoritesPage />;
      case 'focusHistory': return <FocusHistoryPage />;
      case 'focusAnalytics': return <FocusAnalyticsPage />;
      case 'soundOptions': return <SoundOptionsPage />;
      default: return null;
    }
  }

  if (isLoading) {
    return <div className="w-screen h-screen bg-light-bg dark:bg-dark-bg" />;
  }
  
  const shouldOnboard = !userProfile.name;
  const shouldShowIntro = showIntro && userProfile.name;

  return (
    <AppContext.Provider value={{ 
        mood, setMood: handleSetMood, settings, setSettings: handleSetSettings, quotes, setQuotes, favoriteQuotes, toggleFavorite,
        userProfile, setUserProfile: handleSetUserProfile, journalEntries, addJournalEntry, updateJournalEntry, deleteJournalEntry,
        focusHistory, addFocusSession, playSound, vibrate, navigateTo, navigateBack,
        timeLeft, timerDuration: timerState.duration, isTimerActive: timerState.isActive, isTimerFinished,
        selectTimerDuration, toggleTimer, resetTimer, setIsPillDragging, sessionName, setSessionName,
        focusSearchQuery, setFocusSearchQuery,
        logoutUser, loginUserByName
    }}>
      <main ref={constraintsRef} style={{ height: appHeight }} className={`w-screen overflow-hidden relative font-sans text-light-text dark:text-dark-text bg-light-bg dark:bg-dark-bg transition-colors duration-500`}>
        <AnimatePresence mode="wait">
            {shouldOnboard ? (
                <OnboardingScreen 
                    key="onboarding"
                    onComplete={loginUserByName} 
                    isLoading={isLoggingIn} 
                />
            ) : shouldShowIntro ? (
                <IntroductionScreen
                    key="intro"
                    onComplete={() => setShowIntro(false)}
                    userName={userProfile.name}
                />
            ) : (
                <motion.div key="main-app" className="w-full h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                    <div className={`absolute bottom-0 left-0 right-0 h-[50%] bg-gradient-to-t ${moodFromColors[mood]} to-transparent transition-opacity duration-1000 opacity-60 dark:opacity-40 pointer-events-none`}></div>
                    
                    <AnimatePresence mode="wait"><motion.div key={currentView} variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition} className="w-full h-full">{renderView()}</motion.div></AnimatePresence>
                    <AnimatePresence>{activeModal && (<motion.div key={activeModal.view} variants={modalVariants} initial="initial" animate="in" exit="out" transition={modalTransition} className="absolute inset-0 z-30 bg-light-bg dark:bg-dark-bg">{renderModal()}</motion.div>)}</AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>

        {!shouldOnboard && !shouldShowIntro && (
            <>
                <AnimatePresence>{timerState.isActive && currentView !== 'focus' && (<TimerPill constraintsRef={constraintsRef} />)}</AnimatePresence>
                <AnimatePresence>{isPillDragging && <DeleteZone />}</AnimatePresence>
                <BottomNav currentView={currentView} navigateTo={navigateTo} />
            </>
        )}
      </main>
    </AppContext.Provider>
  );
}