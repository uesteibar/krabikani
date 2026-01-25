import { Image } from 'react-native';

export interface CharacterImage {
  url: string;
  content_type: string;
  metadata: {
    inline_styles?: boolean;
    color?: string;
    dimensions?: string;
    style_name?: string;
  };
}

/**
 * Gets the preferred image URL from character_images array.
 * Prefers PNG over SVG for React Native compatibility.
 * Falls back to SVG with inline_styles if no PNG available.
 */
export function getPreferredImageUrl(
  characterImages: CharacterImage[] | null,
): string | null {
  if (!characterImages || characterImages.length === 0) {
    return null;
  }

  // First, try to find a PNG image
  const pngImage = characterImages.find(
    img => img.content_type === 'image/png',
  );
  if (pngImage) {
    return pngImage.url;
  }

  // Next, try to find an SVG with inline_styles (best for rendering)
  const svgWithInlineStyles = characterImages.find(
    img =>
      img.content_type === 'image/svg+xml' &&
      img.metadata.inline_styles === true,
  );
  if (svgWithInlineStyles) {
    return svgWithInlineStyles.url;
  }

  // Fall back to any SVG
  const svgImage = characterImages.find(
    img => img.content_type === 'image/svg+xml',
  );
  if (svgImage) {
    return svgImage.url;
  }

  // Fall back to first image
  return characterImages[0]?.url ?? null;
}

/**
 * Prefetches images to populate React Native's image cache.
 * This helps with offline support by ensuring images are cached.
 */
export async function prefetchImage(url: string): Promise<boolean> {
  try {
    await Image.prefetch(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Prefetches multiple images in parallel.
 * Returns the count of successfully prefetched images.
 */
export async function prefetchImages(urls: string[]): Promise<number> {
  const results = await Promise.all(urls.map(url => prefetchImage(url)));
  return results.filter(Boolean).length;
}

/**
 * Parses character_images JSON string from database.
 */
export function parseCharacterImages(
  characterImagesJson: string | null,
): CharacterImage[] | null {
  if (!characterImagesJson) {
    return null;
  }
  try {
    return JSON.parse(characterImagesJson) as CharacterImage[];
  } catch {
    return null;
  }
}
