import fs from 'fs';
import path from 'path';

const WEAR_DIR = path.resolve(__dirname, '../../android/wear');
const WEAR_SRC = path.join(
  WEAR_DIR,
  'src/main/kotlin/com/krabikani/wear',
);

describe('Wear OS ReviewDataListenerService', () => {
  describe('ReviewDataListenerService.kt', () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(
        path.join(WEAR_SRC, 'ReviewDataListenerService.kt'),
        'utf8',
      );
    });

    it('exists in the wear package', () => {
      expect(content).toBeDefined();
    });

    it('declares package com.krabikani.wear', () => {
      expect(content).toContain('package com.krabikani.wear');
    });

    it('extends WearableListenerService', () => {
      expect(content).toContain('WearableListenerService');
    });

    it('imports WearableListenerService', () => {
      expect(content).toContain(
        'import com.google.android.gms.wearable.WearableListenerService',
      );
    });

    it('overrides onDataChanged', () => {
      expect(content).toContain('onDataChanged');
    });

    it('filters for /krabikani/review-summary path', () => {
      expect(content).toContain('/krabikani/review-summary');
    });

    it('calls TileService.getUpdater to request tile update', () => {
      expect(content).toContain('TileService.getUpdater');
    });

    it('calls requestUpdate with ReviewTileService class', () => {
      expect(content).toContain('ReviewTileService::class.java');
    });

    it('imports TileService from androidx.wear.tiles', () => {
      expect(content).toContain('import androidx.wear.tiles.TileService');
    });

    it('receives DataEventBuffer parameter', () => {
      expect(content).toContain('DataEventBuffer');
    });

    it('checks data event type for TYPE_CHANGED', () => {
      expect(content).toContain('TYPE_CHANGED');
    });

    it('checks data item path against the review summary path', () => {
      expect(content).toMatch(/dataItem\.uri\.path|event\.dataItem\.uri\.path/);
    });
  });

  describe('AndroidManifest.xml listener service declaration', () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(
        path.join(WEAR_DIR, 'src/main/AndroidManifest.xml'),
        'utf8',
      );
    });

    it('declares ReviewDataListenerService as a service', () => {
      expect(content).toContain('ReviewDataListenerService');
    });

    it('is exported for the wearable system', () => {
      expect(content).toMatch(
        /ReviewDataListenerService[\s\S]*?android:exported="true"/,
      );
    });

    it('has DATA_CHANGED intent filter action', () => {
      expect(content).toContain(
        'com.google.android.gms.wearable.DATA_CHANGED',
      );
    });

    it('scopes intent filter to /krabikani/review-summary path', () => {
      expect(content).toMatch(
        /android:pathPrefix="\/krabikani\/review-summary"|android:path="\/krabikani\/review-summary"/,
      );
    });

    it('uses wearable data scheme and host in intent filter', () => {
      expect(content).toContain('android:scheme="wear"');
      expect(content).toContain('android:host="*"');
    });
  });
});
