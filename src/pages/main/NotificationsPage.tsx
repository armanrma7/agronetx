import React, { useEffect, useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors } from '../../theme/colors'
import { useNotificationsStore } from '../../store/notifications/useNotificationsStore'
import type { NotificationItem } from '../../lib/api/notifications.api'

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTimeAgo(dateStr: string, t: (key: string, opts?: any) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return t('notifications.minutesAgo', { count: mins }) || `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t('notifications.hoursAgo', { count: hours }) || `${hours}h`
  const days = Math.floor(hours / 24)
  return t('notifications.daysAgo', { count: days }) || `${days}d`
}

function getNotificationMessage(n: NotificationItem): string {
  return n.body || n.message || n.title || ''
}

function getAnnouncementId(n: NotificationItem): string | undefined {
  return n.data?.announcement_id || n.data?.announcementId
}

type Period = 'today' | 'yesterday' | 'earlier'

interface GroupedNotifications {
  period: Period
  label: string
  notifications: NotificationItem[]
}

// ─── Bottom Sheet ────────────────────────────────────────────────────────────

interface NotificationBottomSheetProps {
  notification: NotificationItem | null
  onClose: () => void
}

function NotificationBottomSheet({ notification, onClose }: NotificationBottomSheetProps) {
  const { t } = useTranslation()
  if (!notification) return null

  const message = getNotificationMessage(notification)
  const announcementId = getAnnouncementId(notification)

  return (
    <Modal
      visible={!!notification}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={sheetStyles.overlay}>
        <TouchableOpacity style={sheetStyles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={sheetStyles.sheet}>
          <View style={sheetStyles.handle} />
          <View style={sheetStyles.header}>
            <Text style={sheetStyles.title}>{t('notifications.detail')}</Text>
            <TouchableOpacity onPress={onClose} style={sheetStyles.closeBtn}>
              <Text style={sheetStyles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={sheetStyles.body} showsVerticalScrollIndicator={false}>
            {/* Status dot + type */}
            <View style={sheetStyles.statusRow}>
              <View style={[sheetStyles.dot, notification.is_seen ? sheetStyles.dotRead : sheetStyles.dotUnread]} />
              {notification.type ? (
                <Text style={sheetStyles.typeLabel}>{notification.type}</Text>
              ) : null}
            </View>

            {/* Message */}
            <Text style={sheetStyles.message}>{message}</Text>

            {/* Announcement link */}
            {announcementId && (
              <View style={sheetStyles.announcementRow}>
                <Text style={sheetStyles.announcementLabel}>{t('notifications.announcementId')}</Text>
                <Text style={sheetStyles.announcementValue}>#{announcementId}</Text>
              </View>
            )}

            {/* Extra data fields */}
            {notification.data && Object.keys(notification.data).filter(k => k !== 'announcement_id' && k !== 'announcementId').map(key => (
              <View key={key} style={sheetStyles.dataRow}>
                <Text style={sheetStyles.dataKey}>{key}</Text>
                <Text style={sheetStyles.dataValue}>{String(notification.data![key])}</Text>
              </View>
            ))}

            {/* Created at */}
            <Text style={sheetStyles.createdAt}>
              {new Date(notification.created_at).toLocaleString()}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function NotificationsPage() {
  const { t } = useTranslation()

  const {
    list,
    loading,
    loadingMore,
    hasMore,
    activeTab,
    setActiveTab,
    fetchNotifications,
    fetchUnreadCount,
    loadMore,
    refresh,
    markSeen,
  } = useNotificationsStore()

  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null)

  useEffect(() => {
    fetchNotifications(true, true)
    fetchUnreadCount()
  }, [])

  const handleNotificationPress = useCallback((notification: NotificationItem) => {
    setSelectedNotification(notification)
    markSeen(notification.id)
  }, [markSeen])

  const handleCloseSheet = useCallback(() => {
    setSelectedNotification(null)
  }, [])

  // Group notifications by date period
  const groupedNotifications = useMemo((): GroupedNotifications[] => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterdayStart = new Date(todayStart.getTime() - 86400000)

    const groups: Record<Period, NotificationItem[]> = { today: [], yesterday: [], earlier: [] }

    list.forEach(n => {
      const d = new Date(n.created_at)
      if (d >= todayStart) groups.today.push(n)
      else if (d >= yesterdayStart) groups.yesterday.push(n)
      else groups.earlier.push(n)
    })

    const result: GroupedNotifications[] = []
    if (groups.today.length)     result.push({ period: 'today',     label: t('notifications.today'),     notifications: groups.today })
    if (groups.yesterday.length) result.push({ period: 'yesterday', label: t('notifications.yesterday'), notifications: groups.yesterday })
    if (groups.earlier.length)   result.push({ period: 'earlier',   label: t('notifications.earlier'),   notifications: groups.earlier })

    return result
  }, [list, t])

  // Flatten for FlatList: section headers + items
  type FlatItem =
    | { type: 'header'; label: string; key: string }
    | { type: 'item'; notification: NotificationItem; key: string }

  const flatData = useMemo((): FlatItem[] => {
    const items: FlatItem[] = []
    groupedNotifications.forEach(group => {
      items.push({ type: 'header', label: group.label, key: `header-${group.period}` })
      group.notifications.forEach(n => items.push({ type: 'item', notification: n, key: n.id }))
    })
    return items
  }, [groupedNotifications])

  const renderItem = useCallback(({ item }: { item: FlatItem }) => {
    if (item.type === 'header') {
      return <Text style={styles.groupTitle}>{item.label}</Text>
    }
    const n = item.notification
    const message = getNotificationMessage(n)
    const announcementId = getAnnouncementId(n)

    return (
      <TouchableOpacity
        style={[styles.notificationCard, !n.is_seen && styles.notificationCardUnread]}
        onPress={() => handleNotificationPress(n)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationRow}>
          <View style={styles.notificationLeft}>
            <View style={[styles.dot, n.is_seen ? styles.dotRead : styles.dotUnread]} />
            <View style={styles.notificationTextContainer}>
              <Text style={[styles.notificationText, !n.is_seen && styles.notificationTextUnread]}>
                {message}
              </Text>
              {announcementId && (
                <Text style={styles.announcementId}>
                  {t('notifications.announcementId')} #{announcementId}
                </Text>
              )}
            </View>
          </View>
          <Text style={styles.timestamp}>{getTimeAgo(n.created_at, t)}</Text>
        </View>
      </TouchableOpacity>
    )
  }, [handleNotificationPress, t])

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            {t('notifications.all')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'unread' && styles.tabActive]}
          onPress={() => setActiveTab('unread')}
        >
          <Text style={[styles.tabText, activeTab === 'unread' && styles.tabTextActive]}>
            {t('notifications.unread')}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={flatData}
        keyExtractor={item => item.key}
        renderItem={renderItem}
        contentContainerStyle={flatData.length === 0 && !loading
          ? [styles.listContainer, { flexGrow: 1 }]
          : styles.listContainer
        }
        refreshing={loading}
        onRefresh={refresh}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('notifications.empty')}</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore && hasMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.buttonPrimary} />
            </View>
          ) : null
        }
      />

      <NotificationBottomSheet
        notification={selectedNotification}
        onClose={handleCloseSheet}
      />
    </View>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

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
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.buttonPrimary,
  },
  tabText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 8,
    marginLeft: 4,
  },
  notificationCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
  },
  notificationCardUnread: {
    backgroundColor: colors.borderLight,
    // borderLeftWidth: 3,
    // borderLeftColor: colors.buttonPrimary,
  },
  notificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  notificationLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
    marginTop: 6,
    flexShrink: 0,
  },
  dotUnread: {
    backgroundColor: colors.success,
  },
  dotRead: {
    backgroundColor: colors.textTertiary,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 6,
  },
  notificationTextUnread: {
    color: colors.textPrimary,
    fontWeight: '500',
  },
  announcementId: {
    fontSize: 13,
    color: colors.buttonPrimary,
    fontWeight: '500',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 4,
    flexShrink: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textTertiary,
  },
  footerLoader: {
    padding: 20,
    alignItems: 'center',
  },
})

const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  body: {
    paddingBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotUnread: {
    backgroundColor: colors.success,
  },
  dotRead: {
    backgroundColor: colors.textTertiary,
  },
  typeLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  message: {
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 24,
    marginBottom: 16,
  },
  announcementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    padding: 12,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
  },
  announcementLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  announcementValue: {
    fontSize: 13,
    color: colors.buttonPrimary,
    fontWeight: '600',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dataKey: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  dataValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  createdAt: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 16,
    textAlign: 'right',
  },
})
