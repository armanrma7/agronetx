/**
 * React Query hooks for Applications.
 *
 * Cache storage strategy
 * ─────────────────────
 * Applied / pending IDs are stored as PLAIN ARRAYS so React Query's structural
 * sharing serialises them correctly.  Callers receive `Set<string>` via `select:`
 * for O(1) membership checks without any manual conversion.
 *
 * Optimistic updates
 * ──────────────────
 * Every mutation that affects applied/pending state updates the cache immediately
 * in `onMutate` and rolls back in `onError`.
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

      const appliedIds = announcements.map(a => a.id)
      const pendingIds: string[] = []

      const myId = String(userId)
      announcements.forEach(a => {
        const apps = (a as any).applications
        if (Array.isArray(apps)) {
          const hasMyPending = apps.some((app: any) => {
            const applicantId = app.applicant_id ?? app.user_id ?? app.userId
            return applicantId && String(applicantId) === myId && /^pending$/i.test((app.status || '').trim())
          })
          if (hasMyPending) pendingIds.push(a.id)
        }
      })
      console.info('appliedIds', appliedIds)
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
      return { previous, announcementId: id }
    },

    onError: (_, __, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(queryKeys.applications.applied(), context.previous)
      }
    },

    onSuccess: (_, data) => {
      const id = data.announcement_id
      // Increment applications_count on the detail cache
      qc.setQueryData<Announcement>(queryKeys.announcements.detail(id), (old) =>
        old ? { ...old, applications_count: (old.applications_count ?? 0) + 1 } : old,
      )
      // Invalidate lists so the count propagates to all list cards
      qc.invalidateQueries({ queryKey: queryKeys.announcements.lists() })
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.applications.applied() })
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
      qc.setQueryData<ApplicationListItem[]>(
        queryKeys.applications.byAnnouncement(announcementId),
        (old) => old?.map(app => app.id === id ? { ...app, status: 'approved' } : app),
      )
    },
    onSettled: (_, __, { announcementId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.applications.byAnnouncement(announcementId) })
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
      qc.setQueryData<ApplicationListItem[]>(
        queryKeys.applications.byAnnouncement(announcementId),
        (old) => old?.map(app => app.id === id ? { ...app, status: 'rejected' } : app),
      )
    },
    onSettled: (_, __, { announcementId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.applications.byAnnouncement(announcementId) })
    },
  })
}

// ─── Cancel application ───────────────────────────────────────────────────────

export function useCancelApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; announcementId: string; isOwnApplication: boolean }) =>
      announcementsAPI.cancelApplicationAPI(id),

    onMutate: async ({ id, announcementId, isOwnApplication }) => {
      // Instant status update in the applications list
      const previous = qc.getQueryData<ApplicationListItem[]>(
        queryKeys.applications.byAnnouncement(announcementId),
      )
      qc.setQueryData<ApplicationListItem[]>(
        queryKeys.applications.byAnnouncement(announcementId),
        (old) => old?.map(app => app.id === id ? { ...app, status: 'CANCELED' } : app),
      )
      // Remove from applied/pending if the user cancelled their OWN application
      let previousApplied: AppliedRaw | undefined
      if (isOwnApplication) {
        previousApplied = qc.getQueryData<AppliedRaw>(queryKeys.applications.applied())
        removeFromApplied(qc, announcementId)
      }
      return { previous, previousApplied, announcementId, isOwnApplication }
    },

    onError: (_, __, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(
          queryKeys.applications.byAnnouncement(context.announcementId),
          context.previous,
        )
      }
      if (context?.previousApplied !== undefined) {
        qc.setQueryData(queryKeys.applications.applied(), context.previousApplied)
      }
    },

    onSettled: (_, __, { announcementId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.applications.byAnnouncement(announcementId) })
      qc.invalidateQueries({ queryKey: queryKeys.applications.applied() })
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
      if (context?.previous !== undefined) {
        qc.setQueryData(queryKeys.applications.applied(), context.previous)
      }
    },

    onSuccess: (_, { announcementId }) => {
      qc.setQueryData<Announcement>(queryKeys.announcements.detail(announcementId), (old) =>
        old ? { ...old, applications_count: Math.max(0, (old.applications_count ?? 1) - 1) } : old,
      )
      qc.invalidateQueries({ queryKey: queryKeys.announcements.myList('applied') })
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.applications.applied() })
    },
  })
}
