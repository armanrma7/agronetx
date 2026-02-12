import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors } from '../../theme/colors'
import { Announcement } from '../../types'
import Icon from '../../components/Icon'

interface MyAnnouncementCardProps {
  announcement: Announcement
  onCancel?: (announcement: Announcement) => void
  onView?: (announcement: Announcement) => void
  showMyApplications?: boolean // If true, show "My applications" count instead of total applicants
}

export function MyAnnouncementCard({ announcement, onCancel, onView, showMyApplications = false }: MyAnnouncementCardProps) {
  const { t, i18n } = useTranslation()
  
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
    
    // Fallback to title or item_name
    return announcement.title || announcementData.item_name || 'No title'
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
    // Check if there's a subtype field (sell/buy)
    const subtype = (announcement as any).subtype || (announcement as any).sub_type
    const category = announcement.type // This is the category: goods, service, rent
    const apiType = (announcement as any).apiType || subtype // API type: sell, buy, rent
    
    // Check API type first (this comes from the server and is already mapped)
    if (apiType === 'sell' || subtype === 'sell' || subtype === 'sellGoods' || subtype === 'offer') {
      return 'Վաճառք'
    }
    if (apiType === 'buy' || subtype === 'buy' || subtype === 'buyGoods' || subtype === 'requirement') {
      return 'Գնում'
    }
    if (apiType === 'rent' || category === 'rent') {
      return 'Վարձակալություն'
    }
    
    // Fallback to category-based logic
    const categoryType = category as 'goods' | 'service' | 'rent'
    switch (categoryType) {
      case 'goods':
        return 'Գնում'
      case 'service':
        return 'Վաճառք'
      case 'rent':
        return 'Վարձակալություն'
      default:
        return 'Գնում'
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
    const months = ['Հուն', 'Փետ', 'Մար', 'Ապր', 'Մայ', 'Հուն', 'Հուլ', 'Օգս', 'Սեպ', 'Հոկ', 'Նոյ', 'Դեկ']
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
            {(announcement as any).date_to || announcement.expires_at 
              ? `Վերջնաժամկետ։ ${formatDate((announcement as any).date_to || announcement.expires_at)}`
              : formatDate(announcement.created_at)
            }
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{getItemName()}</Text>
        <Text style={styles.price}>
          {announcement.price?.toLocaleString() || 0} դր {translateUnit(announcement.price_unit)}
        </Text>
      </View>

      {/* Details */}
      {announcement.quantity && (
        <Text style={styles.detail}>
          {t('announcements.availableQuantity')}: {announcement.quantity.toLocaleString()} {translateUnit(announcement.quantity_unit)}
        </Text>
      )}

      {(() => {
        const announcementData = announcement as any
        const regions = announcementData.regions || (announcement.location_region ? [announcement.location_region] : [])
        const villages = announcementData.villages || (announcement.location_city ? [announcement.location_city] : [])
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
          <Icon name={showMyApplications ? "document" : "people"} size={16} color={colors.buttonPrimary} />
          {showMyApplications ? (
            <Text style={styles.participantsText}>
              {(() => {
                const announcementData = announcement as any
                // Get user's application count - check various possible field names
                const myApplicationsCount = announcementData.my_applications_count !== undefined 
                  ? announcementData.my_applications_count
                  : (announcementData.myApplicationsCount !== undefined 
                    ? announcementData.myApplicationsCount
                    : (Array.isArray(announcementData.applications) 
                      ? announcementData.applications.length 
                      : 1))
                
                if (myApplicationsCount > 1) {
                  return `Իմ դիմումները: ${myApplicationsCount}`
                } else {
                  return 'Իմ դիմումը'
                }
              })()}
            </Text>
          ) : (
            <Text style={styles.participantsText}>Դիմորդներ: {(announcement as any).applications_count !== undefined ? (announcement as any).applications_count : (announcement.participants_count || 0)}</Text>
          )}
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.buttonCancel}
            onPress={() => onCancel?.(announcement)}
          >
            <Text style={styles.buttonCancelText}>Չեղարկել</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.buttonView}
            onPress={() => onView?.(announcement)}
          >
            <Text style={styles.buttonViewText}>Դիտել</Text>
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
    alignItems: 'center',
    marginBottom: 8,
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
    color: colors.buttonPrimary,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  buttonCancel: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB', // Light gray border
  },
  buttonCancelText: {
    color: colors.error, // Red text
    fontSize: 14,
    fontWeight: '600',
  },
  buttonView: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB', // Light gray border
  },
  buttonViewText: {
    color: colors.textPrimary, // Dark gray text
    fontSize: 14,
    fontWeight: '600',
  },
})

