import React from 'react';
import { motion } from 'framer-motion';
import { KeyRound } from 'lucide-react';

interface ApiKeySetupProps {
    onKeySetup: () => void;
}

const ApiKeySetup: React.FC<ApiKeySetupProps> = ({ onKeySetup }) => {
    const handleSelectKey = async () => {
        if ((window as any).aistudio) {
            try {
                await (window as any).aistudio.openSelectKey();
                onKeySetup(); // Optimistically assume success
            } catch (error) {
                console.error("Error opening API key selection:", error);
            }
        }
    };

    return (
        <div className="w-screen h-screen flex flex-col items-center justify-center text-center p-8 bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-yellow-500/10 rounded-full">
                        <KeyRound className="w-10 h-10 text-yellow-500" />
                    </div>
                </div>
                <h1 className="text-3xl font-bold mb-2">API Key Required</h1>
                <p className="max-w-md text-light-text-secondary dark:text-dark-text-secondary mb-8">
                    To power Aura's generative features, please select a Google AI Studio API key. Your key is stored securely.
                </p>
                <motion.button
                    onClick={handleSelectKey}
                    className="px-8 py-4 text-lg font-semibold bg-light-accent dark:bg-dark-accent text-light-bg dark:text-dark-bg rounded-full shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Select API Key
                </motion.button>
                 <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-4">
                    For information on billing, visit{' '}
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline">
                        ai.google.dev/gemini-api/docs/billing
                    </a>.
                </p>
            </motion.div>
        </div>
    );
};

export default ApiKeySetup;
