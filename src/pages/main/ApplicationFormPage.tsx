import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Calendar, DateData } from 'react-native-calendars'
import { useTranslation } from 'react-i18next'
import { useNavigation, useRoute } from '@react-navigation/native'
import { colors } from '../../theme/colors'
import { AppHeader } from '../../components/AppHeader'
import Icon from '../../components/Icon'
import * as announcementsAPI from '../../lib/api/announcements.api'
import { Announcement } from '../../types'
import { useSubmitApplication, useUpdateApplication, useApplicationsByAnnouncement } from '../../hooks/useApplicationQueries'
import { useAnnouncementDetail } from '../../hooks/useAnnouncementQueries'
import { translateMeasureUnit } from '../../utils/units'

interface PrefillData {
  deliveryDates?: string[]
  count?: number
  unit?: string
  notes?: string
}

interface RouteParams {
  announcementId: string
  announcementType: 'goods' | 'service' | 'rent'
  announcementTitle: string
  announcement?: Announcement
  applicationId?: string
  prefill?: PrefillData
}

type UnitType = 'daily' | 'monthly' | 'yearly' | 'hourly'

export function ApplicationFormPage() {
  const { t, i18n } = useTranslation()
  const navigation = useNavigation()
  const route = useRoute()
  const { announcementId, announcementType, announcement: paramAnnouncement, applicationId, prefill } = (route.params as RouteParams) || {}
  const isEditMode = !!applicationId

  const submitApplicationMutation = useSubmitApplication()
  const updateApplicationMutation = useUpdateApplication()

  // Fetch announcement via React Query (uses cache if already loaded, or fetches from server)
  const { data: fetchedAnnouncement, isLoading: announcementLoading } = useAnnouncementDetail(
    announcementId,
    !paramAnnouncement && !!announcementId,
  )
  const announcement: Announcement | null = paramAnnouncement ?? fetchedAnnouncement ?? null
  const loading = !paramAnnouncement && announcementLoading

  const submitting = submitApplicationMutation.isPending || updateApplicationMutation.isPending
  
  // Form fields
  const [deliveryDates, setDeliveryDates] = useState<Date[]>([]) // For goods: array of delivery dates
  const [quantity, setQuantity] = useState<string>('') // For goods
  const [selectedUnit, setSelectedUnit] = useState<UnitType | undefined>(undefined) // For rent/service
  const [notes, setNotes] = useState('')
  
  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showUnitPicker, setShowUnitPicker] = useState(false)
  const [pickerDisplayYear, setPickerDisplayYear] = useState(new Date().getFullYear())
  const skipUnsavedPromptRef = useRef(false)

  const isValidForSubmit = useMemo(() => {
    if (announcementType === 'goods') {
      if (deliveryDates.length === 0) return false
      const qty = parseFloat(quantity)
      return !!quantity.trim() && !isNaN(qty) && qty > 0
    }
    if (announcementType === 'rent' || announcementType === 'service') {
      return deliveryDates.length > 0
    }
    return false
  }, [announcementType, deliveryDates.length, quantity])

  const initialSnapshotRef = useRef<string | null>(null)
  const didInitSnapshotRef = useRef(false)
  const prefillAppliedRef = useRef(false)
  const currentSnapshot = useMemo(() => {
    const snap = {
      announcementType,
      deliveryDates: deliveryDates.map(d => d.toISOString().split('T')[0]),
      quantity: quantity ?? '',
      notes: notes ?? '',
    }
    return JSON.stringify(snap)
  }, [announcementType, deliveryDates, quantity, notes])

  useEffect(() => {
    if (didInitSnapshotRef.current) return
    // For edit mode with prefill, wait until prefill effect has applied initial values
    if (isEditMode && prefill && !prefillAppliedRef.current) return
    initialSnapshotRef.current = currentSnapshot
    didInitSnapshotRef.current = true
  }, [currentSnapshot, isEditMode, prefill])

  const isDirty = useMemo(() => {
    if (!didInitSnapshotRef.current) return false
    return initialSnapshotRef.current !== currentSnapshot
  }, [currentSnapshot])

  const canSubmit = isEditMode ? isDirty && isValidForSubmit : isValidForSubmit

  useEffect(() => {
    const unsubscribe = (navigation as any).addListener('beforeRemove', (e: any) => {
      if (skipUnsavedPromptRef.current) return
      if (!isDirty) return
      e.preventDefault()
      Alert.alert(
        '',
        t('common.unsavedChangesConfirm'),
        [
          { text: t('common.no'), style: 'cancel' },
          { text: t('common.yes'), style: 'destructive', onPress: () => (navigation as any).dispatch(e.data.action) },
        ],
      )
    })
    return unsubscribe
  }, [isDirty, navigation, t])

  // Pre-fill form when editing an existing application
  useEffect(() => {
    if (!prefill) return
    if (prefill.deliveryDates && prefill.deliveryDates.length > 0) {
      setDeliveryDates(prefill.deliveryDates.map(d => new Date(d)))
    }
    if (prefill.count != null) {
      setQuantity(String(prefill.count))
    }
    if (prefill.unit) {
      setNotes(prefill.notes ?? '')
    }
    prefillAppliedRef.current = true
  }, [prefill])

  // Fetch applications for this announcement (for calendar: disable days already in applied applications)
  const { data: applicationsWithDeliveryDates = [] } = useApplicationsByAnnouncement(
    announcementId,
    (announcementType === 'goods' || announcementType === 'rent') && !!announcementId,
  )

  // Get page title based on type and mode
  const getPageTitle = () => {
    if (isEditMode) return t('common.edit')
    switch (announcementType) {
      case 'goods':
        return t('applications.goodsApplication')
      case 'service':
        return t('applications.serviceApplication')
      case 'rent':
        return t('applications.rentApplication')
      default:
        return t('applications.title')
    }
  }

  // Format date for display
  const formatDate = (date: Date): string => {
    const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    const monthKey = monthKeys[date.getMonth()]
    const month = t(`months.${monthKey}`)
    return `${month}. ${date.getDate()}, ${date.getFullYear()}`
  }

  // Format date to YYYY-MM-DD string
  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Convert Date to YYYY-MM-DD string
  const dateToKey = (date: Date): string => {
    return formatDateToString(date)
  }

  // Convert YYYY-MM-DD string to Date
  const keyToDate = (key: string): Date => {
    const [year, month, day] = key.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  // Get delivery dates from all applied applications (to disable those days); days after announcement end date are handled via maxDate
  // In edit mode, the current application's own dates are excluded so they remain selectable
  const getDisabledDates = (): Set<string> => {
    const disabledDates = new Set<string>()
    
    const addDeliveryDatesFromApp = (app: any) => {
      // In edit mode skip the application being edited so its dates stay selectable
      if (isEditMode && app.id != null && String(app.id) === String(applicationId)) return
      const deliveryDatesArray = Array.isArray(app.delivery_dates)
        ? app.delivery_dates
        : (app.delivery_dates ? [app.delivery_dates] : [])
      deliveryDatesArray.forEach((dateStr: string) => {
        if (dateStr) {
          const dateKey = dateStr.split('T')[0]
          disabledDates.add(dateKey)
        }
      })
    }
    
    // From announcement.applications (if present)
    if (announcement) {
      const announcementData = announcement as any
      const applications = Array.isArray(announcementData.applications) ? announcementData.applications : []
      applications.forEach(addDeliveryDatesFromApp)
    }
    
    // From fetched applications list (so we have all applied applications' delivery dates)
    applicationsWithDeliveryDates.forEach(addDeliveryDatesFromApp)
    
    return disabledDates
  }

  const getAnnouncementStartDateKey = (): string | undefined => {
    if (!announcement) return undefined
    const startStr = announcement.date_from || (announcement as any).date_from
    return startStr ? startStr.split('T')[0] : undefined
  }

  const getAnnouncementEndDateKey = (): string | undefined => {
    if (!announcement) return undefined
    const endDateStr = announcement.date_to || (announcement as any).date_to
    return endDateStr ? endDateStr.split('T')[0] : undefined
  }

  const getCalendarMinDate = (): string => {
    const startKey = getAnnouncementStartDateKey()
    const today = new Date().toISOString().split('T')[0]
    if (!startKey) return today
    return startKey < today ? today : startKey
  }

  const getCalendarMaxDate = (): string => {
    const endKey = getAnnouncementEndDateKey()
    if (endKey) return endKey
    const d = new Date()
    d.setFullYear(d.getFullYear() + 3)
    return d.toISOString().split('T')[0]
  }

  // Calendar type from unit and rent_unit (if exist). Yearly = only years, monthly = only months, daily = only days. Else default daily.
  type CalendarViewMode = 'yearly' | 'monthly' | 'daily'
  const getCalendarViewMode = (): CalendarViewMode => {
    const a = announcement as any
    const unit = (a?.rent_unit ?? a?.quantity_unit ?? announcement?.unit ?? '').toString().toLowerCase()
    if (unit.includes('year') || unit === 'yearly') return 'yearly'
    if (unit.includes('month') || unit === 'monthly' || unit.includes('month')) return 'monthly'
    if (unit.includes('day') || unit === 'daily' || unit.includes('day')) return 'daily'
    return 'daily'
  }

  /**
   * API validates each delivery_date as a calendar day (must be ≥ server "today").
   * Month/year UI stores the 1st of the period; replace with the effective min day in that period
   * (same as getCalendarMinDate when it falls inside that month/year).
   */
  const formatDeliveryDateForApi = (date: Date, viewMode: CalendarViewMode, minDateKey: string): string => {
    const rangeMin = keyToDate(minDateKey.split('T')[0])
    if (viewMode === 'daily') {
      return formatDateToString(date)
    }
    if (viewMode === 'monthly') {
      const y = date.getFullYear()
      const m = date.getMonth()
      if (y === rangeMin.getFullYear() && m === rangeMin.getMonth()) {
        return formatDateToString(rangeMin)
      }
      return formatDateToString(new Date(y, m, 1))
    }
    if (viewMode === 'yearly') {
      const y = date.getFullYear()
      if (y === rangeMin.getFullYear()) {
        return formatDateToString(rangeMin)
      }
      return formatDateToString(new Date(y, 0, 1))
    }
    return formatDateToString(date)
  }

  // Get marked dates for Calendar component
  const getMarkedDates = () => {
    const marked: any = {}
    const disabledDates = getDisabledDates()
    
    // Mark selected dates
    deliveryDates.forEach(date => {
      const key = dateToKey(date)
      marked[key] = {
        selected: true,
        selectedColor: colors.buttonPrimary,
        selectedTextColor: colors.white,
      }
    })
    
    // Mark disabled dates (days already in applied applications)
    disabledDates.forEach(dateKey => {
      // Don't override selected dates
      if (!marked[dateKey]) {
        marked[dateKey] = {
          disabled: true,
          disableTouchEvent: true,
          textColor: colors.textTertiary,
        }
      }
    })
    
    return marked
  }

  const handleCalendarDayPress = (day: DateData) => {
    const dateKey = day.dateString
    const disabledDates = getDisabledDates()
    const minKey = getCalendarMinDate()
    const maxKey = getCalendarMaxDate()
    if (dateKey < minKey || dateKey > maxKey) return
    if (disabledDates.has(dateKey)) {
      Alert.alert(t('applications.dateNotAvailable'), t('applications.dateTaken'))
      return
    }
    const selectedDate = keyToDate(day.dateString)
    
    // Check if date is already selected
    const isSelected = deliveryDates.some(d => dateToKey(d) === dateKey)
    
    if (isSelected) {
      // Remove date if already selected
      setDeliveryDates(deliveryDates.filter(d => dateToKey(d) !== dateKey))
    } else {
      // Add date if not selected
      setDeliveryDates([...deliveryDates, selectedDate].sort((a, b) => a.getTime() - b.getTime()))
    }
  }

  // Open calendar modal
  const handleOpenDatePicker = () => {
    const minKey = getCalendarMinDate()
    const minYear = parseInt(minKey.split('-')[0], 10) || new Date().getFullYear()
    setPickerDisplayYear(minYear)
    setShowDatePicker(true)
  }

  const handleMonthPress = (month: number) => {
    const monthKey = `${pickerDisplayYear}-${String(month).padStart(2, '0')}`
    const minMonthKey = getCalendarMinDate().substring(0, 7)
    const maxMonthKey = getCalendarMaxDate().substring(0, 7)
    if (monthKey < minMonthKey || monthKey > maxMonthKey) return
    const y = pickerDisplayYear
    const selectedDate = new Date(y, month - 1, 1)
    setDeliveryDates(prev => {
      const isSelected = prev.some(d => d.getFullYear() === y && d.getMonth() + 1 === month)
      if (isSelected) {
        return prev.filter(d => !(d.getFullYear() === y && d.getMonth() + 1 === month))
      }
      return [...prev, selectedDate].sort((a, b) => a.getTime() - b.getTime())
    })
  }

  const handleYearPress = (year: number) => {
    const minYear = parseInt(getCalendarMinDate().split('-')[0], 10) || new Date().getFullYear()
    const maxYear = parseInt(getCalendarMaxDate().split('-')[0], 10) || new Date().getFullYear() + 3
    if (year < minYear || year > maxYear) return
    const selectedDate = new Date(year, 0, 1)
    setDeliveryDates(prev => {
      const isSelected = prev.some(d => d.getFullYear() === year)
      if (isSelected) return prev.filter(d => d.getFullYear() !== year)
      return [...prev, selectedDate].sort((a, b) => a.getTime() - b.getTime())
    })
  }

  // Validate form
  const validateForm = (): boolean => {
    if (announcementType === 'goods') {
      if (deliveryDates.length === 0) {
        Alert.alert(t('common.error'), t('applications.selectAtLeastOneDate'))
        return false
      }
      if (!quantity || quantity.trim() === '') {
        Alert.alert(t('common.error'), t('applications.enterQuantity'))
        return false
      }
      const qty = parseFloat(quantity)
      if (isNaN(qty) || qty <= 0) {
        Alert.alert(t('common.error'), t('applications.quantityMustBePositive'))
        return false
      }
      // Check daily limit if exists
      const announcementData = announcement as any
      const dailyLimit = announcementData?.daily_limit
      if (dailyLimit && qty > dailyLimit) {
        Alert.alert(t('common.error'), t('applications.quantityExceedsLimit', { limit: dailyLimit, unit: announcementData?.quantity_unit ?? announcement?.unit ?? '' }))
        return false
      }
    } else if (announcementType === 'rent' || announcementType === 'service') {
      if (deliveryDates.length === 0) {
        Alert.alert(t('common.error'), t('applications.selectAtLeastOneDate'))
        return false
      }
    }
    return true
  }

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    try {
      const applicationData: announcementsAPI.ApplicationFormData = {
        announcement_id: announcementId,
        notes: notes.trim() || undefined,
      }

      const minDateKey = getCalendarMinDate()
      const calendarViewMode = getCalendarViewMode()
      const toApiDeliveryDate = (date: Date) =>
        formatDeliveryDateForApi(date, calendarViewMode, minDateKey)

      if (announcementType === 'goods') {
        if (deliveryDates.length > 0) {
          applicationData.delivery_dates = deliveryDates.map(toApiDeliveryDate)
        }
        if (quantity) {
          applicationData.count = parseFloat(quantity)
        }
      } else if (announcementType === 'rent' || announcementType === 'service') {
        if (deliveryDates.length > 0) {
          applicationData.delivery_dates = deliveryDates.map(toApiDeliveryDate)
        }
      }

      if (isEditMode && applicationId) {
        const updateData: announcementsAPI.ApplicationUpdateData = {
          notes: applicationData.notes,
          delivery_dates: applicationData.delivery_dates,
          count: applicationData.count,
        }
        await updateApplicationMutation.mutateAsync({ id: applicationId, announcementId, data: updateData })
      } else {
        await submitApplicationMutation.mutateAsync(applicationData)
      }

      Alert.alert(t('common.success'), isEditMode ? t('applications.updateSuccess') : t('applications.submitSuccess'), [
        {
          text: t('common.ok'),
          onPress: () => { skipUnsavedPromptRef.current = true; navigation.goBack() },
        },
      ])
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.response?.data?.message || t('applications.submitError'))
    }
  }

  const handleCancel = () => {
    navigation.goBack()
  }

  const handleSearchPress = () => {
    console.log('Search pressed')
  }

  const handleProfilePress = () => {
    const parent = navigation.getParent()
    if (parent) {
      parent.navigate('Profile')
    } else {
      ;(navigation as any).navigate('Profile')
    }
  }

  // Get daily limit info
  const getDailyLimitInfo = () => {
    if (announcementType !== 'goods') return null
    const announcementData = announcement as any
    const dailyLimit = announcementData?.daily_limit
    if (!dailyLimit) return null
    
    const unit = announcementData?.quantity_unit ?? announcement?.unit ?? 'տն'
    return `${dailyLimit.toLocaleString('hy-AM', { maximumFractionDigits: 1 })} ${unit}/${t('common.perDay')}`
  }

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.container}>
          <AppHeader
            showBack
            onSearchPress={handleSearchPress}
            onProfilePress={handleProfilePress}
          />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.buttonPrimary} />
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  const dailyLimitInfo = getDailyLimitInfo()


  const getAnnouncementSubcategoryName = (): string => {
    if (!announcement) return ''
    const lang = (i18n.language || 'hy').toLowerCase()
    const item = (announcement as any).item
    if (item) {
      if (lang.startsWith('en') && item.name_en) return item.name_en
      if (lang.startsWith('ru') && item.name_ru) return item.name_ru
      return item.name_am || item.name_hy || item.name_en || item.name_ru || ''
    }
    return ''
  }

  const getAnnouncementCountAndUnit = (): { count: string; unit: string } => {
    if (!announcement) return { count: '', unit: '' }
    const a = announcement as any
    const countStr = (announcement.count ?? a.count ?? '').toString()
    const unitStr = (announcement.unit ?? a.quantity_unit ?? a.unit ?? '').toString()
    return { count: countStr, unit: unitStr }
  }

  const getAnnouncementPriceAndUnit = (): { price: string; unit: string } => {
    if (!announcement) return { price: '', unit: '' }
    const a = announcement as any
    const priceStr = (announcement.price ?? a.price ?? '').toString()
    const unitStr = ((a.price_unit ?? announcement.unit ?? a.unit) ?? '').toString()
    return { price: priceStr, unit: unitStr }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <AppHeader
          showBack
          onSearchPress={handleSearchPress}
          onProfilePress={handleProfilePress}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Text style={styles.title}>{getPageTitle()}</Text>
          
          {/* Instructional Text */}
          <Text style={styles.instructionText}>
            {t('applications.sendToAnnouncer')}
          </Text>

          {/* Announcement summary (title, quantity, price) */}
          {announcement && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle} numberOfLines={2}>
              {getAnnouncementSubcategoryName()}
              </Text>
            
              {(() => {
                const { count, unit } = getAnnouncementCountAndUnit()
                const showCount = count && count !== '0' && count !== '0.00' && count !== '0.0'
                if (!showCount) return null
                const unitLabel = translateMeasureUnit(unit, i18n.language) || '-'
                const { price, unit: priceUnit } = getAnnouncementPriceAndUnit()
                const n = parseFloat(price)
                const formattedPrice = price ? (isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : price) : ''
                const perUnit = priceUnit ? `/ ${unitLabel}.` : ''

                return (
                  <View style={styles.summaryInlineRow}>
                    <Text style={styles.summaryInlineLeft} numberOfLines={1}>
                      {t('applications.quantity')} {count} / {unitLabel}
                    </Text>
                    <Text style={styles.summaryInlineRight} numberOfLines={1}>
                      {formattedPrice ? `${formattedPrice} ${t('common.currency')}${perUnit}` : ''}
                    </Text>
                  </View>
                )
              })()}
            </View>
          )}

          {/* Daily Limit Banner - Only for goods */}
          {dailyLimitInfo && (
            <View style={styles.limitBanner}>
              <Text style={styles.limitText}>{t('announcementDetail.limit')}: {dailyLimitInfo}</Text>
            </View>
          )}

          {/* Delivery Dates - For goods and rent (rent uses calendar instead of unit dropdown) */}
          {(announcementType === 'goods' || announcementType === 'rent' || announcementType === 'service') && (
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>{t('addAnnouncement.availabilityPeriod')}*</Text>
              <TouchableOpacity 
                style={styles.dateInput} 
                onPress={handleOpenDatePicker}
              >
                <Text style={[styles.dateInputText, deliveryDates.length === 0 && styles.dateInputPlaceholder]}>
                  {deliveryDates.length > 0 ? t('applications.selectedDates', { count: deliveryDates.length }) : t('applications.selectDates')}
                </Text>
                <Icon name="calendar" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}


          {/* Quantity - Only for goods */}
          {announcementType === 'goods' && (
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>
                {t('applications.dailyOrderQuantityTitle', { unit: translateMeasureUnit(announcement?.unit || '', i18n.language) })}*
              </Text>
              <TextInput
                style={styles.quantityInput}
                value={quantity}
                onChangeText={(text) => {
                  const normalized = text
                    .replace(/,/g, '.')
                    .replace(/[^0-9.]/g, '')
                    .replace(/(\..*)\./g, '$1')
                  setQuantity(normalized)
                }}
                placeholder={t('applications.fillIn')}
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
              />
              {dailyLimitInfo && (
                <Text style={styles.quantityHint}>
                  {t('applications.quantityExceedsLimit', { limit: '', unit: '' }).split('(')[0].trim()}
                </Text>
              )}
            </View>
          )}

          {/* Notes */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{t('common.comment')}</Text>
            <TextInput
              style={styles.textArea}
              value={notes}
              onChangeText={setNotes}
              placeholderTextColor="gray"
              placeholder={t('applications.coommentNote')}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Post-submission info */}
          <Text style={styles.postSubmissionInfo}>
            {t('applications.postSubmissionInfo')}
          </Text>
        </ScrollView>

   

        {/* Calendar Modal - Normal month calendar for goods and rent */}
        {(announcementType === 'goods' || announcementType === 'rent' || announcementType === 'service') && showDatePicker && (() => {
          const viewMode = getCalendarViewMode()
          const minKey = getCalendarMinDate()
          const maxKey = getCalendarMaxDate()
          const minYear = parseInt(minKey.split('-')[0], 10) || new Date().getFullYear()
          const maxYear = parseInt(maxKey.split('-')[0], 10) || new Date().getFullYear() + 3
          const monthKeys = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
          return (
            <Modal
              transparent
              animationType="fade"
              visible={showDatePicker}
              onRequestClose={() => setShowDatePicker(false)}
            >
              <View style={styles.modalOverlay}>
                <TouchableOpacity 
                  style={{ flex: 1 }}
                  activeOpacity={1}
                  onPress={() => setShowDatePicker(false)}
                />
                <View style={styles.calendarSheet}>
                  <View style={styles.pickerHeader}>
                    <View style={styles.pickerHeaderBack} />
                    <Text style={styles.pickerTitle}>{t('applications.deliveryDates')}</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.doneButton}>{t('common.done')}</Text>
                    </TouchableOpacity>
                  </View>

                  {viewMode === 'daily' && (
                    <Calendar
                      onDayPress={handleCalendarDayPress}
                      markedDates={getMarkedDates()}
                      minDate={minKey}
                      maxDate={maxKey}
                      current={minKey}
                      enableSwipeMonths={true}
                      theme={{
                        backgroundColor: colors.white,
                        calendarBackground: colors.white,
                        textSectionTitleColor: colors.textSecondary,
                        selectedDayBackgroundColor: colors.buttonPrimary,
                        selectedDayTextColor: colors.white,
                        todayTextColor: colors.buttonPrimary,
                        dayTextColor: colors.textPrimary,
                        textDisabledColor: colors.textTertiary,
                        dotColor: colors.buttonPrimary,
                        selectedDotColor: colors.white,
                        arrowColor: colors.buttonPrimary,
                        monthTextColor: colors.textPrimary,
                        textDayFontWeight: '700',
                        textMonthFontWeight: '600',
                        textDayHeaderFontWeight: '600',
                        textDayFontSize: 16,
                        textMonthFontSize: 18,
                        textDayHeaderFontSize: 14,
                      }}
                      style={styles.calendar}
                    />
                  )}

                  {viewMode === 'monthly' && (
                    <>
                      <View style={appPickerStyles.yearNavRow}>
                        <TouchableOpacity
                          style={appPickerStyles.yearNavBtn}
                          onPress={() => setPickerDisplayYear(y => Math.max(y - 1, minYear))}
                          disabled={pickerDisplayYear <= minYear}
                        >
                          <Text style={[appPickerStyles.yearNavArrow, pickerDisplayYear <= minYear && appPickerStyles.yearNavArrowDisabled]}>{'‹'}</Text>
                        </TouchableOpacity>
                        <Text style={appPickerStyles.yearNavText}>{pickerDisplayYear}</Text>
                        <TouchableOpacity
                          style={appPickerStyles.yearNavBtn}
                          onPress={() => setPickerDisplayYear(y => Math.min(y + 1, maxYear))}
                          disabled={pickerDisplayYear >= maxYear}
                        >
                          <Text style={[appPickerStyles.yearNavArrow, pickerDisplayYear >= maxYear && appPickerStyles.yearNavArrowDisabled]}>{'›'}</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={appPickerStyles.monthGrid}>
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(month => {
                          const mk = `${pickerDisplayYear}-${String(month).padStart(2, '0')}`
                          const isSelected = deliveryDates.some(d => d.getFullYear() === pickerDisplayYear && d.getMonth() + 1 === month)
                          const isDisabled = mk < minKey.substring(0, 7) || mk > maxKey.substring(0, 7)
                          return (
                            <TouchableOpacity
                              key={month}
                              style={[appPickerStyles.monthItem, isSelected && appPickerStyles.monthItemSelected, isDisabled && appPickerStyles.monthItemDisabled]}
                              onPress={() => handleMonthPress(month)}
                              disabled={isDisabled}
                            >
                              <Text style={[appPickerStyles.monthItemText, isSelected && appPickerStyles.monthItemTextSelected, isDisabled && appPickerStyles.monthItemTextDisabled]}>
                                {t(`months.${monthKeys[month - 1]}`)}
                              </Text>
                            </TouchableOpacity>
                          )
                        })}
                      </View>
                    </>
                  )}

                  {viewMode === 'yearly' && (
                    <ScrollView contentContainerStyle={appPickerStyles.yearGrid}>
                      {Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i).map(year => {
                        const isSelected = deliveryDates.some(d => d.getFullYear() === year)
                        return (
                          <TouchableOpacity
                            key={year}
                            style={[appPickerStyles.yearGridItem, isSelected && appPickerStyles.yearGridItemSelected]}
                            onPress={() => handleYearPress(year)}
                          >
                            <Text style={[appPickerStyles.yearGridItemText, isSelected && appPickerStyles.yearGridItemTextSelected]}>
                              {year}
                            </Text>
                          </TouchableOpacity>
                        )
                      })}
                    </ScrollView>
                  )}
                </View>
              </View>
            </Modal>
          )
        })()}

      </KeyboardAvoidingView>
           {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={handleCancel}
            disabled={submitting}
          >
            <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={submitting || !canSubmit}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>{isEditMode ? t('common.save') : t('applications.submit')}</Text>
            )}
          </TouchableOpacity>
        </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.buttonPrimary,
  },
  container: {
    flex: 1,
    gap: 12,
    backgroundColor: colors.white,
  },
  scrollView: {

    flex: 1,
  },
  content: {
    paddingHorizontal: 28,
    paddingVertical: 15,    
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: colors.black,
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 15,
  },
  summaryCard: {
    backgroundColor: colors.white,
    marginBottom: 20,
    marginTop: 10,
    paddingHorizontal: 10,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  summarySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: -6,
    marginBottom: 8,
  },
  summaryInlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryInlineLeft: {
    fontSize: 16,
    color: colors.black,
    fontWeight: '400',
  },
  summaryInlineRight: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.black,
  },
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 50,
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginBottom: 24,
  },
  limitText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  infoIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.buttonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 50,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateInputText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  dateInputPlaceholder: {
    color: colors.textTertiary,
  },
  unitInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F9FAFB',
  },
  unitInputText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  unitInputPlaceholder: {
    color: colors.textTertiary,
  },
  hourlyNote: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 50,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  quantityHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
    minHeight: 100,
  },
  postSubmissionInfo: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.buttonPrimary,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.buttonPrimary,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: colors.buttonPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
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
    maxHeight: '50%',
  },
  calendarSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '90%',
  },
  calendar: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  pickerHeaderBack: {
    width: 24,
    height: 24,
  },
  calendarListContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  calendarYearItem: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 14,
    paddingHorizontal: 12,
    margin: 4,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  calendarYearItemSelected: {
    backgroundColor: colors.buttonPrimary,
  },
  calendarYearItemText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  calendarYearItemTextSelected: {
    color: colors.white,
  },
  dailyDateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dailyDateItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  dailyDateItemText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dailyDateItemTextDisabled: {
    fontWeight: '400',
    color: colors.textTertiary,
  },
  dailyDateItemTextSelected: {
    color: colors.buttonPrimary,
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
  pickerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  doneButton: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.buttonPrimary,
  },
  picker: {
    height: 216,
    backgroundColor: colors.white,
  },
  unitPickerList: {
    maxHeight: 300,
  },
  unitPickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  unitPickerItemSelected: {
    backgroundColor: '#F9FAFB',
  },
  unitPickerItemText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  unitPickerItemTextSelected: {
    fontWeight: '600',
    color: colors.buttonPrimary,
  },
})

const appPickerStyles = StyleSheet.create({
  yearNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  yearNavBtn: {
    padding: 8,
  },
  yearNavArrow: {
    fontSize: 28,
    color: colors.buttonPrimary,
    lineHeight: 32,
  },
  yearNavArrowDisabled: {
    color: '#D1D5DB',
  },
  yearNavText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  monthItem: {
    width: '25%',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  monthItemSelected: {
    backgroundColor: colors.buttonPrimary,
  },
  monthItemDisabled: {
    opacity: 0.35,
  },
  monthItemText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  monthItemTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  monthItemTextDisabled: {
    color: '#9CA3AF',
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  yearGridItem: {
    width: '33.33%',
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  yearGridItemSelected: {
    backgroundColor: colors.buttonPrimary,
  },
  yearGridItemText: {
    fontSize: 17,
    color: '#111827',
    fontWeight: '500',
  },
  yearGridItemTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
})
