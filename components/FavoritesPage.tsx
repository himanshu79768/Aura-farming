import React, { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Download, Loader } from 'lucide-react';
import { useAppContext } from '../App';
import Header from './Header';
import { Quote, Mood, Theme } from '../types';

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

interface FavoriteQuoteItemProps {
    quote: Quote;
    isGenerating: boolean;
    onDownload: (quote: Quote) => void;
    onToggleFavorite: (id: string) => void;
}

const FavoriteQuoteItem: React.FC<FavoriteQuoteItemProps> = React.memo(({ quote, isGenerating, onDownload, onToggleFavorite }) => {
    return (
        <motion.div
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
            <div className="flex items-center gap-2">
                <button onClick={() => onDownload(quote)} className="p-2 -mr-1 -mt-2" disabled={isGenerating}>
                    {isGenerating ? <Loader className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" />}
                </button>
                <button onClick={() => onToggleFavorite(quote.id)} className="p-2 -mr-2 -mt-2">
                    <Heart className="w-5 h-5 text-red-500 fill-current" />
                </button>
            </div>
        </motion.div>
    );
});


const FavoritesPage: React.FC = () => {
    const { quotes, favoriteQuotes, toggleFavorite, navigateBack, mood, settings, showAlertModal } = useAppContext();
    const [generatingId, setGeneratingId] = useState<string | null>(null);

    const favoriteQuoteObjects = quotes.filter(q => favoriteQuotes.includes(q.id));

    const resolvedTheme = useMemo((): Theme.Light | Theme.Dark => {
        if (settings.theme !== Theme.Auto) return settings.theme;
        return document.documentElement.classList.contains('dark') ? Theme.Dark : Theme.Light;
      }, [settings.theme]);
    
      const handleDownload = useCallback(async (quote: Quote) => {
          if (!quote) return;
          setGeneratingId(quote.id);
          const blob = await generateQuoteImage(quote, mood, resolvedTheme);
          setGeneratingId(null);
    
          if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              const safeAuthor = quote.author.replace(/[^a-z0-9]/gi, '_').toLowerCase();
              link.download = `aura-quote-${safeAuthor}.jpg`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
          } else {
              showAlertModal({ title: "Download Failed", message: "Could not generate the image. Please try again." });
          }
      }, [mood, resolvedTheme, showAlertModal]);

    return (
        <div className="w-full h-full flex flex-col bg-light-bg dark:bg-dark-bg">
            <Header title="Favorite Quotes" showBackButton onBack={navigateBack} />
            <div className="flex-grow w-full max-w-md md:max-w-2xl lg:max-w-4xl mx-auto p-4 overflow-y-auto">
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
                                <FavoriteQuoteItem
                                    key={quote.id}
                                    quote={quote}
                                    isGenerating={generatingId === quote.id}
                                    onDownload={handleDownload}
                                    onToggleFavorite={toggleFavorite}
                                />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default FavoritesPage;