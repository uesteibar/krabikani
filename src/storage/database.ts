import { open, type DB, type QueryResult } from '@op-engineering/op-sqlite';

// Database name
const DATABASE_NAME = 'wanikani.db';
// DATABASE_VERSION should match the latest migration version.
// Fresh databases are created with all schema changes included, so they
// start at this version and skip migrations that are already in the schema.
const DATABASE_VERSION = 7;

// Current database instance
let db: DB | null = null;

// ============================================
// Schema Definitions
// ============================================

/**
 * Subjects table stores WaniKani subjects (radicals, kanji, vocabulary, kana_vocabulary).
 * Complex fields (meanings, readings, component_subject_ids, auxiliary_meanings) are stored as JSON strings.
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
    character_images TEXT,
    auxiliary_meanings TEXT,
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
 * Also stores user profile data that should persist between syncs.
 */
const CREATE_SYNC_STATUS_TABLE = `
  CREATE TABLE IF NOT EXISTS sync_status (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_subjects_sync TEXT,
    last_assignments_sync TEXT,
    last_summary_sync TEXT,
    last_study_materials_sync TEXT,
    user_level INTEGER,
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
 * User synonyms table stores custom synonyms that have been synced to WaniKani.
 * These are meaning synonyms that the user has added for subjects.
 */
const CREATE_USER_SYNONYMS_TABLE = `
  CREATE TABLE IF NOT EXISTS user_synonyms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    synonym TEXT NOT NULL,
    synced_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subject_id, synonym)
  )
`;

/**
 * Pending synonyms table stores synonyms that need to be synced to WaniKani.
 * Once synced, they are moved to user_synonyms table.
 */
const CREATE_PENDING_SYNONYMS_TABLE = `
  CREATE TABLE IF NOT EXISTS pending_synonyms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    synonym TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subject_id, synonym)
  )
`;

/**
 * Index on user_synonyms for fast lookup by subject_id.
 */
const CREATE_USER_SYNONYMS_SUBJECT_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_user_synonyms_subject_id ON user_synonyms(subject_id)
`;

/**
 * Index on pending_synonyms for fast lookup by subject_id.
 */
const CREATE_PENDING_SYNONYMS_SUBJECT_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_pending_synonyms_subject_id ON pending_synonyms(subject_id)
`;

/**
 * User settings table stores local preferences (e.g., zen mode).
 * Settings are NOT cleared when user clears API key data.
 * Values are stored as JSON strings to support boolean, string, and number types.
 */
const CREATE_USER_SETTINGS_TABLE = `
  CREATE TABLE IF NOT EXISTS user_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL,
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
  CREATE_PENDING_LESSONS_TABLE,
  CREATE_SYNC_STATUS_TABLE,
  CREATE_USER_SYNONYMS_TABLE,
  CREATE_PENDING_SYNONYMS_TABLE,
  CREATE_USER_SETTINGS_TABLE,
  CREATE_ASSIGNMENTS_SUBJECT_INDEX,
  CREATE_ASSIGNMENTS_AVAILABLE_INDEX,
  CREATE_SUBJECTS_LEVEL_INDEX,
  CREATE_SUBJECTS_TYPE_INDEX,
  CREATE_USER_SYNONYMS_SUBJECT_INDEX,
  CREATE_PENDING_SYNONYMS_SUBJECT_INDEX,
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
  character_images: string | null; // JSON string of CharacterImage[] or null
  auxiliary_meanings: string | null; // JSON string of AuxiliaryMeaning[] or null
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
  last_study_materials_sync: string | null;
  user_level: number | null;
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

export interface DatabaseUserSynonym {
  id: number;
  subject_id: number;
  synonym: string;
  synced_at: string | null;
  created_at: string;
}

export interface DatabasePendingSynonym {
  id: number;
  subject_id: number;
  synonym: string;
  created_at: string;
}

export interface DatabaseUserSetting {
  setting_key: string;
  setting_value: string;
  updated_at: string;
}

/**
 * Type for setting values - supports boolean, string, and number.
 */
export type SettingValue = boolean | string | number;

// ============================================
// Database Operations
// ============================================

/**
 * Opens the database connection if not already open.
 * @returns The database instance
 */
export function getDatabase(): DB {
  if (db !== null) {
    return db;
  }

  db = open({
    name: DATABASE_NAME,
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
    const database = getDatabase();

    for (const statement of SCHEMA_STATEMENTS) {
      await database.execute(statement);
    }

    // Initialize sync_status with a single row if it doesn't exist
    await database.execute('INSERT OR IGNORE INTO sync_status (id) VALUES (1)');

    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return false;
  }
}

/**
 * Closes the database connection.
 */
export function closeDatabase(): void {
  if (db !== null) {
    db.close();
    db = null;
  }
}

/**
 * Executes a SQL query and returns the results.
 * @param sql The SQL query to execute
 * @param params Optional parameters for the query
 * @returns The query result
 */
export async function executeSql(
  sql: string,
  params: (string | number | null)[] = [],
): Promise<QueryResult> {
  const database = getDatabase();
  return database.execute(sql, params);
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
  CREATE_USER_SYNONYMS_TABLE,
  CREATE_PENDING_SYNONYMS_TABLE,
  CREATE_USER_SETTINGS_TABLE,
  CREATE_ASSIGNMENTS_SUBJECT_INDEX,
  CREATE_ASSIGNMENTS_AVAILABLE_INDEX,
  CREATE_SUBJECTS_LEVEL_INDEX,
  CREATE_SUBJECTS_TYPE_INDEX,
  CREATE_USER_SYNONYMS_SUBJECT_INDEX,
  CREATE_PENDING_SYNONYMS_SUBJECT_INDEX,
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
  character_images: string | null; // JSON string
  auxiliary_meanings: string | null; // JSON string of AuxiliaryMeaning[]
  data_updated_at: string | null;
}

/**
 * Inserts or replaces a subject in the database.
 * Uses INSERT OR REPLACE for upsert behavior.
 */
export async function upsertSubject(subject: SubjectInput): Promise<void> {
  await executeSql(
    `INSERT OR REPLACE INTO subjects
      (id, object_type, characters, meanings, readings, meaning_mnemonic, reading_mnemonic, level, component_subject_ids, character_images, auxiliary_meanings, data_updated_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM subjects WHERE id = ?), CURRENT_TIMESTAMP))`,
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
      subject.character_images,
      subject.auxiliary_meanings,
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

  const database = getDatabase();
  await database.transaction(async tx => {
    for (const subject of subjects) {
      await tx.execute(
        `INSERT OR REPLACE INTO subjects
          (id, object_type, characters, meanings, readings, meaning_mnemonic, reading_mnemonic, level, component_subject_ids, character_images, auxiliary_meanings, data_updated_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM subjects WHERE id = ?), CURRENT_TIMESTAMP))`,
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
          subject.character_images,
          subject.auxiliary_meanings,
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
  return result.rows[0] as unknown as DatabaseSubject;
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
  return result.rows as unknown as DatabaseSubject[];
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
  return result.rows as unknown as DatabaseSubject[];
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
  return result.rows as unknown as DatabaseSubject[];
}

/**
 * Retrieves all subjects.
 */
export async function getAllSubjects(): Promise<DatabaseSubject[]> {
  const result = await executeSql(
    'SELECT * FROM subjects ORDER BY level, id',
    [],
  );
  return result.rows as unknown as DatabaseSubject[];
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
  return (result.rows[0] as { count: number }).count;
}

// ============================================
// Subject Search Operations
// ============================================

/**
 * Subject type as stored in the database
 */
export type SubjectType =
  | 'radical'
  | 'kanji'
  | 'vocabulary'
  | 'kana_vocabulary';

/**
 * Represents a search result with subject data and SRS info
 */
export interface SearchResult {
  id: number;
  object_type: SubjectType;
  characters: string | null;
  meanings: string; // JSON string of Meaning[]
  readings: string | null; // JSON string of Reading[]
  meaning_mnemonic: string;
  reading_mnemonic: string | null;
  level: number;
  srs_stage: number;
  match_type: 'character' | 'meaning' | 'reading' | 'mnemonic';
}

/**
 * Searches learned subjects (started_at IS NOT NULL) by query string.
 *
 * Search behavior:
 * - Matches against: characters, meanings (all in array), readings (all in array),
 *   meaning_mnemonic, reading_mnemonic
 * - Romaji input is converted to hiragana for reading matches
 * - Case-insensitive for English text
 * - Results prioritized: character matches first, then meaning, then reading, then mnemonic
 *
 * @param query The search query string
 * @param hiraganaQuery Pre-converted hiragana version of query (for reading matching)
 * @param limit Maximum number of results to return (default 100)
 * @returns Array of search results with subject data and match type
 */
export async function searchSubjects(
  query: string,
  hiraganaQuery: string,
  limit: number = 100,
): Promise<SearchResult[]> {
  if (query.trim().length === 0) {
    return [];
  }

  const lowerQuery = query.toLowerCase().trim();
  const searchPattern = `%${lowerQuery}%`;
  const hiraganaPattern = hiraganaQuery ? `%${hiraganaQuery}%` : null;

  // Query subjects that have been learned (started_at IS NOT NULL in assignments)
  // Using a single query with CASE for priority ordering
  // LEFT JOIN user_synonyms so user-defined synonyms are searchable
  const sql = `
    SELECT DISTINCT
      s.id,
      s.object_type,
      s.characters,
      s.meanings,
      s.readings,
      s.meaning_mnemonic,
      s.reading_mnemonic,
      s.level,
      a.srs_stage,
      CASE
        WHEN s.characters IS NOT NULL AND s.characters LIKE ? THEN 1
        WHEN LOWER(s.meanings) LIKE ? THEN 2
        WHEN LOWER(us.synonym) LIKE ? THEN 2
        WHEN s.readings IS NOT NULL AND (
          LOWER(s.readings) LIKE ?
          ${hiraganaPattern ? 'OR LOWER(s.readings) LIKE ?' : ''}
        ) THEN 3
        WHEN LOWER(s.meaning_mnemonic) LIKE ? THEN 4
        WHEN s.reading_mnemonic IS NOT NULL AND LOWER(s.reading_mnemonic) LIKE ? THEN 5
        ELSE 6
      END as match_priority
    FROM subjects s
    JOIN assignments a ON s.id = a.subject_id
    LEFT JOIN user_synonyms us ON s.id = us.subject_id
    WHERE a.started_at IS NOT NULL
      AND (
        (s.characters IS NOT NULL AND s.characters LIKE ?)
        OR LOWER(s.meanings) LIKE ?
        OR LOWER(us.synonym) LIKE ?
        OR (s.readings IS NOT NULL AND (
          LOWER(s.readings) LIKE ?
          ${hiraganaPattern ? 'OR LOWER(s.readings) LIKE ?' : ''}
        ))
        OR LOWER(s.meaning_mnemonic) LIKE ?
        OR (s.reading_mnemonic IS NOT NULL AND LOWER(s.reading_mnemonic) LIKE ?)
      )
    ORDER BY match_priority, s.level, s.id
    LIMIT ?
  `;

  // Build params array based on whether we have a hiragana query
  const params: (string | number)[] = hiraganaPattern
    ? [
        // CASE params
        searchPattern, // characters
        searchPattern, // meanings
        searchPattern, // user_synonyms
        searchPattern, // readings (romaji)
        hiraganaPattern, // readings (hiragana)
        searchPattern, // meaning_mnemonic
        searchPattern, // reading_mnemonic
        // WHERE params
        searchPattern, // characters
        searchPattern, // meanings
        searchPattern, // user_synonyms
        searchPattern, // readings (romaji)
        hiraganaPattern, // readings (hiragana)
        searchPattern, // meaning_mnemonic
        searchPattern, // reading_mnemonic
        limit,
      ]
    : [
        // CASE params
        searchPattern, // characters
        searchPattern, // meanings
        searchPattern, // user_synonyms
        searchPattern, // readings
        searchPattern, // meaning_mnemonic
        searchPattern, // reading_mnemonic
        // WHERE params
        searchPattern, // characters
        searchPattern, // meanings
        searchPattern, // user_synonyms
        searchPattern, // readings
        searchPattern, // meaning_mnemonic
        searchPattern, // reading_mnemonic
        limit,
      ];

  const result = await executeSql(sql, params);

  // Map results and determine match_type based on priority
  return (
    result.rows as unknown as Array<SearchResult & { match_priority: number }>
  ).map(row => {
    let match_type: SearchResult['match_type'];
    switch (row.match_priority) {
      case 1:
        match_type = 'character';
        break;
      case 2:
        match_type = 'meaning';
        break;
      case 3:
        match_type = 'reading';
        break;
      default:
        match_type = 'mnemonic';
    }
    return {
      id: row.id,
      object_type: row.object_type as SubjectType,
      characters: row.characters,
      meanings: row.meanings,
      readings: row.readings,
      meaning_mnemonic: row.meaning_mnemonic,
      reading_mnemonic: row.reading_mnemonic,
      level: row.level,
      srs_stage: row.srs_stage,
      match_type,
    };
  });
}

/**
 * Represents a kanji that uses a specific radical.
 */
export interface KanjiUsingRadical {
  id: number;
  characters: string;
  meaning: string;
}

/**
 * Gets kanji that use a specific radical as a component.
 * Searches for kanji where component_subject_ids contains the radical ID.
 *
 * @param radicalId The ID of the radical to search for
 * @returns Array of kanji that use this radical
 */
export async function getKanjiUsingRadical(
  radicalId: number,
): Promise<KanjiUsingRadical[]> {
  // SQLite doesn't have native JSON array search, so we search for the ID
  // appearing in the JSON array string. We check for patterns like:
  // - [123, ... (at the start)
  // - , 123, ... (in the middle)
  // - , 123] (at the end)
  // - [123] (only element)
  const result = await executeSql(
    `SELECT id, characters, meanings
     FROM subjects
     WHERE object_type = 'kanji'
       AND component_subject_ids IS NOT NULL
       AND (
         component_subject_ids LIKE '[' || ? || ',%'
         OR component_subject_ids LIKE '%,' || ? || ',%'
         OR component_subject_ids LIKE '%,' || ? || ']'
         OR component_subject_ids = '[' || ? || ']'
       )
     ORDER BY level, id`,
    [radicalId, radicalId, radicalId, radicalId],
  );

  return (
    result.rows as unknown as Array<{
      id: number;
      characters: string | null;
      meanings: string;
    }>
  ).map(row => {
    // Parse meanings to get primary meaning
    let meaning = '';
    try {
      const meanings = JSON.parse(row.meanings) as Array<{
        meaning: string;
        primary: boolean;
      }>;
      const primary = meanings.find(m => m.primary);
      meaning = primary?.meaning ?? meanings[0]?.meaning ?? '';
    } catch {
      // Fallback if parsing fails
      meaning = '';
    }

    return {
      id: row.id,
      characters: row.characters ?? '',
      meaning,
    };
  });
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

  const database = getDatabase();
  await database.transaction(async tx => {
    for (const assignment of assignments) {
      await tx.execute(
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
  return result.rows[0] as unknown as DatabaseAssignment;
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
  return result.rows[0] as unknown as DatabaseAssignment;
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
  return result.rows as unknown as DatabaseAssignment[];
}

/**
 * Returns the number of reviews that became available during the current clock hour.
 * Used to avoid sending notifications when no new reviews appeared.
 */
export async function getNewReviewCountThisHour(): Promise<number> {
  const now = new Date();
  const hourStart = new Date(now);
  hourStart.setMinutes(0, 0, 0);

  const result = await executeSql(
    `SELECT COUNT(*) as count FROM assignments
     WHERE available_at IS NOT NULL
       AND available_at > ?
       AND available_at <= ?
       AND started_at IS NOT NULL
       AND srs_stage > 0`,
    [hourStart.toISOString(), now.toISOString()],
  );
  return (result.rows[0] as { count: number }).count;
}

/**
 * Retrieves all assignments available for lessons (unlocked but not started).
 * Orders by subject level then subject id to match WaniKani's lesson order.
 */
export async function getAvailableLessons(): Promise<DatabaseAssignment[]> {
  const result = await executeSql(
    `SELECT a.* FROM assignments a
     JOIN subjects s ON a.subject_id = s.id
     WHERE a.unlocked_at IS NOT NULL
       AND a.started_at IS NULL
     ORDER BY s.level, s.id`,
    [],
  );
  return result.rows as unknown as DatabaseAssignment[];
}

/**
 * Retrieves all assignments.
 */
export async function getAllAssignments(): Promise<DatabaseAssignment[]> {
  const result = await executeSql('SELECT * FROM assignments ORDER BY id', []);
  return result.rows as unknown as DatabaseAssignment[];
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
  return (result.rows[0] as { count: number }).count;
}

/**
 * Retrieves random learned items for practice mode.
 * "Learned" means srs_stage >= 5 (Guru 1 and above).
 * Excludes items that are currently pending review (available_at <= now).
 *
 * @param limit Maximum number of items to return (default 10)
 * @returns Array of assignments with their subject data joined
 */
export async function getPracticeItems(
  limit: number = 10,
): Promise<Array<DatabaseAssignment & { subject_id: number }>> {
  const now = new Date().toISOString();
  const result = await executeSql(
    `SELECT a.* FROM assignments a
     WHERE a.srs_stage >= 5
       AND a.started_at IS NOT NULL
       AND (a.available_at IS NULL OR a.available_at > ?)
     ORDER BY RANDOM()
     LIMIT ?`,
    [now, limit],
  );
  return result.rows as unknown as Array<
    DatabaseAssignment & { subject_id: number }
  >;
}

/**
 * Gets the count of items available for practice.
 * "Learned" means srs_stage >= 5 (Guru 1 and above).
 * Excludes items currently pending review (available_at <= now).
 */
export async function getPracticeItemCount(): Promise<number> {
  const now = new Date().toISOString();
  const result = await executeSql(
    `SELECT COUNT(*) as count FROM assignments
     WHERE srs_stage >= 5
       AND started_at IS NOT NULL
       AND (available_at IS NULL OR available_at > ?)`,
    [now],
  );
  return (result.rows[0] as { count: number }).count;
}

/**
 * Gets random items for reverse practice (vocabulary only).
 * "Learned" means srs_stage >= 5 (Guru 1 and above).
 * Excludes items that are currently pending review (available_at <= now).
 * Only includes vocabulary and kana_vocabulary subject types.
 *
 * @param limit Maximum number of items to return (default 10)
 * @returns Array of assignments with their subject data joined
 */
export async function getReversePracticeItems(
  limit: number = 10,
): Promise<Array<DatabaseAssignment & { subject_id: number }>> {
  const now = new Date().toISOString();
  const result = await executeSql(
    `SELECT a.* FROM assignments a
     INNER JOIN subjects s ON a.subject_id = s.id
     WHERE a.srs_stage >= 5
       AND a.started_at IS NOT NULL
       AND (a.available_at IS NULL OR a.available_at > ?)
       AND s.object_type IN ('vocabulary', 'kana_vocabulary')
     ORDER BY RANDOM()
     LIMIT ?`,
    [now, limit],
  );
  return result.rows as unknown as Array<
    DatabaseAssignment & { subject_id: number }
  >;
}

/**
 * Gets the count of items available for reverse practice (vocabulary only).
 * "Learned" means srs_stage >= 5 (Guru 1 and above).
 * Excludes items currently pending review (available_at <= now).
 * Only includes vocabulary and kana_vocabulary subject types.
 */
export async function getReversePracticeItemCount(): Promise<number> {
  const now = new Date().toISOString();
  const result = await executeSql(
    `SELECT COUNT(*) as count FROM assignments a
     INNER JOIN subjects s ON a.subject_id = s.id
     WHERE a.srs_stage >= 5
       AND a.started_at IS NOT NULL
       AND (a.available_at IS NULL OR a.available_at > ?)
       AND s.object_type IN ('vocabulary', 'kana_vocabulary')`,
    [now],
  );
  return (result.rows[0] as { count: number }).count;
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
  const row = result.rows[0] as { next_review: string | null } | undefined;
  return row?.next_review ?? null;
}

/**
 * Subject types that count as "learned" vocabulary.
 * WaniKani has both 'vocabulary' and 'kana_vocabulary' types.
 */
export type LearnedSubjectType = 'kanji' | 'vocabulary';

/**
 * Represents an hourly bucket of upcoming reviews.
 */
export interface UpcomingReviewsHourBucket {
  hour: Date;
  count: number;
}

/**
 * Gets the count of "learned" items for a given subject type.
 * "Learned" means srs_stage >= 5 (Guru or above).
 * For vocabulary type, includes both 'vocabulary' and 'kana_vocabulary' subjects.
 */
export async function getLearnedCount(
  subjectType: LearnedSubjectType,
): Promise<number> {
  // Determine which object types to include
  const objectTypes =
    subjectType === 'vocabulary'
      ? ['vocabulary', 'kana_vocabulary']
      : [subjectType];

  const placeholders = objectTypes.map(() => '?').join(',');

  const result = await executeSql(
    `SELECT COUNT(*) as count
     FROM assignments a
     JOIN subjects s ON a.subject_id = s.id
     WHERE a.srs_stage >= 5
       AND s.object_type IN (${placeholders})`,
    objectTypes,
  );

  return (result.rows[0] as { count: number }).count;
}

export async function getKanjiPassedAtLevel(level: number): Promise<number> {
  const result = await executeSql(
    `SELECT COUNT(*) as count
     FROM assignments a
     JOIN subjects s ON a.subject_id = s.id
     WHERE s.level = ?
       AND s.object_type = 'kanji'
       AND a.srs_stage >= 5`,
    [level],
  );
  return (result.rows[0] as { count: number }).count;
}

export async function getTotalKanjiAtLevel(level: number): Promise<number> {
  const result = await executeSql(
    `SELECT COUNT(*) as count
     FROM subjects
     WHERE level = ?
       AND object_type = 'kanji'`,
    [level],
  );
  return (result.rows[0] as { count: number }).count;
}

/**
 * Gets upcoming reviews grouped by hour for the next N hours.
 * Returns an array of hourly buckets with the count of reviews available in each hour.
 * Only includes assignments where started_at is not null, srs_stage > 0, and srs_stage < 9.
 * Hours with 0 reviews are included for chart continuity.
 *
 * @param hours The number of hours to look ahead (default 12)
 * @returns Array of hourly buckets with hour timestamp and review count
 */
export async function getUpcomingReviewsByHour(
  hours: number = 12,
): Promise<UpcomingReviewsHourBucket[]> {
  const now = new Date();
  // Round down to current hour for consistent bucket labeling
  const currentHour = new Date(now);
  currentHour.setMinutes(0, 0, 0);

  // Initialize all hour buckets with 0 counts, starting from the next hour.
  // The current hour is skipped since it's partially elapsed.
  const buckets: UpcomingReviewsHourBucket[] = [];
  for (let i = 1; i <= hours; i++) {
    const hourDate = new Date(currentHour);
    hourDate.setHours(currentHour.getHours() + i);
    buckets.push({ hour: hourDate, count: 0 });
  }

  // Query from now (not from currentHour) so already-available reviews are excluded.
  // End time covers all the buckets we created.
  const endTime = new Date(currentHour);
  endTime.setHours(currentHour.getHours() + hours + 1);

  // Query assignments that become available within the time range
  // Only include started assignments (not lessons) with active SRS stages (1-8)
  const result = await executeSql(
    `SELECT available_at
     FROM assignments
     WHERE available_at IS NOT NULL
       AND available_at > ?
       AND available_at < ?
       AND started_at IS NOT NULL
       AND srs_stage > 0
       AND srs_stage < 9`,
    [now.toISOString(), endTime.toISOString()],
  );

  // Count reviews per hour bucket
  for (const row of result.rows) {
    const availableAt = new Date(
      (row as { available_at: string }).available_at,
    );
    // Find which bucket this review falls into (buckets start at hour+1)
    const hourDiff = Math.floor(
      (availableAt.getTime() - currentHour.getTime()) / (1000 * 60 * 60),
    );
    const bucketIndex = hourDiff - 1;
    if (bucketIndex >= 0 && bucketIndex < hours) {
      buckets[bucketIndex].count++;
    }
  }

  return buckets;
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
  return result.rows[0] as unknown as DatabasePendingReview;
}

/**
 * Retrieves all pending reviews.
 */
export async function getAllPendingReviews(): Promise<DatabasePendingReview[]> {
  const result = await executeSql(
    'SELECT * FROM pending_reviews ORDER BY created_at',
    [],
  );
  return result.rows as unknown as DatabasePendingReview[];
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
  return (result.rows[0] as { count: number }).count;
}

const REVIEWS_DONE_TODAY_KEY = 'reviewsDoneToday';

/**
 * Gets the number of reviews completed today.
 * Reads from a settings-based daily counter that resets each day.
 */
export async function getReviewsDoneToday(): Promise<number> {
  const stored = await getSetting(REVIEWS_DONE_TODAY_KEY);
  if (stored == null || typeof stored !== 'string') {
    return 0;
  }
  try {
    const { date, count } = JSON.parse(stored);
    const today = new Date().toISOString().slice(0, 10);
    return date === today ? count : 0;
  } catch {
    return 0;
  }
}

/**
 * Increments the daily review counter by the given amount.
 * Resets automatically when the date changes.
 */
export async function incrementReviewsDoneToday(
  count: number,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const current = await getReviewsDoneToday();
  await setSetting(
    REVIEWS_DONE_TODAY_KEY,
    JSON.stringify({ date: today, count: current + count }),
  );
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

  const database = getDatabase();
  await database.transaction(async tx => {
    for (const lesson of lessons) {
      await tx.execute(
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
  return result.rows[0] as unknown as DatabasePendingLesson;
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
  return result.rows[0] as unknown as DatabasePendingLesson;
}

/**
 * Retrieves all pending lessons.
 */
export async function getAllPendingLessons(): Promise<DatabasePendingLesson[]> {
  const result = await executeSql(
    'SELECT * FROM pending_lessons ORDER BY created_at',
    [],
  );
  return result.rows as unknown as DatabasePendingLesson[];
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
  return (result.rows[0] as { count: number }).count;
}

// ============================================
// User Synonym CRUD Operations
// ============================================

export interface UserSynonymInput {
  subject_id: number;
  synonym: string;
  synced_at?: string | null;
}

/**
 * Adds a user synonym.
 * Uses INSERT OR REPLACE to handle duplicates.
 * Returns the ID of the inserted/updated row.
 */
export async function addUserSynonym(
  synonym: UserSynonymInput,
): Promise<number> {
  const result = await executeSql(
    `INSERT OR REPLACE INTO user_synonyms (subject_id, synonym, synced_at)
     VALUES (?, ?, ?)`,
    [synonym.subject_id, synonym.synonym, synonym.synced_at ?? null],
  );
  return result.insertId ?? 0;
}

/**
 * Retrieves a user synonym by ID.
 */
export async function getUserSynonymById(
  id: number,
): Promise<DatabaseUserSynonym | null> {
  const result = await executeSql('SELECT * FROM user_synonyms WHERE id = ?', [
    id,
  ]);
  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0] as unknown as DatabaseUserSynonym;
}

/**
 * Retrieves all user synonyms for a subject.
 */
export async function getUserSynonymsBySubjectId(
  subjectId: number,
): Promise<DatabaseUserSynonym[]> {
  const result = await executeSql(
    'SELECT * FROM user_synonyms WHERE subject_id = ? ORDER BY created_at',
    [subjectId],
  );
  return result.rows as unknown as DatabaseUserSynonym[];
}

/**
 * Retrieves all user synonyms.
 */
export async function getAllUserSynonyms(): Promise<DatabaseUserSynonym[]> {
  const result = await executeSql(
    'SELECT * FROM user_synonyms ORDER BY created_at',
    [],
  );
  return result.rows as unknown as DatabaseUserSynonym[];
}

/**
 * Marks a user synonym as synced by updating synced_at timestamp.
 */
export async function markSynonymSynced(
  subjectId: number,
  synonym: string,
): Promise<void> {
  await executeSql(
    `UPDATE user_synonyms SET synced_at = CURRENT_TIMESTAMP
     WHERE subject_id = ? AND synonym = ?`,
    [subjectId, synonym],
  );
}

/**
 * Deletes a user synonym by ID.
 */
export async function deleteUserSynonym(id: number): Promise<void> {
  await executeSql('DELETE FROM user_synonyms WHERE id = ?', [id]);
}

/**
 * Deletes all user synonyms for a subject.
 */
export async function deleteUserSynonymsBySubjectId(
  subjectId: number,
): Promise<void> {
  await executeSql('DELETE FROM user_synonyms WHERE subject_id = ?', [
    subjectId,
  ]);
}

/**
 * Gets the count of user synonyms.
 */
export async function getUserSynonymCount(): Promise<number> {
  const result = await executeSql(
    'SELECT COUNT(*) as count FROM user_synonyms',
    [],
  );
  return (result.rows[0] as { count: number }).count;
}

// ============================================
// Pending Synonym CRUD Operations
// ============================================

export interface PendingSynonymInput {
  subject_id: number;
  synonym: string;
}

/**
 * Inserts a pending synonym.
 * Uses INSERT OR IGNORE to avoid duplicates.
 * Returns the ID of the inserted row (0 if ignored).
 */
export async function insertPendingSynonym(
  synonym: PendingSynonymInput,
): Promise<number> {
  const result = await executeSql(
    `INSERT OR IGNORE INTO pending_synonyms (subject_id, synonym)
     VALUES (?, ?)`,
    [synonym.subject_id, synonym.synonym],
  );
  return result.insertId ?? 0;
}

/**
 * Retrieves a pending synonym by ID.
 */
export async function getPendingSynonymById(
  id: number,
): Promise<DatabasePendingSynonym | null> {
  const result = await executeSql(
    'SELECT * FROM pending_synonyms WHERE id = ?',
    [id],
  );
  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0] as unknown as DatabasePendingSynonym;
}

/**
 * Retrieves all pending synonyms.
 */
export async function getPendingSynonyms(): Promise<DatabasePendingSynonym[]> {
  const result = await executeSql(
    'SELECT * FROM pending_synonyms ORDER BY created_at',
    [],
  );
  return result.rows as unknown as DatabasePendingSynonym[];
}

/**
 * Retrieves all pending synonyms for a subject.
 */
export async function getPendingSynonymsBySubjectId(
  subjectId: number,
): Promise<DatabasePendingSynonym[]> {
  const result = await executeSql(
    'SELECT * FROM pending_synonyms WHERE subject_id = ? ORDER BY created_at',
    [subjectId],
  );
  return result.rows as unknown as DatabasePendingSynonym[];
}

/**
 * Deletes a pending synonym by ID.
 */
export async function deletePendingSynonym(id: number): Promise<void> {
  await executeSql('DELETE FROM pending_synonyms WHERE id = ?', [id]);
}

/**
 * Deletes a pending synonym by subject ID and synonym text.
 */
export async function deletePendingSynonymBySubjectAndSynonym(
  subjectId: number,
  synonym: string,
): Promise<void> {
  await executeSql(
    'DELETE FROM pending_synonyms WHERE subject_id = ? AND synonym = ?',
    [subjectId, synonym],
  );
}

/**
 * Deletes all pending synonyms.
 */
export async function deleteAllPendingSynonyms(): Promise<void> {
  await executeSql('DELETE FROM pending_synonyms', []);
}

/**
 * Gets the count of pending synonyms.
 */
export async function getPendingSynonymCount(): Promise<number> {
  const result = await executeSql(
    'SELECT COUNT(*) as count FROM pending_synonyms',
    [],
  );
  return (result.rows[0] as { count: number }).count;
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
  return result.rows[0] as unknown as DatabaseSyncStatus;
}

export interface SyncStatusUpdate {
  last_subjects_sync?: string | null;
  last_assignments_sync?: string | null;
  last_summary_sync?: string | null;
  last_study_materials_sync?: string | null;
  user_level?: number | null;
}

/**
 * Updates the sync status.
 * Only updates fields that are provided.
 */
export async function updateSyncStatus(
  update: SyncStatusUpdate,
): Promise<void> {
  const updates: string[] = [];
  const values: (string | number | null)[] = [];

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
  if (update.last_study_materials_sync !== undefined) {
    updates.push('last_study_materials_sync = ?');
    values.push(update.last_study_materials_sync);
  }
  if (update.user_level !== undefined) {
    updates.push('user_level = ?');
    values.push(update.user_level);
  }

  if (updates.length === 0) return;

  updates.push('updated_at = CURRENT_TIMESTAMP');

  await executeSql(
    `UPDATE sync_status SET ${updates.join(', ')} WHERE id = 1`,
    values,
  );
}

/**
 * Gets the cached user level.
 * Returns null if no level has been cached yet.
 */
export async function getCachedUserLevel(): Promise<number | null> {
  const status = await getSyncStatus();
  return status?.user_level ?? null;
}

/**
 * Saves the user level to the cache.
 */
export async function saveCachedUserLevel(level: number): Promise<void> {
  await updateSyncStatus({ user_level: level });
}

/**
 * Resets all sync timestamps and user level to null.
 */
export async function resetSyncStatus(): Promise<void> {
  await executeSql(
    `UPDATE sync_status SET
       last_subjects_sync = NULL,
       last_assignments_sync = NULL,
       last_summary_sync = NULL,
       last_study_materials_sync = NULL,
       user_level = NULL,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`,
    [],
  );
}

// ============================================
// User Settings CRUD Operations
// ============================================

/**
 * Gets a setting value by key.
 * Returns null if the setting doesn't exist.
 * The value is parsed from JSON to return the original type (boolean, string, or number).
 */
export async function getSetting(key: string): Promise<SettingValue | null> {
  const result = await executeSql(
    'SELECT setting_value FROM user_settings WHERE setting_key = ?',
    [key],
  );
  if (result.rows.length === 0) {
    return null;
  }
  const row = result.rows[0] as { setting_value: string };
  try {
    return JSON.parse(row.setting_value) as SettingValue;
  } catch {
    // If parsing fails, return the raw string value
    return row.setting_value;
  }
}

/**
 * Sets a setting value by key.
 * Values are stored as JSON strings to preserve their type.
 * Uses INSERT OR REPLACE for upsert behavior.
 */
export async function setSetting(
  key: string,
  value: SettingValue,
): Promise<void> {
  const jsonValue = JSON.stringify(value);
  await executeSql(
    `INSERT OR REPLACE INTO user_settings (setting_key, setting_value, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)`,
    [key, jsonValue],
  );
}

/**
 * Gets all settings as a key-value map.
 * Values are parsed from JSON to return their original types.
 */
export async function getAllSettings(): Promise<Record<string, SettingValue>> {
  const result = await executeSql(
    'SELECT setting_key, setting_value FROM user_settings ORDER BY setting_key',
    [],
  );
  const settings: Record<string, SettingValue> = {};
  for (const row of result.rows) {
    const { setting_key, setting_value } = row as {
      setting_key: string;
      setting_value: string;
    };
    try {
      settings[setting_key] = JSON.parse(setting_value) as SettingValue;
    } catch {
      settings[setting_key] = setting_value;
    }
  }
  return settings;
}

/**
 * Deletes a setting by key.
 */
export async function deleteSetting(key: string): Promise<void> {
  await executeSql('DELETE FROM user_settings WHERE setting_key = ?', [key]);
}

/**
 * Deletes all settings.
 * Note: This is separate from clearAllData() - settings are NOT cleared
 * when the user clears their API key/synced data.
 */
export async function deleteAllSettings(): Promise<void> {
  await executeSql('DELETE FROM user_settings', []);
}

/**
 * Clears all user data from the database.
 * This removes all subjects, assignments, pending reviews, pending lessons,
 * synonyms, and resets sync status. Used when logging out or changing API keys.
 */
export async function clearAllData(): Promise<void> {
  const database = getDatabase();
  await database.transaction(async tx => {
    await tx.execute('DELETE FROM pending_reviews');
    await tx.execute('DELETE FROM pending_lessons');
    await tx.execute('DELETE FROM pending_synonyms');
    await tx.execute('DELETE FROM user_synonyms');
    await tx.execute('DELETE FROM assignments');
    await tx.execute('DELETE FROM subjects');
    await tx.execute(
      `UPDATE sync_status SET
         last_subjects_sync = NULL,
         last_assignments_sync = NULL,
         last_summary_sync = NULL,
         last_study_materials_sync = NULL,
         user_level = NULL,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`,
    );
  });
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
  {
    version: 2,
    description: 'Add character_images column to subjects table for radicals',
    up: ['ALTER TABLE subjects ADD COLUMN character_images TEXT'],
  },
  {
    version: 3,
    description: 'Add user_level column to sync_status table',
    up: ['ALTER TABLE sync_status ADD COLUMN user_level INTEGER'],
  },
  {
    version: 4,
    description: 'Add user_synonyms and pending_synonyms tables',
    up: [
      CREATE_USER_SYNONYMS_TABLE,
      CREATE_PENDING_SYNONYMS_TABLE,
      CREATE_USER_SYNONYMS_SUBJECT_INDEX,
      CREATE_PENDING_SYNONYMS_SUBJECT_INDEX,
    ],
  },
  {
    version: 5,
    description: 'Add user_settings table for local preferences',
    up: [CREATE_USER_SETTINGS_TABLE],
  },
  {
    version: 6,
    description: 'Add last_study_materials_sync column to sync_status table',
    up: ['ALTER TABLE sync_status ADD COLUMN last_study_materials_sync TEXT'],
  },
  {
    version: 7,
    description: 'Add auxiliary_meanings column to subjects table',
    up: ['ALTER TABLE subjects ADD COLUMN auxiliary_meanings TEXT'],
  },
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
    const row = result.rows[0] as { version: number | null } | undefined;
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
  const database = getDatabase();

  // Ensure schema_version table exists
  await database.execute(CREATE_SCHEMA_VERSION_TABLE);

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
        await tx.execute(sql);
      }
    });
    await recordSchemaVersion(migration.version);
    applied.push(migration.version);
  }

  const newVersion = await getSchemaVersion();
  return { applied, currentVersion: newVersion };
}

/**
 * Checks if a column exists in a table.
 */
async function columnExists(
  tableName: string,
  columnName: string,
): Promise<boolean> {
  try {
    const result = await executeSql(`PRAGMA table_info(${tableName})`, []);
    const columns = result.rows as Array<{ name: string }>;
    return columns.some(col => col.name === columnName);
  } catch {
    return false;
  }
}

/**
 * Ensures all required columns exist in the schema.
 * This handles cases where the schema version was incorrectly set
 * but the actual columns are missing.
 */
async function ensureSchemaIntegrity(): Promise<void> {
  // Check and add character_images column to subjects table
  const hasCharacterImages = await columnExists('subjects', 'character_images');
  if (!hasCharacterImages) {
    console.log('[Database] Adding missing character_images column');
    await executeSql(
      'ALTER TABLE subjects ADD COLUMN character_images TEXT',
      [],
    );
  }

  // Check and add user_level column to sync_status table
  const hasUserLevel = await columnExists('sync_status', 'user_level');
  if (!hasUserLevel) {
    console.log('[Database] Adding missing user_level column');
    await executeSql(
      'ALTER TABLE sync_status ADD COLUMN user_level INTEGER',
      [],
    );
  }

  // Check and add last_study_materials_sync column to sync_status table
  const hasStudyMaterialsSync = await columnExists(
    'sync_status',
    'last_study_materials_sync',
  );
  if (!hasStudyMaterialsSync) {
    console.log('[Database] Adding missing last_study_materials_sync column');
    await executeSql(
      'ALTER TABLE sync_status ADD COLUMN last_study_materials_sync TEXT',
      [],
    );
  }

  // Check and add auxiliary_meanings column to subjects table
  const hasAuxiliaryMeanings = await columnExists(
    'subjects',
    'auxiliary_meanings',
  );
  if (!hasAuxiliaryMeanings) {
    console.log('[Database] Adding missing auxiliary_meanings column');
    await executeSql(
      'ALTER TABLE subjects ADD COLUMN auxiliary_meanings TEXT',
      [],
    );
  }
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
    // Ensure schema integrity for databases that may have incorrect version
    await ensureSchemaIntegrity();
    return true;
  } catch (error) {
    console.error('Failed to run migrations:', error);
    return false;
  }
}
