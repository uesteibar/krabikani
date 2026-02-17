import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

const ROOT = path.resolve(__dirname, '../..');
const ANDROID_DIR = path.join(ROOT, 'android');
const APP_DIR = path.join(ANDROID_DIR, 'app');
const WEAR_DIR = path.join(ANDROID_DIR, 'wear');

/**
 * IT-001: Phone APK builds successfully with play-services-wearable dependency
 *         and native module registration
 *
 * Verifies that all pieces required for a successful phone APK build are in place:
 * - Gradle configuration includes wearable dependency
 * - WearDataModule and WearDataPackage classes exist with correct structure
 * - Native module is registered in MainApplication
 * - No duplicate class conflicts between app and wear modules
 */
describe('IT-001: Phone APK build with native module', () => {
  const appBuildGradle = fs.readFileSync(
    path.join(APP_DIR, 'build.gradle'),
    'utf8',
  );
  const mainApplicationKt = fs.readFileSync(
    path.join(
      APP_DIR,
      'src/main/java/com/krabikani/MainApplication.kt',
    ),
    'utf8',
  );
  const wearDataModuleKt = fs.readFileSync(
    path.join(
      APP_DIR,
      'src/main/java/com/krabikani/wear/WearDataModule.kt',
    ),
    'utf8',
  );
  const wearDataPackageKt = fs.readFileSync(
    path.join(
      APP_DIR,
      'src/main/java/com/krabikani/wear/WearDataPackage.kt',
    ),
    'utf8',
  );
  const settingsGradle = fs.readFileSync(
    path.join(ANDROID_DIR, 'settings.gradle'),
    'utf8',
  );
  const wearBuildGradle = fs.readFileSync(
    path.join(WEAR_DIR, 'build.gradle'),
    'utf8',
  );

  it('app/build.gradle includes play-services-wearable dependency', () => {
    expect(appBuildGradle).toContain(
      'com.google.android.gms:play-services-wearable:19.0.0',
    );
  });

  it('WearDataModule.kt exists with correct package and class declaration', () => {
    expect(wearDataModuleKt).toContain('package com.krabikani.wear');
    expect(wearDataModuleKt).toContain(
      'class WearDataModule',
    );
    expect(wearDataModuleKt).toContain(
      'ReactContextBaseJavaModule',
    );
  });

  it('WearDataPackage.kt exists and implements ReactPackage', () => {
    expect(wearDataPackageKt).toContain('package com.krabikani.wear');
    expect(wearDataPackageKt).toContain('class WearDataPackage');
    expect(wearDataPackageKt).toContain('ReactPackage');
  });

  it('WearDataPackage is registered in MainApplication.kt', () => {
    expect(mainApplicationKt).toContain('import com.krabikani.wear.WearDataPackage');
    expect(mainApplicationKt).toContain('WearDataPackage()');
  });

  it('no duplicate class conflicts: app module uses com.facebook.react plugin but wear does not', () => {
    expect(appBuildGradle).toContain('com.facebook.react');
    expect(wearBuildGradle).not.toContain('com.facebook.react');
  });

  it('wear module does not include react-android dependency that would conflict', () => {
    expect(wearBuildGradle).not.toContain('react-android');
    expect(wearBuildGradle).not.toContain('com.facebook.react');
  });

  it('both modules use the same play-services-wearable version to avoid conflicts', () => {
    const appWearableMatch = appBuildGradle.match(
      /play-services-wearable:([\d.]+)/,
    );
    const wearWearableMatch = wearBuildGradle.match(
      /play-services-wearable:([\d.]+)/,
    );
    expect(appWearableMatch).not.toBeNull();
    expect(wearWearableMatch).not.toBeNull();
    expect(appWearableMatch![1]).toBe(wearWearableMatch![1]);
  });

  it('settings.gradle includes both app and wear modules', () => {
    expect(settingsGradle).toContain("include ':app'");
    expect(settingsGradle).toContain("include ':wear'");
  });

  it('autolinkLibrariesWithApp is in app/build.gradle, not applied globally', () => {
    expect(appBuildGradle).toContain('autolinkLibrariesWithApp()');
    expect(wearBuildGradle).not.toContain('autolinkLibrariesWithApp');
  });
});

/**
 * IT-002: Wear APK builds successfully and does not include React Native dependencies
 *
 * Verifies the wear module is self-contained with only Wear OS dependencies,
 * contains the required services, and does not pull in React Native.
 */
describe('IT-002: Wear APK build without RN dependencies', () => {
  const wearBuildGradle = fs.readFileSync(
    path.join(WEAR_DIR, 'build.gradle'),
    'utf8',
  );
  const wearManifest = fs.readFileSync(
    path.join(WEAR_DIR, 'src/main/AndroidManifest.xml'),
    'utf8',
  );
  const settingsGradle = fs.readFileSync(
    path.join(ANDROID_DIR, 'settings.gradle'),
    'utf8',
  );
  const reviewTileServiceKt = fs.readFileSync(
    path.join(
      WEAR_DIR,
      'src/main/kotlin/com/krabikani/wear/ReviewTileService.kt',
    ),
    'utf8',
  );
  const reviewDataListenerServiceKt = fs.readFileSync(
    path.join(
      WEAR_DIR,
      'src/main/kotlin/com/krabikani/wear/ReviewDataListenerService.kt',
    ),
    'utf8',
  );

  it('wear/build.gradle uses com.android.application plugin (standalone APK)', () => {
    expect(wearBuildGradle).toContain('com.android.application');
  });

  it('wear/build.gradle uses kotlin plugin', () => {
    expect(wearBuildGradle).toContain('org.jetbrains.kotlin.android');
  });

  it('wear/build.gradle does NOT apply any React Native plugins', () => {
    expect(wearBuildGradle).not.toContain('com.facebook.react');
    expect(wearBuildGradle).not.toContain('react-native-gradle-plugin');
  });

  it('wear/build.gradle does NOT depend on react-android', () => {
    expect(wearBuildGradle).not.toContain('react-android');
    expect(wearBuildGradle).not.toContain('hermes-android');
  });

  it('wear/build.gradle includes required Wear OS dependencies', () => {
    expect(wearBuildGradle).toContain('androidx.wear.tiles:tiles:1.5.0');
    expect(wearBuildGradle).toContain(
      'androidx.wear.protolayout:protolayout-material:1.5.0',
    );
    expect(wearBuildGradle).toContain(
      'com.google.android.gms:play-services-wearable:19.0.0',
    );
  });

  it('ReviewTileService.kt exists and extends TileService', () => {
    expect(reviewTileServiceKt).toContain('package com.krabikani.wear');
    expect(reviewTileServiceKt).toContain('class ReviewTileService');
    expect(reviewTileServiceKt).toContain('TileService');
  });

  it('ReviewDataListenerService.kt exists and extends WearableListenerService', () => {
    expect(reviewDataListenerServiceKt).toContain('package com.krabikani.wear');
    expect(reviewDataListenerServiceKt).toContain(
      'class ReviewDataListenerService',
    );
    expect(reviewDataListenerServiceKt).toContain('WearableListenerService');
  });

  it('ReviewTileService does NOT import React Native classes', () => {
    expect(reviewTileServiceKt).not.toContain('com.facebook.react');
    expect(reviewTileServiceKt).not.toContain('ReactApplicationContext');
  });

  it('ReviewDataListenerService does NOT import React Native classes', () => {
    expect(reviewDataListenerServiceKt).not.toContain('com.facebook.react');
    expect(reviewDataListenerServiceKt).not.toContain('ReactApplicationContext');
  });

  it('wear manifest declares watch hardware feature', () => {
    expect(wearManifest).toContain('android.hardware.type.watch');
  });

  it('wear manifest declares both services', () => {
    expect(wearManifest).toContain('ReviewTileService');
    expect(wearManifest).toContain('ReviewDataListenerService');
  });

  it('settings.gradle does not apply autolinkLibrariesWithApp to wear module', () => {
    // autolinkLibrariesFromCommand() is in settings.gradle but only scopes to :app
    // because autolinkLibrariesWithApp() is only in app/build.gradle
    expect(settingsGradle).not.toContain('autolinkLibrariesWithApp');
  });
});

/**
 * IT-003: Both phone and wear APKs build together without conflicts
 *
 * Verifies multi-module Gradle configuration is consistent and conflict-free:
 * - Both modules are registered in settings.gradle
 * - compileSdk versions are aligned
 * - Application IDs match for Data Layer connectivity
 * - Debug suffixes match between modules
 * - No conflicting plugin configurations
 */
describe('IT-003: Both APKs build together without conflicts', () => {
  const settingsGradle = fs.readFileSync(
    path.join(ANDROID_DIR, 'settings.gradle'),
    'utf8',
  );
  const rootBuildGradle = fs.readFileSync(
    path.join(ANDROID_DIR, 'build.gradle'),
    'utf8',
  );
  const appBuildGradle = fs.readFileSync(
    path.join(APP_DIR, 'build.gradle'),
    'utf8',
  );
  const wearBuildGradle = fs.readFileSync(
    path.join(WEAR_DIR, 'build.gradle'),
    'utf8',
  );
  const appManifest = fs.readFileSync(
    path.join(APP_DIR, 'src/main/AndroidManifest.xml'),
    'utf8',
  );
  const wearManifest = fs.readFileSync(
    path.join(WEAR_DIR, 'src/main/AndroidManifest.xml'),
    'utf8',
  );

  it('settings.gradle includes both :app and :wear modules', () => {
    expect(settingsGradle).toContain("include ':app'");
    expect(settingsGradle).toContain("include ':wear'");
  });

  it('both modules use compileSdk from rootProject.ext for version alignment', () => {
    expect(appBuildGradle).toContain('rootProject.ext.compileSdkVersion');
    expect(wearBuildGradle).toContain('rootProject.ext.compileSdkVersion');
  });

  it('root build.gradle defines compileSdkVersion in ext', () => {
    expect(rootBuildGradle).toMatch(/compileSdkVersion\s*=\s*\d+/);
  });

  it('both modules use the same base applicationId for Data Layer connectivity', () => {
    const appIdMatch = appBuildGradle.match(
      /applicationId\s+["']([^"']+)["']/,
    );
    const wearIdMatch = wearBuildGradle.match(
      /applicationId\s+["']([^"']+)["']/,
    );
    expect(appIdMatch).not.toBeNull();
    expect(wearIdMatch).not.toBeNull();
    expect(appIdMatch![1]).toBe(wearIdMatch![1]);
  });

  it('both modules use debug applicationIdSuffix for Data Layer connectivity in debug builds', () => {
    expect(appBuildGradle).toMatch(/applicationIdSuffix.*\.debug/);
    expect(wearBuildGradle).toMatch(/applicationIdSuffix.*\.debug/);
  });

  it('both modules use the same play-services-wearable version', () => {
    const appVersion = appBuildGradle.match(
      /play-services-wearable:([\d.]+)/,
    );
    const wearVersion = wearBuildGradle.match(
      /play-services-wearable:([\d.]+)/,
    );
    expect(appVersion).not.toBeNull();
    expect(wearVersion).not.toBeNull();
    expect(appVersion![1]).toBe(wearVersion![1]);
  });

  it('app and wear manifests use the same package namespace', () => {
    const appPkg = appManifest.match(/package\s*=\s*["']([^"']+)["']/);
    const wearPkg = wearManifest.match(/package\s*=\s*["']([^"']+)["']/);
    // Wear manifest uses package attribute; app may use namespace in build.gradle
    if (appPkg && wearPkg) {
      expect(appPkg[1]).toBe(wearPkg[1]);
    } else if (wearPkg) {
      // App uses namespace in build.gradle instead of manifest
      expect(appBuildGradle).toContain(`namespace "${wearPkg[1]}"`);
    }
  });

  it('root build.gradle defines Kotlin version for both modules', () => {
    expect(rootBuildGradle).toContain('kotlinVersion');
    expect(rootBuildGradle).toContain('kotlin-gradle-plugin');
  });

  it('wear module does not import React Native Gradle plugin (no conflict)', () => {
    expect(wearBuildGradle).not.toContain('com.facebook.react');
  });

  it('react-native-gradle-plugin is scoped to app module only', () => {
    expect(appBuildGradle).toContain('com.facebook.react');
    expect(wearBuildGradle).not.toContain('com.facebook.react');
    // Root applies react root project but it only targets :app
    expect(rootBuildGradle).toContain('com.facebook.react.rootproject');
  });

  it('both APK output paths are distinct (no overwrite)', () => {
    // Verified by checking the CI workflow references distinct output paths
    const buildApkYml = fs.readFileSync(
      path.join(ROOT, '.github/workflows/build-apk.yml'),
      'utf8',
    );
    expect(buildApkYml).toContain('android/app/build/outputs/apk/release/app-release.apk');
    expect(buildApkYml).toContain('android/wear/build/outputs/apk/release/wear-release.apk');
  });
});

/**
 * IT-005: CI workflows produce both phone and wear APK artifacts
 *
 * Verifies that both CI workflows (build-apk.yml and release-apk.yml) are
 * configured to build, upload, and reference both phone and wear APKs.
 */
describe('IT-005: CI workflows produce both APK artifacts', () => {
  const buildApkContent = fs.readFileSync(
    path.join(ROOT, '.github/workflows/build-apk.yml'),
    'utf8',
  );
  const releaseApkContent = fs.readFileSync(
    path.join(ROOT, '.github/workflows/release-apk.yml'),
    'utf8',
  );
  const buildApk = YAML.parse(buildApkContent);
  const releaseApk = YAML.parse(releaseApkContent);

  describe('build-apk.yml', () => {
    const steps = buildApk.jobs['build-apk'].steps;

    it('builds phone APK with assembleRelease', () => {
      const buildStep = steps.find(
        (s: any) =>
          s.run &&
          s.run.includes('assembleRelease') &&
          !s.run.includes(':wear:'),
      );
      expect(buildStep).toBeDefined();
    });

    it('builds wear APK with :wear:assembleRelease', () => {
      const wearBuildStep = steps.find(
        (s: any) => s.run && s.run.includes(':wear:assembleRelease'),
      );
      expect(wearBuildStep).toBeDefined();
    });

    it('uploads phone APK as artifact', () => {
      const uploadSteps = steps.filter(
        (s: any) => s.uses && s.uses.startsWith('actions/upload-artifact@'),
      );
      const phoneUpload = uploadSteps.find(
        (s: any) => s.with.path && s.with.path.includes('app-release.apk'),
      );
      expect(phoneUpload).toBeDefined();
      expect(phoneUpload.id).toBe('upload');
    });

    it('uploads wear APK as a separate artifact', () => {
      const uploadSteps = steps.filter(
        (s: any) => s.uses && s.uses.startsWith('actions/upload-artifact@'),
      );
      const wearUpload = uploadSteps.find(
        (s: any) => s.with.path && s.with.path.includes('wear-release.apk'),
      );
      expect(wearUpload).toBeDefined();
      expect(wearUpload.id).toBe('upload-wear');
    });

    it('PR comment includes download links for both phone and wear APKs', () => {
      const commentStep = steps.find(
        (s: any) => s.uses && s.uses.startsWith('actions/github-script@'),
      );
      expect(commentStep).toBeDefined();
      const script = commentStep.with.script;
      expect(script).toContain('[Download phone APK]');
      expect(script).toContain('[Download wear APK]');
    });

    it('PR comment references both artifact URLs', () => {
      const commentStep = steps.find(
        (s: any) => s.uses && s.uses.startsWith('actions/github-script@'),
      );
      expect(commentStep.env.ARTIFACT_URL).toContain('steps.upload.outputs');
      expect(commentStep.env.WEAR_ARTIFACT_URL).toContain(
        'steps.upload-wear.outputs',
      );
    });
  });

  describe('release-apk.yml', () => {
    const steps = releaseApk.jobs['release-apk'].steps;

    it('builds phone APK with assembleRelease', () => {
      const buildStep = steps.find(
        (s: any) =>
          s.run &&
          s.run.includes('assembleRelease') &&
          !s.run.includes(':wear:'),
      );
      expect(buildStep).toBeDefined();
    });

    it('builds wear APK with :wear:assembleRelease', () => {
      const wearBuildStep = steps.find(
        (s: any) => s.run && s.run.includes(':wear:assembleRelease'),
      );
      expect(wearBuildStep).toBeDefined();
    });

    it('attaches both phone and wear APKs to the GitHub release', () => {
      const createStep = steps.find(
        (s: any) => s.run && s.run.includes('gh release create latest'),
      );
      expect(createStep).toBeDefined();
      expect(createStep.run).toContain('app-release.apk');
      expect(createStep.run).toContain('wear-release.apk');
    });

    it('phone and wear APK paths in release are distinct', () => {
      const createStep = steps.find(
        (s: any) => s.run && s.run.includes('gh release create latest'),
      );
      expect(createStep.run).toContain(
        'android/app/build/outputs/apk/release/app-release.apk',
      );
      expect(createStep.run).toContain(
        'android/wear/build/outputs/apk/release/wear-release.apk',
      );
    });
  });
});
