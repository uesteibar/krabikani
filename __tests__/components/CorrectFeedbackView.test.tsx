import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';

import { CorrectFeedbackView } from '../../src/components/CorrectFeedbackView';

describe('CorrectFeedbackView', () => {
  const defaultProps = {
    subjectType: 'kanji' as const,
    displayText: '大',
    displayMode: 'characters' as const,
    feedbackState: 'correct' as const,
    questionType: 'meaning' as const,
    inputValue: 'big',
  };

  it('renders SubjectDisplay with correct feedback state', () => {
    const { getByTestId } = render(
      <CorrectFeedbackView {...defaultProps} />,
    );

    expect(getByTestId('correct-feedback-subject-display')).toBeTruthy();
    const feedbackLabel = getByTestId('subject-display-feedback-label');
    expect(feedbackLabel).toBeTruthy();
    expect(feedbackLabel.props.children).toBe('Correct!');
  });

  it('renders SubjectDisplay with fuzzyMatch feedback state', () => {
    const { getByTestId } = render(
      <CorrectFeedbackView {...defaultProps} feedbackState="fuzzyMatch" />,
    );

    const feedbackLabel = getByTestId('subject-display-feedback-label');
    expect(feedbackLabel.props.children).toBe('Close Enough!');
  });

  it('renders QuestionTypeLabel', () => {
    const { getByTestId, getByText } = render(
      <CorrectFeedbackView {...defaultProps} />,
    );

    expect(getByTestId('correct-feedback-question-type')).toBeTruthy();
    expect(getByText('MEANING')).toBeTruthy();
  });

  it('renders QuestionTypeLabel for reading type', () => {
    const { getByText } = render(
      <CorrectFeedbackView {...defaultProps} questionType="reading" />,
    );

    expect(getByText('READING')).toBeTruthy();
  });

  it('renders disabled input with user answer', () => {
    const { getByTestId } = render(
      <CorrectFeedbackView {...defaultProps} />,
    );

    const input = getByTestId('correct-feedback-input');
    expect(input.props.value).toBe('big');
    expect(input.props.editable).toBe(false);
  });

  it('renders SRS badge when provided', () => {
    const { getByTestId } = render(
      <CorrectFeedbackView
        {...defaultProps}
        srsBadge={{ type: 'static', stage: 5 }}
      />,
    );

    expect(getByTestId('srs-badge')).toBeTruthy();
  });

  it('does not render SRS badge when not provided', () => {
    const { queryByTestId } = render(
      <CorrectFeedbackView {...defaultProps} />,
    );

    expect(queryByTestId('srs-badge')).toBeNull();
  });

  it('forwards custom testID', () => {
    const { getByTestId } = render(
      <CorrectFeedbackView {...defaultProps} testID="custom-test-id" />,
    );

    expect(getByTestId('custom-test-id')).toBeTruthy();
  });

  it('uses default testID when not provided', () => {
    const { getByTestId } = render(
      <CorrectFeedbackView {...defaultProps} />,
    );

    expect(getByTestId('correct-feedback-view')).toBeTruthy();
  });

  describe('layout alignment with QuizEngine', () => {
    it('input uses fixed height: 56 matching QuizEngine input dimensions', () => {
      const { getByTestId } = render(
        <CorrectFeedbackView {...defaultProps} />,
      );

      const input = getByTestId('correct-feedback-input');
      const flatStyle = StyleSheet.flatten(input.props.style);
      expect(flatStyle.height).toBe(56);
      expect(flatStyle.paddingVertical).toBeUndefined();
    });

    it('includes a spacer with flex: 1 between input and button row placeholder', () => {
      const { getByTestId } = render(
        <CorrectFeedbackView {...defaultProps} />,
      );

      const spacer = getByTestId('correct-feedback-spacer');
      const flatStyle = StyleSheet.flatten(spacer.props.style);
      expect(flatStyle.flex).toBe(1);
    });

    it('includes a button row placeholder to match QuizEngine vertical layout', () => {
      const { getByTestId } = render(
        <CorrectFeedbackView {...defaultProps} />,
      );

      expect(getByTestId('correct-feedback-button-row-placeholder')).toBeTruthy();
    });

    it('root container uses flex: 1 to fill available space', () => {
      const { getByTestId } = render(
        <CorrectFeedbackView {...defaultProps} />,
      );

      const root = getByTestId('correct-feedback-view');
      const flatStyle = StyleSheet.flatten(root.props.style);
      expect(flatStyle.flex).toBe(1);
    });
  });
});
