import React, { useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors } from '../../theme/colors'
import { Announcement } from '../../types'
import { AnnouncementCard } from '../../components/AnnouncementCard'
import { useNavigation } from '@react-navigation/native'
import { useFavoritesStore } from '../../store/favorites/useFavoritesStore'
import { useApplicationsStore } from '../../store/applications/useApplicationsStore'
import { useAuth } from '../../context/AuthContext'

export function FavoritesPage() {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { user } = useAuth()

  const {
    list,
    loading,
    loadingMore,
    hasMore,
    refresh,
    loadMore,
  } = useFavoritesStore()

  const { pendingIds, fetchAppliedIds } = useApplicationsStore()

  // Fetch once on mount
  useEffect(() => {
    refresh()
  }, [])

  // Fetch pending applications for current user (so Apply button can be hidden like main page)
  useEffect(() => {
    if (user) fetchAppliedIds(String(user.id))
  }, [user, fetchAppliedIds])

  const handleView = useCallback((announcement: Announcement) => {
    ;(navigation as any).navigate('AnnouncementDetail', { announcementId: announcement.id })
  }, [navigation])

  const handleFavoriteChange = useCallback((announcementId: string, isNowFavorite: boolean) => {
    useFavoritesStore.setState(state => {
      const newIds = new Set(state.favoriteIds)
      if (isNowFavorite) {
        newIds.add(announcementId)
        return { favoriteIds: newIds }
      } else {
        newIds.delete(announcementId)
        return {
          favoriteIds: newIds,
          list: state.list.filter(a => a.id !== announcementId),
          total: Math.max(0, state.total - 1),
        }
      }
    })
  }, [])
  const renderItem = useCallback(({ item }: { item: Announcement }) => {
    return (
      <AnnouncementCard
        announcement={item}
        onView={handleView}
        isFavorite={true}
        onFavoriteChange={handleFavoriteChange}
        pendingApplicationAnnouncementIds={pendingIds}
      />
    )
   }, [handleView, handleFavoriteChange, pendingIds])

  return (
    <View style={styles.container}>
      <FlatList
        data={list}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshing={loading}
        onRefresh={refresh}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading && list.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('favorites.empty')}</Text>
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
    backgroundColor: colors.background,
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footerLoader: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
})
