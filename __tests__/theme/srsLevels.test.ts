import { getSrsLevelInfo, SRS_LEVELS, calculateSrsStageAfterIncorrect } from '../../src/theme/colors';

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

  describe('calculateSrsStageAfterIncorrect', () => {
    describe('Apprentice levels (stages 1-4)', () => {
      it('drops stage 1 to stage 1 (stays at Apprentice 1)', () => {
        expect(calculateSrsStageAfterIncorrect(1)).toBe(1);
      });

      it('drops stage 2 to stage 1', () => {
        expect(calculateSrsStageAfterIncorrect(2)).toBe(1);
      });

      it('drops stage 3 to stage 1', () => {
        expect(calculateSrsStageAfterIncorrect(3)).toBe(1);
      });

      it('drops stage 4 to stage 1', () => {
        expect(calculateSrsStageAfterIncorrect(4)).toBe(1);
      });
    });

    describe('Guru levels (stages 5-6)', () => {
      it('drops stage 5 (Guru 1) to stage 4 (Apprentice 4)', () => {
        expect(calculateSrsStageAfterIncorrect(5)).toBe(4);
      });

      it('drops stage 6 (Guru 2) to stage 4 (Apprentice 4)', () => {
        expect(calculateSrsStageAfterIncorrect(6)).toBe(4);
      });
    });

    describe('Master level (stage 7)', () => {
      it('drops stage 7 (Master) to stage 5 (Guru 1)', () => {
        expect(calculateSrsStageAfterIncorrect(7)).toBe(5);
      });
    });

    describe('Enlightened level (stage 8)', () => {
      it('drops stage 8 (Enlightened) to stage 5 (Guru 1)', () => {
        expect(calculateSrsStageAfterIncorrect(8)).toBe(5);
      });
    });

    describe('Burned level (stage 9)', () => {
      it('stage 9 (Burned) stays at 9 (should not be reviewed)', () => {
        expect(calculateSrsStageAfterIncorrect(9)).toBe(9);
      });
    });

    describe('Level changes after incorrect', () => {
      it('Guru to Apprentice is a level change', () => {
        const beforeLevel = getSrsLevelInfo(5);
        const afterStage = calculateSrsStageAfterIncorrect(5);
        const afterLevel = getSrsLevelInfo(afterStage);
        expect(beforeLevel?.key).toBe('guru');
        expect(afterLevel?.key).toBe('apprentice');
      });

      it('Master to Guru is a level change', () => {
        const beforeLevel = getSrsLevelInfo(7);
        const afterStage = calculateSrsStageAfterIncorrect(7);
        const afterLevel = getSrsLevelInfo(afterStage);
        expect(beforeLevel?.key).toBe('master');
        expect(afterLevel?.key).toBe('guru');
      });

      it('Enlightened to Guru is a level change', () => {
        const beforeLevel = getSrsLevelInfo(8);
        const afterStage = calculateSrsStageAfterIncorrect(8);
        const afterLevel = getSrsLevelInfo(afterStage);
        expect(beforeLevel?.key).toBe('enlightened');
        expect(afterLevel?.key).toBe('guru');
      });

      it('Apprentice 4 to Apprentice 1 is NOT a level change', () => {
        const beforeLevel = getSrsLevelInfo(4);
        const afterStage = calculateSrsStageAfterIncorrect(4);
        const afterLevel = getSrsLevelInfo(afterStage);
        expect(beforeLevel?.key).toBe('apprentice');
        expect(afterLevel?.key).toBe('apprentice');
      });
    });

    describe('Invalid stages', () => {
      it('returns 0 for stage 0', () => {
        expect(calculateSrsStageAfterIncorrect(0)).toBe(0);
      });

      it('returns negative values unchanged', () => {
        expect(calculateSrsStageAfterIncorrect(-1)).toBe(-1);
      });

      it('returns values above 9 unchanged', () => {
        expect(calculateSrsStageAfterIncorrect(10)).toBe(10);
      });
    });
  });
});
