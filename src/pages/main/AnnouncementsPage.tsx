import React, { useContext, useEffect, useCallback } from 'react'
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
import { colors } from '../../theme/colors'
import { Announcement, AnnouncementType } from '../../types'
import Icon from '../../components/Icon'
import { AnnouncementCard } from '../../components/AnnouncementCard'
import { FilterContext } from '../../navigation/HomeTabs'
import { useAuth } from '../../context/AuthContext'
import { useAnnouncementsStore } from '../../store/announcements/useAnnouncementsStore'
import { useFavoritesStore } from '../../store/favorites/useFavoritesStore'
import { useApplicationsStore } from '../../store/applications/useApplicationsStore'

export function AnnouncementsPage() {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const route = useRoute()
  const filterContext = useContext(FilterContext)
  const { user } = useAuth()

  const {
    list,
    loading,
    loadingMore,
    hasMore,
    activeTab,
    fetchList,
    loadMore,
    setActiveTab,
    setActiveTabSilent,
    setFilters,
  } = useAnnouncementsStore()

  const { favoriteIds, fetchFavoriteIds } = useFavoritesStore()
  const { appliedIds, pendingIds, fetchAppliedIds } = useApplicationsStore()

  const handleRefresh = useCallback(() => {
    fetchList(true)
    if (user) fetchAppliedIds(String(user.id))
  }, [fetchList, fetchAppliedIds, user])

  // Initial load when screen is first opened (store does not fetch when both filters and prev are undefined)
  useEffect(() => {
    fetchList(true)
  }, [fetchList])

  // Sync filters from context or route params; sync active tab to filter category when applied; setFilters triggers fetch
  useEffect(() => {
    const filtersToSet =
      filterContext?.filters && Object.keys(filterContext.filters).length > 0
        ? filterContext.filters
        : (route.params as { filters?: any })?.filters && Object.keys((route.params as any).filters).length > 0
          ? (route.params as any).filters
          : undefined
    // When filters include a category, set active tab to match (goods → offer, service → service, rent → rent)
    if (filtersToSet?.categories?.length) {
      const cat = filtersToSet.categories[0]
      const tab = cat === 'goods' ? 'offer' : cat
      setActiveTabSilent(tab)
    }
    setFilters(filtersToSet)
  }, [filterContext?.filters, route.params, activeTab, setActiveTabSilent, setFilters])

  // Fetch user-specific data once when user is available
  useEffect(() => {
    if (user) {
      fetchFavoriteIds()
      fetchAppliedIds(String(user.id))
    }
  }, [user])

  const getTabLabel = (tab: typeof activeTab) => t(`announcements.${tab}`)

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

  const handleFavoriteChange = useCallback((announcementId: string, isNowFavorite: boolean) => {
    useFavoritesStore.setState(state => {
      const newIds = new Set(state.favoriteIds)
      if (isNowFavorite) {
        newIds.add(announcementId)
      } else {
        newIds.delete(announcementId)
      }
      return { favoriteIds: newIds }
    })
  }, [])

  const renderAnnouncementItem = useCallback(({ item }: { item: Announcement }) => (
    <AnnouncementCard
      announcement={item}
      onApply={handleApply}
      onView={handleView}
      isFavorite={favoriteIds.has(item.id)}
      onFavoriteChange={handleFavoriteChange}
      appliedAnnouncementIds={appliedIds}
      pendingApplicationAnnouncementIds={pendingIds}
    />
  ), [favoriteIds, appliedIds, pendingIds, handleApply, handleView, handleFavoriteChange])

  console.log('loading', loading)
  return (
    <View style={styles.container}>
      {/* Top Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'offer' && styles.tabActive]}
          onPress={() => {
            filterContext?.setFilters?.(null)
            setActiveTab('offer')
          }}
        >
          <Icon name="repeat" size={20} color={activeTab === 'offer' ? colors.primary : colors.textTertiary} />
          <Text style={[styles.tabText, activeTab === 'offer' && styles.tabTextActive]}>
            {getTabLabel('offer')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'service' && styles.tabActive]}
          onPress={() => {
            filterContext?.setFilters?.(null)
            setActiveTab('service')
          }}
        >
          <Icon name="build" size={20} color={activeTab === 'service' ? colors.primary : colors.textTertiary} />
          <Text style={[styles.tabText, activeTab === 'service' && styles.tabTextActive]}>
            {getTabLabel('service')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'rent' && styles.tabActive]}
          onPress={() => {
            filterContext?.setFilters?.(null)
            setActiveTab('rent')
          }}
        >
          <Icon name="key" size={20} color={activeTab === 'rent' ? colors.primary : colors.textTertiary} />
          <Text style={[styles.tabText, activeTab === 'rent' && styles.tabTextActive]}>
            {getTabLabel('rent')}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={list}
        renderItem={renderAnnouncementItem}
        keyExtractor={item => item.id}
        contentContainerStyle={list.length === 0 ? [styles.listContainer, { flexGrow: 1 }] : styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={handleRefresh}
            colors={['transparent']}
            tintColor={'transparent'}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          loading && list.length > 0 ? (
            <View style={styles.listLoader}>
              <ActivityIndicator size="large" color={colors.primary} />
              {/* <Text style={styles.listLoaderText}>{t('common.loading')}</Text> */}
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.listLoader}>
              <ActivityIndicator size="large" color={colors.primary} />
              {/* <Text style={styles.listLoaderText}>{t('common.loading')}</Text> */}
            </View>
          ) : list.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('announcements.empty')}</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore && hasMore ? (
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
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  listLoader: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listLoaderText: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textTertiary,
  },
  footerLoader: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.textTertiary,
  },
})
