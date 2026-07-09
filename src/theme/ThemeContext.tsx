/**
 * Theme context for dark mode support.
 * Respects system color scheme preference, with an optional in-app override.
 */

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

import { COLORS, SUBJECT_COLORS, DASHBOARD_COLORS, PROGRESS_COLORS, SHADOW } from './colors';
import { getSetting, setSetting } from '../storage/database';

// ============================================
// Dark Mode Color Overrides
// ============================================

/**
 * Dark mode color overrides.
 * Subject colors remain the same for brand consistency.
 */
const DARK_COLORS = {
  ...COLORS,
  // Background colors
  background: {
    primary: '#121212',
    secondary: '#1E1E1E',
    input: '#2A2A2A',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  // Text colors
  text: {
    primary: '#E0E0E0',
    secondary: '#AAAAAA',
    tertiary: '#888888',
    placeholder: '#666666',
    inverse: '#121212',
    disabled: '#555555',
  },
  // Border colors
  border: {
    light: '#333333',
    medium: '#444444',
    dark: '#555555',
  },
  // Link color
  link: '#4DA3FF',
  // Component section colors
  componentSection: {
    background: '#1A2A3A',
    border: '#2A3A4A',
  },
  // Chart colors
  chart: {
    barBackground: '#333333',
  },
  // Neutral colors adjusted for dark mode
  neutral: {
    ...COLORS.neutral,
    gray50: '#2A2A2A',
    gray100: '#333333',
    gray200: '#444444',
    gray300: '#555555',
    gray400: '#666666',
    gray500: '#777777',
    gray600: '#888888',
    gray700: '#999999',
    gray800: '#AAAAAA',
    gray900: '#BBBBBB',
  },
} as const;

/**
 * Dark mode shadow properties.
 * Shadows are more subtle in dark mode.
 */
const DARK_SHADOW = {
  color: '#000000',
  offset: { width: 0, height: 2 },
  opacity: 0.3,
  radius: 4,
  elevation: 4,
} as const;

// ============================================
// Theme Types
// ============================================

export type ColorScheme = 'light' | 'dark';

/** User's theme preference: follow system, always light, or always dark. */
export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_PREFERENCE_SETTING_KEY = 'themePreference';

/** Semantic text colors */
export interface TextColors {
  primary: string;
  secondary: string;
  tertiary: string;
  placeholder: string;
  inverse: string;
  disabled: string;
}

/** Semantic background colors */
export interface BackgroundColors {
  primary: string;
  secondary: string;
  input: string;
  overlay: string;
}

/** Semantic border colors */
export interface BorderColors {
  light: string;
  medium: string;
  dark: string;
}

/** Neutral grayscale colors */
export interface NeutralColors {
  white: string;
  black: string;
  gray50: string;
  gray100: string;
  gray200: string;
  gray300: string;
  gray400: string;
  gray500: string;
  gray600: string;
  gray700: string;
  gray800: string;
  gray900: string;
}

/** Component section colors (e.g., "Made up of" sections) */
export interface ComponentSectionColors {
  background: string;
  border: string;
}

/** Chart colors */
export interface ChartColors {
  barBackground: string;
}

export interface ThemeColors {
  subject: typeof SUBJECT_COLORS;
  feedback: typeof COLORS.feedback;
  status: typeof COLORS.status;
  neutral: NeutralColors;
  text: TextColors;
  background: BackgroundColors;
  border: BorderColors;
  link: string;
  componentSection: ComponentSectionColors;
  chart: ChartColors;
  shadow: string;
}

/** Shadow style properties */
export interface ShadowStyle {
  color: string;
  offset: { width: number; height: number };
  opacity: number;
  radius: number;
  elevation: number;
}

export interface Theme {
  colorScheme: ColorScheme;
  colors: ThemeColors;
  dashboardColors: typeof DASHBOARD_COLORS;
  progressColors: typeof PROGRESS_COLORS;
  shadow: ShadowStyle;
  isDark: boolean;
  /** The current user preference ('system' | 'light' | 'dark'). */
  themePreference: ThemePreference;
  /** Persist and apply a new theme preference immediately. */
  setThemePreference: (pref: ThemePreference) => void;
}

// ============================================
// Theme Context
// ============================================

const ThemeContext = createContext<Theme | null>(null);

export interface ThemeProviderProps {
  children: ReactNode;
  /** Force a specific color scheme (for testing). Overrides all preferences. */
  forcedColorScheme?: ColorScheme;
}

/**
 * ThemeProvider component that provides theme context to children.
 * Loads the persisted themePreference on mount and merges with system scheme.
 */
export function ThemeProvider({ children, forcedColorScheme }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');

  // Load persisted preference on mount (skip when forcedColorScheme is set, e.g. in tests)
  useEffect(() => {
    if (forcedColorScheme != null) return;
    getSetting(THEME_PREFERENCE_SETTING_KEY).then(value => {
      if (value === 'light' || value === 'dark' || value === 'system') {
        setThemePreferenceState(value);
      }
    });
  }, [forcedColorScheme]);

  const setThemePreference = useCallback((pref: ThemePreference) => {
    setThemePreferenceState(pref);
    setSetting(THEME_PREFERENCE_SETTING_KEY, pref);
  }, []);

  // Resolve effective color scheme:
  // forcedColorScheme wins (tests), then user preference, then system.
  const colorScheme: ColorScheme = useMemo(() => {
    if (forcedColorScheme != null) return forcedColorScheme;
    if (themePreference === 'light') return 'light';
    if (themePreference === 'dark') return 'dark';
    return systemColorScheme === 'dark' ? 'dark' : 'light';
  }, [forcedColorScheme, themePreference, systemColorScheme]);

  const isDark = colorScheme === 'dark';

  const theme: Theme = useMemo(() => {
    const colors = isDark ? DARK_COLORS : COLORS;
    const shadow = isDark ? DARK_SHADOW : SHADOW;

    return {
      colorScheme,
      colors: {
        subject: SUBJECT_COLORS,
        feedback: COLORS.feedback, // Feedback colors stay consistent
        status: COLORS.status, // Status colors stay consistent
        neutral: colors.neutral,
        text: colors.text,
        background: colors.background,
        border: colors.border,
        link: colors.link,
        componentSection: colors.componentSection,
        chart: colors.chart,
        shadow: colors.shadow,
      },
      dashboardColors: DASHBOARD_COLORS,
      progressColors: PROGRESS_COLORS,
      shadow,
      isDark,
      themePreference,
      setThemePreference,
    };
  }, [colorScheme, isDark, themePreference, setThemePreference]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access the current theme.
 * Must be used within a ThemeProvider.
 */
export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return theme;
}

/**
 * Hook to check if dark mode is active.
 * Must be used within a ThemeProvider.
 */
export function useDarkMode(): boolean {
  const theme = useTheme();
  return theme.isDark;
}
