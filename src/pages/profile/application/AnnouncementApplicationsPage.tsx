/**
 * Announcement Applications Page
 * Lists applications for an announcement (from My Announcements). Do not remove this file.
 */

import React, { useCallback, useMemo, useState } from 'react'
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
import { useApplicationsByAnnouncement, useApproveApplication, useRejectApplication, useCancelApplication } from '../../../hooks/useApplicationQueries'
import { useAnnouncementDetail } from '../../../hooks/useAnnouncementQueries'
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
  const { t, i18n } = useTranslation()
  const navigation = useNavigation()
  const route = useRoute()
  const { user } = useAuth()

  const params = (route.params as RouteParams) || {}
  const { announcementId, announcement: paramAnnouncement } = params

  const [isManualRefreshing, setIsManualRefreshing] = useState(false)

  const {
    data: applications = [],
    isLoading: loading,
    refetch,
  } = useApplicationsByAnnouncement(announcementId)

  const handleManualRefresh = useCallback(async () => {
    setIsManualRefreshing(true)
    await refetch()
    setIsManualRefreshing(false)
  }, [refetch])

  const { data: fetchedAnnouncement } = useAnnouncementDetail(announcementId)
  const announcement: Announcement | null = fetchedAnnouncement ?? paramAnnouncement ?? null

  const approveApp = useApproveApplication()
  const rejectApp = useRejectApplication()
  const cancelApp = useCancelApplication()

  // Derive per-button loading state from mutation variables (React Query pattern)
  const actionLoadingId =
    (approveApp.isPending ? (approveApp.variables as any)?.id : null) ??
    (rejectApp.isPending ? (rejectApp.variables as any)?.id : null) ??
    (cancelApp.isPending ? (cancelApp.variables as any)?.id : null) ??
    null
  const actionLoadingType =
    approveApp.isPending ? 'approve' :
    rejectApp.isPending ? 'reject' :
    cancelApp.isPending ? 'cancel' :
    null

  const handleApprove = useCallback(
    (id: string) =>
      Alert.alert(t('applications.approve'), t('applications.approveConfirm'), [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('common.yes'),
          onPress: () =>
            approveApp.mutate({ id, announcementId }, {
              onSuccess: () => Alert.alert(t('common.success'), t('applications.approveSuccess')),
              onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('applications.approveError')),
            }),
        },
      ]),
    [announcementId, approveApp, t],
  )

  const handleReject = useCallback(
    (id: string) =>
      Alert.alert(t('applications.reject'), t('applications.rejectConfirm'), [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('common.yes'),
          style: 'destructive',
          onPress: () =>
            rejectApp.mutate({ id, announcementId }, {
              onSuccess: () => Alert.alert(t('common.success'), t('applications.rejectSuccess')),
              onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('applications.rejectError')),
            }),
        },
      ]),
    [announcementId, rejectApp, t],
  )

  const handleCloseApplication = useCallback(
    (id: string) => {
      const app = applications.find(a => a.id === id)
      const isOwn = user?.id != null && app != null && String(app.user_id) === String(user.id)
      Alert.alert(t('applications.closeTitle'), t('applications.closeConfirm'), [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('common.yes'),
          style: 'destructive',
          onPress: () =>
            cancelApp.mutate({ id, announcementId, isOwnApplication: isOwn }, {
              onSuccess: () => Alert.alert(t('common.success'), t('applications.closed')),
              onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('applications.closeError')),
            }),
        },
      ])
    },
    [t, cancelApp, announcementId, applications, user?.id],
  )

  const a = announcement as any
  const item = announcement?.item
  const title = useMemo(() => {
    const lang = (i18n.language || 'hy').split('-')[0]
    const pick = (obj: any) => {
      if (!obj) return ''
      if (lang === 'en') return obj.name_en || obj.name_am || obj.name_hy || obj.name_ru || ''
      if (lang === 'ru') return obj.name_ru || obj.name_am || obj.name_hy || obj.name_en || ''
      return obj.name_am || obj.name_hy || obj.name_en || obj.name_ru || ''
    }
    return (
      pick(item) ||
      pick(a) ||
      a?.title ||
      a?.item_name ||
      t('announcements.apply')
    )
  }, [i18n.language, item, a, t])

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

  const announcementStatus = announcement?.status ?? ''
  const announcementOwnerId = announcement?.owner_id ?? null

  const renderItem = useCallback(
    ({ item: app }: { item: ApplicationListItem }) => (
      <ApplicationCard
        app={app}
        announcementId={announcementId}
        announcementStatus={announcementStatus}
        announcementOwnerId={announcementOwnerId}
        quantityUnit={quantityUnit}
        currentUserId={user?.id ?? null}
        actionLoadingId={actionLoadingId}
        actionLoadingType={actionLoadingType}
        onApprove={handleApprove}
        onReject={handleReject}
        onCloseApplication={handleCloseApplication}
        onView={handleView}
        onEdit={handleEdit}
      />
    ),
    [
      announcementId,
      announcementStatus,
      announcementOwnerId,
      quantityUnit,
      user?.id,
      actionLoadingId,
      actionLoadingType,
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
              refreshing={isManualRefreshing}
              onRefresh={handleManualRefresh}
              colors={[colors.buttonPrimary]}
              tintColor={colors.buttonPrimary}
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
