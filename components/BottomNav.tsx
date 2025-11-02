import React from 'react';
import { motion } from 'framer-motion';
import { Home, Timer, MessageSquare, User, BookOpen } from 'lucide-react';
import { View } from '../types';
import { useAppContext } from '../App';

interface NavItemProps {
  icon: React.ReactNode;
  label: View;
  isActive: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, onClick }) => {
  const { vibrate, playUISound } = useAppContext();
  
  const handleClick = () => {
    vibrate();
    playUISound('tap');
    onClick();
  }

  return (
    <motion.button
      onClick={handleClick}
      className={`relative flex flex-col items-center justify-center w-16 h-16 rounded-full transition-colors duration-300 tappable ${isActive ? 'text-light-accent dark:text-dark-accent' : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-accent dark:hover:text-dark-accent'}`}
      aria-label={`Go to ${label}`}
      whileTap={{ scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {icon}
      {isActive && (
        <motion.div
          layoutId="active-nav-indicator"
          className="absolute bottom-1.5 h-1 w-6 bg-light-accent dark:bg-dark-accent rounded-full"
          initial={false}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </motion.button>
  );
};


interface BottomNavProps {
  currentView: View;
  navigateTo: (view: View) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, navigateTo }) => {
  const navItems: { view: View; icon: React.ReactNode }[] = [
    { view: 'home', icon: <Home size={28} /> },
    { view: 'focus', icon: <Timer size={28} /> },
    { view: 'journal', icon: <BookOpen size={28} /> },
    { view: 'quotes', icon: <MessageSquare size={28} /> },
    { view: 'profile', icon: <User size={28} /> },
  ];

  return (
    <nav className="w-full flex justify-center pb-4 pt-2 z-50 absolute bottom-0 left-0 right-0">
      <div className="flex items-center justify-around w-full max-w-md h-20 bg-light-glass/80 dark:bg-dark-glass/80 backdrop-blur-md rounded-3xl border border-white/20 dark:border-white/10 shadow-lg">
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
    </nav>
  );
};

export default BottomNav;