import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { colors } from '../theme/colors'
import { Select } from './Select'
import Icon from './Icon'
import { RegionVillageSelector } from './RegionVillageSelector'

interface FilterModalProps {
  visible: boolean
  onClose: () => void
  onApply: (filters: FilterValues) => void
  initialFilters?: FilterValues
}

export interface FilterValues {
  status?: string
  regions?: string[] // Array of region UUIDs
  villages?: string[] // Array of village UUIDs
  created_from?: string // Date in YYYY-MM-DD format
  created_to?: string // Date in YYYY-MM-DD format
}

export function FilterModal({ visible, onClose, onApply, initialFilters }: FilterModalProps) {
  const { t, i18n } = useTranslation()
  const currentLang = (i18n.language || 'hy').split('-')[0] as 'hy' | 'ru' | 'en'
  
  const STATUS_OPTIONS = [
    { value: 'published', label: t('announcements.status.active') || 'Հրապարակված' },
    { value: 'active', label: t('announcements.status.active') || 'Ակտիվ' },
    { value: 'completed', label: t('announcements.status.completed') || 'Ավարտված' },
    { value: 'cancelled', label: t('announcements.status.cancelled') || 'Չեղարկված' },
  ]

  const [filters, setFilters] = useState<FilterValues>(initialFilters || {
    status: undefined,
    regions: [],
    villages: [],
    created_from: undefined,
    created_to: undefined,
  })

  const [selectedRegions, setSelectedRegions] = useState<string[]>(filters.regions || [])
  const [selectedVillages, setSelectedVillages] = useState<string[]>(filters.villages || [])
  const [createdFromDate, setCreatedFromDate] = useState<Date | undefined>(
    filters.created_from ? new Date(filters.created_from) : undefined
  )
  const [createdToDate, setCreatedToDate] = useState<Date | undefined>(
    filters.created_to ? new Date(filters.created_to) : undefined
  )
  
  // Date picker state
  const [showFromDatePicker, setShowFromDatePicker] = useState(false)
  const [showToDatePicker, setShowToDatePicker] = useState(false)
  const [tempFromDate, setTempFromDate] = useState<Date>(new Date())
  const [tempToDate, setTempToDate] = useState<Date>(new Date())

  // Reset filters when modal opens/closes or initialFilters change
  useEffect(() => {
    if (visible) {
      if (initialFilters) {
        setFilters(initialFilters)
        setSelectedRegions(initialFilters.regions || [])
        setSelectedVillages(initialFilters.villages || [])
        setCreatedFromDate(initialFilters.created_from ? new Date(initialFilters.created_from) : undefined)
        setCreatedToDate(initialFilters.created_to ? new Date(initialFilters.created_to) : undefined)
      } else {
        setFilters({
          status: undefined,
          regions: [],
          villages: [],
          created_from: undefined,
          created_to: undefined,
        })
        setSelectedRegions([])
        setSelectedVillages([])
        setCreatedFromDate(undefined)
        setCreatedToDate(undefined)
      }
    }
  }, [visible, initialFilters])

  // Update filters when regions/villages change
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      regions: selectedRegions.length > 0 ? selectedRegions : undefined,
      villages: selectedVillages.length > 0 ? selectedVillages : undefined,
    }))
  }, [selectedRegions, selectedVillages])

  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatDateDisplay = (date: Date): string => {
    const months = ['Հուն', 'Փետ', 'Մար', 'Ապր', 'Մայ', 'Հուն', 'Հուլ', 'Օգս', 'Սեպ', 'Հոկ', 'Նոյ', 'Դեկ']
    return `${months[date.getMonth()]}. ${date.getDate()}, ${date.getFullYear()}`
  }

  const handleFromDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowFromDatePicker(false)
    }
    if (event.type === 'set' && selectedDate) {
      setCreatedFromDate(selectedDate)
      setFilters(prev => ({
        ...prev,
        created_from: formatDateToString(selectedDate),
      }))
    }
  }

  const handleToDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowToDatePicker(false)
    }
    if (event.type === 'set' && selectedDate) {
      setCreatedToDate(selectedDate)
      setFilters(prev => ({
        ...prev,
        created_to: formatDateToString(selectedDate),
      }))
    }
  }

  const handleFromDateDone = () => {
    setCreatedFromDate(tempFromDate)
    setFilters(prev => ({
      ...prev,
      created_from: formatDateToString(tempFromDate),
    }))
    setShowFromDatePicker(false)
  }

  const handleToDateDone = () => {
    setCreatedToDate(tempToDate)
    setFilters(prev => ({
      ...prev,
      created_to: formatDateToString(tempToDate),
    }))
    setShowToDatePicker(false)
  }

  const handleClear = () => {
    setFilters({
      status: undefined,
      regions: undefined,
      villages: undefined,
      created_from: undefined,
      created_to: undefined,
    })
    setSelectedRegions([])
    setSelectedVillages([])
    setCreatedFromDate(undefined)
    setCreatedToDate(undefined)
  }

  const handleApply = () => {
    const appliedFilters: FilterValues = {}
    if (filters.status) appliedFilters.status = filters.status
    if (filters.regions && filters.regions.length > 0) appliedFilters.regions = filters.regions
    if (filters.villages && filters.villages.length > 0) appliedFilters.villages = filters.villages
    if (filters.created_from) appliedFilters.created_from = filters.created_from
    if (filters.created_to) appliedFilters.created_to = filters.created_to
    
    console.log('✅ FilterModal: Applying filters:', appliedFilters)
    onApply(appliedFilters)
    onClose()
  }

  const openFromDatePicker = () => {
    setTempFromDate(createdFromDate || new Date())
    setShowFromDatePicker(true)
  }

  const openToDatePicker = () => {
    setTempToDate(createdToDate || createdFromDate || new Date())
    setShowToDatePicker(true)
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
            <Text style={styles.title}>{t('filters.title')}</Text>
            <Text style={styles.description}>{t('filters.description')}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Status Filter */}
          {/* <View style={styles.filterSection}>
            <Select
              label={t('filters.status')}
              value={filters.status || ''}
              onValueChange={(value) => setFilters({ ...filters, status: value || undefined })}
              options={STATUS_OPTIONS}
              placeholder={t('common.select')}
            />
          </View> */}

          {/* Region and Village Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.sectionLabel}>{t('filters.region')} / {t('filters.village')}</Text>
            <RegionVillageSelector
              selectedRegions={selectedRegions}
              selectedVillages={selectedVillages}
              onRegionsChange={setSelectedRegions}
              onVillagesChange={setSelectedVillages}
              currentLang={currentLang}
            />
          </View>

          {/* Created Date Range Section */}
          <View style={styles.filterSection}>
            <Text style={styles.sectionLabel}>{t('filters.timePeriod')}</Text>
            
            {/* Created From Date */}
            <View style={styles.dateInputContainer}>
              <Text style={styles.dateLabel}>{t('filters.startDate')}</Text>
              <TouchableOpacity 
                style={styles.dateInputWrapper}
                onPress={openFromDatePicker}
              >
                <Text style={[styles.dateInputText, !createdFromDate && styles.dateInputPlaceholder]}>
                  {createdFromDate ? formatDateDisplay(createdFromDate) : t('filters.startDate')}
                </Text>
                <Icon name="calendar" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* Created To Date */}
            <View style={styles.dateInputContainer}>
              <Text style={styles.dateLabel}>{t('filters.endDate')}</Text>
              <TouchableOpacity 
                style={styles.dateInputWrapper}
                onPress={openToDatePicker}
              >
                <Text style={[styles.dateInputText, !createdToDate && styles.dateInputPlaceholder]}>
                  {createdToDate ? formatDateDisplay(createdToDate) : t('filters.endDate')}
                </Text>
                <Icon name="calendar" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
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

        {/* iOS Date Pickers */}
        {Platform.OS === 'ios' && showFromDatePicker && (
          <Modal
            transparent
            animationType="fade"
            visible={showFromDatePicker}
            onRequestClose={() => setShowFromDatePicker(false)}
          >
            <View style={styles.modalOverlay}>
              <TouchableOpacity 
                style={{ flex: 1 }}
                activeOpacity={1}
                onPress={() => setShowFromDatePicker(false)}
              />
              <View style={styles.pickerSheet}>
                <View style={styles.pickerHeader}>
                  <TouchableOpacity onPress={() => setShowFromDatePicker(false)}>
                    <Text style={styles.pickerCancel}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleFromDateDone}>
                    <Text style={styles.pickerDone}>{t('common.done')}</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempFromDate}
                  mode="date"
                  display="spinner"
                  onChange={(event, date) => date && setTempFromDate(date)}
                  minimumDate={undefined}
                  maximumDate={createdToDate || undefined}
                  locale="hy-AM"
                  style={styles.picker}
                />
              </View>
            </View>
          </Modal>
        )}

        {Platform.OS === 'ios' && showToDatePicker && (
          <Modal
            transparent
            animationType="fade"
            visible={showToDatePicker}
            onRequestClose={() => setShowToDatePicker(false)}
          >
            <View style={styles.modalOverlay}>
              <TouchableOpacity 
                style={{ flex: 1 }}
                activeOpacity={1}
                onPress={() => setShowToDatePicker(false)}
              />
              <View style={styles.pickerSheet}>
                <View style={styles.pickerHeader}>
                  <TouchableOpacity onPress={() => setShowToDatePicker(false)}>
                    <Text style={styles.pickerCancel}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleToDateDone}>
                    <Text style={styles.pickerDone}>{t('common.done')}</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempToDate}
                  mode="date"
                  display="spinner"
                  onChange={(event, date) => date && setTempToDate(date)}
                  minimumDate={createdFromDate || undefined}
                  locale="hy-AM"
                  style={styles.picker}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Android Date Pickers */}
        {Platform.OS === 'android' && showFromDatePicker && (
          <DateTimePicker
            value={createdFromDate || new Date()}
            mode="date"
            display="default"
            onChange={handleFromDateChange}
            maximumDate={createdToDate || undefined}
          />
        )}

        {Platform.OS === 'android' && showToDatePicker && (
          <DateTimePicker
            value={createdToDate || createdFromDate || new Date()}
            mode="date"
            display="default"
            onChange={handleToDateChange}
            minimumDate={createdFromDate || undefined}
          />
        )}
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
  sectionLabel: {
    fontSize: 14,
    color: colors.textTile || colors.textPrimary,
    marginBottom: 12,
    fontWeight: '500',
  },
  dateInputContainer: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    color: colors.textTile || colors.textPrimary,
    marginBottom: 7,
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border || colors.borderLight,
    borderRadius: 50,
    backgroundColor: colors.background || '#F9FAFB',
    minHeight: 55,
  },
  dateInputText: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },
  dateInputPlaceholder: {
    color: colors.textTertiary,
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
    borderColor: colors.border || colors.borderLight,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  pickerCancel: {
    fontSize: 17,
    color: colors.textSecondary,
  },
  pickerDone: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.buttonPrimary,
  },
  picker: {
    height: 216,
    backgroundColor: colors.white,
  },
})
