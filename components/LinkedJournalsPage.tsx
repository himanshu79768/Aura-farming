
import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { useAppContext } from '../App';
import Header from './Header';
import { FocusSession } from '../types';

interface LinkedJournalsPageProps {
    session: FocusSession;
}

const LinkedJournalsPage: React.FC<LinkedJournalsPageProps> = ({ session }) => {
    const { journalEntries, navigateTo, navigateBack } = useAppContext();

    const linkedJournals = journalEntries.filter(entry =>
        entry.linkedSessionIds?.includes(session.id)
    );

    return (
        <div className="w-full h-full flex flex-col bg-light-bg dark:bg-dark-bg">
            <Header
                title={session.name || 'Connections'}
                showBackButton
                onBack={navigateBack}
            />
            <div className="flex-grow w-full overflow-y-auto">
                <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl mx-auto p-4">
                    {linkedJournals.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center text-light-text-secondary dark:text-dark-text-secondary h-full flex flex-col justify-center items-center px-4 pb-24"
                        >
                            <BookOpen className="w-12 h-12 mb-4" />
                            <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">No Connections</h2>
                            <p>You haven't connected any journal entries to this session yet.</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            className="space-y-3 pt-8 pb-24"
                            initial="hidden"
                            animate="visible"
                            variants={{
                                visible: { transition: { staggerChildren: 0.05 } }
                            }}
                        >
                            {linkedJournals.map(entry => (
                                <motion.button
                                    key={entry.id}
                                    onClick={() => navigateTo('journalView', { entry })}
                                    className="w-full text-left p-4 bg-light-glass dark:bg-dark-glass rounded-xl border border-white/10"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    variants={{
                                        hidden: { opacity: 0, y: 20 },
                                        visible: { opacity: 1, y: 0 }
                                    }}
                                >
                                    <p className="font-semibold truncate pr-2">{entry.title || 'Untitled Entry'}</p>
                                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">
                                        {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        {' • '}
                                        {new Date(entry.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                                    </p>
                                </motion.button>
                            ))}
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LinkedJournalsPage;