import React from 'react';
import { motion } from 'framer-motion';
import { Home, Timer, MessageSquare, User, BookOpen } from 'lucide-react';
import { View } from '../types';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center w-full px-4 py-3 rounded-lg transition-colors duration-200 tappable ${
        isActive
          ? 'bg-light-accent/10 dark:bg-dark-accent/10 text-light-accent dark:text-dark-accent'
          : 'text-light-text-secondary dark:text-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5'
      }`}
      aria-label={`Go to ${label}`}
    >
      {icon}
      <span className="ml-4 font-medium">{label.charAt(0).toUpperCase() + label.slice(1)}</span>
      {isActive && (
        <motion.div
          layoutId="active-nav-indicator-desktop"
          className="absolute right-0 h-6 w-1 bg-light-accent dark:bg-dark-accent rounded-full"
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
  const navItems: { view: View; icon: React.ReactNode }[] = [
    { view: 'home', icon: <Home size={24} /> },
    { view: 'focus', icon: <Timer size={24} /> },
    { view: 'journal', icon: <BookOpen size={24} /> },
    { view: 'quotes', icon: <MessageSquare size={24} /> },
    { view: 'profile', icon: <User size={24} /> },
  ];

  return (
    <motion.nav 
      className="hidden md:flex flex-col h-full w-64 flex-shrink-0 bg-light-glass/80 dark:bg-dark-glass/80 backdrop-blur-lg border-r border-white/20 dark:border-white/10 p-4 z-20"
      initial={{ x: '-100%' }}
      animate={{ x: '0%' }}
      transition={{ type: 'tween', ease: 'easeInOut', duration: 0.4 }}
    >
        <div className="flex items-center gap-2 p-4 mb-4">
            <h1 className="text-2xl font-bold tracking-tighter">Aura</h1>
        </div>
        <div className="flex flex-col space-y-2">
            {navItems.map(({ view, icon }) => (
            <NavItem
                key={view}
                icon={icon}
                label={view}
                isActive={currentView === view}
                onClick={() => navigateTo(view)}
            />
            ))}
      </div>
    </motion.nav>
  );
};

export default SideNav;