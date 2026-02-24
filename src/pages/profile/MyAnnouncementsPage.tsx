import React, { useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import { colors } from '../../theme/colors'
import { Announcement } from '../../types'
import { MyAnnouncementCard } from './MyAnnouncementCard'
import { useApplicationsStore } from '../../store/applications/useApplicationsStore'

export function MyAnnouncementsPage() {
  const { t } = useTranslation()
  const navigation = useNavigation()

  const {
    myList,
    myLoading,
    myLoadingMore,
    myHasMore,
    myActiveTab,
    cancellingId,
    closingApplicationId,
    fetchMyAnnouncements,
    setMyActiveTab,
    loadMoreMyAnnouncements,
    cancelMyAnnouncement,
    closeMyApplication,
  } = useApplicationsStore()

  useEffect(() => {
    fetchMyAnnouncements(true)
  }, [myActiveTab])

  const handleCancel = useCallback(async (announcement: Announcement) => {
    Alert.alert(
      t('announcements.cancelTitle'),
      t('announcements.cancelConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelMyAnnouncement(announcement.id)
              Alert.alert(t('common.success'), t('announcements.cancelled'))
            } catch (error: any) {
              Alert.alert(t('common.error'), error.response?.data?.message || t('announcements.cancelError'))
            }
          },
        },
      ],
    )
  }, [cancelMyAnnouncement, t])

  const handleCloseApplication = useCallback(async (applicationId: string) => {
    // Find which announcement owns this application so we can clean up the applied/pending sets
    const ownerAnnouncement = myList.find(a =>
      ((a as any).applications || []).some((app: any) => app.id === applicationId),
    )
    const announcementId = ownerAnnouncement?.id ?? ''

    Alert.alert(
      t('applications.closeTitle'),
      t('applications.closeConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await closeMyApplication(applicationId, announcementId)
              Alert.alert(t('common.success'), t('applications.closed'))
            } catch (error: any) {
              Alert.alert(t('common.error'), error.response?.data?.message || t('applications.closeError'))
            }
          },
        },
      ],
    )
  }, [closeMyApplication, myList, t])

  const handleView = useCallback((announcement: Announcement) => {
    const parent = navigation.getParent()
    const nav = (parent ?? navigation) as any
    nav.navigate('AnnouncementDetail', { announcementId: announcement.id })
  }, [navigation])

  const handleApplicationsPress = useCallback((announcement: Announcement) => {
    const parent = navigation.getParent()
    const nav = (parent ?? navigation) as any
    nav.navigate('AnnouncementApplications', { announcementId: announcement.id, announcement })
  }, [navigation])

  const renderAnnouncementCard = useCallback(({ item }: { item: Announcement }) => {
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
        showMyApplications={myActiveTab === 'applied'}
        cancelling={cancellingId === item.id}
        closingApplicationId={isClosingApplication ? closingApplicationId : null}
      />
    )
  }, [myActiveTab, cancellingId, closingApplicationId, handleCancel, handleView, handleCloseApplication, handleApplicationsPress])

  return (
    <View style={styles.container}>
      {/* Top Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, myActiveTab === 'published' && styles.tabActive]}
          onPress={() => setMyActiveTab('published')}
        >
          <Text style={[styles.tabText, myActiveTab === 'published' && styles.tabTextActive]}>
            {t('announcements.published')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, myActiveTab === 'applied' && styles.tabActive]}
          onPress={() => setMyActiveTab('applied')}
        >
          <Text style={[styles.tabText, myActiveTab === 'applied' && styles.tabTextActive]}>
            {t('announcements.applied')}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={myList}
        renderItem={renderAnnouncementCard}
        keyExtractor={item => item.id}
        contentContainerStyle={
          myList.length === 0 && !myLoading
            ? [styles.listContainer, { flexGrow: 1 }]
            : styles.listContainer
        }
        refreshing={myLoading}
        onRefresh={() => fetchMyAnnouncements(true)}
        onEndReached={loadMoreMyAnnouncements}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !myLoading && !myLoadingMore && myList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('common.empty')}</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          myLoadingMore && myHasMore ? (
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
