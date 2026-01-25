import { WaniKaniClient } from '../api/wanikaniApi';
import type { SubjectData, WaniKaniResource, Meaning, Reading, KanjiReading } from '../api/types';
import {
  upsertSubjects,
  updateSyncStatus,
  type SubjectInput,
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

// ============================================
// Helpers
// ============================================

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
 * Fetches the user's current level from the WaniKani API.
 * Useful for determining maxLevel for syncSubjects.
 */
export async function getUserLevel(client: WaniKaniClient): Promise<number> {
  const user = await client.getUser();
  return user.data.level;
}
