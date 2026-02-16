/**
 * Centralized color theme for the WaniKani client app.
 * Uses official WaniKani-inspired colors with additional UI colors.
 */

import type { SubjectType } from '../api/types';

// ============================================
// Subject Type Colors (WaniKani Official)
// ============================================

/**
 * WaniKani subject type colors.
 * These are the official colors used by WaniKani for subject types.
 */
export const SUBJECT_COLORS = {
  /** Blue - used for radicals (building blocks) */
  radical: '#00AAFF',
  /** Pink/Magenta - used for kanji characters */
  kanji: '#FF00AA',
  /** Purple - used for vocabulary words */
  vocabulary: '#AA00FF',
  /** Purple - used for kana vocabulary (same as vocabulary) */
  kana_vocabulary: '#AA00FF',
} as const;

// ============================================
// SRS Level Colors (WaniKani Official)
// ============================================

/**
 * SRS level information with colors and names.
 * Based on WaniKani's spaced repetition system stages.
 */
export const SRS_LEVELS = {
  apprentice: {
    name: 'Apprentice',
    color: '#DD0093',
    stages: [1, 2, 3, 4],
  },
  guru: {
    name: 'Guru',
    color: '#882D9E',
    stages: [5, 6],
  },
  master: {
    name: 'Master',
    color: '#294DDB',
    stages: [7],
  },
  enlightened: {
    name: 'Enlightened',
    color: '#0093DD',
    stages: [8],
  },
  burned: {
    name: 'Burned',
    color: '#434343',
    stages: [9],
  },
} as const;

export type SrsLevelKey = keyof typeof SRS_LEVELS;

export interface SrsLevelInfo {
  key: SrsLevelKey;
  name: string;
  color: string;
  stage: number;
}

/**
 * Get the SRS level information for a given stage number.
 * @param stage - The SRS stage number (1-9)
 * @returns The SRS level info including name, color, and key
 */
export function getSrsLevelInfo(stage: number): SrsLevelInfo | null {
  if (stage < 1 || stage > 9) {
    return null;
  }

  for (const key of Object.keys(SRS_LEVELS) as SrsLevelKey[]) {
    const level = SRS_LEVELS[key];
    if ((level.stages as readonly number[]).includes(stage)) {
      return {
        key,
        name: level.name,
        color: level.color,
        stage,
      };
    }
  }

  return null;
}

/**
 * Calculate the new SRS stage after an incorrect answer.
 * WaniKani SRS penalty rules:
 * - Apprentice 1-4 (stages 1-4): drop to Apprentice 1 (stage 1)
 * - Guru 1-2 (stages 5-6): drop to Apprentice 4 (stage 4)
 * - Master (stage 7): drop to Guru 1 (stage 5)
 * - Enlightened (stage 8): drop to Guru 1 (stage 5)
 * - Burned (stage 9): doesn't get reviewed (return stage 9)
 *
 * @param currentStage - The current SRS stage (1-9)
 * @returns The new stage after an incorrect answer
 */
export function calculateSrsStageAfterIncorrect(currentStage: number): number {
  if (currentStage < 1 || currentStage > 9) {
    return currentStage;
  }

  if (currentStage <= 4) {
    // Apprentice 1-4: drop to Apprentice 1
    return 1;
  } else if (currentStage <= 6) {
    // Guru 1-2: drop to Apprentice 4
    return 4;
  } else if (currentStage <= 8) {
    // Master or Enlightened: drop to Guru 1
    return 5;
  }

  // Burned (stage 9): doesn't change (shouldn't be reviewed anyway)
  return 9;
}

/**
 * Get the color for a subject type.
 * @param subjectType - The type of subject (radical, kanji, vocabulary, kana_vocabulary)
 * @returns The hex color code for the subject type
 */
export function getSubjectColor(subjectType: SubjectType): string {
  return SUBJECT_COLORS[subjectType] ?? COLORS.neutral.gray500;
}

// ============================================
// Core Color Palette
// ============================================

export const COLORS = {
  // Subject types (re-exported for convenience)
  subject: SUBJECT_COLORS,

  // Feedback colors
  feedback: {
    /** Green - used for correct answers and success states */
    correct: '#4CAF50',
    /** Red - used for incorrect answers and error states */
    incorrect: '#F44336',
    /** Orange - used for warnings and wrap-up mode */
    warning: '#E67E22',
    /** Amber/Yellow - used for fuzzy match (typo-forgiven) answers */
    fuzzyMatch: '#F59E0B',
  },

  // Status colors
  status: {
    /** Red - used for offline indicator */
    offline: '#EF4444',
    /** Orange - used for pending sync indicator */
    pendingSync: '#F57C00',
    /** Orange background for pending sync */
    pendingSyncBackground: '#FFF3E0',
  },

  // Neutral colors
  neutral: {
    white: '#FFFFFF',
    black: '#000000',
    gray50: '#FAFAFA',
    gray100: '#F5F5F5',
    gray200: '#EEEEEE',
    gray300: '#E0E0E0',
    gray400: '#BDBDBD',
    gray500: '#9E9E9E',
    gray600: '#757575',
    gray700: '#616161',
    gray800: '#424242',
    gray900: '#212121',
  },

  // Text colors
  text: {
    primary: '#333333',
    secondary: '#666666',
    tertiary: '#888888',
    placeholder: '#999999',
    inverse: '#FFFFFF',
    disabled: '#AAAAAA',
  },

  // Background colors
  background: {
    primary: '#FFFFFF',
    secondary: '#F8F8F8',
    input: '#FAFAFA',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // Border colors
  border: {
    light: '#EEEEEE',
    medium: '#DDDDDD',
    dark: '#CCCCCC',
  },

  // Link color
  link: '#007AFF',

  // Component section colors (e.g., "Made up of" sections in LessonCard)
  componentSection: {
    background: '#E8F4FF',
    border: '#B8D4F0',
  },

  // Chart colors
  chart: {
    barBackground: '#E8E8E8',
  },

  // Shadow (for elevation)
  shadow: '#000000',
} as const;

// ============================================
// Semantic Color Mappings
// ============================================

/**
 * Dashboard-specific colors.
 * Lessons use kanji color (pink), reviews use vocabulary color (purple).
 */
export const DASHBOARD_COLORS = {
  /** Pink - lessons are about learning new items, similar to kanji learning */
  lessons: SUBJECT_COLORS.kanji,
  /** Purple - reviews are for vocabulary practice */
  reviews: SUBJECT_COLORS.vocabulary,
} as const;

/**
 * Progress indicator colors.
 */
export const PROGRESS_COLORS = {
  /** Background color for progress bars */
  background: COLORS.neutral.gray300,
  /** Fill color for normal progress */
  fill: COLORS.feedback.correct,
  /** Fill color for wrap-up mode */
  wrapUpFill: COLORS.feedback.warning,
} as const;

// ============================================
// Common Style Patterns
// ============================================

/**
 * Standard shadow properties for elevated components.
 */
export const SHADOW = {
  color: COLORS.shadow,
  offset: { width: 0, height: 2 },
  opacity: 0.1,
  radius: 4,
  elevation: 3,
} as const;

/**
 * Minimum touch target size for accessibility (44x44 dp).
 */
export const MIN_TOUCH_TARGET = 44;

/**
 * Standard spacing values.
 */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/**
 * Standard border radius values.
 */
export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
} as const;

/**
 * Typography sizes.
 */
export const FONT_SIZES = {
  /** Extra small text */
  xs: 12,
  /** Small text */
  sm: 14,
  /** Base/body text */
  base: 16,
  /** Large text */
  lg: 18,
  /** Extra large text */
  xl: 20,
  /** 2x large text */
  xxl: 24,
  /** 3x large text */
  xxxl: 32,
  /** Characters/display text */
  display: 72,
} as const;
