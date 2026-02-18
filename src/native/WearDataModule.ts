import { Platform, NativeModules } from 'react-native';

export async function sendReviewData(
  reviewCount: number,
  nextReviewISO: string | null,
  reviewsDoneToday: number = 0,
): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    await NativeModules.WearDataModule.sendReviewData(
      reviewCount,
      nextReviewISO,
      reviewsDoneToday,
    );
  } catch {
    // Wear data push is best-effort — never crash the app
  }
}
