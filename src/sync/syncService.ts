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
  insertPendingReview,
  getAllPendingReviews,
  deletePendingReview,
  deleteAllPendingReviews,
  type SubjectInput,
  type AssignmentInput,
  type PendingLessonInput,
  type PendingReviewInput,
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

  // Extract character_images (for radicals without Unicode characters)
  let characterImages: string | null = null;
  if ('character_images' in data && data.character_images) {
    characterImages = JSON.stringify(data.character_images);
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
    character_images: characterImages,
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

  console.log('[syncSubjects] Starting sync', { maxLevel, updatedAfter });

  try {
    // Build levels array from 1 to maxLevel
    const levels = Array.from({ length: maxLevel }, (_, i) => i + 1);
    console.log('[syncSubjects] Fetching subjects for levels:', levels);

    // Fetch first page to get total count
    console.log('[syncSubjects] Calling API getSubjects...');
    const firstPage = await client.getSubjects({
      levels,
      hidden: false,
      updated_after: updatedAfter,
    });
    console.log('[syncSubjects] First page received', {
      totalCount: firstPage.total_count,
      dataLength: firstPage.data.length,
    });

    const totalCount = firstPage.total_count;
    let syncedCount = 0;

    // Process first page
    const subjectsToInsert: SubjectInput[] = [];
    for (const subject of firstPage.data) {
      subjectsToInsert.push(convertSubjectToInput(subject));
    }

    if (subjectsToInsert.length > 0) {
      console.log(
        '[syncSubjects] Upserting first batch of',
        subjectsToInsert.length,
        'subjects',
      );
      await upsertSubjects(subjectsToInsert);
      syncedCount += subjectsToInsert.length;
      console.log('[syncSubjects] Progress:', syncedCount, '/', totalCount);
      onProgress?.(syncedCount, totalCount);
    }

    // Fetch remaining pages
    let currentPage = firstPage;
    console.log('[syncSubjects] Fetching remaining pages...');
    while (currentPage.pages.next_url) {
      console.log(
        '[syncSubjects] Fetching next page:',
        currentPage.pages.next_url,
      );
      const nextPage = await client.getNextPage(currentPage);
      if (!nextPage) break;

      const pageSubjects: SubjectInput[] = [];
      for (const subject of nextPage.data) {
        pageSubjects.push(convertSubjectToInput(subject));
      }

      if (pageSubjects.length > 0) {
        await upsertSubjects(pageSubjects);
        syncedCount += pageSubjects.length;
        console.log('[syncSubjects] Progress:', syncedCount, '/', totalCount);
        onProgress?.(syncedCount, totalCount);
      }

      currentPage = nextPage;
    }

    // Update sync status
    console.log('[syncSubjects] Updating sync status...');
    await updateSyncStatus({
      last_subjects_sync: new Date().toISOString(),
    });

    console.log('[syncSubjects] Sync complete! Total synced:', syncedCount);
    return {
      success: true,
      syncedCount,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error during sync';
    console.error('[syncSubjects] Error:', errorMessage, error);
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

  console.log('[syncAssignments] Starting sync', { updatedAfter });

  try {
    // If no updatedAfter is provided, check if we have a previous incomplete sync
    // to resume from. This allows resuming interrupted syncs.
    if (!updatedAfter) {
      const syncStatus = await getSyncStatus();
      console.log(
        '[syncAssignments] Checking for previous sync status:',
        syncStatus,
      );
      if (syncStatus?.last_assignments_sync) {
        // We have a previous sync timestamp - use it for incremental sync
        updatedAfter = syncStatus.last_assignments_sync;
        resumed = true;
        console.log('[syncAssignments] Resuming from:', updatedAfter);
      }
    }

    // Fetch first page to get total count
    // We only fetch unlocked assignments (unlocked=true)
    console.log('[syncAssignments] Calling API getAssignments...');
    const firstPage = await client.getAssignments({
      unlocked: true,
      updated_after: updatedAfter,
    });
    console.log('[syncAssignments] First page received', {
      totalCount: firstPage.total_count,
      dataLength: firstPage.data.length,
    });

    const totalCount = firstPage.total_count;
    let syncedCount = 0;

    // Process first page
    const assignmentsToInsert: AssignmentInput[] = [];
    for (const assignment of firstPage.data) {
      assignmentsToInsert.push(convertAssignmentToInput(assignment));
    }

    if (assignmentsToInsert.length > 0) {
      console.log(
        '[syncAssignments] Upserting first batch of',
        assignmentsToInsert.length,
        'assignments',
      );
      await upsertAssignments(assignmentsToInsert);
      syncedCount += assignmentsToInsert.length;
      console.log('[syncAssignments] Progress:', syncedCount, '/', totalCount);
      onProgress?.(syncedCount, totalCount);
    }

    // Fetch remaining pages
    let currentPage = firstPage;
    console.log('[syncAssignments] Fetching remaining pages...');
    while (currentPage.pages.next_url) {
      console.log(
        '[syncAssignments] Fetching next page:',
        currentPage.pages.next_url,
      );
      const nextPage = await client.getNextPage(currentPage);
      if (!nextPage) break;

      const pageAssignments: AssignmentInput[] = [];
      for (const assignment of nextPage.data) {
        pageAssignments.push(convertAssignmentToInput(assignment));
      }

      if (pageAssignments.length > 0) {
        await upsertAssignments(pageAssignments);
        syncedCount += pageAssignments.length;
        console.log(
          '[syncAssignments] Progress:',
          syncedCount,
          '/',
          totalCount,
        );
        onProgress?.(syncedCount, totalCount);
      }

      currentPage = nextPage;
    }

    // Update sync status
    console.log('[syncAssignments] Updating sync status...');
    await updateSyncStatus({
      last_assignments_sync: new Date().toISOString(),
    });

    console.log('[syncAssignments] Sync complete! Total synced:', syncedCount);
    return {
      success: true,
      syncedCount,
      resumed,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error during sync';
    console.error('[syncAssignments] Error:', errorMessage, error);
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
  console.log('[getUserLevel] Fetching user info...');
  const user = await client.getUser();
  console.log('[getUserLevel] User level:', user.data.level);
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
        error instanceof Error
          ? error.message
          : 'Unknown error queuing lessons';
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
      error instanceof Error
        ? error.message
        : 'Unknown error completing lessons';
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
      error instanceof Error
        ? error.message
        : 'Unknown error syncing pending lessons';
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

// ============================================
// Review Submission Types
// ============================================

export interface ReviewToSubmit {
  /** The assignment ID for the review */
  assignmentId: number;
  /** The subject ID for the review */
  subjectId: number;
  /** Number of incorrect meaning answers */
  incorrectMeaningAnswers: number;
  /** Number of incorrect reading answers */
  incorrectReadingAnswers: number;
}

export interface SubmitReviewsOptions {
  /** Progress callback for UI updates */
  onProgress?: (submitted: number, total: number) => void;
}

export interface SubmitReviewsResult {
  success: boolean;
  submittedCount: number;
  queuedCount: number;
  error?: string;
}

export interface SyncPendingReviewsResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  error?: string;
}

// ============================================
// Review Submission Functions
// ============================================

/**
 * Submits review results to WaniKani API.
 *
 * If online: submits immediately with retry support via WaniKaniClient.
 * If offline (client is null): queues reviews for later sync.
 *
 * @param client WaniKani API client (null if offline)
 * @param reviews Array of reviews to submit
 * @param options Optional configuration including progress callback
 * @returns Result with counts of submitted and queued reviews
 */
export async function submitReviews(
  client: WaniKaniClient | null,
  reviews: ReviewToSubmit[],
  options: SubmitReviewsOptions = {},
): Promise<SubmitReviewsResult> {
  const { onProgress } = options;

  if (reviews.length === 0) {
    return {
      success: true,
      submittedCount: 0,
      queuedCount: 0,
    };
  }

  if (client === null) {
    // Offline mode: queue reviews for later sync
    try {
      for (let i = 0; i < reviews.length; i++) {
        const review = reviews[i];
        const pendingReview: PendingReviewInput = {
          assignment_id: review.assignmentId,
          subject_id: review.subjectId,
          incorrect_meaning_answers: review.incorrectMeaningAnswers,
          incorrect_reading_answers: review.incorrectReadingAnswers,
        };
        await insertPendingReview(pendingReview);
        onProgress?.(i + 1, reviews.length);
      }

      return {
        success: true,
        submittedCount: 0,
        queuedCount: reviews.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error queuing reviews';
      return {
        success: false,
        submittedCount: 0,
        queuedCount: 0,
        error: errorMessage,
      };
    }
  }

  // Online mode: submit immediately with retry support (handled by WaniKaniClient)
  let submittedCount = 0;

  try {
    for (let i = 0; i < reviews.length; i++) {
      const review = reviews[i];

      // Call the WaniKani API to create the review
      const response = await client.createReview({
        assignment_id: review.assignmentId,
        incorrect_meaning_answers: review.incorrectMeaningAnswers,
        incorrect_reading_answers: review.incorrectReadingAnswers,
      });

      // Update local database with the assignment from the response
      const updatedAssignment = response.resources_updated.assignment;
      await upsertAssignment({
        id: updatedAssignment.id,
        subject_id: updatedAssignment.data.subject_id,
        srs_stage: updatedAssignment.data.srs_stage,
        available_at: updatedAssignment.data.available_at,
        started_at: updatedAssignment.data.started_at,
        unlocked_at: updatedAssignment.data.unlocked_at,
        data_updated_at: updatedAssignment.data_updated_at,
      });

      submittedCount++;
      onProgress?.(submittedCount, reviews.length);
    }

    return {
      success: true,
      submittedCount,
      queuedCount: 0,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown error submitting reviews';
    return {
      success: false,
      submittedCount,
      queuedCount: 0,
      error: errorMessage,
    };
  }
}

/**
 * Syncs all pending reviews that were queued while offline.
 *
 * @param client WaniKani API client
 * @returns Result with counts of synced and failed reviews
 */
export async function syncPendingReviews(
  client: WaniKaniClient,
): Promise<SyncPendingReviewsResult> {
  try {
    const pendingReviews = await getAllPendingReviews();

    if (pendingReviews.length === 0) {
      return {
        success: true,
        syncedCount: 0,
        failedCount: 0,
      };
    }

    let syncedCount = 0;
    let failedCount = 0;

    for (const pending of pendingReviews) {
      try {
        // Call the WaniKani API to create the review
        const response = await client.createReview({
          assignment_id: pending.assignment_id,
          incorrect_meaning_answers: pending.incorrect_meaning_answers,
          incorrect_reading_answers: pending.incorrect_reading_answers,
        });

        // Update local database with the assignment from the response
        const updatedAssignment = response.resources_updated.assignment;
        await upsertAssignment({
          id: updatedAssignment.id,
          subject_id: updatedAssignment.data.subject_id,
          srs_stage: updatedAssignment.data.srs_stage,
          available_at: updatedAssignment.data.available_at,
          started_at: updatedAssignment.data.started_at,
          unlocked_at: updatedAssignment.data.unlocked_at,
          data_updated_at: updatedAssignment.data_updated_at,
        });

        // Remove from pending queue
        await deletePendingReview(pending.id);
        syncedCount++;
      } catch {
        // Continue with next review on failure
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
      error instanceof Error
        ? error.message
        : 'Unknown error syncing pending reviews';
    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      error: errorMessage,
    };
  }
}

/**
 * Clears all pending reviews from the queue.
 * Useful after successful sync or for cleanup.
 */
export async function clearPendingReviews(): Promise<void> {
  await deleteAllPendingReviews();
}

// ============================================
// Sync All Pending Data
// ============================================

export interface SyncPendingDataResult {
  success: boolean;
  lessons: SyncPendingLessonsResult;
  reviews: SyncPendingReviewsResult;
}

/**
 * Syncs all pending data (lessons and reviews) when coming back online.
 * This should be called when network connectivity is restored.
 *
 * Features:
 * - Syncs pending lessons first, then pending reviews
 * - Continues syncing reviews even if some lessons fail
 * - Returns combined results for both operations
 * - Zero data loss: failed items remain in queue for retry
 *
 * @param client WaniKani API client
 * @returns Combined result with lesson and review sync results
 */
export async function syncPendingData(
  client: WaniKaniClient,
): Promise<SyncPendingDataResult> {
  // Sync pending lessons first
  const lessonsResult = await syncPendingLessons(client);

  // Then sync pending reviews (even if lessons had failures)
  const reviewsResult = await syncPendingReviews(client);

  return {
    success: lessonsResult.success && reviewsResult.success,
    lessons: lessonsResult,
    reviews: reviewsResult,
  };
}

// ============================================
// Background Sync
// ============================================

export interface BackgroundSyncResult {
  success: boolean;
  /** Whether sync was skipped (e.g., due to active session) */
  skipped: boolean;
  /** Reason for skipping if skipped is true */
  skipReason?: string;
  /** Results from syncing pending data */
  pendingData?: SyncPendingDataResult;
  /** Results from syncing subjects */
  subjects?: SyncSubjectsResult;
  /** Results from syncing assignments */
  assignments?: SyncAssignmentsResult;
  error?: string;
}

export interface BackgroundSyncOptions {
  /** Check if sync should be skipped (e.g., active session) */
  shouldSkip?: () => boolean;
  /** Reason to report if shouldSkip returns true */
  skipReason?: string;
}

/**
 * Performs a background sync operation when the app comes to the foreground.
 *
 * This function:
 * 1. Syncs any pending review/lesson submissions
 * 2. Fetches new assignments and reviews from WaniKani API
 * 3. Fetches any new subjects unlocked since last sync
 * 4. Can be configured to skip sync during active sessions
 *
 * @param client WaniKani API client
 * @param options Configuration options
 * @returns Result of the background sync operation
 */
export async function backgroundSync(
  client: WaniKaniClient,
  options: BackgroundSyncOptions = {},
): Promise<BackgroundSyncResult> {
  const { shouldSkip, skipReason } = options;

  // Check if sync should be skipped
  if (shouldSkip && shouldSkip()) {
    return {
      success: true,
      skipped: true,
      skipReason: skipReason ?? 'Sync skipped',
    };
  }

  try {
    // Step 1: Sync any pending data (offline lessons/reviews)
    const pendingResult = await syncPendingData(client);

    // Step 2: Get user level to know which subjects to fetch
    const userLevel = await getUserLevel(client);

    // Step 3: Sync subjects (will use last_subjects_sync for incremental sync)
    const syncStatus = await getSyncStatus();
    const subjectsResult = await syncSubjects(client, {
      maxLevel: userLevel,
      updatedAfter: syncStatus?.last_subjects_sync ?? undefined,
    });

    // Step 4: Sync assignments (will use last_assignments_sync for incremental sync)
    const assignmentsResult = await syncAssignments(client);

    return {
      success:
        pendingResult.success &&
        subjectsResult.success &&
        assignmentsResult.success,
      skipped: false,
      pendingData: pendingResult,
      subjects: subjectsResult,
      assignments: assignmentsResult,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown error during background sync';
    return {
      success: false,
      skipped: false,
      error: errorMessage,
    };
  }
}
