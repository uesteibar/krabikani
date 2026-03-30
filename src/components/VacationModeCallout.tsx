import React, { useMemo, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Linking } from 'react-native';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';

import {
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  MIN_TOUCH_TARGET,
  useTheme,
} from '../theme';

const WANIKANI_ACCOUNT_URL = 'https://www.wanikani.com/settings/account';

export interface VacationModeCalloutProps {
  testID?: string;
}

export function VacationModeCallout({
  testID = 'vacation-mode-callout',
}: VacationModeCalloutProps) {
  const { colors } = useTheme();

  const dynamicStyles = useMemo(
    () => ({
      container: {
        backgroundColor: colors.background.secondary,
        borderColor: colors.border.medium,
      },
      title: {
        color: colors.text.primary,
      },
      message: {
        color: colors.text.secondary,
      },
      button: {
        borderColor: colors.text.tertiary,
      },
      buttonText: {
        color: colors.text.primary,
      },
      icon: colors.text.tertiary,
    }),
    [colors],
  );

  const handleManagePress = useCallback(() => {
    Linking.openURL(WANIKANI_ACCOUNT_URL);
  }, []);

  return (
    <View style={[styles.container, dynamicStyles.container]} testID={testID}>
      <MaterialDesignIcons
        name="palm-tree"
        size={FONT_SIZES.xxxl * 2}
        color={dynamicStyles.icon}
        testID="vacation-icon"
      />
      <Text style={[styles.title, dynamicStyles.title]}>Vacation Mode</Text>
      <Text style={[styles.message, dynamicStyles.message]}>
        Your reviews are paused. Enjoy your break!
      </Text>
      <TouchableOpacity
        style={[styles.button, dynamicStyles.button]}
        onPress={handleManagePress}
        activeOpacity={0.6}
        testID="vacation-manage-button"
      >
        <Text style={[styles.buttonText, dynamicStyles.buttonText]}>
          Manage on WaniKani
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: SPACING.xxl,
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
  },
  message: {
    fontSize: FONT_SIZES.base,
    textAlign: 'center',
    lineHeight: FONT_SIZES.xxl,
  },
  button: {
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  buttonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
  },
});
