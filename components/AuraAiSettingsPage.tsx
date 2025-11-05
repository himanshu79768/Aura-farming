import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Mic, Sparkles, User, FileText, Send, BookUser } from 'lucide-react';
import { AuraAiTone, AuraAiVoice } from '../types';
import { useAppContext } from '../App';
import Header from './Header';
import OverscrollContainer from './OverscrollContainer';

interface SegmentedControlProps<T extends string> {
    options: { value: T; label: React.ReactNode; }[];
    selectedValue: T;
    onChange: (value: T) => void;
    layoutId: string;
}

const SegmentedControl = <T extends string>({ options, selectedValue, onChange, layoutId }: SegmentedControlProps<T>) => {
  const { vibrate, playUISound } = useAppContext();
  const handleChange = (value: T) => {
    vibrate();
    playUISound('tap');
    onChange(value);
  };
  return (
    <div className="flex justify-around items-center bg-black/5 dark:bg-white/5 p-1 rounded-full w-full">
      {options.map(({ value, label }) => (
        <button 
            key={value} 
            onClick={() => handleChange(value)} 
            className={`relative w-full py-2 text-sm font-medium rounded-full capitalize transition-colors ${selectedValue !== value ? 'hover:bg-black/5 dark:hover:bg-white/5' : ''}`}
        >
          <span className="flex items-center justify-center gap-1.5">{label}</span>
          {selectedValue === value && <motion.div layoutId={layoutId} className="absolute inset-0 bg-light-bg-secondary dark:bg-dark-bg-secondary rounded-full shadow-md z-[-1]" transition={{ type: 'spring', stiffness: 600, damping: 35 }} />}
        </button>
      ))}
    </div>
  );
};

const MemoizedSegmentedControl = React.memo(SegmentedControl) as typeof SegmentedControl;

const ToggleSwitch = ({ checked, onToggle }: { checked: boolean, onToggle: () => void }) => {
    const spring = { type: "spring" as const, stiffness: 700, damping: 30 };
    return (
         <div 
            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${checked ? 'bg-light-primary dark:bg-dark-primary justify-end' : 'bg-gray-300 dark:bg-gray-700 justify-start'}`}
            onClick={onToggle}
        >
            <motion.div
                className="w-4 h-4 bg-white rounded-full shadow-md"
                layout
                transition={spring}
            />
        </div>
    );
};


const AuraAiSettingsPage: React.FC = () => {
    const { settings, setSettings, navigateTo, navigateBack, vibrate, playUISound } = useAppContext();
    
    const handleSpeakAuraAIChange = useCallback(() => {
        vibrate();
        playUISound(settings.speakAuraAI ? 'toggle_off' : 'toggle_on');
        setSettings(s => ({ ...s, speakAuraAI: !s.speakAuraAI }));
    }, [setSettings, vibrate, playUISound, settings.speakAuraAI]);

    const handleVoiceChange = useCallback((value: AuraAiVoice) => setSettings(s => ({ ...s, auraAiVoice: value })), [setSettings]);
    const handleToneChange = useCallback((value: AuraAiTone) => setSettings(s => ({ ...s, auraAiTone: value })), [setSettings]);

    const handleNavigate = (view: 'auraAiPersonalization' | 'auraAiServiceAgreements') => {
        vibrate();
        playUISound('tap');
        navigateTo(view);
    };

    return (
        <div className="w-full h-full flex flex-col">
            <Header title="Aura AI Settings" showBackButton onBack={navigateBack} />
            <OverscrollContainer className="flex-grow w-full overflow-y-auto">
                <div className="w-full max-w-md md:max-w-xl mx-auto p-4">
                    <div className="space-y-6 pt-8 pb-24">
                        
                        {/* Speech Output Section */}
                        <div className="space-y-4">
                            <h2 className="font-semibold px-4">Speech Output</h2>
                            <div className="p-4 bg-light-glass/80 dark:bg-dark-glass/80 backdrop-blur-md rounded-2xl border border-white/20 dark:border-white/10 space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <Mic size={16} />
                                        <h3 className="font-medium">Speak Responses</h3>
                                    </div>
                                    <ToggleSwitch checked={settings.speakAuraAI ?? false} onToggle={handleSpeakAuraAIChange} />
                                </div>
                                <div className="h-px bg-black/10 dark:bg-white/10" />
                                <div>
                                    <h3 className="font-medium mb-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">Voice</h3>
                                    <MemoizedSegmentedControl<AuraAiVoice>
                                        options={[
                                            { value: 'Zephyr', label: <>Zephyr</> },
                                            { value: 'Kore', label: <>Kore</> },
                                            { value: 'Puck', label: <>Puck</> },
                                            { value: 'Charon', label: <>Charon</> },
                                            { value: 'Fenrir', label: <>Fenrir</> },
                                        ]}
                                        selectedValue={settings.auraAiVoice || 'Zephyr'}
                                        onChange={handleVoiceChange}
                                        layoutId="aura-ai-voice-selector"
                                    />
                                </div>
                                <div>
                                    <h3 className="font-medium mb-2 text-sm text-light-text-secondary dark:text-dark-text-secondary flex justify-between items-center">
                                        <span>Pitch</span>
                                        <span className="text-xs opacity-60">Coming Soon</span>
                                    </h3>
                                    <input type="range" min="0.5" max="1.5" step="0.1" value={settings.auraAiPitch || 1} disabled className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-not-allowed accent-light-primary dark:accent-dark-primary" />
                                </div>
                                 <div>
                                    <h3 className="font-medium mb-2 text-sm text-light-text-secondary dark:text-dark-text-secondary flex justify-between items-center">
                                        <span>Speed</span>
                                        <span className="text-xs opacity-60">Coming Soon</span>
                                    </h3>
                                    <input type="range" min="0.5" max="2" step="0.1" value={settings.auraAiSpeed || 1} disabled className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-not-allowed accent-light-primary dark:accent-dark-primary" />
                                </div>
                            </div>
                        </div>

                        {/* Behavior Section */}
                        <div className="space-y-4">
                            <h2 className="font-semibold px-4">Behavior</h2>
                            <div className="p-4 bg-light-glass/80 dark:bg-dark-glass/80 backdrop-blur-md rounded-2xl border border-white/20 dark:border-white/10 space-y-4">
                                <div>
                                    <h3 className="font-medium mb-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">Response Tone</h3>
                                    <MemoizedSegmentedControl<AuraAiTone>
                                        options={[
                                            { value: 'default', label: <>Default</> },
                                            { value: 'funny', label: <>Funny</> },
                                            { value: 'professional', label: <>Professional</> },
                                        ]}
                                        selectedValue={settings.auraAiTone || 'default'}
                                        onChange={handleToneChange}
                                        layoutId="aura-ai-tone-selector"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Context Section */}
                        <div className="space-y-4">
                            <h2 className="font-semibold px-4">Context</h2>
                             <div className="bg-light-glass/80 dark:bg-dark-glass/80 backdrop-blur-md rounded-2xl border border-white/20 dark:border-white/10 overflow-hidden">
                                <button onClick={() => handleNavigate('auraAiPersonalization')} className="w-full flex justify-between items-center p-4 text-left">
                                    <div className="flex items-center gap-3">
                                        <User size={16} />
                                        <h3 className="font-medium">Personalization</h3>
                                    </div>
                                    <ChevronRight size={18} className="text-light-text-secondary dark:text-dark-text-secondary" />
                                </button>
                            </div>
                        </div>

                        {/* About Section */}
                        <div className="space-y-4">
                            <h2 className="font-semibold px-4">About</h2>
                             <div className="bg-light-glass/80 dark:bg-dark-glass/80 backdrop-blur-md rounded-2xl border border-white/20 dark:border-white/10 overflow-hidden">
                                <div className="w-full flex justify-between items-center p-4 text-left">
                                    <div className="flex items-center gap-3">
                                        <Sparkles size={16} />
                                        <h3 className="font-medium">Model</h3>
                                    </div>
                                    <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Aura Neon 3</span>
                                </div>
                                <div className="h-px bg-black/10 dark:bg-white/10 mx-4" />
                                <button onClick={() => handleNavigate('auraAiServiceAgreements')} className="w-full flex justify-between items-center p-4 text-left">
                                    <div className="flex items-center gap-3">
                                        <FileText size={16} />
                                        <h3 className="font-medium">Service Agreements</h3>
                                    </div>
                                    <ChevronRight size={18} className="text-light-text-secondary dark:text-dark-text-secondary" />
                                </button>
                                <div className="h-px bg-black/10 dark:bg-white/10 mx-4" />
                                <a href="mailto:support@auraapp.dev" className="w-full flex justify-between items-center p-4 text-left">
                                    <div className="flex items-center gap-3">
                                        <Send size={16} />
                                        <h3 className="font-medium">Contact Us</h3>
                                    </div>
                                    <ChevronRight size={18} className="text-light-text-secondary dark:text-dark-text-secondary" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </OverscrollContainer>
        </div>
    );
};

export default AuraAiSettingsPage;