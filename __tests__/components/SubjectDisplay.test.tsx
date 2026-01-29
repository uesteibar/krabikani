import React from 'react';
import { render } from '@testing-library/react-native';

import { SubjectDisplay } from '../../src/components/SubjectDisplay';
import { COLORS, getSubjectColor } from '../../src/theme';

describe('SubjectDisplay', () => {
  const defaultProps = {
    subjectType: 'kanji' as const,
    displayMode: 'characters' as const,
    displayText: '大',
  };

  describe('background color per subject type', () => {
    it.each([
      ['radical' as const],
      ['kanji' as const],
      ['vocabulary' as const],
      ['kana_vocabulary' as const],
    ])('uses correct background color for %s', (subjectType) => {
      const { getByTestId } = render(
        <SubjectDisplay {...defaultProps} subjectType={subjectType} />,
      );
      const container = getByTestId('subject-display');
      const flatStyle = Array.isArray(container.props.style)
        ? Object.assign(
            {},
            ...container.props.style.flat(Infinity).filter(Boolean),
          )
        : container.props.style;
      expect(flatStyle.backgroundColor).toBe(getSubjectColor(subjectType));
    });
  });

  describe('feedback states', () => {
    it('shows "Correct!" label with correct background', () => {
      const { getByTestId, getByText } = render(
        <SubjectDisplay {...defaultProps} feedbackState="correct" />,
      );
      expect(getByText('Correct!')).toBeTruthy();
      const container = getByTestId('subject-display');
      const flatStyle = Array.isArray(container.props.style)
        ? Object.assign(
            {},
            ...container.props.style.flat(Infinity).filter(Boolean),
          )
        : container.props.style;
      expect(flatStyle.backgroundColor).toBe(COLORS.feedback.correct);
    });

    it('shows "Incorrect" label with incorrect background', () => {
      const { getByTestId, getByText } = render(
        <SubjectDisplay {...defaultProps} feedbackState="incorrect" />,
      );
      expect(getByText('Incorrect')).toBeTruthy();
      const container = getByTestId('subject-display');
      const flatStyle = Array.isArray(container.props.style)
        ? Object.assign(
            {},
            ...container.props.style.flat(Infinity).filter(Boolean),
          )
        : container.props.style;
      expect(flatStyle.backgroundColor).toBe(COLORS.feedback.incorrect);
    });

    it('shows "Close Enough!" label with fuzzyMatch background', () => {
      const { getByTestId, getByText } = render(
        <SubjectDisplay {...defaultProps} feedbackState="fuzzyMatch" />,
      );
      expect(getByText('Close Enough!')).toBeTruthy();
      const container = getByTestId('subject-display');
      const flatStyle = Array.isArray(container.props.style)
        ? Object.assign(
            {},
            ...container.props.style.flat(Infinity).filter(Boolean),
          )
        : container.props.style;
      expect(flatStyle.backgroundColor).toBe(COLORS.feedback.fuzzyMatch);
    });

    it('does not show feedback label when feedbackState is null', () => {
      const { queryByTestId } = render(
        <SubjectDisplay {...defaultProps} feedbackState={null} />,
      );
      expect(queryByTestId('subject-display-feedback-label')).toBeNull();
    });
  });

  describe('SRS badge', () => {
    it('renders static SRS badge when provided', () => {
      const { getByTestId } = render(
        <SubjectDisplay
          {...defaultProps}
          srsBadge={{ type: 'static', stage: 5 }}
        />,
      );
      expect(getByTestId('srs-badge')).toBeTruthy();
    });

    it('renders animated SRS badge when provided', () => {
      const { getByTestId } = render(
        <SubjectDisplay
          {...defaultProps}
          srsBadge={{
            type: 'animated',
            stage: 6,
            fromStage: 5,
            animateLevelUp: true,
          }}
        />,
      );
      expect(getByTestId('srs-badge-animated')).toBeTruthy();
    });

    it('does not render SRS badge when not provided', () => {
      const { queryByTestId } = render(
        <SubjectDisplay {...defaultProps} />,
      );
      expect(queryByTestId('srs-badge')).toBeNull();
      expect(queryByTestId('srs-badge-animated')).toBeNull();
    });
  });

  describe('display modes', () => {
    it('renders characters in characters mode', () => {
      const { getByText } = render(
        <SubjectDisplay {...defaultProps} displayMode="characters" />,
      );
      expect(getByText('大')).toBeTruthy();
    });

    it('renders meaning text in meaning mode', () => {
      const { getByText } = render(
        <SubjectDisplay
          {...defaultProps}
          displayMode="meaning"
          displayText="big"
        />,
      );
      expect(getByText('big')).toBeTruthy();
    });
  });

  describe('subject type label', () => {
    it('shows subject type label when provided and no feedback', () => {
      const { getByText } = render(
        <SubjectDisplay {...defaultProps} subjectTypeLabel="kanji" />,
      );
      expect(getByText('kanji')).toBeTruthy();
    });

    it('hides subject type label when feedback is active', () => {
      const { queryByTestId } = render(
        <SubjectDisplay
          {...defaultProps}
          subjectTypeLabel="kanji"
          feedbackState="correct"
        />,
      );
      expect(queryByTestId('subject-type-label')).toBeNull();
    });
  });

  it('forwards testID', () => {
    const { getByTestId } = render(
      <SubjectDisplay {...defaultProps} testID="custom-display" />,
    );
    expect(getByTestId('custom-display')).toBeTruthy();
  });
});
