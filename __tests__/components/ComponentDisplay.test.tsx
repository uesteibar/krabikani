import React from 'react';
import { render } from '@testing-library/react-native';
import { Image } from 'react-native';

import { ComponentDisplay } from '../../src/components/ComponentDisplay';
import { SUBJECT_COLORS } from '../../src/theme';

// Mock Image.prefetch without spreading the entire react-native module
const originalPrefetch = Image.prefetch;
beforeAll(() => {
  Image.prefetch = jest.fn().mockResolvedValue(true);
});

afterAll(() => {
  Image.prefetch = originalPrefetch;
});

describe('ComponentDisplay', () => {
  const mockCharacterImages = JSON.stringify([
    {
      url: 'https://files.wanikani.com/test-image.svg',
      content_type: 'image/svg+xml',
      metadata: { inline_styles: true },
    },
    {
      url: 'https://files.wanikani.com/test-image.png',
      content_type: 'image/png',
      metadata: {},
    },
  ]);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('radical items', () => {
    it('renders radical with characters and meaning', () => {
      const { getByTestId } = render(
        <ComponentDisplay
          subjectType="radical"
          characters="一"
          meaning="ground"
          testID="component"
        />,
      );

      expect(getByTestId('component')).toBeTruthy();
      expect(getByTestId('component-character').props.children).toBe('一');
      expect(getByTestId('component-text').props.children).toBe('ground');
    });

    it('renders radical with blue background color', () => {
      const { getByTestId } = render(
        <ComponentDisplay
          subjectType="radical"
          characters="一"
          meaning="ground"
          testID="component"
        />,
      );

      const container = getByTestId('component');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: SUBJECT_COLORS.radical }),
        ]),
      );
    });

    it('renders radical without characters using RadicalImage', () => {
      const { getByTestId, queryByTestId } = render(
        <ComponentDisplay
          subjectType="radical"
          characters={null}
          meaning="stick"
          characterImages={mockCharacterImages}
          testID="component"
        />,
      );

      // Should use RadicalImage, not text character
      expect(queryByTestId('component-character')).toBeNull();
      expect(getByTestId('component-image')).toBeTruthy();
      expect(getByTestId('component-text').props.children).toBe('stick');
    });

    it('renders fallback "?" when no characters and no images', () => {
      const { getByTestId } = render(
        <ComponentDisplay
          subjectType="radical"
          characters={null}
          meaning="mystery"
          characterImages={null}
          testID="component"
        />,
      );

      // Without characterImages, shows text "?" as fallback
      expect(getByTestId('component-character').props.children).toBe('?');
      expect(getByTestId('component-text').props.children).toBe('mystery');
    });
  });

  describe('kanji items', () => {
    it('renders kanji with characters and meaning', () => {
      const { getByTestId } = render(
        <ComponentDisplay
          subjectType="kanji"
          characters="大"
          meaning="big"
          testID="component"
        />,
      );

      expect(getByTestId('component')).toBeTruthy();
      expect(getByTestId('component-character').props.children).toBe('大');
      expect(getByTestId('component-text').props.children).toBe('big');
    });

    it('renders kanji with pink background color', () => {
      const { getByTestId } = render(
        <ComponentDisplay
          subjectType="kanji"
          characters="大"
          meaning="big"
          testID="component"
        />,
      );

      const container = getByTestId('component');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: SUBJECT_COLORS.kanji }),
        ]),
      );
    });
  });

  describe('displayText prop', () => {
    it('uses displayText instead of meaning when provided', () => {
      const { getByTestId } = render(
        <ComponentDisplay
          subjectType="kanji"
          characters="大"
          meaning="big"
          displayText="おお"
          testID="component"
        />,
      );

      expect(getByTestId('component-text').props.children).toBe('おお');
    });

    it('falls back to meaning when displayText is not provided', () => {
      const { getByTestId } = render(
        <ComponentDisplay
          subjectType="kanji"
          characters="大"
          meaning="big"
          testID="component"
        />,
      );

      expect(getByTestId('component-text').props.children).toBe('big');
    });
  });

  describe('custom styling', () => {
    it('applies custom style to container', () => {
      const customStyle = { marginRight: 8 };
      const { getByTestId } = render(
        <ComponentDisplay
          subjectType="radical"
          characters="一"
          meaning="ground"
          style={customStyle}
          testID="component"
        />,
      );

      const container = getByTestId('component');
      expect(container.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining(customStyle)]),
      );
    });
  });
});
