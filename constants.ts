import { Quote, FocusMusic } from './types';

export const INITIAL_QUOTES: Quote[] = [
  { id: '1', text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { id: '2', text: "It's not what you look at that matters, it's what you see.", author: "Henry David Thoreau" },
  { id: '3', text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { id: '4', text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { id: '5', text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { id: '6', text: "Act as if what you do makes a difference. It does.", author: "William James" },
  { id: '7', text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { id: '8', text: "What you get by achieving your goals is not as important as what you become by achieving your goals.", author: "Zig Ziglar" },
  { id: '9', text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { id: '10', text: "Your limitation—it's only your imagination.", author: "Anonymous" }
];

export const MUSIC_PRESETS: { name: FocusMusic, src: string }[] = [
    { name: 'None', src: '' },
    { name: 'Rain Drops', src: 'https://www.soundjay.com/nature/rain-07.mp3' },
    { name: 'Cafe Murmur', src: 'https://www.soundjay.com/ambient/sounds/crowd-talking-1.mp3' },
    { name: 'Forest Creek', src: 'https://www.soundjay.com/nature/stream-02.mp3' },
    { name: 'Ocean Waves', src: 'https://www.soundjay.com/nature/ocean-wave-1.mp3' },
    { name: 'Lofi Beats', src: 'https://www.soundjay.com/buttons/sounds/button-1.mp3' }, // Placeholder
    { name: 'Singing Bowl', src: 'https://www.soundjay.com/healing/sounds/meditation-bell-11.mp3' },
    { name: 'Thunderstorm', src: 'https://www.soundjay.com/nature/sounds/rain-thunder-2.mp3' },
    { name: 'Wind Chimes', src: 'https://www.soundjay.com/misc/sounds/wind-chime-1.mp3' },
    { name: 'Fireplace', src: 'https://www.soundjay.com/nature/sounds/fireplace-1.mp3' },
    { name: 'White Noise', src: 'https://www.soundjay.com/misc/sounds/white-noise-1.mp3' },
    { name: 'Zen Garden', src: 'https://www.soundjay.com/nature/sounds/birds-1.mp3' },
];