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
  SRS_LEVELS,
  getSrsLevelInfo,
  calculateSrsStageAfterIncorrect,
} from './colors';

export type { SrsLevelKey, SrsLevelInfo } from './colors';

export {
  ThemeProvider,
  useTheme,
  useDarkMode,
} from './ThemeContext';

export type {
  ColorScheme,
  ThemePreference,
  ThemeColors,
  Theme,
  ThemeProviderProps,
} from './ThemeContext';

export {
  FONT_FAMILY_JAPANESE_DISPLAY,
  FONT_WEIGHTS,
  TEXT_STYLES,
} from './typography';
