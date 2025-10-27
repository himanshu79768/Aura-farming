import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Trash2, Loader } from 'lucide-react';
import { useAppContext } from '../App';
import { JournalEntry } from '../types';
import { fetchJournalPrompt } from '../services/geminiService';
import Header from './Header';

interface JournalEntryPageProps {
    entry?: JournalEntry;
}

const JournalEntryPage: React.FC<JournalEntryPageProps> = ({ entry }) => {
    const { navigateBack, addJournalEntry, updateJournalEntry, deleteJournalEntry, vibrate } = useAppContext();
    const [content, setContent] = useState('');
    const [isPromptLoading, setIsPromptLoading] = useState(false);

    useEffect(() => {
        if (entry) {
            setContent(entry.content);
        }
    }, [entry]);

    const handleSave = async () => {
        vibrate('medium');
        if (content.trim()) {
            const success = entry
                ? await updateJournalEntry({ ...entry, content: content.trim() })
                : await addJournalEntry({
                    date: new Date().toISOString(),
                    content: content.trim()
                });

            if (success) {
                navigateBack();
            }
        }
    };
    
    const handleDelete = async () => {
        if (entry && window.confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
            vibrate('heavy');
            const success = await deleteJournalEntry(entry.id);
            if (success) {
                navigateBack();
            }
        }
    };
    
    const handleGetPrompt = async () => {
        vibrate();
        setIsPromptLoading(true);
        const prompt = await fetchJournalPrompt();
        setContent(prev => `${prompt}\n\n${prev}`);
        setIsPromptLoading(false);
    };

    const HeaderActions = (
        <div className="flex items-center gap-2">
            {entry && (
                <button onClick={handleDelete} className="p-2 text-red-500 rounded-full hover:bg-red-500/10 transition-colors">
                   <Trash2 className="w-5 h-5" />
                </button>
            )}
            <button
                onClick={handleSave}
                disabled={!content.trim()}
                className="px-4 py-1.5 text-base font-semibold bg-blue-500 text-white rounded-full shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
                Save
            </button>
        </div>
    );

    return (
        <div className="w-full h-full flex flex-col bg-light-bg dark:bg-dark-bg">
            <Header 
                title={entry ? 'Edit Entry' : 'New Entry'}
                showBackButton 
                onBack={navigateBack}
                rightAction={HeaderActions}
            />
            <div className="flex-grow w-full max-w-md mx-auto p-4 flex flex-col overflow-hidden">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Start writing..."
                    className="w-full bg-transparent text-lg focus:outline-none resize-none flex-grow"
                    autoFocus
                />
                <div className="flex items-center justify-start py-4 flex-shrink-0">
                    <button
                        onClick={handleGetPrompt}
                        disabled={isPromptLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-light-glass dark:bg-dark-glass rounded-full border border-white/20"
                    >
                        {isPromptLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-yellow-400" />}
                        Get a prompt
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JournalEntryPage;