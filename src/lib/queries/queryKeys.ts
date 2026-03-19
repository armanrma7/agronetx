/**
 * Centralised React Query key factory.
 * Every key is a tuple so that broad invalidations work correctly
 * (e.g. invalidating ['announcements'] also invalidates every sub-key).
 */
import type { FilterValues } from '../../components/FilterModal'

export type AnnouncementsTab = 'offer' | 'service' | 'rent'
export type MyAnnouncementsTab = 'published' | 'applied'
export type NotificationsTab = 'all' | 'unread'

export const queryKeys = {
  announcements: {
    all: ['announcements'] as const,
    lists: () => [...queryKeys.announcements.all, 'list'] as const,
    list: (tab: AnnouncementsTab, filters?: FilterValues) =>
      [...queryKeys.announcements.lists(), tab, filters ?? null] as const,
    details: () => [...queryKeys.announcements.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.announcements.details(), id] as const,
    myLists: () => [...queryKeys.announcements.all, 'my'] as const,
    myList: (tab: MyAnnouncementsTab) => [...queryKeys.announcements.myLists(), tab] as const,
  },

  applications: {
    all: ['applications'] as const,
    byAnnouncement: (announcementId: string) =>
      [...queryKeys.applications.all, 'byAnnouncement', announcementId] as const,
    applied: () => [...queryKeys.applications.all, 'applied'] as const,
  },

  favorites: {
    all: ['favorites'] as const,
    list: () => [...queryKeys.favorites.all, 'list'] as const,
    ids: () => [...queryKeys.favorites.all, 'ids'] as const,
  },

  notifications: {
    all: ['notifications'] as const,
    list: (tab: NotificationsTab) => [...queryKeys.notifications.all, 'list', tab] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unreadCount'] as const,
  },

  regions: {
    all: ['regions'] as const,
    list: () => [...queryKeys.regions.all, 'list'] as const,
    villages: (regionId: string) => [...queryKeys.regions.all, 'villages', regionId] as const,
  },
} as const
