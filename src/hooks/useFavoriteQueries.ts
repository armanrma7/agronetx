/**
 * React Query hooks for Favorites.
 *
 * Cache storage strategy
 * ─────────────────────
 * We store PLAIN ARRAYS in the cache (JSON-serializable → React Query's structural
 * sharing works correctly and detects changes).  Each subscriber receives a `Set<string>`
 * derived via `select:` so callers always get O(1) lookup without any manual conversion.
 *
 * Optimistic updates
 * ──────────────────
 * `onMutate` updates the cache instantly; `onError` rolls back; `onSettled` refetches
 * to confirm the server state.
 */
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../lib/queries/queryKeys'
import * as announcementsAPI from '../lib/api/announcements.api'
import type { Announcement } from '../types'

const LIMIT = 8

// ─── Favorite IDs ─────────────────────────────────────────────────────────────
// Raw cache = string[] (serializable). Callers receive Set<string> via `select`.

export function useFavoriteIds(enabled = true) {
  return useQuery({
    queryKey: queryKeys.favorites.ids(),
    queryFn: async (): Promise<string[]> => {
      const res = await announcementsAPI.getFavoritesAPI({ page: 1, limit: 200 })
      return (res.announcements ?? []).map((a: Announcement) => a.id)
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    select: (ids) => new Set(ids),
  })
}

// ─── Paginated favorites list ────────────────────────────────────────────────

export function useFavoritesList(enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.favorites.list(),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      announcementsAPI.getFavoritesAPI({ page: pageParam as number, limit: LIMIT }),
    getNextPageParam: (lastPage) => {
      const currentPage = lastPage.page ?? 1
      const hasMore = currentPage * LIMIT < (lastPage.total ?? 0)
      return hasMore ? currentPage + 1 : undefined
    },
    enabled,
  })
}

/** Flatten infinite pages → flat array for FlatList */
export function flattenFavoritePages(
  data?: ReturnType<typeof useFavoritesList>['data'],
): Announcement[] {
  return data?.pages.flatMap(p => p.announcements ?? []) ?? []
}

// ─── Add favorite ─────────────────────────────────────────────────────────────

export function useAddFavorite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (announcementId: string) => announcementsAPI.addFavoriteAPI(announcementId),

    // Instant UI: update ids array before network call
    onMutate: async (announcementId) => {
      await qc.cancelQueries({ queryKey: queryKeys.favorites.ids() })
      const previous = qc.getQueryData<string[]>(queryKeys.favorites.ids())
      qc.setQueryData<string[]>(queryKeys.favorites.ids(), (old = []) =>
        old.includes(announcementId) ? old : [...old, announcementId],
      )
      return { previous }
    },

    // Rollback on error
    onError: (_, __, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(queryKeys.favorites.ids(), context.previous)
      }
    },

    // Always sync with server after mutation settles
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.favorites.ids() })
    },
  })
}

// ─── Remove favorite ──────────────────────────────────────────────────────────

export function useRemoveFavorite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (announcementId: string) => announcementsAPI.removeFavoriteAPI(announcementId),

    // Instant UI: remove from ids array and from list pages
    onMutate: async (announcementId) => {
      await qc.cancelQueries({ queryKey: queryKeys.favorites.ids() })
      await qc.cancelQueries({ queryKey: queryKeys.favorites.list() })

      const previousIds = qc.getQueryData<string[]>(queryKeys.favorites.ids())
      const previousList = qc.getQueryData(queryKeys.favorites.list())

      qc.setQueryData<string[]>(queryKeys.favorites.ids(), (old = []) =>
        old.filter(id => id !== announcementId),
      )
      qc.setQueryData(queryKeys.favorites.list(), (old: any) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            announcements: (page.announcements ?? []).filter(
              (a: Announcement) => a.id !== announcementId,
            ),
            total: Math.max(0, (page.total ?? 1) - 1),
          })),
        }
      })

      return { previousIds, previousList }
    },

    // Rollback on error
    onError: (_, __, context) => {
      if (context?.previousIds !== undefined) {
        qc.setQueryData(queryKeys.favorites.ids(), context.previousIds)
      }
      if (context?.previousList !== undefined) {
        qc.setQueryData(queryKeys.favorites.list(), context.previousList)
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.favorites.ids() })
      qc.invalidateQueries({ queryKey: queryKeys.favorites.list() })
    },
  })
}
