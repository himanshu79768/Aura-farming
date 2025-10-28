import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ChevronLeft, ChevronRight, Download, Loader } from 'lucide-react';
import { useAppContext } from '../App';
import Header from './Header';
import { Mood, Quote, Theme } from '../types';

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

const generateQuoteImage = async (quote: Quote, mood: Mood, theme: Theme): Promise<Blob | null> => {
    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    const width = 1080;
    const height = 1920;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.scale(dpr, dpr);

    // Theme-based colors
    const bgColor = theme === Theme.Light ? '#f8f9fb' : '#0f0f0f';
    const textColor = theme === Theme.Light ? '#1a1a1a' : '#f8f9fb';
    const secondaryColor = theme === Theme.Light ? 'rgba(26, 26, 26, 0.7)' : 'rgba(248, 249, 251, 0.7)';
    
    // 1. Solid background color
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // 2. Subtle mood gradient overlay from the bottom
    const moodGradientColors = {
        [Mood.Calm]: 'rgba(96, 165, 250, 0.15)',
        [Mood.Focus]: 'rgba(192, 132, 252, 0.15)',
        [Mood.Energize]: 'rgba(250, 204, 21, 0.15)',
    };
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, moodGradientColors[mood]);
    gradient.addColorStop(0.6, 'rgba(0,0,0,0)'); // Fades out towards the top
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const padding = 100;
    const maxWidth = width - padding * 2;
    
    // Text Wrapping function
    const wrapText = (text: string, font: string) => {
        ctx.font = font;
        const words = text.split(' ');
        let lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine + word + ' ';
            if (ctx.measureText(testLine).width > maxWidth && currentLine !== '') {
                lines.push(currentLine.trim());
                currentLine = word + ' ';
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine.trim());
        return lines;
    };

    // Render Quote
    ctx.textAlign = 'center';
    const quoteFont = '600 68px Inter, sans-serif'; // Semibold, smaller font, no italics
    const quoteLineHeight = 85;
    const authorLineHeight = 70;

    const quoteLines = wrapText(quote.text, quoteFont);
    const totalTextHeight = (quoteLines.length * quoteLineHeight) + authorLineHeight;
    let y = (height - totalTextHeight) / 2;
    
    ctx.fillStyle = textColor;
    ctx.font = quoteFont;
    quoteLines.forEach((line, index) => {
        let lineToRender = line;
        if (quoteLines.length === 1) {
            lineToRender = `“${line}”`;
        } else {
            if (index === 0) {
                lineToRender = `“${line}`;
            }
            if (index === quoteLines.length - 1) {
                lineToRender = `${line}”`;
            }
        }
        ctx.fillText(lineToRender, width / 2, y);
        y += quoteLineHeight;
    });

    // Render Author
    y += 20; // Space between quote and author
    ctx.font = '52px Inter, sans-serif';
    ctx.fillStyle = secondaryColor;
    ctx.fillText(`- ${quote.author}`, width / 2, y);

    // Footer
    ctx.fillStyle = secondaryColor;
    ctx.globalAlpha = 0.7;
    ctx.font = '28px Inter, sans-serif';
    ctx.fillText('Shared from Aura • Find your calm', width / 2, height - padding + 20);
    ctx.globalAlpha = 1.0;

    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
};


const QuotesPage: React.FC = () => {
  const { quotes, favoriteQuotes, toggleFavorite, mood, settings, showAlertModal } = useAppContext();
  const [[page, direction], setPage] = useState(() => {
    if (!quotes || quotes.length === 0) {
        return [0, 0];
    }
    const randomIndex = Math.floor(Math.random() * quotes.length);
    return [randomIndex, 0];
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const quoteIndex = page % quotes.length;
  const currentQuote = quotes[quoteIndex >= 0 ? quoteIndex : quotes.length + quoteIndex];
  
  const paginate = (newDirection: number) => {
    setPage([page + newDirection, newDirection]);
  };

  const resolvedTheme = useMemo((): Theme.Light | Theme.Dark => {
    if (settings.theme !== Theme.Auto) return settings.theme;
    return document.documentElement.classList.contains('dark') ? Theme.Dark : Theme.Light;
  }, [settings.theme]);
  
  const handleDownload = async () => {
      if (!currentQuote) return;
      setIsGenerating(true);
      const blob = await generateQuoteImage(currentQuote, mood, resolvedTheme);
      setIsGenerating(false);

      if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const safeAuthor = currentQuote.author.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          link.download = `aura-quote-${safeAuthor}.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
      } else {
          showAlertModal({ title: "Download Failed", message: "Could not generate the image. Please try again." });
      }
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
            <div className="absolute bottom-28 md:bottom-8 flex items-center justify-center w-full px-8 gap-4">
                <motion.button onClick={() => paginate(-1)} className="p-4 bg-light-glass dark:bg-dark-glass rounded-full border border-white/20 dark:border-white/10 shadow-lg" whileTap={{ scale: 0.9 }}><ChevronLeft /></motion.button>
                
                <div className="flex items-center bg-light-glass dark:bg-dark-glass rounded-full border border-white/20 dark:border-white/10 shadow-lg overflow-hidden">
                    <motion.button 
                        onClick={() => toggleFavorite(currentQuote.id)} 
                        className="p-4"
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
                    
                    <div className="w-px h-8 bg-white/20 dark:bg-white/10"></div>
                    
                    <motion.button 
                        onClick={handleDownload}
                        disabled={isGenerating}
                        className="p-4 disabled:opacity-50"
                        whileTap={{ scale: 0.9 }}
                    >
                      {isGenerating ? <Loader className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
                    </motion.button>
                </div>
                
                <motion.button onClick={() => paginate(1)} className="p-4 bg-light-glass dark:bg-dark-glass rounded-full border border-white/20 dark:border-white/10 shadow-lg" whileTap={{ scale: 0.9 }}><ChevronRight /></motion.button>
            </div>
        </div>
    </div>
  );
};

export default QuotesPage;
