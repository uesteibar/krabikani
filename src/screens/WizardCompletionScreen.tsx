import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { RootStackParamList } from '../navigation/types';
import {
  useTheme,
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  MIN_TOUCH_TARGET,
} from '../theme';

type WizardCompletionNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'WizardCompletion'
>;

export function WizardCompletionScreen() {
  const navigation = useNavigation<WizardCompletionNavigationProp>();
  const { colors, shadow } = useTheme();

  const dynamicStyles = useMemo(
    () => ({
      primaryButtonText: {
        color: colors.text.inverse,
      },
    }),
    [colors.text.inverse],
  );

  const handleStartLearning = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      testID="wizard-completion-screen"
    >
      <View style={styles.content}>
        <Image
          source={require('../../assets/cabrigator-icon.png')}
          style={styles.logo}
          testID="completion-logo"
        />

        <Text style={[styles.title, { color: colors.text.primary }]}>
          You're all set!
        </Text>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              backgroundColor: COLORS.subject.vocabulary,
              shadowColor: shadow.color,
              shadowOffset: shadow.offset,
              shadowOpacity: shadow.opacity,
              shadowRadius: shadow.radius,
            },
          ]}
          onPress={handleStartLearning}
          activeOpacity={0.8}
          testID="start-learning-button"
        >
          <Text style={[styles.primaryButtonText, dynamicStyles.primaryButtonText]}>Start Learning</Text>
        </TouchableOpacity>
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
  logo: {
    width: 240,
    height: 240,
    marginBottom: SPACING.xxl,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.xxxl,
  },
  primaryButton: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxxl,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
});
