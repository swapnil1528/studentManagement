import { useState, useEffect } from 'react';

/**
 * useDeviceMode - Detects mobile device based on user agent and screen width.
 * Returns isMobile: true when accessed from a mobile browser or viewport <= 768px.
 */
export function useDeviceMode() {
    const checkMobile = () => {
        if (typeof window === 'undefined') return false;
        const ua = navigator.userAgent || navigator.vendor || window.opera || '';
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
        const isSmallScreen = window.innerWidth <= 768;
        return isMobileUA || isSmallScreen;
    };

    const [isMobile, setIsMobile] = useState(checkMobile);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(checkMobile());
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, []);

    return { isMobile };
}

export default useDeviceMode;
