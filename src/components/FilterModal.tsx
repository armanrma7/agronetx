import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { colors } from '../theme/colors'
import { Select } from './Select'
import Icon from './Icon'
import * as announcementsAPI from '../lib/api/announcements.api'
import * as profileAPI from '../lib/api/profile.api'

interface FilterModalProps {
  visible: boolean
  onClose: () => void
  onApply: (filters: FilterValues) => void
  initialFilters?: FilterValues
}

export type FilterCategory = 'goods' | 'service' | 'rent'

export interface FilterValues {
  categories?: FilterCategory[]
  type?: 'sell' | 'buy'
  groups?: string[]   // group_id — GoodsCategory UUID(s)
  subGroups?: string[] // subgroup_id — GoodsSubcategory UUID(s)
  itemIds?: string[]  // item_id — selectable items (products) under subcategories
  status?: string
  regions?: string[]
  villages?: string[]
  created_from?: string
  created_to?: string
  price_from?: string
  price_to?: string
}

export function FilterModal({ visible, onClose, onApply, initialFilters }: FilterModalProps) {
  const { t, i18n } = useTranslation()
  const currentLang = (i18n.language || 'hy').split('-')[0] as 'hy' | 'ru' | 'en'

  const [groupList, setGroupList] = useState<announcementsAPI.APICategory[]>([])
  const [groupListLoading, setGroupListLoading] = useState(false)
  const [subGroupList, setSubGroupList] = useState<announcementsAPI.APISubcategory[]>([])
  const [subGroupListLoading, setSubGroupListLoading] = useState(false)
  const [regionList, setRegionList] = useState<profileAPI.Region[]>([])
  const [regionListLoading, setRegionListLoading] = useState(false)
  const [villageList, setVillageList] = useState<profileAPI.Village[]>([])
  const [villageListLoading, setVillageListLoading] = useState(false)

  const [filters, setFilters] = useState<FilterValues>(initialFilters || {})

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

  // Use selected app language for group/sub/region/village labels (hy, ru, en)
  const catalogLang: announcementsAPI.CatalogLang =
    currentLang === 'ru' ? 'ru' : currentLang === 'en' ? 'en' : 'hy'

  const getRegionLabel = (r: profileAPI.Region) =>
    (currentLang === 'hy' && (r.name_hy ?? r.name)) ||
    (currentLang === 'ru' && (r.name_ru ?? r.name)) ||
    (r.name_en ?? r.name) ||
    ''
  const getVillageLabel = (v: profileAPI.Village) =>
    (currentLang === 'hy' && (v.name_hy ?? v.name)) ||
    (currentLang === 'ru' && (v.name_ru ?? v.name)) ||
    (v.name_en ?? v.name) ||
    ''

  const categoryOptions = useMemo(() => [
    { value: 'goods', label: t('filters.goods') },
    { value: 'service', label: t('filters.service') },
    { value: 'rent', label: t('filters.rent') },
  ], [t])

  const typeOptions = useMemo(() => [
    { value: 'sell', label: t('filters.sell') },
    { value: 'buy', label: t('filters.buy') },
  ], [t])

  const groupOptions = useMemo(() =>
    groupList.map(c => ({
      value: c.id,
      label: announcementsAPI.getCategoryLabelByLang(c, catalogLang),
    })),
  [groupList, catalogLang])

  // Subgroup list: flat list (subcategory ids only) for backward compat
  const subGroupOptions = useMemo(() =>
    subGroupList.map(s => ({
      value: s.id,
      label: announcementsAPI.getSubcategoryLabelByLang(s, catalogLang),
    })),
  [subGroupList, catalogLang])

  // Name/Item options: subcategory as section header + items as selectable (like create announcement)
  const nameOptions = useMemo(() => {
    const opts: { value: string; label: string; isHeader?: boolean; headerLabel?: string }[] = []
    subGroupList.forEach(sub => {
      const subLabel = announcementsAPI.getSubcategoryLabelByLang(sub, catalogLang)
      opts.push({ value: `header_${sub.id}`, label: subLabel, isHeader: true })
      if (sub.items?.length) {
        sub.items.forEach((item: announcementsAPI.APIItem) => {
          opts.push({
            value: item.id,
            label: announcementsAPI.getItemLabelByLang(item, catalogLang),
            isHeader: false,
            headerLabel: subLabel,
          })
        })
      }
    })
    return opts
  }, [subGroupList, catalogLang])

  const regionOptions = useMemo(() =>
    regionList.map(r => ({ value: r.id, label: getRegionLabel(r) })),
  [regionList, currentLang])

  const villageOptions = useMemo(() =>
    villageList.map(v => ({ value: v.id, label: getVillageLabel(v) })),
  [villageList, currentLang])

  // Fetch regions when modal is visible
  useEffect(() => {
    if (!visible) return
    setRegionListLoading(true)
    profileAPI.getRegionsAPI()
      .then(setRegionList)
      .catch(() => setRegionList([]))
      .finally(() => setRegionListLoading(false))
  }, [visible])

  // Fetch villages when one region is selected
  useEffect(() => {
    const regionId = selectedRegions[0]
    if (!regionId) {
      setVillageList([])
      return
    }
    setVillageListLoading(true)
    profileAPI.getVillagesByRegionAPI(regionId)
      .then(setVillageList)
      .catch(() => setVillageList([]))
      .finally(() => setVillageListLoading(false))
  }, [selectedRegions[0]])

  // Fetch groups from backend: when no category filter, fetch all types (goods+service+rent) so all groups show like create announcement
  useEffect(() => {
    if (!visible) return
    const types: FilterCategory[] = filters.categories?.length ? filters.categories : ['goods', 'service', 'rent']
    setGroupListLoading(true)
    Promise.all(types.map(ty => announcementsAPI.getCategoriesByTypeAPI(ty)))
      .then(results => {
        const byId = new Map<string, announcementsAPI.APICategory>()
        results.flat().forEach((c: announcementsAPI.APICategory) => byId.set(c.id, c))
        setGroupList(Array.from(byId.values()))
      })
      .catch(() => setGroupList([]))
      .finally(() => setGroupListLoading(false))
  }, [visible, filters.categories])

  // Fetch subcategories when groups selected: for each group, fetch and merge (unique by id)
  useEffect(() => {
    if (!filters.groups?.length) {
      setSubGroupList([])
      return
    }
    setSubGroupListLoading(true)
    Promise.all(filters.groups.map(id => announcementsAPI.getSubcategoriesByCategoryIdAPI(id)))
      .then(results => {
        const byId = new Map<string, announcementsAPI.APISubcategory>()
        results.flat().forEach(s => byId.set(s.id, s))
        setSubGroupList(Array.from(byId.values()))
      })
      .catch(() => setSubGroupList([]))
      .finally(() => setSubGroupListLoading(false))
  }, [filters.groups])

  // Reset filters when modal opens/closes or initialFilters change (single select: at most one region, one village)
  useEffect(() => {
    if (visible) {
      const base = initialFilters || {}
      setFilters(base)
      setSelectedRegions(base.regions?.slice(0, 1) ?? [])
      setSelectedVillages(base.villages?.slice(0, 1) ?? [])
      setCreatedFromDate(base.created_from ? new Date(base.created_from) : undefined)
      setCreatedToDate(base.created_to ? new Date(base.created_to) : undefined)
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
    setFilters({})
    setSelectedRegions([])
    setSelectedVillages([])
    setCreatedFromDate(undefined)
    setCreatedToDate(undefined)
  }

  const parsePrice = (s: string | undefined): number | null => {
    if (s == null || s.trim() === '') return null
    const n = parseFloat(s.trim().replace(',', '.'))
    return Number.isNaN(n) ? null : n
  }

  const handleApply = () => {
    const fromNum = parsePrice(filters.price_from)
    const toNum = parsePrice(filters.price_to)
    if (filters.price_from != null && filters.price_from.trim() !== '') {
      if (fromNum == null || fromNum <= 0) {
        Alert.alert(t('common.error'), t('filters.priceMustBePositive'))
        return
      }
    }
    if (filters.price_to != null && filters.price_to.trim() !== '') {
      if (toNum == null || toNum <= 0) {
        Alert.alert(t('common.error'), t('filters.priceMustBePositive'))
        return
      }
      if (fromNum != null && toNum < fromNum) {
        Alert.alert(t('common.error'), t('filters.priceToMustBeGreaterOrEqual'))
        return
      }
    }
    const appliedFilters: FilterValues = {}
    if (filters.categories?.length) appliedFilters.categories = filters.categories
    if (filters.type) appliedFilters.type = filters.type
    if (filters.groups?.length) appliedFilters.groups = filters.groups
    if (filters.subGroups?.length) appliedFilters.subGroups = filters.subGroups
    if (filters.itemIds?.length) appliedFilters.itemIds = filters.itemIds
    if (filters.status) appliedFilters.status = filters.status
    if (filters.regions?.length) appliedFilters.regions = filters.regions
    if (filters.villages?.length) appliedFilters.villages = filters.villages
    if (filters.created_from) appliedFilters.created_from = filters.created_from
    if (filters.created_to) appliedFilters.created_to = filters.created_to
    if (filters.price_from) appliedFilters.price_from = filters.price_from
    if (filters.price_to) appliedFilters.price_to = filters.price_to
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

          {/* Category - Select only (filter page) */}
          <View style={styles.filterSection}>
            <Select
              label={t('filters.category')}
              value={(filters.categories ?? [])[0] ?? ''}
              onValueChange={(value) => setFilters(prev => ({
                ...prev,
                categories: value ? [value as FilterCategory] : undefined,
                groups: undefined,
                subGroups: undefined,
              }))}
              options={categoryOptions}
              placeholder={t('common.select')}
            />
          </View>

          {/* Type - Select only */}
          <View style={styles.filterSection}>
            <Select
              label={t('filters.type')}
              value={filters.type ?? ''}
              onValueChange={(value) => setFilters(prev => ({
                ...prev,
                type: value ? (value as FilterValues['type']) : undefined,
              }))}
              options={typeOptions}
              placeholder={t('common.select')}
            />
          </View>

          {/* Price range */}
          <View style={styles.filterSection}>
            <Text style={styles.sectionLabel}>{t('filters.priceRange')}</Text>
            <View style={styles.priceRow}>
              <View style={styles.priceInputWrap}>
                <Text style={styles.dateLabel}>{t('filters.priceFrom')}</Text>
                <TextInput
                  style={styles.priceInput}
                  value={filters.price_from ?? ''}
                  onChangeText={(value) => {
                    const sanitized = value.replace(/[^0-9.]/g, '').replace(/^(\d*\.)(.*)/, (_, a, b) => a + b.replace(/\./g, ''))
                    setFilters(prev => ({
                      ...prev,
                      price_from: sanitized || undefined,
                    }))
                  }}
                  placeholder={t('filters.priceFrom')}
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.priceInputWrap}>
                <Text style={styles.dateLabel}>{t('filters.priceTo')}</Text>
                <TextInput
                  style={styles.priceInput}
                  value={filters.price_to ?? ''}
                  onChangeText={(value) => {
                    const sanitized = value.replace(/[^0-9.]/g, '').replace(/^(\d*\.)(.*)/, (_, a, b) => a + b.replace(/\./g, ''))
                    setFilters(prev => ({
                      ...prev,
                      price_to: sanitized || undefined,
                    }))
                  }}
                  placeholder={t('filters.priceTo')}
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>

          {/* Group - Select only (with loading like create announcement) */}
          <View style={styles.filterSection}>
            <Text style={styles.sectionLabel}>{t('addAnnouncement.group')}</Text>
            {groupListLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.buttonPrimary} />
                <Text style={styles.loadingText}>{t('common.loading')}</Text>
              </View>
            ) : (
              <Select
                value={(filters.groups ?? [])[0] ?? ''}
                onValueChange={(value) => setFilters(prev => ({
                  ...prev,
                  groups: value ? [value] : undefined,
                  subGroups: undefined,
                  itemIds: undefined,
                }))}
                options={groupOptions}
                placeholder={t('common.select')}
                disabled={groupOptions.length === 0}
              />
            )}
          </View>

          {/* Subgroup / Name - Select with subcategory headers and selectable items (like create announcement) */}
          <View style={styles.filterSection}>
            <Text style={styles.sectionLabel}>{t('addAnnouncement.name')}</Text>
            {(filters.groups?.length && subGroupListLoading) ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.buttonPrimary} />
                <Text style={styles.loadingText}>{t('common.loading')}</Text>
              </View>
            ) : (
              <Select
                value={(filters.itemIds ?? [])[0] ?? ''}
                onValueChange={(value) => setFilters(prev => ({
                  ...prev,
                  itemIds: value ? [value] : undefined,
                }))}
                options={nameOptions}
                placeholder={t('common.select')}
                disabled={!filters.groups?.length || nameOptions.length === 0}
                searchable
                searchPlaceholder={t('common.search')}
              />
            )}
          </View>

          {/* Region - Select only */}
          <View style={styles.filterSection}>
            <Text style={styles.sectionLabel}>{t('filters.region')}</Text>
            {regionListLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.buttonPrimary} />
                <Text style={styles.loadingText}>{t('common.loading')}</Text>
              </View>
            ) : (
              <Select
                value={selectedRegions[0] ?? ''}
                onValueChange={(value) => {
                  setSelectedRegions(value ? [value] : [])
                  setSelectedVillages([])
                }}
                options={regionOptions}
                placeholder={t('common.select')}
                disabled={regionOptions.length === 0}
              />
            )}
          </View>

          {/* Village - Select only */}
          <View style={styles.filterSection}>
            <Text style={styles.sectionLabel}>{t('filters.village')}</Text>
            {villageListLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.buttonPrimary} />
                <Text style={styles.loadingText}>{t('common.loading')}</Text>
              </View>
            ) : (
              <Select
                value={selectedVillages[0] ?? ''}
                onValueChange={(value) => setSelectedVillages(value ? [value] : [])}
                options={villageOptions}
                placeholder={t('common.select')}
                disabled={!selectedRegions.length || villageOptions.length === 0}
              />
            )}
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border || colors.borderLight,
    backgroundColor: colors.white,
  },
  chipActive: {
    backgroundColor: colors.buttonPrimary,
    borderColor: colors.buttonPrimary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  chipTextActive: {
    color: colors.white,
  },
  sectionLabel: {
    fontSize: 14,
    color: colors.textTile || colors.textPrimary,
    marginBottom: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 16,
    color: colors.textSecondary,
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
  priceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  priceInputWrap: {
    flex: 1,
    marginBottom: 16,
  },
  priceInput: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border || colors.borderLight,
    borderRadius: 50,
    backgroundColor: colors.background || '#F9FAFB',
    fontSize: 16,
    color: colors.textPrimary,
    minHeight: 55,
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
