import React from 'react';
import { motion } from 'framer-motion';
import { Home, Timer, BookOpen, MessageSquare, User, Folder, ChevronRight } from 'lucide-react';
import { useAppContext } from '../App';
import { View } from '../types';
import { BREADCRUMB_TITLES } from '../constants';

const ROOT_VIEW_ICONS: Partial<Record<View, React.ReactNode>> = {
    home: <Home size={14} />,
    focus: <Timer size={14} />,
    journal: <BookOpen size={14} />,
    quotes: <MessageSquare size={14} />,
    profile: <User size={14} />,
};

const Breadcrumbs: React.FC = () => {
    const { currentView, modalStack, navigateToStackIndex } = useAppContext();

    if (modalStack.length === 0) {
        return null; // Don't show breadcrumbs on the root page
    }

    const path = [
        { view: currentView, params: {} },
        ...modalStack,
    ];

    return (
        <motion.div
            className="flex items-center gap-1 bg-light-glass/80 dark:bg-dark-glass/80 backdrop-blur-md rounded-md border border-white/10 text-[11px] font-medium p-1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
        >
            {path.map((item, index) => {
                const isLast = index === path.length - 1;
                const title = BREADCRUMB_TITLES[item.view] || item.view;
                const icon = index === 0 ? ROOT_VIEW_ICONS[item.view] : <Folder size={14} />;
                
                return (
                    <React.Fragment key={item.view + index}>
                        <motion.button
                            onClick={() => navigateToStackIndex(index - 1)}
                            disabled={isLast}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${isLast ? 'text-light-text dark:text-dark-text' : 'text-light-text-secondary dark:text-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5'}`}
                            whileTap={isLast ? {} : { scale: 0.95 }}
                        >
                            {icon}
                            <span>{title}</span>
                        </motion.button>
                        {!isLast && <ChevronRight size={14} className="text-light-text-secondary/50 dark:text-dark-text-secondary/50" />}
                    </React.Fragment>
                );
            })}
        </motion.div>
    );
};

export default Breadcrumbs;