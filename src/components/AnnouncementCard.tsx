import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors } from '../theme/colors'
import { Announcement } from '../types'
import Icon from './Icon'
import { useAuth } from '../context/AuthContext'
import { useAddFavorite, useRemoveFavorite } from '../hooks/useFavoriteQueries'
import { translateMeasureUnit } from '../utils/units'

interface AnnouncementCardProps {
  announcement: Announcement
  onApply?: (announcement: Announcement) => void
  onView?: (announcement: Announcement) => void
}

export function AnnouncementCard({ announcement, onApply, onView }: AnnouncementCardProps) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()

  // ── Derived from announcement object directly — no separate queries needed ──
  const isFavorite = announcement.isFavorite ?? false
  const isApplied  = announcement.isApplied ?? false

  const isMyAnnouncement =
    user?.id != null &&
    announcement?.owner_id != null &&
    String(announcement.owner_id) === String(user.id)

  // Show Apply only when: not owner AND user has no active application
  const canApply = !isMyAnnouncement && !isApplied

  // ── Mutations ─────────────────────────────────────────────────────────────
  const addFavorite = useAddFavorite()
  const removeFavorite = useRemoveFavorite()

  const addVarId = addFavorite.variables != null
    ? (typeof addFavorite.variables === 'string' ? addFavorite.variables : addFavorite.variables.announcementId)
    : null
  const isTogglingFavorite =
    (addFavorite.isPending && addVarId === announcement.id) ||
    (removeFavorite.isPending && removeFavorite.variables === announcement.id)

  const handleFavoritePress = () => {
    if (isTogglingFavorite) return
    if (isFavorite) {
      removeFavorite.mutate(announcement.id)
    } else {
      addFavorite.mutate({ announcementId: announcement.id, announcement })
    }
  }

  // ── Display helpers ───────────────────────────────────────────────────────

  const getItemName = (): string => {
    const currentLang = i18n.language || 'hy'
    const announcementData = announcement as any

    if (currentLang === 'en' && announcementData.name_en) return announcementData.name_en
    if (currentLang === 'ru' && announcementData.name_ru) return announcementData.name_ru
    if ((currentLang === 'hy' || currentLang === 'am') && (announcementData.name_hy || announcementData.name_am)) {
      return announcementData.name_hy || announcementData.name_am || ''
    }

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

  const getRegionVillageLabel = (rv: any | undefined | null): string => {
    if (!rv) return ''
    const lang = i18n.language || 'hy'
    if (lang.startsWith('en') && rv.name_en) return rv.name_en
    if (lang.startsWith('ru') && rv.name_ru) return rv.name_ru
    return rv.name_am || rv.name_hy || rv.name_en || rv.name_ru || ''
  }

  const getTypeLabel = (ann: Announcement) => {
    const subtype = (ann as any).subtype || (ann as any).sub_type
    const category = ann.category || ann.type
    const apiType = ann.type || (ann as any).apiType || subtype

    if (apiType === 'sell' || subtype === 'sell' || subtype === 'offer') return t('announcementDetail.sell')
    if (apiType === 'buy' || subtype === 'buy' || subtype === 'requirement') return t('announcementDetail.buy')
    if (apiType === 'rent' || category === 'rent') return t('announcementDetail.rent')

    const categoryType = category as 'goods' | 'service' | 'rent'
    switch (categoryType) {
      case 'goods': return t('announcementDetail.buy')
      case 'service': return t('announcementDetail.sell')
      case 'rent': return t('announcementDetail.rent')
      default: return t('announcementDetail.buy')
    }
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
            onPress={isMyAnnouncement ? undefined : handleFavoritePress}
            disabled={isMyAnnouncement || isTogglingFavorite}
            style={styles.favoriteButton}
          >
            {isTogglingFavorite ? (
              <ActivityIndicator size="small" color={colors.buttonPrimary} />
            ) : (
              <Icon
                name={isMyAnnouncement ? 'campaign' : (isFavorite ? 'bookmark' : 'bookmark-border')}
                size={20}
                color={isMyAnnouncement ? colors.textTertiary : (isFavorite ? colors.buttonPrimary : colors.textTertiary)}
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
          {Number(announcement.price || 0).toLocaleString()} {t('common.currency')}\{translateMeasureUnit((announcement as any).price_unit ?? announcement.unit, i18n.language)}
        </Text>
      </View>

      {/* Details */}
      {(() => {
        const available = Number(announcement.available_quantity ?? 0) || 0
        if (!(available > 0)) return null
        return (
          <Text style={styles.detail}>
            {t('announcements.availableQuantity')}: {available.toLocaleString()}{' '}
            {announcement.unit ? translateMeasureUnit(announcement.unit, i18n.language) : ''}
          </Text>
        )
      })()}

      {(() => {
        const regions = announcement.regions || []
        const villages = announcement.villages || []
        const regionsData = (announcement as any).regions_data || []
        const villagesData = (announcement as any).villages_data || []
        const regionCount = regions.length
        const villageCount = villages.length

        if (regionCount > 0 || villageCount > 0) {
          const parts: string[] = []
          if (regionCount > 0) {
            const firstRegion =
              getRegionVillageLabel(regionsData[0]) ||
              ((announcement as any).region_names?.[0] ?? '') ||
              (typeof regions[0] === 'string' ? regions[0] : '')
            parts.push(regionCount === 1
              ? `${t('addAnnouncement.region')}: ${firstRegion || '–'}`
              : `${t('addAnnouncement.region')}: ${firstRegion || '–'} +${regionCount - 1}`)
          }
          if (villageCount > 0) {
            const firstVillage =
              getRegionVillageLabel(villagesData[0]) ||
              ((announcement as any).village_names?.[0] ?? '') ||
              (typeof villages[0] === 'string' ? villages[0] : '')
            parts.push(villageCount === 1
              ? `${t('addAnnouncement.village')}: ${firstVillage || '–'}`
              : `${t('addAnnouncement.village')}: ${firstVillage || '–'} +${villageCount - 1}`)
          }
          return <Text style={styles.detail}>{parts.join(', ')}</Text>
        }
        return null
      })()}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.participantsRow}>
          <Icon name="people" size={16} color={colors.textTertiary} />
          <Text
            style={[
              styles.participantsText
            ]}
          >
            {t('announcements.applicants')}: {announcement.applications_count ?? 0}
          </Text>
        </View>
        <View style={styles.actionButtons}>
          {canApply  && (
            <TouchableOpacity
              style={styles.buttonPrimary}
              onPress={() => onApply?.(announcement)}
            >
              <Text
                style={styles.buttonPrimaryText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {t('announcements.apply')}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={() => onView?.(announcement)}
          >
            <Text
              style={styles.buttonSecondaryText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {t('announcements.view')}
            </Text>
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
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  typeText: {
    fontSize: 12,
    color: '#1976D2',
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
    flexShrink: 1,
    maxWidth: '60%',
  },
  buttonPrimary: {
    backgroundColor: colors.buttonPrimary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    flexShrink: 1,
  },
  buttonPrimaryText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexShrink: 1,
  },
  buttonSecondaryText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonApplied: {
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.buttonPrimary,
    flexShrink: 1,
  },
  buttonAppliedText: {
    color: colors.buttonPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  favoriteButton: {
    padding: 4,
  },
})
