/**
 * Announcement Applications Page
 * Lists applications for an announcement (from My Announcements). Do not remove this file.
 */

import React, { useState, useEffect, useCallback } from 'react'
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
import * as announcementsAPI from '../../../lib/api/announcements.api'
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

  const [announcement, setAnnouncement] = useState<Announcement | null>(
    paramAnnouncement ?? null,
  )
  const [applications, setApplications] = useState<ApplicationListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!announcementId) return
      isRefresh ? setRefreshing(true) : setLoading(true)
      try {
        const currentParams = (route.params as RouteParams) || {}
        if (currentParams.announcement) {
          setAnnouncement(currentParams.announcement)
          const list =
            await announcementsAPI.getApplicationsByAnnouncementAPI(
              announcementId,
            )
          setApplications(list)
        } else {
          const [announcementData, list] = await Promise.all([
            announcementsAPI.getAnnouncementByIdAPI(announcementId),
            announcementsAPI.getApplicationsByAnnouncementAPI(announcementId),
          ])
          setAnnouncement(announcementData)
          setApplications(list)
        }
      } catch {
        Alert.alert(t('common.error'), t('applications.loadError'))
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [announcementId, route.params, t],
  )

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const runAction = useCallback(
    async (
      id: string,
      apiCall: () => Promise<any>,
      successMessage?: string,
    ) => {
      setActionLoadingId(id)
      try {
        await apiCall()
        await fetchData(true)
        if (successMessage) Alert.alert(t('common.success'), successMessage)
      } catch (err: any) {
        Alert.alert(
          t('common.error'),
          err?.response?.data?.message || t('common.error'),
        )
      } finally {
        setActionLoadingId(null)
      }
    },
    [fetchData, t],
  )

  const handleApprove = useCallback(
    (id: string) =>
      Alert.alert(t('applications.approve'), t('applications.approveConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('applications.approve'),
          onPress: () =>
            runAction(id, () => announcementsAPI.approveApplicationAPI(id)),
        },
      ]),
    [t, runAction],
  )

  const handleReject = useCallback(
    (id: string) =>
      Alert.alert(t('applications.reject'), t('applications.rejectConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('applications.reject'),
          style: 'destructive',
          onPress: () =>
            runAction(id, () => announcementsAPI.rejectApplicationAPI(id)),
        },
      ]),
    [t, runAction],
  )

  const handleCloseApplication = useCallback(
    (id: string) =>
      Alert.alert(
        t('applications.closeTitle'),
        t('applications.closeConfirm'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('announcements.closeApplication'),
            style: 'destructive',
            onPress: () =>
              runAction(
                id,
                () => announcementsAPI.closeApplicationAPI(id),
                t('applications.closed'),
              ),
          },
        ],
      ),
    [t, runAction],
  )

  const handleView = useCallback(
    (id: string) => {
      const parent = navigation.getParent()
      if (parent) {
        ;(parent as any).navigate('AnnouncementDetail', { announcementId: id })
      } else {
        ;(navigation as any).navigate('AnnouncementDetail', { announcementId: id })
      }
    },
    [navigation],
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
  const quantity = announcement?.available_quantity ?? a?.quantity
  const price = announcement?.price
  const priceUnit =
    (announcement as any)?.price_unit ?? announcement?.unit ?? ''
  const quantityUnit = announcement?.unit ?? a?.quantity_unit ?? ''

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
        {loading && !refreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.buttonPrimary} />
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        )}
      </>
    ),
    [
      title,
      quantity,
      quantityUnit,
      price,
      priceUnit,
      applications.length,
      loading,
      refreshing,
      t,
    ],
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
    ],
  )

  const keyExtractor = useCallback((item: ApplicationListItem) => item.id, [])

  const listEmptyComponent = useCallback(
    () =>
      !loading && !refreshing ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('common.empty')}</Text>
        </View>
      ) : null,
    [loading, refreshing, t],
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textTertiary,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textTertiary,
  },
})
