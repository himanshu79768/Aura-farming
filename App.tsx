import React, { useState, useEffect, useCallback, createContext, useContext, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Theme, Mood, View, Settings, Quote, UserProfile, JournalEntry, FocusSession, UserData, Attachment, AccentColor, ChatMessage } from './types';
import HomePage from './components/HomePage';
import FocusPage from './components/FocusPage';
import QuotesPage from './components/QuotesPage';
import SettingsPage from './components/SettingsPage';
import ProfilePage from './components/ProfilePage';
import BreathingPage from './components/BreathingPage';
import OnboardingScreen from './components/OnboardingScreen';
import IntroductionScreen from './components/IntroductionScreen';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';
import FlowPage from './components/FlowPage';
import JournalPage from './components/JournalPage';
import JournalEntryPage from './components/JournalEntryPage';
import JournalViewPage from './components/JournalViewPage';
import { INITIAL_QUOTES, ACCENT_COLORS, VIEW_PARENTS, MODAL_VIEWS, ROOT_VIEWS } from './constants';
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
import { useLocalStorage } from './hooks/useLocalStorage';
import GlobalSearch from './components/GlobalSearch';
import AuraCheckinPage from './components/AuraCheckinPage';
import AuraAiPage from './components/AuraAiPage';
import { playUISound, setSoundEnabled, SoundType } from './services/soundService';


const { 
    auth, db, signInAnonymously, signOut, onAuthStateChanged, ref, onValue, 
    set, update, push, remove, serverTimestamp, query, orderByChild, equalTo, get,
} = (window as any).firebase;


// --- AI Loading Animation Components ---

const ShootingStars = () => {
    const stars = Array.from({ length: 25 }); // Increased star count
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {stars.map((_, i) => {
                const duration = Math.random() * 3 + 3; // Duration: 3s to 6s
                const delay = Math.random() * 5;
                const startY = `${Math.random() * 100}vh`;
                const startXOffset = `${Math.random() * 50 - 25}vw`;
                const verticalMovement = `${Math.random() * 30 + 10}vh`; // Varied vertical movement

                return (
                    <motion.div
                        key={i}
                        className="absolute rounded-full bg-white"
                        style={{
                            width: `${Math.random() * 2 + 1}px`,
                            height: `${Math.random() * 2 + 1}px`,
                            boxShadow: '0 0 10px 2px rgba(255,255,255,0.8)',
                        }}
                        initial={{
                            x: `calc(-20vw + ${startXOffset})`,
                            y: startY,
                            opacity: 0,
                        }}
                        animate={{
                            x: `calc(120vw + ${startXOffset})`,
                            y: `calc(${startY} - ${verticalMovement})`,
                            opacity: [0, 0.8, 0.8, 0], // Fade in and out
                        }}
                        transition={{
                            duration,
                            delay,
                            repeat: Infinity,
                            repeatType: 'loop',
                            ease: 'linear',
                            times: [0, 0.2, 0.8, 1], // Control opacity timing
                        }}
                    />
                );
            })}
        </div>
    );
};

const SparkleIcon = () => (
    <motion.div
        className="relative w-20 h-20"
        animate={{ scale: [1, 1.1, 1], rotate: [0, 10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
        <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 text-white"
            style={{ filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.8))' }}
        >
            <path d="M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 Z" />
        </motion.svg>
        <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute top-1 left-1 w-6 h-6 text-white/90"
            animate={{ scale: [1, 0.8, 1], opacity: [0.8, 1, 0.8], rotate: '360deg' }}
            transition={{ duration: 5, repeat: Infinity, ease: 'linear', delay: 0.5 }}
        >
            <path d="M12 2 L13.5 8.5 L20 10 L13.5 11.5 L12 18 L10.5 11.5 L4 10 L10.5 8.5 Z" />
        </motion.svg>
        <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute bottom-1 right-1 w-6 h-6 text-white/90"
            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1], rotate: '-360deg' }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        >
            <path d="M12 2 L13.5 8.5 L20 10 L13.5 11.5 L12 18 L10.5 11.5 L4 10 L10.5 8.5 Z" />
        </motion.svg>
    </motion.div>
);

const FadingSubtitles = () => {
    const subtitles = [
        "Transforming sketch into substance...",
        "Weaving words into wisdom...",
        "Converting creativity into existence...",
        "Polishing your thoughts...",
        "Finding the right expression...",
        "Unlocking new perspectives...",
    ];
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prevIndex) => (prevIndex + 1) % subtitles.length);
        }, 2500);

        return () => clearInterval(interval);
    }, [subtitles.length]);

    return (
        <div className="h-8 text-center">
            <AnimatePresence mode="wait">
                <motion.p
                    key={index}
                    className="mt-4 text-white/80 font-medium text-lg"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                >
                    {subtitles[index]}
                </motion.p>
            </AnimatePresence>
        </div>
    );
};

const GlisterEffect = () => {
    const glints = Array.from({ length: 7 });

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {glints.map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                        background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%)',
                    }}
                    initial={{
                        x: `${Math.random() * 100}vw`,
                        y: `${Math.random() * 100}vh`,
                        scale: 0,
                        opacity: 0,
                    }}
                    animate={{
                        scale: [0, Math.random() * 0.8 + 0.3, 0],
                        opacity: [0, 1, 0],
                        x: `${Math.random() * 100}vw`,
                        y: `${Math.random() * 100}vh`,
                    }}
                    transition={{
                        duration: Math.random() * 4 + 3,
                        repeat: Infinity,
                        repeatType: 'loop',
                        delay: Math.random() * 3,
                        ease: 'easeInOut',
                    }}
                />
            ))}
        </div>
    );
};

const MagicTransitionEffect: React.FC<{ origin: { x: number; y: number }; onComplete: () => void }> = ({ origin, onComplete }) => {
    return (
        <motion.div
            className="fixed inset-0 z-[99] pointer-events-none"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            onAnimationComplete={onComplete}
        >
            <motion.div
                className="absolute rounded-full bg-flow-gradient bg-400% animate-gradient-flow"
                style={{
                    left: origin.x,
                    top: origin.y,
                    translateX: '-50%',
                    translateY: '-50%',
                }}
                initial={{
                    width: '6rem', // approx button size with glow
                    height: '6rem',
                    opacity: 0.8,
                }}
                animate={{
                    width: '200vmax', // large enough to cover the screen
                    height: '200vmax',
                    opacity: 0,
                }}
                transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
            />
        </motion.div>
    );
};

interface AppContextType {
  mood: Mood;
  setMood: (mood: Mood) => void;
  settings: Settings;
  setSettings: (settings: Settings | ((s: Settings) => Settings)) => void;
  quotes: Quote[];
  setQuotes: (quotes: Quote[]) => void;
  favoriteQuotes: string[];
  toggleFavorite: (id: string, isFavoriting: boolean) => void;
  userProfile: UserProfile;
  updateUserName: (newName: string) => Promise<{ success: boolean; message?: string }>;
  journalEntries: JournalEntry[];
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => Promise<string | null>;
  updateJournalEntry: (entry: JournalEntry) => Promise<boolean>;
  deleteJournalEntry: (id: string) => Promise<boolean>;
  deleteMultipleJournalEntries: (ids: string[]) => Promise<boolean>;
  duplicateJournalEntry: (id: string) => Promise<boolean>;
  focusHistory: FocusSession[];
  addFocusSession: (durationInSeconds: number, name?: string) => void;
  playFocusSound: (sound: string) => void;
  playUISound: (sound: SoundType) => void;
  vibrate: (style?: 'light' | 'medium' | 'heavy') => void;
  navigateTo: (view: View, params?: any) => void;
  navigateBack: () => void;
  navigateForward: () => void;
  navigateToStackIndex: (index: number) => void;
  canGoBack: boolean;
  canGoForward: boolean;
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
  showAlertModal: (options: { title: string; message: string; type?: 'alert' | 'success' }) => void;
  currentUser: any | null;
  currentView: View;
  modalStack: { view: View; params?: any }[];
  isImmersive: boolean;
  auraChatHistory: ChatMessage[];
  updateAuraChatHistory: (history: ChatMessage[]) => void;
  clearAuraChatHistory: () => void;
  toggleImmersive: () => void;
  toggleSearch: () => void;
  isAiLoading: boolean;
  setIsAiLoading: (isLoading: boolean) => void;
  triggerMagicTransition: (origin: { x: number; y: number }, view: View, params?: any) => void;
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
const pageVariants = { initial: { opacity: 0 }, in: { opacity: 1 }, out: { opacity: 0 } };
const modalVariants = { initial: { x: '100%' }, in: { x: '0%' }, out: { x: '100%' } };
const magicModalVariants = { initial: { opacity: 0, scale: 0.95 }, in: { opacity: 1, scale: 1 }, out: { opacity: 0, scale: 0.95 } };
const pageTransition = { type: 'tween' as const, ease: 'easeInOut', duration: 0.3 };
const modalTransition = { type: 'tween' as const, ease: [0.4, 0, 0.2, 1], duration: 0.4 };
const magicModalTransition = { type: 'tween' as const, ease: [0.4, 0, 0.2, 1], duration: 0.4, delay: 0.1 };

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
    accentColor: 'blue',
    speakAuraAI: false,
    buttonSounds: true,
};
const DEFAULT_PROFILE: UserProfile = { name: '', completedSessions: 0 };
const DEFAULT_USER_DATA: UserData = {
    ...DEFAULT_SETTINGS,
    ...DEFAULT_PROFILE,
    mood: Mood.Calm,
    favoriteQuotes: {},
    auraChatHistory: [],
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [masterUid, setMasterUid] = useLocalStorage<string | null>('masterUid', null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  // App State
  const [currentView, setCurrentView] = useState<View>('home');
  const [modalStack, setModalStack] = useState<{ view: View; params?: any }[]>([]);
  const [forwardStack, setForwardStack] = useState<{ view: View; params?: any }[]>([]);
  const [mood, setMood] = useState<Mood>(Mood.Calm);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [quotes, setQuotes] = useState<Quote[]>(INITIAL_QUOTES);
  const [favoriteQuotes, setFavoriteQuotes] = useState<string[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [focusHistory, setFocusHistory] = useState<FocusSession[]>([]);
  const [focusSearchQuery, setFocusSearchQuery] = useState('');
  const [isImmersive, setIsImmersive] = useLocalStorage('isImmersive', false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [auraChatHistory, setAuraChatHistory] = useState<ChatMessage[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [magicTransition, setMagicTransition] = useState<{ active: boolean; origin: { x: number; y: number } }>({ active: false, origin: { x: 0, y: 0 } });
  
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

  const [alertModalState, setAlertModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert',
  });

  const showConfirmationModal = useCallback((options: { title: string; message: string; onConfirm: () => void; confirmText?: string; }) => {
    setConfirmationModalState({
        isOpen: true,
        title: options.title,
        message: options.message,
        onConfirm: options.onConfirm,
        confirmText: options.confirmText || 'Confirm',
    });
  }, []);

  const showAlertModal = useCallback((options: { title: string; message: string; type?: 'alert' | 'success' }) => {
    setAlertModalState({
        isOpen: true,
        title: options.title,
        message: options.message,
        type: options.type || 'alert',
    });
  }, []);

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
    const dataPathUid = masterUid || currentUser?.uid;
    if (!dataPathUid) {
      if(!masterUid) setIsLoading(false); // If no masterUid, we are ready for onboarding
      return;
    };

    const userRef = ref(db, 'users/' + dataPathUid);
    const unsubscribeUser = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val() as UserData & { journalEntries?: Record<string, any>, focusHistory?: Record<string, any> };
            setUserProfile({ name: data.name || '', completedSessions: data.completedSessions || 0 });
            setSettings({
                theme: data.theme || Theme.Auto, sound: data.sound ?? true, haptics: data.haptics ?? true,
                minimalism: data.minimalism ?? false, focusSound: data.focusSound || 'chime', appIcon: data.appIcon || 'default',
                hapticIntensity: data.hapticIntensity || 'medium', focusMusic: data.focusMusic || 'Rain Drops',
                gradientIntensity: data.gradientIntensity ?? 75,
                accentColor: data.accentColor || 'blue',
                speakAuraAI: data.speakAuraAI ?? false,
                buttonSounds: data.buttonSounds ?? true,
            });
            setMood(data.mood || Mood.Calm);
            setFavoriteQuotes(data.favoriteQuotes ? Object.keys(data.favoriteQuotes) : []);
            setAuraChatHistory(data.auraChatHistory || []);

            const journalEntriesArray = data.journalEntries 
                ? Object.entries(data.journalEntries).map(([id, entry]) => ({ id, ...entry } as JournalEntry)).sort((a,b) => b.createdAt - a.createdAt)
                : [];
            setJournalEntries(journalEntriesArray);
            
            const focusHistoryArray = data.focusHistory
                ? Object.entries(data.focusHistory).map(([id, session]) => ({ id, ...session } as FocusSession)).sort((a,b) => b.createdAt - a.createdAt)
                : [];
            setFocusHistory(focusHistoryArray);

        } else if (masterUid) {
            set(userRef, { ...DEFAULT_USER_DATA, name: 'User' });
        }
        setIsLoading(false);
    });

    return () => unsubscribeUser();
  }, [currentUser, masterUid]);
  
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

  useEffect(() => {
    setSoundEnabled(settings.buttonSounds ?? true);
  }, [settings.buttonSounds]);
  
  const toggleImmersive = useCallback(() => {
      vibrate();
      playUISound('tap');
      setIsImmersive(prev => !prev);
  }, [vibrate, setIsImmersive]);

  const toggleSearch = useCallback(() => {
    vibrate();
    playUISound('tap');
    setIsSearchOpen(p => !p);
  }, [vibrate]);

  const updateUserData = useCallback((data: Partial<UserData>) => {
    const dataPathUid = masterUid || currentUser?.uid;
    if (!dataPathUid) return;
    update(ref(db, 'users/' + dataPathUid), data);
  }, [currentUser, masterUid]);

  const updateAuraChatHistory = useCallback((history: ChatMessage[]) => {
    const dataPathUid = masterUid || currentUser?.uid;
    if (!dataPathUid) return;
    // Optimistic update
    setAuraChatHistory(history);
    update(ref(db, `users/${dataPathUid}`), { auraChatHistory: history });
    }, [currentUser, masterUid]);

    const clearAuraChatHistory = useCallback(() => {
        const dataPathUid = masterUid || currentUser?.uid;
        if (!dataPathUid) return;
        // Optimistic update
        setAuraChatHistory([]);
        update(ref(db, `users/${dataPathUid}`), { auraChatHistory: null });
    }, [currentUser, masterUid]);

  const handleSetMood = useCallback((newMood: Mood) => updateUserData({ mood: newMood }), [updateUserData]);
  
  const handleSetSettings = useCallback((value: Settings | ((s: Settings) => Settings)) => {
    const newSettings = value instanceof Function ? value(settings) : value;
    updateUserData(newSettings);
  }, [settings, updateUserData]);

  const updateUserName = useCallback(async (newName: string): Promise<{ success: boolean; message?: string }> => {
    const dataPathUid = masterUid || currentUser?.uid;
    if (!dataPathUid) return { success: false, message: 'Not authenticated.' };

    const trimmedNewName = newName.trim();
    if (!trimmedNewName) return { success: false, message: 'Name cannot be empty.' };

    const oldName = userProfile.name.trim();
    if (trimmedNewName === oldName) return { success: true };

    const sanitizedNewName = trimmedNewName.toLowerCase();
    const sanitizedOldName = oldName.toLowerCase();

    const newUsernameRef = ref(db, `usernames/${sanitizedNewName}`);
    const snapshot = await get(newUsernameRef);
    if (snapshot.exists() && snapshot.val() !== dataPathUid) {
      return { success: false, message: 'This name is already taken.' };
    }

    const updates: { [key: string]: any } = {};
    updates[`/users/${dataPathUid}/name`] = trimmedNewName;
    updates[`/usernames/${sanitizedNewName}`] = dataPathUid;
    if (sanitizedOldName && sanitizedOldName !== sanitizedNewName) {
      updates[`/usernames/${sanitizedOldName}`] = null;
    }
    
    try {
      await update(ref(db), updates);
      playUISound('success');
      return { success: true };
    } catch (error) {
      console.error("Error updating username:", error);
      return { success: false, message: 'An error occurred.' };
    }
  }, [currentUser, userProfile.name, masterUid]);
  
   const loginUserByName = useCallback(async (name: string) => {
        if (!currentUser) return;
        setIsLoggingIn(true);
        const trimmedName = name.trim();
        const sanitizedName = trimmedName.toLowerCase();
        const usernameRef = ref(db, `usernames/${sanitizedName}`);

        try {
            const snapshot = await get(usernameRef);
            if (snapshot.exists()) {
                const existingUid = snapshot.val();
                setMasterUid(existingUid);
                setShowIntro(false);
            } else {
                const newMasterUid = currentUser.uid;
                setMasterUid(newMasterUid);

                const updates: { [key: string]: any } = {};
                updates[`/users/${newMasterUid}`] = { ...DEFAULT_USER_DATA, name: trimmedName };
                updates[`/usernames/${sanitizedName}`] = newMasterUid;
                await update(ref(db), updates);
                
                setShowIntro(true);
            }
            playUISound('success');
        } catch (error) {
            console.error("Error during login by name:", error);
            showAlertModal({ title: "Login Failed", message: "An error occurred during login. Please try again." });
        } finally {
            setIsLoggingIn(false);
        }
    }, [currentUser, setMasterUid, showAlertModal]);

    const logoutUser = useCallback(async () => {
        vibrate('medium');
        playUISound('delete');
        await signOut(auth);
        setCurrentUser(null);
        setMasterUid(null);
        setUserProfile(DEFAULT_PROFILE);
        setSettings(DEFAULT_SETTINGS);
        setMood(Mood.Calm);
        setFavoriteQuotes([]);
        setJournalEntries([]);
        setFocusHistory([]);
        setAuraChatHistory([]);
        setShowIntro(false);
    }, [vibrate, setMasterUid]);

  useEffect(() => {
    if (masterUid) {
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', settings.theme === Theme.Auto ? isSystemDark : settings.theme === Theme.Dark);
    }
  }, [settings.theme, masterUid]);

  useEffect(() => {
    const root = document.documentElement;
    const color = ACCENT_COLORS[settings.accentColor || 'blue'];
    root.style.setProperty('--accent-light', color.light);
    root.style.setProperty('--accent-dark', color.dark);
  }, [settings.accentColor]);

  const playFocusSound = useCallback((sound: string) => settings.sound && console.log(`Playing sound: ${sound}`), [settings.sound]);

  const addFocusSession = useCallback((durationInSeconds: number, name?: string) => {
    playFocusSound(settings.focusSound);
    vibrate('heavy');
    const dataPathUid = masterUid || currentUser?.uid;
    if (!dataPathUid) return;
    const historyRef = ref(db, `users/${dataPathUid}/focusHistory`);
    const newSessionRef = push(historyRef);
    set(newSessionRef, {
      date: new Date().toISOString(), duration: durationInSeconds, name: name || '', createdAt: serverTimestamp()
    });
    updateUserData({ completedSessions: (userProfile.completedSessions || 0) + 1 });
  }, [currentUser, masterUid, playFocusSound, settings.focusSound, updateUserData, userProfile.completedSessions, vibrate]);

  useEffect(() => {
    if (!timerState.isActive || timerState.endTime <= 0) {
      return;
    }

    let animationFrameId: number;
    const tick = () => {
      const remaining = Math.round((timerState.endTime - Date.now()) / 1000);
      if (remaining > 0) {
        setTimeLeft(remaining);
        animationFrameId = requestAnimationFrame(tick);
      } else {
        setTimeLeft(0);
        setTimerState(s => ({ ...s, isActive: false }));
        setIsTimerFinished(true);
        addFocusSession(timerState.duration, sessionName);
      }
    };
    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [timerState, sessionName, addFocusSession]);
  
    const navigateTo = useCallback((view: View, params?: any) => {
        setForwardStack([]);

        if (ROOT_VIEWS.includes(view)) {
            if (currentView !== view) {
                setModalStack([]);
                setCurrentView(view);
            } else {
                setModalStack([]);
            }
            return;
        }

        if (MODAL_VIEWS.includes(view)) {
            const newViewParent = VIEW_PARENTS[view];

            if (newViewParent && ROOT_VIEWS.includes(newViewParent) && newViewParent !== currentView) {
                setCurrentView(newViewParent);
                setModalStack([{ view, params }]);
                return;
            }
            
            const currentModal = modalStack.length > 0 ? modalStack[modalStack.length - 1] : null;
            const currentModalParent = currentModal ? VIEW_PARENTS[currentModal.view] : null;
            
            const isSiblingNav = !!(currentModal && newViewParent && currentModalParent && newViewParent === currentModalParent);
            const isEditingFromView = currentModal?.view === 'journalView' && view === 'journalEntry';

            if (isSiblingNav && !isEditingFromView) {
                setModalStack(stack => [...stack.slice(0, -1), { view, params }]);
            } else {
                setModalStack(stack => [...stack, { view, params }]);
            }
        }
    }, [currentView, modalStack]);
    
    const triggerMagicTransition = useCallback((origin: { x: number; y: number }, view: View, params?: any) => {
        setMagicTransition({ active: true, origin });
        navigateTo(view, params);
    }, [navigateTo]);


  const navigateBack = useCallback(() => {
    if (modalStack.length > 0) {
        vibrate();
        playUISound('tap');
        const lastModal = modalStack[modalStack.length - 1];
        setForwardStack(stack => [lastModal, ...stack]); // Add to forward history
        setModalStack(stack => stack.slice(0, -1));
    }
  }, [modalStack, vibrate]);

  const navigateForward = useCallback(() => {
    if (forwardStack.length > 0) {
        vibrate();
        playUISound('tap');
        const [nextView, ...restOfStack] = forwardStack;
        setForwardStack(restOfStack);
        setModalStack(stack => [...stack, nextView]);
    }
  }, [forwardStack, vibrate]);
  
  const navigateToStackIndex = useCallback((index: number) => {
    if (index < modalStack.length - 1) { // Only navigate if not clicking the last item
        vibrate();
        playUISound('tap');
        const itemsToMove = modalStack.slice(index + 1);
        setForwardStack(stack => [...itemsToMove.reverse(), ...stack]);
        
        if (index === -1) { // Clicked on root
            setModalStack([]);
        } else {
            setModalStack(stack => stack.slice(0, index + 1));
        }
    }
  }, [modalStack, vibrate]);

  const toggleFavorite = useCallback((id: string, isFavoriting: boolean) => {
    const dataPathUid = masterUid || currentUser?.uid;
    if (!dataPathUid) return;
    vibrate();
    playUISound(isFavoriting ? 'success' : 'delete');
    const favRef = ref(db, `users/${dataPathUid}/favoriteQuotes/${id}`);
    if (favoriteQuotes.includes(id)) {
        remove(favRef);
    } else {
        set(favRef, true);
    }
  }, [currentUser, masterUid, vibrate, favoriteQuotes]);

  const addJournalEntry = useCallback(async (entry: Omit<JournalEntry, 'id' | 'createdAt'>): Promise<string | null> => {
    const dataPathUid = masterUid || currentUser?.uid;
    if (!dataPathUid) return null;
    try {
        const journalRef = ref(db, `users/${dataPathUid}/journalEntries`);
        const newEntryRef = push(journalRef);
        await set(newEntryRef, { ...entry, createdAt: serverTimestamp() });
        playUISound('success');
        return newEntryRef.key;
    } catch (error) {
        console.error("Error adding journal entry:", error);
        showAlertModal({ title: "Save Failed", message: "Could not save your entry. Please try again." });
        return null;
    }
  }, [currentUser, masterUid, showAlertModal]);

  const updateJournalEntry = useCallback(async (updatedEntry: JournalEntry): Promise<boolean> => {
    const dataPathUid = masterUid || currentUser?.uid;
    if (!dataPathUid) return false;
    
    setJournalEntries(prevEntries =>
        prevEntries.map(e => e.id === updatedEntry.id ? updatedEntry : e)
    );

    try {
        const { id, ...data } = updatedEntry;
        const entryRef = ref(db, `users/${dataPathUid}/journalEntries/${id}`);
        await update(entryRef, data);
        return true;
    } catch (error) {
        console.error("Error updating journal entry:", error);
        showAlertModal({ title: "Update Failed", message: "Could not update your entry. Please try again." });
        return false;
    }
  }, [currentUser, masterUid, showAlertModal]);

  const deleteJournalEntry = useCallback(async (id: string): Promise<boolean> => {
    const dataPathUid = masterUid || currentUser?.uid;
    if (!dataPathUid) return false;

    try {
        const entryRef = ref(db, `users/${dataPathUid}/journalEntries/${id}`);
        await remove(entryRef);
        playUISound('delete');
        return true;
    } catch (error) {
        console.error("Error deleting journal entry:", error);
        showAlertModal({ title: "Delete Failed", message: "Could not delete your entry. Please try again." });
        return false;
    }
  }, [currentUser, masterUid, showAlertModal]);
  
    const deleteMultipleJournalEntries = useCallback(async (ids: string[]): Promise<boolean> => {
        const dataPathUid = masterUid || currentUser?.uid;
        if (!dataPathUid || ids.length === 0) return false;

        try {
            const updates: { [key: string]: null } = {};
            ids.forEach(id => {
                updates[`/users/${dataPathUid}/journalEntries/${id}`] = null;
            });
            await update(ref(db), updates);
            playUISound('delete');
            return true;
        } catch (error) {
            console.error("Error deleting multiple journal entries:", error);
            showAlertModal({ title: "Delete Failed", message: "Could not delete the selected entries. Please try again." });
            return false;
        }
    }, [currentUser, masterUid, showAlertModal]);

  const duplicateJournalEntry = useCallback(async (id: string): Promise<boolean> => {
    const dataPathUid = masterUid || currentUser?.uid;
    if (!dataPathUid) return false;

    const entryToDuplicate = journalEntries.find(e => e.id === id);
    if (!entryToDuplicate) {
      showAlertModal({ title: "Duplicate Failed", message: "Could not find the original entry." });
      return false;
    }
    
    const { id: originalId, createdAt, ...data } = entryToDuplicate;

    const newEntry: Omit<JournalEntry, 'id' | 'createdAt'> = {
      ...data,
      title: `${data.title || 'Untitled'} (Copy)`,
      date: new Date().toISOString(),
    };

    const success = !!(await addJournalEntry(newEntry));
    if (success) {
        showAlertModal({ title: "Entry Duplicated", message: "A copy of the journal entry has been created.", type: 'success' });
    }
    return success;
  }, [currentUser, masterUid, journalEntries, addJournalEntry, showAlertModal]);

  const selectTimerDuration = useCallback((minutes: number) => {
      vibrate();
      playUISound('tap');
      const newDuration = minutes * 60;
      setTimerState({ duration: newDuration, endTime: 0, isActive: false });
      setTimeLeft(newDuration);
      setIsTimerFinished(false);
  }, [vibrate]);

  const toggleTimer = useCallback(() => {
    if (isTimerFinished) { resetTimer(false); return; }
    playUISound('tap');
    if (timerState.isActive) {
      setTimerState(s => ({ ...s, isActive: false }));
    } else if (timeLeft > 0) {
      setTimerState(s => ({ ...s, isActive: true, endTime: Date.now() + timeLeft * 1000 }));
    }
  }, [isTimerFinished, timerState.isActive, timeLeft]);

  const resetTimer = useCallback((vibrateFeedback = true) => {
    if (vibrateFeedback) {
        vibrate();
        playUISound('delete');
    }
    setTimerState(s => ({ ...s, endTime: 0, isActive: false }));
    setTimeLeft(timerState.duration);
    setIsTimerFinished(false);
    setSessionName('');
  }, [vibrate, timerState.duration]);

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
  
  const appContextValue = useMemo(() => ({
    mood, setMood: handleSetMood, settings, setSettings: handleSetSettings, quotes, setQuotes, favoriteQuotes, toggleFavorite,
    userProfile, updateUserName, journalEntries, addJournalEntry, updateJournalEntry, deleteJournalEntry, deleteMultipleJournalEntries, duplicateJournalEntry,
    focusHistory, addFocusSession, playFocusSound, playUISound, vibrate, navigateTo, navigateBack, navigateForward, navigateToStackIndex, canGoBack: modalStack.length > 0, canGoForward: forwardStack.length > 0,
    timeLeft, timerDuration: timerState.duration, isTimerActive: timerState.isActive, isTimerFinished,
    selectTimerDuration, toggleTimer, resetTimer, setIsPillDragging, sessionName, setSessionName,
    focusSearchQuery, setFocusSearchQuery,
    logoutUser, loginUserByName,
    showConfirmationModal, showAlertModal,
    currentUser,
    currentView, modalStack,
    auraChatHistory, updateAuraChatHistory, clearAuraChatHistory,
    isImmersive, toggleImmersive,
    toggleSearch,
    isAiLoading, setIsAiLoading,
    triggerMagicTransition,
  }), [
    mood, handleSetMood, settings, handleSetSettings, quotes, favoriteQuotes, toggleFavorite,
    userProfile, updateUserName, journalEntries, addJournalEntry, updateJournalEntry, deleteJournalEntry, deleteMultipleJournalEntries, duplicateJournalEntry,
    focusHistory, addFocusSession, playFocusSound, vibrate, navigateTo, navigateBack, navigateForward, navigateToStackIndex, modalStack, forwardStack,
    auraChatHistory, updateAuraChatHistory, clearAuraChatHistory,
    timeLeft, timerState.duration, timerState.isActive, isTimerFinished,
    selectTimerDuration, toggleTimer, resetTimer, sessionName,
    focusSearchQuery,
    logoutUser, loginUserByName,
    showConfirmationModal, showAlertModal,
    currentUser,
    currentView, isAiLoading,
    isImmersive, toggleImmersive,
    toggleSearch,
    triggerMagicTransition,
  ]);
  
  if (isLoading) {
    return <div className="w-screen h-screen bg-light-bg dark:bg-dark-bg" />;
  }
  
  const shouldOnboard = !masterUid;
  const shouldShowIntro = showIntro && userProfile.name;

  return (
    <AppContext.Provider value={appContextValue}>
      <main ref={constraintsRef} style={{ height: '100dvh' }} className={`w-screen relative font-sans text-light-text dark:text-dark-text bg-light-bg dark:bg-dark-bg transition-colors duration-500`}>
        <AnimatePresence>
            {isAiLoading && (
                <motion.div
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/30 backdrop-blur-[8px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <ShootingStars />
                    <GlisterEffect />
                    <SparkleIcon />
                    <FadingSubtitles />
                </motion.div>
            )}
        </AnimatePresence>
        <AnimatePresence>
            {magicTransition.active && (
                <MagicTransitionEffect
                    origin={magicTransition.origin}
                    onComplete={() => setMagicTransition(mt => ({ ...mt, active: false }))}
                />
            )}
        </AnimatePresence>
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
                <motion.div key="main-app" className="w-full h-full md:flex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                    {!isImmersive && <Sidebar />}
                    <div className={`relative w-full h-full ${isImmersive ? 'md:ml-0' : 'md:ml-64'} transition-[margin-left] duration-300 ease-in-out`}>
                        <div 
                            className={`absolute bottom-0 left-0 right-0 h-[55%] bg-gradient-to-t ${moodFromColors[mood]} to-transparent transition-opacity duration-1000 pointer-events-none z-0`}
                            style={{ opacity: (settings.gradientIntensity ?? 75) / 100 }}
                        ></div>
                        
                        <AnimatePresence mode="wait"><motion.div key={currentView} variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition} className="w-full h-full">{renderView()}</motion.div></AnimatePresence>
                        
                        <AnimatePresence>
                            {modalStack.map((modal, index) => {
                                let modalContent = null;
                                const isMagicView = modal.view === 'auraAI';
                                const variantsToUse = isMagicView ? magicModalVariants : modalVariants;
                                const transitionToUse = isMagicView ? magicModalTransition : modalTransition;

                                switch (modal.view) {
                                    case 'settings':
                                        modalContent = <SettingsPage />;
                                        break;
                                    case 'breathing':
                                        modalContent = <BreathingPage />;
                                        break;
                                    case 'flow':
                                        modalContent = <FlowPage />;
                                        break;
                                    case 'auraCheckin':
                                        modalContent = <AuraCheckinPage />;
                                        break;
                                    case 'auraAI':
                                        modalContent = <AuraAiPage />;
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
                                        variants={variantsToUse}
                                        initial="initial"
                                        animate="in"
                                        exit="out"
                                        transition={transitionToUse}
                                        style={{ zIndex: 30 + index, willChange: 'transform, opacity' }}
                                    >
                                        {modalContent}
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {!shouldOnboard && !shouldShowIntro && (
            <>
                <AnimatePresence>{timerState.isActive && currentView !== 'focus' && (<TimerPill constraintsRef={constraintsRef} />)}</AnimatePresence>
                <AnimatePresence>{isPillDragging && <DeleteZone />}</AnimatePresence>
                <div className="md:hidden">
                    <AnimatePresence>
                    {!isKeyboardOpen && modalStack.length === 0 && (
                        <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: '0%' }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                        className="absolute bottom-0 left-0 right-0 w-full"
                        >
                        <BottomNav currentView={currentView} navigateTo={navigateTo} />
                        </motion.div>
                    )}
                    </AnimatePresence>
                </div>
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
            type={alertModalState.type}
        />
        <AnimatePresence>
            {isSearchOpen && <GlobalSearch />}
        </AnimatePresence>
      </main>
    </AppContext.Provider>
  );
}