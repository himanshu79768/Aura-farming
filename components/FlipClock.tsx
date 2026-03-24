import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FlipUnitProps {
  digit: number;
  label?: string;
}

const FlipUnit: React.FC<FlipUnitProps> = ({ digit, label }) => {
  const [prevDigit, setPrevDigit] = useState(digit);

  useEffect(() => {
    if (digit !== prevDigit) {
      const timer = setTimeout(() => setPrevDigit(digit), 300);
      return () => clearTimeout(timer);
    }
  }, [digit, prevDigit]);

  const digitStr = digit.toString().padStart(2, '0');

  return (
    <div className="flex flex-col items-center mx-2 md:mx-4">
      <div className="relative w-[28vw] h-[40vw] sm:w-[25vw] sm:h-[35vw] md:w-[22vw] md:h-[30vw] max-w-[300px] max-h-[400px] bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-gray-200 dark:border-white/10">
        {/* Static Background */}
        <div className="absolute inset-0 flex flex-col">
          <div className="h-1/2 bg-gray-100 dark:bg-gray-800 border-b border-black/5 dark:border-black/20" />
          <div className="h-1/2 bg-white dark:bg-gray-900" />
        </div>

        {/* Digits */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={digit}
            initial={{ rotateX: -90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            exit={{ rotateX: 90, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-center text-[15vw] sm:text-[12vw] md:text-[10vw] lg:text-[12rem] font-mono font-bold text-gray-900 dark:text-white"
          >
            {digitStr}
          </motion.div>
        </AnimatePresence>

        {/* Middle Line */}
        <div className="absolute top-1/2 left-0 w-full h-px bg-black/40 z-10" />
      </div>
      {label && (
        <span className="mt-4 text-sm sm:text-base font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
          {label}
        </span>
      )}
    </div>
  );
};

interface FlipClockProps {
  seconds: number;
}

const FlipClock: React.FC<FlipClockProps> = ({ seconds }) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return (
    <div className="flex items-center justify-center py-10">
      {h > 0 && <FlipUnit digit={h} label="Hours" />}
      <FlipUnit digit={m} label="Minutes" />
      <FlipUnit digit={s} label="Seconds" />
    </div>
  );
};

export default FlipClock;
