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

    const handleSave = () => {
        vibrate('medium');
        if (content.trim()) {
            if (entry) {
                updateJournalEntry({ ...entry, content: content.trim() });
            } else {
                addJournalEntry({
                    date: new Date().toISOString(),
                    content: content.trim()
                });
            }
        }
        navigateBack();
    };
    
    const handleDelete = () => {
        if (entry) {
            vibrate('heavy');
            deleteJournalEntry(entry.id);
            navigateBack();
        }
    };
    
    const handleGetPrompt = async () => {
        vibrate();
        setIsPromptLoading(true);
        const prompt = await fetchJournalPrompt();
        setContent(prev => `${prompt}\n\n${prev}`);
        setIsPromptLoading(false);
    };

    return (
        <div className="w-full h-full flex flex-col bg-light-bg dark:bg-dark-bg">
            <Header 
                title={entry ? 'Edit Entry' : 'New Entry'}
                showBackButton 
                onBack={navigateBack} 
            />
            <div className="flex-grow w-full max-w-md mx-auto p-4 flex flex-col">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Start writing..."
                    className="w-full h-full bg-transparent text-lg focus:outline-none resize-none flex-grow"
                    autoFocus
                />
                <div className="flex items-center justify-between py-4">
                    <button
                        onClick={handleGetPrompt}
                        disabled={isPromptLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-light-glass dark:bg-dark-glass rounded-full border border-white/20"
                    >
                        {isPromptLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-yellow-400" />}
                        Get a prompt
                    </button>
                    <div className="flex items-center gap-2">
                        {entry && (
                            <button onClick={handleDelete} className="p-2 text-red-500">
                               <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 text-sm bg-blue-500 text-white font-semibold rounded-full shadow-lg"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JournalEntryPage;