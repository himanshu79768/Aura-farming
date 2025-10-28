import React, { useEffect, useRef } from 'react';
import { motion, useSpring, useTransform, PanInfo } from 'framer-motion';
import { Timer } from 'lucide-react';
import { useAppContext } from '../App';

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Helper to calculate distance between two touches
const getDistance = (touches: React.TouchList) => {
    const [touch1, touch2] = [touches[0], touches[1]];
    return Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
    );
};


interface TimerPillProps {
    constraintsRef: React.RefObject<HTMLDivElement>;
}

const TimerPill: React.FC<TimerPillProps> = ({ constraintsRef }) => {
    const { 
        timeLeft, 
        timerDuration, 
        resetTimer,
        setIsPillDragging,
    } = useAppContext();

    // For pinch-to-zoom functionality
    const scale = useSpring(1, { stiffness: 300, damping: 30 });
    const initialPinchDistance = useRef(0);
    const lastScale = useRef(1);

    const progress = timerDuration > 0 ? (timerDuration - timeLeft) / timerDuration : 0;
    
    const progressMotion = useSpring(progress, { stiffness: 50, damping: 25 });
    
    const backgroundColor = useTransform(progressMotion, [0, 0.5, 1], ["#ef4444", "#f59e0b", "#22c55e"]);
    const width = useTransform(progressMotion, p => `${p * 100}%`);

    useEffect(() => {
        progressMotion.set(progress);
    }, [progress, progressMotion]);

    // --- Pinch Gesture Handlers ---
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            e.preventDefault(); 
            initialPinchDistance.current = getDistance(e.touches);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const currentDistance = getDistance(e.touches);
            const newScale = lastScale.current * (currentDistance / initialPinchDistance.current);
            // Limit pinch-to-zoom to a smaller, more subtle range
            const clampedScale = Math.max(0.8, Math.min(newScale, 1.3)); 
            scale.set(clampedScale);
        }
    };

    const handleTouchEnd = () => {
        if (initialPinchDistance.current > 0) {
            lastScale.current = scale.get();
            initialPinchDistance.current = 0;
        }
    };

    const handleDragStart = () => {
        setIsPillDragging(true);
    };
    
    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        setIsPillDragging(false);

        // Check if the pill was dropped in the delete zone at the bottom of the screen
        const deleteZoneThreshold = window.innerHeight - 150; // 150px from the bottom
        if (info.point.y > deleteZoneThreshold) {
            resetTimer();
            // The component will unmount as the timer is no longer active
        }
    };

    return (
        <motion.div
            className="fixed z-50 bg-light-glass/80 dark:bg-dark-glass/80 backdrop-blur-lg border border-white/20 dark:border-white/10 shadow-xl flex items-center justify-center overflow-hidden tappable cursor-grab"
            style={{ 
                top: 20,
                scale, // Apply pinch-to-zoom scale
            }} 
            initial={{ opacity: 0, scale: 0.8, left: '50%', x: '-50%' }}
            animate={{ 
                opacity: 1, 
                scale: 1,
                width: '9rem',
                height: '3rem',
                left: '50%',
                x: '-50%',
                borderRadius: '9999px',
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            aria-label={`Focus timer running. Time left: ${formatTime(timeLeft)}. Drag to move, or pinch to zoom.`}
            drag
            dragConstraints={constraintsRef}
            dragMomentum={false}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            whileDrag={{ scale: 0.9, opacity: 0.8 }}
            // Add touch handlers for pinching
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <motion.div
                className="absolute top-0 left-0 h-full"
                style={{
                    width,
                    backgroundColor,
                }}
            />
            <div className="relative w-full h-full flex flex-col items-center justify-center p-2">
                <motion.div
                    className="flex items-center justify-center gap-2"
                >
                    <Timer size={18} />
                    <span className="font-mono text-base font-medium tracking-tighter">
                        {formatTime(timeLeft)}
                    </span>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default TimerPill;