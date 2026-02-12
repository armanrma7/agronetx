import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors } from '../../theme/colors'

export interface Notification {
  id: string
  type: 'business' | 'administrative'
  message: string
  announcementId?: string
  timestamp: string
  isRead: boolean
  timeAgo: string
}

type TabType = 'all' | 'unread'

interface GroupedNotifications {
  period: string
  notifications: Notification[]
}

export function NotificationsPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabType>('all')

  const filteredNotifications = useMemo(() => {
    // TODO: Fetch notifications from API when endpoint is available
    let notifications: Notification[] = []

    // Filter by tab (all vs unread)
    if (activeTab === 'unread') {
      notifications = notifications.filter(n => !n.isRead)
    }

    return notifications
  }, [activeTab])

  const groupedNotifications = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const groups: GroupedNotifications[] = []
    const todayGroup: Notification[] = []
    const yesterdayGroup: Notification[] = []
    const monthAgoGroup: Notification[] = []

    filteredNotifications.forEach(notification => {
      const notifDate = new Date(notification.timestamp)
      
      if (notifDate >= today) {
        todayGroup.push(notification)
      } else if (notifDate >= yesterday) {
        yesterdayGroup.push(notification)
      } else if (notifDate >= monthAgo) {
        monthAgoGroup.push(notification)
      }
    })

    if (todayGroup.length > 0) {
      groups.push({ period: 'Այսօր', notifications: todayGroup })
    }
    if (yesterdayGroup.length > 0) {
      groups.push({ period: 'Երեկ', notifications: yesterdayGroup })
    }
    if (monthAgoGroup.length > 0) {
      groups.push({ period: 'Month ago', notifications: monthAgoGroup })
    }

    return groups
  }, [filteredNotifications])

  return (
    <View style={styles.container}>
      {/* Top Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text numberOfLines={1} style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            Բոլորը
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'unread' && styles.tabActive]}
          onPress={() => setActiveTab('unread')}
        >
          <Text numberOfLines={1} style={[styles.tabText, activeTab === 'unread' && styles.tabTextActive]}>
            Չկարդացած
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {groupedNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('notifications.empty')}</Text>
          </View>
        ) : (
          groupedNotifications.map((group, index) => (
            <View key={index} style={styles.groupContainer}>
              <Text style={styles.groupTitle}>{group.period}</Text>
              {group.notifications.map((notification) => (
                <View key={notification.id} style={styles.notificationCard}>
                  <View style={styles.notificationRow}>
                    <View style={styles.notificationLeft}>
                      <View style={[styles.dot, notification.isRead ? styles.dotRead : styles.dotUnread]} />
                      <View style={styles.notificationTextContainer}>
                        <Text style={styles.notificationText}>{notification.message}</Text>
                        {notification.announcementId && (
                          <TouchableOpacity>
                            <Text style={styles.announcementId}>
                              Հայտարարություն ID: {notification.announcementId}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    <Text style={styles.timestamp}>
                      {notification.timeAgo}h ago
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  groupContainer: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    marginLeft: 4,
  },
  notificationCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
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
    backgroundColor: '#4CAF50',
  },
  dotRead: {
    backgroundColor: '#9E9E9E',
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 6,
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
})
