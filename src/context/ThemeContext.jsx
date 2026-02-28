/**
 * ThemeContext — Manages dark/light mode globally.
 * Persists user preference in localStorage.
 * Adds/removes 'dark' class on document.documentElement.
 */

import { createContext, useContext, useState, useEffect } from 'react';

const THEME_KEY = 'erp_theme';
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    const [isDark, setIsDark] = useState(() => {
        const stored = localStorage.getItem(THEME_KEY);
        return stored === 'dark';
    });

    // Apply class to <html> element whenever theme changes
    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    }, [isDark]);

    const toggleTheme = () => setIsDark(prev => !prev);

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within ThemeProvider');
    return context;
}
