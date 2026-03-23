import React, { createContext, useContext } from 'react';
import { Mood, Settings, Quote, UserProfile, JournalEntry, FocusSession, MyEvent, View, ChatSession, ChatMessage } from './types';
import { SoundType } from './services/soundService';

export interface AppContextType {
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
  addFocusSession: (durationInSeconds: number, name?: string, subject?: string) => void;
  deleteMultipleFocusSessions: (ids: string[]) => Promise<boolean>;
  updateFocusSession: (id: string, updates: Partial<FocusSession>) => Promise<boolean>;
  myEvents: MyEvent[];
  addMyEvent: (event: Omit<MyEvent, 'id' | 'createdAt'>) => Promise<string | null>;
  deleteMyEvent: (id: string) => Promise<boolean>;
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
  selectTimerDuration: (minutes: number, autostart?: boolean) => void;
  toggleTimer: () => void;
  resetTimer: () => void;
  setIsPillDragging: (isDragging: boolean) => void;
  sessionName: string;
  setSessionName: (name: string) => void;
  sessionSubject: string;
  setSessionSubject: (subject: string) => void;
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
  auraChatSessions: ChatSession[];
  saveChatSession: (messages: ChatMessage[]) => void;
  deleteChatSessions: (indices: number[]) => void;
  toggleImmersive: () => void;
  toggleSearch: () => void;
  isAiLoading: boolean;
  setIsAiLoading: (isLoading: boolean) => void;
  triggerMagicTransition: (origin: { x: number; y: number }, view: View, params?: any) => void;
  syllabus: any[];
}

export const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
