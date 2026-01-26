/**
 * Typography configuration for the WaniKani client app.
 * Defines font families and text styling constants.
 */

import { Platform } from 'react-native';

// ============================================
// Font Families
// ============================================

/**
 * Japanese display font family.
 * Uses Noto Sans JP variable font which supports light weight (300).
 * The font file is NotoSansJP-VF.otf in assets/fonts/.
 *
 * On iOS, the font family name is "Noto Sans JP".
 * On Android, the font file name (without extension) is used: "NotoSansJP-VF".
 */
export const FONT_FAMILY_JAPANESE_DISPLAY = Platform.select({
  ios: 'Noto Sans JP',
  android: 'NotoSansJP-VF',
  default: 'Noto Sans JP',
});

// ============================================
// Font Weights
// ============================================

/**
 * Font weight values for consistent typography.
 * Note: Not all weights may be supported by all fonts.
 */
export const FONT_WEIGHTS = {
  /** Thin weight (100) */
  thin: '100' as const,
  /** Extra light weight (200) */
  extraLight: '200' as const,
  /** Light weight (300) - used for Japanese display text */
  light: '300' as const,
  /** Normal/regular weight (400) */
  normal: '400' as const,
  /** Medium weight (500) */
  medium: '500' as const,
  /** Semi-bold weight (600) - used for answer input text */
  semiBold: '600' as const,
  /** Bold weight (700) */
  bold: '700' as const,
  /** Extra bold weight (800) */
  extraBold: '800' as const,
  /** Black weight (900) */
  black: '900' as const,
} as const;

// ============================================
// Text Style Presets
// ============================================

/**
 * Preset text styles for common use cases.
 * These combine font family, weight, and other properties.
 */
export const TEXT_STYLES = {
  /**
   * Japanese character display style.
   * Used for large Japanese characters in reviews and lessons.
   * Uses light weight (300) for better readability.
   */
  japaneseDisplay: {
    fontFamily: FONT_FAMILY_JAPANESE_DISPLAY,
    fontWeight: FONT_WEIGHTS.light,
  },

  /**
   * Answer input style.
   * Used for text input fields where users type answers.
   * Uses semi-bold weight (600) for better visibility while typing.
   */
  answerInput: {
    fontWeight: FONT_WEIGHTS.semiBold,
  },
} as const;
