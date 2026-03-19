/**
 * React Query hooks for Notifications.
 */
import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { queryKeys, NotificationsTab } from '../lib/queries/queryKeys'
import * as notificationsAPI from '../lib/api/notifications.api'
import type { NotificationItem } from '../lib/api/notifications.api'

const LIMIT = 20

// ─── Notifications list ──────────────────────────────────────────────────────

export function useNotificationsList(tab: NotificationsTab, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.notifications.list(tab),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const params: notificationsAPI.GetNotificationsParams = {
        page: pageParam as number,
        limit: LIMIT,
      }
      if (tab === 'unread') params.is_seen = false
      return notificationsAPI.getNotificationsAPI(params)
    },
    getNextPageParam: (lastPage) => {
      const currentPage = lastPage.page ?? 1
      const hasMore = currentPage * LIMIT < (lastPage.total ?? 0)
      return hasMore ? currentPage + 1 : undefined
    },
    enabled,
    staleTime: 30 * 1000, // notifications go stale quickly
  })
}

/** Flatten infinite pages → flat array for FlatList */
export function flattenNotificationPages(
  data?: ReturnType<typeof useNotificationsList>['data'],
): NotificationItem[] {
  return data?.pages.flatMap(p => p.notifications ?? []) ?? []
}

// ─── Unread count ─────────────────────────────────────────────────────────────

export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => notificationsAPI.getUnreadCountAPI(),
    enabled,
    staleTime: 60 * 1000,
    select: (data) => data.count ?? 0,
  })
}

// ─── Mark notification as seen ───────────────────────────────────────────────

export function useMarkNotificationSeen() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsAPI.markNotificationSeenAPI(id),
    onMutate: async (id) => {
      // Optimistic update across all notification list caches
      const updatePages = (old: any) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            notifications: (page.notifications ?? []).map((n: NotificationItem) =>
              n.id === id ? { ...n, is_seen: true } : n,
            ),
          })),
        }
      }
      qc.setQueryData(queryKeys.notifications.list('all'), updatePages)
      qc.setQueryData(queryKeys.notifications.list('unread'), updatePages)

      // Decrement unread count
      qc.setQueryData<{ count: number }>(queryKeys.notifications.unreadCount(), (old) =>
        old ? { count: Math.max(0, old.count - 1) } : old,
      )
    },
    onError: (_, id) => {
      // Revert on failure
      const revertPages = (old: any) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            notifications: (page.notifications ?? []).map((n: NotificationItem) =>
              n.id === id ? { ...n, is_seen: false } : n,
            ),
          })),
        }
      }
      qc.setQueryData(queryKeys.notifications.list('all'), revertPages)
      qc.setQueryData(queryKeys.notifications.list('unread'), revertPages)
      qc.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() })
    },
  })
}
