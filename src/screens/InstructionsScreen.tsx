import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SwipableCarousel } from '../components/SwipableCarousel';
import type { SwipableCarouselRef } from '../components/SwipableCarousel';
import type { RootStackParamList } from '../navigation/types';
import {
  useTheme,
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  MIN_TOUCH_TARGET,
} from '../theme';

type InstructionsNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Instructions'
>;

interface InstructionStep {
  title: string;
  image: ImageSourcePropType;
}

const STEPS: InstructionStep[] = [
  {
    title: 'Go to your WaniKani Settings',
    image: require('../../assets/wizard/step1-settings.png'),
  },
  {
    title: 'Click on Personal Access Tokens',
    image: require('../../assets/wizard/step2-personal-access-tokens.png'),
  },
  {
    title: 'Generate a new token',
    image: require('../../assets/wizard/step3-generate-token.png'),
  },
  {
    title: 'Copy your new token',
    image: require('../../assets/wizard/step4-copy-token.png'),
  },
];

const WANIKANI_TOKENS_URL =
  'https://www.wanikani.com/settings/personal_access_tokens';

export function InstructionsScreen() {
  const navigation = useNavigation<InstructionsNavigationProp>();
  const { colors, shadow } = useTheme();
  const [currentPage, setCurrentPage] = useState(0);
  const carouselRef = useRef<SwipableCarouselRef>(null);

  const handlePageChange = useCallback((index: number) => {
    setCurrentPage(index);
  }, []);

  const isLastPage = currentPage === STEPS.length - 1;

  const pages = STEPS.map((step, index) => (
    <View key={index} style={styles.pageContent}>
      <Text style={[styles.stepTitle, { color: colors.text.primary }]}>
        {step.title}
      </Text>

      <View
        style={[
          styles.imageCard,
          {
            backgroundColor: colors.background.secondary,
            borderColor: colors.border.light,
          },
        ]}
      >
        <Image
          source={step.image}
          style={styles.screenshot}
          resizeMode="contain"
          testID={`instruction-image-${index}`}
        />
      </View>

      {index === STEPS.length - 1 && (
        <TouchableOpacity
          style={[
            styles.linkButton,
            { borderColor: colors.border.medium },
          ]}
          onPress={() => Linking.openURL(WANIKANI_TOKENS_URL)}
          activeOpacity={0.8}
          testID="open-wanikani-button"
        >
          <Text style={[styles.linkButtonText, { color: colors.text.primary }]}>
            Open WaniKani Settings
          </Text>
        </TouchableOpacity>
      )}
    </View>
  ));

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      testID="instructions-screen"
    >
      <SwipableCarousel
        pages={pages}
        onPageChange={handlePageChange}
        testID="instructions-carousel"
        ref={carouselRef}
      />

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border.medium }]}
            onPress={() => {
              if (currentPage === 0) {
                navigation.goBack();
              } else {
                carouselRef.current?.scrollToPage(currentPage - 1);
              }
            }}
            activeOpacity={0.8}
            testID="back-button"
          >
            <Text
              style={[styles.secondaryButtonText, { color: colors.text.secondary }]}
            >
              Back
            </Text>
          </TouchableOpacity>

          {isLastPage ? (
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
              onPress={() => navigation.navigate('ApiKeyInput')}
              activeOpacity={0.8}
              testID="continue-button"
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          ) : (
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
              onPress={() => {
                carouselRef.current?.scrollToPage(currentPage + 1);
              }}
              activeOpacity={0.8}
              testID="next-button"
            >
              <Text style={styles.primaryButtonText}>Next</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pageContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl,
  },
  stepTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  imageCard: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
    alignItems: 'center',
  },
  screenshot: {
    width: '100%',
    height: 400,
  },
  linkButton: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: SPACING.xxl,
    paddingBottom: SPACING.xxxl,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: SPACING.lg,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flex: 1,
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
});
