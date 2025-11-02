import React from 'react';
import { motion } from 'framer-motion';
import { 
    Home, Timer, BookOpen, MessageSquare, User, Folder, ChevronRight,
    Star, Settings as SettingsIcon, BarChart2, Link as LinkIcon, Edit2, FileImage, FileText,
    Wind, Sparkles, Music 
} from 'lucide-react';
import { useAppContext } from '../App';
import { View, Attachment } from '../types';
import { BREADCRUMB_TITLES } from '../constants';

const ROOT_VIEW_ICONS: Partial<Record<View, React.ReactNode>> = {
    home: <Home size={14} />,
    focus: <Timer size={14} />,
    journal: <BookOpen size={14} />,
    quotes: <MessageSquare size={14} />,
    profile: <User size={14} />,
};

const MODAL_VIEW_ICONS: Partial<Record<View, React.ReactNode>> = {
    settings: <SettingsIcon size={14} />,
    favorites: <Star size={14} />,
    focusHistory: <Timer size={14} />,
    focusAnalytics: <BarChart2 size={14} />,
    sessionLinking: <LinkIcon size={14} />,
    linkedJournals: <LinkIcon size={14} />,
    journalEntry: <Edit2 size={14} />,
    journalView: <FileText size={14} />,
    breathing: <Wind size={14} />,
    auraCheckin: <Sparkles size={14} />,
    soundOptions: <Music size={14} />,
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
                
                let title = BREADCRUMB_TITLES[item.view] || item.view;
                let icon;

                if (index === 0) {
                    icon = ROOT_VIEW_ICONS[item.view];
                } else if (item.view === 'attachmentViewer' && item.params?.attachments && item.params.startIndex !== undefined) {
                    const attachment = item.params.attachments[item.params.startIndex] as Attachment;
                    if (attachment.type.startsWith('image/')) {
                        icon = <FileImage size={14} />;
                        title = 'Photo Attachment';
                    } else if (attachment.type === 'application/pdf') {
                        icon = <FileText size={14} />;
                        title = 'PDF Attachment';
                    } else {
                        icon = <Folder size={14} />; // fallback
                        title = 'Attachment';
                    }
                } else {
                    icon = MODAL_VIEW_ICONS[item.view] || <Folder size={14} />;
                }

                return (
                    <React.Fragment key={item.view + index}>
                        <motion.button
                            onClick={() => navigateToStackIndex(index - 1)}
                            disabled={isLast}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${isLast ? 'text-light-text dark:text-dark-text' : 'text-light-text-secondary dark:text-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5'}`}
                            whileTap={isLast ? {} : { scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
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