import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppContext } from '../App';
import Header from './Header';

const cardVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.8,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.8,
  }),
};

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

const QuotesPage: React.FC = () => {
  const { quotes, favoriteQuotes, toggleFavorite } = useAppContext();
  const [[page, direction], setPage] = useState([0, 0]);

  const quoteIndex = page % quotes.length;
  const currentQuote = quotes[quoteIndex >= 0 ? quoteIndex : quotes.length + quoteIndex];
  
  const paginate = (newDirection: number) => {
    setPage([page + newDirection, newDirection]);
  };

  if (!quotes || quotes.length === 0) {
    return <div className="text-center">Loading quotes...</div>;
  }

  const isFavorited = currentQuote && favoriteQuotes.includes(currentQuote.id);
  
  return (
    <div className="w-full h-full flex flex-col">
        <Header title="Quotes" />
        <div className="flex-grow flex flex-col items-center justify-center overflow-hidden relative">
            <AnimatePresence initial={false} custom={direction}>
                <motion.div
                key={page}
                custom={direction}
                variants={cardVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                    x: { type: 'spring', stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.5}
                onDragEnd={(e, { offset, velocity }) => {
                    const swipe = swipePower(offset.x, velocity.x);
                    if (swipe < -swipeConfidenceThreshold) {
                    paginate(1);
                    } else if (swipe > swipeConfidenceThreshold) {
                    paginate(-1);
                    }
                }}
                className="absolute h-auto w-full max-w-lg flex flex-col items-center justify-center p-8 text-center"
                >
                <p className="text-2xl md:text-3xl font-medium">"{currentQuote.text}"</p>
                <p className="mt-4 text-lg text-light-text-secondary dark:text-dark-text-secondary">- {currentQuote.author}</p>
                </motion.div>
            </AnimatePresence>
            <div className="absolute bottom-28 flex items-center space-x-4">
                <motion.button onClick={() => paginate(-1)} className="p-4 bg-light-glass dark:bg-dark-glass rounded-full border border-white/20 dark:border-white/10 shadow-lg" whileTap={{ scale: 0.9 }}><ChevronLeft /></motion.button>
                <motion.button 
                    onClick={() => toggleFavorite(currentQuote.id)} 
                    className="p-4 bg-light-glass dark:bg-dark-glass rounded-full border border-white/20 dark:border-white/10 shadow-lg"
                    whileTap={{ scale: 1.2, rotate: -15 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                >
                    <motion.div
                        animate={{ scale: isFavorited ? 1.2 : 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 10, delay: 0.1 }}
                    >
                        <Heart className={`w-6 h-6 transition-all duration-300 ${isFavorited ? 'text-red-500 fill-current' : ''}`} />
                    </motion.div>
                </motion.button>
                <motion.button onClick={() => paginate(1)} className="p-4 bg-light-glass dark:bg-dark-glass rounded-full border border-white/20 dark:border-white/10 shadow-lg" whileTap={{ scale: 0.9 }}><ChevronRight /></motion.button>
            </div>
        </div>
    </div>
  );
};

export default QuotesPage;