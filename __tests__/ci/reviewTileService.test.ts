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

    it('reads reviews_done_today from DataMap', () => {
      expect(content).toContain('reviews_done_today');
    });

    it('displays no-data message when data is missing', () => {
      expect(content).toContain('on your phone');
    });

    it('uses brand purple color #AA00FF', () => {
      expect(content).toMatch(/AA00FF/i);
    });

    it('displays reviews available label', () => {
      expect(content).toMatch(/reviews available/i);
    });

    it('displays done today label', () => {
      expect(content).toMatch(/done today/i);
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

    it('uses CallbackToFutureAdapter for returning tile', () => {
      expect(content).toContain('CallbackToFutureAdapter.getFuture');
    });

    it('loads app icon resource in onTileResourcesRequest', () => {
      expect(content).toContain('ic_app_icon');
    });

    it('uses AndroidImageResourceByResId for icon mapping', () => {
      expect(content).toContain('AndroidImageResourceByResId');
    });

    it('renders app icon Image element in layout', () => {
      expect(content).toContain('Image.Builder');
    });

    it('shows encouragement text when no reviews done today', () => {
      expect(content).toContain('Start your first review!');
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

  describe('app icon drawable', () => {
    it('ic_app_icon.png exists in wear drawable resources', () => {
      const iconPath = path.join(
        WEAR_DIR,
        'src/main/res/drawable/ic_app_icon.png',
      );
      expect(fs.existsSync(iconPath)).toBe(true);
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
