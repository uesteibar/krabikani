import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Image } from 'react-native';

import { RadicalImage } from '../../src/components/RadicalImage';

// Mock Image.prefetch without spreading the entire react-native module
const originalPrefetch = Image.prefetch;
beforeAll(() => {
  Image.prefetch = jest.fn().mockResolvedValue(true);
});

afterAll(() => {
  Image.prefetch = originalPrefetch;
});

describe('RadicalImage', () => {
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

  describe('when characterImages is null', () => {
    it('renders fallback text', () => {
      const { getByTestId } = render(
        <RadicalImage
          characterImages={null}
          fallbackText="test"
          testID="radical-image"
        />,
      );

      expect(getByTestId('radical-image-fallback')).toBeTruthy();
      expect(getByTestId('radical-image-fallback').props.children).toBe('test');
    });

    it('renders default fallback "?" when no fallbackText provided', () => {
      const { getByTestId } = render(
        <RadicalImage characterImages={null} testID="radical-image" />,
      );

      expect(getByTestId('radical-image-fallback').props.children).toBe('?');
    });
  });

  describe('when characterImages is empty', () => {
    it('renders fallback text for empty array', () => {
      const { getByTestId } = render(
        <RadicalImage
          characterImages="[]"
          fallbackText="empty"
          testID="radical-image"
        />,
      );

      expect(getByTestId('radical-image-fallback')).toBeTruthy();
      expect(getByTestId('radical-image-fallback').props.children).toBe('empty');
    });
  });

  describe('when characterImages is invalid JSON', () => {
    it('renders fallback text for invalid JSON', () => {
      const { getByTestId } = render(
        <RadicalImage
          characterImages="not valid json"
          fallbackText="invalid"
          testID="radical-image"
        />,
      );

      expect(getByTestId('radical-image-fallback')).toBeTruthy();
    });
  });

  describe('when characterImages is valid', () => {
    it('renders an image element', async () => {
      const { getByTestId } = render(
        <RadicalImage
          characterImages={mockCharacterImages}
          fallbackText="test"
          testID="radical-image"
        />,
      );

      await waitFor(() => {
        expect(getByTestId('radical-image-image')).toBeTruthy();
      });
    });

    it('uses PNG URL when available (preferred)', async () => {
      const { getByTestId } = render(
        <RadicalImage
          characterImages={mockCharacterImages}
          testID="radical-image"
        />,
      );

      await waitFor(() => {
        const image = getByTestId('radical-image-image');
        // PNG should be preferred over SVG
        expect(image.props.source.uri).toBe(
          'https://files.wanikani.com/test-image.png',
        );
      });
    });

    it('applies the specified size', async () => {
      const { getByTestId } = render(
        <RadicalImage
          characterImages={mockCharacterImages}
          size={48}
          testID="radical-image"
        />,
      );

      await waitFor(() => {
        const image = getByTestId('radical-image-image');
        expect(image.props.style).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ width: 48, height: 48 }),
          ]),
        );
      });
    });

    it('renders container with correct size', () => {
      const { getByTestId } = render(
        <RadicalImage
          characterImages={mockCharacterImages}
          size={32}
          testID="radical-image"
        />,
      );

      const container = getByTestId('radical-image');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ width: 32, height: 32 }),
        ]),
      );
    });
  });

  describe('image loading behavior', () => {
    it('shows loading fallback initially', () => {
      const { getByTestId } = render(
        <RadicalImage
          characterImages={mockCharacterImages}
          fallbackText="loading"
          testID="radical-image"
        />,
      );

      // Initially should show the loading fallback
      expect(getByTestId('radical-image-loading')).toBeTruthy();
    });
  });

  describe('SVG-only images', () => {
    const svgOnlyImages = JSON.stringify([
      {
        url: 'https://files.wanikani.com/test-image-inline.svg',
        content_type: 'image/svg+xml',
        metadata: { inline_styles: true },
      },
      {
        url: 'https://files.wanikani.com/test-image-no-inline.svg',
        content_type: 'image/svg+xml',
        metadata: { inline_styles: false },
      },
    ]);

    it('prefers SVG with inline_styles when no PNG available', async () => {
      const { getByTestId } = render(
        <RadicalImage characterImages={svgOnlyImages} testID="radical-image" />,
      );

      await waitFor(() => {
        const image = getByTestId('radical-image-image');
        expect(image.props.source.uri).toBe(
          'https://files.wanikani.com/test-image-inline.svg',
        );
      });
    });
  });
});
