import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useAppContext } from '../App';
import Header from './Header';
import { FocusMusic } from '../types';
import { MUSIC_PRESETS } from '../constants';

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

const SoundOptionsPage: React.FC = () => {
    const { settings, setSettings, navigateBack, vibrate, playUISound } = useAppContext();

    const handleMusicSelect = (music: FocusMusic) => {
        vibrate();
        playUISound('tap');
        setSettings(s => ({...s, focusMusic: music}));
    }
    
    const handleSoundToggle = () => {
        vibrate();
        playUISound(settings.sound ? 'toggle_off' : 'toggle_on');
        setSettings(s => ({ ...s, sound: !s.sound }));
    };

    return (
        <div className="w-full h-full flex flex-col bg-light-bg dark:bg-dark-bg">
            <Header title="Sound Options" showBackButton onBack={navigateBack} />
            <div className="flex-grow w-full overflow-y-auto">
                <div className="w-full max-w-md md:max-w-xl mx-auto p-4">
                    <div className="space-y-4 pt-8 pb-24">
                        <div className="px-4 flex justify-between items-center">
                            <h3 className="font-semibold">Master Sound</h3>
                            <ToggleSwitch checked={settings.sound} onToggle={handleSoundToggle} />
                        </div>

                        <motion.div
                            className="space-y-2"
                            initial="hidden"
                            animate="visible"
                            variants={{
                                visible: { transition: { staggerChildren: 0.05 } }
                            }}
                        >
                            {MUSIC_PRESETS.map(music => (
                                <motion.button
                                    key={music.name}
                                    onClick={() => handleMusicSelect(music.name)}
                                    className={`w-full flex justify-between items-center text-left px-4 py-3 rounded-xl text-lg transition-colors ${settings.focusMusic === music.name ? 'font-semibold text-light-primary dark:text-dark-primary' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                                    variants={{
                                        hidden: { opacity: 0, y: 10 },
                                        visible: { opacity: 1, y: 0 }
                                    }}
                                >
                                    <span>{music.name}</span>
                                    {settings.focusMusic === music.name && (
                                        <motion.div layoutId="selected-sound-check">
                                            <Check className="w-6 h-6 text-light-primary dark:text-dark-primary" />
                                        </motion.div>
                                    )}
                                </motion.button>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SoundOptionsPage;