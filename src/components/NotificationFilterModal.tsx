import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors } from '../theme/colors'
import { Select } from './Select'
import Icon from './Icon'

interface NotificationFilterModalProps {
  visible: boolean
  onClose: () => void
  onApply: (filters: NotificationFilterValues) => void
}

export interface NotificationFilterValues {
  notificationType: string
  status: string
  period: string
}

const NOTIFICATION_TYPE_OPTIONS = [
  { value: 'all', label: 'Բոլորը' },
  { value: 'business', label: 'Բիզնես' },
  { value: 'administrative', label: 'Ադմինիստրատիվ' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'Բոլորը' },
  { value: 'read', label: 'Կարդացված' },
  { value: 'unread', label: 'Չկարդացված' },
]

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Բոլորը' },
  { value: 'today', label: 'Այսօր' },
  { value: 'yesterday', label: 'Երեկ' },
  { value: 'week', label: 'Վերջին շաբաթ' },
  { value: 'month', label: 'Վերջին ամիս' },
]

export function NotificationFilterModal({ visible, onClose, onApply }: NotificationFilterModalProps) {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<NotificationFilterValues>({
    notificationType: '',
    status: '',
    period: '',
  })

  const handleClear = () => {
    setFilters({
      notificationType: '',
      status: '',
      period: '',
    })
  }

  const handleApply = () => {
    onApply(filters)
    onClose()
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{t('notifications.filterTitle')}</Text>
            <Text style={styles.description}>{t('notifications.filterDescription')}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Notification Type Filter */}
          <View style={styles.filterSection}>
            <Select
              label={t('notifications.notificationType')}
              value={filters.notificationType}
              onValueChange={(value) => setFilters({ ...filters, notificationType: value })}
              options={NOTIFICATION_TYPE_OPTIONS}
              placeholder={t('common.select')}
            />
          </View>

          {/* Status Filter */}
          <View style={styles.filterSection}>
            <Select
              label={t('notifications.notificationStatus')}
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
              options={STATUS_OPTIONS}
              placeholder={t('common.select')}
            />
          </View>

          {/* Period Filter */}
          <View style={styles.filterSection}>
            <Select
              label={t('notifications.notificationPeriod')}
              value={filters.period}
              onValueChange={(value) => setFilters({ ...filters, period: value })}
              options={PERIOD_OPTIONS}
              placeholder={t('common.select')}
            />
          </View>
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <Text style={styles.clearButtonText}>{t('filters.clear')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>{t('filters.apply')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerContent: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  filterSection: {
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: colors.buttonPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
})

