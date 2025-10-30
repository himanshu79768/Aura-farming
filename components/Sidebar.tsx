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
    <h3 className="px-3 pt-6 pb-2 text-xs font-semibold uppercase tracking-wider text-light-text-secondary/70 dark:text-dark-text-secondary/70">{children}</h3>
);

const Sidebar: React.FC = () => {
    const { currentView, navigateTo, favoriteQuotes, journalEntries, focusHistory } = useAppContext();
    
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
                        isActive={false} // This opens a modal, so it's never "active" in the same way
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
                        isActive={false} // Modal view
                        onClick={() => navigateTo('settings')}
                    />
                </div>
            </nav>
        </aside>
    );
};

export default Sidebar;
