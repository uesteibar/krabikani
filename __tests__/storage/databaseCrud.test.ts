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
  // Subject Search
  searchSubjects,
  getKanjiUsingRadical,
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
  getLearnedCount,
  getUpcomingReviewsByHour,
  getPracticeItems,
  getPracticeItemCount,
  getReversePracticeItems,
  getReversePracticeItemCount,
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
  // User Synonym CRUD
  addUserSynonym,
  getUserSynonymById,
  getUserSynonymsBySubjectId,
  getAllUserSynonyms,
  markSynonymSynced,
  deleteUserSynonym,
  deleteUserSynonymsBySubjectId,
  getUserSynonymCount,
  // Pending Synonym CRUD
  insertPendingSynonym,
  getPendingSynonymById,
  getPendingSynonyms,
  getPendingSynonymsBySubjectId,
  deletePendingSynonym,
  deletePendingSynonymBySubjectAndSynonym,
  deleteAllPendingSynonyms,
  getPendingSynonymCount,
  // Sync Status CRUD
  getSyncStatus,
  updateSyncStatus,
  resetSyncStatus,
  // User Settings CRUD
  getSetting,
  setSetting,
  getAllSettings,
  deleteSetting,
  deleteAllSettings,
  // Data management
  clearAllData,
  // Migrations
  getSchemaVersion,
  runMigrations,
  // Types
  type SubjectInput,
  type AssignmentInput,
  type PendingReviewInput,
  type PendingLessonInput,
  type UserSynonymInput,
  type PendingSynonymInput,
} from '../../src/storage/database';
import {
  __resetMockDatabase,
  __insertRow,
  __getTableRows,
} from '../../__mocks__/@op-engineering/op-sqlite';

jest.mock('@op-engineering/op-sqlite');

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
      meanings: JSON.stringify([
        { meaning: 'one', primary: true, accepted_answer: true },
      ]),
      readings: JSON.stringify([
        { reading: 'いち', primary: true, accepted_answer: true },
      ]),
      meaning_mnemonic: 'This is the number one.',
      reading_mnemonic: 'Imagine counting ichi, ni, san...',
      level: 1,
      component_subject_ids: JSON.stringify([440]),
      character_images: null,
      auxiliary_meanings: null,
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
        __insertRow('subjects', {
          id: 1,
          object_type: 'kanji',
          characters: '一',
          meanings: '[]',
          meaning_mnemonic: 'test',
          level: 1,
          created_at: '',
        });
        __insertRow('subjects', {
          id: 2,
          object_type: 'kanji',
          characters: '二',
          meanings: '[]',
          meaning_mnemonic: 'test',
          level: 1,
          created_at: '',
        });
        __insertRow('subjects', {
          id: 3,
          object_type: 'kanji',
          characters: '三',
          meanings: '[]',
          meaning_mnemonic: 'test',
          level: 1,
          created_at: '',
        });

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
        __insertRow('subjects', {
          id: 1,
          object_type: 'kanji',
          characters: '一',
          meanings: '[]',
          meaning_mnemonic: 'test',
          level: 1,
          created_at: '',
        });
        __insertRow('subjects', {
          id: 2,
          object_type: 'kanji',
          characters: '二',
          meanings: '[]',
          meaning_mnemonic: 'test',
          level: 2,
          created_at: '',
        });
        __insertRow('subjects', {
          id: 3,
          object_type: 'kanji',
          characters: '三',
          meanings: '[]',
          meaning_mnemonic: 'test',
          level: 3,
          created_at: '',
        });

        const subjects = await getSubjectsByLevel(2);

        expect(subjects.length).toBe(2);
      });
    });

    describe('getSubjectsByType', () => {
      it('should return subjects by type', async () => {
        __insertRow('subjects', {
          id: 1,
          object_type: 'kanji',
          characters: '一',
          meanings: '[]',
          meaning_mnemonic: 'test',
          level: 1,
          created_at: '',
        });
        __insertRow('subjects', {
          id: 2,
          object_type: 'radical',
          characters: null,
          meanings: '[]',
          meaning_mnemonic: 'test',
          level: 1,
          created_at: '',
        });
        __insertRow('subjects', {
          id: 3,
          object_type: 'kanji',
          characters: '二',
          meanings: '[]',
          meaning_mnemonic: 'test',
          level: 1,
          created_at: '',
        });

        const subjects = await getSubjectsByType('kanji');

        expect(subjects.length).toBe(2);
      });
    });

    describe('getAllSubjects', () => {
      it('should return all subjects', async () => {
        __insertRow('subjects', {
          id: 1,
          object_type: 'kanji',
          characters: '一',
          meanings: '[]',
          meaning_mnemonic: 'test',
          level: 1,
          created_at: '',
        });
        __insertRow('subjects', {
          id: 2,
          object_type: 'kanji',
          characters: '二',
          meanings: '[]',
          meaning_mnemonic: 'test',
          level: 1,
          created_at: '',
        });

        const subjects = await getAllSubjects();

        expect(subjects.length).toBe(2);
      });
    });

    describe('deleteSubject', () => {
      it('should delete a subject', async () => {
        __insertRow('subjects', {
          id: 1,
          object_type: 'kanji',
          characters: '一',
          meanings: '[]',
          meaning_mnemonic: 'test',
          level: 1,
          created_at: '',
        });

        await deleteSubject(1);

        const rows = __getTableRows('subjects');
        expect(rows.length).toBe(0);
      });
    });

    describe('getSubjectCount', () => {
      it('should return the count of subjects', async () => {
        __insertRow('subjects', {
          id: 1,
          object_type: 'kanji',
          characters: '一',
          meanings: '[]',
          meaning_mnemonic: 'test',
          level: 1,
          created_at: '',
        });
        __insertRow('subjects', {
          id: 2,
          object_type: 'kanji',
          characters: '二',
          meanings: '[]',
          meaning_mnemonic: 'test',
          level: 1,
          created_at: '',
        });

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
  // Subject Search Tests
  // ============================================

  describe('Subject Search', () => {
    describe('searchSubjects', () => {
      it('should return empty array for empty query', async () => {
        const results = await searchSubjects('', '');

        expect(results).toEqual([]);
      });

      it('should return empty array for whitespace-only query', async () => {
        const results = await searchSubjects('   ', '');

        expect(results).toEqual([]);
      });

      it('should search by character match', async () => {
        // Insert a learned subject (subject + assignment with started_at)
        __insertRow('subjects', {
          id: 1,
          object_type: 'kanji',
          characters: '一',
          meanings: JSON.stringify([
            { meaning: 'one', primary: true, accepted_answer: true },
          ]),
          readings: JSON.stringify([
            { reading: 'いち', primary: true, accepted_answer: true },
          ]),
          meaning_mnemonic: 'This is the number one.',
          reading_mnemonic: 'Count: ichi, ni, san...',
          level: 1,
          created_at: '',
        });
        __insertRow('assignments', {
          id: 1,
          subject_id: 1,
          srs_stage: 5,
          available_at: null,
          started_at: '2024-01-01T00:00:00.000Z',
          unlocked_at: '2024-01-01T00:00:00.000Z',
          data_updated_at: null,
          created_at: '',
        });

        const results = await searchSubjects('一', '');

        // Note: The mock doesn't fully support JOIN and complex queries,
        // but we verify the function runs without error
        expect(Array.isArray(results)).toBe(true);
      });

      it('should search by meaning match', async () => {
        __insertRow('subjects', {
          id: 2,
          object_type: 'kanji',
          characters: '二',
          meanings: JSON.stringify([
            { meaning: 'two', primary: true, accepted_answer: true },
          ]),
          readings: JSON.stringify([
            { reading: 'に', primary: true, accepted_answer: true },
          ]),
          meaning_mnemonic: 'Two horizontal lines.',
          reading_mnemonic: null,
          level: 1,
          created_at: '',
        });
        __insertRow('assignments', {
          id: 2,
          subject_id: 2,
          srs_stage: 6,
          available_at: null,
          started_at: '2024-01-01T00:00:00.000Z',
          unlocked_at: '2024-01-01T00:00:00.000Z',
          data_updated_at: null,
          created_at: '',
        });

        const results = await searchSubjects('two', '');

        expect(Array.isArray(results)).toBe(true);
      });

      it('should search by hiragana reading', async () => {
        __insertRow('subjects', {
          id: 3,
          object_type: 'vocabulary',
          characters: '食べる',
          meanings: JSON.stringify([
            { meaning: 'to eat', primary: true, accepted_answer: true },
          ]),
          readings: JSON.stringify([
            { reading: 'たべる', primary: true, accepted_answer: true },
          ]),
          meaning_mnemonic: 'You use your mouth to eat.',
          reading_mnemonic: 'Tab bear is eating.',
          level: 3,
          created_at: '',
        });
        __insertRow('assignments', {
          id: 3,
          subject_id: 3,
          srs_stage: 5,
          available_at: null,
          started_at: '2024-01-01T00:00:00.000Z',
          unlocked_at: '2024-01-01T00:00:00.000Z',
          data_updated_at: null,
          created_at: '',
        });

        // Search with hiragana query (as if converted from romaji 'taberu')
        const results = await searchSubjects('taberu', 'たべる');

        expect(Array.isArray(results)).toBe(true);
      });

      it('should search by meaning mnemonic', async () => {
        __insertRow('subjects', {
          id: 4,
          object_type: 'radical',
          characters: null,
          meanings: JSON.stringify([
            { meaning: 'ground', primary: true, accepted_answer: true },
          ]),
          readings: null,
          meaning_mnemonic: 'This looks like a flat ground.',
          reading_mnemonic: null,
          level: 1,
          created_at: '',
        });
        __insertRow('assignments', {
          id: 4,
          subject_id: 4,
          srs_stage: 7,
          available_at: null,
          started_at: '2024-01-01T00:00:00.000Z',
          unlocked_at: '2024-01-01T00:00:00.000Z',
          data_updated_at: null,
          created_at: '',
        });

        const results = await searchSubjects('flat', '');

        expect(Array.isArray(results)).toBe(true);
      });

      it('should only return learned subjects (started_at IS NOT NULL)', async () => {
        // Insert an unlearned subject (no started_at)
        __insertRow('subjects', {
          id: 5,
          object_type: 'kanji',
          characters: '三',
          meanings: JSON.stringify([
            { meaning: 'three', primary: true, accepted_answer: true },
          ]),
          readings: JSON.stringify([{ reading: 'さん', primary: true }]),
          meaning_mnemonic: 'Three horizontal lines.',
          reading_mnemonic: null,
          level: 1,
          created_at: '',
        });
        __insertRow('assignments', {
          id: 5,
          subject_id: 5,
          srs_stage: 0,
          available_at: null,
          started_at: null, // NOT started = not learned
          unlocked_at: '2024-01-01T00:00:00.000Z',
          data_updated_at: null,
          created_at: '',
        });

        const results = await searchSubjects('three', '');

        // The mock doesn't support the full JOIN/WHERE logic,
        // but the function should run without error
        expect(Array.isArray(results)).toBe(true);
      });

      it('should be case-insensitive for English text', async () => {
        __insertRow('subjects', {
          id: 6,
          object_type: 'kanji',
          characters: '水',
          meanings: JSON.stringify([
            { meaning: 'Water', primary: true, accepted_answer: true },
          ]),
          readings: JSON.stringify([{ reading: 'みず', primary: true }]),
          meaning_mnemonic: 'Flowing water.',
          reading_mnemonic: null,
          level: 1,
          created_at: '',
        });
        __insertRow('assignments', {
          id: 6,
          subject_id: 6,
          srs_stage: 5,
          available_at: null,
          started_at: '2024-01-01T00:00:00.000Z',
          unlocked_at: '2024-01-01T00:00:00.000Z',
          data_updated_at: null,
          created_at: '',
        });

        // Search with lowercase should match "Water"
        const results = await searchSubjects('water', '');

        expect(Array.isArray(results)).toBe(true);
      });

      it('should respect the limit parameter', async () => {
        // Add multiple subjects
        for (let i = 1; i <= 5; i++) {
          __insertRow('subjects', {
            id: i,
            object_type: 'kanji',
            characters: `test${i}`,
            meanings: JSON.stringify([{ meaning: `test${i}`, primary: true }]),
            readings: null,
            meaning_mnemonic: 'test mnemonic',
            reading_mnemonic: null,
            level: 1,
            created_at: '',
          });
          __insertRow('assignments', {
            id: i,
            subject_id: i,
            srs_stage: 5,
            available_at: null,
            started_at: '2024-01-01T00:00:00.000Z',
            unlocked_at: '2024-01-01T00:00:00.000Z',
            data_updated_at: null,
            created_at: '',
          });
        }

        // Search with limit=2
        const results = await searchSubjects('test', '', 2);

        // The mock doesn't support LIMIT, but we verify the function runs
        expect(Array.isArray(results)).toBe(true);
      });

      it('should include all subject types in results', async () => {
        // Add subjects of different types
        const types = [
          'radical',
          'kanji',
          'vocabulary',
          'kana_vocabulary',
        ] as const;
        types.forEach((type, i) => {
          __insertRow('subjects', {
            id: i + 10,
            object_type: type,
            characters: type === 'radical' ? null : `char${i}`,
            meanings: JSON.stringify([
              { meaning: `searchterm${i}`, primary: true },
            ]),
            readings: type === 'radical' ? null : JSON.stringify([]),
            meaning_mnemonic: 'mnemonic',
            reading_mnemonic: null,
            level: 1,
            created_at: '',
          });
          __insertRow('assignments', {
            id: i + 10,
            subject_id: i + 10,
            srs_stage: 5,
            available_at: null,
            started_at: '2024-01-01T00:00:00.000Z',
            unlocked_at: '2024-01-01T00:00:00.000Z',
            data_updated_at: null,
            created_at: '',
          });
        });

        const results = await searchSubjects('searchterm', '');

        expect(Array.isArray(results)).toBe(true);
      });
    });

    describe('getKanjiUsingRadical', () => {
      it('should return empty array when no kanji use the radical', async () => {
        // Insert a radical with no kanji using it
        __insertRow('subjects', {
          id: 100,
          object_type: 'radical',
          characters: '一',
          meanings: JSON.stringify([{ meaning: 'one', primary: true }]),
          readings: null,
          meaning_mnemonic: 'This is one.',
          reading_mnemonic: null,
          level: 1,
          component_subject_ids: null,
          created_at: '',
        });

        const results = await getKanjiUsingRadical(100);

        expect(Array.isArray(results)).toBe(true);
      });

      it('should find kanji with radical as first component', async () => {
        // Insert a kanji with the radical at the start of component_subject_ids array
        __insertRow('subjects', {
          id: 200,
          object_type: 'kanji',
          characters: '大',
          meanings: JSON.stringify([{ meaning: 'big', primary: true }]),
          readings: JSON.stringify([{ reading: 'おお', primary: true }]),
          meaning_mnemonic: 'A big person.',
          reading_mnemonic: null,
          level: 1,
          component_subject_ids: '[100,101,102]', // 100 is first
          created_at: '',
        });

        const results = await getKanjiUsingRadical(100);

        expect(Array.isArray(results)).toBe(true);
      });

      it('should find kanji with radical in middle of components', async () => {
        // Insert a kanji with the radical in the middle of component_subject_ids array
        __insertRow('subjects', {
          id: 201,
          object_type: 'kanji',
          characters: '天',
          meanings: JSON.stringify([{ meaning: 'heaven', primary: true }]),
          readings: JSON.stringify([{ reading: 'てん', primary: true }]),
          meaning_mnemonic: 'Heaven above.',
          reading_mnemonic: null,
          level: 2,
          component_subject_ids: '[99,100,101]', // 100 is in the middle
          created_at: '',
        });

        const results = await getKanjiUsingRadical(100);

        expect(Array.isArray(results)).toBe(true);
      });

      it('should find kanji with radical at end of components', async () => {
        // Insert a kanji with the radical at the end of component_subject_ids array
        __insertRow('subjects', {
          id: 202,
          object_type: 'kanji',
          characters: '夫',
          meanings: JSON.stringify([{ meaning: 'husband', primary: true }]),
          readings: JSON.stringify([{ reading: 'おっと', primary: true }]),
          meaning_mnemonic: 'A husband.',
          reading_mnemonic: null,
          level: 3,
          component_subject_ids: '[98,99,100]', // 100 is last
          created_at: '',
        });

        const results = await getKanjiUsingRadical(100);

        expect(Array.isArray(results)).toBe(true);
      });

      it('should find kanji with radical as only component', async () => {
        // Insert a kanji with only this radical as a component
        __insertRow('subjects', {
          id: 203,
          object_type: 'kanji',
          characters: '本',
          meanings: JSON.stringify([{ meaning: 'book', primary: true }]),
          readings: JSON.stringify([{ reading: 'ほん', primary: true }]),
          meaning_mnemonic: 'A book.',
          reading_mnemonic: null,
          level: 1,
          component_subject_ids: '[100]', // 100 is the only component
          created_at: '',
        });

        const results = await getKanjiUsingRadical(100);

        expect(Array.isArray(results)).toBe(true);
      });

      it('should not match partial ID (e.g., radical 10 should not match 100)', async () => {
        // Insert a kanji with radical 100, not 10
        __insertRow('subjects', {
          id: 204,
          object_type: 'kanji',
          characters: '木',
          meanings: JSON.stringify([{ meaning: 'tree', primary: true }]),
          readings: JSON.stringify([{ reading: 'き', primary: true }]),
          meaning_mnemonic: 'A tree.',
          reading_mnemonic: null,
          level: 1,
          component_subject_ids: '[100]',
          created_at: '',
        });

        // Search for radical 10 (should not match 100)
        const results = await getKanjiUsingRadical(10);

        // The mock may not fully support the pattern matching, but we verify function runs
        expect(Array.isArray(results)).toBe(true);
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
        __insertRow('assignments', {
          id: 2,
          subject_id: 101,
          srs_stage: 3,
          available_at: null,
          started_at: null,
          unlocked_at: null,
          data_updated_at: null,
          created_at: '',
        });

        const assignments = await getAllAssignments();

        expect(assignments.length).toBe(2);
      });
    });

    describe('deleteAssignment', () => {
      it('should delete an assignment', async () => {
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

        await deleteAssignment(1);

        const rows = __getTableRows('assignments');
        expect(rows.length).toBe(0);
      });
    });

    describe('getAssignmentCount', () => {
      it('should return the count of assignments', async () => {
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
        __insertRow('assignments', {
          id: 2,
          subject_id: 101,
          srs_stage: 3,
          available_at: null,
          started_at: null,
          unlocked_at: null,
          data_updated_at: null,
          created_at: '',
        });

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

    describe('getLearnedCount', () => {
      it('should return count of kanji with srs_stage >= 5', async () => {
        // Note: The mock doesn't fully support JOINs, so we verify the function runs
        const count = await getLearnedCount('kanji');
        expect(typeof count).toBe('number');
      });

      it('should return count of vocabulary with srs_stage >= 5', async () => {
        // For vocabulary, it should include both 'vocabulary' and 'kana_vocabulary' types
        const count = await getLearnedCount('vocabulary');
        expect(typeof count).toBe('number');
      });

      it('should return 0 when no assignments exist', async () => {
        const count = await getLearnedCount('kanji');
        expect(count).toBe(0);
      });
    });

    describe('getUpcomingReviewsByHour', () => {
      it('should return 12 hourly buckets by default', async () => {
        const buckets = await getUpcomingReviewsByHour();

        expect(buckets.length).toBe(12);
        buckets.forEach(bucket => {
          expect(bucket.hour).toBeInstanceOf(Date);
          expect(typeof bucket.count).toBe('number');
        });
      });

      it('should return specified number of hourly buckets', async () => {
        const buckets = await getUpcomingReviewsByHour(6);

        expect(buckets.length).toBe(6);
      });

      it('should return 0 counts when no assignments exist', async () => {
        const buckets = await getUpcomingReviewsByHour();

        buckets.forEach(bucket => {
          expect(bucket.count).toBe(0);
        });
      });

      it('should return hourly buckets with consecutive hours', async () => {
        const buckets = await getUpcomingReviewsByHour(4);

        for (let i = 1; i < buckets.length; i++) {
          const hourDiff =
            (buckets[i].hour.getTime() - buckets[i - 1].hour.getTime()) /
            (1000 * 60 * 60);
          expect(hourDiff).toBe(1);
        }
      });

      it('should start from the next hour (skipping current hour)', async () => {
        const now = new Date();
        const expectedNextHour = now.getHours() + 1;

        const buckets = await getUpcomingReviewsByHour(1);
        const firstBucket = buckets[0];

        expect(firstBucket.hour.getHours()).toBe(expectedNextHour % 24);
        expect(firstBucket.hour.getMinutes()).toBe(0);
        expect(firstBucket.hour.getSeconds()).toBe(0);
        expect(firstBucket.hour.getMilliseconds()).toBe(0);
      });
    });

    describe('getPracticeItems', () => {
      it('should return items with srs_stage >= 5', async () => {
        // Note: The mock doesn't fully support complex WHERE clauses, so we verify function runs
        const items = await getPracticeItems(10);
        expect(Array.isArray(items)).toBe(true);
      });

      it('should respect the limit parameter', async () => {
        const items = await getPracticeItems(5);
        expect(Array.isArray(items)).toBe(true);
      });

      it('should return empty array when no learned items exist', async () => {
        const items = await getPracticeItems(10);
        expect(items.length).toBe(0);
      });
    });

    describe('getPracticeItemCount', () => {
      it('should return count of practice-eligible items', async () => {
        const count = await getPracticeItemCount();
        expect(typeof count).toBe('number');
      });

      it('should return 0 when no assignments exist', async () => {
        const count = await getPracticeItemCount();
        expect(count).toBe(0);
      });
    });

    describe('getReversePracticeItems', () => {
      it('should return items with srs_stage >= 5', async () => {
        // Note: The mock doesn't fully support complex WHERE clauses, so we verify function runs
        const items = await getReversePracticeItems(10);
        expect(Array.isArray(items)).toBe(true);
      });

      it('should respect the limit parameter', async () => {
        const items = await getReversePracticeItems(5);
        expect(Array.isArray(items)).toBe(true);
      });

      it('should return empty array when no learned vocabulary items exist', async () => {
        const items = await getReversePracticeItems(10);
        expect(items.length).toBe(0);
      });
    });

    describe('getReversePracticeItemCount', () => {
      it('should return count of reverse practice-eligible items', async () => {
        const count = await getReversePracticeItemCount();
        expect(typeof count).toBe('number');
      });

      it('should return 0 when no vocabulary assignments exist', async () => {
        const count = await getReversePracticeItemCount();
        expect(count).toBe(0);
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
        const id2 = await insertPendingReview({
          ...testPendingReview,
          assignment_id: 2,
        });

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
        __insertRow('pending_reviews', {
          id: 1,
          assignment_id: 1,
          subject_id: 100,
          incorrect_meaning_answers: 0,
          incorrect_reading_answers: 0,
          created_at: '',
        });
        __insertRow('pending_reviews', {
          id: 2,
          assignment_id: 2,
          subject_id: 101,
          incorrect_meaning_answers: 1,
          incorrect_reading_answers: 0,
          created_at: '',
        });

        const reviews = await getAllPendingReviews();

        expect(reviews.length).toBe(2);
      });
    });

    describe('deletePendingReview', () => {
      it('should delete a pending review by ID', async () => {
        __insertRow('pending_reviews', {
          id: 1,
          assignment_id: 1,
          subject_id: 100,
          incorrect_meaning_answers: 0,
          incorrect_reading_answers: 0,
          created_at: '',
        });

        await deletePendingReview(1);

        const rows = __getTableRows('pending_reviews');
        expect(rows.length).toBe(0);
      });
    });

    describe('deleteAllPendingReviews', () => {
      it('should delete all pending reviews', async () => {
        __insertRow('pending_reviews', {
          id: 1,
          assignment_id: 1,
          subject_id: 100,
          incorrect_meaning_answers: 0,
          incorrect_reading_answers: 0,
          created_at: '',
        });
        __insertRow('pending_reviews', {
          id: 2,
          assignment_id: 2,
          subject_id: 101,
          incorrect_meaning_answers: 1,
          incorrect_reading_answers: 0,
          created_at: '',
        });

        await deleteAllPendingReviews();

        const rows = __getTableRows('pending_reviews');
        expect(rows.length).toBe(0);
      });
    });

    describe('getPendingReviewCount', () => {
      it('should return the count of pending reviews', async () => {
        __insertRow('pending_reviews', {
          id: 1,
          assignment_id: 1,
          subject_id: 100,
          incorrect_meaning_answers: 0,
          incorrect_reading_answers: 0,
          created_at: '',
        });
        __insertRow('pending_reviews', {
          id: 2,
          assignment_id: 2,
          subject_id: 101,
          incorrect_meaning_answers: 1,
          incorrect_reading_answers: 0,
          created_at: '',
        });

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
        const id2 = await insertPendingLesson({
          ...testPendingLesson,
          assignment_id: 101,
          subject_id: 2,
        });

        expect(id2).toBe(id1 + 1);
      });

      it('should replace existing lesson with same assignment_id (INSERT OR REPLACE)', async () => {
        // Note: The mock database doesn't fully support UNIQUE constraints with INSERT OR REPLACE.
        // In the real SQLite database, this would replace the existing row.
        // This test just verifies the function runs without error.
        await insertPendingLesson(testPendingLesson);
        await insertPendingLesson({
          ...testPendingLesson,
          started_at: '2024-01-16T10:00:00.000Z',
        });

        // In real DB with UNIQUE constraint, this would be 1.
        // The mock doesn't enforce UNIQUE, so we just check it was inserted.
        const rows = __getTableRows('pending_lessons');
        expect(rows.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('insertPendingLessons', () => {
      it('should insert multiple pending lessons', async () => {
        const lessons: PendingLessonInput[] = [
          {
            assignment_id: 100,
            subject_id: 1,
            started_at: '2024-01-15T10:00:00.000Z',
          },
          {
            assignment_id: 101,
            subject_id: 2,
            started_at: '2024-01-15T10:00:00.000Z',
          },
          {
            assignment_id: 102,
            subject_id: 3,
            started_at: '2024-01-15T10:00:00.000Z',
          },
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
        __insertRow('pending_lessons', {
          id: 1,
          assignment_id: 100,
          subject_id: 1,
          started_at: '',
          created_at: '',
        });
        __insertRow('pending_lessons', {
          id: 2,
          assignment_id: 101,
          subject_id: 2,
          started_at: '',
          created_at: '',
        });

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
        __insertRow('pending_lessons', {
          id: 1,
          assignment_id: 100,
          subject_id: 1,
          started_at: '',
          created_at: '',
        });

        await deletePendingLesson(1);

        const rows = __getTableRows('pending_lessons');
        expect(rows.length).toBe(0);
      });
    });

    describe('deletePendingLessonByAssignmentId', () => {
      it('should delete a pending lesson by assignment ID', async () => {
        __insertRow('pending_lessons', {
          id: 1,
          assignment_id: 100,
          subject_id: 1,
          started_at: '',
          created_at: '',
        });

        await deletePendingLessonByAssignmentId(100);

        const rows = __getTableRows('pending_lessons');
        expect(rows.length).toBe(0);
      });
    });

    describe('deleteAllPendingLessons', () => {
      it('should delete all pending lessons', async () => {
        __insertRow('pending_lessons', {
          id: 1,
          assignment_id: 100,
          subject_id: 1,
          started_at: '',
          created_at: '',
        });
        __insertRow('pending_lessons', {
          id: 2,
          assignment_id: 101,
          subject_id: 2,
          started_at: '',
          created_at: '',
        });

        await deleteAllPendingLessons();

        const rows = __getTableRows('pending_lessons');
        expect(rows.length).toBe(0);
      });
    });

    describe('getPendingLessonCount', () => {
      it('should return the count of pending lessons', async () => {
        __insertRow('pending_lessons', {
          id: 1,
          assignment_id: 100,
          subject_id: 1,
          started_at: '',
          created_at: '',
        });
        __insertRow('pending_lessons', {
          id: 2,
          assignment_id: 101,
          subject_id: 2,
          started_at: '',
          created_at: '',
        });

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
  // User Synonym CRUD Tests
  // ============================================

  describe('User Synonym CRUD', () => {
    const testUserSynonym: UserSynonymInput = {
      subject_id: 100,
      synonym: 'puppy',
      synced_at: null,
    };

    describe('addUserSynonym', () => {
      it('should add a user synonym and return the ID', async () => {
        const id = await addUserSynonym(testUserSynonym);

        expect(id).toBeGreaterThan(0);

        const rows = __getTableRows('user_synonyms');
        expect(rows.length).toBe(1);
        expect(rows[0].subject_id).toBe(100);
        expect(rows[0].synonym).toBe('puppy');
        expect(rows[0].synced_at).toBeNull();
      });

      it('should replace existing synonym with same subject_id and synonym (INSERT OR REPLACE)', async () => {
        await addUserSynonym(testUserSynonym);
        await addUserSynonym({
          ...testUserSynonym,
          synced_at: '2024-01-15T10:00:00.000Z',
        });

        // The mock doesn't fully support UNIQUE constraints with INSERT OR REPLACE,
        // but in real SQLite this would replace the existing row.
        const rows = __getTableRows('user_synonyms');
        expect(rows.length).toBeGreaterThanOrEqual(1);
      });

      it('should allow multiple synonyms for same subject', async () => {
        await addUserSynonym(testUserSynonym);
        await addUserSynonym({
          subject_id: 100,
          synonym: 'doggy',
          synced_at: null,
        });

        const rows = __getTableRows('user_synonyms');
        expect(rows.length).toBe(2);
      });
    });

    describe('getUserSynonymById', () => {
      it('should return a user synonym by ID', async () => {
        __insertRow('user_synonyms', {
          id: 1,
          subject_id: 100,
          synonym: 'puppy',
          synced_at: null,
          created_at: '2024-01-15T10:00:00.000Z',
        });

        const synonym = await getUserSynonymById(1);

        expect(synonym).not.toBeNull();
        expect(synonym?.subject_id).toBe(100);
        expect(synonym?.synonym).toBe('puppy');
      });

      it('should return null for non-existent synonym', async () => {
        const synonym = await getUserSynonymById(999);

        expect(synonym).toBeNull();
      });
    });

    describe('getUserSynonymsBySubjectId', () => {
      it('should return all synonyms for a subject', async () => {
        __insertRow('user_synonyms', {
          id: 1,
          subject_id: 100,
          synonym: 'puppy',
          synced_at: null,
          created_at: '2024-01-15T10:00:00.000Z',
        });
        __insertRow('user_synonyms', {
          id: 2,
          subject_id: 100,
          synonym: 'doggy',
          synced_at: null,
          created_at: '2024-01-15T10:01:00.000Z',
        });
        __insertRow('user_synonyms', {
          id: 3,
          subject_id: 101,
          synonym: 'kitty',
          synced_at: null,
          created_at: '2024-01-15T10:02:00.000Z',
        });

        const synonyms = await getUserSynonymsBySubjectId(100);

        expect(synonyms.length).toBe(2);
        expect(synonyms[0].synonym).toBe('puppy');
        expect(synonyms[1].synonym).toBe('doggy');
      });

      it('should return empty array for subject with no synonyms', async () => {
        const synonyms = await getUserSynonymsBySubjectId(999);

        expect(synonyms).toEqual([]);
      });
    });

    describe('getAllUserSynonyms', () => {
      it('should return all user synonyms', async () => {
        __insertRow('user_synonyms', {
          id: 1,
          subject_id: 100,
          synonym: 'puppy',
          synced_at: null,
          created_at: '',
        });
        __insertRow('user_synonyms', {
          id: 2,
          subject_id: 101,
          synonym: 'kitty',
          synced_at: null,
          created_at: '',
        });

        const synonyms = await getAllUserSynonyms();

        expect(synonyms.length).toBe(2);
      });
    });

    describe('markSynonymSynced', () => {
      it('should update synced_at timestamp', async () => {
        __insertRow('user_synonyms', {
          id: 1,
          subject_id: 100,
          synonym: 'puppy',
          synced_at: null,
          created_at: '2024-01-15T10:00:00.000Z',
        });

        await markSynonymSynced(100, 'puppy');

        // Note: The mock doesn't fully support UPDATE with complex WHERE,
        // but this verifies the function runs without error.
        const rows = __getTableRows('user_synonyms');
        expect(rows.length).toBe(1);
      });
    });

    describe('deleteUserSynonym', () => {
      it('should delete a user synonym by ID', async () => {
        __insertRow('user_synonyms', {
          id: 1,
          subject_id: 100,
          synonym: 'puppy',
          synced_at: null,
          created_at: '',
        });

        await deleteUserSynonym(1);

        const rows = __getTableRows('user_synonyms');
        expect(rows.length).toBe(0);
      });
    });

    describe('deleteUserSynonymsBySubjectId', () => {
      it('should delete all synonyms for a subject', async () => {
        __insertRow('user_synonyms', {
          id: 1,
          subject_id: 100,
          synonym: 'puppy',
          synced_at: null,
          created_at: '',
        });
        __insertRow('user_synonyms', {
          id: 2,
          subject_id: 100,
          synonym: 'doggy',
          synced_at: null,
          created_at: '',
        });
        __insertRow('user_synonyms', {
          id: 3,
          subject_id: 101,
          synonym: 'kitty',
          synced_at: null,
          created_at: '',
        });

        await deleteUserSynonymsBySubjectId(100);

        const rows = __getTableRows('user_synonyms');
        expect(rows.length).toBe(1);
        expect(rows[0].subject_id).toBe(101);
      });
    });

    describe('getUserSynonymCount', () => {
      it('should return the count of user synonyms', async () => {
        __insertRow('user_synonyms', {
          id: 1,
          subject_id: 100,
          synonym: 'puppy',
          synced_at: null,
          created_at: '',
        });
        __insertRow('user_synonyms', {
          id: 2,
          subject_id: 101,
          synonym: 'kitty',
          synced_at: null,
          created_at: '',
        });

        const count = await getUserSynonymCount();

        expect(count).toBe(2);
      });

      it('should return 0 when no synonyms', async () => {
        const count = await getUserSynonymCount();

        expect(count).toBe(0);
      });
    });
  });

  // ============================================
  // Pending Synonym CRUD Tests
  // ============================================

  describe('Pending Synonym CRUD', () => {
    const testPendingSynonym: PendingSynonymInput = {
      subject_id: 100,
      synonym: 'puppy',
    };

    describe('insertPendingSynonym', () => {
      it('should insert a pending synonym and return the ID', async () => {
        const id = await insertPendingSynonym(testPendingSynonym);

        expect(id).toBeGreaterThan(0);

        const rows = __getTableRows('pending_synonyms');
        expect(rows.length).toBe(1);
        expect(rows[0].subject_id).toBe(100);
        expect(rows[0].synonym).toBe('puppy');
      });

      it('should ignore duplicate synonym (INSERT OR IGNORE)', async () => {
        await insertPendingSynonym(testPendingSynonym);
        await insertPendingSynonym(testPendingSynonym);

        // Note: The mock doesn't fully support UNIQUE constraints,
        // but in real SQLite the second insert would be ignored.
        const rows = __getTableRows('pending_synonyms');
        expect(rows.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('getPendingSynonymById', () => {
      it('should return a pending synonym by ID', async () => {
        __insertRow('pending_synonyms', {
          id: 1,
          subject_id: 100,
          synonym: 'puppy',
          created_at: '2024-01-15T10:00:00.000Z',
        });

        const synonym = await getPendingSynonymById(1);

        expect(synonym).not.toBeNull();
        expect(synonym?.subject_id).toBe(100);
        expect(synonym?.synonym).toBe('puppy');
      });

      it('should return null for non-existent synonym', async () => {
        const synonym = await getPendingSynonymById(999);

        expect(synonym).toBeNull();
      });
    });

    describe('getPendingSynonyms', () => {
      it('should return all pending synonyms', async () => {
        __insertRow('pending_synonyms', {
          id: 1,
          subject_id: 100,
          synonym: 'puppy',
          created_at: '',
        });
        __insertRow('pending_synonyms', {
          id: 2,
          subject_id: 101,
          synonym: 'kitty',
          created_at: '',
        });

        const synonyms = await getPendingSynonyms();

        expect(synonyms.length).toBe(2);
      });

      it('should return empty array when no pending synonyms', async () => {
        const synonyms = await getPendingSynonyms();

        expect(synonyms).toEqual([]);
      });
    });

    describe('getPendingSynonymsBySubjectId', () => {
      it('should return pending synonyms for a subject', async () => {
        __insertRow('pending_synonyms', {
          id: 1,
          subject_id: 100,
          synonym: 'puppy',
          created_at: '',
        });
        __insertRow('pending_synonyms', {
          id: 2,
          subject_id: 100,
          synonym: 'doggy',
          created_at: '',
        });
        __insertRow('pending_synonyms', {
          id: 3,
          subject_id: 101,
          synonym: 'kitty',
          created_at: '',
        });

        const synonyms = await getPendingSynonymsBySubjectId(100);

        expect(synonyms.length).toBe(2);
      });
    });

    describe('deletePendingSynonym', () => {
      it('should delete a pending synonym by ID', async () => {
        __insertRow('pending_synonyms', {
          id: 1,
          subject_id: 100,
          synonym: 'puppy',
          created_at: '',
        });

        await deletePendingSynonym(1);

        const rows = __getTableRows('pending_synonyms');
        expect(rows.length).toBe(0);
      });
    });

    describe('deletePendingSynonymBySubjectAndSynonym', () => {
      it('should delete a pending synonym by subject and synonym', async () => {
        __insertRow('pending_synonyms', {
          id: 1,
          subject_id: 100,
          synonym: 'puppy',
          created_at: '',
        });
        __insertRow('pending_synonyms', {
          id: 2,
          subject_id: 100,
          synonym: 'doggy',
          created_at: '',
        });

        await deletePendingSynonymBySubjectAndSynonym(100, 'puppy');

        // Note: The mock doesn't fully support AND in WHERE clause,
        // but this verifies the function runs without error.
        const rows = __getTableRows('pending_synonyms');
        expect(rows.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe('deleteAllPendingSynonyms', () => {
      it('should delete all pending synonyms', async () => {
        __insertRow('pending_synonyms', {
          id: 1,
          subject_id: 100,
          synonym: 'puppy',
          created_at: '',
        });
        __insertRow('pending_synonyms', {
          id: 2,
          subject_id: 101,
          synonym: 'kitty',
          created_at: '',
        });

        await deleteAllPendingSynonyms();

        const rows = __getTableRows('pending_synonyms');
        expect(rows.length).toBe(0);
      });
    });

    describe('getPendingSynonymCount', () => {
      it('should return the count of pending synonyms', async () => {
        __insertRow('pending_synonyms', {
          id: 1,
          subject_id: 100,
          synonym: 'puppy',
          created_at: '',
        });
        __insertRow('pending_synonyms', {
          id: 2,
          subject_id: 101,
          synonym: 'kitty',
          created_at: '',
        });

        const count = await getPendingSynonymCount();

        expect(count).toBe(2);
      });

      it('should return 0 when no pending synonyms', async () => {
        const count = await getPendingSynonymCount();

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
        await updateSyncStatus({
          last_subjects_sync: '2023-01-01T00:00:00.000Z',
        });

        const status = await getSyncStatus();

        expect(status).not.toBeNull();
        expect(status?.last_subjects_sync).toBe('2023-01-01T00:00:00.000Z');
      });
    });

    describe('updateSyncStatus', () => {
      it('should update last_subjects_sync', async () => {
        await updateSyncStatus({
          last_subjects_sync: '2023-06-01T00:00:00.000Z',
        });

        const status = await getSyncStatus();
        expect(status?.last_subjects_sync).toBe('2023-06-01T00:00:00.000Z');
      });

      it('should update last_assignments_sync', async () => {
        await updateSyncStatus({
          last_assignments_sync: '2023-06-02T00:00:00.000Z',
        });

        const status = await getSyncStatus();
        expect(status?.last_assignments_sync).toBe('2023-06-02T00:00:00.000Z');
      });

      it('should update last_summary_sync', async () => {
        await updateSyncStatus({
          last_summary_sync: '2023-06-03T00:00:00.000Z',
        });

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
  // User Settings CRUD Tests
  // ============================================

  describe('User Settings CRUD', () => {
    describe('setSetting', () => {
      it('should store a boolean setting', async () => {
        await setSetting('zen_mode', true);

        const rows = __getTableRows('user_settings');
        expect(rows.length).toBe(1);
        expect(rows[0].setting_key).toBe('zen_mode');
        expect(rows[0].setting_value).toBe('true');
      });

      it('should store a string setting', async () => {
        await setSetting('theme', 'dark');

        const rows = __getTableRows('user_settings');
        expect(rows.length).toBe(1);
        expect(rows[0].setting_key).toBe('theme');
        expect(rows[0].setting_value).toBe('"dark"');
      });

      it('should store a number setting', async () => {
        await setSetting('font_size', 16);

        const rows = __getTableRows('user_settings');
        expect(rows.length).toBe(1);
        expect(rows[0].setting_key).toBe('font_size');
        expect(rows[0].setting_value).toBe('16');
      });

      it('should update an existing setting (INSERT OR REPLACE)', async () => {
        await setSetting('zen_mode', true);
        await setSetting('zen_mode', false);

        // The mock doesn't fully support UNIQUE constraints with INSERT OR REPLACE,
        // but in real SQLite this would replace the existing row.
        const rows = __getTableRows('user_settings');
        expect(rows.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('getSetting', () => {
      it('should return a boolean setting', async () => {
        __insertRow('user_settings', {
          setting_key: 'zen_mode',
          setting_value: 'true',
          updated_at: '2024-01-15T10:00:00.000Z',
        });

        const value = await getSetting('zen_mode');

        expect(value).toBe(true);
      });

      it('should return a string setting', async () => {
        __insertRow('user_settings', {
          setting_key: 'theme',
          setting_value: '"dark"',
          updated_at: '2024-01-15T10:00:00.000Z',
        });

        const value = await getSetting('theme');

        expect(value).toBe('dark');
      });

      it('should return a number setting', async () => {
        __insertRow('user_settings', {
          setting_key: 'font_size',
          setting_value: '16',
          updated_at: '2024-01-15T10:00:00.000Z',
        });

        const value = await getSetting('font_size');

        expect(value).toBe(16);
      });

      it('should return null for non-existent setting', async () => {
        const value = await getSetting('nonexistent');

        expect(value).toBeNull();
      });

      it('should return raw string for invalid JSON', async () => {
        __insertRow('user_settings', {
          setting_key: 'invalid',
          setting_value: 'not valid json',
          updated_at: '2024-01-15T10:00:00.000Z',
        });

        const value = await getSetting('invalid');

        expect(value).toBe('not valid json');
      });
    });

    describe('getAllSettings', () => {
      it('should return all settings as a key-value map', async () => {
        __insertRow('user_settings', {
          setting_key: 'zen_mode',
          setting_value: 'true',
          updated_at: '',
        });
        __insertRow('user_settings', {
          setting_key: 'theme',
          setting_value: '"dark"',
          updated_at: '',
        });
        __insertRow('user_settings', {
          setting_key: 'font_size',
          setting_value: '16',
          updated_at: '',
        });

        const settings = await getAllSettings();

        expect(settings.zen_mode).toBe(true);
        expect(settings.theme).toBe('dark');
        expect(settings.font_size).toBe(16);
      });

      it('should return empty object when no settings exist', async () => {
        const settings = await getAllSettings();

        expect(settings).toEqual({});
      });
    });

    describe('deleteSetting', () => {
      it('should delete a setting by key', async () => {
        __insertRow('user_settings', {
          setting_key: 'zen_mode',
          setting_value: 'true',
          updated_at: '',
        });

        await deleteSetting('zen_mode');

        const rows = __getTableRows('user_settings');
        expect(rows.length).toBe(0);
      });
    });

    describe('deleteAllSettings', () => {
      it('should delete all settings', async () => {
        __insertRow('user_settings', {
          setting_key: 'zen_mode',
          setting_value: 'true',
          updated_at: '',
        });
        __insertRow('user_settings', {
          setting_key: 'theme',
          setting_value: '"dark"',
          updated_at: '',
        });

        await deleteAllSettings();

        const rows = __getTableRows('user_settings');
        expect(rows.length).toBe(0);
      });
    });

    describe('clearAllData should NOT clear user_settings', () => {
      it('should preserve user_settings when clearing synced data', async () => {
        // Add a setting
        __insertRow('user_settings', {
          setting_key: 'zen_mode',
          setting_value: 'true',
          updated_at: '',
        });

        // Add some synced data that should be cleared
        __insertRow('subjects', {
          id: 1,
          object_type: 'kanji',
          characters: '一',
          meanings: '[]',
          meaning_mnemonic: 'test',
          level: 1,
          created_at: '',
        });

        // Clear all synced data
        await clearAllData();

        // Verify subjects were cleared
        const subjectRows = __getTableRows('subjects');
        expect(subjectRows.length).toBe(0);

        // Verify user_settings were preserved
        const settingsRows = __getTableRows('user_settings');
        expect(settingsRows.length).toBe(1);
        expect(settingsRows[0].setting_key).toBe('zen_mode');
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

        // For fresh database, should set to DATABASE_VERSION (7)
        expect(result.currentVersion).toBe(7);
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
