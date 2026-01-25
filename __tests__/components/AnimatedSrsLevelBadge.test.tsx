import React from 'react';
import { render } from '@testing-library/react-native';

import { AnimatedSrsLevelBadge } from '../../src/components/AnimatedSrsLevelBadge';

describe('AnimatedSrsLevelBadge', () => {
  describe('renders correct level names', () => {
    const levelCases = [
      { stage: 1, expectedName: 'Apprentice' },
      { stage: 2, expectedName: 'Apprentice' },
      { stage: 3, expectedName: 'Apprentice' },
      { stage: 4, expectedName: 'Apprentice' },
      { stage: 5, expectedName: 'Guru' },
      { stage: 6, expectedName: 'Guru' },
      { stage: 7, expectedName: 'Master' },
      { stage: 8, expectedName: 'Enlightened' },
      { stage: 9, expectedName: 'Burned' },
    ];

    levelCases.forEach(({ stage, expectedName }) => {
      it(`renders "${expectedName}" for stage ${stage}`, () => {
        const { getByTestId } = render(<AnimatedSrsLevelBadge stage={stage} />);
        expect(getByTestId('srs-level-name').props.children).toBe(expectedName);
      });
    });
  });

  describe('renders correct icons', () => {
    const iconCases = [
      { stage: 1, expectedIcon: '▁' }, // Apprentice
      { stage: 5, expectedIcon: '▃' }, // Guru
      { stage: 7, expectedIcon: '▅' }, // Master
      { stage: 8, expectedIcon: '▇' }, // Enlightened
      { stage: 9, expectedIcon: '🔥' }, // Burned
    ];

    iconCases.forEach(({ stage, expectedIcon }) => {
      it(`renders correct icon for stage ${stage}`, () => {
        const { getByTestId } = render(<AnimatedSrsLevelBadge stage={stage} />);
        expect(getByTestId('srs-level-icon').props.children).toBe(expectedIcon);
      });
    });
  });

  describe('renders nothing for invalid stages', () => {
    const invalidCases = [0, -1, 10, 100];

    invalidCases.forEach(stage => {
      it(`renders nothing for stage ${stage}`, () => {
        const { queryByTestId } = render(<AnimatedSrsLevelBadge stage={stage} />);
        expect(queryByTestId('animated-srs-level-badge')).toBeNull();
      });
    });
  });

  it('uses default testID', () => {
    const { getByTestId } = render(<AnimatedSrsLevelBadge stage={5} />);
    expect(getByTestId('animated-srs-level-badge')).toBeTruthy();
  });

  it('uses custom testID when provided', () => {
    const { getByTestId, queryByTestId } = render(
      <AnimatedSrsLevelBadge stage={5} testID="custom-badge" />,
    );
    expect(getByTestId('custom-badge')).toBeTruthy();
    expect(queryByTestId('animated-srs-level-badge')).toBeNull();
  });

  describe('level-up animation', () => {
    it('does not animate when animateLevelUp is false', () => {
      const { queryByTestId } = render(
        <AnimatedSrsLevelBadge stage={5} fromStage={4} animateLevelUp={false} />,
      );
      // Should show current level only, no old level
      expect(queryByTestId('srs-level-name-old')).toBeNull();
    });

    it('does not animate when level stays the same', () => {
      // Stage 1 -> 2 is still Apprentice, no level change
      const { queryByTestId } = render(
        <AnimatedSrsLevelBadge stage={2} fromStage={1} animateLevelUp={true} />,
      );
      // Should not show old level since level didn't actually change
      expect(queryByTestId('srs-level-name-old')).toBeNull();
    });

    it('shows old level when animating level-up (Apprentice -> Guru)', () => {
      // Stage 4 -> 5 is Apprentice -> Guru level change
      const { getByTestId } = render(
        <AnimatedSrsLevelBadge stage={5} fromStage={4} animateLevelUp={true} />,
      );
      // Should show both old and new level during animation
      expect(getByTestId('srs-level-name-old').props.children).toBe('Apprentice');
      expect(getByTestId('srs-level-name').props.children).toBe('Guru');
    });

    it('shows old level when animating level-up (Guru -> Master)', () => {
      // Stage 6 -> 7 is Guru -> Master level change
      const { getByTestId } = render(
        <AnimatedSrsLevelBadge stage={7} fromStage={6} animateLevelUp={true} />,
      );
      expect(getByTestId('srs-level-name-old').props.children).toBe('Guru');
      expect(getByTestId('srs-level-name').props.children).toBe('Master');
    });

    it('shows old level when animating level-up (Master -> Enlightened)', () => {
      // Stage 7 -> 8 is Master -> Enlightened level change
      const { getByTestId } = render(
        <AnimatedSrsLevelBadge stage={8} fromStage={7} animateLevelUp={true} />,
      );
      expect(getByTestId('srs-level-name-old').props.children).toBe('Master');
      expect(getByTestId('srs-level-name').props.children).toBe('Enlightened');
    });

    it('shows old level when animating level-up (Enlightened -> Burned)', () => {
      // Stage 8 -> 9 is Enlightened -> Burned level change
      const { getByTestId } = render(
        <AnimatedSrsLevelBadge stage={9} fromStage={8} animateLevelUp={true} />,
      );
      expect(getByTestId('srs-level-name-old').props.children).toBe('Enlightened');
      expect(getByTestId('srs-level-name').props.children).toBe('Burned');
    });

    // Note: onAnimationComplete callback is triggered by react-native-reanimated
    // which requires native bindings. This cannot be tested with mocks.
    // Manual testing or E2E testing is required for animation callback verification.
  });
});
