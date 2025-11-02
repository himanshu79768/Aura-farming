import React, { useRef, useEffect, ReactNode, forwardRef, useImperativeHandle } from 'react';
import { motion, useSpring, animate } from 'framer-motion';

interface OverscrollContainerProps {
    children: ReactNode;
    className?: string;
}

const OverscrollContainer = forwardRef<HTMLDivElement, OverscrollContainerProps>(({ children, className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => containerRef.current!);

    const y = useSpring(0, { stiffness: 500, damping: 45, mass: 1 });
    const isOverscrolling = useRef(false);
    const startY = useRef(0);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const handleTouchStart = (e: TouchEvent) => {
            startY.current = e.touches[0].clientY;
            y.stop();
        };

        const handleTouchMove = (e: TouchEvent) => {
            const currentY = e.touches[0].clientY;
            const { scrollTop, scrollHeight, clientHeight } = el;
            
            // Add a small tolerance for floating point inaccuracies
            const atTop = scrollTop <= 0;
            const atBottom = scrollHeight - scrollTop <= clientHeight + 1;

            const deltaY = currentY - startY.current;

            if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
                // We're at a boundary and trying to scroll past it.
                if (!isOverscrolling.current) {
                    // This is the first move event that is an overscroll.
                    // Set the starting point for overscroll from this exact position.
                    startY.current = currentY;
                    isOverscrolling.current = true;
                }
                
                if (e.cancelable) e.preventDefault();
                
                const overscrollDelta = currentY - startY.current;
                const resistance = 0.4;
                y.set(overscrollDelta * resistance);
            } else {
                // We are not overscrolling. Let native scroll happen.
                isOverscrolling.current = false;
                
                // If we were previously overscrolling but the user has pulled back into the scrollable area,
                // we should reset the spring to avoid a visual jump.
                if (y.get() !== 0) {
                     y.set(0);
                }
                
                // Continuously update the startY so that the delta is calculated from the last known "valid" scroll position.
                // This prevents large jumps if the user scrolls a lot and then hits a boundary.
                startY.current = currentY;
            }
        };

        const handleTouchEnd = () => {
            isOverscrolling.current = false;
            // Animate the y value back to 0 with a spring effect.
            animate(y, 0, { type: 'spring', stiffness: 500, damping: 45 });
        };

        el.addEventListener('touchstart', handleTouchStart, { passive: true });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        el.addEventListener('touchend', handleTouchEnd);
        el.addEventListener('touchcancel', handleTouchEnd);

        return () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
            el.removeEventListener('touchend', handleTouchEnd);
            el.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [y]);
    
    return (
        <div ref={containerRef} className={className}>
            <motion.div style={{ y }}>
                {children}
            </motion.div>
        </div>
    );
});

export default OverscrollContainer;
