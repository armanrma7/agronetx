import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
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
import { useApplicationsStore } from '../../store/applications/useApplicationsStore'
import { useAnnouncementsStore } from '../../store/announcements/useAnnouncementsStore'

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
  const { t } = useTranslation()
  const navigation = useNavigation()
  const route = useRoute()
  const { announcementId, announcementType, announcement: paramAnnouncement, applicationId, prefill } = (route.params as RouteParams) || {}
  const isEditMode = !!applicationId

  const { submitApplication, updateApplication } = useApplicationsStore()
  const { fetchById: fetchAnnouncementById, setInCache } = useAnnouncementsStore()

  // State
  const [announcement, setAnnouncement] = useState<Announcement | null>(paramAnnouncement ?? null)
  const [applicationsWithDeliveryDates, setApplicationsWithDeliveryDates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Form fields
  const [deliveryDates, setDeliveryDates] = useState<Date[]>([]) // For goods: array of delivery dates
  const [quantity, setQuantity] = useState<string>('') // For goods
  const [selectedUnit, setSelectedUnit] = useState<UnitType | undefined>(undefined) // For rent/service
  const [notes, setNotes] = useState('')
  
  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showUnitPicker, setShowUnitPicker] = useState(false)
  const skipUnsavedPromptRef = useRef(false)

  const isValidForSubmit = useMemo(() => {
    if (announcementType === 'goods') {
      if (deliveryDates.length === 0) return false
      const qty = parseFloat(quantity)
      return !!quantity.trim() && !isNaN(qty) && qty > 0
    }
    if (announcementType === 'rent') {
      return deliveryDates.length > 0
    }
    if (announcementType === 'service') {
      return !!selectedUnit
    }
    return false
  }, [announcementType, deliveryDates.length, quantity, selectedUnit])

  const initialSnapshotRef = useRef<string | null>(null)
  const didInitSnapshotRef = useRef(false)
  const currentSnapshot = useMemo(() => {
    const snap = {
      announcementType,
      deliveryDates: deliveryDates.map(d => d.toISOString().split('T')[0]),
      quantity: quantity ?? '',
      selectedUnit: selectedUnit ?? '',
      notes: notes ?? '',
    }
    return JSON.stringify(snap)
  }, [announcementType, deliveryDates, quantity, selectedUnit, notes])

  useEffect(() => {
    if (didInitSnapshotRef.current) return
    // Initialize after prefill effect runs (or immediately if no prefill)
    initialSnapshotRef.current = currentSnapshot
    didInitSnapshotRef.current = true
  }, [currentSnapshot])

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
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.continue'), style: 'destructive', onPress: () => (navigation as any).dispatch(e.data.action) },
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
      setSelectedUnit(prefill.unit as UnitType)
    }
    if (prefill.notes) {
      setNotes(prefill.notes)
    }
  }, [])

  // Fetch announcement details only when not already provided via params
  useEffect(() => {
    if (paramAnnouncement) {
      setLoading(false)
      return
    }
    fetchAnnouncement()
  }, [announcementId])

  const fetchAnnouncement = async () => {
    try {
      setLoading(true)
      const data = await fetchAnnouncementById(announcementId)
      setAnnouncement(data)
    } catch (error) {
      console.error('Error fetching announcement:', error)
      Alert.alert(t('common.error'), t('applications.loadError'))
      navigation.goBack()
    } finally {
      setLoading(false)
    }
  }

  // Fetch applications for this announcement (for calendar: disable days already in applied applications)
  useEffect(() => {
    if (!announcementId || (announcementType !== 'goods' && announcementType !== 'rent')) return
    let cancelled = false
    announcementsAPI.getApplicationsByAnnouncementAPI(announcementId)
      .then((list) => {
        if (!cancelled) setApplicationsWithDeliveryDates(list)
      })
      .catch(() => {
        if (!cancelled) setApplicationsWithDeliveryDates([])
      })
    return () => { cancelled = true }
  }, [announcementId, announcementType])

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

  // Get available units based on type
  const getAvailableUnits = (): UnitType[] => {
    if (announcementType === 'rent') {
      return ['daily', 'monthly', 'yearly', 'hourly']
    } else if (announcementType === 'service') {
      return ['daily', 'monthly']
    }
    return []
  }

  // Get unit label
  const getUnitLabel = (unit: UnitType): string => {
    switch (unit) {
      case 'daily':
        return t('units.daily')
      case 'monthly':
        return t('units.monthly')
      case 'yearly':
        return t('units.yearly')
      case 'hourly':
        return t('units.hourly')
      default:
        return unit
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
    if (unit.includes('month') || unit === 'monthly' || unit.includes('ամիս')) return 'monthly'
    if (unit.includes('day') || unit === 'daily' || unit.includes('օր')) return 'daily'
    return 'daily'
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
    setShowDatePicker(true)
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
    } else if (announcementType === 'rent') {
      if (deliveryDates.length === 0) {
        Alert.alert(t('common.error'), t('applications.selectAtLeastOneDate'))
        return false
      }
    } else if (announcementType === 'service') {
      if (!selectedUnit) {
        Alert.alert(t('common.error'), t('applications.selectUnit'))
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
      setSubmitting(true)
      
      const applicationData: announcementsAPI.ApplicationFormData = {
        announcement_id: announcementId,
        notes: notes.trim() || undefined,
      }

      if (announcementType === 'goods') {
        if (deliveryDates.length > 0) {
          applicationData.delivery_dates = deliveryDates.map(date => formatDateToString(date))
        }
        if (quantity) {
          applicationData.count = parseFloat(quantity)
        }
      } else if (announcementType === 'rent') {
        if (deliveryDates.length > 0) {
          applicationData.delivery_dates = deliveryDates.map(date => formatDateToString(date))
          applicationData.unit = getCalendarViewMode()
        }
      } else if (announcementType === 'service') {
        if (selectedUnit) {
          applicationData.unit = selectedUnit === 'hourly' ? 'daily' : selectedUnit
        }
      }

      if (isEditMode && applicationId) {
        const updateData: announcementsAPI.ApplicationUpdateData = {
          notes: applicationData.notes,
          delivery_dates: applicationData.delivery_dates,
          count: applicationData.count,
          unit: applicationData.unit,
        }
        await updateApplication(applicationId, updateData, announcementId)
      } else {
        await submitApplication(applicationData)
      }

      Alert.alert(t('common.success'), isEditMode ? t('applications.updateSuccess') : t('applications.submitSuccess'), [
        {
          text: t('common.ok'),
          onPress: () => { skipUnsavedPromptRef.current = true; navigation.goBack() },
        },
      ])
    } catch (error: any) {
      console.error('Error submitting application:', error)
      Alert.alert(t('common.error'), error?.response?.data?.message || t('applications.submitError'))
    } finally {
      setSubmitting(false)
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
    return `${dailyLimit.toLocaleString('hy-AM', { maximumFractionDigits: 1 })} ${unit}/օրական`
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

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <AppHeader
          showBack
          onSearchPress={handleSearchPress}
          onProfilePress={handleProfilePress}
        />

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Title */}
          <Text style={styles.title}>{getPageTitle()}</Text>
          
          {/* Instructional Text */}
          <Text style={styles.instructionText}>
            {t('applications.sendToAnnouncer')}
          </Text>

          {/* Daily Limit Banner - Only for goods */}
          {dailyLimitInfo && (
            <View style={styles.limitBanner}>
              <Text style={styles.limitText}>{t('announcementDetail.limit')}: {dailyLimitInfo}</Text>
            </View>
          )}

          {/* Delivery Dates - For goods and rent (rent uses calendar instead of unit dropdown) */}
          {(announcementType === 'goods' || announcementType === 'rent') && (
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>{t('applications.deliveryDate')}*</Text>
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

          {/* Unit Selection - Only for service (rent uses calendar) */}
          {announcementType === 'service' && (
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>{t('applications.serviceUnit')}</Text>
              <TouchableOpacity 
                style={styles.unitInput} 
                onPress={() => setShowUnitPicker(true)}
              >
                <Text style={[styles.unitInputText, !selectedUnit && styles.unitInputPlaceholder]}>
                  {selectedUnit ? getUnitLabel(selectedUnit) : t('common.select')}
                </Text>
                <Icon name="chevronDown" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Quantity - Only for goods */}
          {announcementType === 'goods' && (
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>{t('applications.quantity')}*</Text>
              <TextInput
                style={styles.quantityInput}
                value={quantity}
                onChangeText={setQuantity}
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
            <Text style={styles.fieldLabel}>{t('applications.notes')}</Text>
            <TextInput
              style={styles.textArea}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('applications.notesPlaceholder')}
              placeholderTextColor={colors.textTertiary}
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

        {/* Calendar Modal - Normal month calendar for goods and rent */}
        {(announcementType === 'goods' || announcementType === 'rent') && showDatePicker && (
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
                <Calendar
                  onDayPress={handleCalendarDayPress}
                  markedDates={getMarkedDates()}
                  minDate={getCalendarMinDate()}
                  maxDate={getCalendarMaxDate()}
                  current={getCalendarMinDate()}
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
              </View>
            </View>
          </Modal>
        )}

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
    padding: 16,
    paddingBottom: 100,
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
    marginBottom: 24,
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
    color: "000#",
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
