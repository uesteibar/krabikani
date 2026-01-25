import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import {
  getPreferredImageUrl,
  parseCharacterImages,
  prefetchImage,
} from '../utils/imageCache';

export interface RadicalImageProps {
  /** JSON string of character_images from database, or parsed array */
  characterImages: string | null;
  /** Fallback text to display if no image (e.g., primary meaning) */
  fallbackText?: string;
  /** Size of the image in pixels (width and height) */
  size?: number;
  /** Test ID for testing */
  testID?: string;
  /** Additional style for the container */
  style?: ViewStyle;
}

/**
 * RadicalImage displays a radical's image for radicals without Unicode characters.
 * Falls back to displaying text if no image is available or loading fails.
 */
export function RadicalImage({
  characterImages,
  fallbackText = '?',
  size = 24,
  testID,
  style,
}: RadicalImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const parsed = parseCharacterImages(characterImages);
    const url = getPreferredImageUrl(parsed);
    setImageUrl(url);
    setImageError(false);
    setImageLoaded(false);

    // Prefetch the image to populate cache
    if (url) {
      prefetchImage(url);
    }
  }, [characterImages]);

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // Show fallback text if no image URL or image failed to load
  if (!imageUrl || imageError) {
    return (
      <View style={[styles.container, { width: size, height: size }, style]} testID={testID}>
        <Text
          style={[styles.fallbackText, { fontSize: size * 0.6 }]}
          testID={testID ? `${testID}-fallback` : undefined}>
          {fallbackText}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width: size, height: size }, style]} testID={testID}>
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, { width: size, height: size }]}
        onError={handleImageError}
        onLoad={handleImageLoad}
        resizeMode="contain"
        testID={testID ? `${testID}-image` : undefined}
      />
      {/* Show fallback while loading, hidden when loaded */}
      {!imageLoaded && (
        <View style={[styles.loadingOverlay, { width: size, height: size }]}>
          <Text
            style={[styles.fallbackText, { fontSize: size * 0.6 }]}
            testID={testID ? `${testID}-loading` : undefined}>
            {fallbackText}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    // Invert colors to make the image white (WaniKani SVGs are black)
    tintColor: '#FFFFFF',
  },
  fallbackText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
