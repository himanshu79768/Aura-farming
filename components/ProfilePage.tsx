import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { User, Timer, Heart, Settings as SettingsIcon, ChevronRight, Clock, Edit, LogOut } from 'lucide-react';
import { useAppContext } from '../App';
import Header from './Header';
import { View } from '../types';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, onClick }) => {
  const { vibrate, playUISound } = useAppContext();
  const commonClasses = "flex items-center p-4 bg-black/5 dark:bg-white/5 rounded-xl w-full text-left";
  
  const handlePress = () => {
    if(onClick) {
        vibrate();
        playUISound('tap');
        onClick();
    }
  };

  const content = (
    <>
      <div className="p-2 bg-light-accent/10 dark:bg-dark-accent/10 text-light-accent dark:text-dark-accent rounded-lg">
        {icon}
      </div>
      <div className="ml-4 flex-grow">
        <p className="font-semibold">{value}</p>
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{label}</p>
      </div>
      {onClick && <ChevronRight className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" />}
    </>
  );

  return onClick ? (
    <motion.button
      onClick={handlePress}
      className={commonClasses}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
    >
      {content}
    </motion.button>
  ) : (
    <div className={commonClasses}>{content}</div>
  );
};


const ProfilePage: React.FC = () => {
    const { userProfile, updateUserName, favoriteQuotes, navigateTo, focusHistory, logoutUser, showAlertModal, vibrate, playUISound } = useAppContext();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(userProfile.name);

    const totalFocusMinutes = useMemo(() => {
        if (!focusHistory) return 0;
        return Math.round(focusHistory.reduce((total, session) => total + session.duration, 0) / 60);
    }, [focusHistory]);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setName(e.target.value);
    };
    
    const handleNameSave = async () => {
        setIsEditing(false);
        const newNameTrimmed = name.trim();
        if (newNameTrimmed && newNameTrimmed !== userProfile.name) {
            const result = await updateUserName(newNameTrimmed);
            if (!result.success && result.message) {
                showAlertModal({ title: 'Update Failed', message: result.message });
                setName(userProfile.name);
            }
        } else {
            setName(userProfile.name);
        }
    };
    
    const handleNavigate = (view: View) => {
        vibrate();
        playUISound('tap');
        navigateTo(view);
    };
    
    const handleEditClick = () => {
        vibrate();
        playUISound('tap');
        setIsEditing(true);
    };

    return (
        <div className="w-full h-full flex flex-col">
            <Header title="Profile" />
            <div className="flex-grow w-full max-w-md md:max-w-lg mx-auto p-4 flex flex-col justify-center">
                <div className="flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full bg-light-glass dark:bg-dark-glass flex items-center justify-center border border-white/20 dark:border-white/10 mb-4">
                        <User className="w-12 h-12" />
                    </div>
                    {isEditing ? (
                        <div className="flex items-center gap-2">
                            <input 
                                type="text" 
                                value={name} 
                                onChange={handleNameChange} 
                                onBlur={handleNameSave}
                                onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                                className="text-3xl font-bold text-center bg-transparent border-b-2 border-light-accent dark:border-dark-accent focus:outline-none"
                                autoFocus
                            />
                        </div>
                    ) : (
                         <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-bold">{userProfile.name || 'User'}</h1>
                            <motion.button 
                                onClick={handleEditClick} 
                                className="p-2 text-light-text-secondary dark:text-dark-text-secondary rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                                whileTap={{ scale: 0.9 }}
                                transition={{ type: "spring", stiffness: 600, damping: 30 }}
                                aria-label="Edit name"
                            >
                                <Edit className="w-5 h-5" />
                            </motion.button>
                        </div>
                    )}
                    <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">This is your space.</p>
                </div>
                
                <div className="my-8 grid grid-cols-2 gap-4">
                    <StatCard icon={<Timer className="w-5 h-5"/>} label="Sessions" value={userProfile.completedSessions} onClick={() => handleNavigate('focusHistory')} />
                    <StatCard icon={<Heart className="w-5 h-5"/>} label="Favorites" value={favoriteQuotes.length} onClick={() => handleNavigate('favorites')} />
                    <div className="col-span-2">
                      <StatCard icon={<Clock className="w-5 h-5"/>} label="Total Focus Time" value={`${totalFocusMinutes} min`} onClick={() => handleNavigate('focusHistory')} />
                    </div>
                </div>

                <div className="space-y-4">
                    <motion.button 
                        onClick={() => handleNavigate('settings')}
                        className="flex justify-between items-center w-full p-4 bg-light-glass/80 dark:bg-dark-glass/80 backdrop-blur-md rounded-2xl border border-white/20 dark:border-white/10 text-left"
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 600, damping: 30 }}
                    >
                        <div className="flex items-center gap-3">
                            <SettingsIcon className="w-5 h-5" />
                            <span className="font-medium">Settings</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" />
                    </motion.button>
                    <motion.button 
                        onClick={logoutUser}
                        className="flex justify-between items-center w-full p-4 bg-red-500/10 dark:bg-red-500/10 backdrop-blur-md rounded-2xl border border-red-500/20 text-red-400"
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 600, damping: 30 }}
                    >
                        <div className="flex items-center gap-3">
                            <LogOut className="w-5 h-5" />
                            <span className="font-medium">Logout</span>
                        </div>
                    </motion.button>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;