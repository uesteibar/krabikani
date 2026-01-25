import React from 'react';
import { render } from '@testing-library/react-native';

import { SrsLevelBadge } from '../../src/components/SrsLevelBadge';

describe('SrsLevelBadge', () => {
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
        const { getByTestId } = render(<SrsLevelBadge stage={stage} />);
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
        const { getByTestId } = render(<SrsLevelBadge stage={stage} />);
        expect(getByTestId('srs-level-icon').props.children).toBe(expectedIcon);
      });
    });
  });

  describe('renders nothing for invalid stages', () => {
    const invalidCases = [0, -1, 10, 100];

    invalidCases.forEach(stage => {
      it(`renders nothing for stage ${stage}`, () => {
        const { queryByTestId } = render(<SrsLevelBadge stage={stage} />);
        expect(queryByTestId('srs-level-badge')).toBeNull();
      });
    });
  });

  it('uses default testID', () => {
    const { getByTestId } = render(<SrsLevelBadge stage={5} />);
    expect(getByTestId('srs-level-badge')).toBeTruthy();
  });

  it('uses custom testID when provided', () => {
    const { getByTestId, queryByTestId } = render(
      <SrsLevelBadge stage={5} testID="custom-badge" />,
    );
    expect(getByTestId('custom-badge')).toBeTruthy();
    expect(queryByTestId('srs-level-badge')).toBeNull();
  });

  it('has icon and name elements', () => {
    const { getByTestId } = render(<SrsLevelBadge stage={5} />);
    expect(getByTestId('srs-level-icon')).toBeTruthy();
    expect(getByTestId('srs-level-name')).toBeTruthy();
  });
});
