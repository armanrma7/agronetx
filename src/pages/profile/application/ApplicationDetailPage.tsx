import React, { useCallback, useEffect } from 'react'
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { colors } from '../../../theme/colors'
import { AppHeader } from '../../../components/AppHeader'
import { useAuth } from '../../../context/AuthContext'
import { useApplicationsByAnnouncement, useApproveApplication, useRejectApplication, useCancelApplication } from '../../../hooks/useApplicationQueries'
import { useAnnouncementDetail } from '../../../hooks/useAnnouncementQueries'
import { formatDate, getStatusLabel, getStatusColor } from './utils'
import { translateMeasureUnit } from '../../../utils/units'
import {
  isAnnouncementOwner,
  canApproveApplication,
  canRejectApplication,
  canCancelApplication,
  canEditApplication,
  canApplyAgainFromApplication,
  canAnnouncerViewApplicantContact,
} from '../../../utils/announcementActions'

interface RouteParams {
  announcementId: string
  appId: string
  quantityUnit: string
}

function getInitials(fullName?: string): string {
  if (!fullName?.trim()) return '?'
  const parts = fullName.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

/** Map API user_type to `common.*` i18n key (farmer | organization). */
function userTypeToCommonKey(userType?: string): string {
  const u = (userType || 'farmer').toLowerCase().trim()
  if (u === 'company' || u === 'organization') return 'organization'
  if (u === 'buyer') return 'buyer'
  return 'farmer'
}

function regionVillageDisplayName(
  rv: { name_am?: string; name_en?: string; name_ru?: string; name_hy?: string } | undefined,
  lang: string,
): string {
  if (!rv) return ''
  if (lang.startsWith('hy')) return (rv.name_hy || rv.name_am || rv.name_en || '').trim()
  if (lang.startsWith('ru')) return (rv.name_ru || rv.name_en || rv.name_am || '').trim()
  return (rv.name_en || rv.name_am || rv.name_ru || '').trim()
}

export function ApplicationDetailPage() {
  const { t, i18n } = useTranslation()
  const navigation = useNavigation()
  const route = useRoute()
  const { user } = useAuth()
  const { announcementId, appId, quantityUnit } = (route.params as RouteParams) || {}

  const { data: applications = [], isLoading: loadingApplications } = useApplicationsByAnnouncement(announcementId, !!announcementId)
  const { data: announcement = null } = useAnnouncementDetail(announcementId, !!announcementId)

  const approveApp = useApproveApplication()
  const rejectApp = useRejectApplication()
  const cancelApp = useCancelApplication()

  const app = applications.find(a => a.id === appId)
  const announcementStatus = announcement?.status ?? ''

  // Per-button loading via mutation variables
  const isApproveLoading = approveApp.isPending && (approveApp.variables as any)?.id === appId
  const isRejectLoading = rejectApp.isPending && (rejectApp.variables as any)?.id === appId
  const isCancelLoading = cancelApp.isPending && (cancelApp.variables as any)?.id === appId
  const isActionLoading = isApproveLoading || isRejectLoading || isCancelLoading

  const handleApprove = useCallback(() => {
    Alert.alert(t('applications.approve'), t('applications.approveConfirm'), [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('common.yes'),
        onPress: () =>
          approveApp.mutate({ id: appId, announcementId }, {
            onSuccess: () => Alert.alert(t('common.success'), t('applications.approveSuccess')),
            onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('applications.approveError')),
          }),
      },
    ])
  }, [appId, announcementId, approveApp, t])

  const handleReject = useCallback(() => {
    Alert.alert(t('applications.reject'), t('applications.rejectConfirm'), [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('common.yes'),
        style: 'destructive',
        onPress: () =>
          rejectApp.mutate({ id: appId, announcementId }, {
            onSuccess: () => { Alert.alert(t('common.success'), t('applications.rejectSuccess')); navigation.goBack() },
            onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('applications.rejectError')),
          }),
      },
    ])
  }, [appId, announcementId, rejectApp, navigation, t])

  const handleCancelApplication = useCallback(() => {
    const isOwn = user?.id != null && app != null && String(app.user_id) === String(user.id)
    Alert.alert(t('applications.closeTitle'), t('applications.closeConfirm'), [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('common.yes'),
        style: 'destructive',
        onPress: () =>
          cancelApp.mutate({ id: appId, announcementId, isOwnApplication: isOwn }, {
            onSuccess: () => { Alert.alert(t('common.success'), t('applications.closed')); navigation.goBack() },
            onError: (e: any) => Alert.alert(t('common.error'), e?.response?.data?.message || t('applications.closeError')),
          }),
      },
    ])
  }, [appId, announcementId, cancelApp, app, user?.id, navigation, t])

  const handleApplyAgain = useCallback(() => {
    const a = announcement as any
    const nav = (navigation.getParent() ?? navigation) as any
    nav.navigate('ApplicationForm', {
      announcementId,
      announcementType: announcement?.category ?? 'goods',
      announcementTitle:
        announcement?.item?.name_am ||
        announcement?.item?.name_en ||
        a?.name_hy ||
        a?.title ||
        '',
    })
  }, [navigation, announcementId, announcement])

  const handleEdit = useCallback(() => {
    if (!app) return
    const a = announcement as any
    const nav = (navigation.getParent() ?? navigation) as any
    nav.navigate('ApplicationForm', {
      announcementId,
      announcementType: announcement?.category ?? (announcement as any)?.type ?? 'goods',
      announcementTitle:
        announcement?.item?.name_am ||
        announcement?.item?.name_en ||
        a?.name_hy ||
        a?.title ||
        '',
      announcement,
      applicationId: app.id,
      prefill: {
        deliveryDates: app.delivery_dates,
        count: app.count,
        unit: app.unit,
        notes: app.notes,
      },
    })
  }, [navigation, announcementId, announcement, app])

  if (!app) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <AppHeader showBack />
        <View style={styles.emptyStateWrapper}>
          <View style={styles.emptyContainer}>
            {loadingApplications ? (
              <ActivityIndicator size="large" color={colors.buttonPrimary} />
            ) : (
              <Text style={styles.emptyText}>{t('applications.empty')}</Text>
            )}
          </View>
        </View>
      </SafeAreaView>
    )
  }

  const statusLabel = getStatusLabel(app.status, t)
  const statusColor = getStatusColor(app.status)

  const applicant = app.applicant
  const applicantName = applicant?.full_name || t('common.unknownUser')
  const applicantTypeKey = userTypeToCommonKey(applicant?.user_type)

  const owner = announcement?.owner
  const ownerAny = owner as any
  const ownerName = owner?.full_name || t('common.unknownUser')
  const ownerTypeKey = userTypeToCommonKey(ownerAny?.user_type ?? ownerAny?.userType)

  const ownerLocation =
    owner &&
    [
      regionVillageDisplayName(owner.region, i18n.language),
      regionVillageDisplayName(owner.village, i18n.language),
    ]
      .filter(Boolean)
      .join(', ')
  const applicantLocation = [app.region_name || app.region, app.village_name || app.village]
    .filter(Boolean)
    .join(', ')

  const allDates = app.delivery_dates ?? []
  const transactionDate = allDates[0]

  // Role derived from announcement ownership
  const isAnnouncerUser = announcement != null && isAnnouncementOwner(announcement, user?.id)
  const isMyApplication = user?.id != null && String(app.user_id) === String(user.id)

  /** I applied → show listing owner. I’m the announcer reviewing this app → show applicant. */
  const showListingOwner = isMyApplication
  const cardName = showListingOwner ? ownerName : applicantName
  const cardTypeKey = showListingOwner ? ownerTypeKey : applicantTypeKey
  const cardPicture = showListingOwner
    ? (ownerAny?.profile_picture ?? ownerAny?.profilePicture ?? null)
    : (applicant?.profile_picture ?? null)
  const cardInitials = getInitials(showListingOwner ? owner?.full_name : applicant?.full_name)
  const cardLocation = showListingOwner ? ownerLocation : applicantLocation

  // Case 2f: BLOCKED — no actions for anyone
  const isBlockedApp = /^blocked$/i.test((app.status || '').trim())

  // Derive action visibility from centralized utilities
  const showApprove = !isBlockedApp && canApproveApplication(announcementStatus, app, isAnnouncerUser)
  const showReject = !isBlockedApp && canRejectApplication(announcementStatus, app, isAnnouncerUser)
  const showCancelApp = !isBlockedApp && canCancelApplication(announcementStatus, app, user?.id)
  const showEdit = !isBlockedApp && canEditApplication(announcementStatus, app, user?.id)
  // On own application detail: only Edit (when pending) and Cancel — no Apply Again
  const showApplyAgain =
    !isBlockedApp &&
    canApplyAgainFromApplication(announcementStatus, app, user?.id) &&
    !isMyApplication
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <AppHeader showBack />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Counterparty: listing owner (when I applied) or applicant (when I’m the announcer) */}
          <View style={styles.applicantCard}>
            <View style={styles.avatar}>
              {cardPicture ? (
                <Image source={{ uri: cardPicture }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{cardInitials}</Text>
              )}
            </View>
            <View style={styles.applicantInfo}>
              <Text style={styles.applicantName}>{cardName}</Text>
              <Text style={styles.applicantRole}>{t(`common.${cardTypeKey}`)}</Text>
              {/* {cardLocation ? (
                <Text style={styles.applicantLocation}>
                  {t('common.location')}:{' '}
                  <Text style={styles.applicantLocationValue}>{cardLocation}</Text>
                </Text>
              ) : null} */}
            </View>
          </View>

          {/* Application details */}
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>{t('applications.details')}</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('applications.status')}:</Text>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
            </View>

            {transactionDate ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('applications.transactionDate')}:</Text>
                <Text style={styles.detailValue}>{formatDate(transactionDate, t)}</Text>
              </View>
            ) : null}

            {allDates.length > 1 && (
              <View style={styles.detailRowWrap}>
                <Text style={styles.detailLabel}>{t('applications.deliveryDates')}:</Text>
                <View style={styles.datesWrap}>
                  {allDates.map((d, i) => (
                    <Text key={i} style={styles.dateChip}>{formatDate(d, t)}</Text>
                  ))}
                </View>
              </View>
            )}

            {app.count != null ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('applications.requestedQuantity')}:</Text>
                <Text style={styles.detailValue}>
                  {app.count} {translateMeasureUnit(app.unit || quantityUnit, i18n.language)}
                </Text>
              </View>
            ) : null}

            {app.notes ? (
              <View style={styles.notesBlock}>
                <Text style={styles.detailLabel}>{t('applications.notes')}:</Text>
                <View style={styles.notesBox}>
                  <Text style={styles.notesText}>{app.notes}</Text>
                </View>
              </View>
            ) : null}

            {app.created_at ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('applications.applicationDate')}:</Text>
                <Text style={styles.detailValue}>{formatDate(app.created_at, t)}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>

        {/* Action buttons */}
        {(showApprove || showReject || showCancelApp || showEdit || showApplyAgain) && (
          <View style={styles.actions}>
            {/* Applicant: Edit (only when own application and PENDING) */}
            {showEdit && (
              <TouchableOpacity
                style={styles.approveButton}
                disabled={isActionLoading}
                onPress={handleEdit}
              >
                <Text style={styles.approveButtonText}>{t('common.edit')}</Text>
              </TouchableOpacity>
            )}

            {/* Announcer: Reject (for PENDING and APPROVED applications) */}
            {showReject && (
              <TouchableOpacity
                style={styles.rejectButton}
                disabled={isActionLoading}
                onPress={handleReject}
              >
                {isRejectLoading ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <Text style={styles.rejectButtonText}>{t('applications.reject')}</Text>
                )}
              </TouchableOpacity>
            )}

            {/* Announcer: Approve (for PENDING applications only) */}
            {showApprove && (
              <TouchableOpacity
                style={styles.approveButton}
                disabled={isActionLoading}
                onPress={handleApprove}
              >
                {isApproveLoading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.approveButtonText}>{t('applications.approve')}</Text>
                )}
              </TouchableOpacity>
            )}

            {/* Applicant: Cancel (for PENDING and APPROVED applications) */}
            {showCancelApp && (
              <TouchableOpacity
                style={styles.cancelButton}
                disabled={isActionLoading}
                onPress={handleCancelApplication}
              >
                {isCancelLoading ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                )}
              </TouchableOpacity>
            )}

            {/* Applicant: Apply Again (for APPROVED/REJECTED/CANCELED applications) */}
            {showApplyAgain && (
              <TouchableOpacity
                style={styles.approveButton}
                disabled={isActionLoading}
                onPress={handleApplyAgain}
              >
                <Text style={styles.approveButtonText}>{t('announcements.applyAgain')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
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
  content: {
    marginTop: 20,
    padding: 25,
    paddingBottom: 32,
    gap: 20,
  },
  emptyStateWrapper: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  // ── Applicant card ──────────────────────────────────────
  applicantCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.buttonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  applicantInfo: {
    flex: 1,
    gap: 2,
  },
  counterpartyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  applicantName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 1,
  },
  applicantRole: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  applicantLocation: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 3,
  },
  applicantLocationValue: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  // ── Details card ────────────────────────────────────────
  detailsCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
  },
  detailRowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingBottom: 16,
  },
  detailRowWrap: {
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailLabelLast: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    maxWidth: '55%',
    textAlign: 'right',
  },
  detailValueLast: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'right',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
  },
  datesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dateChip: {
    fontSize: 12,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontWeight: '500',
  },
  notesBlock: {
    paddingVertical: 13,
    gap: 10,
  },
  notesBox: {
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    minHeight: 80,
  },
  notesText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  // ── Action buttons ──────────────────────────────────────
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  rejectButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: colors.error,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.error,
  },
  approveButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.buttonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.error,
  },
})
