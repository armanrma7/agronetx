import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import Icon from '../../../components/Icon'
import { colors } from '../../../theme/colors'

export interface ApplicationListHeaderProps {
  title: string
  quantity: number | null
  quantityUnit: string
  price: number | null
  priceUnit: string
  applicantsCount: number
}

export const ApplicationListHeader = React.memo(function ApplicationListHeader({
  title,
  quantity,
  quantityUnit,
  price,
  priceUnit,
  applicantsCount,
}: ApplicationListHeaderProps) {
  const { t } = useTranslation()

  const metaParts: string[] = []
  if (quantity != null && quantityUnit) {
    metaParts.push(`${Number(quantity).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${quantityUnit}`)
  }
  if (price != null && priceUnit) {
    metaParts.push(`${Number(price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/${priceUnit}`)
  }
  const meta = metaParts.join(' • ')
  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      <View style={styles.applicantsRow}>
        <Icon name="people" size={18} color={colors.textPrimary} />
        <Text style={styles.applicantsText}>
          {t('applications.applicantsCountLabel')}: {applicantsCount}
        </Text>
      </View>
    </View>
  )
})

const styles = StyleSheet.create({
  header: {
    gap: 10,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  meta: {
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  applicantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  applicantsText: {
    fontSize: 14,
    color: colors.textTile,
    fontWeight: '400',
  },
})
