import React, { useState, useEffect, useContext, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native'
import { colors } from '../../theme/colors'
import { Announcement, AnnouncementType } from '../../types'
import Icon from '../../components/Icon'
import { AnnouncementCard } from '../../components/AnnouncementCard'
import { FilterValues } from '../../components/FilterModal'
import { FilterContext } from '../../navigation/HomeTabs'
import { useAuth } from '../../context/AuthContext'
import * as announcementsAPI from '../../lib/api/announcements.api'

type TabType = 'offer' | 'service' | 'rent'

export function AnnouncementsPage() {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const route = useRoute()
  const filterContext = useContext(FilterContext)
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('offer')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [filters, setFilters] = useState<FilterValues | undefined>(undefined)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [appliedAnnouncementIds, setAppliedAnnouncementIds] = useState<Set<string>>(new Set())
  const limit = 8
  const abortControllerRef = useRef<AbortController | null>(null)

  // Get filters from context (preferred) or route params (fallback)
  useEffect(() => {
    if (filterContext?.filters && Object.keys(filterContext.filters).length > 0) {
      // Don't clear announcements here - let the other useEffect handle fetching
      setFilters(filterContext.filters)
    } else {
      // Fallback to route params
      const routeParams = route.params as { filters?: FilterValues } | undefined
      if (routeParams?.filters && Object.keys(routeParams.filters).length > 0) {
        // Don't clear announcements here - let the other useEffect handle fetching
        setFilters(routeParams.filters)
      } else {
        // Don't clear announcements here - let the other useEffect handle fetching
        setFilters(undefined)
      }
    }
  }, [filterContext?.filters, route.params])

  // Fetch favorite IDs and applied announcement IDs (only if user is authenticated)
  const fetchFavoriteIds = async () => {
    if (!user) {
      setFavoriteIds(new Set())
      setAppliedAnnouncementIds(new Set())
      return
    }
    try {
      const response = await announcementsAPI.getFavoritesAPI({ page: 1, limit: 100 })
      const ids = new Set(response.announcements.map(fav => fav.id))
      setFavoriteIds(ids)
    } catch (error: any) {
      setFavoriteIds(new Set())
    }
    try {
      const applied = await announcementsAPI.getAppliedAnnouncementsAPI({ page: 1, limit: 200 })
      setAppliedAnnouncementIds(new Set(applied.announcements.map(a => a.id)))
    } catch (error: any) {
      setAppliedAnnouncementIds(new Set())
    }
  }

  useEffect(() => {
    // Abort previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller for this request
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    
    // Clear announcements immediately when tab or filters change
    setAnnouncements([])
    setPage(1)
    setTotal(0)
    setHasMore(true)
    setLoading(true)
    fetchAnnouncements(1, true, abortController.signal)
    
    // Cleanup: abort request when component unmounts or dependencies change
    return () => {
      abortController.abort()
    }
  }, [activeTab, filters])

  // Refresh favorites when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchFavoriteIds()
    }, [])
  )

  const fetchAnnouncements = async (pageNum: number = 1, reset: boolean = false, signal?: AbortSignal) => {
    if (reset) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }
    
    try {
      // Map tab to API category: 'offer' -> 'goods', 'service' -> 'service', 'rent' -> 'rent'
      const apiCategory = activeTab === 'offer' ? 'goods' : activeTab as AnnouncementType
      
      // Build API params
      const params: announcementsAPI.GetAnnouncementsParams = {
        category: apiCategory,
        status: 'published',
        page: pageNum,
        limit: limit,
        signal,
      }
      
      // Apply filters if they exist
      if (filters) {
        if (filters.status) {
          params.status = filters.status as 'published' | 'active' | 'completed' | 'cancelled'
        }
        if (filters.regions && filters.regions.length > 0) {
          params.region = filters.regions
        }
        if (filters.villages && filters.villages.length > 0) {
          params.village = filters.villages
        }
        if (filters.created_from) {
          params.created_from = filters.created_from
        }
        if (filters.created_to) {
          params.created_to = filters.created_to
        }
      }
      
      // Fetch from API with category, status, filters, and pagination
      const response = await announcementsAPI.getAnnouncementsAPI(params)
      
      // Check if request was aborted
      if (signal?.aborted) {
        return
      }
      
      const announcementsData = Array.isArray(response.announcements) ? response.announcements : []
      
      if (reset) {
        setAnnouncements(announcementsData)
      } else {
        setAnnouncements(prev => [...prev, ...announcementsData])
      }
      
      setTotal(response.total || 0)
      // Only update page if it matches what we requested (prevents race conditions)
      if (response.page === pageNum) {
        setPage(response.page)
      }
      setHasMore((response.page || pageNum) * limit < (response.total || 0))
    } catch (err: any) {
      // Ignore abort errors
      if (err.name === 'AbortError' || err.name === 'CanceledError' || signal?.aborted) {
        return
      }
      
      if (reset) {
        setAnnouncements([])
      }
      setHasMore(false)
    } finally {
      // Only update loading state if request wasn't aborted
      if (!signal?.aborted) {
        if (reset) {
          setLoading(false)
        } else {
          setLoadingMore(false)
        }
      }
    }
  }

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchAnnouncements(nextPage, false)
    }
  }, [loadingMore, hasMore, loading, page, fetchAnnouncements])

  const getTabLabel = (tab: TabType) => {
    return t(`announcements.${tab}`)
  }

  const getAnnouncementTitle = (a: Announcement) =>
    a.item?.name_am || a.item?.name_en || a.item?.name_ru || (a as any).title || ''

  const handleApply = (announcement: Announcement) => {
    const parent = navigation.getParent()
    if (parent) {
      parent.navigate('ApplicationForm', {
        announcementId: announcement.id,
        announcementType: announcement.category as 'goods' | 'service' | 'rent',
        announcementTitle: getAnnouncementTitle(announcement),
      })
    } else {
      ;(navigation as any).navigate('ApplicationForm', {
        announcementId: announcement.id,
        announcementType: announcement.category as 'goods' | 'service' | 'rent',
        announcementTitle: getAnnouncementTitle(announcement),
      })
    }
  }

  const handleView = (announcement: Announcement) => {
    const parent = navigation.getParent()
    if (parent) {
      parent.navigate('AnnouncementDetail', { announcementId: announcement.id })
    } else {
      ;(navigation as any).navigate('AnnouncementDetail', { announcementId: announcement.id })
    }
  }

  const handleFavoriteChange = useCallback(() => {
    // Refresh favorite IDs when favorite status changes
    fetchFavoriteIds()
  }, [])

  const renderAnnouncementItem = ({ item }: { item: Announcement }) => (
    <AnnouncementCard
      announcement={item}
      onApply={handleApply}
      onView={handleView}
      isFavorite={favoriteIds.has(item.id)}
      onFavoriteChange={handleFavoriteChange}
      appliedAnnouncementIds={appliedAnnouncementIds}
    />
  )

  return (
    <View style={styles.container}>
      {/* Top Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'offer' && styles.tabActive]}
          onPress={() => {
            // Abort previous request
            if (abortControllerRef.current) {
              abortControllerRef.current.abort()
            }
            
            setAnnouncements([])
            setPage(1)
            setHasMore(true)
            setLoading(true)
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
            // Abort previous request
            if (abortControllerRef.current) {
              abortControllerRef.current.abort()
            }
            
            setAnnouncements([])
            setPage(1)
            setHasMore(true)
            setLoading(true)
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
            // Abort previous request
            if (abortControllerRef.current) {
              abortControllerRef.current.abort()
            }
            
            setAnnouncements([])
            setPage(1)
            setHasMore(true)
            setLoading(true)
            setActiveTab('rent')
          }}
        >
          <Icon name="key" size={20} color={activeTab === 'rent' ? colors.primary : colors.textTertiary} />
          <Text style={[styles.tabText, activeTab === 'rent' && styles.tabTextActive]}>
            {getTabLabel('rent')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Announcements */}
      <FlatList
        data={announcements}
        renderItem={renderAnnouncementItem}
        keyExtractor={item => item.id}
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
          fetchAnnouncements(1, true, abortController.signal)
        }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          (!loading && announcements.length === 0) ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {t('announcements.empty')}
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

