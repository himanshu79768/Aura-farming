export type SoundType = 'tap' | 'toggle_on' | 'toggle_off' | 'success' | 'delete';

const soundSources: Record<SoundType, string> = {
    tap: 'https://www.soundjay.com/buttons/sounds/button-09.mp3',
    toggle_on: 'https://www.soundjay.com/buttons/sounds/button-40.mp3',
    toggle_off: 'https://www.soundjay.com/buttons/sounds/button-42.mp3',
    success: 'https://www.soundjay.com/buttons/sounds/button-3.mp3',
    delete: 'https://www.soundjay.com/buttons/sounds/button-16.mp3',
};

const audioPool: Record<SoundType, HTMLAudioElement[]> = {
    tap: [], toggle_on: [], toggle_off: [], success: [], delete: []
};
const POOL_SIZE = 3;

// Preload sounds
Object.entries(soundSources).forEach(([key, src]) => {
    for (let i = 0; i < POOL_SIZE; i++) {
        const audio = new Audio(src);
        audio.volume = 0.4; // Keep sounds subtle
        audio.preload = 'auto';
        audioPool[key as SoundType].push(audio);
    }
});

let poolIndex: Record<SoundType, number> = {
    tap: 0, toggle_on: 0, toggle_off: 0, success: 0, delete: 0
};

let isEnabled = true;

export const setSoundEnabled = (enabled: boolean) => {
    isEnabled = enabled;
};

export const playUISound = (type: SoundType) => {
    if (!isEnabled) return;
    
    try {
        const audio = audioPool[type][poolIndex[type]];
        if (audio.readyState > 0) {
            audio.currentTime = 0;
            audio.play().catch(e => {}); // Ignore play interruption errors
        }
        
        poolIndex[type] = (poolIndex[type] + 1) % POOL_SIZE;
    } catch (e) {
        console.error(`Error playing sound type ${type}:`, e);
    }
};
