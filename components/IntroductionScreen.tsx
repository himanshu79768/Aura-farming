import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Wind, BookOpen } from 'lucide-react';

interface IntroductionScreenProps {
    onComplete: () => void;
    userName: string;
}

const screenVariants = {
  initial: { opacity: 0, x: 300 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -300 },
};
// Fix: Corrected Transition type for framer-motion by using 'as const' to assert literal types.
const transition = { type: 'tween' as const, ease: 'easeInOut' as const, duration: 0.5 };

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string; delay: number }> = ({ icon, title, description, delay }) => (
    <motion.div 
        className="flex items-start gap-4"
        variants={{
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 }
        }}
        transition={{ delay }}
    >
        <div className="p-2 bg-light-accent/10 dark:bg-dark-accent/10 text-light-accent dark:text-dark-accent rounded-lg mt-1">{icon}</div>
        <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{description}</p>
        </div>
    </motion.div>
);

const IntroductionScreen: React.FC<IntroductionScreenProps> = ({ onComplete, userName }) => {
    return (
        <motion.div
            className="w-full h-full flex flex-col items-center justify-center p-8 bg-light-bg dark:bg-dark-bg"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition}
        >
            <div className="flex-grow flex flex-col items-center justify-center text-center w-full max-w-md md:max-w-3xl">
                <motion.div variants={screenVariants} initial="initial" animate="animate" transition={{ staggerChildren: 0.2 }}>
                    <motion.h1 
                        className="text-4xl font-bold tracking-tight"
                        variants={{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }}
                    >
                        Welcome to Aura, {userName}!
                    </motion.h1>
                    <motion.p 
                        className="mt-4 text-lg text-light-text-secondary dark:text-dark-text-secondary"
                        variants={{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }}
                    >
                        Here's a quick look at what you can do to find your calm and focus.
                    </motion.p>

                    <motion.div 
                        className="space-y-6 text-left mt-12"
                        initial="initial"
                        animate="animate"
                        variants={{
                            animate: { transition: { staggerChildren: 0.2 } }
                        }}
                    >
                        <FeatureCard icon={<Sparkles size={20} />} title="Aura Check-in" description="Get a personalized reading of your energy for the day." delay={0.4} />
                        <FeatureCard icon={<Wind size={20} />} title="Breathing Exercises" description="Follow guided sessions to calm your nervous system." delay={0.6} />
                        <FeatureCard icon={<BookOpen size={20} />} title="Mindful Journaling" description="Capture your thoughts with AI-powered prompts." delay={0.8} />
                    </motion.div>
                </motion.div>
            </div>
            <motion.button
                onClick={onComplete}
                className="w-full max-w-md md:max-w-3xl flex items-center justify-center gap-2 py-4 text-lg font-semibold bg-light-accent dark:bg-dark-accent text-light-bg dark:text-dark-bg rounded-full shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
            >
                Get Started <ArrowRight size={20} />
            </motion.button>
        </motion.div>
    );
};

export default IntroductionScreen;