/**
 * Announcements Store
 * Manages the browseable announcements list (tab + filters + pagination)
 * and a detail cache keyed by announcement ID.
 */
import { create } from 'zustand'
import { Announcement, AnnouncementType } from '../../types'
import * as announcementsAPI from '../../lib/api/announcements.api'
import type { FilterValues } from '../../components/FilterModal'

export type AnnouncementsTab = 'offer' | 'service' | 'rent'

const LIMIT = 8

// Module-level abort controller — not stored in reactive state
let listAbortController: AbortController | null = null

interface AnnouncementsState {
  // Browseable list (AnnouncementsPage)
  list: Announcement[]
  loading: boolean
  loadingMore: boolean
  page: number
  total: number
  hasMore: boolean
  activeTab: AnnouncementsTab
  filters: FilterValues | undefined

  // Detail cache — avoids re-fetching when navigating to a previously loaded announcement
  cache: Record<string, Announcement>

  // Actions
  fetchList: (reset?: boolean, clearList?: boolean) => Promise<void>
  loadMore: () => void
  setActiveTab: (tab: AnnouncementsTab) => void
  setActiveTabSilent: (tab: AnnouncementsTab) => void
  setFilters: (filters: FilterValues | undefined) => void
  fetchById: (id: string) => Promise<Announcement>
  cancelAnnouncement: (id: string) => Promise<void>
  setInCache: (announcement: Announcement) => void
}

export const useAnnouncementsStore = create<AnnouncementsState>((set, get) => ({
  list: [],
  loading: false,
  loadingMore: false,
  page: 1,
  total: 0,
  hasMore: true,
  activeTab: 'offer' as AnnouncementsTab,
  filters: undefined,
  cache: {},

  fetchList: async (reset = false, clearList = false) => {
    // Abort any in-flight list request
    if (listAbortController) listAbortController.abort()
    listAbortController = new AbortController()
    const signal = listAbortController.signal

    const { activeTab, filters } = get()
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
      const apiCategory: AnnouncementType = activeTab === 'offer' ? 'goods' : (activeTab as AnnouncementType)

      const params: announcementsAPI.GetAnnouncementsParams = {
        category: apiCategory,
        status: 'published',
        page: pageNum,
        limit: LIMIT,
        signal,
      }

      if (filters) {
        if (filters.categories?.length) params.category = filters.categories
        if (filters.type) params.type = filters.type
        if (filters.groups?.length) params.group_id = filters.groups
        if (filters.subGroups?.length) params.subgroup_id = filters.subGroups
        if (filters.itemIds?.length) params.item_id = filters.itemIds
        if (filters.status) params.status = filters.status as 'published' | 'active' | 'completed' | 'cancelled'
        if (filters.regions?.length) params.region = filters.regions
        if (filters.villages?.length) params.village = filters.villages
        if (filters.created_from) params.created_from = filters.created_from
        if (filters.created_to) params.created_to = filters.created_to
        if (filters.price_from) params.price_from = filters.price_from
        if (filters.price_to) params.price_to = filters.price_to
      }

      const response = await announcementsAPI.getAnnouncementsAPI(params)
      if (signal.aborted) return

      const items = Array.isArray(response.announcements) ? response.announcements : []

      // Also seed the detail cache
      const newCache: Record<string, Announcement> = {}
      items.forEach((a: Announcement) => { newCache[a.id] = a })

      set(state => ({
        list: reset ? items : [...state.list, ...items],
        total: response.total || 0,
        page: response.page === pageNum ? response.page : state.page,
        hasMore: (response.page || pageNum) * LIMIT < (response.total || 0),
        loading: false,
        loadingMore: false,
        cache: { ...state.cache, ...newCache },
      }))
    } catch (error: any) {
      if (error.name === 'AbortError' || error.name === 'CanceledError' || signal.aborted) return
      set({ loading: false, loadingMore: false, hasMore: false })
    }
  },

  loadMore: () => {
    const { loadingMore, hasMore, loading, page } = get()
    if (!loadingMore && hasMore && !loading) {
      set({ page: page + 1 })
      get().fetchList(false)
    }
  },

  setActiveTab: (tab: AnnouncementsTab) => {
    if (get().activeTab === tab) return
    set({ activeTab: tab, filters: undefined })
    get().fetchList(true, true)
  },

  setActiveTabSilent: (tab: AnnouncementsTab) => {
    set({ activeTab: tab })
  },

  setFilters: (filters: FilterValues | undefined) => {
    const prev = get().filters
    set({ filters })
    if (filters !== undefined || prev !== undefined) {
      get().fetchList(true, true)
    }
  },

  fetchById: async (id: string) => {
    const cached = get().cache[id]
    if (cached) return cached
    const data = await announcementsAPI.getAnnouncementByIdAPI(id)
    set(state => ({ cache: { ...state.cache, [id]: data } }))
    return data
  },

  cancelAnnouncement: async (id: string) => {
    await announcementsAPI.cancelAnnouncementAPI(id)
    set(state => ({
      cache: state.cache[id]
        ? { ...state.cache, [id]: { ...state.cache[id], status: 'cancelled' } }
        : state.cache,
      list: state.list.map(a => a.id === id ? { ...a, status: 'cancelled' } : a),
    }))
  },

  setInCache: (announcement: Announcement) => {
    set(state => ({ cache: { ...state.cache, [announcement.id]: announcement } }))
  },
}))
