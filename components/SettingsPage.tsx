import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Sparkles, SlidersHorizontal, Bell, Zap, Droplet, Music, AppWindow, Star } from 'lucide-react';
import { Theme, Mood, FocusSound, AppIcon, HapticIntensity } from '../types';
import { useAppContext } from '../App';
import Header from './Header';

interface SegmentedControlProps<T extends string> {
    options: { value: T; label: React.ReactNode; }[];
    selectedValue: T;
    onChange: (value: T) => void;
    layoutId: string;
}

const SegmentedControl = <T extends string>({ options, selectedValue, onChange, layoutId }: SegmentedControlProps<T>) => {
  return (
    <div className="flex justify-around items-center bg-black/5 dark:bg-white/5 p-1 rounded-full w-full">
      {options.map(({ value, label }) => (
        <button 
            key={value} 
            onClick={() => onChange(value)} 
            className={`relative w-full py-2 text-sm font-medium rounded-full capitalize transition-colors ${selectedValue !== value ? 'hover:bg-black/5 dark:hover:bg-white/5' : ''}`}
        >
          <span className="flex items-center justify-center gap-1.5">{label}</span>
          {selectedValue === value && <motion.div layoutId={layoutId} className="absolute inset-0 bg-light-bg-secondary dark:bg-dark-bg-secondary rounded-full shadow-md z-[-1]" />}
        </button>
      ))}
    </div>
  );
};


const SettingsPage: React.FC = () => {
    const { settings, setSettings, mood, setMood, navigateBack } = useAppContext();

    return (
        <div className="w-full min-h-full flex flex-col">
            <Header title="Settings" showBackButton onBack={navigateBack} />
            <div className="flex-grow w-full max-w-md md:max-w-xl mx-auto p-4">
                <div className="space-y-6 pt-8 pb-24 md:pb-8">
                    
                    {/* Appearance Section */}
                    <div className="space-y-4">
                        <h2 className="font-semibold px-4">Appearance</h2>
                        <div className="p-4 bg-light-glass/80 dark:bg-dark-glass/80 backdrop-blur-md rounded-2xl border border-white/20 dark:border-white/10 space-y-4">
                            <div>
                                <h3 className="font-medium mb-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">Theme</h3>
                                <SegmentedControl<Theme>
                                    options={[
                                        { value: Theme.Light, label: <><Sun size={16}/> Light</> },
                                        { value: Theme.Dark, label: <><Moon size={16}/> Dark</> },
                                        { value: Theme.Auto, label: <><Sparkles size={16}/> Auto</> },
                                    ]}
                                    selectedValue={settings.theme}
                                    onChange={(value) => setSettings(s => ({ ...s, theme: value }))}
                                    layoutId="theme-selector"
                                />
                            </div>
                            <div>
                                <h3 className="font-medium mb-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">App Icon</h3>
                                <SegmentedControl<AppIcon>
                                    options={[
                                        { value: 'default', label: <><AppWindow size={16}/> Default</> },
                                        { value: 'serene', label: <><Droplet size={16}/> Serene</> },
                                        { value: 'mono', label: <><Star size={16}/> Mono</> },
                                    ]}
                                    selectedValue={settings.appIcon}
                                    onChange={(value) => setSettings(s => ({ ...s, appIcon: value }))}
                                    layoutId="app-icon-selector"
                                />
                            </div>
                             <div>
                                <h3 className="font-medium mb-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">Current Mood</h3>
                                <SegmentedControl<Mood>
                                    options={[
                                        { value: Mood.Calm, label: <><Droplet size={16}/> Calm</> },
                                        { value: Mood.Focus, label: <><Zap size={16}/> Focus</> },
                                        { value: Mood.Energize, label: <><Sun size={16}/> Energize</> },
                                    ]}
                                    selectedValue={mood}
                                    onChange={setMood}
                                    layoutId="mood-selector"
                                />
                            </div>
                             <div>
                                <h3 className="font-medium mb-2 text-sm text-light-text-secondary dark:text-dark-text-secondary flex justify-between items-center">
                                    <span>Gradient Intensity</span>
                                    <span>{settings.gradientIntensity ?? 75}%</span>
                                </h3>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={settings.gradientIntensity ?? 75}
                                    onChange={(e) => setSettings(s => ({ ...s, gradientIntensity: Number(e.target.value) }))}
                                    className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                     {/* Sounds & Haptics Section */}
                    <div className="space-y-4">
                        <h2 className="font-semibold px-4">Sounds & Haptics</h2>
                        <div className="p-4 bg-light-glass/80 dark:bg-dark-glass/80 backdrop-blur-md rounded-2xl border border-white/20 dark:border-white/10 space-y-4">
                            <div>
                                <h3 className="font-medium mb-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">Focus Sound</h3>
                                <SegmentedControl<FocusSound>
                                    options={[
                                        { value: 'chime', label: <>Chime</> },
                                        { value: 'bell', label: <>Bell</> },
                                        { value: 'bowl', label: <>Bowl</> },
                                    ]}
                                    selectedValue={settings.focusSound}
                                    onChange={(value) => setSettings(s => ({ ...s, focusSound: value }))}
                                    layoutId="focus-sound-selector"
                                />
                            </div>
                            <div>
                                <h3 className="font-medium mb-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">Haptic Intensity</h3>
                                <SegmentedControl<HapticIntensity>
                                    options={[
                                        { value: 'off', label: <>Off</> },
                                        { value: 'light', label: <>Light</> },
                                        { value: 'medium', label: <>Medium</> },
                                    ]}
                                    selectedValue={settings.hapticIntensity}
                                    onChange={(value) => setSettings(s => ({ ...s, hapticIntensity: value }))}
                                    layoutId="haptic-selector"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
             <div className="w-full text-center pb-8 pt-4">
                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                    Designed & Developed by Himanshu
                </p>
            </div>
        </div>
    );
};

export default SettingsPage;