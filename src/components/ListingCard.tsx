import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors } from '../theme/colors'
import { Listing } from '../types'
import Icon from './Icon'

interface ListingCardProps {
  listing: Listing
  onApply?: (listing: Listing) => void
  onView?: (listing: Listing) => void
}

export function ListingCard({ listing, onApply, onView }: ListingCardProps) {
  const { t } = useTranslation()

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const months = ['Հուն', 'Փետ', 'Մար', 'Ապր', 'Մայ', 'Հուն', 'Հուլ', 'Օգս', 'Սեպ', 'Հոկ', 'Նոյ', 'Դեկ']
    return `${months[date.getMonth()]}.${date.getDate()}, ${date.getFullYear()}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success
      case 'completed':
        return colors.textTertiary
      case 'cancelled':
        return colors.error
      default:
        return colors.textTertiary
    }
  }

  const getStatusLabel = (status: string) => {
    return t(`listings.status.${status}`)
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(listing.status) }]} />
          <Text style={styles.statusText}>{getStatusLabel(listing.status)}</Text>
        </View>
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>{t('listings.deadline')}: {formatDate(listing.created_at)}</Text>
          <Icon name="bookmark" size={20} color={colors.textTertiary} />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{listing.title}</Text>
        <Text style={styles.price}>
          {listing.price.toLocaleString()} {listing.price_unit}
        </Text>
      </View>

      {/* Details */}
      {listing.quantity && (
        <Text style={styles.detail}>
          {t('listings.minQuantity')}: {listing.quantity.toLocaleString()} {listing.quantity_unit}
        </Text>
      )}

      {listing.description && (
        <Text style={styles.detail}>{listing.description}</Text>
      )}

      <Text style={styles.detail}>
        {t('listings.location')}: {listing.location_region}, {listing.location_city || ''}
      </Text>

      {/* Footer */}
      <View style={styles.footer}>
        {listing.participants_count && (
          <View style={styles.participantsRow}>
            <Icon name="people" size={16} color={colors.textTertiary} />
            <Text style={styles.participantsText}>{t('listings.applicants')}: {listing.participants_count}</Text>
          </View>
        )}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={() => onApply?.(listing)}
          >
            <Text style={styles.buttonPrimaryText}>{t('listings.apply')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={() => onView?.(listing)}
          >
            <Text style={styles.buttonSecondaryText}>{t('listings.view')}</Text>
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: colors.textPrimary,
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
    borderColor: colors.buttonPrimary,
  },
  buttonSecondaryText: {
    color: colors.buttonPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
})

