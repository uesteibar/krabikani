import { WaniKaniClient } from '../api/wanikaniApi';
import type {
  SubjectData,
  WaniKaniResource,
  Meaning,
  Reading,
  KanjiReading,
  AssignmentData,
} from '../api/types';
import {
  upsertSubjects,
  upsertAssignments,
  upsertAssignment,
  updateSyncStatus,
  getSyncStatus,
  insertPendingLessons,
  getAllPendingLessons,
  deletePendingLessonByAssignmentId,
  deleteAllPendingLessons,
  type SubjectInput,
  type AssignmentInput,
  type PendingLessonInput,
} from '../storage/database';

// ============================================
// Types
// ============================================

/**
 * Progress callback for sync operations.
 * @param synced Number of items synced so far
 * @param total Total number of items to sync
 */
export type SyncProgressCallback = (synced: number, total: number) => void;

export interface SyncSubjectsOptions {
  /** Maximum level to fetch subjects for (inclusive) */
  maxLevel: number;
  /** Progress callback for UI updates */
  onProgress?: SyncProgressCallback;
  /** Updated after timestamp for incremental sync */
  updatedAfter?: string;
}

export interface SyncSubjectsResult {
  success: boolean;
  syncedCount: number;
  error?: string;
}

export interface SyncAssignmentsOptions {
  /** Progress callback for UI updates */
  onProgress?: SyncProgressCallback;
  /** Updated after timestamp for incremental sync */
  updatedAfter?: string;
}

export interface SyncAssignmentsResult {
  success: boolean;
  syncedCount: number;
  error?: string;
  /** Whether the sync was resumed from a previous incomplete sync */
  resumed?: boolean;
}

// ============================================
// Helpers
// ============================================

/**
 * Converts a WaniKani API assignment to database input format.
 */
export function convertAssignmentToInput(
  resource: WaniKaniResource<AssignmentData>,
): AssignmentInput {
  const data = resource.data;
  return {
    id: resource.id,
    subject_id: data.subject_id,
    srs_stage: data.srs_stage,
    available_at: data.available_at,
    started_at: data.started_at,
    unlocked_at: data.unlocked_at,
    data_updated_at: resource.data_updated_at,
  };
}

/**
 * Converts a WaniKani API subject to database input format.
 */
export function convertSubjectToInput(
  resource: WaniKaniResource<SubjectData>,
): SubjectInput {
  const data = resource.data;
  const objectType = resource.object;

  // Extract readings based on subject type
  let readings: string | null = null;
  if ('readings' in data) {
    const readingsArray = data.readings as (Reading | KanjiReading)[];
    readings = JSON.stringify(readingsArray);
  }

  // Extract reading_mnemonic (only for kanji and vocabulary)
  let readingMnemonic: string | null = null;
  if ('reading_mnemonic' in data) {
    readingMnemonic = data.reading_mnemonic as string;
  }

  // Extract component_subject_ids (for kanji and vocabulary)
  let componentSubjectIds: string | null = null;
  if ('component_subject_ids' in data) {
    const ids = data.component_subject_ids as number[];
    componentSubjectIds = JSON.stringify(ids);
  }

  return {
    id: resource.id,
    object_type: objectType,
    characters: data.characters,
    meanings: JSON.stringify(data.meanings as Meaning[]),
    readings,
    meaning_mnemonic: data.meaning_mnemonic,
    reading_mnemonic: readingMnemonic,
    level: data.level,
    component_subject_ids: componentSubjectIds,
    data_updated_at: resource.data_updated_at,
  };
}

// ============================================
// Sync Functions
// ============================================

/**
 * Syncs all subjects up to the specified level from the WaniKani API.
 *
 * @param client WaniKani API client
 * @param options Sync options including maxLevel and progress callback
 * @returns Result of the sync operation
 */
export async function syncSubjects(
  client: WaniKaniClient,
  options: SyncSubjectsOptions,
): Promise<SyncSubjectsResult> {
  const { maxLevel, onProgress, updatedAfter } = options;

  try {
    // Build levels array from 1 to maxLevel
    const levels = Array.from({ length: maxLevel }, (_, i) => i + 1);

    // Fetch first page to get total count
    const firstPage = await client.getSubjects({
      levels,
      hidden: false,
      updated_after: updatedAfter,
    });

    const totalCount = firstPage.total_count;
    let syncedCount = 0;

    // Process first page
    const subjectsToInsert: SubjectInput[] = [];
    for (const subject of firstPage.data) {
      subjectsToInsert.push(convertSubjectToInput(subject));
    }

    if (subjectsToInsert.length > 0) {
      await upsertSubjects(subjectsToInsert);
      syncedCount += subjectsToInsert.length;
      onProgress?.(syncedCount, totalCount);
    }

    // Fetch remaining pages
    let currentPage = firstPage;
    while (currentPage.pages.next_url) {
      const nextPage = await client.getNextPage(currentPage);
      if (!nextPage) break;

      const pageSubjects: SubjectInput[] = [];
      for (const subject of nextPage.data) {
        pageSubjects.push(convertSubjectToInput(subject));
      }

      if (pageSubjects.length > 0) {
        await upsertSubjects(pageSubjects);
        syncedCount += pageSubjects.length;
        onProgress?.(syncedCount, totalCount);
      }

      currentPage = nextPage;
    }

    // Update sync status
    await updateSyncStatus({
      last_subjects_sync: new Date().toISOString(),
    });

    return {
      success: true,
      syncedCount,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during sync';
    return {
      success: false,
      syncedCount: 0,
      error: errorMessage,
    };
  }
}

/**
 * Syncs all assignments from the WaniKani API.
 *
 * This function fetches all assignments for unlocked subjects and stores them
 * in the local database. It supports:
 * - Progress callbacks for UI updates
 * - Incremental sync via updatedAfter parameter
 * - Resume capability for interrupted syncs (uses last_assignments_sync timestamp)
 *
 * @param client WaniKani API client
 * @param options Sync options including progress callback
 * @returns Result of the sync operation
 */
export async function syncAssignments(
  client: WaniKaniClient,
  options: SyncAssignmentsOptions = {},
): Promise<SyncAssignmentsResult> {
  const { onProgress } = options;
  let { updatedAfter } = options;
  let resumed = false;

  try {
    // If no updatedAfter is provided, check if we have a previous incomplete sync
    // to resume from. This allows resuming interrupted syncs.
    if (!updatedAfter) {
      const syncStatus = await getSyncStatus();
      if (syncStatus?.last_assignments_sync) {
        // We have a previous sync timestamp - use it for incremental sync
        updatedAfter = syncStatus.last_assignments_sync;
        resumed = true;
      }
    }

    // Fetch first page to get total count
    // We only fetch unlocked assignments (unlocked=true)
    const firstPage = await client.getAssignments({
      unlocked: true,
      updated_after: updatedAfter,
    });

    const totalCount = firstPage.total_count;
    let syncedCount = 0;

    // Process first page
    const assignmentsToInsert: AssignmentInput[] = [];
    for (const assignment of firstPage.data) {
      assignmentsToInsert.push(convertAssignmentToInput(assignment));
    }

    if (assignmentsToInsert.length > 0) {
      await upsertAssignments(assignmentsToInsert);
      syncedCount += assignmentsToInsert.length;
      onProgress?.(syncedCount, totalCount);
    }

    // Fetch remaining pages
    let currentPage = firstPage;
    while (currentPage.pages.next_url) {
      const nextPage = await client.getNextPage(currentPage);
      if (!nextPage) break;

      const pageAssignments: AssignmentInput[] = [];
      for (const assignment of nextPage.data) {
        pageAssignments.push(convertAssignmentToInput(assignment));
      }

      if (pageAssignments.length > 0) {
        await upsertAssignments(pageAssignments);
        syncedCount += pageAssignments.length;
        onProgress?.(syncedCount, totalCount);
      }

      currentPage = nextPage;
    }

    // Update sync status
    await updateSyncStatus({
      last_assignments_sync: new Date().toISOString(),
    });

    return {
      success: true,
      syncedCount,
      resumed,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error during sync';
    return {
      success: false,
      syncedCount: 0,
      error: errorMessage,
      resumed,
    };
  }
}

/**
 * Fetches the user's current level from the WaniKani API.
 * Useful for determining maxLevel for syncSubjects.
 */
export async function getUserLevel(client: WaniKaniClient): Promise<number> {
  const user = await client.getUser();
  return user.data.level;
}

// ============================================
// Lesson Completion Types
// ============================================

export interface LessonToComplete {
  /** The assignment ID for the lesson */
  assignmentId: number;
  /** The subject ID for the lesson */
  subjectId: number;
}

export interface CompleteLessonsOptions {
  /** Progress callback for UI updates */
  onProgress?: (completed: number, total: number) => void;
}

export interface CompleteLessonsResult {
  success: boolean;
  completedCount: number;
  queuedCount: number;
  error?: string;
}

export interface SyncPendingLessonsResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  error?: string;
}

// ============================================
// Lesson Completion Functions
// ============================================

/**
 * Completes lessons by calling PUT /assignments/:id/start for each assignment.
 *
 * If online: syncs immediately with WaniKani API and updates local database.
 * If offline (client is null): queues lessons for later sync and updates local database.
 *
 * @param client WaniKani API client (null if offline)
 * @param lessons Array of lessons to complete
 * @param options Optional configuration including progress callback
 * @returns Result with counts of completed and queued lessons
 */
export async function completeLessons(
  client: WaniKaniClient | null,
  lessons: LessonToComplete[],
  options: CompleteLessonsOptions = {},
): Promise<CompleteLessonsResult> {
  const { onProgress } = options;

  if (lessons.length === 0) {
    return {
      success: true,
      completedCount: 0,
      queuedCount: 0,
    };
  }

  const startedAt = new Date().toISOString();

  if (client === null) {
    // Offline mode: queue lessons for later sync
    try {
      const pendingLessons: PendingLessonInput[] = lessons.map(lesson => ({
        assignment_id: lesson.assignmentId,
        subject_id: lesson.subjectId,
        started_at: startedAt,
      }));

      await insertPendingLessons(pendingLessons);

      // Also update local database to mark lessons as started
      for (let i = 0; i < lessons.length; i++) {
        const lesson = lessons[i];
        await upsertAssignment({
          id: lesson.assignmentId,
          subject_id: lesson.subjectId,
          srs_stage: 1, // Initial SRS stage after lesson
          available_at: startedAt, // Available for review immediately (or API will set this)
          started_at: startedAt,
          unlocked_at: startedAt, // Keep existing or use current
          data_updated_at: startedAt,
        });
        onProgress?.(i + 1, lessons.length);
      }

      return {
        success: true,
        completedCount: 0,
        queuedCount: lessons.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error queuing lessons';
      return {
        success: false,
        completedCount: 0,
        queuedCount: 0,
        error: errorMessage,
      };
    }
  }

  // Online mode: sync immediately with WaniKani API
  let completedCount = 0;

  try {
    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i];

      // Call the WaniKani API to start the assignment
      const response = await client.startAssignment(lesson.assignmentId, {
        started_at: startedAt,
      });

      // Update local database with the API response
      await upsertAssignment({
        id: response.id,
        subject_id: response.data.subject_id,
        srs_stage: response.data.srs_stage,
        available_at: response.data.available_at,
        started_at: response.data.started_at,
        unlocked_at: response.data.unlocked_at,
        data_updated_at: response.data_updated_at,
      });

      completedCount++;
      onProgress?.(completedCount, lessons.length);
    }

    return {
      success: true,
      completedCount,
      queuedCount: 0,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error completing lessons';
    return {
      success: false,
      completedCount,
      queuedCount: 0,
      error: errorMessage,
    };
  }
}

/**
 * Syncs all pending lessons that were queued while offline.
 *
 * @param client WaniKani API client
 * @returns Result with counts of synced and failed lessons
 */
export async function syncPendingLessons(
  client: WaniKaniClient,
): Promise<SyncPendingLessonsResult> {
  try {
    const pendingLessons = await getAllPendingLessons();

    if (pendingLessons.length === 0) {
      return {
        success: true,
        syncedCount: 0,
        failedCount: 0,
      };
    }

    let syncedCount = 0;
    let failedCount = 0;

    for (const pending of pendingLessons) {
      try {
        // Call the WaniKani API to start the assignment
        const response = await client.startAssignment(pending.assignment_id, {
          started_at: pending.started_at,
        });

        // Update local database with the API response
        await upsertAssignment({
          id: response.id,
          subject_id: response.data.subject_id,
          srs_stage: response.data.srs_stage,
          available_at: response.data.available_at,
          started_at: response.data.started_at,
          unlocked_at: response.data.unlocked_at,
          data_updated_at: response.data_updated_at,
        });

        // Remove from pending queue
        await deletePendingLessonByAssignmentId(pending.assignment_id);
        syncedCount++;
      } catch {
        // Continue with next lesson on failure
        failedCount++;
      }
    }

    return {
      success: failedCount === 0,
      syncedCount,
      failedCount,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error syncing pending lessons';
    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      error: errorMessage,
    };
  }
}

/**
 * Clears all pending lessons from the queue.
 * Useful after successful sync or for cleanup.
 */
export async function clearPendingLessons(): Promise<void> {
  await deleteAllPendingLessons();
}
