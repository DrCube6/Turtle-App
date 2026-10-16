import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light';

// Screen colours that are not a Tamagui button theme. Buttons pick light or
// dark automatically from the theme around them (theme="yellow" becomes
// light_yellow / dark_yellow).
//   background - screen background      surface - chart backgrounds
//   text / muted - main and secondary text
//   border - outer outlines (screen frame, bottom bar)
//   subtle - lighter lines (separators, inner boxes)
export const PALETTES = {
  // Exactly what the app has always used
  dark: {
    background: '#202020',
    surface: '#1a1a1a',
    text: 'white',
    muted: 'gray',
    border: 'white',
    subtle: 'gray',
  },
  // Outlines gray rather than black, so they stay soft on a light background
  light: {
    background: '#f7f7f7',
    surface: '#ffffff',
    text: '#111111',
    muted: '#6b6b6b',
    border: 'gray',
    subtle: '#bbbbbb',
  },
} as const;

// Literal colour types (Tamagui colour props reject a plain string type)
export type ThemeColors = (typeof PALETTES)[ThemeMode];

// Remembered on this phone, like the other preferences
export const THEME_KEY = 'turtle_theme';

type ThemeContextValue = {
  mode: ThemeMode;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  colors: PALETTES.dark,
  setMode: () => {},
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(THEME_KEY)
      .then((saved) => {
        if (!cancelled && (saved === 'dark' || saved === 'light')) setModeState(saved);
      })
      .catch((e) => console.warn('Failed to load theme', e));
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(THEME_KEY, next).catch((e) => console.warn('Failed to save theme', e));
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, colors: PALETTES[mode], setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
