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
  CREATE_SYNC_STATUS_TABLE,
  CREATE_ASSIGNMENTS_SUBJECT_INDEX,
  CREATE_ASSIGNMENTS_AVAILABLE_INDEX,
  CREATE_SUBJECTS_LEVEL_INDEX,
  CREATE_SUBJECTS_TYPE_INDEX,
};
