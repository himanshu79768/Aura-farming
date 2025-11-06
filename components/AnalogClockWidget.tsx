import React, { useState, useEffect } from 'react';

const AnalogClockWidget: React.FC = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        let animationFrameId: number;
        const updateClock = () => {
            setTime(new Date());
            animationFrameId = requestAnimationFrame(updateClock);
        };
        animationFrameId = requestAnimationFrame(updateClock);
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    const hours = time.getHours();
    const minutes = time.getMinutes();
    const seconds = time.getSeconds();
    const milliseconds = time.getMilliseconds();

    const secondDeg = ((seconds * 1000 + milliseconds) / 60000) * 360;
    const minuteDeg = (minutes / 60) * 360 + (seconds / 60) * 6;
    const hourDeg = (hours / 12) * 360 + (minutes / 60) * 30;

    return (
        <div className="w-full h-full flex items-center justify-center p-4">
            <div className="relative w-56 h-56">
                <svg viewBox="0 0 200 200" className="w-full h-full">
                    <circle cx="100" cy="100" r="96" fill="none" className="stroke-light-muted dark:stroke-dark-muted" strokeWidth="4" />
                    {/* Hour numbers */}
                    {Array.from({ length: 12 }).map((_, i) => {
                        const hour = i + 1;
                        const angle = (hour * 30 - 90) * (Math.PI / 180);
                        const radius = 82; // Moved numbers out slightly
                        const x = 100 + radius * Math.cos(angle);
                        const y = 100 + radius * Math.sin(angle);
                        return (
                            <text
                                key={hour}
                                x={x}
                                y={y}
                                dy="0.35em"
                                textAnchor="middle"
                                className="text-sm font-semibold fill-current text-light-text-secondary dark:text-dark-text-secondary"
                            >
                                {hour}
                            </text>
                        );
                    })}
                </svg>
                <div
                    className="absolute top-0 left-0 w-full h-full flex items-center justify-center"
                    style={{ transform: `rotate(${hourDeg}deg)` }}
                >
                    <div className="w-1.5 h-14 bg-light-text dark:bg-dark-text rounded-full origin-bottom" style={{ transform: 'translateY(-25%)' }} />
                </div>
                <div
                    className="absolute top-0 left-0 w-full h-full flex items-center justify-center"
                    style={{ transform: `rotate(${minuteDeg}deg)` }}
                >
                    <div className="w-1 h-20 bg-light-text dark:bg-dark-text rounded-full origin-bottom" style={{ transform: 'translateY(-25%)' }} />
                </div>
                <div
                    className="absolute top-0 left-0 w-full h-full flex items-center justify-center"
                    style={{ transform: `rotate(${secondDeg}deg)` }}
                >
                    <div className="w-0.5 h-24 bg-red-500 rounded-full origin-bottom" style={{ transform: 'translateY(-25%)' }} />
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-light-text dark:bg-dark-text rounded-full border-2 border-light-bg dark:border-dark-bg" />
            </div>
        </div>
    );
};

export default AnalogClockWidget;