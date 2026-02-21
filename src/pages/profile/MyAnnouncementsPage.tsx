import React, { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../theme/colors'
import { Announcement } from '../../types'
import { MyAnnouncementCard } from './MyAnnouncementCard'
import * as announcementsAPI from '../../lib/api/announcements.api'

type TabType = 'published' | 'applied'

export function MyAnnouncementsPage() {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('published')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [closingApplicationId, setClosingApplicationId] = useState<string | null>(null)
  const limit = 8
  const abortControllerRef = useRef<AbortController | null>(null)
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller for this request
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    
    setLoading(true)
    setLoadingMore(false)
    setAnnouncements([])
    setPage(1)
    setTotal(0)
    setHasMore(true)
    fetchAnnouncements(1, true, abortController.signal)
    
    // Cleanup: abort request when component unmounts or tab changes
    return () => {
      abortController.abort()
    }
  }, [activeTab])

  const fetchAnnouncements = async (pageNum: number = 1, reset: boolean = false, signal?: AbortSignal) => {
    if (reset) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }
    
    try {
      if (activeTab === 'published') {
        // Fetch paginated announcements from /announcements/me
        const response = await announcementsAPI.getMyAnnouncementsAPI({ page: pageNum, limit, signal })
        
        // Check if request was aborted
        if (signal?.aborted) {
          return
        }
        
        if (reset) {
          setAnnouncements(response.announcements || [])
        } else {
          setAnnouncements(prev => [...prev, ...(response.announcements || [])])
        }
        
        setTotal(response.total || 0)
        // Only update page if it matches what we requested (prevents race conditions)
        if (response.page === pageNum) {
          setPage(response.page)
        }
        setHasMore((response.page || pageNum) * limit < (response.total || 0))
      } else {
        // Fetch paginated announcements user has applied to
        const response = await announcementsAPI.getAppliedAnnouncementsAPI({ page: pageNum, limit, signal })
        
        // Check if request was aborted
        if (signal?.aborted) {
          return
        }
        
        if (reset) {
          setAnnouncements(response.announcements || [])
        } else {
          setAnnouncements(prev => [...prev, ...(response.announcements || [])])
        }
        
        setTotal(response.total || 0)
        // Only update page if it matches what we requested (prevents race conditions)
        if (response.page === pageNum) {
          setPage(response.page)
        }
        setHasMore((response.page || pageNum) * limit < (response.total || 0))
      }
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
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchAnnouncements(nextPage, false)
    }
  }, [loadingMore, hasMore, loading, page])

  const handleCancel = async (announcement: Announcement) => {
    try {
      // Show confirmation dialog
      Alert.alert(
        t('announcements.cancelTitle'),
        t('announcements.cancelConfirm'),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('common.confirm'),
            style: 'destructive',
            onPress: async () => {
              setCancellingId(announcement.id)
              try {
                await announcementsAPI.cancelAnnouncementAPI(announcement.id)
                setPage(1)
                setHasMore(true)
                await fetchAnnouncements(1, true)
                Alert.alert(
                  t('common.success'),
                  t('announcements.cancelled')
                )
              } catch (error: any) {
                console.error('Error cancelling announcement:', error)
                Alert.alert(
                  t('common.error'),
                  error.response?.data?.message || t('announcements.cancelError')
                )
              } finally {
                setCancellingId(null)
              }
            },
          },
        ]
      )
    } catch (error) {
      console.error('Error showing cancel confirmation:', error)
    }
  }

  const handleCloseApplication = async (applicationId: string) => {
    try {
      // Show confirmation dialog
      Alert.alert(
        t('applications.closeTitle'),
        t('applications.closeConfirm'),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('common.confirm'),
            style: 'destructive',
            onPress: async () => {
              setClosingApplicationId(applicationId)
              try {
                await announcementsAPI.closeApplicationAPI(applicationId)
                setPage(1)
                setHasMore(true)
                await fetchAnnouncements(1, true)
                Alert.alert(
                  t('common.success'),
                  t('applications.closed')
                )
              } catch (error: any) {
                console.error('Error closing application:', error)
                Alert.alert(
                  t('common.error'),
                  error.response?.data?.message || t('applications.closeError')
                )
              } finally {
                setClosingApplicationId(null)
              }
            },
          },
        ]
      )
    } catch (error) {
      console.error('Error showing close confirmation:', error)
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

  const handleApplicationsPress = (announcement: Announcement) => {
    const parent = navigation.getParent()
    if (parent) {
      (parent as any).navigate('AnnouncementApplications', { announcementId: announcement.id, announcement })
    } else {
      ;(navigation as any).navigate('AnnouncementApplications', { announcementId: announcement.id, announcement })
    }
  }

  const renderAnnouncementCard = ({ item }: { item: Announcement }) => {
    // Get the application ID that is being closed for this announcement
    const announcementData = item as any
    const applications = Array.isArray(announcementData.applications) ? announcementData.applications : []
    const activeApplication = applications.find((app: any) => app.status !== 'closed' && app.status !== 'cancelled')
    const isClosingApplication = activeApplication && closingApplicationId === activeApplication.id
    
    return (
      <MyAnnouncementCard
        announcement={item}
        onCancel={handleCancel}
        onView={handleView}
        onCloseApplication={handleCloseApplication}
        onApplicationsPress={handleApplicationsPress}
        showMyApplications={activeTab === 'applied'}
        cancelling={cancellingId === item.id}
        closingApplicationId={isClosingApplication ? closingApplicationId : null}
      />
    )
  }

  return (
    <View style={styles.container}>
      {/* Top Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'published' && styles.tabActive]}
          onPress={() => {
            if (abortControllerRef.current) {
              abortControllerRef.current.abort()
            }
            
            setAnnouncements([])
            setLoading(true)
            setActiveTab('published')
          }}
        >
          <Text style={[styles.tabText, activeTab === 'published' && styles.tabTextActive]}>
            {t('announcements.published')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'applied' && styles.tabActive]}
          onPress={() => {
            if (abortControllerRef.current) {
              abortControllerRef.current.abort()
            }
            
            setAnnouncements([])
            setLoading(true)
            setActiveTab('applied')
          }}
        >
          <Text style={[styles.tabText, activeTab === 'applied' && styles.tabTextActive]}>
            {t('announcements.applied')}
          </Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={announcements}
        renderItem={renderAnnouncementCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          announcements.length === 0 && !loading 
            ? [styles.listContainer, { flexGrow: 1 }] 
            : styles.listContainer
        }
        refreshing={loading}
        onRefresh={() => {
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
          !loading && !loadingMore && announcements.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {t('common.empty')}
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
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.buttonPrimary,
  },
  tabText: {
    fontSize: 16,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.buttonPrimary,
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

