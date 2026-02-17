import fs from 'fs';
import path from 'path';

const ANDROID_DIR = path.resolve(__dirname, '../../android');
const APP_SRC = path.join(
  ANDROID_DIR,
  'app/src/main/java/com/krabikani/wear',
);

describe('Phone-side WearDataModule native module', () => {
  describe('WearDataModule.kt', () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(
        path.join(APP_SRC, 'WearDataModule.kt'),
        'utf8',
      );
    });

    it('exists in the wear package', () => {
      expect(content).toBeDefined();
    });

    it('declares package com.krabikani.wear', () => {
      expect(content).toContain('package com.krabikani.wear');
    });

    it('extends ReactContextBaseJavaModule', () => {
      expect(content).toContain('ReactContextBaseJavaModule');
    });

    it('exposes module name "WearDataModule"', () => {
      expect(content).toMatch(/getName\(\).*=.*"WearDataModule"/s);
    });

    it('has a sendReviewData method annotated with @ReactMethod', () => {
      expect(content).toContain('@ReactMethod');
      expect(content).toContain('sendReviewData');
    });

    it('uses Wearable.getDataClient()', () => {
      expect(content).toContain('Wearable.getDataClient');
    });

    it('puts data at path /krabikani/review-summary', () => {
      expect(content).toContain('/krabikani/review-summary');
    });

    it('includes available_reviews field in DataMap', () => {
      expect(content).toContain('available_reviews');
    });

    it('includes next_review_time field in DataMap', () => {
      expect(content).toContain('next_review_time');
    });

    it('includes last_updated field in DataMap', () => {
      expect(content).toContain('last_updated');
    });

    it('calls setUrgent() for immediate sync', () => {
      expect(content).toContain('setUrgent');
    });

    it('catches ApiException errors', () => {
      expect(content).toContain('ApiException');
    });
  });

  describe('WearDataPackage.kt', () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(
        path.join(APP_SRC, 'WearDataPackage.kt'),
        'utf8',
      );
    });

    it('exists in the wear package', () => {
      expect(content).toBeDefined();
    });

    it('declares package com.krabikani.wear', () => {
      expect(content).toContain('package com.krabikani.wear');
    });

    it('implements ReactPackage', () => {
      expect(content).toContain('ReactPackage');
    });

    it('creates WearDataModule in createNativeModules', () => {
      expect(content).toContain('createNativeModules');
      expect(content).toContain('WearDataModule');
    });
  });

  describe('MainApplication.kt registration', () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(
        path.join(ANDROID_DIR, 'app/src/main/java/com/krabikani/MainApplication.kt'),
        'utf8',
      );
    });

    it('imports WearDataPackage', () => {
      expect(content).toContain('import com.krabikani.wear.WearDataPackage');
    });

    it('adds WearDataPackage to the package list', () => {
      expect(content).toContain('WearDataPackage()');
    });
  });

  describe('app/build.gradle wearable dependency', () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(
        path.join(ANDROID_DIR, 'app/build.gradle'),
        'utf8',
      );
    });

    it('includes play-services-wearable v19.0.0', () => {
      expect(content).toContain(
        'com.google.android.gms:play-services-wearable:19.0.0',
      );
    });
  });

  describe('TypeScript wrapper', () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(
        path.resolve(__dirname, '../../src/native/WearDataModule.ts'),
        'utf8',
      );
    });

    it('imports Platform and NativeModules from react-native', () => {
      expect(content).toContain('Platform');
      expect(content).toContain('NativeModules');
    });

    it('exports sendReviewData function', () => {
      expect(content).toContain('export');
      expect(content).toContain('sendReviewData');
    });

    it('has a platform guard for non-android', () => {
      expect(content).toMatch(/Platform\.OS/);
      expect(content).toContain('android');
    });
  });
});
