import { useState, useEffect } from 'react';

// When the visual viewport height is smaller than the window's inner height
// by more than this threshold, we assume the virtual keyboard is open.
const KEYBOARD_THRESHOLD_PX = 150;

export function useVirtualKeyboard() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) {
      return;
    }

    const handleResize = () => {
      if (!window.visualViewport) return;
      const isLikelyOpen = window.innerHeight - window.visualViewport.height > KEYBOARD_THRESHOLD_PX;
      setIsKeyboardOpen(isLikelyOpen);
    };

    window.visualViewport.addEventListener('resize', handleResize);
    
    // Initial check in case keyboard is already open on load
    handleResize();

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  return isKeyboardOpen;
}
