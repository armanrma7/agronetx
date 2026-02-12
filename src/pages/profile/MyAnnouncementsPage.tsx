import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../theme/colors'
import { Announcement } from '../../types'
import { MyAnnouncementCard } from './MyAnnouncementCard'
import * as announcementsAPI from '../../lib/api/announcements.api'

type TabType = 'published' | 'applied'

export function MyAnnouncementsPage() {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('published')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnnouncements()
  }, [activeTab])

  const fetchAnnouncements = async () => {
    setLoading(true)
    try {
      if (activeTab === 'published') {
        // Fetch all announcements from /announcements/me without any filter
        const data = await announcementsAPI.getMyAnnouncementsAPI()
        setAnnouncements(data || [])
      } else {
        // Fetch announcements user has applied to
        const data = await announcementsAPI.getAppliedAnnouncementsAPI()
        setAnnouncements(data || [])
      }
    } catch (err) {
      console.error('Error fetching announcements:', err)
      setAnnouncements([])
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = (announcement: Announcement) => {
    console.log('Cancel announcement:', announcement.id)
    // TODO: Implement cancel functionality
  }

  const handleView = (announcement: Announcement) => {
    const parent = navigation.getParent()
    if (parent) {
      parent.navigate('AnnouncementDetail', { announcementId: announcement.id })
    } else {
      ;(navigation as any).navigate('AnnouncementDetail', { announcementId: announcement.id })
    }
  }

  const renderAnnouncementCard = ({ item }: { item: Announcement }) => {
    return (
      <MyAnnouncementCard
        announcement={item}
        onCancel={handleCancel}
        onView={handleView}
        showMyApplications={activeTab === 'applied'}
      />
    )
  }

  return (
    <View style={styles.container}>
      {/* Top Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'published' && styles.tabActive]}
          onPress={() => setActiveTab('published')}
        >
          <Text style={[styles.tabText, activeTab === 'published' && styles.tabTextActive]}>
            Հրապարակված
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'applied' && styles.tabActive]}
          onPress={() => setActiveTab('applied')}
        >
          <Text style={[styles.tabText, activeTab === 'applied' && styles.tabTextActive]}>
            Դիմած
          </Text>
        </TouchableOpacity>
      </View>

      {/* Announcements */}
      <FlatList
        data={announcements}
        renderItem={renderAnnouncementCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshing={loading}
        onRefresh={fetchAnnouncements}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {loading ? 'Բեռնվում է...' : 'Դատարկ է'}
            </Text>
          </View>
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
})

