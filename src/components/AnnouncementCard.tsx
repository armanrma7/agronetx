import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors } from '../theme/colors'
import { Announcement } from '../types'
import Icon from './Icon'
import * as announcementsAPI from '../lib/api/announcements.api'
import { useAuth } from '../context/AuthContext'

interface AnnouncementCardProps {
  announcement: Announcement
  onApply?: (announcement: Announcement) => void
  onView?: (announcement: Announcement) => void
  isFavorite?: boolean
  onFavoriteChange?: () => void
  /** When list API doesn't include applications, parent can pass IDs the user has already applied to. */
  appliedAnnouncementIds?: Set<string>
  /** Announcement IDs where the current user has a *pending* application (hide Apply only for these). */
  pendingApplicationAnnouncementIds?: Set<string>
}

/** True if the current user has a *pending* application for this announcement (hide Apply button). */
function hasPendingApplicationForCard(
  announcement: Announcement,
  userId: string | undefined,
  pendingApplicationAnnouncementIds?: Set<string>
): boolean {
  if (!userId) return false
  if (pendingApplicationAnnouncementIds?.has(announcement.id)) return true
  const a = announcement as any
  const apps = a.applications
  if (!Array.isArray(apps) || apps.length === 0) return false
  const myId = String(userId)
  const isPending = (s: string | undefined) => /^pending$/i.test((s || '').trim())
  return apps.some((app: any) => {
    const applicantId = app.applicant_id ?? app.user_id ?? app.userId
    return applicantId && String(applicantId) === myId && isPending(app.status)
  })
}

export function AnnouncementCard({ announcement, onApply, onView, isFavorite: initialIsFavorite, onFavoriteChange, appliedAnnouncementIds, pendingApplicationAnnouncementIds }: AnnouncementCardProps) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite || false)
  const [togglingFavorite, setTogglingFavorite] = useState(false)
  const hasPendingApplication = hasPendingApplicationForCard(announcement, user?.id, pendingApplicationAnnouncementIds)
  const canApply = !hasPendingApplication

  // Update favorite status when prop changes
  useEffect(() => {
    if (initialIsFavorite !== undefined) {
      setIsFavorite(initialIsFavorite)
    }
  }, [initialIsFavorite])

  const handleFavoritePress = async () => {
    if (togglingFavorite) return // Prevent double taps
    
    try {
      setTogglingFavorite(true)
      if (isFavorite) {
        await announcementsAPI.removeFavoriteAPI(announcement.id)
        setIsFavorite(false)
      } else {
        await announcementsAPI.addFavoriteAPI(announcement.id)
        setIsFavorite(true)
      }
      // Notify parent component if callback provided
      onFavoriteChange?.()
    } catch (error: any) {
      console.error('Error toggling favorite:', error)
      Alert.alert(
        t('common.error'),
        error?.response?.data?.message || t('favorites.toggleError')
      )
    } finally {
      setTogglingFavorite(false)
    }
  }
  
  // Get translated item name based on current language
  const getItemName = (): string => {
    const currentLang = i18n.language || 'hy'
    const announcementData = announcement as any
    
    // Try to get translated name based on current language
    if (currentLang === 'en' && announcementData.name_en) {
      return announcementData.name_en
    }
    if (currentLang === 'ru' && announcementData.name_ru) {
      return announcementData.name_ru
    }
    if ((currentLang === 'hy' || currentLang === 'am') && (announcementData.name_hy || announcementData.name_am)) {
      return announcementData.name_hy || announcementData.name_am || ''
    }
    
    // Fallback to item names or legacy
    const item = announcement.item
    return (item?.name_am || item?.name_en || item?.name_ru) || announcementData.title || announcementData.item_name || 'No title'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'published':
        return colors.success
      case 'completed':
        return colors.textTertiary
      case 'cancelled':
        return colors.error
      default:
        return colors.textTertiary
    }
  }

  const getTypeLabel = (announcement: Announcement) => {
    const subtype = (announcement as any).subtype || (announcement as any).sub_type
    const category = announcement.category || announcement.type
    const apiType = announcement.type || (announcement as any).apiType || subtype
    
    if (apiType === 'sell' || subtype === 'sell' || subtype === 'offer') {
      return t('announcementDetail.sell')
    }
    if (apiType === 'buy' || subtype === 'buy' || subtype === 'requirement') {
      return t('announcementDetail.buy')
    }
    if (apiType === 'rent' || category === 'rent') {
      return t('announcementDetail.rent')
    }
    
    const categoryType = category as 'goods' | 'service' | 'rent'
    switch (categoryType) {
      case 'goods':
        // Default to buy for goods if no subtype
        return t('announcementDetail.buy')
      case 'service':
        // Default to sell for service if no subtype
        return t('announcementDetail.sell')
      case 'rent':
        return t('announcementDetail.rent')
      default:
        return t('announcementDetail.buy')
    }
  }

  const translateUnit = (unit: string | undefined): string => {
    if (!unit) return ''
    const unitLower = unit.toLowerCase()
    
    // Common unit translations
    const unitMap: { [key: string]: string } = {
      'kg': 'կգ',
      'կգ': 'կգ',
      'կգ.': 'կգ',
      'կգ․': 'կգ',
      'գ': 'գ',
      'տ': 'տ',
      'լ': 'լ',
      'լիտր': 'լ',
      'մ': 'մ',
      'մ²': 'մ²',
      'հա': 'հա',
      'օր': 'օր',
      'ժամ': 'ժամ',
      'ծառա': 'ծառա',
    }
    
    return unitMap[unitLower] || unit
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    const months = monthKeys.map(key => t(`months.${key}`))
    return `${months[date.getMonth()]}.${date.getDate()}, ${date.getFullYear()}`
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.leftHeader}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(announcement.status) }]} />
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{getTypeLabel(announcement)}</Text>
          </View>
        </View>
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>
            {announcement.date_to
              ? `${t('announcements.deadline')}: ${formatDate(announcement.date_to)}`
              : formatDate(announcement.created_at)
            }
          </Text>
          <TouchableOpacity 
            onPress={handleFavoritePress}
            disabled={togglingFavorite}
            style={styles.favoriteButton}
          >
            {togglingFavorite ? (
              <ActivityIndicator size="small" color={colors.buttonPrimary} />
            ) : (
              <Icon 
                name={isFavorite ? "bookmark" : "bookmark-border"} 
                size={20} 
                color={isFavorite ? colors.buttonPrimary : colors.textTertiary} 
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">{getItemName()}</Text>
        </View>
        <Text style={styles.price}>
          {Number(announcement.price || 0).toLocaleString()} դր {translateUnit((announcement as any).price_unit ?? announcement.unit)}
        </Text>
      </View>

      {/* Details */}
      {announcement.available_quantity ? (
        <Text style={styles.detail}>
          {t('announcements.availableQuantity')}: {Number(announcement.available_quantity).toLocaleString()} {translateUnit(announcement.unit)}
        </Text>
      ) : null}

      {(() => {
        const regions = announcement.regions || []
        const villages = announcement.villages || []
        const regionCount = regions.length
        const villageCount = villages.length
        
        if (regionCount > 0 || villageCount > 0) {
          const parts: string[] = []
          if (regionCount > 0) {
            parts.push(`${t('addAnnouncement.region')}: ${regionCount}`)
          }
          if (villageCount > 0) {
            parts.push(`${t('addAnnouncement.village')}: ${villageCount}`)
          }
          return (
            <Text style={styles.detail}>
              {parts.join(', ')}
            </Text>
          )
        }
        return null
      })()}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.participantsRow}>
          <Icon name="people" size={16} color={colors.textTertiary} />
          <Text style={styles.participantsText}>{t('announcements.applicants')}: {announcement.applications_count ?? 0}</Text>
        </View>
        <View style={styles.actionButtons}>
          {canApply && (
            <TouchableOpacity
              style={styles.buttonPrimary}
              onPress={() => onApply?.(announcement)}
            >
              <Text style={styles.buttonPrimaryText}>{t('announcements.apply')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={() => onView?.(announcement)}
          >
            <Text style={styles.buttonSecondaryText}>{t('announcements.view')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  typeBadge: {
    backgroundColor: '#E3F2FD', // Light blue background
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  typeText: {
    fontSize: 12,
    color: '#1976D2', // Light blue text
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  price: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  detail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  participantsText: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  buttonPrimary: {
    backgroundColor: colors.buttonPrimary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  buttonPrimaryText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB', // Light gray border
  },
  buttonSecondaryText: {
    color: colors.textPrimary, // Dark text on light gray
    fontSize: 14,
    fontWeight: '600',
  },
  favoriteButton: {
    padding: 4,
  },
})

