import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import {
  COLORS,
  PROGRESS_COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  useTheme,
} from '../theme';

type ProgressModeProps = {
  mode: 'progress';
  current: number;
  total: number;
  wrapUpRemaining?: number;
};

type ZenModeProps = {
  mode: 'zen';
};

type PracticeModeProps = {
  mode: 'practice';
  phrase: string;
  icon: React.ComponentProps<typeof MaterialDesignIcons>['name'];
};

type NoneModeProps = {
  mode: 'none';
};

export type ProgressHeaderProps =
  | ProgressModeProps
  | ZenModeProps
  | PracticeModeProps
  | NoneModeProps;

export function ProgressHeader(props: ProgressHeaderProps) {
  const { colors } = useTheme();

  if (props.mode === 'none') {
    return null;
  }

  const bannerStyle = {
    backgroundColor: colors.background.secondary,
    borderBottomColor: colors.border.light,
  };

  if (props.mode === 'zen') {
    return (
      <View style={[styles.modeBanner, bannerStyle]} testID="progress-header-zen">
        <MaterialDesignIcons name="meditation" size={FONT_SIZES.base} color={colors.text.secondary} />
        <Text style={[styles.modeBannerText, { color: colors.text.secondary }]}>Zen Mode</Text>
      </View>
    );
  }

  if (props.mode === 'practice') {
    return (
      <View style={[styles.modeBanner, bannerStyle]} testID="progress-header-practice">
        <MaterialDesignIcons
          name={props.icon}
          size={FONT_SIZES.base}
          color={colors.text.tertiary}
        />
        <Text style={[styles.practiceBannerText, { color: colors.text.secondary }]}>{props.phrase}</Text>
      </View>
    );
  }

  const { current, total, wrapUpRemaining } = props;
  const isWrappingUp = wrapUpRemaining != null;
  const progressPercentage = total > 0 ? (current / total) * 100 : 0;
  const remaining = total - current;

  return (
    <View style={[styles.progressContainer, bannerStyle]} testID="progress-header-progress">
      <View style={styles.progressTextRow}>
        <Text style={[styles.progressText, { color: colors.text.secondary }]} testID="progress-header-count">
          {current} / {total}
        </Text>
        {isWrappingUp ? (
          <Text style={styles.wrapUpText} testID="progress-header-wrap-up">
            Wrapping up: {wrapUpRemaining} remaining
          </Text>
        ) : (
          <Text style={[styles.remainingText, { color: colors.text.tertiary }]} testID="progress-header-remaining">
            {remaining} remaining
          </Text>
        )}
      </View>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            isWrappingUp && styles.wrapUpProgressFill,
            { width: `${progressPercentage}%` },
          ]}
          testID="progress-header-fill"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressContainer: {
    height: 50,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  progressText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  remainingText: {
    fontSize: FONT_SIZES.sm,
  },
  wrapUpText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.feedback.warning,
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    backgroundColor: PROGRESS_COLORS.background,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: PROGRESS_COLORS.fill,
    borderRadius: BORDER_RADIUS.sm,
  },
  wrapUpProgressFill: {
    backgroundColor: PROGRESS_COLORS.wrapUpFill,
  },
  modeBanner: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderBottomWidth: 1,
  },
  modeBannerText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  practiceBannerText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    fontStyle: 'italic',
  },
});
