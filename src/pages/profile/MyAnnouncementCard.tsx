import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors } from '../../theme/colors'
import { Announcement } from '../../types'
import Icon from '../../components/Icon'

interface MyAnnouncementCardProps {
  announcement: Announcement
  onCancel?: (announcement: Announcement) => void
  onView?: (announcement: Announcement) => void
  onCloseApplication?: (applicationId: string) => void
  onApplicationsPress?: (announcement: Announcement) => void
  showMyApplications?: boolean
  cancelling?: boolean
  closingApplicationId?: string | null
}

export function MyAnnouncementCard({ announcement, onCancel, onView, onCloseApplication, onApplicationsPress, showMyApplications = false, cancelling = false, closingApplicationId = null }: MyAnnouncementCardProps) {
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
    
    const item = announcement.item
    return (item?.name_am || item?.name_en || item?.name_ru) || announcementData.title || announcementData.item_name || 'No title'
  }

  const getStatusColor = (status: string) => {
    console.info('status', status)
    switch (status) {
      case 'active':
      case 'published':
        return colors.success
      case 'completed':
        return colors.textTertiary
      case 'canceled':
      case 'closed':
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
    
    // Fallback to category-based logic
    const categoryType = category as 'goods' | 'service' | 'rent'
    switch (categoryType) {
      case 'goods':
        return t('announcementDetail.buy')
      case 'service':
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
              ? `Վերջնաժամկետ։ ${formatDate(announcement.date_to)}`
              : formatDate(announcement.created_at)
            }
          </Text>
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
        <TouchableOpacity
          style={styles.participantsRow}
          onPress={() => {
            if (!onApplicationsPress) return
            if (showMyApplications) {
              onApplicationsPress(announcement)
              return
            }
            const count = announcement.applications_count ?? 0
            if (count > 0) onApplicationsPress(announcement)
          }}
          activeOpacity={onApplicationsPress ? 0.7 : 1}
          disabled={!onApplicationsPress || (!showMyApplications && (announcement.applications_count ?? 0) === 0)}
        >
          <Icon name={showMyApplications ? "document" : "people"} size={16} color={colors.buttonPrimary} />
          {showMyApplications ? (
            <Text style={styles.participantsText}>
              {(() => {
                const announcementData = announcement as any
                const myApplicationsCount = announcementData.my_applications_count !== undefined 
                  ? announcementData.my_applications_count
                  : (announcementData.myApplicationsCount !== undefined 
                    ? announcementData.myApplicationsCount
                    : (Array.isArray(announcementData.applications) 
                      ? announcementData.applications.length 
                      : 1))
                if (myApplicationsCount > 1) {
                  return t('announcements.myApplicationsPlural', { count: myApplicationsCount })
                } else {
                  return t('announcements.myApplications')
                }
              })()}
            </Text>
          ) : (
            <Text style={styles.participantsText}>{t('announcements.applicants')}: {announcement.applications_count ?? 0}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          {showMyApplications ? (
            // For "applied" tab - show close application button
            <>
              {(() => {
                const announcementData = announcement as any
                const applications = Array.isArray(announcementData.applications) ? announcementData.applications : []
                // Get first active application ID (applications that are not closed)
                const activeApplication = applications.find((app: any) => app.status !== 'closed' && app.status !== 'cancelled')
                
                if (activeApplication && onCloseApplication) {
                  const isClosing = closingApplicationId === activeApplication.id
                  return (
                    isClosing ? (
                      <View style={styles.buttonClose}>
                        <ActivityIndicator size="small" color={colors.error} />
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.buttonClose}
                        onPress={() => {
                          onCloseApplication(activeApplication.id)
                        }}
                      >
                        <Text style={styles.buttonCloseText}>{t('announcements.closeApplication')}</Text>
                      </TouchableOpacity>
                    )
                  )
                }
                return null
              })()}
              <TouchableOpacity
                style={styles.buttonView}
                onPress={() => onView?.(announcement)}
              >
                <Text style={styles.buttonViewText}>{t('announcements.view')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            // For "published" tab - show cancel announcement button
            <>
              {/* Only show cancel button if announcement is not already cancelled */}
              {announcement.status !== 'canceled' && announcement.status !== 'closed' && (
                cancelling ? (
                  <View style={styles.buttonCancel}>
                    <ActivityIndicator size="small" color={colors.error} />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.buttonCancel}
                    onPress={() => {
                      onCancel?.(announcement)
                    }}
                  >
                    <Text style={styles.buttonCancelText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                )
              )}
              <TouchableOpacity
                style={styles.buttonView}
                onPress={() => onView?.(announcement)}
              >
                <Text style={styles.buttonViewText}>{t('announcements.view')}</Text>
              </TouchableOpacity>
            </>
          )}
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
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  typeText: {
    fontSize: 12,
    color: colors.buttonPrimary,
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
    borderColor: colors.borderLight,
  },
  buttonCancelText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonClose: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  buttonCloseText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonView: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  buttonViewText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
})

