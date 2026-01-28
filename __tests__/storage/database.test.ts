import { open } from '@op-engineering/op-sqlite';

import {
  closeDatabase,
  executeSql,
  getDatabaseName,
  getDatabaseVersion,
  getDatabase,
  initializeDatabase,
  SCHEMA,
  _resetDatabaseInstance,
} from '../../src/storage/database';
import {
  __resetMockDatabase,
  __getExecutedStatements,
} from '../../__mocks__/@op-engineering/op-sqlite';

jest.mock('@op-engineering/op-sqlite');

describe('database', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetMockDatabase();
    _resetDatabaseInstance();
  });

  describe('getDatabaseVersion', () => {
    it('should return the current database version', () => {
      expect(getDatabaseVersion()).toBe(7);
    });
  });

  describe('getDatabaseName', () => {
    it('should return the database name', () => {
      expect(getDatabaseName()).toBe('wanikani.db');
    });
  });

  describe('getDatabase', () => {
    it('should open the database connection', () => {
      getDatabase();

      expect(open).toHaveBeenCalledWith({
        name: 'wanikani.db',
      });
    });

    it('should return the same database instance on subsequent calls', () => {
      const db1 = getDatabase();
      const db2 = getDatabase();

      expect(db1).toBe(db2);
      expect(open).toHaveBeenCalledTimes(1);
    });
  });

  describe('initializeDatabase', () => {
    it('should return true on successful initialization', async () => {
      const result = await initializeDatabase();

      expect(result).toBe(true);
    });

    it('should create the subjects table', async () => {
      await initializeDatabase();

      const statements = __getExecutedStatements();
      const createSubjects = statements.find(s =>
        s.includes('CREATE TABLE IF NOT EXISTS subjects'),
      );

      expect(createSubjects).toBeDefined();
      expect(createSubjects).toContain('id INTEGER PRIMARY KEY');
      expect(createSubjects).toContain('object_type TEXT NOT NULL');
      expect(createSubjects).toContain('characters TEXT');
      expect(createSubjects).toContain('meanings TEXT NOT NULL');
      expect(createSubjects).toContain('readings TEXT');
      expect(createSubjects).toContain('meaning_mnemonic TEXT NOT NULL');
      expect(createSubjects).toContain('reading_mnemonic TEXT');
      expect(createSubjects).toContain('level INTEGER NOT NULL');
      expect(createSubjects).toContain('component_subject_ids TEXT');
    });

    it('should create the assignments table', async () => {
      await initializeDatabase();

      const statements = __getExecutedStatements();
      const createAssignments = statements.find(s =>
        s.includes('CREATE TABLE IF NOT EXISTS assignments'),
      );

      expect(createAssignments).toBeDefined();
      expect(createAssignments).toContain('id INTEGER PRIMARY KEY');
      expect(createAssignments).toContain('subject_id INTEGER NOT NULL');
      expect(createAssignments).toContain('srs_stage INTEGER NOT NULL');
      expect(createAssignments).toContain('available_at TEXT');
      expect(createAssignments).toContain('started_at TEXT');
      expect(createAssignments).toContain('unlocked_at TEXT');
      expect(createAssignments).toContain(
        'FOREIGN KEY (subject_id) REFERENCES subjects(id)',
      );
    });

    it('should create the pending_reviews table', async () => {
      await initializeDatabase();

      const statements = __getExecutedStatements();
      const createPendingReviews = statements.find(s =>
        s.includes('CREATE TABLE IF NOT EXISTS pending_reviews'),
      );

      expect(createPendingReviews).toBeDefined();
      expect(createPendingReviews).toContain(
        'id INTEGER PRIMARY KEY AUTOINCREMENT',
      );
      expect(createPendingReviews).toContain('assignment_id INTEGER NOT NULL');
      expect(createPendingReviews).toContain('subject_id INTEGER NOT NULL');
      expect(createPendingReviews).toContain(
        'incorrect_meaning_answers INTEGER NOT NULL DEFAULT 0',
      );
      expect(createPendingReviews).toContain(
        'incorrect_reading_answers INTEGER NOT NULL DEFAULT 0',
      );
      expect(createPendingReviews).toContain(
        'created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP',
      );
    });

    it('should create the sync_status table', async () => {
      await initializeDatabase();

      const statements = __getExecutedStatements();
      const createSyncStatus = statements.find(s =>
        s.includes('CREATE TABLE IF NOT EXISTS sync_status'),
      );

      expect(createSyncStatus).toBeDefined();
      expect(createSyncStatus).toContain(
        'id INTEGER PRIMARY KEY CHECK (id = 1)',
      );
      expect(createSyncStatus).toContain('last_subjects_sync TEXT');
      expect(createSyncStatus).toContain('last_assignments_sync TEXT');
      expect(createSyncStatus).toContain('last_summary_sync TEXT');
    });

    it('should create indexes for assignments table', async () => {
      await initializeDatabase();

      const statements = __getExecutedStatements();
      const subjectIndex = statements.find(s =>
        s.includes('idx_assignments_subject_id'),
      );
      const availableIndex = statements.find(s =>
        s.includes('idx_assignments_available_at'),
      );

      expect(subjectIndex).toContain('CREATE INDEX IF NOT EXISTS');
      expect(subjectIndex).toContain('ON assignments(subject_id)');
      expect(availableIndex).toContain('CREATE INDEX IF NOT EXISTS');
      expect(availableIndex).toContain('ON assignments(available_at)');
    });

    it('should create indexes for subjects table', async () => {
      await initializeDatabase();

      const statements = __getExecutedStatements();
      const levelIndex = statements.find(s => s.includes('idx_subjects_level'));
      const typeIndex = statements.find(s =>
        s.includes('idx_subjects_object_type'),
      );

      expect(levelIndex).toContain('CREATE INDEX IF NOT EXISTS');
      expect(levelIndex).toContain('ON subjects(level)');
      expect(typeIndex).toContain('CREATE INDEX IF NOT EXISTS');
      expect(typeIndex).toContain('ON subjects(object_type)');
    });

    it('should initialize sync_status with a single row', async () => {
      await initializeDatabase();

      const statements = __getExecutedStatements();
      const initSync = statements.find(s =>
        s.includes('INSERT OR IGNORE INTO sync_status'),
      );

      expect(initSync).toBeDefined();
      expect(initSync).toContain('VALUES (1)');
    });

    it('should be safe to call multiple times', async () => {
      const result1 = await initializeDatabase();
      const result2 = await initializeDatabase();

      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });
  });

  describe('closeDatabase', () => {
    it('should close an open database connection', () => {
      const db = getDatabase();
      closeDatabase();

      expect(db.close).toHaveBeenCalled();
    });

    it('should handle closing when no database is open', () => {
      // Should not throw
      expect(() => closeDatabase()).not.toThrow();
    });

    it('should allow reopening after close', () => {
      getDatabase();
      closeDatabase();
      getDatabase();

      expect(open).toHaveBeenCalledTimes(2);
    });
  });

  describe('executeSql', () => {
    it('should execute SQL queries', async () => {
      await initializeDatabase();
      const result = await executeSql('SELECT * FROM subjects');

      expect(result).toBeDefined();
      expect(result.rows).toBeDefined();
    });

    it('should execute SQL with parameters', async () => {
      await initializeDatabase();
      const result = await executeSql(
        'SELECT * FROM subjects WHERE level = ?',
        [5],
      );

      expect(result).toBeDefined();
    });
  });

  describe('SCHEMA exports', () => {
    it('should export CREATE_SUBJECTS_TABLE', () => {
      expect(SCHEMA.CREATE_SUBJECTS_TABLE).toContain(
        'CREATE TABLE IF NOT EXISTS subjects',
      );
    });

    it('should export CREATE_ASSIGNMENTS_TABLE', () => {
      expect(SCHEMA.CREATE_ASSIGNMENTS_TABLE).toContain(
        'CREATE TABLE IF NOT EXISTS assignments',
      );
    });

    it('should export CREATE_PENDING_REVIEWS_TABLE', () => {
      expect(SCHEMA.CREATE_PENDING_REVIEWS_TABLE).toContain(
        'CREATE TABLE IF NOT EXISTS pending_reviews',
      );
    });

    it('should export CREATE_SYNC_STATUS_TABLE', () => {
      expect(SCHEMA.CREATE_SYNC_STATUS_TABLE).toContain(
        'CREATE TABLE IF NOT EXISTS sync_status',
      );
    });

    it('should export all index creation statements', () => {
      expect(SCHEMA.CREATE_ASSIGNMENTS_SUBJECT_INDEX).toContain(
        'idx_assignments_subject_id',
      );
      expect(SCHEMA.CREATE_ASSIGNMENTS_AVAILABLE_INDEX).toContain(
        'idx_assignments_available_at',
      );
      expect(SCHEMA.CREATE_SUBJECTS_LEVEL_INDEX).toContain(
        'idx_subjects_level',
      );
      expect(SCHEMA.CREATE_SUBJECTS_TYPE_INDEX).toContain(
        'idx_subjects_object_type',
      );
    });
  });

  describe('Database Types', () => {
    it('subjects table should have data_updated_at column', async () => {
      await initializeDatabase();

      const statements = __getExecutedStatements();
      const createSubjects = statements.find(s =>
        s.includes('CREATE TABLE IF NOT EXISTS subjects'),
      );

      expect(createSubjects).toContain('data_updated_at TEXT');
    });

    it('assignments table should have data_updated_at column', async () => {
      await initializeDatabase();

      const statements = __getExecutedStatements();
      const createAssignments = statements.find(s =>
        s.includes('CREATE TABLE IF NOT EXISTS assignments'),
      );

      expect(createAssignments).toContain('data_updated_at TEXT');
    });
  });
});
