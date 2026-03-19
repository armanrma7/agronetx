import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import { useQueryClient } from '@tanstack/react-query'
import { colors } from '../../theme/colors'
import { Announcement } from '../../types'
import { MyAnnouncementCard } from './MyAnnouncementCard'
import { useMyAnnouncements, flattenAnnouncementPages, useCancelAnnouncement } from '../../hooks/useAnnouncementQueries'
import { useCloseMyApplication } from '../../hooks/useApplicationQueries'
import { queryKeys } from '../../lib/queries/queryKeys'
import type { MyAnnouncementsTab } from '../../lib/queries/queryKeys'

export function MyAnnouncementsPage() {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const qc = useQueryClient()

  const [activeTab, setActiveTab] = useState<MyAnnouncementsTab>('published')

  const {
    data,
    isLoading,
    isRefetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useMyAnnouncements(activeTab)

  const myList = flattenAnnouncementPages(data)

  const cancelAnnouncement = useCancelAnnouncement()
  const closeMyApplication = useCloseMyApplication()

  // Track which IDs are currently in a loading action
  const cancellingId = cancelAnnouncement.isPending ? (cancelAnnouncement.variables as string) : null
  const closingApplicationId = closeMyApplication.isPending
    ? (closeMyApplication.variables as any)?.applicationId
    : null

  const handleCancel = useCallback(async (announcement: Announcement) => {
    Alert.alert(
      t('announcements.cancelTitle'),
      t('announcements.cancelConfirm'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('common.yes'),
          style: 'destructive',
          onPress: () => {
            cancelAnnouncement.mutate(announcement.id, {
              onSuccess: () => Alert.alert(t('common.success'), t('announcements.cancelled')),
              onError: (error: any) =>
                Alert.alert(t('common.error'), error.response?.data?.message || t('announcements.cancelError')),
            })
          },
        },
      ],
    )
  }, [cancelAnnouncement, t])

  const handleCloseApplication = useCallback(async (applicationId: string) => {
    const ownerAnnouncement = myList.find(a =>
      ((a as any).applications || []).some((app: any) => app.id === applicationId),
    )
    const announcementId = ownerAnnouncement?.id ?? ''

    Alert.alert(
      t('applications.closeTitle'),
      t('applications.closeConfirm'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('common.yes'),
          style: 'destructive',
          onPress: () => {
            closeMyApplication.mutate({ applicationId, announcementId }, {
              onSuccess: () => Alert.alert(t('common.success'), t('applications.closed')),
              onError: (error: any) =>
                Alert.alert(t('common.error'), error.response?.data?.message || t('applications.closeError')),
            })
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

  const handleTabSwitch = useCallback((tab: MyAnnouncementsTab) => {
    setActiveTab(tab)
    qc.invalidateQueries({ queryKey: queryKeys.announcements.myList(tab) })
  }, [qc])

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
        showMyApplications={activeTab === 'applied'}
        cancelling={cancellingId === item.id}
        closingApplicationId={isClosingApplication ? closingApplicationId : null}
      />
    )
  }, [activeTab, cancellingId, closingApplicationId, handleCancel, handleView, handleCloseApplication, handleApplicationsPress])

  return (
    <View style={styles.container}>
      {/* Top Tabs */}
      <View style={styles.tabs}>
        {(['published', 'applied'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => handleTabSwitch(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {t(`announcements.${tab}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={myList}
        renderItem={renderAnnouncementCard}
        keyExtractor={item => item.id}
        contentContainerStyle={
          myList.length === 0 && !isLoading ? [styles.listContainer, { flexGrow: 1 }] : styles.listContainer
        }
        refreshing={isRefetching && !isFetchingNextPage}
        onRefresh={refetch}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage() }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('common.empty')}</Text>
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
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.buttonPrimary },
  tabText: { fontSize: 16, color: colors.textTertiary, fontWeight: '500' },
  tabTextActive: { color: colors.buttonPrimary, fontWeight: '600' },
  listContainer: { padding: 16 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: colors.textTertiary },
  footerLoader: { padding: 20, alignItems: 'center' },
})
