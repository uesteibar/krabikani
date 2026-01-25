import SQLite, {
  SQLiteDatabase,
  ResultSet,
} from 'react-native-sqlite-storage';

// Enable promises for SQLite
SQLite.enablePromise(true);

// Database name
const DATABASE_NAME = 'wanikani.db';
const DATABASE_VERSION = 1;

// Current database instance
let db: SQLiteDatabase | null = null;

// ============================================
// Schema Definitions
// ============================================

/**
 * Subjects table stores WaniKani subjects (radicals, kanji, vocabulary, kana_vocabulary).
 * Complex fields (meanings, readings, component_subject_ids) are stored as JSON strings.
 */
const CREATE_SUBJECTS_TABLE = `
  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY,
    object_type TEXT NOT NULL,
    characters TEXT,
    meanings TEXT NOT NULL,
    readings TEXT,
    meaning_mnemonic TEXT NOT NULL,
    reading_mnemonic TEXT,
    level INTEGER NOT NULL,
    component_subject_ids TEXT,
    data_updated_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`;

/**
 * Assignments table stores user's progress on subjects.
 */
const CREATE_ASSIGNMENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY,
    subject_id INTEGER NOT NULL,
    srs_stage INTEGER NOT NULL,
    available_at TEXT,
    started_at TEXT,
    unlocked_at TEXT,
    data_updated_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
  )
`;

/**
 * Pending reviews table stores reviews completed offline that need to be synced.
 */
const CREATE_PENDING_REVIEWS_TABLE = `
  CREATE TABLE IF NOT EXISTS pending_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    incorrect_meaning_answers INTEGER NOT NULL DEFAULT 0,
    incorrect_reading_answers INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

/**
 * Sync status table tracks when data was last synchronized with the API.
 */
const CREATE_SYNC_STATUS_TABLE = `
  CREATE TABLE IF NOT EXISTS sync_status (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_subjects_sync TEXT,
    last_assignments_sync TEXT,
    last_summary_sync TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`;

/**
 * Pending lessons table stores lessons completed offline that need to be synced.
 * Each row represents a lesson (assignment) that was started locally but not yet synced.
 */
const CREATE_PENDING_LESSONS_TABLE = `
  CREATE TABLE IF NOT EXISTS pending_lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL UNIQUE,
    subject_id INTEGER NOT NULL,
    started_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

/**
 * Index on assignments for fast lookup by subject_id and available_at.
 */
const CREATE_ASSIGNMENTS_SUBJECT_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_assignments_subject_id ON assignments(subject_id)
`;

const CREATE_ASSIGNMENTS_AVAILABLE_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_assignments_available_at ON assignments(available_at)
`;

/**
 * Index on subjects for fast lookup by level and type.
 */
const CREATE_SUBJECTS_LEVEL_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_subjects_level ON subjects(level)
`;

const CREATE_SUBJECTS_TYPE_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_subjects_object_type ON subjects(object_type)
`;

// All schema statements in order
const SCHEMA_STATEMENTS = [
  CREATE_SUBJECTS_TABLE,
  CREATE_ASSIGNMENTS_TABLE,
  CREATE_PENDING_REVIEWS_TABLE,
  CREATE_PENDING_LESSONS_TABLE,
  CREATE_SYNC_STATUS_TABLE,
  CREATE_ASSIGNMENTS_SUBJECT_INDEX,
  CREATE_ASSIGNMENTS_AVAILABLE_INDEX,
  CREATE_SUBJECTS_LEVEL_INDEX,
  CREATE_SUBJECTS_TYPE_INDEX,
];

// ============================================
// Database Types
// ============================================

export interface DatabaseSubject {
  id: number;
  object_type: string;
  characters: string | null;
  meanings: string; // JSON string of Meaning[]
  readings: string | null; // JSON string of Reading[] or null for radicals
  meaning_mnemonic: string;
  reading_mnemonic: string | null;
  level: number;
  component_subject_ids: string | null; // JSON string of number[] or null
  data_updated_at: string | null;
  created_at: string;
}

export interface DatabaseAssignment {
  id: number;
  subject_id: number;
  srs_stage: number;
  available_at: string | null;
  started_at: string | null;
  unlocked_at: string | null;
  data_updated_at: string | null;
  created_at: string;
}

export interface DatabasePendingReview {
  id: number;
  assignment_id: number;
  subject_id: number;
  incorrect_meaning_answers: number;
  incorrect_reading_answers: number;
  created_at: string;
}

export interface DatabaseSyncStatus {
  id: number;
  last_subjects_sync: string | null;
  last_assignments_sync: string | null;
  last_summary_sync: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabasePendingLesson {
  id: number;
  assignment_id: number;
  subject_id: number;
  started_at: string;
  created_at: string;
}

// ============================================
// Database Operations
// ============================================

/**
 * Opens the database connection if not already open.
 * @returns The database instance
 */
export async function getDatabase(): Promise<SQLiteDatabase> {
  if (db !== null) {
    return db;
  }

  db = await SQLite.openDatabase({
    name: DATABASE_NAME,
    location: 'default',
  });

  return db;
}

/**
 * Initializes the database by creating all required tables.
 * Safe to call multiple times - uses IF NOT EXISTS.
 * @returns true if initialization was successful
 */
export async function initializeDatabase(): Promise<boolean> {
  try {
    const database = await getDatabase();

    for (const statement of SCHEMA_STATEMENTS) {
      await database.executeSql(statement);
    }

    // Initialize sync_status with a single row if it doesn't exist
    await database.executeSql(
      'INSERT OR IGNORE INTO sync_status (id) VALUES (1)',
    );

    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return false;
  }
}

/**
 * Closes the database connection.
 */
export async function closeDatabase(): Promise<void> {
  if (db !== null) {
    await db.close();
    db = null;
  }
}

/**
 * Executes a SQL query and returns the results.
 * @param sql The SQL query to execute
 * @param params Optional parameters for the query
 * @returns The result set
 */
export async function executeSql(
  sql: string,
  params: (string | number | null)[] = [],
): Promise<ResultSet> {
  const database = await getDatabase();
  const [results] = await database.executeSql(sql, params);
  return results;
}

/**
 * Gets the current database version.
 * Used for migrations in future updates.
 */
export function getDatabaseVersion(): number {
  return DATABASE_VERSION;
}

/**
 * Gets the database name.
 */
export function getDatabaseName(): string {
  return DATABASE_NAME;
}

/**
 * Resets the database instance for testing purposes.
 * Only exported for test use.
 */
export function _resetDatabaseInstance(): void {
  db = null;
}

// Export schema statements for testing
export const SCHEMA = {
  CREATE_SUBJECTS_TABLE,
  CREATE_ASSIGNMENTS_TABLE,
  CREATE_PENDING_REVIEWS_TABLE,
  CREATE_PENDING_LESSONS_TABLE,
  CREATE_SYNC_STATUS_TABLE,
  CREATE_ASSIGNMENTS_SUBJECT_INDEX,
  CREATE_ASSIGNMENTS_AVAILABLE_INDEX,
  CREATE_SUBJECTS_LEVEL_INDEX,
  CREATE_SUBJECTS_TYPE_INDEX,
};

// ============================================
// Subject CRUD Operations
// ============================================

export interface SubjectInput {
  id: number;
  object_type: string;
  characters: string | null;
  meanings: string; // JSON string
  readings: string | null; // JSON string
  meaning_mnemonic: string;
  reading_mnemonic: string | null;
  level: number;
  component_subject_ids: string | null; // JSON string
  data_updated_at: string | null;
}

/**
 * Inserts or replaces a subject in the database.
 * Uses INSERT OR REPLACE for upsert behavior.
 */
export async function upsertSubject(subject: SubjectInput): Promise<void> {
  await executeSql(
    `INSERT OR REPLACE INTO subjects
      (id, object_type, characters, meanings, readings, meaning_mnemonic, reading_mnemonic, level, component_subject_ids, data_updated_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM subjects WHERE id = ?), CURRENT_TIMESTAMP))`,
    [
      subject.id,
      subject.object_type,
      subject.characters,
      subject.meanings,
      subject.readings,
      subject.meaning_mnemonic,
      subject.reading_mnemonic,
      subject.level,
      subject.component_subject_ids,
      subject.data_updated_at,
      subject.id, // For the COALESCE subquery
    ],
  );
}

/**
 * Inserts or replaces multiple subjects in a single transaction.
 */
export async function upsertSubjects(subjects: SubjectInput[]): Promise<void> {
  if (subjects.length === 0) return;

  const database = await getDatabase();
  await database.transaction(async tx => {
    for (const subject of subjects) {
      tx.executeSql(
        `INSERT OR REPLACE INTO subjects
          (id, object_type, characters, meanings, readings, meaning_mnemonic, reading_mnemonic, level, component_subject_ids, data_updated_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM subjects WHERE id = ?), CURRENT_TIMESTAMP))`,
        [
          subject.id,
          subject.object_type,
          subject.characters,
          subject.meanings,
          subject.readings,
          subject.meaning_mnemonic,
          subject.reading_mnemonic,
          subject.level,
          subject.component_subject_ids,
          subject.data_updated_at,
          subject.id,
        ],
      );
    }
  });
}

/**
 * Retrieves a subject by ID.
 */
export async function getSubjectById(
  id: number,
): Promise<DatabaseSubject | null> {
  const result = await executeSql('SELECT * FROM subjects WHERE id = ?', [id]);
  if (result.rows.length === 0) {
    return null;
  }
  return result.rows.item(0) as DatabaseSubject;
}

/**
 * Retrieves subjects by their IDs.
 */
export async function getSubjectsByIds(
  ids: number[],
): Promise<DatabaseSubject[]> {
  if (ids.length === 0) return [];

  const placeholders = ids.map(() => '?').join(',');
  const result = await executeSql(
    `SELECT * FROM subjects WHERE id IN (${placeholders})`,
    ids,
  );
  return result.rows.raw() as DatabaseSubject[];
}

/**
 * Retrieves all subjects at or below a given level.
 */
export async function getSubjectsByLevel(
  maxLevel: number,
): Promise<DatabaseSubject[]> {
  const result = await executeSql(
    'SELECT * FROM subjects WHERE level <= ? ORDER BY level, id',
    [maxLevel],
  );
  return result.rows.raw() as DatabaseSubject[];
}

/**
 * Retrieves all subjects of a specific type.
 */
export async function getSubjectsByType(
  objectType: string,
): Promise<DatabaseSubject[]> {
  const result = await executeSql(
    'SELECT * FROM subjects WHERE object_type = ? ORDER BY level, id',
    [objectType],
  );
  return result.rows.raw() as DatabaseSubject[];
}

/**
 * Retrieves all subjects.
 */
export async function getAllSubjects(): Promise<DatabaseSubject[]> {
  const result = await executeSql(
    'SELECT * FROM subjects ORDER BY level, id',
    [],
  );
  return result.rows.raw() as DatabaseSubject[];
}

/**
 * Deletes a subject by ID.
 */
export async function deleteSubject(id: number): Promise<void> {
  await executeSql('DELETE FROM subjects WHERE id = ?', [id]);
}

/**
 * Gets the count of subjects in the database.
 */
export async function getSubjectCount(): Promise<number> {
  const result = await executeSql('SELECT COUNT(*) as count FROM subjects', []);
  return (result.rows.item(0) as { count: number }).count;
}

// ============================================
// Assignment CRUD Operations
// ============================================

export interface AssignmentInput {
  id: number;
  subject_id: number;
  srs_stage: number;
  available_at: string | null;
  started_at: string | null;
  unlocked_at: string | null;
  data_updated_at: string | null;
}

/**
 * Inserts or replaces an assignment in the database.
 */
export async function upsertAssignment(
  assignment: AssignmentInput,
): Promise<void> {
  await executeSql(
    `INSERT OR REPLACE INTO assignments
      (id, subject_id, srs_stage, available_at, started_at, unlocked_at, data_updated_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM assignments WHERE id = ?), CURRENT_TIMESTAMP))`,
    [
      assignment.id,
      assignment.subject_id,
      assignment.srs_stage,
      assignment.available_at,
      assignment.started_at,
      assignment.unlocked_at,
      assignment.data_updated_at,
      assignment.id,
    ],
  );
}

/**
 * Inserts or replaces multiple assignments in a single transaction.
 */
export async function upsertAssignments(
  assignments: AssignmentInput[],
): Promise<void> {
  if (assignments.length === 0) return;

  const database = await getDatabase();
  await database.transaction(async tx => {
    for (const assignment of assignments) {
      tx.executeSql(
        `INSERT OR REPLACE INTO assignments
          (id, subject_id, srs_stage, available_at, started_at, unlocked_at, data_updated_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM assignments WHERE id = ?), CURRENT_TIMESTAMP))`,
        [
          assignment.id,
          assignment.subject_id,
          assignment.srs_stage,
          assignment.available_at,
          assignment.started_at,
          assignment.unlocked_at,
          assignment.data_updated_at,
          assignment.id,
        ],
      );
    }
  });
}

/**
 * Retrieves an assignment by ID.
 */
export async function getAssignmentById(
  id: number,
): Promise<DatabaseAssignment | null> {
  const result = await executeSql('SELECT * FROM assignments WHERE id = ?', [
    id,
  ]);
  if (result.rows.length === 0) {
    return null;
  }
  return result.rows.item(0) as DatabaseAssignment;
}

/**
 * Retrieves an assignment by subject ID.
 */
export async function getAssignmentBySubjectId(
  subjectId: number,
): Promise<DatabaseAssignment | null> {
  const result = await executeSql(
    'SELECT * FROM assignments WHERE subject_id = ?',
    [subjectId],
  );
  if (result.rows.length === 0) {
    return null;
  }
  return result.rows.item(0) as DatabaseAssignment;
}

/**
 * Retrieves all assignments available for review (available_at <= now).
 */
export async function getAvailableReviews(): Promise<DatabaseAssignment[]> {
  const now = new Date().toISOString();
  const result = await executeSql(
    `SELECT * FROM assignments
     WHERE available_at IS NOT NULL
       AND available_at <= ?
       AND started_at IS NOT NULL
       AND srs_stage > 0
     ORDER BY available_at`,
    [now],
  );
  return result.rows.raw() as DatabaseAssignment[];
}

/**
 * Retrieves all assignments available for lessons (unlocked but not started).
 */
export async function getAvailableLessons(): Promise<DatabaseAssignment[]> {
  const result = await executeSql(
    `SELECT * FROM assignments
     WHERE unlocked_at IS NOT NULL
       AND started_at IS NULL
     ORDER BY id`,
    [],
  );
  return result.rows.raw() as DatabaseAssignment[];
}

/**
 * Retrieves all assignments.
 */
export async function getAllAssignments(): Promise<DatabaseAssignment[]> {
  const result = await executeSql('SELECT * FROM assignments ORDER BY id', []);
  return result.rows.raw() as DatabaseAssignment[];
}

/**
 * Deletes an assignment by ID.
 */
export async function deleteAssignment(id: number): Promise<void> {
  await executeSql('DELETE FROM assignments WHERE id = ?', [id]);
}

/**
 * Gets the count of assignments in the database.
 */
export async function getAssignmentCount(): Promise<number> {
  const result = await executeSql(
    'SELECT COUNT(*) as count FROM assignments',
    [],
  );
  return (result.rows.item(0) as { count: number }).count;
}

/**
 * Gets the next review time (earliest available_at after now).
 * Returns null if no upcoming reviews are scheduled.
 */
export async function getNextReviewTime(): Promise<string | null> {
  const now = new Date().toISOString();
  const result = await executeSql(
    `SELECT MIN(available_at) as next_review
     FROM assignments
     WHERE available_at IS NOT NULL
       AND available_at > ?
       AND started_at IS NOT NULL
       AND srs_stage > 0`,
    [now],
  );
  const row = result.rows.item(0);
  return row?.next_review ?? null;
}

// ============================================
// Pending Review CRUD Operations
// ============================================

export interface PendingReviewInput {
  assignment_id: number;
  subject_id: number;
  incorrect_meaning_answers: number;
  incorrect_reading_answers: number;
}

/**
 * Inserts a pending review into the database.
 * Returns the ID of the inserted row.
 */
export async function insertPendingReview(
  review: PendingReviewInput,
): Promise<number> {
  const result = await executeSql(
    `INSERT INTO pending_reviews (assignment_id, subject_id, incorrect_meaning_answers, incorrect_reading_answers)
     VALUES (?, ?, ?, ?)`,
    [
      review.assignment_id,
      review.subject_id,
      review.incorrect_meaning_answers,
      review.incorrect_reading_answers,
    ],
  );
  return result.insertId ?? 0;
}

/**
 * Retrieves a pending review by ID.
 */
export async function getPendingReviewById(
  id: number,
): Promise<DatabasePendingReview | null> {
  const result = await executeSql(
    'SELECT * FROM pending_reviews WHERE id = ?',
    [id],
  );
  if (result.rows.length === 0) {
    return null;
  }
  return result.rows.item(0) as DatabasePendingReview;
}

/**
 * Retrieves all pending reviews.
 */
export async function getAllPendingReviews(): Promise<DatabasePendingReview[]> {
  const result = await executeSql(
    'SELECT * FROM pending_reviews ORDER BY created_at',
    [],
  );
  return result.rows.raw() as DatabasePendingReview[];
}

/**
 * Deletes a pending review by ID.
 */
export async function deletePendingReview(id: number): Promise<void> {
  await executeSql('DELETE FROM pending_reviews WHERE id = ?', [id]);
}

/**
 * Deletes all pending reviews.
 */
export async function deleteAllPendingReviews(): Promise<void> {
  await executeSql('DELETE FROM pending_reviews', []);
}

/**
 * Gets the count of pending reviews.
 */
export async function getPendingReviewCount(): Promise<number> {
  const result = await executeSql(
    'SELECT COUNT(*) as count FROM pending_reviews',
    [],
  );
  return (result.rows.item(0) as { count: number }).count;
}

// ============================================
// Pending Lesson CRUD Operations
// ============================================

export interface PendingLessonInput {
  assignment_id: number;
  subject_id: number;
  started_at: string;
}

/**
 * Inserts a pending lesson into the database.
 * Uses INSERT OR REPLACE since assignment_id is UNIQUE.
 * Returns the ID of the inserted row.
 */
export async function insertPendingLesson(
  lesson: PendingLessonInput,
): Promise<number> {
  const result = await executeSql(
    `INSERT OR REPLACE INTO pending_lessons (assignment_id, subject_id, started_at)
     VALUES (?, ?, ?)`,
    [lesson.assignment_id, lesson.subject_id, lesson.started_at],
  );
  return result.insertId ?? 0;
}

/**
 * Inserts multiple pending lessons in a single transaction.
 */
export async function insertPendingLessons(
  lessons: PendingLessonInput[],
): Promise<void> {
  if (lessons.length === 0) return;

  const database = await getDatabase();
  await database.transaction(async tx => {
    for (const lesson of lessons) {
      tx.executeSql(
        `INSERT OR REPLACE INTO pending_lessons (assignment_id, subject_id, started_at)
         VALUES (?, ?, ?)`,
        [lesson.assignment_id, lesson.subject_id, lesson.started_at],
      );
    }
  });
}

/**
 * Retrieves a pending lesson by ID.
 */
export async function getPendingLessonById(
  id: number,
): Promise<DatabasePendingLesson | null> {
  const result = await executeSql(
    'SELECT * FROM pending_lessons WHERE id = ?',
    [id],
  );
  if (result.rows.length === 0) {
    return null;
  }
  return result.rows.item(0) as DatabasePendingLesson;
}

/**
 * Retrieves a pending lesson by assignment ID.
 */
export async function getPendingLessonByAssignmentId(
  assignmentId: number,
): Promise<DatabasePendingLesson | null> {
  const result = await executeSql(
    'SELECT * FROM pending_lessons WHERE assignment_id = ?',
    [assignmentId],
  );
  if (result.rows.length === 0) {
    return null;
  }
  return result.rows.item(0) as DatabasePendingLesson;
}

/**
 * Retrieves all pending lessons.
 */
export async function getAllPendingLessons(): Promise<DatabasePendingLesson[]> {
  const result = await executeSql(
    'SELECT * FROM pending_lessons ORDER BY created_at',
    [],
  );
  return result.rows.raw() as DatabasePendingLesson[];
}

/**
 * Deletes a pending lesson by ID.
 */
export async function deletePendingLesson(id: number): Promise<void> {
  await executeSql('DELETE FROM pending_lessons WHERE id = ?', [id]);
}

/**
 * Deletes a pending lesson by assignment ID.
 */
export async function deletePendingLessonByAssignmentId(
  assignmentId: number,
): Promise<void> {
  await executeSql('DELETE FROM pending_lessons WHERE assignment_id = ?', [
    assignmentId,
  ]);
}

/**
 * Deletes all pending lessons.
 */
export async function deleteAllPendingLessons(): Promise<void> {
  await executeSql('DELETE FROM pending_lessons', []);
}

/**
 * Gets the count of pending lessons.
 */
export async function getPendingLessonCount(): Promise<number> {
  const result = await executeSql(
    'SELECT COUNT(*) as count FROM pending_lessons',
    [],
  );
  return (result.rows.item(0) as { count: number }).count;
}

// ============================================
// Sync Status CRUD Operations
// ============================================

/**
 * Retrieves the current sync status.
 */
export async function getSyncStatus(): Promise<DatabaseSyncStatus | null> {
  const result = await executeSql('SELECT * FROM sync_status WHERE id = 1', []);
  if (result.rows.length === 0) {
    return null;
  }
  return result.rows.item(0) as DatabaseSyncStatus;
}

export interface SyncStatusUpdate {
  last_subjects_sync?: string | null;
  last_assignments_sync?: string | null;
  last_summary_sync?: string | null;
}

/**
 * Updates the sync status.
 * Only updates fields that are provided.
 */
export async function updateSyncStatus(
  update: SyncStatusUpdate,
): Promise<void> {
  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (update.last_subjects_sync !== undefined) {
    updates.push('last_subjects_sync = ?');
    values.push(update.last_subjects_sync);
  }
  if (update.last_assignments_sync !== undefined) {
    updates.push('last_assignments_sync = ?');
    values.push(update.last_assignments_sync);
  }
  if (update.last_summary_sync !== undefined) {
    updates.push('last_summary_sync = ?');
    values.push(update.last_summary_sync);
  }

  if (updates.length === 0) return;

  updates.push('updated_at = CURRENT_TIMESTAMP');

  await executeSql(
    `UPDATE sync_status SET ${updates.join(', ')} WHERE id = 1`,
    values,
  );
}

/**
 * Resets all sync timestamps to null.
 */
export async function resetSyncStatus(): Promise<void> {
  await executeSql(
    `UPDATE sync_status SET
       last_subjects_sync = NULL,
       last_assignments_sync = NULL,
       last_summary_sync = NULL,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`,
    [],
  );
}

// ============================================
// Database Migrations
// ============================================

interface Migration {
  version: number;
  description: string;
  up: string[];
}

// Migrations are stored in order. Each migration contains SQL statements to run.
// Version 1 is the initial schema, so no migrations needed yet.
const MIGRATIONS: Migration[] = [
  // Example migration for future use:
  // {
  //   version: 2,
  //   description: 'Add some_new_column to subjects table',
  //   up: [
  //     'ALTER TABLE subjects ADD COLUMN some_new_column TEXT',
  //   ],
  // },
];

/**
 * Creates the schema_version table if it doesn't exist.
 */
const CREATE_SCHEMA_VERSION_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`;

/**
 * Gets the current schema version from the database.
 * Returns 0 if no version is recorded (fresh database).
 */
export async function getSchemaVersion(): Promise<number> {
  try {
    const result = await executeSql(
      'SELECT MAX(version) as version FROM schema_version',
      [],
    );
    const row = result.rows.item(0);
    return row?.version ?? 0;
  } catch {
    // Table doesn't exist yet
    return 0;
  }
}

/**
 * Records a schema version as applied.
 */
async function recordSchemaVersion(version: number): Promise<void> {
  await executeSql(
    'INSERT OR IGNORE INTO schema_version (version) VALUES (?)',
    [version],
  );
}

/**
 * Runs all pending migrations.
 * Safe to call multiple times - only runs migrations not yet applied.
 */
export async function runMigrations(): Promise<{
  applied: number[];
  currentVersion: number;
}> {
  const database = await getDatabase();

  // Ensure schema_version table exists
  await database.executeSql(CREATE_SCHEMA_VERSION_TABLE);

  // If this is a fresh database, record the initial version
  const currentVersion = await getSchemaVersion();
  if (currentVersion === 0) {
    await recordSchemaVersion(DATABASE_VERSION);
    return { applied: [], currentVersion: DATABASE_VERSION };
  }

  // Find and run pending migrations
  const pendingMigrations = MIGRATIONS.filter(m => m.version > currentVersion);
  const applied: number[] = [];

  for (const migration of pendingMigrations) {
    await database.transaction(async tx => {
      for (const sql of migration.up) {
        tx.executeSql(sql);
      }
    });
    await recordSchemaVersion(migration.version);
    applied.push(migration.version);
  }

  const newVersion = await getSchemaVersion();
  return { applied, currentVersion: newVersion };
}

/**
 * Initializes the database with schema and runs any pending migrations.
 * This is the main entry point for database setup.
 */
export async function initializeDatabaseWithMigrations(): Promise<boolean> {
  const initialized = await initializeDatabase();
  if (!initialized) {
    return false;
  }

  try {
    await runMigrations();
    return true;
  } catch (error) {
    console.error('Failed to run migrations:', error);
    return false;
  }
}
