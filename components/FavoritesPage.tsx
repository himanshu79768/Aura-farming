import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useAppContext } from '../App';
import Header from './Header';

const FavoritesPage: React.FC = () => {
    const { quotes, favoriteQuotes, toggleFavorite, navigateBack } = useAppContext();

    const favoriteQuoteObjects = quotes.filter(q => favoriteQuotes.includes(q.id));

    return (
        <div className="w-full h-full flex flex-col bg-light-bg dark:bg-dark-bg">
            <Header title="Favorite Quotes" showBackButton onBack={navigateBack} />
            <div className="flex-grow w-full max-w-md mx-auto p-4 overflow-y-auto">
                <AnimatePresence>
                    {favoriteQuoteObjects.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center text-light-text-secondary dark:text-dark-text-secondary h-full flex flex-col justify-center items-center px-4 pb-24"
                        >
                            <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">No favorites yet.</h2>
                            <p>Tap the heart on a quote to save it here.</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            className="space-y-4 pt-8 pb-24"
                            initial="hidden"
                            animate="visible"
                            variants={{
                                visible: { transition: { staggerChildren: 0.1 } }
                            }}
                        >
                            {favoriteQuoteObjects.map(quote => (
                                <motion.div
                                    key={quote.id}
                                    className="p-4 bg-light-glass dark:bg-dark-glass rounded-xl border border-white/10 flex items-start gap-4"
                                    variants={{
                                        hidden: { opacity: 0, y: 20 },
                                        visible: { opacity: 1, y: 0 }
                                    }}
                                    layout
                                >
                                    <div className="flex-grow">
                                        <p className="font-medium">"{quote.text}"</p>
                                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-2">- {quote.author}</p>
                                    </div>
                                    <button onClick={() => toggleFavorite(quote.id)} className="p-2 -mr-2 -mt-2">
                                        <Heart className="w-5 h-5 text-red-500 fill-current" />
                                    </button>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default FavoritesPage;
