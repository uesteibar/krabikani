/**
 * Theme exports for the WaniKani client app.
 */

export {
  SUBJECT_COLORS,
  getSubjectColor,
  COLORS,
  DASHBOARD_COLORS,
  PROGRESS_COLORS,
  SHADOW,
  MIN_TOUCH_TARGET,
  SPACING,
  BORDER_RADIUS,
  FONT_SIZES,
} from './colors';

export {
  ThemeProvider,
  useTheme,
  useDarkMode,
} from './ThemeContext';

export type {
  ColorScheme,
  ThemeColors,
  Theme,
  ThemeProviderProps,
} from './ThemeContext';
