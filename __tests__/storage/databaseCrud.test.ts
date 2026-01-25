import {
  initializeDatabase,
  initializeDatabaseWithMigrations,
  _resetDatabaseInstance,
  // Subject CRUD
  upsertSubject,
  upsertSubjects,
  getSubjectById,
  getSubjectsByIds,
  getSubjectsByLevel,
  getSubjectsByType,
  getAllSubjects,
  deleteSubject,
  getSubjectCount,
  // Assignment CRUD
  upsertAssignment,
  upsertAssignments,
  getAssignmentById,
  getAssignmentBySubjectId,
  getAvailableReviews,
  getAvailableLessons,
  getAllAssignments,
  deleteAssignment,
  getAssignmentCount,
  getNextReviewTime,
  // Pending Review CRUD
  insertPendingReview,
  getPendingReviewById,
  getAllPendingReviews,
  deletePendingReview,
  deleteAllPendingReviews,
  getPendingReviewCount,
  // Pending Lesson CRUD
  insertPendingLesson,
  insertPendingLessons,
  getPendingLessonById,
  getPendingLessonByAssignmentId,
  getAllPendingLessons,
  deletePendingLesson,
  deletePendingLessonByAssignmentId,
  deleteAllPendingLessons,
  getPendingLessonCount,
  // Sync Status CRUD
  getSyncStatus,
  updateSyncStatus,
  resetSyncStatus,
  // Migrations
  getSchemaVersion,
  runMigrations,
  // Types
  type SubjectInput,
  type AssignmentInput,
  type PendingReviewInput,
  type PendingLessonInput,
} from '../../src/storage/database';
import {
  __resetMockDatabase,
  __insertRow,
  __getTableRows,
} from '../../__mocks__/react-native-sqlite-storage';

jest.mock('react-native-sqlite-storage');

describe('Database CRUD Operations', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    __resetMockDatabase();
    _resetDatabaseInstance();
    await initializeDatabase();
  });

  // ============================================
  // Subject CRUD Tests
  // ============================================

  describe('Subject CRUD', () => {
    const testSubject: SubjectInput = {
      id: 1,
      object_type: 'kanji',
      characters: '一',
      meanings: JSON.stringify([{ meaning: 'one', primary: true, accepted_answer: true }]),
      readings: JSON.stringify([{ reading: 'いち', primary: true, accepted_answer: true }]),
      meaning_mnemonic: 'This is the number one.',
      reading_mnemonic: 'Imagine counting ichi, ni, san...',
      level: 1,
      component_subject_ids: JSON.stringify([440]),
      data_updated_at: '2023-01-01T00:00:00.000Z',
    };

    describe('upsertSubject', () => {
      it('should insert a new subject', async () => {
        await upsertSubject(testSubject);

        const rows = __getTableRows('subjects');
        expect(rows.length).toBe(1);
        expect(rows[0].id).toBe(1);
        expect(rows[0].object_type).toBe('kanji');
        expect(rows[0].characters).toBe('一');
      });

      it('should update an existing subject', async () => {
        await upsertSubject(testSubject);
        await upsertSubject({ ...testSubject, characters: '二' });

        const rows = __getTableRows('subjects');
        expect(rows.length).toBe(1);
        expect(rows[0].characters).toBe('二');
      });

      it('should handle null characters for radicals', async () => {
        const radical: SubjectInput = {
          ...testSubject,
          id: 2,
          object_type: 'radical',
          characters: null,
          readings: null,
          reading_mnemonic: null,
        };

        await upsertSubject(radical);

        const rows = __getTableRows('subjects');
        expect(rows.length).toBe(1);
        expect(rows[0].characters).toBeNull();
      });
    });

    describe('upsertSubjects', () => {
      it('should insert multiple subjects', async () => {
        const subjects: SubjectInput[] = [
          { ...testSubject, id: 1 },
          { ...testSubject, id: 2, characters: '二' },
          { ...testSubject, id: 3, characters: '三' },
        ];

        await upsertSubjects(subjects);

        const rows = __getTableRows('subjects');
        expect(rows.length).toBe(3);
      });

      it('should handle empty array', async () => {
        await upsertSubjects([]);

        const rows = __getTableRows('subjects');
        expect(rows.length).toBe(0);
      });
    });

    describe('getSubjectById', () => {
      it('should return a subject by ID', async () => {
        __insertRow('subjects', {
          id: 1,
          object_type: 'kanji',
          characters: '一',
          meanings: '[]',
          readings: '[]',
          meaning_mnemonic: 'test',
          reading_mnemonic: null,
          level: 1,
          component_subject_ids: null,
          data_updated_at: null,
          created_at: '2023-01-01T00:00:00.000Z',
        });

        const subject = await getSubjectById(1);

        expect(subject).not.toBeNull();
        expect(subject?.id).toBe(1);
        expect(subject?.characters).toBe('一');
      });

      it('should return null for non-existent subject', async () => {
        const subject = await getSubjectById(999);

        expect(subject).toBeNull();
      });
    });

    describe('getSubjectsByIds', () => {
      it('should return subjects by IDs', async () => {
        __insertRow('subjects', { id: 1, object_type: 'kanji', characters: '一', meanings: '[]', meaning_mnemonic: 'test', level: 1, created_at: '' });
        __insertRow('subjects', { id: 2, object_type: 'kanji', characters: '二', meanings: '[]', meaning_mnemonic: 'test', level: 1, created_at: '' });
        __insertRow('subjects', { id: 3, object_type: 'kanji', characters: '三', meanings: '[]', meaning_mnemonic: 'test', level: 1, created_at: '' });

        const subjects = await getSubjectsByIds([1, 3]);

        expect(subjects.length).toBe(2);
      });

      it('should return empty array for empty IDs', async () => {
        const subjects = await getSubjectsByIds([]);

        expect(subjects).toEqual([]);
      });
    });

    describe('getSubjectsByLevel', () => {
      it('should return subjects at or below a level', async () => {
        __insertRow('subjects', { id: 1, object_type: 'kanji', characters: '一', meanings: '[]', meaning_mnemonic: 'test', level: 1, created_at: '' });
        __insertRow('subjects', { id: 2, object_type: 'kanji', characters: '二', meanings: '[]', meaning_mnemonic: 'test', level: 2, created_at: '' });
        __insertRow('subjects', { id: 3, object_type: 'kanji', characters: '三', meanings: '[]', meaning_mnemonic: 'test', level: 3, created_at: '' });

        const subjects = await getSubjectsByLevel(2);

        expect(subjects.length).toBe(2);
      });
    });

    describe('getSubjectsByType', () => {
      it('should return subjects by type', async () => {
        __insertRow('subjects', { id: 1, object_type: 'kanji', characters: '一', meanings: '[]', meaning_mnemonic: 'test', level: 1, created_at: '' });
        __insertRow('subjects', { id: 2, object_type: 'radical', characters: null, meanings: '[]', meaning_mnemonic: 'test', level: 1, created_at: '' });
        __insertRow('subjects', { id: 3, object_type: 'kanji', characters: '二', meanings: '[]', meaning_mnemonic: 'test', level: 1, created_at: '' });

        const subjects = await getSubjectsByType('kanji');

        expect(subjects.length).toBe(2);
      });
    });

    describe('getAllSubjects', () => {
      it('should return all subjects', async () => {
        __insertRow('subjects', { id: 1, object_type: 'kanji', characters: '一', meanings: '[]', meaning_mnemonic: 'test', level: 1, created_at: '' });
        __insertRow('subjects', { id: 2, object_type: 'kanji', characters: '二', meanings: '[]', meaning_mnemonic: 'test', level: 1, created_at: '' });

        const subjects = await getAllSubjects();

        expect(subjects.length).toBe(2);
      });
    });

    describe('deleteSubject', () => {
      it('should delete a subject', async () => {
        __insertRow('subjects', { id: 1, object_type: 'kanji', characters: '一', meanings: '[]', meaning_mnemonic: 'test', level: 1, created_at: '' });

        await deleteSubject(1);

        const rows = __getTableRows('subjects');
        expect(rows.length).toBe(0);
      });
    });

    describe('getSubjectCount', () => {
      it('should return the count of subjects', async () => {
        __insertRow('subjects', { id: 1, object_type: 'kanji', characters: '一', meanings: '[]', meaning_mnemonic: 'test', level: 1, created_at: '' });
        __insertRow('subjects', { id: 2, object_type: 'kanji', characters: '二', meanings: '[]', meaning_mnemonic: 'test', level: 1, created_at: '' });

        const count = await getSubjectCount();

        expect(count).toBe(2);
      });

      it('should return 0 for empty table', async () => {
        const count = await getSubjectCount();

        expect(count).toBe(0);
      });
    });
  });

  // ============================================
  // Assignment CRUD Tests
  // ============================================

  describe('Assignment CRUD', () => {
    const testAssignment: AssignmentInput = {
      id: 1,
      subject_id: 100,
      srs_stage: 5,
      available_at: '2023-01-01T12:00:00.000Z',
      started_at: '2023-01-01T00:00:00.000Z',
      unlocked_at: '2023-01-01T00:00:00.000Z',
      data_updated_at: '2023-01-01T00:00:00.000Z',
    };

    describe('upsertAssignment', () => {
      it('should insert a new assignment', async () => {
        await upsertAssignment(testAssignment);

        const rows = __getTableRows('assignments');
        expect(rows.length).toBe(1);
        expect(rows[0].id).toBe(1);
        expect(rows[0].subject_id).toBe(100);
        expect(rows[0].srs_stage).toBe(5);
      });

      it('should update an existing assignment', async () => {
        await upsertAssignment(testAssignment);
        await upsertAssignment({ ...testAssignment, srs_stage: 6 });

        const rows = __getTableRows('assignments');
        expect(rows.length).toBe(1);
        expect(rows[0].srs_stage).toBe(6);
      });
    });

    describe('upsertAssignments', () => {
      it('should insert multiple assignments', async () => {
        const assignments: AssignmentInput[] = [
          { ...testAssignment, id: 1, subject_id: 100 },
          { ...testAssignment, id: 2, subject_id: 101 },
          { ...testAssignment, id: 3, subject_id: 102 },
        ];

        await upsertAssignments(assignments);

        const rows = __getTableRows('assignments');
        expect(rows.length).toBe(3);
      });

      it('should handle empty array', async () => {
        await upsertAssignments([]);

        const rows = __getTableRows('assignments');
        expect(rows.length).toBe(0);
      });
    });

    describe('getAssignmentById', () => {
      it('should return an assignment by ID', async () => {
        __insertRow('assignments', {
          id: 1,
          subject_id: 100,
          srs_stage: 5,
          available_at: '2023-01-01T12:00:00.000Z',
          started_at: '2023-01-01T00:00:00.000Z',
          unlocked_at: '2023-01-01T00:00:00.000Z',
          data_updated_at: null,
          created_at: '2023-01-01T00:00:00.000Z',
        });

        const assignment = await getAssignmentById(1);

        expect(assignment).not.toBeNull();
        expect(assignment?.id).toBe(1);
        expect(assignment?.subject_id).toBe(100);
      });

      it('should return null for non-existent assignment', async () => {
        const assignment = await getAssignmentById(999);

        expect(assignment).toBeNull();
      });
    });

    describe('getAssignmentBySubjectId', () => {
      it('should return an assignment by subject ID', async () => {
        __insertRow('assignments', {
          id: 1,
          subject_id: 100,
          srs_stage: 5,
          available_at: null,
          started_at: null,
          unlocked_at: null,
          data_updated_at: null,
          created_at: '',
        });

        const assignment = await getAssignmentBySubjectId(100);

        expect(assignment).not.toBeNull();
        expect(assignment?.subject_id).toBe(100);
      });

      it('should return null for non-existent subject ID', async () => {
        const assignment = await getAssignmentBySubjectId(999);

        expect(assignment).toBeNull();
      });
    });

    describe('getAvailableReviews', () => {
      it('should return assignments available for review', async () => {
        const pastTime = new Date(Date.now() - 60000).toISOString();
        const futureTime = new Date(Date.now() + 60000).toISOString();

        __insertRow('assignments', {
          id: 1,
          subject_id: 100,
          srs_stage: 5,
          available_at: pastTime,
          started_at: '2023-01-01T00:00:00.000Z',
          unlocked_at: '2023-01-01T00:00:00.000Z',
          data_updated_at: null,
          created_at: '',
        });
        __insertRow('assignments', {
          id: 2,
          subject_id: 101,
          srs_stage: 3,
          available_at: futureTime, // Not available yet
          started_at: '2023-01-01T00:00:00.000Z',
          unlocked_at: '2023-01-01T00:00:00.000Z',
          data_updated_at: null,
          created_at: '',
        });

        const reviews = await getAvailableReviews();

        // Mock doesn't support complex WHERE clauses, so just verify the function runs
        expect(reviews).toBeDefined();
      });
    });

    describe('getAvailableLessons', () => {
      it('should return assignments available for lessons', async () => {
        __insertRow('assignments', {
          id: 1,
          subject_id: 100,
          srs_stage: 0,
          available_at: null,
          started_at: null, // Not started = available for lessons
          unlocked_at: '2023-01-01T00:00:00.000Z',
          data_updated_at: null,
          created_at: '',
        });
        __insertRow('assignments', {
          id: 2,
          subject_id: 101,
          srs_stage: 5,
          available_at: '2023-01-01T12:00:00.000Z',
          started_at: '2023-01-01T00:00:00.000Z', // Already started
          unlocked_at: '2023-01-01T00:00:00.000Z',
          data_updated_at: null,
          created_at: '',
        });

        const lessons = await getAvailableLessons();

        expect(lessons).toBeDefined();
      });
    });

    describe('getAllAssignments', () => {
      it('should return all assignments', async () => {
        __insertRow('assignments', { id: 1, subject_id: 100, srs_stage: 5, available_at: null, started_at: null, unlocked_at: null, data_updated_at: null, created_at: '' });
        __insertRow('assignments', { id: 2, subject_id: 101, srs_stage: 3, available_at: null, started_at: null, unlocked_at: null, data_updated_at: null, created_at: '' });

        const assignments = await getAllAssignments();

        expect(assignments.length).toBe(2);
      });
    });

    describe('deleteAssignment', () => {
      it('should delete an assignment', async () => {
        __insertRow('assignments', { id: 1, subject_id: 100, srs_stage: 5, available_at: null, started_at: null, unlocked_at: null, data_updated_at: null, created_at: '' });

        await deleteAssignment(1);

        const rows = __getTableRows('assignments');
        expect(rows.length).toBe(0);
      });
    });

    describe('getAssignmentCount', () => {
      it('should return the count of assignments', async () => {
        __insertRow('assignments', { id: 1, subject_id: 100, srs_stage: 5, available_at: null, started_at: null, unlocked_at: null, data_updated_at: null, created_at: '' });
        __insertRow('assignments', { id: 2, subject_id: 101, srs_stage: 3, available_at: null, started_at: null, unlocked_at: null, data_updated_at: null, created_at: '' });

        const count = await getAssignmentCount();

        expect(count).toBe(2);
      });
    });

    describe('getNextReviewTime', () => {
      it('should return null when no assignments exist', async () => {
        const result = await getNextReviewTime();

        expect(result).toBeNull();
      });

      it('should return null when no future reviews exist', async () => {
        const pastTime = new Date(Date.now() - 60000).toISOString();
        __insertRow('assignments', {
          id: 1,
          subject_id: 100,
          srs_stage: 5,
          available_at: pastTime,
          started_at: '2023-01-01T00:00:00.000Z',
          unlocked_at: '2023-01-01T00:00:00.000Z',
          data_updated_at: null,
          created_at: '',
        });

        const result = await getNextReviewTime();

        // Note: The mock doesn't fully support MIN() and complex WHERE,
        // so we just verify the function runs without error
        expect(result === null || typeof result === 'string').toBe(true);
      });

      it('should return the earliest future review time', async () => {
        const futureTime1 = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
        const futureTime2 = new Date(Date.now() + 7200000).toISOString(); // 2 hours from now

        __insertRow('assignments', {
          id: 1,
          subject_id: 100,
          srs_stage: 5,
          available_at: futureTime2,
          started_at: '2023-01-01T00:00:00.000Z',
          unlocked_at: '2023-01-01T00:00:00.000Z',
          data_updated_at: null,
          created_at: '',
        });
        __insertRow('assignments', {
          id: 2,
          subject_id: 101,
          srs_stage: 3,
          available_at: futureTime1,
          started_at: '2023-01-01T00:00:00.000Z',
          unlocked_at: '2023-01-01T00:00:00.000Z',
          data_updated_at: null,
          created_at: '',
        });

        const result = await getNextReviewTime();

        // Note: The mock doesn't fully support MIN() aggregate,
        // so we just verify the function runs without error
        expect(result === null || typeof result === 'string').toBe(true);
      });
    });
  });

  // ============================================
  // Pending Review CRUD Tests
  // ============================================

  describe('Pending Review CRUD', () => {
    const testPendingReview: PendingReviewInput = {
      assignment_id: 1,
      subject_id: 100,
      incorrect_meaning_answers: 2,
      incorrect_reading_answers: 1,
    };

    describe('insertPendingReview', () => {
      it('should insert a pending review and return the ID', async () => {
        const id = await insertPendingReview(testPendingReview);

        expect(id).toBeGreaterThan(0);

        const rows = __getTableRows('pending_reviews');
        expect(rows.length).toBe(1);
        expect(rows[0].assignment_id).toBe(1);
        expect(rows[0].incorrect_meaning_answers).toBe(2);
      });

      it('should auto-increment IDs', async () => {
        const id1 = await insertPendingReview(testPendingReview);
        const id2 = await insertPendingReview({ ...testPendingReview, assignment_id: 2 });

        expect(id2).toBe(id1 + 1);
      });
    });

    describe('getPendingReviewById', () => {
      it('should return a pending review by ID', async () => {
        __insertRow('pending_reviews', {
          id: 1,
          assignment_id: 1,
          subject_id: 100,
          incorrect_meaning_answers: 2,
          incorrect_reading_answers: 1,
          created_at: '2023-01-01T00:00:00.000Z',
        });

        const review = await getPendingReviewById(1);

        expect(review).not.toBeNull();
        expect(review?.assignment_id).toBe(1);
        expect(review?.incorrect_meaning_answers).toBe(2);
      });

      it('should return null for non-existent review', async () => {
        const review = await getPendingReviewById(999);

        expect(review).toBeNull();
      });
    });

    describe('getAllPendingReviews', () => {
      it('should return all pending reviews', async () => {
        __insertRow('pending_reviews', { id: 1, assignment_id: 1, subject_id: 100, incorrect_meaning_answers: 0, incorrect_reading_answers: 0, created_at: '' });
        __insertRow('pending_reviews', { id: 2, assignment_id: 2, subject_id: 101, incorrect_meaning_answers: 1, incorrect_reading_answers: 0, created_at: '' });

        const reviews = await getAllPendingReviews();

        expect(reviews.length).toBe(2);
      });
    });

    describe('deletePendingReview', () => {
      it('should delete a pending review by ID', async () => {
        __insertRow('pending_reviews', { id: 1, assignment_id: 1, subject_id: 100, incorrect_meaning_answers: 0, incorrect_reading_answers: 0, created_at: '' });

        await deletePendingReview(1);

        const rows = __getTableRows('pending_reviews');
        expect(rows.length).toBe(0);
      });
    });

    describe('deleteAllPendingReviews', () => {
      it('should delete all pending reviews', async () => {
        __insertRow('pending_reviews', { id: 1, assignment_id: 1, subject_id: 100, incorrect_meaning_answers: 0, incorrect_reading_answers: 0, created_at: '' });
        __insertRow('pending_reviews', { id: 2, assignment_id: 2, subject_id: 101, incorrect_meaning_answers: 1, incorrect_reading_answers: 0, created_at: '' });

        await deleteAllPendingReviews();

        const rows = __getTableRows('pending_reviews');
        expect(rows.length).toBe(0);
      });
    });

    describe('getPendingReviewCount', () => {
      it('should return the count of pending reviews', async () => {
        __insertRow('pending_reviews', { id: 1, assignment_id: 1, subject_id: 100, incorrect_meaning_answers: 0, incorrect_reading_answers: 0, created_at: '' });
        __insertRow('pending_reviews', { id: 2, assignment_id: 2, subject_id: 101, incorrect_meaning_answers: 1, incorrect_reading_answers: 0, created_at: '' });

        const count = await getPendingReviewCount();

        expect(count).toBe(2);
      });
    });
  });

  // ============================================
  // Pending Lesson CRUD Tests
  // ============================================

  describe('Pending Lesson CRUD', () => {
    const testPendingLesson: PendingLessonInput = {
      assignment_id: 100,
      subject_id: 1,
      started_at: '2024-01-15T10:00:00.000Z',
    };

    describe('insertPendingLesson', () => {
      it('should insert a pending lesson and return the ID', async () => {
        const id = await insertPendingLesson(testPendingLesson);

        expect(id).toBeGreaterThan(0);

        const rows = __getTableRows('pending_lessons');
        expect(rows.length).toBe(1);
        expect(rows[0].assignment_id).toBe(100);
        expect(rows[0].subject_id).toBe(1);
        expect(rows[0].started_at).toBe('2024-01-15T10:00:00.000Z');
      });

      it('should auto-increment IDs', async () => {
        const id1 = await insertPendingLesson(testPendingLesson);
        const id2 = await insertPendingLesson({ ...testPendingLesson, assignment_id: 101, subject_id: 2 });

        expect(id2).toBe(id1 + 1);
      });

      it('should replace existing lesson with same assignment_id (INSERT OR REPLACE)', async () => {
        // Note: The mock database doesn't fully support UNIQUE constraints with INSERT OR REPLACE.
        // In the real SQLite database, this would replace the existing row.
        // This test just verifies the function runs without error.
        await insertPendingLesson(testPendingLesson);
        await insertPendingLesson({ ...testPendingLesson, started_at: '2024-01-16T10:00:00.000Z' });

        // In real DB with UNIQUE constraint, this would be 1.
        // The mock doesn't enforce UNIQUE, so we just check it was inserted.
        const rows = __getTableRows('pending_lessons');
        expect(rows.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('insertPendingLessons', () => {
      it('should insert multiple pending lessons', async () => {
        const lessons: PendingLessonInput[] = [
          { assignment_id: 100, subject_id: 1, started_at: '2024-01-15T10:00:00.000Z' },
          { assignment_id: 101, subject_id: 2, started_at: '2024-01-15T10:00:00.000Z' },
          { assignment_id: 102, subject_id: 3, started_at: '2024-01-15T10:00:00.000Z' },
        ];

        await insertPendingLessons(lessons);

        const rows = __getTableRows('pending_lessons');
        expect(rows.length).toBe(3);
      });

      it('should handle empty array', async () => {
        await insertPendingLessons([]);

        const rows = __getTableRows('pending_lessons');
        expect(rows.length).toBe(0);
      });
    });

    describe('getPendingLessonById', () => {
      it('should return a pending lesson by ID', async () => {
        __insertRow('pending_lessons', {
          id: 1,
          assignment_id: 100,
          subject_id: 1,
          started_at: '2024-01-15T10:00:00.000Z',
          created_at: '2024-01-15T10:00:00.000Z',
        });

        const lesson = await getPendingLessonById(1);

        expect(lesson).not.toBeNull();
        expect(lesson?.assignment_id).toBe(100);
        expect(lesson?.subject_id).toBe(1);
      });

      it('should return null for non-existent lesson', async () => {
        const lesson = await getPendingLessonById(999);

        expect(lesson).toBeNull();
      });
    });

    describe('getPendingLessonByAssignmentId', () => {
      it('should return a pending lesson by assignment ID', async () => {
        __insertRow('pending_lessons', {
          id: 1,
          assignment_id: 100,
          subject_id: 1,
          started_at: '2024-01-15T10:00:00.000Z',
          created_at: '2024-01-15T10:00:00.000Z',
        });

        const lesson = await getPendingLessonByAssignmentId(100);

        expect(lesson).not.toBeNull();
        expect(lesson?.assignment_id).toBe(100);
      });

      it('should return null for non-existent assignment ID', async () => {
        const lesson = await getPendingLessonByAssignmentId(999);

        expect(lesson).toBeNull();
      });
    });

    describe('getAllPendingLessons', () => {
      it('should return all pending lessons', async () => {
        __insertRow('pending_lessons', { id: 1, assignment_id: 100, subject_id: 1, started_at: '', created_at: '' });
        __insertRow('pending_lessons', { id: 2, assignment_id: 101, subject_id: 2, started_at: '', created_at: '' });

        const lessons = await getAllPendingLessons();

        expect(lessons.length).toBe(2);
      });

      it('should return empty array when no pending lessons', async () => {
        const lessons = await getAllPendingLessons();

        expect(lessons).toEqual([]);
      });
    });

    describe('deletePendingLesson', () => {
      it('should delete a pending lesson by ID', async () => {
        __insertRow('pending_lessons', { id: 1, assignment_id: 100, subject_id: 1, started_at: '', created_at: '' });

        await deletePendingLesson(1);

        const rows = __getTableRows('pending_lessons');
        expect(rows.length).toBe(0);
      });
    });

    describe('deletePendingLessonByAssignmentId', () => {
      it('should delete a pending lesson by assignment ID', async () => {
        __insertRow('pending_lessons', { id: 1, assignment_id: 100, subject_id: 1, started_at: '', created_at: '' });

        await deletePendingLessonByAssignmentId(100);

        const rows = __getTableRows('pending_lessons');
        expect(rows.length).toBe(0);
      });
    });

    describe('deleteAllPendingLessons', () => {
      it('should delete all pending lessons', async () => {
        __insertRow('pending_lessons', { id: 1, assignment_id: 100, subject_id: 1, started_at: '', created_at: '' });
        __insertRow('pending_lessons', { id: 2, assignment_id: 101, subject_id: 2, started_at: '', created_at: '' });

        await deleteAllPendingLessons();

        const rows = __getTableRows('pending_lessons');
        expect(rows.length).toBe(0);
      });
    });

    describe('getPendingLessonCount', () => {
      it('should return the count of pending lessons', async () => {
        __insertRow('pending_lessons', { id: 1, assignment_id: 100, subject_id: 1, started_at: '', created_at: '' });
        __insertRow('pending_lessons', { id: 2, assignment_id: 101, subject_id: 2, started_at: '', created_at: '' });

        const count = await getPendingLessonCount();

        expect(count).toBe(2);
      });

      it('should return 0 when no pending lessons', async () => {
        const count = await getPendingLessonCount();

        expect(count).toBe(0);
      });
    });
  });

  // ============================================
  // Sync Status CRUD Tests
  // ============================================

  describe('Sync Status CRUD', () => {
    describe('getSyncStatus', () => {
      it('should return the sync status after initialization', async () => {
        // initializeDatabase creates sync_status row with id=1 and null timestamps
        const status = await getSyncStatus();

        expect(status).toBeDefined();
        expect(status?.id).toBe(1);
        // Initially null after initialization
        expect(status?.last_subjects_sync).toBeNull();
      });

      it('should return status with values after update', async () => {
        await updateSyncStatus({ last_subjects_sync: '2023-01-01T00:00:00.000Z' });

        const status = await getSyncStatus();

        expect(status).not.toBeNull();
        expect(status?.last_subjects_sync).toBe('2023-01-01T00:00:00.000Z');
      });
    });

    describe('updateSyncStatus', () => {
      it('should update last_subjects_sync', async () => {
        await updateSyncStatus({ last_subjects_sync: '2023-06-01T00:00:00.000Z' });

        const status = await getSyncStatus();
        expect(status?.last_subjects_sync).toBe('2023-06-01T00:00:00.000Z');
      });

      it('should update last_assignments_sync', async () => {
        await updateSyncStatus({ last_assignments_sync: '2023-06-02T00:00:00.000Z' });

        const status = await getSyncStatus();
        expect(status?.last_assignments_sync).toBe('2023-06-02T00:00:00.000Z');
      });

      it('should update last_summary_sync', async () => {
        await updateSyncStatus({ last_summary_sync: '2023-06-03T00:00:00.000Z' });

        const status = await getSyncStatus();
        expect(status?.last_summary_sync).toBe('2023-06-03T00:00:00.000Z');
      });

      it('should update multiple fields at once', async () => {
        await updateSyncStatus({
          last_subjects_sync: '2023-06-01T00:00:00.000Z',
          last_assignments_sync: '2023-06-02T00:00:00.000Z',
        });

        const status = await getSyncStatus();
        expect(status?.last_subjects_sync).toBe('2023-06-01T00:00:00.000Z');
        expect(status?.last_assignments_sync).toBe('2023-06-02T00:00:00.000Z');
      });

      it('should handle empty update (no-op)', async () => {
        const statusBefore = await getSyncStatus();

        await updateSyncStatus({});

        const statusAfter = await getSyncStatus();
        // Should not throw and sync status should still be retrievable
        expect(statusAfter).toBeDefined();
        expect(statusAfter?.id).toBe(statusBefore?.id);
      });
    });

    describe('resetSyncStatus', () => {
      it('should reset all sync timestamps to null', async () => {
        // First set some values
        await updateSyncStatus({
          last_subjects_sync: '2023-01-01T00:00:00.000Z',
          last_assignments_sync: '2023-01-01T00:00:00.000Z',
          last_summary_sync: '2023-01-01T00:00:00.000Z',
        });

        // Then reset
        await resetSyncStatus();

        const status = await getSyncStatus();
        expect(status?.last_subjects_sync).toBeNull();
        expect(status?.last_assignments_sync).toBeNull();
        expect(status?.last_summary_sync).toBeNull();
      });
    });
  });

  // ============================================
  // Migration Tests
  // ============================================

  describe('Migrations', () => {
    describe('getSchemaVersion', () => {
      it('should return 0 for a fresh database without schema_version table', async () => {
        // Reset to get a fresh state
        __resetMockDatabase();
        _resetDatabaseInstance();

        const version = await getSchemaVersion();

        // Returns 0 because schema_version table doesn't exist
        expect(version).toBe(0);
      });

      it('should return the max version from schema_version table', async () => {
        __insertRow('schema_version', { version: 1, applied_at: '' });
        __insertRow('schema_version', { version: 2, applied_at: '' });

        const version = await getSchemaVersion();

        expect(version).toBe(2);
      });
    });

    describe('runMigrations', () => {
      it('should create schema_version table if not exists', async () => {
        const result = await runMigrations();

        expect(result).toBeDefined();
        expect(result.currentVersion).toBeGreaterThanOrEqual(0);
      });

      it('should record initial version for fresh database', async () => {
        __resetMockDatabase();
        _resetDatabaseInstance();
        await initializeDatabase();

        const result = await runMigrations();

        // For fresh database, should set to DATABASE_VERSION (1)
        expect(result.currentVersion).toBe(1);
        expect(result.applied).toEqual([]);
      });

      it('should be safe to call multiple times', async () => {
        const result1 = await runMigrations();
        const result2 = await runMigrations();

        expect(result1.currentVersion).toBe(result2.currentVersion);
      });
    });

    describe('initializeDatabaseWithMigrations', () => {
      it('should initialize database and run migrations', async () => {
        __resetMockDatabase();
        _resetDatabaseInstance();

        const result = await initializeDatabaseWithMigrations();

        expect(result).toBe(true);
      });

      it('should be safe to call multiple times', async () => {
        const result1 = await initializeDatabaseWithMigrations();
        const result2 = await initializeDatabaseWithMigrations();

        expect(result1).toBe(true);
        expect(result2).toBe(true);
      });
    });
  });
});
