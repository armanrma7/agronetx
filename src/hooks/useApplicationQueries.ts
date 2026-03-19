/**
 * React Query hooks for Applications.
 *
 * Cache storage strategy
 * ─────────────────────
 * Applied / pending IDs are stored as PLAIN ARRAYS so React Query's structural
 * sharing serialises them correctly.  Callers receive `Set<string>` via `select:`
 * for O(1) membership checks without any manual conversion.
 *
 * Cache update strategy
 * ─────────────────────
 * All mutations use setQueryData for instant in-memory updates. invalidateQueries
 * is used ONLY after useSubmitApplication, because the server creates a new
 * application object with a server-assigned ID that we cannot predict locally.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../lib/queries/queryKeys'
import * as announcementsAPI from '../lib/api/announcements.api'
import type { ApplicationListItem } from '../lib/api/announcements.api'
import type { Announcement } from '../types'

// ─── Raw cache shape (JSON-serializable arrays) ───────────────────────────────

interface AppliedRaw {
  appliedIds: string[]
  pendingIds: string[]
}

// What callers see after `select`
export interface AppliedSets {
  appliedIds: Set<string>
  pendingIds: Set<string>
}

// ─── Applied / pending announcement IDs ─────────────────────────────────────

export function useAppliedIds(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.applications.applied(),
    queryFn: async (): Promise<AppliedRaw> => {
      const res = await announcementsAPI.getAppliedAnnouncementsAPI({ page: 1, limit: 200 })
      const announcements: Announcement[] = res.announcements ?? []

      const myId = String(userId)
      const appliedIds: string[] = []
      const pendingIds: string[] = []

      announcements.forEach(a => {
        appliedIds.push(a.id)
        const apps: any[] = (a as any).applications ?? []
        const myApp = apps.find((app: any) => {
          const appUserId = String(app.user_id ?? app.userId ?? app.applicant_id ?? '')
          return appUserId && appUserId === myId
        })
        if (myApp) {
          if (/^pending$/i.test((myApp.status || '').trim())) pendingIds.push(a.id)
        } else if (apps.length === 0) {
          pendingIds.push(a.id)
        }
      })

      return { appliedIds, pendingIds }
    },
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000,
    select: (raw): AppliedSets => ({
      appliedIds: new Set(raw.appliedIds),
      pendingIds: new Set(raw.pendingIds),
    }),
  })
}

// ─── Applications for a specific announcement ────────────────────────────────

export function useApplicationsByAnnouncement(announcementId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.applications.byAnnouncement(announcementId),
    queryFn: () => announcementsAPI.getApplicationsByAnnouncementAPI(announcementId),
    enabled: enabled && !!announcementId,
    staleTime: 60 * 1000,
  })
}

// ─── Helpers to update raw applied cache ─────────────────────────────────────

function addToApplied(qc: ReturnType<typeof useQueryClient>, announcementId: string) {
  qc.setQueryData<AppliedRaw>(queryKeys.applications.applied(), (old) => {
    if (!old) return old
    return {
      appliedIds: old.appliedIds.includes(announcementId) ? old.appliedIds : [...old.appliedIds, announcementId],
      pendingIds: old.pendingIds.includes(announcementId) ? old.pendingIds : [...old.pendingIds, announcementId],
    }
  })
}

function removeFromApplied(qc: ReturnType<typeof useQueryClient>, announcementId: string) {
  qc.setQueryData<AppliedRaw>(queryKeys.applications.applied(), (old) => {
    if (!old) return old
    return {
      appliedIds: old.appliedIds.filter(id => id !== announcementId),
      pendingIds: old.pendingIds.filter(id => id !== announcementId),
    }
  })
}

function updateInAllLists(
  qc: ReturnType<typeof useQueryClient>,
  announcementId: string,
  updater: (a: Announcement) => Announcement,
) {
  const pagesUpdater = (old: any) => {
    if (!old?.pages) return old
    return { ...old, pages: old.pages.map((p: any) => ({ ...p, announcements: (p.announcements ?? []).map(updater) })) }
  }
  qc.setQueriesData({ queryKey: queryKeys.announcements.lists() }, pagesUpdater)
  qc.setQueriesData({ queryKey: queryKeys.announcements.myLists() }, pagesUpdater)
}

// ─── Submit new application ──────────────────────────────────────────────────

export function useSubmitApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: announcementsAPI.ApplicationFormData) =>
      announcementsAPI.submitApplicationAPI(data),

    onMutate: async (data) => {
      const id = data.announcement_id
      await qc.cancelQueries({ queryKey: queryKeys.applications.applied() })
      const previous = qc.getQueryData<AppliedRaw>(queryKeys.applications.applied())
      addToApplied(qc, id)
      // Instantly mark isApplied on all cached announcement objects
      updateInAllLists(qc, id, (a) => a.id === id ? { ...a, isApplied: true } : a)
      qc.setQueryData<Announcement>(queryKeys.announcements.detail(id), (old) =>
        old ? { ...old, isApplied: true } : old,
      )
      return { previous, announcementId: id }
    },

    onError: (_, __, context) => {
      if (context?.previous !== undefined) qc.setQueryData(queryKeys.applications.applied(), context.previous)
      // Roll back isApplied
      if (context?.announcementId) {
        const id = context.announcementId
        updateInAllLists(qc, id, (a) => a.id === id ? { ...a, isApplied: false } : a)
        qc.setQueryData<Announcement>(queryKeys.announcements.detail(id), (old) =>
          old ? { ...old, isApplied: false } : old,
        )
      }
    },

    onSuccess: (_, data) => {
      const id = data.announcement_id
      const detail = qc.getQueryData<Announcement>(queryKeys.announcements.detail(id))

      qc.setQueryData<Announcement>(queryKeys.announcements.detail(id), (old) =>
        old ? { ...old, isApplied: true, applications_count: (old.applications_count ?? 0) + 1 } : old,
      )

      if (detail) {
        qc.setQueryData(queryKeys.announcements.myList('applied'), (old: any) => {
          if (!old?.pages?.length) return old
          const firstPage = old.pages[0]
          if ((firstPage.announcements ?? []).some((a: Announcement) => a.id === id)) return old
          return {
            ...old,
            pages: [
              { ...firstPage, announcements: [{ ...detail, isApplied: true }, ...(firstPage.announcements ?? [])], total: (firstPage.total ?? 0) + 1 },
              ...old.pages.slice(1),
            ],
          }
        })
      }

      updateInAllLists(qc, id, (a) =>
        a.id === id ? { ...a, isApplied: true, applications_count: (a.applications_count ?? 0) + 1 } : a,
      )
    },

    // Only invalidate byAnnouncement — the server creates the application record
    // with a server-assigned ID that we cannot know locally.
    onSettled: (_, __, data) => {
      qc.invalidateQueries({ queryKey: queryKeys.applications.byAnnouncement(data.announcement_id) })
    },
  })
}

// ─── Update application ──────────────────────────────────────────────────────

export function useUpdateApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: announcementsAPI.ApplicationUpdateData }) =>
      announcementsAPI.updateApplicationAPI(id, data),
    onSuccess: (_, { id, data }) => {
      qc.setQueriesData<ApplicationListItem[]>(
        { queryKey: queryKeys.applications.all },
        (old) => old?.map(app => app.id === id ? { ...app, ...data } : app),
      )
    },
  })
}

// ─── Approve application ─────────────────────────────────────────────────────

export function useApproveApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; announcementId: string }) =>
      announcementsAPI.approveApplicationAPI(id),
    onSuccess: (_, { id, announcementId }) => {
      const appUpdater = (app: any) => app.id === id ? { ...app, status: 'approved' } : app
      qc.setQueryData<ApplicationListItem[]>(
        queryKeys.applications.byAnnouncement(announcementId),
        (old) => old?.map(appUpdater),
      )
      qc.setQueryData<Announcement>(
        queryKeys.announcements.detail(announcementId),
        (old) => old ? { ...old, applications: (old.applications ?? []).map(appUpdater) } : old,
      )
      updateInAllLists(qc, announcementId, (a) =>
        a.id === announcementId ? { ...a, applications: (a.applications ?? []).map(appUpdater) } : a,
      )
    },
  })
}

// ─── Reject application ──────────────────────────────────────────────────────

export function useRejectApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; announcementId: string }) =>
      announcementsAPI.rejectApplicationAPI(id),
    onSuccess: (_, { id, announcementId }) => {
      const appUpdater = (app: any) => app.id === id ? { ...app, status: 'rejected' } : app
      qc.setQueryData<ApplicationListItem[]>(
        queryKeys.applications.byAnnouncement(announcementId),
        (old) => old?.map(appUpdater),
      )
      qc.setQueryData<Announcement>(
        queryKeys.announcements.detail(announcementId),
        (old) => old ? { ...old, applications: (old.applications ?? []).map(appUpdater) } : old,
      )
      updateInAllLists(qc, announcementId, (a) =>
        a.id === announcementId ? { ...a, applications: (a.applications ?? []).map(appUpdater) } : a,
      )
    },
  })
}

// ─── Cancel application ───────────────────────────────────────────────────────

export function useCancelApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; announcementId: string; isOwnApplication: boolean }) =>
      announcementsAPI.cancelApplicationAPI(id),

    onMutate: async ({ announcementId, isOwnApplication }) => {
      let previousApplied: AppliedRaw | undefined
      if (isOwnApplication) {
        previousApplied = qc.getQueryData<AppliedRaw>(queryKeys.applications.applied())
        removeFromApplied(qc, announcementId)
      }
      return { previousApplied, announcementId, isOwnApplication }
    },

    onError: (_, __, context) => {
      if (context?.previousApplied !== undefined) qc.setQueryData(queryKeys.applications.applied(), context.previousApplied)
    },

    onSuccess: (_, { id, announcementId, isOwnApplication }) => {
      qc.setQueryData<ApplicationListItem[]>(
        queryKeys.applications.byAnnouncement(announcementId),
        (old) => old?.map(app => app.id === id ? { ...app, status: 'cancelled' } : app),
      )
      qc.setQueryData<Announcement>(
        queryKeys.announcements.detail(announcementId),
        (old) => old ? {
          ...old,
          ...(isOwnApplication ? { isApplied: false } : {}),
          applications_count: Math.max(0, (old.applications_count ?? 1) - 1),
          applications: (old.applications ?? []).map((app: any) => app.id === id ? { ...app, status: 'cancelled' } : app),
        } : old,
      )
      // Keep the announcement in myList('applied') — the user can still see it
      // with cancelled status and re-apply if needed.
      updateInAllLists(qc, announcementId, (a) =>
        a.id === announcementId ? {
          ...a,
          ...(isOwnApplication ? { isApplied: false } : {}),
          applications_count: Math.max(0, (a.applications_count ?? 1) - 1),
        } : a,
      )
    },
  })
}

// ─── Close user's own application from the applied tab ───────────────────────

export function useCloseMyApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ applicationId }: { applicationId: string; announcementId: string }) =>
      announcementsAPI.cancelApplicationAPI(applicationId),

    onMutate: async ({ announcementId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.applications.applied() })
      const previous = qc.getQueryData<AppliedRaw>(queryKeys.applications.applied())
      removeFromApplied(qc, announcementId)
      return { previous }
    },

    onError: (_, __, context) => {
      if (context?.previous !== undefined) qc.setQueryData(queryKeys.applications.applied(), context.previous)
    },

    onSuccess: (_, { announcementId }) => {
      qc.setQueryData<Announcement>(queryKeys.announcements.detail(announcementId), (old) =>
        old ? { ...old, isApplied: false, applications_count: Math.max(0, (old.applications_count ?? 1) - 1) } : old,
      )
      // Keep the announcement in myList('applied') — don't remove it.
      updateInAllLists(qc, announcementId, (a) =>
        a.id === announcementId ? { ...a, isApplied: false, applications_count: Math.max(0, (a.applications_count ?? 1) - 1) } : a,
      )
    },
  })
}
