import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../App';
import Header from './Header';
import OverscrollContainer from './OverscrollContainer';

const AuraAiPersonalizationPage: React.FC = () => {
    const { settings, setSettings, navigateBack, vibrate, playUISound } = useAppContext();
    const [data, setData] = useState(settings.auraAiPersonalizationData || '');
    const [hasUnsaved, setHasUnsaved] = useState(false);

    const handleSave = useCallback(() => {
        vibrate();
        playUISound('success');
        setSettings(s => ({ ...s, auraAiPersonalizationData: data }));
        setHasUnsaved(false);
        navigateBack();
    }, [data, setSettings, navigateBack, vibrate, playUISound]);

    const handleDataChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setData(e.target.value);
        if (!hasUnsaved) {
            setHasUnsaved(true);
        }
    };
    
    // Fallback save on unmount
    const hasUnsavedRef = useRef(hasUnsaved);
    const dataRef = useRef(data);
    useEffect(() => {
        hasUnsavedRef.current = hasUnsaved;
        dataRef.current = data;
    }, [hasUnsaved, data]);
    
    useEffect(() => {
        return () => {
            if (hasUnsavedRef.current) {
                setSettings(s => ({ ...s, auraAiPersonalizationData: dataRef.current }));
            }
        }
    }, [setSettings]);

    const HeaderActions = (
        <button onClick={handleSave} className="px-4 py-1.5 text-base font-semibold bg-light-primary dark:bg-dark-primary text-white rounded-full shadow-sm">
            Save
        </button>
    );

    return (
        <div className="w-full h-full flex flex-col">
            <Header title="Personalization" showBackButton onBack={navigateBack} rightAction={HeaderActions} />
            <OverscrollContainer className="flex-grow w-full overflow-y-auto">
                <div className="w-full max-w-md md:max-w-2xl mx-auto p-4">
                    <div className="space-y-4 pt-8 pb-24">
                        <p className="text-light-text-secondary dark:text-dark-text-secondary px-2">
                            Provide some information about yourself, your goals, or your preferences. Aura will remember this to give you more personalized and relevant responses.
                        </p>
                        <textarea
                            value={data}
                            onChange={handleDataChange}
                            placeholder="For example: I am a software engineer working on a new project. I enjoy hiking on weekends and my goal is to practice mindfulness for 10 minutes every day..."
                            className="w-full h-64 p-4 bg-light-glass dark:bg-dark-glass rounded-2xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary"
                        />
                    </div>
                </div>
            </OverscrollContainer>
        </div>
    );
};

export default AuraAiPersonalizationPage;
