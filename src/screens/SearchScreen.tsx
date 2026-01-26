import React, { useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  useTheme,
} from '../theme';

export function SearchScreen() {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);

  // Auto-focus the input when screen opens
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const dynamicStyles = useMemo(
    () => ({
      container: {
        backgroundColor: theme.colors.background.primary,
      },
      input: {
        borderColor: theme.colors.text.tertiary,
        backgroundColor: theme.colors.background.secondary,
        color: theme.colors.text.primary,
      },
      emptyStateText: {
        color: theme.colors.text.secondary,
      },
    }),
    [theme],
  );

  return (
    <View style={[styles.container, dynamicStyles.container]} testID="search-screen">
      <View style={styles.searchContainer}>
        <TextInput
          ref={inputRef}
          style={[styles.input, dynamicStyles.input]}
          placeholder="Search radicals, kanji, vocabulary..."
          placeholderTextColor={theme.colors.text.tertiary}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          testID="search-input"
        />
      </View>
      <View style={styles.emptyStateContainer} testID="empty-state">
        <Text style={[styles.emptyStateText, dynamicStyles.emptyStateText]}>
          Enter a search term to find learned items
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZES.base,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  emptyStateText: {
    fontSize: FONT_SIZES.base,
    textAlign: 'center',
    lineHeight: FONT_SIZES.xl,
  },
});
