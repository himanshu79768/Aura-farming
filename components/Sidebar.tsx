import React from 'react';
import { motion } from 'framer-motion';
import { Home, Timer, BookOpen, MessageSquare, User, Settings, Star } from 'lucide-react';
import { View } from '../types';
import { useAppContext } from '../App';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  count?: number;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, isActive, onClick, count }) => {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center w-full gap-3 px-3 py-2 text-left rounded-lg transition-colors duration-200 text-sm ${
        isActive
          ? 'bg-black/10 dark:bg-white/10 text-light-text dark:text-dark-text font-semibold'
          : 'text-light-text-secondary dark:text-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5 hover:text-light-text dark:hover:text-dark-text'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      <div className="text-light-primary dark:text-dark-primary">
        {icon}
      </div>
      <span className="flex-grow">{label}</span>
      {count !== undefined && (
        <span className={`px-2 py-0.5 text-xs rounded-full ${isActive ? 'bg-gray-400/50 dark:bg-gray-500/50' : 'bg-gray-300/70 dark:bg-gray-700/70'}`}>
          {count}
        </span>
      )}
    </button>
  );
};

const SidebarHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className="px-3 pt-2 pb-2 text-xs font-semibold uppercase tracking-wider text-light-text-secondary/70 dark:text-dark-text-secondary/70">{children}</h3>
);

const Sidebar: React.FC = () => {
    const { currentView, navigateTo, favoriteQuotes, journalEntries, focusHistory, userProfile } = useAppContext();
    
    const navItems: { view: View; label: string; icon: React.ReactNode }[] = [
        { view: 'home', label: 'Home', icon: <Home size={20} /> },
        { view: 'focus', label: 'Focus', icon: <Timer size={20} /> },
        { view: 'journal', label: 'Journal', icon: <BookOpen size={20} /> },
        { view: 'quotes', label: 'Quotes', icon: <MessageSquare size={20} /> },
    ];
    
    const profileItems: { view: View; label: string; icon: React.ReactNode }[] = [
        { view: 'profile', label: 'Profile', icon: <User size={20} /> },
    ];

    return (
        <aside className="fixed top-0 left-0 bottom-0 z-40 hidden md:block w-64 bg-light-glass/80 dark:bg-dark-glass/80 backdrop-blur-xl border-r border-white/20 dark:border-white/10 p-4">
            <nav className="flex flex-col h-full">
                <div className="flex-grow">
                    <motion.div layout transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}>
                        <SidebarHeader>Main</SidebarHeader>
                        {navItems.map(({ view, label, icon }) => (
                            <SidebarItem
                                key={view}
                                icon={icon}
                                label={label}
                                isActive={currentView === view}
                                onClick={() => navigateTo(view)}
                                count={view === 'journal' ? journalEntries.length : undefined}
                            />
                        ))}
                         <SidebarItem
                            icon={<Star size={20} />}
                            label="Favorites"
                            isActive={false}
                            onClick={() => navigateTo('favorites')}
                            count={favoriteQuotes.length}
                        />
                         <SidebarItem
                            icon={<Timer size={20} />}
                            label="History"
                            isActive={false}
                            onClick={() => navigateTo('focusHistory')}
                            count={focusHistory.length}
                        />

                        <SidebarHeader>Account</SidebarHeader>
                        {profileItems.map(({ view, label, icon }) => (
                             <SidebarItem
                                key={view}
                                icon={icon}
                                label={label}
                                isActive={currentView === view}
                                onClick={() => navigateTo(view)}
                            />
                        ))}
                         <SidebarItem
                            icon={<Settings size={20} />}
                            label="Settings"
                            isActive={false}
                            onClick={() => navigateTo('settings')}
                        />
                    </motion.div>
                </div>
                 <div className="flex-shrink-0">
                    <div className="h-px bg-black/10 dark:bg-white/10 my-2" />
                    <button onClick={() => navigateTo('profile')} className="flex items-center gap-3 p-3 w-full rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-light-glass dark:bg-dark-glass flex items-center justify-center border border-white/20 dark:border-white/10">
                            <User size={16} />
                        </div>
                        <span className="font-normal text-sm text-light-text-secondary/80 dark:text-dark-text-secondary/80">{userProfile.name}</span>
                    </button>
                    <div className="text-center pt-2 pb-1">
                        <span 
                           className="text-xs font-bold tracking-[0.3em] bg-clip-text text-transparent bg-gradient-to-r from-light-primary/70 to-light-primary dark:from-dark-primary/70 dark:to-dark-primary opacity-60"
                        >
                            AURA
                        </span>
                    </div>
                </div>
            </nav>
        </aside>
    );
};

export default Sidebar;
