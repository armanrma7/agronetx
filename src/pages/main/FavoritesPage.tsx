import React, { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, StyleSheet, FlatList } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors } from '../../theme/colors'
import { Announcement } from '../../types'
import { AnnouncementCard } from '../../components/AnnouncementCard'
import { useNavigation } from '@react-navigation/native'
import * as announcementsAPI from '../../lib/api/announcements.api'

export function FavoritesPage() {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const [favorites, setFavorites] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const limit = 8
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchFavorites = useCallback(async (pageNum: number = 1, reset: boolean = false, signal?: AbortSignal) => {
    if (reset) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }
    
    try {
      const response = await announcementsAPI.getFavoritesAPI({ page: pageNum, limit, signal })
      
      // Check if request was aborted
      if (signal?.aborted) {
        return
      }
      
      if (reset) {
        setFavorites(response.announcements || [])
      } else {
        setFavorites(prev => [...prev, ...(response.announcements || [])])
      }
      
      setTotal(response.total || 0)
      // Only update page if it matches what we requested (prevents race conditions)
      if (response.page === pageNum) {
        setPage(response.page)
      }
      setHasMore((response.page || pageNum) * limit < (response.total || 0))
    } catch (error: any) {
      // Ignore abort errors
      if (error.name === 'AbortError' || error.name === 'CanceledError' || signal?.aborted) {
        return
      }
      
      if (reset) {
        setFavorites([])
      }
      setHasMore(false)
    } finally {
      // Only update loading state if request wasn't aborted
      if (!signal?.aborted) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [])

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchFavorites(nextPage, false)
    }
  }, [loadingMore, hasMore, loading, page, fetchFavorites])

  // Fetch favorites once on mount (no refetch on every return)
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    setPage(1)
    setHasMore(true)
    fetchFavorites(1, true, abortController.signal)
    return () => {
      abortController.abort()
    }
  }, [fetchFavorites])

  const handleView = (announcement: Announcement) => {
    ;(navigation as any).navigate('AnnouncementDetail', {
      announcementId: announcement.id,
    })
  }

  const renderFavoriteItem = ({ item }: { item: Announcement }) => (
    <AnnouncementCard
      announcement={item}
      onView={handleView}
      isFavorite={true}
      onFavoriteChange={() => {
        // Abort previous request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
        
        const abortController = new AbortController()
        abortControllerRef.current = abortController
        
        setPage(1)
        setHasMore(true)
        fetchFavorites(1, true, abortController.signal)
      }}
    />
  )

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        renderItem={renderFavoriteItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshing={loading}
        onRefresh={() => {
          // Abort previous request
          if (abortControllerRef.current) {
            abortControllerRef.current.abort()
          }
          
          const abortController = new AbortController()
          abortControllerRef.current = abortController
          
          setPage(1)
          setHasMore(true)
          fetchFavorites(1, true, abortController.signal)
        }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading && favorites.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {t('favorites.empty')}
              </Text>
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
