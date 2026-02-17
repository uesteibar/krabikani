import fs from 'fs';
import path from 'path';

const ANDROID_DIR = path.resolve(__dirname, '../../android');

describe('Wear OS module scaffold', () => {
  describe('settings.gradle', () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(
        path.join(ANDROID_DIR, 'settings.gradle'),
        'utf8',
      );
    });

    it("includes ':wear' module", () => {
      expect(content).toContain("include ':wear'");
    });

    it("still includes ':app' module", () => {
      expect(content).toContain("include ':app'");
    });
  });

  describe('wear/build.gradle', () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(
        path.join(ANDROID_DIR, 'wear/build.gradle'),
        'utf8',
      );
    });

    it('uses com.android.application plugin', () => {
      expect(content).toContain('com.android.application');
    });

    it('uses org.jetbrains.kotlin.android plugin', () => {
      expect(content).toContain('org.jetbrains.kotlin.android');
    });

    it("sets applicationId to 'com.krabikani'", () => {
      expect(content).toMatch(/applicationId\s+["']com\.krabikani["']/);
    });

    it('sets minSdk to 30 for Wear OS', () => {
      expect(content).toMatch(/minSdk(Version)?\s+30/);
    });

    it('sets targetSdk to 34', () => {
      expect(content).toMatch(/targetSdk(Version)?\s+34/);
    });

    it('uses compileSdk from rootProject.ext', () => {
      expect(content).toContain('rootProject.ext.compileSdkVersion');
    });

    it('includes androidx.wear.tiles:tiles dependency v1.5.0', () => {
      expect(content).toContain('androidx.wear.tiles:tiles:1.5.0');
    });

    it('includes androidx.wear.protolayout:protolayout-material dependency', () => {
      expect(content).toContain(
        'androidx.wear.protolayout:protolayout-material',
      );
    });

    it('includes play-services-wearable v19.0.0', () => {
      expect(content).toContain(
        'com.google.android.gms:play-services-wearable:19.0.0',
      );
    });

    it('uses debug applicationIdSuffix for Data Layer connectivity', () => {
      expect(content).toContain('applicationIdSuffix');
      expect(content).toContain('.debug');
    });

    it('does not apply React Native plugins', () => {
      expect(content).not.toContain('com.facebook.react');
    });
  });

  describe('wear/src/main/AndroidManifest.xml', () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(
        path.join(ANDROID_DIR, 'wear/src/main/AndroidManifest.xml'),
        'utf8',
      );
    });

    it('declares android.hardware.type.watch feature', () => {
      expect(content).toContain('android.hardware.type.watch');
    });

    it('has a valid application element', () => {
      expect(content).toContain('<application');
    });

    it('uses com.krabikani namespace', () => {
      expect(content).toMatch(/package\s*=\s*["']com\.krabikani["']/);
    });
  });
});
