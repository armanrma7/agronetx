/**
 * Notifications Store
 * Manages the notifications list, unread count, and mark-as-seen actions.
 */
import { create } from 'zustand'
import * as notificationsAPI from '../../lib/api/notifications.api'
import type { NotificationItem } from '../../lib/api/notifications.api'

export type NotificationsTab = 'all' | 'unread'

const LIMIT = 20

let listAbortController: AbortController | null = null

interface NotificationsState {
  list: NotificationItem[]
  loading: boolean
  loadingMore: boolean
  page: number
  total: number
  hasMore: boolean
  activeTab: NotificationsTab
  unreadCount: number

  fetchNotifications: (reset?: boolean, clearList?: boolean) => Promise<void>
  fetchUnreadCount: () => Promise<void>
  loadMore: () => void
  setActiveTab: (tab: NotificationsTab) => void
  refresh: () => void
  markSeen: (id: string) => Promise<void>
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  list: [],
  loading: false,
  loadingMore: false,
  page: 1,
  total: 0,
  hasMore: true,
  activeTab: 'all',
  unreadCount: 0,

  fetchNotifications: async (reset = false, clearList = false) => {
    if (listAbortController) listAbortController.abort()
    listAbortController = new AbortController()
    const signal = listAbortController.signal

    const { activeTab } = get()
    const pageNum = reset ? 1 : get().page

    if (reset) {
      set(clearList
        ? { loading: true, list: [], page: 1, total: 0, hasMore: true }
        : { loading: true, page: 1, total: 0, hasMore: true }
      )
    } else {
      set({ loadingMore: true })
    }

    try {
      const params: notificationsAPI.GetNotificationsParams = {
        page: pageNum,
        limit: LIMIT,
        signal,
      }
      if (activeTab === 'unread') {
        params.is_seen = false
      }

      const response = await notificationsAPI.getNotificationsAPI(params)
      if (signal.aborted) return

      const items = response.notifications || []
      set(state => ({
        list: reset ? items : [...state.list, ...items],
        total: response.total || 0,
        page: response.page === pageNum ? response.page : state.page,
        hasMore: (response.page || pageNum) * LIMIT < (response.total || 0),
        loading: false,
        loadingMore: false,
      }))
    } catch (error: any) {
      if (error.name === 'AbortError' || error.name === 'CanceledError' || signal.aborted) return
      set({ loading: false, loadingMore: false, hasMore: false })
    }
  },

  fetchUnreadCount: async () => {
    try {
      const data = await notificationsAPI.getUnreadCountAPI()
      set({ unreadCount: data.count ?? 0 })
    } catch {
      // silently fail
    }
  },

  loadMore: () => {
    const { loadingMore, hasMore, loading, page } = get()
    if (!loadingMore && hasMore && !loading) {
      set({ page: page + 1 })
      get().fetchNotifications(false)
    }
  },

  setActiveTab: (tab: NotificationsTab) => {
    if (get().activeTab === tab) return
    set({ activeTab: tab })
    get().fetchNotifications(true, true)
  },

  refresh: () => {
    get().fetchNotifications(true, false)
    get().fetchUnreadCount()
  },

  markSeen: async (id: string) => {
    const notification = get().list.find(n => n.id === id)
    if (!notification || notification.is_seen) return

    // Optimistic update
    set(state => ({
      list: state.list.map(n => n.id === id ? { ...n, is_seen: true } : n),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }))

    try {
      await notificationsAPI.markNotificationSeenAPI(id)
    } catch {
      // Revert on failure
      set(state => ({
        list: state.list.map(n => n.id === id ? { ...n, is_seen: false } : n),
        unreadCount: state.unreadCount + 1,
      }))
    }
  },
}))
