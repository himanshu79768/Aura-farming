import * as React from 'react';

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

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  createdAt?: any; // For Firestore serverTimestamp
}

export interface FocusSession {
  id: string;
  date: string;
  duration: number; // in seconds
  name?: string;
  createdAt?: any; // For Firestore serverTimestamp
}

export type View = 'home' | 'focus' | 'quotes' | 'profile' | 'settings' | 'breathing' | 'auraCheckin' | 'journal' | 'journalEntry' | 'favorites' | 'focusHistory' | 'focusAnalytics' | 'soundOptions' | 'journalView';

export interface UserProfile {
  name: string;
  completedSessions: number;
}

export type FocusSound = 'chime' | 'bell' | 'bowl';
export type AppIcon = 'default' | 'serene' | 'mono';
export type HapticIntensity = 'off' | 'light' | 'medium';

export type FocusMusic = 'None' | 'Rain Drops' | 'Cafe Murmur' | 'Forest Creek' | 'Ocean Waves' | 'Lofi Beats' | 'Singing Bowl' | 'Thunderstorm' | 'Wind Chimes' | 'Fireplace' | 'White Noise' | 'Zen Garden';

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
}

export interface UserData extends Settings, UserProfile {
    mood: Mood;
    // Fix: Changed favoriteQuotes to Record<string, boolean> to match Firebase structure.
    favoriteQuotes: Record<string, boolean>;
}


export interface MoodConfig {
  gradient: string;
  icon: (props: React.ComponentProps<'svg'>) => React.ReactElement;
}