/**
 * React Query hooks for Announcements & My-Announcements.
 * Server state only — UI state (active tab, filters) stays in components.
 */
import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
  InfiniteData,
} from '@tanstack/react-query'
import { queryKeys, AnnouncementsTab, MyAnnouncementsTab } from '../lib/queries/queryKeys'
import * as announcementsAPI from '../lib/api/announcements.api'
import type { FilterValues } from '../components/FilterModal'
import type { Announcement, AnnouncementType } from '../types'

const LIMIT = 8

// ─── Helpers ───────────────────────────────────────────────────────────────

function tabToCategory(tab: AnnouncementsTab): AnnouncementType {
  return tab === 'offer' ? 'goods' : (tab as AnnouncementType)
}

function buildListParams(
  tab: AnnouncementsTab,
  filters: FilterValues | undefined,
  pageNum: number,
): announcementsAPI.GetAnnouncementsParams {
  const params: announcementsAPI.GetAnnouncementsParams = {
    category: tabToCategory(tab),
    status: 'published',
    page: pageNum,
    limit: LIMIT,
  }

  if (filters) {
    if (filters.categories?.length) params.category = filters.categories
    if (filters.type) params.type = filters.type
    if (filters.groups?.length) params.group_id = filters.groups
    if (filters.subGroups?.length) params.subgroup_id = filters.subGroups
    if (filters.itemIds?.length) params.item_id = filters.itemIds
    if (filters.status) params.status = filters.status as 'published' | 'completed' | 'cancelled'
    if (filters.regions?.length) params.region = filters.regions
    if (filters.villages?.length) params.village = filters.villages
    if (filters.created_from) params.created_from = filters.created_from
    if (filters.created_to) params.created_to = filters.created_to
    if (filters.price_from) params.price_from = filters.price_from
    if (filters.price_to) params.price_to = filters.price_to
  }

  return params
}

// ─── Public browseable list ─────────────────────────────────────────────────

export function useAnnouncementsList(tab: AnnouncementsTab, filters?: FilterValues) {
  return useInfiniteQuery({
    queryKey: queryKeys.announcements.list(tab, filters),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      announcementsAPI.getAnnouncementsAPI(buildListParams(tab, filters, pageParam as number)),
    getNextPageParam: (lastPage) => {
      const currentPage = lastPage.page ?? 1
      const hasMore = currentPage * LIMIT < (lastPage.total ?? 0)
      return hasMore ? currentPage + 1 : undefined
    },
    staleTime: 2 * 60 * 1000, // list data is stale faster (2 min)
  })
}

/** Flatten infinite pages → single flat array for FlatList */
export function flattenAnnouncementPages(
  data?: InfiniteData<announcementsAPI.PaginatedResponse<Announcement>>,
): Announcement[] {
  return data?.pages.flatMap(p => p.announcements ?? []) ?? []
}

// ─── Single announcement detail ─────────────────────────────────────────────

export function useAnnouncementDetail(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.announcements.detail(id),
    queryFn: () => announcementsAPI.getAnnouncementByIdAPI(id),
    enabled: enabled && !!id,
    staleTime: 60 * 1000,
  })
}

// ─── My Announcements (published & applied tabs) ────────────────────────────

export function useMyAnnouncements(tab: MyAnnouncementsTab) {
  return useInfiniteQuery({
    queryKey: queryKeys.announcements.myList(tab),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const p = pageParam as number
      return tab === 'published'
        ? announcementsAPI.getMyAnnouncementsAPI({ page: p, limit: LIMIT })
        : announcementsAPI.getAppliedAnnouncementsAPI({ page: p, limit: LIMIT })
    },
    getNextPageParam: (lastPage) => {
      const currentPage = lastPage.page ?? 1
      const hasMore = currentPage * LIMIT < (lastPage.total ?? 0)
      return hasMore ? currentPage + 1 : undefined
    },
  })
}

// ─── Cancel announcement ─────────────────────────────────────────────────────

function updateAnnouncementStatusInLists(qc: ReturnType<typeof useQueryClient>, id: string, status: string) {
  const updater = (a: Announcement) => a.id === id ? { ...a, status } : a
  qc.setQueriesData(
    { queryKey: queryKeys.announcements.lists() },
    (old: any) => old?.pages ? { ...old, pages: old.pages.map((p: any) => ({ ...p, announcements: (p.announcements ?? []).map(updater) })) } : old,
  )
  qc.setQueriesData(
    { queryKey: queryKeys.announcements.myLists() },
    (old: any) => old?.pages ? { ...old, pages: old.pages.map((p: any) => ({ ...p, announcements: (p.announcements ?? []).map(updater) })) } : old,
  )
}

export function useCancelAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => announcementsAPI.cancelAnnouncementAPI(id),
    onSuccess: (_, id) => {
      qc.setQueryData<Announcement>(
        queryKeys.announcements.detail(id),
        (old) => old ? { ...old, status: 'CANCELED' } : old,
      )
      updateAnnouncementStatusInLists(qc, id, 'CANCELED')
    },
  })
}

// ─── Close announcement ──────────────────────────────────────────────────────

export function useCloseAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => announcementsAPI.closeAnnouncementAPI(id),
    onSuccess: (_, id) => {
      qc.setQueryData<Announcement>(
        queryKeys.announcements.detail(id),
        (old) => old ? { ...old, status: 'CLOSED' } : old,
      )
      updateAnnouncementStatusInLists(qc, id, 'CLOSED')
    },
  })
}
