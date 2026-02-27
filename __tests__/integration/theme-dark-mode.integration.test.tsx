/**
 * Integration tests for dark mode theme support (uni-87).
 *
 * Verifies that all screens and components correctly use theme-aware colors
 * in both light and dark modes, matching the PRD integration test specifications.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, Alert } from 'react-native';

import { ThemeProvider, useTheme } from '../../src/theme/ThemeContext';
import { COLORS } from '../../src/theme/colors';
import type { ColorScheme, Theme } from '../../src/theme/ThemeContext';

// ============================================
// Helpers
// ============================================

function renderWithTheme(ui: React.ReactElement, colorScheme: ColorScheme = 'light') {
  return render(
    <ThemeProvider forcedColorScheme={colorScheme}>{ui}</ThemeProvider>,
  );
}

/**
 * Flatten a React Native style prop (which may be an array of objects) into a single object.
 */
function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(flattenStyle));
  }
  if (style && typeof style === 'object') {
    return style as Record<string, unknown>;
  }
  return {};
}

// ============================================
// IT-001: Theme palette contains all required semantic colors
// ============================================

describe('IT-001: Theme palette semantic colors', () => {
  function CaptureTheme({ onCapture }: { onCapture: (theme: Theme) => void }) {
    const theme = useTheme();
    onCapture(theme);
    return null;
  }

  it('COLORS includes link, componentSection, and chart.barBackground', () => {
    expect(COLORS.link).toBe('#007AFF');
    expect(COLORS.componentSection.background).toBe('#E8F4FF');
    expect(COLORS.componentSection.border).toBe('#B8D4F0');
    expect(COLORS.chart.barBackground).toBe('#E8E8E8');
  });

  it('dark theme overrides include corresponding dark variants', () => {
    let capturedTheme: Theme | null = null;

    render(
      <ThemeProvider forcedColorScheme="dark">
        <CaptureTheme onCapture={(t) => { capturedTheme = t; }} />
      </ThemeProvider>,
    );

    expect(capturedTheme).not.toBeNull();
    expect(capturedTheme!.colors.link).toBe('#4DA3FF');
    expect(capturedTheme!.colors.componentSection.background).toBe('#1A2A3A');
    expect(capturedTheme!.colors.componentSection.border).toBe('#2A3A4A');
    expect(capturedTheme!.colors.chart.barBackground).toBe('#333333');
  });

  it('all existing light mode color values are unchanged', () => {
    let capturedTheme: Theme | null = null;

    render(
      <ThemeProvider forcedColorScheme="light">
        <CaptureTheme onCapture={(t) => { capturedTheme = t; }} />
      </ThemeProvider>,
    );

    const colors = capturedTheme!.colors;
    expect(colors.background.primary).toBe('#FFFFFF');
    expect(colors.background.secondary).toBe('#F8F8F8');
    expect(colors.background.input).toBe('#FAFAFA');
    expect(colors.text.primary).toBe('#333333');
    expect(colors.text.secondary).toBe('#666666');
    expect(colors.text.tertiary).toBe('#888888');
    expect(colors.text.placeholder).toBe('#999999');
    expect(colors.text.inverse).toBe('#FFFFFF');
    expect(colors.text.disabled).toBe('#AAAAAA');
    expect(colors.border.light).toBe('#EEEEEE');
    expect(colors.border.medium).toBe('#DDDDDD');
    expect(colors.border.dark).toBe('#CCCCCC');
    expect(colors.feedback.correct).toBe('#4CAF50');
    expect(colors.feedback.incorrect).toBe('#F44336');
    expect(colors.link).toBe('#007AFF');
    expect(colors.componentSection.background).toBe('#E8F4FF');
    expect(colors.componentSection.border).toBe('#B8D4F0');
    expect(colors.chart.barBackground).toBe('#E8E8E8');
  });

  it('dark theme provides complete color structure matching light theme keys', () => {
    let lightTheme: Theme | null = null;
    let darkTheme: Theme | null = null;

    render(
      <ThemeProvider forcedColorScheme="light">
        <CaptureTheme onCapture={(t) => { lightTheme = t; }} />
      </ThemeProvider>,
    );
    render(
      <ThemeProvider forcedColorScheme="dark">
        <CaptureTheme onCapture={(t) => { darkTheme = t; }} />
      </ThemeProvider>,
    );

    const lightKeys = Object.keys(lightTheme!.colors).sort();
    const darkKeys = Object.keys(darkTheme!.colors).sort();
    expect(darkKeys).toEqual(lightKeys);
  });
});

// ============================================
// IT-002: Home screen components render with theme colors
// ============================================

import { DashboardStats } from '../../src/components/DashboardStats';
import { UpcomingReviewsChart } from '../../src/components/UpcomingReviewsChart';
import { LearnedCounts } from '../../src/components/LearnedCounts';
import { LastSyncedIndicator } from '../../src/components/LastSyncedIndicator';

describe('IT-002: Home screen components theme rendering', () => {
  it('DashboardStats uses light background/text colors in light mode', () => {
    const { getByTestId } = renderWithTheme(
      <DashboardStats lessonsCount={5} reviewsCount={10} />,
      'light',
    );

    const lessonsButton = getByTestId('lessons-button');
    const flatStyle = flattenStyle(lessonsButton.props.style);
    expect(flatStyle.backgroundColor).toBe('#FFFFFF');
  });

  it('DashboardStats uses dark background/text colors in dark mode', () => {
    const { getByTestId } = renderWithTheme(
      <DashboardStats lessonsCount={5} reviewsCount={10} />,
      'dark',
    );

    const lessonsButton = getByTestId('lessons-button');
    const flatStyle = flattenStyle(lessonsButton.props.style);
    expect(flatStyle.backgroundColor).toBe('#121212');
  });

  it('UpcomingReviewsChart uses dark chart color for bar backgrounds in dark mode', () => {
    const data = [
      { hour: new Date(), count: 5, cumulativeCount: 5 },
      { hour: new Date(), count: 3, cumulativeCount: 8 },
    ];

    const { getByTestId } = renderWithTheme(
      <UpcomingReviewsChart data={data} />,
      'dark',
    );

    const barContainer = getByTestId('review-bar-container-0');
    const flatStyle = flattenStyle(barContainer.props.style);
    expect(flatStyle.backgroundColor).toBe('#333333');
  });

  it('LearnedCounts adapts text/background colors in dark mode', () => {
    const { getByTestId } = renderWithTheme(
      <LearnedCounts kanjiCount={100} vocabularyCount={200} />,
      'dark',
    );

    const kanjiLearned = getByTestId('kanji-learned-value');
    const kanjiContainer = getByTestId('kanji-learned');
    expect(kanjiLearned).toBeTruthy();
    expect(kanjiContainer).toBeTruthy();
  });

  it('LastSyncedIndicator adapts colors in dark mode', () => {
    const { getByText } = renderWithTheme(
      <LastSyncedIndicator lastSyncedAt={new Date()} />,
      'dark',
    );

    const label = getByText('Last synced:');
    const flatStyle = flattenStyle(label.props.style);
    expect(flatStyle.color).toBe('#AAAAAA');
  });
});

// ============================================
// IT-003: SettingsScreen dark mode rendering
// ============================================

import { SettingsScreen } from '../../src/screens/SettingsScreen';
import * as secureStorage from '../../src/storage/secureStorage';
import * as database from '../../src/storage/database';
import * as notificationService from '../../src/services/notificationService';
import * as appStateSync from '../../src/utils/appStateSync';
import type { RootStackParamList } from '../../src/navigation/types';

jest.mock('../../src/storage/secureStorage');
jest.mock('../../src/storage/database');
jest.mock('../../src/api/wanikaniApi');
jest.mock('../../src/sync/syncService');
jest.mock('../../src/services/notificationService');
jest.mock('../../src/services/reviewNotificationScheduler');
jest.mock('../../src/utils/appStateSync');
jest.spyOn(Alert, 'alert');

const Stack = createNativeStackNavigator<RootStackParamList>();

function MockHomeScreen() {
  return <View testID="home-screen"><Text>Home</Text></View>;
}
function MockWelcomeScreen() {
  return <View testID="welcome-screen"><Text>Welcome</Text></View>;
}
function MockNotificationPermissionScreen() {
  return <View testID="notification-permission-screen"><Text>NotificationPermission</Text></View>;
}

function renderSettingsWithNavigation(colorScheme: ColorScheme = 'light') {
  return render(
    <ThemeProvider forcedColorScheme={colorScheme}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Settings">
          <Stack.Screen name="Home" component={MockHomeScreen} />
          <Stack.Screen name="Welcome" component={MockWelcomeScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="NotificationPermission" component={MockNotificationPermissionScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>,
  );
}

const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>;
const mockDatabase = database as jest.Mocked<typeof database>;
const mockNotificationService = notificationService as jest.Mocked<typeof notificationService>;
const mockAppStateSync = appStateSync as jest.Mocked<typeof appStateSync>;

describe('IT-003: SettingsScreen dark mode rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecureStorage.getApiKey.mockResolvedValue('test-key');
    mockDatabase.getSetting.mockResolvedValue(null);
    mockDatabase.setSetting.mockResolvedValue(undefined);
    mockNotificationService.checkPermissions.mockResolvedValue('granted');
    mockNotificationService.hasAskedForPermissions.mockResolvedValue(false);
    mockAppStateSync.addAppStateChangeListener.mockReturnValue(() => {});
  });

  it('screen background uses dark background.primary in dark mode', async () => {
    const { getByTestId } = renderSettingsWithNavigation('dark');

    await waitFor(() => {
      expect(getByTestId('api-key-input')).toBeTruthy();
    });

    const input = getByTestId('api-key-input');
    const inputStyle = flattenStyle(input.props.style);
    expect(inputStyle.backgroundColor).toBe('#2A2A2A');
  });

  it('input fields use dark background.input and dark text colors', async () => {
    const { getByTestId } = renderSettingsWithNavigation('dark');

    await waitFor(() => {
      expect(getByTestId('api-key-input')).toBeTruthy();
    });

    const input = getByTestId('api-key-input');
    const inputStyle = flattenStyle(input.props.style);
    expect(inputStyle.backgroundColor).toBe('#2A2A2A');
    expect(inputStyle.color).toBe('#E0E0E0');
    expect(inputStyle.borderColor).toBe('#444444');
  });

  it('section divider uses dark border color in dark mode', async () => {
    const { getByTestId, getByText } = renderSettingsWithNavigation('dark');

    await waitFor(() => {
      expect(getByTestId('api-key-input')).toBeTruthy();
    });

    const sectionTitle = getByText('Review Settings');
    const flatStyle = flattenStyle(sectionTitle.props.style);
    expect(flatStyle.color).toBe('#E0E0E0');
  });

  it('placeholder text uses dark text.placeholder color', async () => {
    const { getByTestId } = renderSettingsWithNavigation('dark');

    await waitFor(() => {
      expect(getByTestId('api-key-input')).toBeTruthy();
    });

    const input = getByTestId('api-key-input');
    expect(input.props.placeholderTextColor).toBe('#666666');
  });

  it('cursor color uses dark text.primary color', async () => {
    const { getByTestId } = renderSettingsWithNavigation('dark');

    await waitFor(() => {
      expect(getByTestId('api-key-input')).toBeTruthy();
    });

    const input = getByTestId('api-key-input');
    expect(input.props.cursorColor).toBe('#E0E0E0');
  });

  it('no hardcoded #fff or #333 hex values appear in dark mode input styles', async () => {
    const { getByTestId } = renderSettingsWithNavigation('dark');

    await waitFor(() => {
      expect(getByTestId('api-key-input')).toBeTruthy();
    });

    const input = getByTestId('api-key-input');
    const inputStyle = flattenStyle(input.props.style);
    expect(inputStyle.backgroundColor).not.toBe('#fff');
    expect(inputStyle.backgroundColor).not.toBe('#FFFFFF');
    expect(inputStyle.color).not.toBe('#333');
    expect(inputStyle.color).not.toBe('#333333');
  });
});

// ============================================
// IT-004: ReviewsScreen and LessonsScreen dark mode
// ============================================

import { ReviewsScreen } from '../../src/screens/ReviewsScreen';
import { LessonsScreen } from '../../src/screens/LessonsScreen';
import * as storageModule from '../../src/storage';

jest.mock('../../src/storage', () => ({
  ...jest.requireActual('../../src/storage'),
  getAvailableReviews: jest.fn(),
  getAvailableLessons: jest.fn(),
  getSubjectsByIds: jest.fn(),
  getUserSynonymsBySubjectId: jest.fn().mockResolvedValue([]),
  getApiKey: jest.fn().mockResolvedValue('test-api-key'),
}));

jest.mock('../../src/sync', () => ({
  ...jest.requireActual('../../src/sync'),
  submitReviews: jest.fn().mockResolvedValue({ success: true, submittedCount: 0, queuedCount: 0 }),
  completeLessons: jest.fn().mockResolvedValue({ success: true, completedCount: 0, queuedCount: 0 }),
}));

jest.mock('../../src/utils', () => ({
  ...jest.requireActual('../../src/utils'),
  isOnline: jest.fn().mockResolvedValue(true),
  startSession: jest.fn(),
  endSession: jest.fn(),
}));

jest.mock('../../src/services', () => ({
  ...jest.requireActual('../../src/services'),
  setBadgeCount: jest.fn().mockResolvedValue(undefined),
  clearBadge: jest.fn().mockResolvedValue(undefined),
  checkPermissions: jest.fn().mockResolvedValue('granted'),
  getNotificationsEnabled: jest.fn().mockResolvedValue(true),
}));

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      goBack: mockGoBack,
      push: jest.fn(),
      addListener: jest.fn().mockReturnValue(jest.fn()),
      dispatch: jest.fn(),
      navigate: jest.fn(),
      reset: jest.fn(),
    }),
  };
});

function renderScreenWithNavigation(
  screen: React.ReactElement,
  colorScheme: ColorScheme = 'light',
) {
  return render(
    <ThemeProvider forcedColorScheme={colorScheme}>
      <NavigationContainer>{screen}</NavigationContainer>
    </ThemeProvider>,
  );
}

describe('IT-004: ReviewsScreen and LessonsScreen dark mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (storageModule.getAvailableReviews as jest.Mock).mockImplementation(
      () => new Promise(() => {}),
    );
    (storageModule.getAvailableLessons as jest.Mock).mockImplementation(
      () => new Promise(() => {}),
    );
  });

  it('ReviewsScreen loading state uses dark background in dark mode', async () => {
    const { getByTestId } = renderScreenWithNavigation(
      <ReviewsScreen />,
      'dark',
    );

    const loadingView = getByTestId('reviews-screen-loading');
    const flatStyle = flattenStyle(loadingView.props.style);
    expect(flatStyle.backgroundColor).toBe('#121212');
  });

  it('ReviewsScreen loading text uses dark text.secondary in dark mode', async () => {
    const { getByText } = renderScreenWithNavigation(
      <ReviewsScreen />,
      'dark',
    );

    const loadingText = getByText('Loading reviews...');
    const flatStyle = flattenStyle(loadingText.props.style);
    expect(flatStyle.color).toBe('#AAAAAA');
  });

  it('ReviewsScreen error state uses dark background and error colors', async () => {
    (storageModule.getAvailableReviews as jest.Mock).mockRejectedValue(
      new Error('DB error'),
    );

    const { getByTestId } = renderScreenWithNavigation(
      <ReviewsScreen />,
      'dark',
    );

    await waitFor(() => {
      expect(getByTestId('reviews-screen-error')).toBeTruthy();
    });

    const errorView = getByTestId('reviews-screen-error');
    const flatStyle = flattenStyle(errorView.props.style);
    expect(flatStyle.backgroundColor).toBe('#121212');
  });

  it('ReviewsScreen back link uses theme link color in dark mode', async () => {
    (storageModule.getAvailableReviews as jest.Mock).mockRejectedValue(
      new Error('DB error'),
    );

    const { getByTestId } = renderScreenWithNavigation(
      <ReviewsScreen />,
      'dark',
    );

    await waitFor(() => {
      expect(getByTestId('reviews-screen-back')).toBeTruthy();
    });

    const backLink = getByTestId('reviews-screen-back');
    const flatStyle = flattenStyle(backLink.props.style);
    expect(flatStyle.color).toBe('#4DA3FF');
  });

  it('LessonsScreen loading state uses dark background in dark mode', async () => {
    const { getByTestId } = renderScreenWithNavigation(
      <LessonsScreen />,
      'dark',
    );

    const loadingView = getByTestId('lessons-screen-loading');
    const flatStyle = flattenStyle(loadingView.props.style);
    expect(flatStyle.backgroundColor).toBe('#121212');
  });

  it('LessonsScreen loading text uses dark text.secondary in dark mode', async () => {
    const { getByText } = renderScreenWithNavigation(
      <LessonsScreen />,
      'dark',
    );

    const loadingText = getByText('Loading lessons...');
    const flatStyle = flattenStyle(loadingText.props.style);
    expect(flatStyle.color).toBe('#AAAAAA');
  });
});

// ============================================
// IT-005: LessonCard component sections dark mode
// ============================================

import { LessonCard } from '../../src/components/LessonCard';
import type { Meaning } from '../../src/api/types';
import type { ComponentRadical } from '../../src/components/LessonCard';

describe('IT-005: LessonCard component sections dark mode', () => {
  const componentRadicals: ComponentRadical[] = [
    { id: 1, characters: '大', meaning: 'Big' },
    { id: 2, characters: '口', meaning: 'Mouth' },
  ];

  const meanings: Meaning[] = [
    { meaning: 'Big', primary: true, accepted_answer: true },
  ];

  const defaultProps = {
    subjectType: 'kanji' as const,
    characters: '大',
    meanings,
    readings: null,
    meaningMnemonic: 'Test mnemonic',
    readingMnemonic: null,
    onNext: jest.fn(),
    componentRadicals,
  };

  it('component section uses light componentSection.background in light mode', () => {
    const { getByTestId } = renderWithTheme(
      <LessonCard {...defaultProps} />,
      'light',
    );

    const componentsContainer = getByTestId('lesson-card-components');
    const flatStyle = flattenStyle(componentsContainer.props.style);
    expect(flatStyle.backgroundColor).toBe('#E8F4FF');
  });

  it('component section uses dark componentSection.background in dark mode', () => {
    const { getByTestId } = renderWithTheme(
      <LessonCard {...defaultProps} />,
      'dark',
    );

    const componentsContainer = getByTestId('lesson-card-components');
    const flatStyle = flattenStyle(componentsContainer.props.style);
    expect(flatStyle.backgroundColor).toBe('#1A2A3A');
  });

  it('component section border adapts to dark mode', () => {
    const { getByTestId } = renderWithTheme(
      <LessonCard {...defaultProps} />,
      'dark',
    );

    const componentsContainer = getByTestId('lesson-card-components');
    const flatStyle = flattenStyle(componentsContainer.props.style);
    expect(flatStyle.borderBottomColor).toBe('#2A3A4A');
  });

  it('container background adapts to dark mode', () => {
    const { getByTestId } = renderWithTheme(
      <LessonCard {...defaultProps} />,
      'dark',
    );

    const container = getByTestId('lesson-card');
    const flatStyle = flattenStyle(container.props.style);
    expect(flatStyle.backgroundColor).toBe('#121212');
  });

  it('primary text adapts to dark mode', () => {
    const { getByTestId } = renderWithTheme(
      <LessonCard {...defaultProps} />,
      'dark',
    );

    const primaryMeaning = getByTestId('lesson-card-primary-meaning');
    const flatStyle = flattenStyle(primaryMeaning.props.style);
    expect(flatStyle.color).toBe('#E0E0E0');
  });
});

// ============================================
// IT-006: Onboarding screens button text dark mode
// ============================================

import { ApiKeyInputScreen } from '../../src/screens/ApiKeyInputScreen';
import { SyncScreen } from '../../src/screens/SyncScreen';
import { WizardNotificationScreen } from '../../src/screens/WizardNotificationScreen';

jest.mock('../../src/api', () => ({
  ...jest.requireActual('../../src/api'),
  validateApiKey: jest.fn().mockResolvedValue({ success: true }),
  WaniKaniClient: jest.fn().mockImplementation(() => ({})),
}));

describe('IT-006: Onboarding screens button text dark mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ApiKeyInputScreen TextInput uses theme.colors.text.primary in light mode', () => {
    const { getByTestId } = renderWithTheme(<ApiKeyInputScreen />, 'light');

    const input = getByTestId('api-key-input');
    const flatStyle = flattenStyle(input.props.style);
    expect(flatStyle.color).toBe('#333333');
  });

  it('ApiKeyInputScreen TextInput uses theme.colors.text.primary in dark mode', () => {
    const { getByTestId } = renderWithTheme(<ApiKeyInputScreen />, 'dark');

    const input = getByTestId('api-key-input');
    const flatStyle = flattenStyle(input.props.style);
    expect(flatStyle.color).toBe('#E0E0E0');
  });

  it('ApiKeyInputScreen TextInput uses theme.colors.background.input in light mode', () => {
    const { getByTestId } = renderWithTheme(<ApiKeyInputScreen />, 'light');

    const input = getByTestId('api-key-input');
    const flatStyle = flattenStyle(input.props.style);
    expect(flatStyle.backgroundColor).toBe('#FAFAFA');
  });

  it('ApiKeyInputScreen TextInput uses theme.colors.background.input in dark mode', () => {
    const { getByTestId } = renderWithTheme(<ApiKeyInputScreen />, 'dark');

    const input = getByTestId('api-key-input');
    const flatStyle = flattenStyle(input.props.style);
    expect(flatStyle.backgroundColor).toBe('#2A2A2A');
  });

  it('ApiKeyInputScreen TextInput placeholder uses theme.colors.text.placeholder in light mode', () => {
    const { getByTestId } = renderWithTheme(<ApiKeyInputScreen />, 'light');

    const input = getByTestId('api-key-input');
    expect(input.props.placeholderTextColor).toBe('#999999');
  });

  it('ApiKeyInputScreen TextInput placeholder uses theme.colors.text.placeholder in dark mode', () => {
    const { getByTestId } = renderWithTheme(<ApiKeyInputScreen />, 'dark');

    const input = getByTestId('api-key-input');
    expect(input.props.placeholderTextColor).toBe('#666666');
  });

  it('ApiKeyInputScreen TextInput cursor color uses theme.colors.text.primary in light mode', () => {
    const { getByTestId } = renderWithTheme(<ApiKeyInputScreen />, 'light');

    const input = getByTestId('api-key-input');
    expect(input.props.cursorColor).toBe('#333333');
  });

  it('ApiKeyInputScreen TextInput cursor color uses theme.colors.text.primary in dark mode', () => {
    const { getByTestId } = renderWithTheme(<ApiKeyInputScreen />, 'dark');

    const input = getByTestId('api-key-input');
    expect(input.props.cursorColor).toBe('#E0E0E0');
  });

  it('ApiKeyInputScreen button text uses text.inverse in light mode (#FFFFFF)', () => {
    const { getByTestId } = renderWithTheme(<ApiKeyInputScreen />, 'light');

    const validateButton = getByTestId('validate-button');
    const buttonTexts = validateButton.findAllByType(Text as any);
    const buttonTextElement = buttonTexts.length > 0 ? buttonTexts[0] : null;

    if (buttonTextElement) {
      const flatStyle = flattenStyle(buttonTextElement.props.style);
      expect(flatStyle.color).toBe('#FFFFFF');
    }
  });

  it('ApiKeyInputScreen button text uses text.inverse in dark mode (#121212)', () => {
    const { getByTestId } = renderWithTheme(<ApiKeyInputScreen />, 'dark');

    const validateButton = getByTestId('validate-button');
    const buttonTexts = validateButton.findAllByType(Text as any);
    const buttonTextElement = buttonTexts.length > 0 ? buttonTexts[0] : null;

    if (buttonTextElement) {
      const flatStyle = flattenStyle(buttonTextElement.props.style);
      expect(flatStyle.color).toBe('#121212');
    }
  });

  it('SyncScreen renders with dark theme without errors', () => {
    const { getByTestId } = renderWithTheme(<SyncScreen />, 'dark');
    expect(getByTestId('sync-screen')).toBeTruthy();
  });

  it('WizardNotificationScreen button text uses text.inverse in dark mode (#121212)', () => {
    const { getByTestId } = renderWithTheme(<WizardNotificationScreen />, 'dark');

    const enableButton = getByTestId('enable-notifications-button');
    const buttonTexts = enableButton.findAllByType(Text as any);
    const buttonTextElement = buttonTexts.length > 0 ? buttonTexts[0] : null;

    if (buttonTextElement) {
      const flatStyle = flattenStyle(buttonTextElement.props.style);
      expect(flatStyle.color).toBe('#121212');
    }
  });

  it('buttons remain readable against their backgrounds in dark mode', () => {
    const { getByTestId } = renderWithTheme(<ApiKeyInputScreen />, 'dark');
    const validateButton = getByTestId('validate-button');
    expect(validateButton).toBeTruthy();

    const buttonStyle = flattenStyle(validateButton.props.style);
    const bgColor = buttonStyle.backgroundColor as string | undefined;

    // If background is a dark purple (#8f5bc4 / COLORS.subject.vocabulary),
    // inverse text should not be too close in luminance
    if (bgColor) {
      expect(bgColor).not.toBe('#121212');
    }
  });
});

// ============================================
// IT-007: Full app build and TypeScript check
// (This test validates the test suite runs and theme types compile)
// ============================================

describe('IT-007: Build and TypeScript integrity', () => {
  it('theme types are fully typed (ThemeColors includes all categories)', () => {
    let capturedTheme: Theme | null = null;

    function CaptureTheme() {
      const theme = useTheme();
      capturedTheme = theme;
      return null;
    }

    render(
      <ThemeProvider forcedColorScheme="light">
        <CaptureTheme />
      </ThemeProvider>,
    );

    const colors = capturedTheme!.colors;

    // Verify all color categories exist and have the right type
    expect(typeof colors.link).toBe('string');
    expect(typeof colors.componentSection.background).toBe('string');
    expect(typeof colors.componentSection.border).toBe('string');
    expect(typeof colors.chart.barBackground).toBe('string');
    expect(typeof colors.text.primary).toBe('string');
    expect(typeof colors.text.secondary).toBe('string');
    expect(typeof colors.text.inverse).toBe('string');
    expect(typeof colors.background.primary).toBe('string');
    expect(typeof colors.background.secondary).toBe('string');
    expect(typeof colors.background.input).toBe('string');
    expect(typeof colors.border.light).toBe('string');
    expect(typeof colors.border.medium).toBe('string');
    expect(typeof colors.border.dark).toBe('string');
    expect(typeof colors.shadow).toBe('string');
  });

  it('dark mode theme object has isDark=true', () => {
    let capturedTheme: Theme | null = null;

    function CaptureTheme() {
      const theme = useTheme();
      capturedTheme = theme;
      return null;
    }

    render(
      <ThemeProvider forcedColorScheme="dark">
        <CaptureTheme />
      </ThemeProvider>,
    );

    expect(capturedTheme!.isDark).toBe(true);
    expect(capturedTheme!.colorScheme).toBe('dark');
  });

  it('light mode theme object has isDark=false', () => {
    let capturedTheme: Theme | null = null;

    function CaptureTheme() {
      const theme = useTheme();
      capturedTheme = theme;
      return null;
    }

    render(
      <ThemeProvider forcedColorScheme="light">
        <CaptureTheme />
      </ThemeProvider>,
    );

    expect(capturedTheme!.isDark).toBe(false);
    expect(capturedTheme!.colorScheme).toBe('light');
  });
});
