import { getSrsLevelInfo, SRS_LEVELS } from '../../src/theme/colors';

describe('SRS Levels', () => {
  describe('SRS_LEVELS constant', () => {
    it('has all five levels defined', () => {
      expect(SRS_LEVELS.apprentice).toBeDefined();
      expect(SRS_LEVELS.guru).toBeDefined();
      expect(SRS_LEVELS.master).toBeDefined();
      expect(SRS_LEVELS.enlightened).toBeDefined();
      expect(SRS_LEVELS.burned).toBeDefined();
    });

    it('has correct WaniKani colors', () => {
      expect(SRS_LEVELS.apprentice.color).toBe('#DD0093');
      expect(SRS_LEVELS.guru.color).toBe('#882D9E');
      expect(SRS_LEVELS.master.color).toBe('#294DDB');
      expect(SRS_LEVELS.enlightened.color).toBe('#0093DD');
      expect(SRS_LEVELS.burned.color).toBe('#434343');
    });

    it('has correct level names', () => {
      expect(SRS_LEVELS.apprentice.name).toBe('Apprentice');
      expect(SRS_LEVELS.guru.name).toBe('Guru');
      expect(SRS_LEVELS.master.name).toBe('Master');
      expect(SRS_LEVELS.enlightened.name).toBe('Enlightened');
      expect(SRS_LEVELS.burned.name).toBe('Burned');
    });

    it('maps stages correctly', () => {
      expect(SRS_LEVELS.apprentice.stages).toEqual([1, 2, 3, 4]);
      expect(SRS_LEVELS.guru.stages).toEqual([5, 6]);
      expect(SRS_LEVELS.master.stages).toEqual([7]);
      expect(SRS_LEVELS.enlightened.stages).toEqual([8]);
      expect(SRS_LEVELS.burned.stages).toEqual([9]);
    });
  });

  describe('getSrsLevelInfo', () => {
    describe('Apprentice levels (stages 1-4)', () => {
      [1, 2, 3, 4].forEach(stage => {
        it(`returns Apprentice for stage ${stage}`, () => {
          const info = getSrsLevelInfo(stage);
          expect(info).not.toBeNull();
          expect(info!.key).toBe('apprentice');
          expect(info!.name).toBe('Apprentice');
          expect(info!.color).toBe('#DD0093');
          expect(info!.stage).toBe(stage);
        });
      });
    });

    describe('Guru levels (stages 5-6)', () => {
      [5, 6].forEach(stage => {
        it(`returns Guru for stage ${stage}`, () => {
          const info = getSrsLevelInfo(stage);
          expect(info).not.toBeNull();
          expect(info!.key).toBe('guru');
          expect(info!.name).toBe('Guru');
          expect(info!.color).toBe('#882D9E');
          expect(info!.stage).toBe(stage);
        });
      });
    });

    describe('Master level (stage 7)', () => {
      it('returns Master for stage 7', () => {
        const info = getSrsLevelInfo(7);
        expect(info).not.toBeNull();
        expect(info!.key).toBe('master');
        expect(info!.name).toBe('Master');
        expect(info!.color).toBe('#294DDB');
        expect(info!.stage).toBe(7);
      });
    });

    describe('Enlightened level (stage 8)', () => {
      it('returns Enlightened for stage 8', () => {
        const info = getSrsLevelInfo(8);
        expect(info).not.toBeNull();
        expect(info!.key).toBe('enlightened');
        expect(info!.name).toBe('Enlightened');
        expect(info!.color).toBe('#0093DD');
        expect(info!.stage).toBe(8);
      });
    });

    describe('Burned level (stage 9)', () => {
      it('returns Burned for stage 9', () => {
        const info = getSrsLevelInfo(9);
        expect(info).not.toBeNull();
        expect(info!.key).toBe('burned');
        expect(info!.name).toBe('Burned');
        expect(info!.color).toBe('#434343');
        expect(info!.stage).toBe(9);
      });
    });

    describe('Invalid stages', () => {
      it('returns null for stage 0', () => {
        expect(getSrsLevelInfo(0)).toBeNull();
      });

      it('returns null for negative stages', () => {
        expect(getSrsLevelInfo(-1)).toBeNull();
        expect(getSrsLevelInfo(-100)).toBeNull();
      });

      it('returns null for stages above 9', () => {
        expect(getSrsLevelInfo(10)).toBeNull();
        expect(getSrsLevelInfo(100)).toBeNull();
      });
    });
  });
});
