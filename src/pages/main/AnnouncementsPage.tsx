import React, { useContext, useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useQueryClient } from '@tanstack/react-query'
import { colors } from '../../theme/colors'
import { Announcement, AnnouncementType } from '../../types'
import Icon from '../../components/Icon'
import { AnnouncementCard } from '../../components/AnnouncementCard'
import { FilterContext } from '../../navigation/HomeTabs'
import { useAuth } from '../../context/AuthContext'
import {
  useAnnouncementsList,
  flattenAnnouncementPages,
} from '../../hooks/useAnnouncementQueries'
import { queryKeys } from '../../lib/queries/queryKeys'
import type { AnnouncementsTab } from '../../lib/queries/queryKeys'
import type { FilterValues } from '../../components/FilterModal'

export function AnnouncementsPage() {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const route = useRoute()
  const filterContext = useContext(FilterContext)
  const { user } = useAuth()
  const qc = useQueryClient()

  // ── UI state (tab + filters) ───────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<AnnouncementsTab>('offer')
  const [filters, setFilters] = useState<FilterValues | undefined>(undefined)

  // Sync filters from FilterContext / route params
  useEffect(() => {
    const ctxFilters = filterContext?.filters
    const routeFilters = (route.params as any)?.filters

    const resolved =
      ctxFilters && Object.keys(ctxFilters).length > 0
        ? ctxFilters
        : routeFilters && Object.keys(routeFilters).length > 0
        ? routeFilters
        : undefined

    if (resolved?.categories?.length) {
      const cat = resolved.categories[0]
      setActiveTab(cat === 'goods' ? 'offer' : cat)
    }
    setFilters(resolved)
  }, [filterContext?.filters, route.params])

  // ── Server state ───────────────────────────────────────────────────────────
  const {
    data,
    isLoading,
    isRefetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useAnnouncementsList(activeTab, filters)

  const list = flattenAnnouncementPages(data)

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleTabPress = useCallback((tab: AnnouncementsTab) => {
    filterContext?.setFilters?.(null)
    setFilters(undefined)
    setActiveTab(tab)
    // Pre-clear cache for this tab so user sees fresh data immediately
    qc.invalidateQueries({ queryKey: queryKeys.announcements.list(tab, undefined) })
  }, [filterContext, qc])

  const handleRefresh = useCallback(() => {
    refetch()
    if (user) {
      qc.invalidateQueries({ queryKey: queryKeys.favorites.ids() })
      qc.invalidateQueries({ queryKey: queryKeys.applications.applied() })
    }
  }, [refetch, qc, user])

  const getAnnouncementTitle = (a: Announcement) =>
    a.item?.name_am || a.item?.name_en || a.item?.name_ru || (a as any).title || ''

  const handleApply = useCallback((announcement: Announcement) => {
    const parent = navigation.getParent()
    const nav = (parent ?? navigation) as any
    nav.navigate('ApplicationForm', {
      announcementId: announcement.id,
      announcementType: announcement.category as AnnouncementType,
      announcementTitle: getAnnouncementTitle(announcement),
    })
  }, [navigation])

  const handleView = useCallback((announcement: Announcement) => {
    const parent = navigation.getParent()
    const nav = (parent ?? navigation) as any
    nav.navigate('AnnouncementDetail', { announcementId: announcement.id })
  }, [navigation])

  // Card reads isFavorite / appliedIds from the shared React Query cache — no prop drilling needed.
  const renderAnnouncementItem = useCallback(({ item }: { item: Announcement }) => (
    <AnnouncementCard
      announcement={item}
      onApply={handleApply}
      onView={handleView}
    />
  ), [handleApply, handleView])

  const getTabLabel = (tab: AnnouncementsTab) => t(`announcements.${tab}`)

  return (
    <View style={styles.container}>
      {/* Top Tabs */}
      <View style={styles.tabs}>
        {(['offer', 'service', 'rent'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => handleTabPress(tab)}
          >
            <Icon
              name={tab === 'offer' ? 'repeat' : tab === 'service' ? 'build' : 'key'}
              size={20}
              color={activeTab === tab ? colors.primary : colors.textTertiary}
            />
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {getTabLabel(tab)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={list}
        renderItem={renderAnnouncementItem}
        keyExtractor={item => item.id}
        contentContainerStyle={list.length === 0 ? [styles.listContainer, { flexGrow: 1 }] : styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={handleRefresh}
            colors={[colors.buttonPrimary]}
            tintColor={colors.buttonPrimary}
          />
        }
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage() }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.listLoader}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('announcements.empty')}</Text>
            </View>
          )
        }
        ListFooterComponent={
          isFetchingNextPage && hasNextPage ? (
            <View style={styles.footerLoader}>
              <Text style={styles.footerText}>{t('common.loading')}</Text>
            </View>
          ) : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tab: { flex: 1, flexDirection: 'column', alignItems: 'center', paddingVertical: 12, gap: 4 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: 12, color: colors.textTertiary },
  tabTextActive: { color: colors.primary, fontWeight: '600' },
  listContainer: { padding: 16 },
  listLoader: { padding: 12, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: colors.textTertiary },
  footerLoader: { padding: 20, alignItems: 'center' },
  footerText: { fontSize: 14, color: colors.textTertiary },
})
