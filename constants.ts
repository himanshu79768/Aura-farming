import { Quote, FocusMusic, AccentColor, View } from './types';

// FIX: Added 'auraCheckin' as a child of 'home' for proper navigation hierarchy.
export const VIEW_PARENTS: Partial<Record<View, View>> = {
    // Home children
    'breathing': 'home',
    'flow': 'home',
    'auraCheckin': 'home',
    // Focus children
    'soundOptions': 'focus',
    // Journal children
    'journalEntry': 'journal',
    'journalView': 'journal',
    'sessionLinking': 'journalEntry',
    'attachmentViewer': 'journalView', // Primary parent for hierarchy
    // Profile children
    'settings': 'profile',
    'favorites': 'profile',
    'focusHistory': 'profile',
    'focusAnalytics': 'focusHistory',
    'linkedJournals': 'focusHistory',
};

// FIX: Added 'auraCheckin' to the list of modal views.
export const MODAL_VIEWS: View[] = [
    'settings', 'breathing', 'flow', 'journalEntry', 'journalView', 
    'favorites', 'focusHistory', 'focusAnalytics', 'soundOptions', 
    'sessionLinking', 'linkedJournals', 'attachmentViewer', 'auraCheckin'
];
export const ROOT_VIEWS: View[] = ['home', 'focus', 'journal', 'quotes', 'profile'];


export const INITIAL_QUOTES: Quote[] = [
  { id: '1', text: "You have the right to work, but never to the fruit of work.", author: "Bhagavad Gita" },
  { id: '2', text: "Arise, awake, and stop not till the goal is reached.", author: "Swami Vivekananda" },
  { id: '3', text: "An eye for an eye only ends up making the whole world blind.", author: "Mahatma Gandhi" },
  { id: '4', text: "The mind is everything. What you think you become.", author: "Buddha" },
  { id: '5', text: "Truth is one, paths are many.", author: "Rig Veda" },
  { id: '6', text: "The best way to find yourself is to lose yourself in the service of others.", author: "Mahatma Gandhi" },
  { id: '7', text: "Be the change that you wish to see in the world.", author: "Mahatma Gandhi" },
  { id: '8', text: "In a gentle way, you can shake the world.", author: "Mahatma Gandhi" },
  { id: '9', text: "The greatest wealth is to live content with little.", author: "Plato" },
  { id: '10', text: "Happiness is when what you think, what you say, and what you do are in harmony.", author: "Mahatma Gandhi" },
  { id: '11', text: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt" },
  { id: '12', text: "It is health that is real wealth and not pieces of gold and silver.", author: "Mahatma Gandhi" },
  { id: '13', text: "We are what our thoughts have made us; so take care about what you think. Words are secondary. Thoughts live; they travel far.", author: "Swami Vivekananda" },
  { id: '14', text: "Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.", author: "Buddha" },
  { id: '15', text: "The journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { id: '16', text: "Your task is not to seek for love, but merely to seek and find all the barriers within yourself that you have built against it.", author: "Rumi" },
  { id: '17', text: "When you arise in the morning, think of what a precious privilege it is to be alive - to breathe, to think, to enjoy, to love.", author: "Marcus Aurelius" },
  { id: '18', text: "The soul is dyed the color of its thoughts.", author: "Marcus Aurelius" },
  { id: '19', text: "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.", author: "Rumi" },
  { id: '20', text: "What you seek is seeking you.", author: "Rumi" },
  { id: '21', text: "You are not a drop in the ocean. You are the entire ocean in a drop.", author: "Rumi" },
  { id: '22', text: "Silence is the language of god, all else is poor translation.", author: "Rumi" },
  { id: '23', text: "The wound is the place where the Light enters you.", author: "Rumi" },
  { id: '24', text: "All that we are is the result of what we have thought.", author: "Buddha" },
  { id: '25', text: "Three things cannot be long hidden: the sun, the moon, and the truth.", author: "Buddha" },
  { id: '26', text: "Peace comes from within. Do not seek it without.", author: "Buddha" },
  { id: '27', text: "A disciplined mind brings happiness.", author: "Buddha" },
  { id: '28', text: "The root of suffering is attachment.", author: "Buddha" },
  { id: '29', text: "There is no path to happiness: happiness is the path.", author: "Buddha" },
  { id: '30', text: "A man is but a product of his thoughts. What he thinks, he becomes.", author: "Mahatma Gandhi" },
  { id: '31', text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { id: '32', text: "Strength does not come from physical capacity. It comes from an indomitable will.", author: "Mahatma Gandhi" },
  { id: '33', text: "Action expresses priorities.", author: "Mahatma Gandhi" },
  { id: '34', text: "You can't change how people treat you or what they say about you. All you can do is change how you react to it.", author: "Mahatma Gandhi" },
  { id: '35', text: "The weak can never forgive. Forgiveness is the attribute of the strong.", author: "Mahatma Gandhi" },
  { id: '36', text: "Whatever you do will be insignificant, but it is very important that you do it.", author: "Mahatma Gandhi" },
  { id: '37', text: "You must not lose faith in humanity. Humanity is an ocean; if a few drops of the ocean are dirty, the ocean does not become dirty.", author: "Mahatma Gandhi" },
  { id: '38', text: "Take up one idea. Make that one idea your life; dream of it; think of it; live on that idea.", author: "Swami Vivekananda" },
  { id: '39', text: "All the powers in the universe are already ours. It is we who have put our hands before our eyes and cry that it is dark.", author: "Swami Vivekananda" },
  { id: '40', text: "The world is the great gymnasium where we come to make ourselves strong.", author: "Swami Vivekananda" },
  { id: '41', text: "Comfort is no test of truth. Truth is often far from being comfortable.", author: "Swami Vivekananda" },
  { id: '42', text: "He who has no faith in himself can never have faith in God.", author: "Guru Nanak" },
  { id: '43', text: "Even kings and emperors with heaps of wealth and vast dominion cannot compare with an ant filled with the love of God.", author: "Guru Nanak" },
  { id: '44', text: "The world is a drama, staged in a dream.", author: "Guru Nanak" },
  { id: '45', text: "As fragrance abides in the flower, as reflection is within the mirror, so does your Lord abide within you, why search for him without?", author: "Guru Granth Sahib" },
  { id: '46', text: "Let your life lightly dance on the edges of Time like dew on the tip of a leaf.", author: "Rabindranath Tagore" },
  { id: '47', text: "Where the mind is without fear and the head is held high; Where knowledge is free... Into that heaven of freedom, my Father, let my country awake.", author: "Rabindranath Tagore" },
  { id: '48', text: "Faith is the bird that feels the light when the dawn is still dark.", author: "Rabindranath Tagore" },
  { id: '49', text: "The flower that is single need not envy the thorns that are numerous.", author: "Rabindranath Tagore" },
  { id: '50', text: "Do not say, 'It is morning,' and dismiss it with a name of yesterday. See it for the first time as a newborn child that has no name.", author: "Rabindranath Tagore" },
  { id: '51', text: "Lust, anger and greed are the three gates to hell.", author: "Bhagavad Gita" },
  { id: '52', text: "Man is made by his belief. As he believes, so he is.", author: "Bhagavad Gita" },
  { id: '53', text: "Set thy heart upon thy work, but never on its reward.", author: "Bhagavad Gita" },
  { id: '54', text: "Calmness, gentleness, silence, self-restraint, and purity: these are the disciplines of the mind.", author: "Bhagavad Gita" },
  { id: '55', text: "The wise grieve neither for the living nor for the dead.", author: "Bhagavad Gita" },
  { id: '56', text: "From the unreal lead me to the real, from darkness lead me to light, from death lead me to immortality.", author: "Upanishads" },
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

// Using HSL values for easy manipulation if needed. Format: 'H S% L%'
export const ACCENT_COLORS: Record<AccentColor, { name: string; light: string; dark: string }> = {
    blue: { name: 'Ocean Blue', light: '221 83% 53%', dark: '217 91% 60%' },
    purple: { name: 'Amethyst', light: '262 82% 58%', dark: '262 82% 64%' },
    pink: { name: 'Rose', light: '322 81% 55%', dark: '322 73% 62%' },
    red: { name: 'Crimson', light: '0 84% 60%', dark: '0 84% 67%' },
    orange: { name: 'Sunset', light: '25 95% 53%', dark: '25 95% 58%' },
    yellow: { name: 'Marigold', light: '48 96% 53%', dark: '48 96% 58%' },
    green: { name: 'Emerald', light: '142 71% 45%', dark: '142 63% 52%' },
    teal: { name: 'Aqua', light: '162 80% 40%', dark: '162 72% 48%' },
    cyan: { name: 'Sky', light: '184 89% 40%', dark: '184 89% 48%' },
    indigo: { name: 'Twilight', light: '250 75% 62%', dark: '250 70% 68%' },
};

// FIX: Added 'auraCheckin' to the breadcrumb titles.
export const BREADCRUMB_TITLES: Partial<Record<View, string>> = {
    home: 'Home',
    focus: 'Focus',
    journal: 'Journal',
    quotes: 'Quotes',
    profile: 'Profile',
    // Modals
    settings: 'Settings',
    breathing: 'Breathe',
    flow: 'Flow Mode',
    auraCheckin: 'Your Aura',
    journalEntry: 'Editing Journal',
    journalView: 'View Entry',
    favorites: 'Favorites',
    focusHistory: 'Focus History',
    focusAnalytics: 'Analytics',
    soundOptions: 'Sound Options',
    sessionLinking: 'Connections',
    linkedJournals: 'Linked Journals',
    attachmentViewer: 'Attachments',
};

export const MORNING_GREETINGS = [
    "Good morning, {name}. A new day brings new possibilities.",
    "Rise and shine, {name}! Let's make today amazing.",
    "Hello, {name}. Wishing you a peaceful and productive morning.",
    "Top of the morning to you, {name}!",
    "Good morning, {name}. May your coffee be strong and your day be bright.",
    "Welcome to a new day, {name}. Let's get started.",
    "Morning, {name}! Hope you have a wonderful start to your day.",
    "A fresh start for you, {name}. Good morning.",
    "Hello, {name}. The morning is full of potential.",
    "Wishing you a calm and focused morning, {name}.",
    "Good morning, {name}. Embrace the opportunities of today.",
    "The sun is up, the sky is blue. Good morning, {name}, this day's for you.",
    "Hey {name}, hope you're ready to conquer the day!",
    "A beautiful morning to you, {name}.",
    "Good morning, {name}. Remember to take a deep breath and smile.",
    "Let the morning light energize you, {name}.",
    "Hello, {name}. May your day be as bright as the morning sun.",
    "Wishing you a day filled with joy and success, {name}.",
    "Good morning, {name}! Today is a blank page, write a good story.",
    "Start your day with a positive thought, {name}."
];

export const AFTERNOON_GREETINGS = [
    "Good afternoon, {name}. Hope your day is going well.",
    "Hello, {name}. Taking a moment to reset?",
    "Hope you're having a productive afternoon, {name}.",
    "Keep up the great work, {name}. Good afternoon.",
    "Hello, {name}. Time for a short break to recharge.",
    "Good afternoon, {name}. Stay focused and keep shining.",
    "Wishing you a wonderful rest of your day, {name}.",
    "Hello there, {name}. Let's power through the afternoon.",
    "Good afternoon, {name}. Remember to stay hydrated.",
    "Hope you're finding your flow this afternoon, {name}.",
    "A pleasant afternoon to you, {name}.",
    "Hey {name}, take a deep breath. You've got this.",
    "Good afternoon, {name}. Just a little push till the end of the day.",
    "Keep that positive energy going, {name}.",
    "Hello, {name}. Hope your afternoon is as bright as your potential.",
    "Wishing you clarity and calm this afternoon, {name}.",
    "Good afternoon. You're doing great, {name}.",
    "A moment of peace for you this afternoon, {name}.",
    "Keep the momentum going, {name}. It's a great afternoon.",
    "Hello, {name}. Finish the day strong."
];

export const EVENING_GREETINGS = [
    "Good evening, {name}. Time to relax and unwind.",
    "Hello, {name}. Hope you had a fulfilling day.",
    "Wishing you a peaceful evening, {name}.",
    "The day is done. Relax, {name}.",
    "Good evening, {name}. Let go of the day's stress.",
    "Time to reflect on the day, {name}. Good evening.",
    "Hope you have a cozy and restful evening, {name}.",
    "Hello, {name}. Enjoy the quiet moments of the evening.",
    "Good evening. May your night be filled with peace.",
    "Unwind and recharge, {name}. The evening is yours.",
    "Wishing you a calm and serene evening, {name}.",
    "Good evening, {name}. Let the stars light up your dreams.",
    "The day is over, the night has come. Relax, {name}.",
    "Hello, {name}. Enjoy a quiet evening.",
    "Good evening. Take this time for yourself, {name}.",
    "May your evening be a peaceful one, {name}.",
    "Relax and let the day fade away, {name}.",
    "A restful evening to you, {name}.",
    "Good evening, {name}. Thank you for your efforts today.",
    "Time to close the chapter of today, {name}. Good evening."
];

export const DAILY_THOUGHTS = [
    "The only way to do great work is to love what you do.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    "Believe you can and you're halfway there.",
    "The future belongs to those who believe in the beauty of their dreams.",
    "What you get by achieving your goals is not as important as what you become by achieving your goals.",
    "The secret of getting ahead is getting started.",
    "It does not matter how slowly you go as long as you do not stop.",
    "The best time to plant a tree was 20 years ago. The second best time is now.",
    "Your limitation—it's only your imagination.",
    "Push yourself, because no one else is going to do it for you.",
    "Great things never come from comfort zones.",
    "Dream it. Wish it. Do it.",
    "Success doesn’t just find you. You have to go out and get it.",
    "The harder you work for something, the greater you’ll feel when you achieve it.",
    "Dream bigger. Do bigger.",
    "Don’t stop when you’re tired. Stop when you’re done.",
    "Wake up with determination. Go to bed with satisfaction.",
    "Do something today that your future self will thank you for.",
    "Little things make big days.",
    "It’s going to be hard, but hard does not mean impossible.",
    "Don’t wait for an opportunity. Create it.",
    "Sometimes we’re tested not to show our weaknesses, but to discover our strengths.",
    "The key to success is to focus on goals, not obstacles.",
    "You've got to get up every morning with determination if you're going to go to bed with satisfaction.",
    "The journey of a thousand miles begins with a single step.",
    "Small steps every day.",
    "It's not about being the best. It's about being better than you were yesterday.",
    "Your calm mind is the ultimate weapon against your challenges.",
    "In the middle of difficulty lies opportunity.",
    "A calm sea does not make a skilled sailor."
];
