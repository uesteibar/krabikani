import {
  getPreferredImageUrl,
  parseCharacterImages,
  type CharacterImage,
} from '../../src/utils/imageCache';

describe('imageCache', () => {
  describe('getPreferredImageUrl', () => {
    it('returns null for null input', () => {
      expect(getPreferredImageUrl(null)).toBeNull();
    });

    it('returns null for empty array', () => {
      expect(getPreferredImageUrl([])).toBeNull();
    });

    it('prefers PNG over SVG', () => {
      const images: CharacterImage[] = [
        {
          url: 'https://example.com/image.svg',
          content_type: 'image/svg+xml',
          metadata: { inline_styles: true },
        },
        {
          url: 'https://example.com/image.png',
          content_type: 'image/png',
          metadata: {},
        },
      ];
      expect(getPreferredImageUrl(images)).toBe('https://example.com/image.png');
    });

    it('prefers SVG with inline_styles when no PNG available', () => {
      const images: CharacterImage[] = [
        {
          url: 'https://example.com/no-inline.svg',
          content_type: 'image/svg+xml',
          metadata: { inline_styles: false },
        },
        {
          url: 'https://example.com/inline.svg',
          content_type: 'image/svg+xml',
          metadata: { inline_styles: true },
        },
      ];
      expect(getPreferredImageUrl(images)).toBe('https://example.com/inline.svg');
    });

    it('falls back to any SVG when no PNG or inline_styles SVG', () => {
      const images: CharacterImage[] = [
        {
          url: 'https://example.com/image.svg',
          content_type: 'image/svg+xml',
          metadata: {},
        },
      ];
      expect(getPreferredImageUrl(images)).toBe('https://example.com/image.svg');
    });

    it('falls back to first image when no PNG or SVG', () => {
      const images: CharacterImage[] = [
        {
          url: 'https://example.com/image.webp',
          content_type: 'image/webp',
          metadata: {},
        },
      ];
      expect(getPreferredImageUrl(images)).toBe('https://example.com/image.webp');
    });

    it('handles real WaniKani character_images structure', () => {
      // This is the typical structure from WaniKani API for radicals without characters
      const images: CharacterImage[] = [
        {
          url: 'https://files.wanikani.com/subjects/images/8761-subject-8761-with-css-original.svg?1520987265',
          content_type: 'image/svg+xml',
          metadata: {
            inline_styles: true,
          },
        },
        {
          url: 'https://files.wanikani.com/subjects/images/8761-subject-8761-without-css-original.svg?1520987265',
          content_type: 'image/svg+xml',
          metadata: {
            inline_styles: false,
          },
        },
      ];
      // Should prefer SVG with inline_styles
      expect(getPreferredImageUrl(images)).toBe(
        'https://files.wanikani.com/subjects/images/8761-subject-8761-with-css-original.svg?1520987265',
      );
    });
  });

  describe('parseCharacterImages', () => {
    it('returns null for null input', () => {
      expect(parseCharacterImages(null)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseCharacterImages('')).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      expect(parseCharacterImages('not valid json')).toBeNull();
    });

    it('parses valid JSON array', () => {
      const images: CharacterImage[] = [
        {
          url: 'https://example.com/image.png',
          content_type: 'image/png',
          metadata: {},
        },
      ];
      const json = JSON.stringify(images);
      expect(parseCharacterImages(json)).toEqual(images);
    });

    it('parses complex character_images JSON', () => {
      const images: CharacterImage[] = [
        {
          url: 'https://files.wanikani.com/subjects/images/8761-subject-8761-with-css-original.svg',
          content_type: 'image/svg+xml',
          metadata: {
            inline_styles: true,
            color: '#000000',
            dimensions: '128x128',
            style_name: 'original',
          },
        },
      ];
      const json = JSON.stringify(images);
      const parsed = parseCharacterImages(json);
      expect(parsed).toEqual(images);
      expect(parsed?.[0].metadata.inline_styles).toBe(true);
    });
  });
});
