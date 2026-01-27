import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { RootStackParamList } from '../navigation/types';
import {
  useTheme,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  MIN_TOUCH_TARGET,
  COLORS,
} from '../theme';

type WelcomeNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Welcome'
>;

export function WelcomeScreen() {
  const navigation = useNavigation<WelcomeNavigationProp>();
  const { colors, shadow } = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      testID="welcome-screen"
    >
      <View style={styles.content}>
        <Image
          source={require('../../assets/cabrigator-icon.png')}
          style={styles.logo}
          testID="welcome-logo"
        />

        <Text style={[styles.appName, { color: colors.text.primary }]}>
          Krabikani
        </Text>

        <Text style={[styles.tagline, { color: colors.text.secondary }]}>
          Master Japanese, one review at a time
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: COLORS.subject.vocabulary,
              shadowColor: shadow.color,
              shadowOffset: shadow.offset,
              shadowOpacity: shadow.opacity,
              shadowRadius: shadow.radius,
            },
          ]}
          onPress={() => navigation.navigate('Instructions')}
          activeOpacity={0.8}
          testID="get-started-button"
        >
          <Text style={styles.buttonText}>Get Started</Text>
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
  appName: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  tagline: {
    fontSize: FONT_SIZES.lg,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: SPACING.xxl,
    paddingBottom: SPACING.xxxl,
  },
  button: {
    paddingVertical: SPACING.lg,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
