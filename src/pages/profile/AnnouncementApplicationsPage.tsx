import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation, useRoute } from '@react-navigation/native'
import { colors } from '../../theme/colors'
import { Announcement } from '../../types'
import Icon from '../../components/Icon'
import { AppHeader } from '../../components/AppHeader'
import * as announcementsAPI from '../../lib/api/announcements.api'
import type { ApplicationListItem } from '../../lib/api/announcements.api'

interface RouteParams {
  announcementId: string
}

function formatDate(dateString: string | undefined, t: (key: string) => string): string {
  if (!dateString) return '–'
  const date = new Date(dateString)
  const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
  const month = t(`months.${monthKeys[date.getMonth()]}`)
  return `${date.getDate()} ${month} ${date.getFullYear()}`
}

function getStatusLabel(status: string, t: (key: string) => string): string {
  switch (status?.toLowerCase()) {
    case 'pending':
    case 'in_progress':
    case 'in progress':
      return t('applications.statusInProgress')
    case 'approved':
    case 'accepted':
      return t('applications.statusApproved')
    case 'rejected':
      return t('applications.statusRejected')
    default:
      return status || t('applications.statusInProgress')
  }
}

function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'approved':
    case 'accepted':
      return colors.success
    case 'rejected':
      return colors.error
    default:
      return colors.warning
  }
}

export function AnnouncementApplicationsPage() {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const route = useRoute()
  const { announcementId } = (route.params as RouteParams) || { announcementId: '' }

  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [applications, setApplications] = useState<ApplicationListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!announcementId) return
    if (!isRefresh) setLoading(true)
    else setRefreshing(true)
    try {
      const [announcementData, applicationsList] = await Promise.all([
        announcementsAPI.getAnnouncementByIdAPI(announcementId),
        announcementsAPI.getApplicationsByAnnouncementAPI(announcementId),
      ])
      setAnnouncement(announcementData)
      setApplications(applicationsList)
    } catch (err) {
      Alert.alert(t('common.error'), t('applications.loadError'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [announcementId, t])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleApprove = (applicationId: string) => {
    Alert.alert(
      t('applications.approve'),
      t('applications.approveConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('applications.approve'),
          onPress: async () => {
            setActionLoadingId(applicationId)
            try {
              await announcementsAPI.approveApplicationAPI(applicationId)
              await fetchData(true)
            } catch (err: any) {
              Alert.alert(t('common.error'), err?.response?.data?.message || t('common.error'))
            } finally {
              setActionLoadingId(null)
            }
          },
        },
      ]
    )
  }

  const handleReject = (applicationId: string) => {
    Alert.alert(
      t('applications.reject'),
      t('applications.rejectConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('applications.reject'),
          style: 'destructive',
          onPress: async () => {
            setActionLoadingId(applicationId)
            try {
              await announcementsAPI.rejectApplicationAPI(applicationId)
              await fetchData(true)
            } catch (err: any) {
              Alert.alert(t('common.error'), err?.response?.data?.message || t('common.error'))
            } finally {
              setActionLoadingId(null)
            }
          },
        },
      ]
    )
  }

  const handleView = (announcementId: string) => {
    const parent = navigation.getParent()
    if (parent) {
      (parent as any).navigate('AnnouncementDetail', { announcementId })
    } else {
      (navigation as any).navigate('AnnouncementDetail', { announcementId })
    }
  }

  const a = announcement as any
  const applicantsCount = applications.length
  const item = announcement?.item
  const title = (item?.name_am || item?.name_en || item?.name_ru) || a?.name_hy || a?.name_en || a?.name_ru || a?.title || a?.item_name || t('announcements.apply')
  const quantity = announcement?.available_quantity ?? a?.quantity
  const price = announcement?.price
  const priceUnit = (announcement as any).price_unit ?? announcement?.unit ?? ''
  const quantityUnit = announcement?.unit ?? a?.quantity_unit ?? ''

  if (loading && !announcement) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.buttonPrimary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <AppHeader showBack />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} />
        }
      >
        {/* Header: title, quantity • price, applicants */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.meta}>
            {quantity != null && quantityUnit ? `${Number(quantity).toLocaleString()} ${quantityUnit}` : ''}
            {price != null && priceUnit ? ` • ${Number(price).toLocaleString()} ${priceUnit}` : ''}
          </Text>
          <View style={styles.applicantsRow}>
            <Icon name="people" size={16} color={colors.textSecondary} />
            <Text style={styles.applicantsText}>{t('applications.applicantsCountLabel')}: {applicantsCount}</Text>
          </View>
        </View>

        {/* Application cards */}
        {applications.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('common.empty')}</Text>
          </View>
        ) : (
          applications.map((app) => {
            const statusLabel = getStatusLabel(app.status, t)
            const statusColor = getStatusColor(app.status)
            const transactionDate = app.delivery_dates?.[0] || app.created_at
            const location = [app.region_name || app.region, app.village_name || app.village].filter(Boolean).join(', ') || '–'
            const isActionLoading = actionLoadingId === app.id
            const isApproved = /approved|accepted/i.test(app.status)
            const isRejected = /rejected/i.test(app.status)

            return (
              <View key={app.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={styles.statusText}>{statusLabel}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => handleView(announcementId)}
                  >
                    <Text style={styles.viewButtonText}>{t('applications.view')}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('applications.transactionDate')}:</Text>
                  <Text style={styles.detailValue}>{formatDate(transactionDate, t)}</Text>
                </View>
                {app.count != null && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailValue}>{app.count} {app.unit || quantityUnit || ''}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('applications.location')}:</Text>
                  <Text style={styles.detailValue}>{location}</Text>
                </View>
                <View style={styles.actions}>
                  {!isApproved && (
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => handleReject(app.id)}
                      disabled={isActionLoading}
                    >
                      {actionLoadingId === app.id ? (
                        <ActivityIndicator size="small" color={colors.error} />
                      ) : (
                        <Text style={styles.rejectButtonText}>{t('applications.reject')}</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  {!isRejected && (
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() => handleApprove(app.id)}
                      disabled={isActionLoading}
                    >
                      {actionLoadingId === app.id ? (
                        <ActivityIndicator size="small" color={colors.white} />
                      ) : (
                        <Text style={styles.approveButtonText}>{t('applications.approve')}</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )
          })
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textTertiary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  meta: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  applicantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  applicantsText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textTertiary,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  viewButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  viewButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  detailRow: {
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  rejectButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    minWidth: 90,
    alignItems: 'center',
  },
  rejectButtonText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '600',
  },
  approveButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.buttonPrimary,
    minWidth: 90,
    alignItems: 'center',
  },
  approveButtonText: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '600',
  },
})
