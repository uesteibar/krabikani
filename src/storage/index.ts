export {
  saveApiKey,
  getApiKey,
  clearApiKey,
  hasApiKey,
  type SecureStorageResult,
} from './secureStorage';

export {
  // Database core
  getDatabase,
  initializeDatabase,
  initializeDatabaseWithMigrations,
  closeDatabase,
  executeSql,
  getDatabaseVersion,
  getDatabaseName,
  _resetDatabaseInstance,
  SCHEMA,
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
  // Pending Review CRUD
  insertPendingReview,
  getPendingReviewById,
  getAllPendingReviews,
  deletePendingReview,
  deleteAllPendingReviews,
  getPendingReviewCount,
  // Sync Status CRUD
  getSyncStatus,
  updateSyncStatus,
  resetSyncStatus,
  // Migrations
  getSchemaVersion,
  runMigrations,
  // Types
  type DatabaseSubject,
  type DatabaseAssignment,
  type DatabasePendingReview,
  type DatabaseSyncStatus,
  type SubjectInput,
  type AssignmentInput,
  type PendingReviewInput,
  type SyncStatusUpdate,
} from './database';
