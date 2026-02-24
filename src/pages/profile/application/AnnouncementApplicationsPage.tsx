/**
 * Announcement Applications Page
 * Lists applications for an announcement (from My Announcements). Do not remove this file.
 */

import React, { useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { useNavigation, useRoute } from '@react-navigation/native'

import { colors } from '../../../theme/colors'
import { Announcement } from '../../../types'
import { AppHeader } from '../../../components/AppHeader'
import { useAuth } from '../../../context/AuthContext'
import { useApplicationsStore } from '../../../store/applications/useApplicationsStore'
import { useAnnouncementsStore } from '../../../store/announcements/useAnnouncementsStore'
import type { ApplicationListItem } from '../../../lib/api/announcements.api'
import {
  ApplicationListHeader,
  ApplicationCard,
} from '.'

interface RouteParams {
  announcementId: string
  announcement?: Announcement
}

export function AnnouncementApplicationsPage() {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const route = useRoute()
  const { user } = useAuth()

  const params = (route.params as RouteParams) || {}
  const { announcementId, announcement: paramAnnouncement } = params

  const {
    byAnnouncementId,
    loadingByAnnouncementId,
    actionLoadingId,
    fetchApplicationsByAnnouncement,
    approveApplication,
    rejectApplication,
    closeApplication,
  } = useApplicationsStore()

  const { cache, setInCache } = useAnnouncementsStore()

  // Seed the announcement cache from route param if available
  useEffect(() => {
    if (paramAnnouncement && !cache[announcementId]) {
      setInCache(paramAnnouncement)
    }
  }, [announcementId])

  const announcement: Announcement | null = cache[announcementId] ?? paramAnnouncement ?? null
  const applications: ApplicationListItem[] = byAnnouncementId[announcementId] ?? []
  const loading = loadingByAnnouncementId[announcementId] ?? false
  const refreshing = false // pull-to-refresh uses the same flag in this context

  const fetchData = useCallback((refresh = false) => {
    fetchApplicationsByAnnouncement(announcementId, refresh)
  }, [announcementId, fetchApplicationsByAnnouncement])

  useEffect(() => {
    fetchData(false)
  }, [announcementId])

  const runAction = useCallback(
    async (action: () => Promise<void>, successKey: string, errorKey: string) => {
      try {
        await action()
        Alert.alert(t('common.success'), t(successKey))
      } catch (error: any) {
        Alert.alert(t('common.error'), error?.response?.data?.message || t(errorKey))
      }
    },
    [t],
  )

  const handleApprove = useCallback(
    (id: string) =>
      runAction(
        () => approveApplication(id, announcementId),
        'applications.approveSuccess',
        'applications.approveError',
      ),
    [announcementId, approveApplication, runAction],
  )

  const handleReject = useCallback(
    (id: string) =>
      runAction(
        () => rejectApplication(id, announcementId),
        'applications.rejectSuccess',
        'applications.rejectError',
      ),
    [announcementId, rejectApplication, runAction],
  )

  const handleCloseApplication = useCallback(
    (id: string) =>
      Alert.alert(
        t('applications.closeTitle'),
        t('applications.closeConfirm'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            style: 'destructive',
            onPress: () =>
              runAction(
                () => closeApplication(id, announcementId),
                'applications.closed',
                'applications.closeError',
              ),
          },
        ],
      ),
    [t, runAction, closeApplication, announcementId],
  )

  const a = announcement as any
  const item = announcement?.item
  const title =
    item?.name_am ||
    item?.name_en ||
    item?.name_ru ||
    a?.name_hy ||
    a?.name_en ||
    a?.name_ru ||
    a?.title ||
    a?.item_name ||
    t('announcements.apply')

  const handleEdit = useCallback(
    (app: ApplicationListItem) => {
      const announcementType = announcement?.category ?? (announcement as any)?.type ?? 'goods'
      const parent = navigation.getParent()
      const nav = parent ?? navigation
      ;(nav as any).navigate('ApplicationForm', {
        announcementId,
        announcementType,
        announcementTitle: title,
        announcement,
        applicationId: app.id,
        prefill: {
          deliveryDates: app.delivery_dates,
          count: app.count,
          unit: app.unit,
          notes: app.notes,
        },
      })
    },
    [navigation, announcement, announcementId, title],
  )

  const quantity = announcement?.available_quantity ?? a?.quantity
  const price = announcement?.price
  const priceUnit = (announcement as any)?.price_unit ?? announcement?.unit ?? ''
  const quantityUnit = announcement?.unit ?? a?.quantity_unit ?? ''

  const handleView = useCallback(
    (app: ApplicationListItem) => {
      const nav = (navigation.getParent() ?? navigation) as any
      nav.navigate('ApplicationDetail', {
        announcementId,
        appId: app.id,
        quantityUnit,
      })
    },
    [navigation, announcementId, quantityUnit],
  )

  const listHeaderComponent = useCallback(
    () => (
      <>
        <ApplicationListHeader
          title={title}
          quantity={quantity != null ? Number(quantity) : null}
          quantityUnit={quantityUnit}
          price={price != null ? Number(price) : null}
          priceUnit={priceUnit}
          applicantsCount={applications.length}
        />
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.buttonPrimary} />
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        )}
      </>
    ),
    [title, quantity, quantityUnit, price, priceUnit, applications.length, loading, t],
  )

  const renderItem = useCallback(
    ({ item: app }: { item: ApplicationListItem }) => (
      <ApplicationCard
        app={app}
        announcementId={announcementId}
        quantityUnit={quantityUnit}
        currentUserId={user?.id ?? null}
        actionLoadingId={actionLoadingId}
        onApprove={handleApprove}
        onReject={handleReject}
        onCloseApplication={handleCloseApplication}
        onView={handleView}
        onEdit={handleEdit}
      />
    ),
    [
      announcementId,
      quantityUnit,
      user?.id,
      actionLoadingId,
      handleApprove,
      handleReject,
      handleCloseApplication,
      handleView,
      handleEdit,
    ],
  )

  const keyExtractor = useCallback((item: ApplicationListItem) => item.id, [])

  const listEmptyComponent = useCallback(
    () =>
      !loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('applications.empty')}</Text>
        </View>
      ) : null,
    [loading, t],
  )

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <AppHeader showBack />
        <FlatList
          data={applications}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={listHeaderComponent}
          ListEmptyComponent={listEmptyComponent}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(true)}
            />
          }
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.buttonPrimary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
})
