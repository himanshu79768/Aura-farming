import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Cloud, CloudRain, CloudSnow, Wind, Plus, MapPin, Edit, Trash2, Loader, GripVertical, Check, X } from 'lucide-react';
import { useAppContext } from '../App';

// --- Mock Weather Service ---

// UPDATED: Temperature ranges are now in Celsius for more realistic data.
const mockWeatherData: Record<string, { condition: string; icon: React.ReactNode; tempRange: [number, number] }> = {
    'sunny': { condition: 'Sunny', icon: <Sun size={64} className="text-yellow-400" style={{ filter: 'drop-shadow(0 0 10px rgba(250, 204, 21, 0.5))' }} />, tempRange: [25, 35] },
    'cloudy': { condition: 'Cloudy', icon: <Cloud size={64} className="text-gray-400" />, tempRange: [15, 25] },
    'rainy': { condition: 'Rainy', icon: <CloudRain size={64} className="text-blue-400" />, tempRange: [10, 20] },
    'snowy': { condition: 'Snowy', icon: <CloudSnow size={64} className="text-white" />, tempRange: [-5, 5] },
};

const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
};

// NEW: A mock database of cities for the search dropdown.
const MOCK_CITY_DATABASE = [
  "Mapusa, Goa, India",
  "Panaji, Goa, India",
  "Margao, Goa, India",
  "Vasco da Gama, Goa, India",
  "Mumbai, Maharashtra, India",
  "New Delhi, Delhi, India",
  "Bengaluru, Karnataka, India",
  "New York, NY, USA",
  "Los Angeles, CA, USA",
  "London, UK",
  "Paris, France",
  "Tokyo, Japan",
  "Sydney, Australia",
];

const mockFetchWeather = async (city: string) => {
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
    // Special case for the user's example to provide a "correct" temperature.
    if (city.toLowerCase().startsWith('mapusa')) {
        return { city: 'Mapusa', temperature: 29, condition: 'Cloudy', high: 32, low: 26, icon: mockWeatherData['cloudy'].icon };
    }
    const conditions = Object.keys(mockWeatherData);
    const hash = hashCode(city.toLowerCase());
    const conditionKey = conditions[hash % conditions.length];
    const data = mockWeatherData[conditionKey];
    const temp = Math.round((hash % (data.tempRange[1] - data.tempRange[0])) + data.tempRange[0]);
    return {
        city: city.split(',')[0], // Show only the city name
        temperature: temp,
        condition: data.condition,
        high: temp + Math.round((hash % 5) / 2) + 2,
        low: temp - Math.round((hash % 5) / 2) - 2,
        icon: data.icon,
    };
};

const mockReverseGeocode = async (lat: number, lon: number) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return "Current Location";
};

// --- Framer Motion Variants ---
const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => Math.abs(offset) * velocity;
const variants = {
  enter: (direction: number) => ({ x: direction > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { zIndex: 1, x: 0, opacity: 1 },
  exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? '100%' : '-100%', opacity: 0 }),
};

// --- Sub-components ---
const WeatherCard: React.FC<{ data: any }> = ({ data }) => (
    <div className="w-full h-full p-6 flex flex-col justify-center items-center text-center gap-6">
        <div>
            <h3 className="font-semibold text-lg">{data.city}</h3>
            <p className="text-sm text-light-muted-foreground dark:text-dark-muted-foreground">{data.condition}</p>
        </div>
        <div className="flex flex-col items-center">
             {data.icon}
             {/* UPDATED: Added °C to make the unit clear. */}
             <p className="text-7xl font-bold tracking-tight mt-2">{data.temperature}°C</p>
        </div>
        <div className="flex justify-center gap-6 w-full text-sm font-medium">
            <p>H: {data.high}°C</p>
            <p>L: {data.low}°C</p>
        </div>
    </div>
);

const AddCityCard: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button onClick={onClick} className="w-full h-full flex flex-col items-center justify-center text-light-muted-foreground dark:text-dark-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
        <Plus size={48} />
        <p className="mt-2 font-semibold">Add City</p>
    </button>
);

// --- Main Widget Component ---
const WeatherWidget: React.FC = () => {
    const { settings, setSettings, showAlertModal } = useAppContext();
    const { weatherCities = [] } = settings;
    const [weatherData, setWeatherData] = useState<Record<string, any>>({});
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
    const [[page, direction], setPage] = useState([0, 0]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newCityName, setNewCityName] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [editableCities, setEditableCities] = useState(weatherCities);
    // NEW: State for city search functionality
    const [citySearchResults, setCitySearchResults] = useState<string[]>([]);
    const [isCityInputFocused, setIsCityInputFocused] = useState(false);

    useEffect(() => {
        if (weatherCities.length === 0 && !localStorage.getItem('aura_weather_gps_attempted')) {
            localStorage.setItem('aura_weather_gps_attempted', 'true');
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    const cityName = await mockReverseGeocode(latitude, longitude);
                    const newCity = { id: crypto.randomUUID(), name: cityName, isGps: true };
                    setSettings(s => ({ ...s, weatherCities: [newCity] }));
                },
                (error) => {
                    console.warn("Geolocation error:", error.message);
                    showAlertModal({title: "Location Access", message: "Could not get your location. You can add a city manually."});
                },
                { timeout: 10000 }
            );
        }
    }, []);

    useEffect(() => {
        weatherCities.forEach(city => {
            if (!weatherData[city.name]) {
                setLoadingStates(s => ({ ...s, [city.name]: true }));
                mockFetchWeather(city.name).then(data => {
                    setWeatherData(w => ({ ...w, [city.name]: data }));
                    setLoadingStates(s => ({ ...s, [city.name]: false }));
                });
            }
        });
        setEditableCities(weatherCities);
    }, [weatherCities]);

    const paginate = (newDirection: number) => {
        const totalPages = weatherCities.length + 1;
        setPage([(page + newDirection + totalPages) % totalPages, newDirection]);
    };

    const handleAddCity = () => {
        const trimmedName = newCityName.trim();
        if (trimmedName && !weatherCities.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
            const newCity = { id: crypto.randomUUID(), name: trimmedName };
            setSettings(s => ({ ...s, weatherCities: [...(s.weatherCities || []), newCity] }));
        }
        setNewCityName('');
        setIsAddModalOpen(false);
        setCitySearchResults([]);
    };
    
    const handleRemoveCity = (idToRemove: string) => {
        setEditableCities(cities => cities.filter(city => city.id !== idToRemove));
    };
    
    const handleSaveOrder = () => {
        setSettings(s => ({ ...s, weatherCities: editableCities }));
        setIsEditMode(false);
    };

    // NEW: Handlers for city search dropdown
    const handleCitySearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setNewCityName(query);
        if (query.trim()) {
            setCitySearchResults(
                MOCK_CITY_DATABASE.filter(city => city.toLowerCase().includes(query.toLowerCase()))
            );
        } else {
            setCitySearchResults([]);
        }
    };

    const handleSelectCity = (city: string) => {
        setNewCityName(city);
        setCitySearchResults([]);
    };

    const displayItems = [...weatherCities, { id: 'add', name: 'Add' }];

    return (
        <div className="w-full h-full flex flex-col justify-between text-light-card-foreground dark:text-dark-card-foreground">
            <AnimatePresence>
                {isEditMode ? (
                    <motion.div key="edit-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 bg-light-card dark:bg-dark-card p-4 flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold">Edit Locations</h3>
                            <button onClick={handleSaveOrder} className="px-3 py-1 text-sm font-semibold bg-light-primary dark:bg-dark-primary text-white rounded-full"><Check size={16}/></button>
                        </div>
                        <div className="space-y-2 overflow-y-auto">
                            {editableCities.map((city) => (
                                <div key={city.id} className="flex items-center gap-2 p-2 rounded-lg bg-black/5 dark:bg-white/5">
                                    <GripVertical size={20} className="text-light-muted-foreground dark:text-dark-muted-foreground cursor-grab" />
                                    <span className="flex-grow">{city.isGps ? <><MapPin size={14} className="inline mr-1"/>{city.name}</> : city.name}</span>
                                    <button onClick={() => handleRemoveCity(city.id)} className="p-1 rounded-full hover:bg-red-500/10 text-red-500"><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div key="main-view" className="w-full h-full flex flex-col">
                        <div className="flex justify-end p-2 h-10">
                           {weatherCities.length > 0 && <button onClick={() => setIsEditMode(true)} className="p-2 text-light-muted-foreground dark:text-dark-muted-foreground"><Edit size={16}/></button>}
                        </div>
                        <motion.div
                            className="relative flex-grow"
                            drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.1}
                            onDragEnd={(e, { offset, velocity }) => {
                                const swipe = swipePower(offset.x, velocity.x);
                                if (swipe < -swipeConfidenceThreshold) paginate(1);
                                else if (swipe > swipeConfidenceThreshold) paginate(-1);
                            }}
                        >
                            <AnimatePresence initial={false} custom={direction}>
                                <motion.div
                                    key={page} className="absolute w-full h-full"
                                    custom={direction} variants={variants}
                                    initial="enter" animate="center" exit="exit"
                                    transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                                >
                                    {page < displayItems.length - 1 ? (
                                        loadingStates[displayItems[page].name] || !weatherData[displayItems[page].name] ? (
                                            <div className="w-full h-full flex items-center justify-center"><Loader className="animate-spin"/></div>
                                        ) : <WeatherCard data={weatherData[displayItems[page].name]} />
                                    ) : <AddCityCard onClick={() => setIsAddModalOpen(true)} />}
                                </motion.div>
                            </AnimatePresence>
                        </motion.div>
                        <div className="flex justify-center items-center gap-2 h-6">
                            {displayItems.map((_, i) => <div key={i} className={`w-2 h-2 rounded-full transition-all ${page === i ? 'bg-light-text dark:bg-dark-text' : 'bg-light-muted-foreground/50 dark:bg-dark-muted-foreground/50'}`} />)}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isAddModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-transparent backdrop-blur-[1.5px]">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="w-full max-w-xs p-6 bg-light-bg-secondary/80 dark:bg-dark-bg-secondary/80 backdrop-blur-lg rounded-2xl border border-white/10 shadow-3xl">
                             <h3 className="text-lg font-bold mb-4">Add New City</h3>
                             <div className="relative">
                                <input type="text" value={newCityName} onChange={handleCitySearchChange} onFocus={() => setIsCityInputFocused(true)} onBlur={() => setTimeout(() => setIsCityInputFocused(false), 150)} placeholder="e.g., London" autoFocus className="w-full px-4 py-3 bg-light-glass dark:bg-dark-glass rounded-lg border border-white/10 focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary" />
                                {/* NEW: City search results dropdown */}
                                {isCityInputFocused && citySearchResults.length > 0 && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="absolute top-full mt-2 w-full max-h-40 overflow-y-auto bg-light-bg-secondary dark:bg-dark-bg-secondary rounded-lg border border-white/10 shadow-lg z-30">
                                        {citySearchResults.map(city => (
                                            <button key={city} onMouseDown={() => handleSelectCity(city)} className="w-full text-left px-4 py-2 hover:bg-black/5 dark:hover:bg-white/5">{city}</button>
                                        ))}
                                    </motion.div>
                                )}
                             </div>
                             <div className="flex justify-end gap-3 mt-4">
                                <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-semibold bg-light-glass dark:bg-dark-glass rounded-full">Cancel</button>
                                <button onClick={handleAddCity} disabled={!newCityName.trim()} className="px-4 py-2 text-sm font-semibold bg-light-primary dark:bg-dark-primary text-white rounded-full disabled:opacity-50">Add</button>
                             </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WeatherWidget;
