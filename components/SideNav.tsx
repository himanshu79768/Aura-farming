import React from 'react';
import { motion } from 'framer-motion';
import { Home, Timer, MessageSquare, User, BookOpen } from 'lucide-react';
import { View } from '../types';
import { useAppContext } from '../App';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  view: View;
  isActive: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, view, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center w-full px-4 py-3 rounded-lg transition-colors duration-200 tappable ${isActive ? 'text-light-accent dark:text-dark-accent' : 'text-light-text-secondary dark:text-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5'}`}
      aria-label={`Go to ${label}`}
    >
      {icon}
      <span className="ml-4 font-medium">{label}</span>
      {isActive && (
        <motion.div
          layoutId="active-nav-indicator-side"
          className="absolute left-0 top-0 bottom-0 w-1 bg-light-accent dark:bg-dark-accent rounded-r-full"
          initial={false}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </button>
  );
};

interface SideNavProps {
  currentView: View;
  navigateTo: (view: View) => void;
}

const SideNav: React.FC<SideNavProps> = ({ currentView, navigateTo }) => {
  const { userProfile } = useAppContext();

  const navItems: { view: View; icon: React.ReactNode; label: string }[] = [
    { view: 'home', icon: <Home size={24} />, label: 'Home' },
    { view: 'focus', icon: <Timer size={24} />, label: 'Focus' },
    { view: 'journal', icon: <BookOpen size={24} />, label: 'Journal' },
    { view: 'quotes', icon: <MessageSquare size={24} />, label: 'Quotes' },
    { view: 'profile', icon: <User size={24} />, label: 'Profile' },
  ];

  return (
    <nav className="hidden md:flex flex-col w-64 h-full bg-light-bg-secondary/50 dark:bg-dark-bg-secondary/50 border-r border-white/10 p-4 shrink-0">
      <div className="flex items-center gap-2 mb-8 px-2">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
            {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'A'}
        </div>
        <div>
            <h1 className="font-bold text-lg">Aura</h1>
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Welcome, {userProfile.name}</p>
        </div>
      </div>
      <div className="flex-grow space-y-2">
        {navItems.map(({ view, icon, label }) => (
          <NavItem
            key={view}
            icon={icon}
            label={label}
            view={view}
            isActive={currentView === view}
            onClick={() => navigateTo(view)}
          />
        ))}
      </div>
      <div className="text-center text-xs text-light-text-secondary dark:text-dark-text-secondary">
        <p>Aura - Refresh & Focus</p>
      </div>
    </nav>
  );
};

export default SideNav;
