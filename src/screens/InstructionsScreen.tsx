import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  ImageSourcePropType,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  title: React.ReactNode;
  image: ImageSourcePropType;
}

const U: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={{ color: COLORS.subject.kanji }}>{children}</Text>
);

const STEPS: InstructionStep[] = [
  {
    title: (
      <>
        Go to <U>Personal API Tokens</U> in your WaniKani settings
      </>
    ),
    image: require('../../assets/wizard/step1-personal-access-tokens.png'),
  },
  {
    title: (
      <>
        Click on <U>Generate a new token</U>
      </>
    ),
    image: require('../../assets/wizard/step2-click-generate-new-token.png'),
  },
  {
    title: (
      <>
        Fill in the details and <U>check all permissions</U>
      </>
    ),
    image: require('../../assets/wizard/step3-generate-token.gif'),
  },
  {
    title: (
      <>
        Copy your <U>API key</U>.{'\n'}You'll need it in the next step!
      </>
    ),
    image: require('../../assets/wizard/step4-copy-tokens.png'),
  },
];

const WANIKANI_TOKENS_URL =
  'https://www.wanikani.com/settings/personal_access_tokens';

const SCREEN_WIDTH = Dimensions.get('window').width;
const MAX_IMAGE_WIDTH = SCREEN_WIDTH - SPACING.lg * 4;
const MAX_IMAGE_HEIGHT = SCREEN_WIDTH * 1.2;

function getImageSize(source: ImageSourcePropType) {
  const asset = Image.resolveAssetSource(source);
  const ratio = Math.min(
    MAX_IMAGE_WIDTH / asset.width,
    MAX_IMAGE_HEIGHT / asset.height,
  );
  return { width: asset.width * ratio, height: asset.height * ratio };
}

export function InstructionsScreen() {
  const navigation = useNavigation<InstructionsNavigationProp>();
  const { colors, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const [currentPage, setCurrentPage] = useState(0);
  const carouselRef = useRef<SwipableCarouselRef>(null);

  const handlePageChange = useCallback((index: number) => {
    setCurrentPage(index);
  }, []);

  const isLastPage = currentPage === STEPS.length - 1;

  const imageStyles = useMemo(
    () =>
      STEPS.map(step => ({
        ...getImageSize(step.image),
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 2,
        borderColor: colors.border.medium,
      })),
    [colors.border.medium],
  );

  const pages = STEPS.map((step, index) => (
    <View key={index} style={styles.pageContent}>
      <Image
        source={step.image}
        style={imageStyles[index]}
        testID={`instruction-image-${index}`}
      />

      <Text style={[styles.stepCaption, { color: colors.text.secondary }]}>
        {step.title}
      </Text>

      {index === STEPS.length - 1 && (
        <TouchableOpacity
          style={[styles.linkButton, { borderColor: colors.border.medium }]}
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
      style={[
        styles.container,
        {
          backgroundColor: colors.background.primary,
          paddingTop: insets.top,
        },
      ]}
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
            style={[
              styles.secondaryButton,
              { borderColor: colors.border.medium },
            ]}
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
              style={[
                styles.secondaryButtonText,
                { color: colors.text.secondary },
              ]}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCaption: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: SPACING.xxl,
    paddingHorizontal: SPACING.xxxl,
    alignSelf: 'stretch',
  },
  imageCard: {
    width: '100%',
    height: 350,
  },
  screenshot: {
    width: '100%',
    height: 350,
  },
  linkButton: {
    marginTop: SPACING.xxl,
    marginBottom: SPACING.lg,
    marginHorizontal: SPACING.lg,
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
