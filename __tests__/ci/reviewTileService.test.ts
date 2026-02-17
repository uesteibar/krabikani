import fs from 'fs';
import path from 'path';

const WEAR_DIR = path.resolve(__dirname, '../../android/wear');
const WEAR_SRC = path.join(
  WEAR_DIR,
  'src/main/kotlin/com/krabikani/wear',
);

describe('Wear OS ReviewTileService', () => {
  describe('ReviewTileService.kt', () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(
        path.join(WEAR_SRC, 'ReviewTileService.kt'),
        'utf8',
      );
    });

    it('exists in the wear package', () => {
      expect(content).toBeDefined();
    });

    it('declares package com.krabikani.wear', () => {
      expect(content).toContain('package com.krabikani.wear');
    });

    it('extends TileService', () => {
      expect(content).toContain('TileService');
    });

    it('overrides onTileRequest', () => {
      expect(content).toContain('onTileRequest');
    });

    it('overrides onTileResourcesRequest', () => {
      expect(content).toContain('onTileResourcesRequest');
    });

    it('reads from DataClient at /krabikani/review-summary path', () => {
      expect(content).toContain('/krabikani/review-summary');
    });

    it('reads available_reviews from DataMap', () => {
      expect(content).toContain('available_reviews');
    });

    it('reads next_review_time from DataMap', () => {
      expect(content).toContain('next_review_time');
    });

    it('reads last_updated from DataMap', () => {
      expect(content).toContain('last_updated');
    });

    it('displays no-data message when data is missing', () => {
      expect(content).toMatch(/No data|open Krabikani on your phone/i);
    });

    it('uses brand purple color #AA00FF', () => {
      expect(content).toMatch(/AA00FF/i);
    });

    it('includes staleness check for data older than 1 hour', () => {
      expect(content).toMatch(/3600|3_600|ONE_HOUR|STALE/i);
    });

    it('displays pending reviews label', () => {
      expect(content).toMatch(/pending reviews/i);
    });

    it('uses PrimaryLayout for tile layout', () => {
      expect(content).toContain('PrimaryLayout');
    });

    it('uses Text builder for tile text elements', () => {
      expect(content).toContain('Text.Builder');
    });

    it('uses Typography constants for text styling', () => {
      expect(content).toContain('Typography');
    });

    it('uses Timeline for tile timeline', () => {
      expect(content).toContain('Timeline');
    });

    it('uses Futures.immediateFuture for returning tile', () => {
      expect(content).toContain('Futures.immediateFuture');
    });
  });

  describe('AndroidManifest.xml tile service declaration', () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(
        path.join(WEAR_DIR, 'src/main/AndroidManifest.xml'),
        'utf8',
      );
    });

    it('declares ReviewTileService as a service', () => {
      expect(content).toContain('ReviewTileService');
    });

    it('has BIND_TILE_PROVIDER permission', () => {
      expect(content).toContain('BIND_TILE_PROVIDER');
    });

    it('has BIND_TILE_PROVIDER action in intent filter', () => {
      expect(content).toContain('androidx.wear.tiles.action.BIND_TILE_PROVIDER');
    });

    it('has tile preview metadata', () => {
      expect(content).toContain('androidx.wear.tiles.PREVIEW');
    });

    it('has tile label', () => {
      expect(content).toContain('android:label');
    });

    it('has tile description', () => {
      expect(content).toContain('android:description');
    });
  });

  describe('strings.xml tile strings', () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(
        path.join(WEAR_DIR, 'src/main/res/values/strings.xml'),
        'utf8',
      );
    });

    it('contains tile display name', () => {
      expect(content).toContain('Krabikani Reviews');
    });

    it('contains tile description string', () => {
      expect(content).toContain('tile_description');
    });

    it('contains tile label string', () => {
      expect(content).toContain('tile_label');
    });
  });

  describe('tile_preview.xml drawable', () => {
    it('exists', () => {
      const previewPath = path.join(
        WEAR_DIR,
        'src/main/res/drawable/tile_preview.xml',
      );
      expect(fs.existsSync(previewPath)).toBe(true);
    });

    it('uses brand purple color', () => {
      const content = fs.readFileSync(
        path.join(WEAR_DIR, 'src/main/res/drawable/tile_preview.xml'),
        'utf8',
      );
      expect(content).toMatch(/AA00FF/i);
    });
  });

  describe('wear/build.gradle dependencies', () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(
        path.join(WEAR_DIR, 'build.gradle'),
        'utf8',
      );
    });

    it('includes concurrent-futures for ListenableFuture', () => {
      expect(content).toContain('concurrent-futures');
    });
  });
});
