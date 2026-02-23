import {
  SRS_INTERVALS,
  computeOptimisticAssignment,
  calculateSrsStageAfterIncorrect,
} from '../../src/utils/srs';

describe('SRS utility module', () => {
  describe('SRS_INTERVALS', () => {
    it('maps stages 1-9 to correct interval durations in milliseconds', () => {
      expect(SRS_INTERVALS[1]).toBe(4 * 60 * 60 * 1000); // 4h
      expect(SRS_INTERVALS[2]).toBe(8 * 60 * 60 * 1000); // 8h
      expect(SRS_INTERVALS[3]).toBe(24 * 60 * 60 * 1000); // 1d
      expect(SRS_INTERVALS[4]).toBe(2 * 24 * 60 * 60 * 1000); // 2d
      expect(SRS_INTERVALS[5]).toBe(7 * 24 * 60 * 60 * 1000); // 1w
      expect(SRS_INTERVALS[6]).toBe(14 * 24 * 60 * 60 * 1000); // 2w
      expect(SRS_INTERVALS[7]).toBe(30 * 24 * 60 * 60 * 1000); // 1mo
      expect(SRS_INTERVALS[8]).toBe(120 * 24 * 60 * 60 * 1000); // 4mo
    });

    it('maps stage 9 (burned) to null', () => {
      expect(SRS_INTERVALS[9]).toBeNull();
    });
  });

  describe('calculateSrsStageAfterIncorrect', () => {
    it('drops Apprentice stages (1-4) to stage 1', () => {
      expect(calculateSrsStageAfterIncorrect(1)).toBe(1);
      expect(calculateSrsStageAfterIncorrect(2)).toBe(1);
      expect(calculateSrsStageAfterIncorrect(3)).toBe(1);
      expect(calculateSrsStageAfterIncorrect(4)).toBe(1);
    });

    it('drops Guru stages (5-6) to stage 4', () => {
      expect(calculateSrsStageAfterIncorrect(5)).toBe(4);
      expect(calculateSrsStageAfterIncorrect(6)).toBe(4);
    });

    it('drops Master (7) and Enlightened (8) to stage 5', () => {
      expect(calculateSrsStageAfterIncorrect(7)).toBe(5);
      expect(calculateSrsStageAfterIncorrect(8)).toBe(5);
    });

    it('keeps Burned (9) unchanged', () => {
      expect(calculateSrsStageAfterIncorrect(9)).toBe(9);
    });

    it('returns out-of-range values unchanged', () => {
      expect(calculateSrsStageAfterIncorrect(0)).toBe(0);
      expect(calculateSrsStageAfterIncorrect(-1)).toBe(-1);
      expect(calculateSrsStageAfterIncorrect(10)).toBe(10);
    });
  });

  describe('computeOptimisticAssignment', () => {
    describe('all correct answers', () => {
      it('increments stage by 1 and sets availableAt to now + interval', () => {
        const before = Date.now();
        const result = computeOptimisticAssignment(3, 0, 0);
        const after = Date.now();

        expect(result.newStage).toBe(4);
        // stage 4 interval = 2 days
        const twodays = 2 * 24 * 60 * 60 * 1000;
        expect(result.availableAt).toBeGreaterThanOrEqual(before + twodays);
        expect(result.availableAt).toBeLessThanOrEqual(after + twodays);
      });

      it('stage 8 (Enlightened) advances to 9 (Burned) with null availableAt', () => {
        const result = computeOptimisticAssignment(8, 0, 0);
        expect(result.newStage).toBe(9);
        expect(result.availableAt).toBeNull();
      });

      it('stage 9 (Burned) stays at 9 with null availableAt', () => {
        const result = computeOptimisticAssignment(9, 0, 0);
        expect(result.newStage).toBe(9);
        expect(result.availableAt).toBeNull();
      });
    });

    describe('incorrect answers', () => {
      it('uses calculateSrsStageAfterIncorrect when meaning answers are wrong', () => {
        const result = computeOptimisticAssignment(5, 1, 0);
        // Guru 1 (5) drops to Apprentice 4 (4)
        expect(result.newStage).toBe(4);
        // stage 4 interval = 2 days
        const twodays = 2 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        expect(result.availableAt).toBeGreaterThanOrEqual(now + twodays - 100);
        expect(result.availableAt).toBeLessThanOrEqual(now + twodays + 100);
      });

      it('uses calculateSrsStageAfterIncorrect when reading answers are wrong', () => {
        const result = computeOptimisticAssignment(5, 0, 2);
        expect(result.newStage).toBe(4);
      });

      it('uses calculateSrsStageAfterIncorrect when both are wrong', () => {
        const result = computeOptimisticAssignment(7, 1, 1);
        // Master (7) drops to Guru 1 (5)
        expect(result.newStage).toBe(5);
        // stage 5 interval = 1 week
        const oneweek = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        expect(result.availableAt).toBeGreaterThanOrEqual(now + oneweek - 100);
        expect(result.availableAt).toBeLessThanOrEqual(now + oneweek + 100);
      });
    });

    describe('boundary stages', () => {
      it('handles stage 0 gracefully', () => {
        const result = computeOptimisticAssignment(0, 0, 0);
        expect(result.newStage).toBe(0);
      });

      it('handles negative stages gracefully', () => {
        const result = computeOptimisticAssignment(-1, 0, 0);
        expect(result.newStage).toBe(-1);
      });
    });
  });
});
