import React, { useState, useEffect } from 'react'
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

interface RouteParams {
  announcementId: string
  announcementType: 'goods' | 'service' | 'rent'
  announcementTitle: string
}

type UnitType = 'daily' | 'monthly' | 'yearly' | 'hourly'

export function ApplicationFormPage() {
  const { t, i18n } = useTranslation()
  const navigation = useNavigation()
  const route = useRoute()
  const { announcementId, announcementType } = (route.params as RouteParams) || {}

  // State
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
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

  // Fetch announcement details
  useEffect(() => {
    fetchAnnouncement()
  }, [announcementId])

  const fetchAnnouncement = async () => {
    try {
      setLoading(true)
      const data = await announcementsAPI.getAnnouncementByIdAPI(announcementId)
      setAnnouncement(data)
    } catch (error) {
      console.error('Error fetching announcement:', error)
      Alert.alert('Սխալ', 'Հայտարարությունը բեռնելը ձախողվեց')
      navigation.goBack()
    } finally {
      setLoading(false)
    }
  }

  // Get page title based on type
  const getPageTitle = () => {
    switch (announcementType) {
      case 'goods':
        return 'Ապրանքի Դիմում'
      case 'service':
        return 'Ծառայության Դիմում'
      case 'rent':
        return 'Վարձակալության Դիմում'
      default:
        return 'Դիմում'
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
        return 'Օրական'
      case 'monthly':
        return 'Ամսական'
      case 'yearly':
        return 'Տարեկան'
      case 'hourly':
        return 'Ժամային'
      default:
        return unit
    }
  }

  // Format date for display
  const formatDate = (date: Date): string => {
    const months = ['Հուն', 'Փետ', 'Մար', 'Ապր', 'Մայ', 'Հուն', 'Հուլ', 'Օգս', 'Սեպ', 'Հոկ', 'Նոյ', 'Դեկ']
    return `${months[date.getMonth()]}. ${date.getDate()}, ${date.getFullYear()}`
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

  // Get marked dates for Calendar component
  const getMarkedDates = () => {
    const marked: any = {}
    deliveryDates.forEach(date => {
      const key = dateToKey(date)
      marked[key] = {
        selected: true,
        selectedColor: colors.buttonPrimary,
        selectedTextColor: colors.white,
      }
    })
    return marked
  }

  // Handle calendar date selection
  const handleCalendarDayPress = (day: DateData) => {
    const selectedDate = keyToDate(day.dateString)
    const dateKey = day.dateString
    
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
        Alert.alert('Սխալ', 'Խնդրում ենք ընտրել առնվազն մեկ առաքման ամսաթիվ')
        return false
      }
      if (!quantity || quantity.trim() === '') {
        Alert.alert('Սխալ', 'Խնդրում ենք մուտքագրել քանակ')
        return false
      }
      const qty = parseFloat(quantity)
      if (isNaN(qty) || qty <= 0) {
        Alert.alert('Սխալ', 'Քանակը պետք է լինի դրական թիվ')
        return false
      }
      // Check daily limit if exists
      const announcementData = announcement as any
      const dailyLimit = announcementData?.daily_limit
      if (dailyLimit && qty > dailyLimit) {
        Alert.alert('Սխալ', `Քանակը չի կարող գերազանցել օրական սահմանաչափը (${dailyLimit} ${announcement?.quantity_unit || ''})`)
        return false
      }
    } else if (announcementType === 'rent' || announcementType === 'service') {
      if (!selectedUnit) {
        Alert.alert('Սխալ', 'Խնդրում ենք ընտրել միավոր')
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
        // Format dates as YYYY-MM-DD array
        if (deliveryDates.length > 0) {
          applicationData.delivery_dates = deliveryDates.map(date => formatDateToString(date))
        }
        if (quantity) {
          applicationData.count = parseFloat(quantity)
        }
      } else if (announcementType === 'rent' || announcementType === 'service') {
        if (selectedUnit) {
          // If hourly is selected for rent, use daily
          applicationData.unit = selectedUnit === 'hourly' ? 'daily' : selectedUnit
        }
      }

      await announcementsAPI.submitApplicationAPI(applicationData)
      
      Alert.alert('Հաջողություն', 'Ձեր դիմումը հաջողությամբ ուղարկվել է', [
        {
          text: 'Լավ',
          onPress: () => navigation.goBack(),
        },
      ])
    } catch (error: any) {
      console.error('Error submitting application:', error)
      Alert.alert('Սխալ', error?.response?.data?.message || 'Դիմումը ուղարկելը ձախողվեց')
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
    
    const unit = announcement?.quantity_unit || 'տն'
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

  const announcementData = announcement as any
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
            Ուղարկեք ձեր հայտը հայտարարատուին
          </Text>

          {/* Daily Limit Banner - Only for goods */}
          {dailyLimitInfo && (
            <View style={styles.limitBanner}>
              <Text style={styles.limitText}>Սահմանաչափ: {dailyLimitInfo}</Text>
              <View style={styles.infoIcon}>
                <Icon name="info" size={16} color={colors.buttonPrimary} />
              </View>
            </View>
          )}

          {/* Delivery Dates - Only for goods */}
          {announcementType === 'goods' && (
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Առաքման ամսաթիվ*</Text>
              <TouchableOpacity 
                style={styles.dateInput} 
                onPress={handleOpenDatePicker}
              >
                <Text style={styles.dateInputText}>
                  {deliveryDates.length > 0 ? `Ընտրված է ${deliveryDates.length} ամսաթիվ` : 'Ընտրել'}
                </Text>
                <Icon name="calendar" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Unit Selection - For rent and service */}
          {(announcementType === 'rent' || announcementType === 'service') && (
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>
                {announcementType === 'rent' ? 'Վարձակալության միավոր*' : 'Ծառայության միավոր*'}
              </Text>
              <TouchableOpacity 
                style={styles.unitInput} 
                onPress={() => setShowUnitPicker(true)}
              >
                <Text style={[styles.unitInputText, !selectedUnit && styles.unitInputPlaceholder]}>
                  {selectedUnit ? getUnitLabel(selectedUnit) : 'Ընտրել'}
                </Text>
                <Icon name="chevronDown" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              {/* Show daily option if hourly is selected for rent */}
              {announcementType === 'rent' && selectedUnit === 'hourly' && (
                <Text style={styles.hourlyNote}>
                  Ժամային միավորի դեպքում ցուցադրվում է օրական
                </Text>
              )}
            </View>
          )}

          {/* Quantity - Only for goods */}
          {announcementType === 'goods' && (
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Քանակ*</Text>
              <TextInput
                style={styles.quantityInput}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="Լրացնել"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
              />
              {dailyLimitInfo && (
                <Text style={styles.quantityHint}>
                  Քանակը չի կարող գերազանցել օրական սահմանաչափը
                </Text>
              )}
            </View>
          )}

          {/* Notes */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Նշումներ</Text>
            <TextInput
              style={styles.textArea}
              value={notes}
              onChangeText={setNotes}
              placeholder="Լրացնել"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Post-submission info */}
          <Text style={styles.postSubmissionInfo}>
            Հայտի հաստատումից հետո դուք կարող եք տեսնել միմյանց կոնտակտային տվյալները
          </Text>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={handleCancel}
            disabled={submitting}
          >
            <Text style={styles.cancelButtonText}>Չեղարկել</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>Դիմել</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Calendar Modal - For goods type */}
        {announcementType === 'goods' && showDatePicker && (
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
                  <Text style={styles.pickerTitle}>Ընտրել առաքման ամսաթիվ</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.doneButton}>{t('common.done')}</Text>
                  </TouchableOpacity>
                </View>
                <Calendar
                  onDayPress={handleCalendarDayPress}
                  markedDates={getMarkedDates()}
                  minDate={new Date().toISOString().split('T')[0]}
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
                    textDayFontWeight: '500',
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

        {/* Unit Picker Modal */}
        {showUnitPicker && (
          <Modal
            transparent
            animationType="fade"
            visible={showUnitPicker}
            onRequestClose={() => setShowUnitPicker(false)}
          >
            <View style={styles.modalOverlay}>
              <TouchableOpacity 
                style={{ flex: 1 }}
                activeOpacity={1}
                onPress={() => setShowUnitPicker(false)}
              />
              <View style={styles.pickerSheet}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Ընտրել միավոր</Text>
                  <TouchableOpacity onPress={() => setShowUnitPicker(false)}>
                    <Text style={styles.doneButton}>{t('common.done')}</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.unitPickerList}>
                  {getAvailableUnits().map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.unitPickerItem,
                        selectedUnit === unit && styles.unitPickerItemSelected,
                      ]}
                      onPress={() => {
                        setSelectedUnit(unit)
                        setShowUnitPicker(false)
                      }}
                    >
                      <Text
                        style={[
                          styles.unitPickerItemText,
                          selectedUnit === unit && styles.unitPickerItemTextSelected,
                        ]}
                      >
                        {getUnitLabel(unit)}
                      </Text>
                      {selectedUnit === unit && (
                        <Icon name="check" size={20} color={colors.buttonPrimary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
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
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  dateInput: {
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
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: '#F9FAFB',
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
    backgroundColor: '#F9FAFB',
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
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
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
