import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors } from '../../../theme/colors'
import type { ApplicationListItem } from '../../../lib/api/announcements.api'
import { formatDate, getStatusLabel, getStatusColor, isClosedStatus } from './utils'

export interface ApplicationCardProps {
  app: ApplicationListItem
  announcementId: string
  quantityUnit: string
  currentUserId: string | null
  actionLoadingId: string | null
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onCloseApplication: (id: string) => void
  onView: (app: ApplicationListItem) => void
  onEdit?: (app: ApplicationListItem) => void
}

export const ApplicationCard = React.memo(function ApplicationCard({
  app,
  announcementId,
  quantityUnit,
  currentUserId,
  actionLoadingId,
  onApprove,
  onReject,
  onCloseApplication,
  onView,
  onEdit,
}: ApplicationCardProps) {
  const { t } = useTranslation()

  const statusLabel = getStatusLabel(app.status, t)
  const statusColor = getStatusColor(app.status)
  const transactionDate = app.delivery_dates?.[0] || app.created_at
  const location =
    [app.region_name || app.region, app.village_name || app.village]
      .filter(Boolean)
      .join(', ') || t('common.notSpecified')
  const isActionLoading = actionLoadingId === app.id
  const isApproved = /approved|accepted/i.test(app.status)
  const isRejected = /rejected/i.test(app.status)
  const isClosed = isClosedStatus(app.status)
  const isMyApplication =
    currentUserId != null && String(app.user_id) === String(currentUserId)
  const isPending = !isApproved && !isRejected && !isClosed

  const hasThreeButtons =
    !isMyApplication && !isApproved && !isRejected

  return (
    <View style={styles.card}>
      <View style={styles.statusRow}>
        <View style={styles.statusLeft}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
        {isMyApplication && isPending && onEdit && (
          <TouchableOpacity
            style={styles.editButtonTop}
            onPress={() => onEdit(app)}
          >
            <Text style={styles.editButtonTopText}>
              {t('common.edit')}
            </Text>
          </TouchableOpacity>
        )}
        {hasThreeButtons && (
          <TouchableOpacity
            style={styles.viewButtonTop}
            onPress={() => onView(app)}
          >
            <Text style={styles.viewButtonTopText}>
              {t('applications.view')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.dateQuantityRow}>
        <Text style={styles.detailLabelInline}>
          {t('applications.transactionDate')}:
        </Text>
        <View style={styles.detailRightGroup}>
          <Text style={styles.detailValue}>
            {formatDate(transactionDate, t)}
          </Text>
          {app.count != null && (
            <Text style={styles.quantityValue}>
              {app.count} {app.unit || quantityUnit || ''}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.detailRowHorizontal}>
        <Text style={styles.detailLabelInline}>
          {t('applications.location')}:
        </Text>
        <Text style={styles.detailValue}>{location}</Text>
      </View>

      <View style={styles.actions}>
        <View style={styles.actionsLeft}>
          {isMyApplication ? (
            <>
              {!isClosed || isRejected && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  disabled={isActionLoading}
                  onPress={() => onCloseApplication(app.id)}
                >
                  {isActionLoading ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <Text style={styles.cancelButtonText}>
                      {t('common.cancel')}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              {!isApproved && !isRejected && (
                <TouchableOpacity
                  style={styles.rejectButton}
                  disabled={isActionLoading}
                  onPress={() => onReject(app.id)}
                >
                  {isActionLoading ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <Text style={styles.rejectButtonText}>
                      {t('applications.reject')}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              {!isRejected && !isApproved && (
                <TouchableOpacity
                  style={styles.approveButton}
                  disabled={isActionLoading}
                  onPress={() => onApprove(app.id)}
                >
                  {isActionLoading ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.approveButtonText}>
                      {t('applications.approve')}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              {isApproved && !isClosed && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  disabled={isActionLoading}
                  onPress={() => onCloseApplication(app.id)}
                >
                  {isActionLoading ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <Text style={styles.cancelButtonText}>
                      {t('common.cancel')}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
        {!hasThreeButtons && (
          <TouchableOpacity
            style={styles.viewButtonBottom}
            onPress={() => onView(app)}
          >
            <Text style={styles.viewButtonBottomText}>
              {t('applications.view')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
})

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    gap: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  statusLeft: {
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
    fontSize: 14,
    fontWeight: '500',
    color: colors.textTile,
  },
  dateQuantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  detailRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.darkGray,
  },
  detailRowHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabelInline: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    maxWidth: '65%',
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 14,
    gap: 10,
  },
  actionsLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewButtonTop: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButtonTopText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  viewButtonBottom: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButtonBottomText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButtonText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '600',
  },
  approveButton: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.buttonPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButtonText: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '600',
  },
  editButtonTop: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.buttonPrimary,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonTopText: {
    fontSize: 14,
    color: colors.buttonPrimary,
    fontWeight: '600',
  },
})
