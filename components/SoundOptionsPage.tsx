import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useAppContext } from '../App';
import Header from './Header';
import { FocusMusic } from '../types';
import { MUSIC_PRESETS } from '../constants';

const SoundOptionsPage: React.FC = () => {
    const { settings, setSettings, navigateBack, vibrate } = useAppContext();

    const handleMusicSelect = (music: FocusMusic) => {
        vibrate();
        setSettings(s => ({...s, focusMusic: music}));
    }

    return (
        <div className="w-full h-full flex flex-col bg-light-bg dark:bg-dark-bg">
            <Header title="Sound Options" showBackButton onBack={navigateBack} />
            <div className="flex-grow w-full max-w-md md:max-w-xl mx-auto p-4 overflow-y-auto">
                <div className="space-y-4 pt-8 pb-24">
                    <div className="px-4 flex justify-between items-center">
                        <h3 className="font-semibold">Master Sound</h3>
                        <label htmlFor="sound-toggle" className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="sound-toggle" className="sr-only peer" checked={settings.sound} onChange={() => setSettings(s => ({ ...s, sound: !s.sound }))} />
                            <div className="w-11 h-6 bg-black/10 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
                        </label>
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
                                className={`w-full flex justify-between items-center text-left px-4 py-3 rounded-xl text-lg transition-colors ${settings.focusMusic === music.name ? 'font-semibold text-blue-500' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                                variants={{
                                    hidden: { opacity: 0, y: 10 },
                                    visible: { opacity: 1, y: 0 }
                                }}
                            >
                                <span>{music.name}</span>
                                {settings.focusMusic === music.name && (
                                    <motion.div layoutId="selected-sound-check">
                                        <Check className="w-6 h-6 text-blue-500" />
                                    </motion.div>
                                )}
                            </motion.button>
                        ))}
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default SoundOptionsPage;