import React, { useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors } from '../../theme/colors'
import { Announcement, AnnouncementType } from '../../types'
import { AnnouncementCard } from '../../components/AnnouncementCard'
import { useNavigation } from '@react-navigation/native'
import { useFavoritesList, flattenFavoritePages, useAddFavorite, useRemoveFavorite } from '../../hooks/useFavoriteQueries'
import { useAppliedIds } from '../../hooks/useApplicationQueries'
import { useAuth } from '../../context/AuthContext'

export function FavoritesPage() {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { user } = useAuth()

  const {
    data,
    isLoading,
    isRefetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useFavoritesList(!!user)

  const list = flattenFavoritePages(data)

  const { data: appliedData } = useAppliedIds(user?.id, !!user)
  const pendingIds = appliedData?.pendingIds ?? new Set<string>()

  const addFavorite = useAddFavorite()
  const removeFavorite = useRemoveFavorite()

  const handleView = useCallback((announcement: Announcement) => {
    ;(navigation as any).navigate('AnnouncementDetail', { announcementId: announcement.id })
  }, [navigation])

  const handleApply = useCallback((announcement: Announcement) => {
    const parent = navigation.getParent()
    const nav = (parent ?? navigation) as any
    nav.navigate('ApplicationForm', {
      announcementId: announcement.id,
      announcementType: announcement.category as AnnouncementType,
    })
  }, [navigation])

  const handleFavoriteChange = useCallback((announcementId: string, isNowFavorite: boolean) => {
    if (isNowFavorite) {
      addFavorite.mutate(announcementId)
    } else {
      removeFavorite.mutate(announcementId)
    }
  }, [addFavorite, removeFavorite])

  const renderItem = useCallback(({ item }: { item: Announcement }) => (
    <AnnouncementCard
      announcement={item}
      onView={handleView}
      onApply={handleApply}
      isFavorite={true}
      onFavoriteChange={handleFavoriteChange}
      pendingApplicationAnnouncementIds={pendingIds}
    />
  ), [handleView, handleApply, handleFavoriteChange, pendingIds])

  return (
    <View style={styles.container}>
      <FlatList
        data={list}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshing={isRefetching && !isFetchingNextPage}
        onRefresh={refetch}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage() }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('favorites.empty')}</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          isFetchingNextPage && hasNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.buttonPrimary} />
            </View>
          ) : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContainer: { padding: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: colors.textSecondary, textAlign: 'center' },
  footerLoader: { padding: 20, alignItems: 'center' },
})
