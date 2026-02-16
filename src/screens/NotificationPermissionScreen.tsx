import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { RootStackParamList } from '../navigation/types';
import {
  requestPermissions,
  setHasAskedForPermissions,
  setNotificationsEnabled,
} from '../services/notificationService';
import {
  useTheme,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  MIN_TOUCH_TARGET,
} from '../theme';

type NotificationPermissionNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'NotificationPermission'
>;

type NotificationPermissionRouteProp = RouteProp<
  RootStackParamList,
  'NotificationPermission'
>;

export function NotificationPermissionScreen() {
  const navigation = useNavigation<NotificationPermissionNavigationProp>();
  const route = useRoute<NotificationPermissionRouteProp>();
  const isInitialSetup = route.params?.isInitialSetup ?? false;
  const theme = useTheme();
  const { colors, shadow } = theme;
  const [isLoading, setIsLoading] = useState(false);

  const dynamicStyles = useMemo(
    () => ({
      primaryButtonText: {
        color: colors.text.inverse,
      },
    }),
    [colors.text.inverse],
  );

  const navigateAfterChoice = () => {
    if (isInitialSetup) {
      // Navigate to Home after initial setup, replacing the navigation stack
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } else {
      navigation.goBack();
    }
  };

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      const status = await requestPermissions();
      await setHasAskedForPermissions(true);

      if (status === 'granted') {
        await setNotificationsEnabled(true);
      } else {
        // User denied permissions - disable notifications
        await setNotificationsEnabled(false);
      }
    } finally {
      setIsLoading(false);
      navigateAfterChoice();
    }
  };

  const handleMaybeLater = async () => {
    await setHasAskedForPermissions(true);
    await setNotificationsEnabled(false);
    navigateAfterChoice();
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      testID="notification-permission-screen"
    >
      <View style={styles.content}>
        <Text
          style={[styles.title, { color: colors.text.primary }]}
          testID="permission-title"
        >
          Stay on Top of Your Reviews
        </Text>

        <Text
          style={[styles.description, { color: colors.text.secondary }]}
          testID="permission-description"
        >
          Get reminded when you have reviews waiting so you never miss a study
          session
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor: colors.subject.vocabulary,
                shadowColor: shadow.color,
                shadowOffset: shadow.offset,
                shadowOpacity: shadow.opacity,
                shadowRadius: shadow.radius,
              },
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleEnableNotifications}
            activeOpacity={0.8}
            disabled={isLoading}
            testID="enable-notifications-button"
          >
            <Text style={[styles.primaryButtonText, dynamicStyles.primaryButtonText]}>
              {isLoading ? 'Requesting...' : 'Enable Notifications'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { borderColor: colors.border.medium },
            ]}
            onPress={handleMaybeLater}
            activeOpacity={0.8}
            disabled={isLoading}
            testID="maybe-later-button"
          >
            <Text
              style={[styles.secondaryButtonText, { color: colors.text.secondary }]}
            >
              Maybe Later
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  description: {
    fontSize: FONT_SIZES.base,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xxxl,
  },
  buttonContainer: {
    width: '100%',
    gap: SPACING.md,
  },
  primaryButton: {
    paddingVertical: SPACING.lg,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: SPACING.lg,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
