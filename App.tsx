import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Theme, Mood, View, Settings, Quote, UserProfile, JournalEntry, FocusSession, UserData, Attachment } from './types';
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
import JournalViewPage from './components/JournalViewPage';
import { INITIAL_QUOTES } from './constants';
import TimerPill from './components/TimerPill';
import DeleteZone from './components/DeleteZone';
import FavoritesPage from './components/FavoritesPage';
import FocusHistoryPage from './components/FocusHistoryPage';
import FocusAnalyticsPage from './components/FocusAnalyticsPage';
import SoundOptionsPage from './components/SoundOptionsPage';
import ConfirmationModal from './components/ConfirmationModal';
import { useVirtualKeyboard } from './hooks/useVirtualKeyboard';
import AlertModal from './components/AlertModal';
import SessionLinkingPage from './components/SessionLinkingPage';
import LinkedJournalsPage from './components/LinkedJournalsPage';
import AttachmentViewerPage from './components/AttachmentViewerPage';

const { 
    auth, db, signInAnonymously, signOut, onAuthStateChanged, ref, onValue, 
    set, update, push, remove, serverTimestamp, query, orderByChild, equalTo, get,
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
  updateUserName: (newName: string) => Promise<{ success: boolean; message?: string }>;
  journalEntries: JournalEntry[];
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => Promise<boolean>;
  updateJournalEntry: (entry: JournalEntry) => Promise<boolean>;
  deleteJournalEntry: (id: string) => Promise<boolean>;
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
  showConfirmationModal: (options: { title: string; message: string; onConfirm: () => void; confirmText?: string; }) => void;
  showAlertModal: (options: { title: string; message: string; }) => void;
  currentUser: any | null;
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
// Fix: Corrected Transition type for framer-motion by using 'as const' to assert literal types.
const pageTransition = { type: 'tween' as const, ease: 'easeInOut' as const, duration: 0.3 };
// Fix: Corrected Transition type for framer-motion by using 'as const' to assert literal types.
const modalTransition = { type: 'tween' as const, ease: [0.32, 0.72, 0, 1] as const, duration: 0.35 };
const moodFromColors: Record<Mood, string> = {
  [Mood.Calm]: 'from-blue-400/25',
  [Mood.Focus]: 'from-purple-400/25',
  [Mood.Energize]: 'from-yellow-400/25',
};

// --- Default States ---
const DEFAULT_SETTINGS: Settings = {
    theme: Theme.Auto, sound: true, haptics: true, minimalism: false,
    focusSound: 'chime', appIcon: 'default', hapticIntensity: 'medium', focusMusic: 'Rain Drops',
    gradientIntensity: 75,
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
  const [modalStack, setModalStack] = useState<{ view: View; params?: any }[]>([]);
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
  const isKeyboardOpen = useVirtualKeyboard();

  const [confirmationModalState, setConfirmationModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    confirmText: 'Confirm'
  });

  const [alertModalState, setAlertModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
  });

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
                gradientIntensity: data.gradientIntensity ?? 75,
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

  const updateUserName = useCallback(async (newName: string): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser) return { success: false, message: 'Not authenticated.' };

    const trimmedNewName = newName.trim();
    if (!trimmedNewName) return { success: false, message: 'Name cannot be empty.' };

    const oldName = userProfile.name.trim();
    if (trimmedNewName === oldName) return { success: true };

    const sanitizedNewName = trimmedNewName.toLowerCase();
    const sanitizedOldName = oldName.toLowerCase();

    const newUsernameRef = ref(db, `usernames/${sanitizedNewName}`);
    const snapshot = await get(newUsernameRef);
    if (snapshot.exists() && snapshot.val() !== currentUser.uid) {
      return { success: false, message: 'This name is already taken.' };
    }

    const updates: { [key: string]: any } = {};
    updates[`/users/${currentUser.uid}/name`] = trimmedNewName;
    updates[`/usernames/${sanitizedNewName}`] = currentUser.uid;
    if (sanitizedOldName && sanitizedOldName !== sanitizedNewName) {
      updates[`/usernames/${sanitizedOldName}`] = null;
    }
    
    try {
      await update(ref(db), updates);
      return { success: true };
    } catch (error) {
      console.error("Error updating username:", error);
      return { success: false, message: 'An error occurred.' };
    }
  }, [currentUser, userProfile.name]);
  
   const loginUserByName = useCallback(async (name: string) => {
    if (!currentUser) return;
    setIsLoggingIn(true);
    const trimmedName = name.trim();
    const sanitizedName = trimmedName.toLowerCase();
    const usernameRef = ref(db, `usernames/${sanitizedName}`);
    
    try {
        const snapshot = await get(usernameRef);
        if (snapshot.exists()) {
            const existingUserUid = snapshot.val();
            if (existingUserUid !== currentUser.uid) {
                const oldUserRef = ref(db, `users/${existingUserUid}`);
                const oldUserDataSnapshot = await get(oldUserRef);
                
                if (oldUserDataSnapshot.exists()) {
                    const oldUserData = oldUserDataSnapshot.val();
                    const updates: { [key: string]: any } = {};
                    updates[`/users/${currentUser.uid}`] = { ...oldUserData, name: trimmedName };
                    updates[`/users/${existingUserUid}`] = null;
                    updates[`/usernames/${sanitizedName}`] = currentUser.uid;
                    await update(ref(db), updates);
                }
            }
            setShowIntro(false);
        } else {
            const updates: { [key: string]: any } = {};
            updates[`/users/${currentUser.uid}`] = { ...DEFAULT_USER_DATA, name: trimmedName };
            updates[`/usernames/${sanitizedName}`] = currentUser.uid;
            await update(ref(db), updates);
            setShowIntro(true);
        }
    } catch (error) {
        console.error("Error during login by name:", error);
        const updates: { [key: string]: any } = {};
        updates[`/users/${currentUser.uid}/name`] = trimmedName;
        await update(ref(db), updates);
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
    if (userProfile.name) {
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', settings.theme === Theme.Auto ? isSystemDark : settings.theme === Theme.Dark);
    }
  }, [settings.theme, userProfile.name]);

  const playSound = useCallback((sound: string) => settings.sound && console.log(`Playing sound: ${sound}`), [settings.sound]);

  const addFocusSession = useCallback((durationInSeconds: number, name?: string) => {
    playSound(settings.focusSound);
    vibrate('heavy');
    if (!currentUser) return;
    const historyRef = ref(db, `users/${currentUser.uid}/focusHistory`);
    const newSessionRef = push(historyRef);
    set(newSessionRef, {
      date: new Date().toISOString(), duration: durationInSeconds, name: name || '', createdAt: serverTimestamp()
    });
    updateUserData({ completedSessions: (userProfile.completedSessions || 0) + 1 });
  }, [currentUser, playSound, settings.focusSound, updateUserData, userProfile.completedSessions, vibrate]);

  useEffect(() => {
    // This effect handles the timer countdown.
    if (!timerState.isActive || timerState.endTime <= 0) {
      return; // Timer is not running, do nothing.
    }

    let animationFrameId: number;

    const tick = () => {
      const remaining = Math.round((timerState.endTime - Date.now()) / 1000);

      if (remaining > 0) {
        setTimeLeft(remaining);
        animationFrameId = requestAnimationFrame(tick);
      } else {
        // Time is up.
        setTimeLeft(0);
        setTimerState(s => ({ ...s, isActive: false }));
        setIsTimerFinished(true);
        // This is now guaranteed to run only once per session completion.
        addFocusSession(timerState.duration, sessionName);
      }
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [timerState, sessionName, addFocusSession]);
  
  const navigateTo = (view: View, params?: any) => {
    if (['settings', 'breathing', 'auraCheckin', 'journalEntry', 'journalView', 'favorites', 'focusHistory', 'focusAnalytics', 'soundOptions', 'sessionLinking', 'linkedJournals', 'attachmentViewer'].includes(view)) {
        setModalStack(stack => [...stack, { view, params }]);
    } else {
        setModalStack([]);
        setCurrentView(view);
    }
  };

  const navigateBack = () => {
      const currentModal = modalStack.length > 0 ? modalStack[modalStack.length - 1] : null;

      if (currentModal?.view === 'focusAnalytics') {
          setModalStack(stack => {
              const newStack = stack.slice(0, -1);
              newStack.push({ view: 'focusHistory' });
              return newStack;
          });
      } else {
           setModalStack(stack => stack.slice(0, -1));
      }
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
  const addJournalEntry = async (entry: Omit<JournalEntry, 'id' | 'createdAt'>): Promise<boolean> => {
    if (!currentUser) return false;
    try {
        const journalRef = ref(db, `users/${currentUser.uid}/journalEntries`);
        const newEntryRef = push(journalRef);
        await set(newEntryRef, { ...entry, createdAt: serverTimestamp() });
        return true;
    } catch (error) {
        console.error("Error adding journal entry:", error);
        showAlertModal({ title: "Save Failed", message: "Could not save your entry. Please try again." });
        return false;
    }
  };
  const updateJournalEntry = async (updatedEntry: JournalEntry): Promise<boolean> => {
    if (!currentUser) return false;
    
    // Optimistically update local state for instant UI feedback
    setJournalEntries(prevEntries =>
        prevEntries.map(e => e.id === updatedEntry.id ? updatedEntry : e)
    );

    try {
        const { id, ...data } = updatedEntry;
        const entryRef = ref(db, `users/${currentUser.uid}/journalEntries/${id}`);
        await update(entryRef, data);
        return true;
    } catch (error) {
        console.error("Error updating journal entry:", error);
        showAlertModal({ title: "Update Failed", message: "Could not update your entry. Please try again." });
        // Note: The onValue listener will eventually correct the state if the update fails,
        // so no explicit rollback is implemented here for simplicity.
        return false;
    }
  };

  const deleteJournalEntry = async (id: string): Promise<boolean> => {
    if (!currentUser) return false;

    try {
        const entryRef = ref(db, `users/${currentUser.uid}/journalEntries/${id}`);
        await remove(entryRef);
        return true;
    } catch (error) {
        console.error("Error deleting journal entry:", error);
        showAlertModal({ title: "Delete Failed", message: "Could not delete your entry. Please try again." });
        return false;
    }
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

  const showConfirmationModal = useCallback((options: { title: string; message: string; onConfirm: () => void; confirmText?: string; }) => {
    setConfirmationModalState({
        isOpen: true,
        title: options.title,
        message: options.message,
        onConfirm: options.onConfirm,
        confirmText: options.confirmText || 'Confirm',
    });
  }, []);

  const showAlertModal = useCallback((options: { title: string; message: string; }) => {
    setAlertModalState({
        isOpen: true,
        title: options.title,
        message: options.message,
    });
  }, []);

  const handleConfirm = () => {
      confirmationModalState.onConfirm();
      setConfirmationModalState(s => ({ ...s, isOpen: false }));
  };

  const handleCancel = () => {
      setConfirmationModalState(s => ({ ...s, isOpen: false }));
  };

  const handleAlertClose = () => {
      setAlertModalState(s => ({ ...s, isOpen: false }));
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

  if (isLoading) {
    return <div className="w-screen h-screen bg-light-bg dark:bg-dark-bg" />;
  }
  
  const shouldOnboard = !userProfile.name;
  const shouldShowIntro = showIntro && userProfile.name;

  return (
    <AppContext.Provider value={{ 
        mood, setMood: handleSetMood, settings, setSettings: handleSetSettings, quotes, setQuotes, favoriteQuotes, toggleFavorite,
        userProfile, updateUserName, journalEntries, addJournalEntry, updateJournalEntry, deleteJournalEntry,
        focusHistory, addFocusSession, playSound, vibrate, navigateTo, navigateBack,
        timeLeft, timerDuration: timerState.duration, isTimerActive: timerState.isActive, isTimerFinished,
        selectTimerDuration, toggleTimer, resetTimer, setIsPillDragging, sessionName, setSessionName,
        focusSearchQuery, setFocusSearchQuery,
        logoutUser, loginUserByName,
        showConfirmationModal, showAlertModal,
        currentUser,
    }}>
      <main ref={constraintsRef} style={{ height: '100dvh' }} className={`w-screen overflow-hidden relative font-sans text-light-text dark:text-dark-text bg-light-bg dark:bg-dark-bg transition-colors duration-500`}>
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
                    <div 
                        className={`absolute bottom-0 left-0 right-0 h-[55%] bg-gradient-to-t ${moodFromColors[mood]} to-transparent transition-opacity duration-1000 pointer-events-none`}
                        style={{ opacity: (settings.gradientIntensity ?? 75) / 100 }}
                    ></div>
                    
                    <AnimatePresence mode="wait"><motion.div key={currentView} variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition} className="w-full h-full">{renderView()}</motion.div></AnimatePresence>
                    
                    <AnimatePresence>
                        {modalStack.map((modal, index) => {
                            let modalContent = null;
                            switch (modal.view) {
                                case 'settings':
                                    modalContent = <SettingsPage />;
                                    break;
                                case 'breathing':
                                    modalContent = <BreathingPage />;
                                    break;
                                case 'auraCheckin':
                                    modalContent = <AuraCheckinPage />;
                                    break;
                                case 'journalEntry':
                                    modalContent = <JournalEntryPage {...modal.params} />;
                                    break;
                                case 'journalView':
                                    modalContent = <JournalViewPage {...modal.params} />;
                                    break;
                                case 'favorites':
                                    modalContent = <FavoritesPage />;
                                    break;
                                case 'focusHistory':
                                    modalContent = <FocusHistoryPage />;
                                    break;
                                case 'focusAnalytics':
                                    modalContent = <FocusAnalyticsPage />;
                                    break;
                                case 'soundOptions':
                                    modalContent = <SoundOptionsPage />;
                                    break;
                                case 'sessionLinking':
                                    modalContent = <SessionLinkingPage {...modal.params} />;
                                    break;
                                case 'linkedJournals':
                                    modalContent = <LinkedJournalsPage {...modal.params} />;
                                    break;
                                case 'attachmentViewer':
                                    modalContent = <AttachmentViewerPage {...modal.params} />;
                                    break;
                            }

                            if (!modalContent) return null;

                            return (
                                <motion.div
                                    key={modal.view + index}
                                    className="absolute inset-0 bg-light-bg dark:bg-dark-bg"
                                    variants={modalVariants}
                                    initial="initial"
                                    animate="in"
                                    exit="out"
                                    transition={modalTransition}
                                    style={{ zIndex: 30 + index }}
                                >
                                    {modalContent}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>

        {!shouldOnboard && !shouldShowIntro && (
            <>
                <AnimatePresence>{timerState.isActive && currentView !== 'focus' && (<TimerPill constraintsRef={constraintsRef} />)}</AnimatePresence>
                <AnimatePresence>{isPillDragging && <DeleteZone />}</AnimatePresence>
                <AnimatePresence>
                  {!isKeyboardOpen && modalStack.length === 0 && (
                    <motion.div
                      initial={{ y: '100%' }}
                      animate={{ y: '0%' }}
                      exit={{ y: '100%' }}
                      transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}
                      className="absolute bottom-0 left-0 right-0 w-full"
                    >
                      <BottomNav currentView={currentView} navigateTo={navigateTo} />
                    </motion.div>
                  )}
                </AnimatePresence>
            </>
        )}
        <ConfirmationModal
            isOpen={confirmationModalState.isOpen}
            title={confirmationModalState.title}
            message={confirmationModalState.message}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            confirmText={confirmationModalState.confirmText}
        />
        <AlertModal
            isOpen={alertModalState.isOpen}
            title={alertModalState.title}
            message={alertModalState.message}
            onClose={handleAlertClose}
        />
      </main>
    </AppContext.Provider>
  );
}