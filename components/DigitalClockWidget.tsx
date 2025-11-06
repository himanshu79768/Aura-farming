import React, { useState, useEffect } from 'react';

const DigitalClockWidget: React.FC = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    const hours = time.getHours();
    const minutes = time.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;

    const dateString = time.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="w-full h-full p-4 flex flex-col items-center justify-center text-center">
            <div className="flex items-baseline justify-center">
                <h1 className="text-5xl font-bold tracking-tighter tabular-nums">
                    {formattedHours}:{String(minutes).padStart(2, '0')}
                </h1>
                <span className="text-2xl font-medium ml-1.5 lowercase">{ampm}</span>
            </div>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                {dateString}
            </p>
        </div>
    );
};

export default DigitalClockWidget;