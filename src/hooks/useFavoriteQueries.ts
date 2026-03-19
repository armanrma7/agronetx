/**
 * React Query hooks for Favorites.
 *
 * Cache storage strategy
 * ─────────────────────
 * We store PLAIN ARRAYS in the cache (JSON-serializable → React Query's structural
 * sharing works correctly and detects changes).  Each subscriber receives a `Set<string>`
 * derived via `select:` so callers always get O(1) lookup without any manual conversion.
 *
 * Cache update strategy
 * ─────────────────────
 * All mutations use setQueryData for instant updates. No invalidateQueries needed
 * because we know exactly what changed — onError rolls back on failure.
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
// Accepts { announcementId, announcement? } — pass announcement for instant list update

export function useAddFavorite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: string | { announcementId: string; announcement?: Announcement }) => {
      const id = typeof payload === 'string' ? payload : payload.announcementId
      return announcementsAPI.addFavoriteAPI(id)
    },

    onMutate: async (payload) => {
      const announcementId = typeof payload === 'string' ? payload : payload.announcementId
      const announcement = typeof payload === 'object' ? payload.announcement : undefined

      await qc.cancelQueries({ queryKey: queryKeys.favorites.ids() })
      await qc.cancelQueries({ queryKey: queryKeys.favorites.list() })

      const previousIds = qc.getQueryData<string[]>(queryKeys.favorites.ids())
      const previousList = qc.getQueryData(queryKeys.favorites.list())

      qc.setQueryData<string[]>(queryKeys.favorites.ids(), (old = []) =>
        old.includes(announcementId) ? old : [...old, announcementId],
      )

      // Flip isFavorite on the announcement object in every list cache so the
      // bookmark icon updates immediately without waiting for any refetch.
      const flipFavorite = (old: any) => {
        if (!old?.pages) return old
        return { ...old, pages: old.pages.map((p: any) => ({ ...p, announcements: (p.announcements ?? []).map((a: Announcement) => a.id === announcementId ? { ...a, isFavorite: true } : a) })) }
      }
      qc.setQueriesData({ queryKey: queryKeys.announcements.lists() }, flipFavorite)
      qc.setQueriesData({ queryKey: queryKeys.announcements.myLists() }, flipFavorite)

      if (announcement) {
        qc.setQueryData(queryKeys.favorites.list(), (old: any) => {
          if (!old?.pages?.length) return old
          const firstPage = old.pages[0]
          if ((firstPage.announcements ?? []).some((a: Announcement) => a.id === announcementId)) return old
          return {
            ...old,
            pages: [
              {
                ...firstPage,
                announcements: [{ ...announcement, isFavorite: true }, ...(firstPage.announcements ?? [])],
                total: (firstPage.total ?? 0) + 1,
              },
              ...old.pages.slice(1),
            ],
          }
        })
      }

      return { previousIds, previousList }
    },

    onError: (_, __, context) => {
      if (context?.previousIds !== undefined) qc.setQueryData(queryKeys.favorites.ids(), context.previousIds)
      if (context?.previousList !== undefined) qc.setQueryData(queryKeys.favorites.list(), context.previousList)
    },
  })
}

// ─── Remove favorite ──────────────────────────────────────────────────────────

export function useRemoveFavorite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (announcementId: string) => announcementsAPI.removeFavoriteAPI(announcementId),

    onMutate: async (announcementId) => {
      await qc.cancelQueries({ queryKey: queryKeys.favorites.ids() })
      await qc.cancelQueries({ queryKey: queryKeys.favorites.list() })

      const previousIds = qc.getQueryData<string[]>(queryKeys.favorites.ids())
      const previousList = qc.getQueryData(queryKeys.favorites.list())

      qc.setQueryData<string[]>(queryKeys.favorites.ids(), (old = []) =>
        old.filter(id => id !== announcementId),
      )

      // Flip isFavorite=false on the announcement in every list cache
      const unfavorite = (old: any) => {
        if (!old?.pages) return old
        return { ...old, pages: old.pages.map((p: any) => ({ ...p, announcements: (p.announcements ?? []).map((a: Announcement) => a.id === announcementId ? { ...a, isFavorite: false } : a) })) }
      }
      qc.setQueriesData({ queryKey: queryKeys.announcements.lists() }, unfavorite)
      qc.setQueriesData({ queryKey: queryKeys.announcements.myLists() }, unfavorite)

      qc.setQueryData(queryKeys.favorites.list(), (old: any) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            announcements: (page.announcements ?? []).filter((a: Announcement) => a.id !== announcementId),
            total: Math.max(0, (page.total ?? 1) - 1),
          })),
        }
      })

      return { previousIds, previousList }
    },

    onError: (_, __, context) => {
      if (context?.previousIds !== undefined) qc.setQueryData(queryKeys.favorites.ids(), context.previousIds)
      if (context?.previousList !== undefined) qc.setQueryData(queryKeys.favorites.list(), context.previousList)
    },
  })
}
