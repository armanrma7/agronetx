/**
 * Favorites Store
 * Manages favoriteIds (Set) used for badges in announcement lists,
 * and the paginated favorites list shown on FavoritesPage.
 */
import { create } from 'zustand'
import { Announcement } from '../../types'
import * as announcementsAPI from '../../lib/api/announcements.api'

const LIMIT = 8

// Module-level abort controller — not stored in reactive state
let listAbortController: AbortController | null = null

interface FavoritesState {
  favoriteIds: Set<string>
  list: Announcement[]
  loading: boolean
  loadingMore: boolean
  page: number
  total: number
  hasMore: boolean

  fetchFavoriteIds: () => Promise<void>
  fetchList: (pageNum?: number, reset?: boolean, signal?: AbortSignal) => Promise<void>
  refresh: () => void
  loadMore: () => void
  addFavorite: (announcementId: string) => Promise<void>
  removeFavorite: (announcementId: string) => Promise<void>
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favoriteIds: new Set(),
  list: [],
  loading: false,
  loadingMore: false,
  page: 1,
  total: 0,
  hasMore: true,

  fetchFavoriteIds: async () => {
    try {
      const response = await announcementsAPI.getFavoritesAPI({ page: 1, limit: 100 })
      set({ favoriteIds: new Set((response.announcements || []).map((a: Announcement) => a.id)) })
    } catch {
      set({ favoriteIds: new Set() })
    }
  },

  fetchList: async (pageNum = 1, reset = false, signal?: AbortSignal) => {
    set(reset ? { loading: true } : { loadingMore: true })
    try {
      const response = await announcementsAPI.getFavoritesAPI({ page: pageNum, limit: LIMIT, signal })
      if (signal?.aborted) return
      const items = response.announcements || []
      set(state => ({
        list: reset ? items : [...state.list, ...items],
        total: response.total || 0,
        page: response.page === pageNum ? response.page : state.page,
        hasMore: (response.page || pageNum) * LIMIT < (response.total || 0),
        loading: false,
        loadingMore: false,
      }))
    } catch (error: any) {
      if (error.name === 'AbortError' || error.name === 'CanceledError' || signal?.aborted) return
      set({ loading: false, loadingMore: false, hasMore: false })
    }
  },

  refresh: () => {
    if (listAbortController) listAbortController.abort()
    listAbortController = new AbortController()
    set({ page: 1, hasMore: true })
    get().fetchList(1, true, listAbortController.signal)
  },

  loadMore: () => {
    const { loadingMore, hasMore, loading, page, fetchList } = get()
    if (!loadingMore && hasMore && !loading) {
      fetchList(page + 1, false)
    }
  },

  addFavorite: async (announcementId: string) => {
    await announcementsAPI.addFavoriteAPI(announcementId)
    set(state => ({ favoriteIds: new Set([...state.favoriteIds, announcementId]) }))
  },

  removeFavorite: async (announcementId: string) => {
    await announcementsAPI.removeFavoriteAPI(announcementId)
    set(state => {
      const newIds = new Set(state.favoriteIds)
      newIds.delete(announcementId)
      return {
        favoriteIds: newIds,
        list: state.list.filter(a => a.id !== announcementId),
        total: Math.max(0, state.total - 1),
      }
    })
  },
}))
