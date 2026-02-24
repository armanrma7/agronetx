/**
 * Applications Store
 * Manages:
 * - appliedIds / pendingIds  — badges shown on AnnouncementsPage cards
 * - byAnnouncementId         — per-announcement application lists (AnnouncementApplicationsPage)
 * - myList + pagination      — MyAnnouncementsPage published & applied tabs
 * All mutations (approve/reject/close/edit) update the store optimistically.
 */
import { create } from 'zustand'
import { Announcement } from '../../types'
import * as announcementsAPI from '../../lib/api/announcements.api'
import type { ApplicationListItem, ApplicationUpdateData } from '../../lib/api/announcements.api'
import { useAuthStore } from '../auth/useAuthStore'
import { useAnnouncementsStore } from '../announcements/useAnnouncementsStore'

export type MyAnnouncementsTab = 'published' | 'applied'

const LIMIT = 8

// Module-level abort controller for the MyAnnouncements list
let myListAbortController: AbortController | null = null

interface ApplicationsState {
  // Applied / pending announcement IDs — used by AnnouncementsPage card badges
  appliedIds: Set<string>
  pendingIds: Set<string>

  // Per-announcement application lists
  byAnnouncementId: Record<string, ApplicationListItem[]>
  loadingByAnnouncementId: Record<string, boolean>
  actionLoadingId: string | null

  // MyAnnouncementsPage list + pagination
  myList: Announcement[]
  myLoading: boolean
  myLoadingMore: boolean
  myPage: number
  myTotal: number
  myHasMore: boolean
  myActiveTab: MyAnnouncementsTab
  cancellingId: string | null
  closingApplicationId: string | null

  // ── Actions ──────────────────────────────────────────────────────────────

  /** Fetch all applied announcement IDs + compute pending IDs. */
  fetchAppliedIds: (userId: string) => Promise<void>

  /** Fetch (or refresh) applications for a specific announcement. */
  fetchApplicationsByAnnouncement: (announcementId: string, refresh?: boolean) => Promise<void>

  /** Optimistically approve an application in the store. */
  approveApplication: (id: string, announcementId: string) => Promise<void>

  /** Optimistically reject an application in the store. */
  rejectApplication: (id: string, announcementId: string) => Promise<void>

  /** Optimistically close/cancel an application in the store. */
  closeApplication: (id: string, announcementId: string) => Promise<void>

  /** Optimistically update an application's fields in the store. */
  updateApplication: (id: string, data: ApplicationUpdateData, announcementId: string) => Promise<void>

  /** Submit a new application and update applied/pending ID sets. */
  submitApplication: (data: announcementsAPI.ApplicationFormData) => Promise<void>

  /** Fetch the MyAnnouncements list for the active tab. */
  fetchMyAnnouncements: (reset?: boolean, clearList?: boolean) => Promise<void>

  /** Switch tab and re-fetch. */
  setMyActiveTab: (tab: MyAnnouncementsTab) => void

  /** Refresh the current MyAnnouncements tab. */
  refreshMyAnnouncements: () => void

  /** Load next page. */
  loadMoreMyAnnouncements: () => void

  /** Cancel an announcement and remove it from myList optimistically. */
  cancelMyAnnouncement: (id: string) => Promise<void>

  /** Close a user's own application from the applied tab. */
  closeMyApplication: (applicationId: string, announcementId: string) => Promise<void>
}

export const useApplicationsStore = create<ApplicationsState>((set, get) => ({
  appliedIds: new Set(),
  pendingIds: new Set(),

  byAnnouncementId: {},
  loadingByAnnouncementId: {},
  actionLoadingId: null,

  myList: [],
  myLoading: false,
  myLoadingMore: false,
  myPage: 1,
  myTotal: 0,
  myHasMore: true,
  myActiveTab: 'published',
  cancellingId: null,
  closingApplicationId: null,

  // ── Applied IDs ──────────────────────────────────────────────────────────

  fetchAppliedIds: async (userId: string) => {
    try {
      const response = await announcementsAPI.getAppliedAnnouncementsAPI({ page: 1, limit: 200 })
      const announcements = response.announcements || []
      const applied = new Set(announcements.map((a: Announcement) => a.id))

      const myId = String(userId)
      const pending = new Set<string>()
      announcements.forEach((a: Announcement) => {
        const apps = (a as any).applications
        if (Array.isArray(apps)) {
          const hasMyPending = apps.some((app: any) => {
            const applicantId = app.applicant_id ?? app.user_id ?? app.userId
            return applicantId && String(applicantId) === myId && /^pending$/i.test((app.status || '').trim())
          })
          if (hasMyPending) pending.add(a.id)
        }
      })

      set({ appliedIds: applied, pendingIds: pending })
    } catch {
      set({ appliedIds: new Set(), pendingIds: new Set() })
    }
  },

  // ── Per-announcement applications ────────────────────────────────────────

  fetchApplicationsByAnnouncement: async (announcementId: string, refresh = false) => {
    const existing = get().byAnnouncementId[announcementId]
    if (existing && !refresh) return

    set(state => ({
      loadingByAnnouncementId: { ...state.loadingByAnnouncementId, [announcementId]: true },
    }))
    try {
      const list = await announcementsAPI.getApplicationsByAnnouncementAPI(announcementId)
      set(state => ({
        byAnnouncementId: { ...state.byAnnouncementId, [announcementId]: list },
        loadingByAnnouncementId: { ...state.loadingByAnnouncementId, [announcementId]: false },
      }))
    } catch {
      set(state => ({
        loadingByAnnouncementId: { ...state.loadingByAnnouncementId, [announcementId]: false },
      }))
      throw new Error('Failed to fetch applications')
    }
  },

  approveApplication: async (id: string, announcementId: string) => {
    set({ actionLoadingId: id })
    try {
      await announcementsAPI.approveApplicationAPI(id)
      set(state => ({
        actionLoadingId: null,
        byAnnouncementId: {
          ...state.byAnnouncementId,
          [announcementId]: (state.byAnnouncementId[announcementId] || []).map(app =>
            app.id === id ? { ...app, status: 'approved' } : app,
          ),
        },
      }))
    } catch (error) {
      set({ actionLoadingId: null })
      throw error
    }
  },

  rejectApplication: async (id: string, announcementId: string) => {
    set({ actionLoadingId: id })
    try {
      await announcementsAPI.rejectApplicationAPI(id)
      set(state => ({
        actionLoadingId: null,
        byAnnouncementId: {
          ...state.byAnnouncementId,
          [announcementId]: (state.byAnnouncementId[announcementId] || []).map(app =>
            app.id === id ? { ...app, status: 'rejected' } : app,
          ),
        },
      }))
    } catch (error) {
      set({ actionLoadingId: null })
      throw error
    }
  },

  closeApplication: async (id: string, announcementId: string) => {
    set({ actionLoadingId: id })
    try {
      await announcementsAPI.closeApplicationAPI(id)
      const currentUserId = useAuthStore.getState().user?.id
      set(state => {
        const apps = state.byAnnouncementId[announcementId] || []
        const closedApp = apps.find(app => app.id === id)
        const updatedApps = apps.map(app =>
          app.id === id ? { ...app, status: 'closed' } : app,
        )

        // Only remove from applied/pending sets when the user cancelled their OWN application.
        // When the owner closes someone else's application those sets must stay intact.
        const isOwnApplication =
          currentUserId != null &&
          closedApp != null &&
          String(closedApp.user_id) === String(currentUserId)

        const newApplied = new Set(state.appliedIds)
        const newPending = new Set(state.pendingIds)
        if (isOwnApplication) {
          newApplied.delete(announcementId)
          newPending.delete(announcementId)
        }

        return {
          actionLoadingId: null,
          byAnnouncementId: { ...state.byAnnouncementId, [announcementId]: updatedApps },
          appliedIds: newApplied,
          pendingIds: newPending,
        }
      })
    } catch (error) {
      set({ actionLoadingId: null })
      throw error
    }
  },

  updateApplication: async (id: string, data: ApplicationUpdateData, announcementId: string) => {
    await announcementsAPI.updateApplicationAPI(id, data)
    set(state => ({
      byAnnouncementId: {
        ...state.byAnnouncementId,
        [announcementId]: (state.byAnnouncementId[announcementId] || []).map(app =>
          app.id === id ? { ...app, ...data } : app,
        ),
      },
    }))
  },

  submitApplication: async (data: announcementsAPI.ApplicationFormData) => {
    await announcementsAPI.submitApplicationAPI(data)
    // Update applied/pending sets
    set(state => ({
      appliedIds: new Set([...state.appliedIds, data.announcement_id]),
      pendingIds: new Set([...state.pendingIds, data.announcement_id]),
    }))
    // Increment applications_count on the announcement in the announcements store
    const id = data.announcement_id
    useAnnouncementsStore.setState(s => {
      const cached = s.cache[id]
      return {
        cache: cached
          ? { ...s.cache, [id]: { ...cached, applications_count: (cached.applications_count ?? 0) + 1 } }
          : s.cache,
        list: s.list.map(a =>
          a.id === id ? { ...a, applications_count: (a.applications_count ?? 0) + 1 } : a,
        ),
      }
    })
  },

  // ── MyAnnouncements list ─────────────────────────────────────────────────

  fetchMyAnnouncements: async (reset = false, clearList = false) => {
    const { myActiveTab } = get()
    const pageNum = reset ? 1 : get().myPage

    if (reset) {
      set(clearList
        ? { myLoading: true, myList: [], myPage: 1, myTotal: 0, myHasMore: true }
        : { myLoading: true, myPage: 1, myTotal: 0, myHasMore: true }
      )
    } else {
      set({ myLoadingMore: true })
    }

    if (myListAbortController) myListAbortController.abort()
    myListAbortController = new AbortController()
    const signal = myListAbortController.signal

    try {
      let response
      if (myActiveTab === 'published') {
        response = await announcementsAPI.getMyAnnouncementsAPI({ page: pageNum, limit: LIMIT, signal })
      } else {
        response = await announcementsAPI.getAppliedAnnouncementsAPI({ page: pageNum, limit: LIMIT, signal })
      }

      if (signal.aborted) return

      const items = response.announcements || []
      set(state => ({
        myList: reset ? items : [...state.myList, ...items],
        myTotal: response.total || 0,
        myPage: response.page === pageNum ? response.page : state.myPage,
        myHasMore: (response.page || pageNum) * LIMIT < (response.total || 0),
        myLoading: false,
        myLoadingMore: false,
      }))
    } catch (error: any) {
      if (error.name === 'AbortError' || error.name === 'CanceledError' || signal.aborted) return
      set({ myLoading: false, myLoadingMore: false, myHasMore: false })
    }
  },

  setMyActiveTab: (tab: MyAnnouncementsTab) => {
    if (get().myActiveTab === tab) return
    set({ myActiveTab: tab })
    get().fetchMyAnnouncements(true, true)
  },

  refreshMyAnnouncements: () => {
    get().fetchMyAnnouncements(true)
  },

  loadMoreMyAnnouncements: () => {
    const { myLoadingMore, myHasMore, myLoading, myPage } = get()
    if (!myLoadingMore && myHasMore && !myLoading) {
      set({ myPage: myPage + 1 })
      get().fetchMyAnnouncements(false)
    }
  },

  cancelMyAnnouncement: async (id: string) => {
    set({ cancellingId: id })
    try {
      await announcementsAPI.cancelAnnouncementAPI(id)
      // Update myList
      set(state => ({
        cancellingId: null,
        myList: state.myList.map(a => a.id === id ? { ...a, status: 'cancelled' } : a),
      }))
      // Sync status to the announcements store (cache + browseable list)
      useAnnouncementsStore.setState(s => ({
        cache: s.cache[id]
          ? { ...s.cache, [id]: { ...s.cache[id], status: 'cancelled' } }
          : s.cache,
        list: s.list.map(a => a.id === id ? { ...a, status: 'cancelled' } : a),
      }))
    } catch (error) {
      set({ cancellingId: null })
      throw error
    }
  },

  closeMyApplication: async (applicationId: string, announcementId: string) => {
    set({ closingApplicationId: applicationId })
    try {
      await announcementsAPI.closeApplicationAPI(applicationId)
      set(state => {
        const newApplied = new Set(state.appliedIds)
        const newPending = new Set(state.pendingIds)
        if (announcementId) {
          newApplied.delete(announcementId)
          newPending.delete(announcementId)
        }
        return {
          closingApplicationId: null,
          appliedIds: newApplied,
          pendingIds: newPending,
          myList: state.myList.filter(a => a.id !== announcementId),
        }
      })
      // Decrement applications_count on the announcement in the announcements store
      if (announcementId) {
        useAnnouncementsStore.setState(s => {
          const cached = s.cache[announcementId]
          return {
            cache: cached
              ? {
                  ...s.cache,
                  [announcementId]: {
                    ...cached,
                    applications_count: Math.max(0, (cached.applications_count ?? 1) - 1),
                  },
                }
              : s.cache,
            list: s.list.map(a =>
              a.id === announcementId
                ? { ...a, applications_count: Math.max(0, (a.applications_count ?? 1) - 1) }
                : a,
            ),
          }
        })
      }
    } catch (error) {
      set({ closingApplicationId: null })
      throw error
    }
  },
}))
