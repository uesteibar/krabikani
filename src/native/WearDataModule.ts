import { Platform, NativeModules } from 'react-native';

export async function sendReviewData(
  reviewCount: number,
  nextReviewISO: string | null,
): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    await NativeModules.WearDataModule.sendReviewData(
      reviewCount,
      nextReviewISO,
    );
  } catch {
    // Wear data push is best-effort — never crash the app
  }
}
