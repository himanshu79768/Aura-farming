import * as React from 'react';

export type WidgetType = 'calendar' | 'countdown' | 'compact-calendar' | 'weather' | 'stats' | 'focus-analytics' | 'analog-clock' | 'digital-clock' | 'daily-target' | 'subject-analytics';

export enum Theme {
  Light = 'light',
  Dark = 'dark',
  Auto = 'auto',
}

export enum Mood {
  Calm = 'Calm',
  Focus = 'Focus',
  Energize = 'Energize',
}

export interface Quote {
  id: string;
  text: string;
  author: string;
}

export interface Attachment {
  id: string; // Unique ID for the attachment
  name: string;
  type: string;
  data: string; // Base64 encoded data URL for the file
}

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  createdAt?: any; // For Firestore serverTimestamp
  linkedSessionIds?: string[];
  attachments?: Attachment[];
  // New editor settings
  fontStyle?: 'default' | 'serif' | 'mono';
  isSmallText?: boolean;
  isFullWidth?: boolean;
  isLocked?: boolean;
}

export interface FocusSession {
  id:string;
  date: string;
  duration: number; // in seconds
  name?: string;
  subject?: string;
  createdAt?: any; // For Firestore serverTimestamp
}

export type View = 'home' | 'focus' | 'quotes' | 'profile' | 'settings' | 'breathing' | 'flow' | 'journal' | 'journalEntry' | 'favorites' | 'focusHistory' | 'focusAnalytics' | 'soundOptions' | 'journalView' | 'sessionLinking' | 'linkedJournals' | 'attachmentViewer' | 'auraCheckin' | 'auraAI' | 'auraChatHistory' | 'auraAiSettings' | 'auraAiPersonalization' | 'auraAiServiceAgreements';

export interface UserProfile {
  name: string;
  completedSessions: number;
}

export type FocusSound = 'chime' | 'bell' | 'bowl';
export type AppIcon = 'default' | 'serene' | 'mono';
export type HapticIntensity = 'off' | 'light' | 'medium';

export type FocusMusic = 'None' | 'Rain Drops' | 'Cafe Murmur' | 'Forest Creek' | 'Ocean Waves' | 'Lofi Beats' | 'Singing Bowl' | 'Thunderstorm' | 'Wind Chimes' | 'Fireplace' | 'White Noise' | 'Zen Garden';

export type AccentColor = 'blue' | 'purple' | 'pink' | 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'cyan' | 'indigo';

export type AuraAiVoice = 'Zephyr' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir';
export type AuraAiTone = 'default' | 'funny' | 'professional' | 'adult';

export interface CountdownEvent {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD format
}

export interface Settings {
  theme: Theme;
  sound: boolean;
  haptics: boolean; // Retained for basic toggle, intensity is new
  minimalism: boolean;
  focusSound: FocusSound;
  appIcon: AppIcon;
  hapticIntensity: HapticIntensity;
  focusMusic: FocusMusic;
  gradientIntensity: number;
  accentColor?: AccentColor;
  speakAuraAI?: boolean;
  buttonSounds?: boolean;
  auraAiVoice?: AuraAiVoice;
  auraAiPitch?: number;
  auraAiSpeed?: number;
  auraAiTone?: AuraAiTone;
  auraAiPersonalizationData?: string;
  homeWidget?: WidgetType;
  weatherCities?: { id: string; name: string; isGps?: boolean }[];
  showHomeWidget?: boolean;
  transparentWidget?: boolean;
  countdownEvents?: CountdownEvent[];
  dailyTargetHours?: number;
  subjects?: string[];
  recentTopics?: string[];
}

export interface ChatSession {
  id?: string;
  messages: ChatMessage[];
  timestamp: string; // ISO string
}

export interface MyEvent {
  id: string;
  date: string; // YYYY-MM-DD format
  title: string;
  time: string; // e.g., "14:30" or "All Day"
  type: 'reminder' | 'focus';
  createdAt?: any; // For Firebase serverTimestamp
}

export interface UserData extends Settings, UserProfile {
    mood: Mood;
    favoriteQuotes: Record<string, boolean>;
    auraChatSessions?: (ChatSession[] | ChatMessage[][]);
    myEvents?: Record<string, MyEvent>;
}


export interface MoodConfig {
  gradient: string;
  icon: (props: React.ComponentProps<'svg'>) => React.ReactElement;
}

export interface TextPart {
  text: string;
}

export interface InlineDataPart {
  inlineData: {
    mimeType: string;
    data: string; // Base64 string WITHOUT data URI prefix
    name?: string; // For local display of filename
  };
}

export type Part = TextPart | InlineDataPart;

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  parts: Part[];
  sources?: { title: string; uri: string }[];
  thinkingSteps?: string[];
  intermediateThought?: string;
}

export interface AuraData {
    auraReading: string;
    affirmation: string;
    suggestion: string;
}

export type AITask = 'GENERATE' | 'CONTINUE' | 'SUMMARIZE' | 'IMPROVE' | 'ASK' | 'GENERATE_IMAGE';
