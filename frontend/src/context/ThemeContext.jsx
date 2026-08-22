import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEME_STORAGE_KEY = 'adharra_theme';
export const ACCENT_STORAGE_KEY = 'adharra_accent';

const ACCENT_COLORS = {
  purple: { main: '#7C3AED', hover: '#6D28D9' },
  blue:   { main: '#3B82F6', hover: '#2563EB' },
  emerald:{ main: '#10B981', hover: '#059669' },
  amber:  { main: '#F59E0B', hover: '#D97706' }
};

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeModeState] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (['light', 'dark', 'system', 'midnight-violet', 'graphite', 'high-contrast'].includes(saved)) {
        return saved;
      }
    } catch (e) {}
    return 'light';
  });

  const [accentMode, setAccentModeState] = useState(() => {
    try {
      const saved = localStorage.getItem(ACCENT_STORAGE_KEY);
      if (['', 'purple', 'blue', 'emerald', 'amber'].includes(saved)) {
        return saved;
      }
    } catch (e) {}
    return '';
  });

  const [systemIsDark, setSystemIsDark] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      setSystemIsDark(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  const resolvedTheme = themeMode === 'system' 
    ? (systemIsDark ? 'dark' : 'light') 
    : themeMode;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch (e) {}
  }, [themeMode, resolvedTheme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accentMode);
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, accentMode);
    } catch (e) {}
  }, [accentMode]);

  const setThemeMode = (mode) => {
    if (['light', 'dark', 'system', 'midnight-violet', 'graphite', 'high-contrast'].includes(mode)) {
      setThemeModeState(mode);
    }
  };

  const setAccentMode = (accent) => {
    if (['', 'purple', 'blue', 'emerald', 'amber'].includes(accent)) {
      setAccentModeState(prev => prev === accent ? '' : accent);
    }
  };

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, resolvedTheme, accentMode, setAccentMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
