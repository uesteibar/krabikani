## Tags: textinput, theme, dark-mode, audit

# TextInput Theme Color Audit

**Date:** 2026-02-26
**Story:** US-001

## Purpose
This document provides a comprehensive audit of all TextInput components in the codebase to identify which components use theme-aware colors and which need updates for dark mode compatibility.

## Theme System Overview

The app uses a mature theme system with:
- **ThemeContext.tsx**: Provides `useTheme()` hook and `ThemeProvider`
- **colors.ts**: Defines `COLORS` (light mode) and `DARK_COLORS` overrides in ThemeContext
- **Key theme colors for text input:**
  - `theme.colors.text.primary`: Main text color (#333333 light, #E0E0E0 dark)
  - `theme.colors.text.placeholder`: Placeholder text (#999999 light, #666666 dark)
  - `theme.colors.background.input`: Input background (#FAFAFA light, #2A2A2A dark)

## Component Audit Results

### ✅ Components Already Using Theme Colors

#### 1. FocusableInput (src/components/FocusableInput.tsx)
**Status:** Theme-aware
**Line references:**
- Line 104: `placeholderTextColor={COLORS.text.placeholder}` - Uses COLORS constant directly
- Line 132: `backgroundColor: COLORS.background.input` - Uses COLORS constant directly
- Line 133: `color: COLORS.text.primary` - Uses COLORS constant directly

**Note:** Uses `COLORS` imports directly rather than `useTheme()` hook. While this works, it doesn't dynamically respond to theme changes. Should be updated to use `useTheme()` for consistency.

#### 2. SearchScreen (src/screens/SearchScreen.tsx)
**Status:** Theme-aware
**Line references:**
- Line 71: `const theme = useTheme()` - Uses theme hook
- Line 144: `color: theme.colors.text.primary` - Dynamic theme color
- Line 275: `placeholderTextColor={theme.colors.text.tertiary}` - Dynamic theme color (note: uses tertiary, not placeholder)

**Excellent implementation:** Properly uses `useTheme()` hook and dynamically applies colors through `dynamicStyles` object.

#### 3. SettingsScreen (src/screens/SettingsScreen.tsx)
**Status:** Theme-aware
**Line references:**
- Line 55: `const { colors } = useTheme()` - Uses theme hook
- Line 90: `color: colors.text.primary` - Dynamic theme color
- Line 91: `backgroundColor: colors.background.input` - Dynamic theme color
- Line 395: `placeholderTextColor={colors.text.placeholder}` - Dynamic theme color

**Excellent implementation:** Properly uses `useTheme()` hook and applies colors through `dynamicStyles` object.

#### 4. ApiKeyInputScreen (src/screens/ApiKeyInputScreen.tsx)
**Status:** Theme-aware
**Line references:**
- Line 31: `const { colors, shadow } = useTheme()` - Uses theme hook
- Line 92: `color: colors.text.primary` - Dynamic theme color
- Line 93: `backgroundColor: colors.background.input` - Dynamic theme color
- Line 107: `placeholderTextColor={colors.text.placeholder}` - Dynamic theme color

**Excellent implementation:** Properly uses `useTheme()` hook and applies colors through inline styles.

### ⚠️ Components Needing Updates

#### 5. QuizEngine (src/components/quiz/QuizEngine.tsx)
**Status:** Partially theme-aware
**Line references:**
- Line 51: `const { colors } = useTheme()` - Uses theme hook
- Line 59: `backgroundColor: colors.background.input` - Only background is themed
- Line 589: `placeholderTextColor={colors.text.placeholder}` - Placeholder color is themed
- Line 584: `style={[styles.input, dynamicStyles.input, { borderColor: backgroundColor }]}` - **Missing text color!**

**Issue:** The TextInput does not have a `color` property set. This means it will use the system default text color, which may not be visible in dark mode. The background is properly themed, but the text color is missing.

**Required change:**
```typescript
// In dynamicStyles (around line 58):
input: {
  backgroundColor: colors.background.input,
  color: colors.text.primary, // ADD THIS
},
```

#### 6. CorrectFeedbackView (src/components/CorrectFeedbackView.tsx)
**Status:** Not theme-aware
**Line references:**
- Line 87: `backgroundColor: COLORS.background.input` - Uses static COLORS constant
- No `useTheme()` hook usage
- No explicit `color` property on TextInput (line 52-57)
- No `placeholderTextColor` (though this is a read-only input with value)

**Issue:** This component is not using the theme system at all. It imports `COLORS` from theme but doesn't use the `useTheme()` hook, so colors are hardcoded to light mode values.

**Required changes:**
1. Import and use `useTheme()` hook
2. Apply theme colors to TextInput:
   - `color: theme.colors.text.primary`
   - `backgroundColor: theme.colors.background.input`

**Note:** This component renders a read-only TextInput that displays the user's answer in a correct feedback state. It's always populated with a value, so placeholder color is not needed.

## Summary Statistics

- **Total TextInput components audited:** 6
- **Already theme-aware:** 4 (FocusableInput, SearchScreen, SettingsScreen, ApiKeyInputScreen)
- **Needing updates:** 2 (QuizEngine, CorrectFeedbackView)
- **FocusableInput special case:** 1 (uses COLORS directly instead of useTheme() hook)

## Recommendations

### Priority 1: QuizEngine
- **Risk:** High - actively used in quiz sessions
- **Complexity:** Low - simple addition to existing dynamicStyles
- **Impact:** Text may be invisible in dark mode

### Priority 2: CorrectFeedbackView
- **Risk:** Medium - shown briefly after correct answers
- **Complexity:** Medium - needs to add useTheme hook and dynamicStyles
- **Impact:** Read-only feedback may have poor contrast

### Priority 3: FocusableInput (refactor)
- **Risk:** Low - currently works, but not following best practices
- **Complexity:** Low - replace COLORS imports with useTheme() hook
- **Impact:** No functional change, improves consistency and future maintainability

## Implementation Notes

### Pattern to Follow
All TextInput components should:
1. Use `const { colors } = useTheme()` or `const theme = useTheme()`
2. Apply colors via `dynamicStyles` or inline styles that reference theme colors
3. Always set these three properties:
   - `color={theme.colors.text.primary}` - for input text
   - `placeholderTextColor={theme.colors.text.placeholder}` - for placeholder
   - `backgroundColor={theme.colors.background.input}` - for background

### Example Pattern
```typescript
const { colors } = useTheme();

const dynamicStyles = useMemo(
  () => ({
    input: {
      backgroundColor: colors.background.input,
      color: colors.text.primary,
    },
  }),
  [colors]
);

// Later in render:
<TextInput
  style={[styles.input, dynamicStyles.input]}
  placeholderTextColor={colors.text.placeholder}
  // ... other props
/>
```

## Files Not Containing TextInput Components

The following files were found to contain "TextInput" in searches but are not component implementations:
- **src/hooks/useAutoFocus.ts**: Hook that accepts `TextInput` as a type parameter
- **__tests__/components/ReviewSession.test.tsx**: Test file
- **.ralph/progress.txt**: Progress tracking file (not source code)

These files do not need updates.
