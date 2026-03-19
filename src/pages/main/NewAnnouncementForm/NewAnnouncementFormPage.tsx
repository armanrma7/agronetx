import React from 'react'
import { View, Text, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, Alert, ScrollView, StyleSheet } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { NewAnnouncementFormFields } from './NewAnnouncementFormFields'
import { styles } from './styles'
import { useNewAnnouncementForm } from './useNewAnnouncementForm'
import { colors } from '../../../theme/colors'

export function NewAnnouncementFormPage() {
  const {
    t,
    type,
    isEditMode,
    currentLang,
    formData,
    setFormData,
    categoryOptions,
    subcategoryOptions,
    measurementOptions,
    rentMeasurementOptions,
    subtypeOptions,
    loadingCategories,
    loadingSubcategories,
    additionalFieldsExpanded,
    setAdditionalFieldsExpanded,
    updating,
    selectedImages,
    selectedRegions,
    setSelectedRegions,
    selectedVillages,
    setSelectedVillages,
    showDatePicker,
    currentDateField,
    tempDate,
    openDatePicker,
    handleDateChange,
    confirmDate,
    cancelDatePicker,
    pickerMode,
    pickerDisplayYear,
    setPickerDisplayYear,
    handlePickerMonthSelect,
    handlePickerYearSelect,
    formatPeriodDate,
    showImagePickerOptions,
    removeImage,
    handlePublish,
    canSubmit,
    isDirty,
    skipUnsavedPromptRef,
    navigation,
    showUnitField,
    showRentUnitField,
    MAX_IMAGES,
  } = useNewAnnouncementForm()

  React.useEffect(() => {
    const unsubscribe = (navigation as any).addListener('beforeRemove', (e: any) => {
      if (skipUnsavedPromptRef?.current) return
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
  }, [isDirty, navigation, skipUnsavedPromptRef, t])

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <NewAnnouncementFormFields
        t={t}
        type={type}
        isEditMode={isEditMode}
        canSubmit={canSubmit}
        formData={formData}
        setFormData={setFormData}
        subtypeOptions={subtypeOptions}
        categoryOptions={categoryOptions}
        subcategoryOptions={subcategoryOptions}
        measurementOptions={measurementOptions}
        rentMeasurementOptions={rentMeasurementOptions}
        loadingCategories={loadingCategories}
        loadingSubcategories={loadingSubcategories}
        showUnitField={showUnitField}
        showRentUnitField={showRentUnitField}
        additionalFieldsExpanded={additionalFieldsExpanded}
        setAdditionalFieldsExpanded={setAdditionalFieldsExpanded}
        selectedImages={selectedImages}
        selectedRegions={selectedRegions}
        setSelectedRegions={setSelectedRegions}
        selectedVillages={selectedVillages}
        setSelectedVillages={setSelectedVillages}
        currentLang={currentLang}
        openDatePicker={openDatePicker}
        formatPeriodDate={formatPeriodDate}
        showImagePickerOptions={showImagePickerOptions}
        removeImage={removeImage}
        handlePublish={handlePublish}
        navigation={navigation}
        updating={updating}
        MAX_IMAGES={MAX_IMAGES}
      />

      {showDatePicker && pickerMode === 'daily' && Platform.OS === 'ios' && (() => {
        const maxDate3y = new Date(); maxDate3y.setFullYear(maxDate3y.getFullYear() + 3)
        return (
          <Modal
            transparent
            animationType="fade"
            visible={showDatePicker}
            onRequestClose={cancelDatePicker}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.datePickerModal}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={cancelDatePicker}>
                    <Text style={styles.datePickerCancel}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <Text style={styles.datePickerTitle}>
                    {currentDateField === 'start' ? t('addAnnouncement.from') : t('addAnnouncement.until')}
                  </Text>
                  <TouchableOpacity onPress={() => confirmDate()}>
                    <Text style={styles.datePickerConfirm}>{t('applications.selectDates')}</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  maximumDate={maxDate3y}
                />
              </View>
            </View>
          </Modal>
        )
      })()}

      {showDatePicker && pickerMode === 'daily' && Platform.OS === 'android' && (() => {
        const maxDate3y = new Date(); maxDate3y.setFullYear(maxDate3y.getFullYear() + 3)
        return (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="calendar"
            onChange={handleDateChange}
            minimumDate={new Date()}
            maximumDate={maxDate3y}
          />
        )
      })()}

      {showDatePicker && pickerMode === 'monthly' && (() => {
        const today = new Date()
        const minYear = today.getFullYear()
        const maxYear = today.getFullYear() + 3
        const monthKeys = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
        return (
          <Modal
            transparent
            animationType="fade"
            visible={showDatePicker}
            onRequestClose={cancelDatePicker}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.datePickerModal}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={cancelDatePicker}>
                    <Text style={styles.datePickerCancel}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <Text style={styles.datePickerTitle}>
                    {currentDateField === 'start' ? t('addAnnouncement.from') : t('addAnnouncement.until')}
                  </Text>
                  <View style={{ width: 60 }} />
                </View>
                <View style={announcementPickerStyles.yearNavRow}>
                  <TouchableOpacity
                    onPress={() => setPickerDisplayYear(y => Math.max(y - 1, minYear))}
                    style={announcementPickerStyles.yearNavBtn}
                    disabled={pickerDisplayYear <= minYear}
                  >
                    <Text style={[announcementPickerStyles.yearNavArrow, pickerDisplayYear <= minYear && announcementPickerStyles.yearNavArrowDisabled]}>{'‹'}</Text>
                  </TouchableOpacity>
                  <Text style={announcementPickerStyles.yearNavText}>{pickerDisplayYear}</Text>
                  <TouchableOpacity
                    onPress={() => setPickerDisplayYear(y => Math.min(y + 1, maxYear))}
                    style={announcementPickerStyles.yearNavBtn}
                    disabled={pickerDisplayYear >= maxYear}
                  >
                    <Text style={[announcementPickerStyles.yearNavArrow, pickerDisplayYear >= maxYear && announcementPickerStyles.yearNavArrowDisabled]}>{'›'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={announcementPickerStyles.monthGrid}>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(month => {
                    const mk = `${pickerDisplayYear}-${String(month).padStart(2, '0')}`
                    const minMk = `${minYear}-${String(today.getMonth() + 1).padStart(2, '0')}`
                    const maxMk = `${maxYear}-12`
                    const isDisabled = mk < minMk || mk > maxMk
                    return (
                      <TouchableOpacity
                        key={month}
                        style={[announcementPickerStyles.monthItem, isDisabled && announcementPickerStyles.monthItemDisabled]}
                        onPress={() => handlePickerMonthSelect(month)}
                        disabled={isDisabled}
                      >
                        <Text style={[announcementPickerStyles.monthItemText, isDisabled && announcementPickerStyles.monthItemTextDisabled]}>
                          {t(`months.${monthKeys[month - 1]}`)}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            </View>
          </Modal>
        )
      })()}

      {showDatePicker && pickerMode === 'yearly' && (() => {
        const thisYear = new Date().getFullYear()
        const years = [thisYear, thisYear + 1, thisYear + 2, thisYear + 3]
        return (
          <Modal
            transparent
            animationType="fade"
            visible={showDatePicker}
            onRequestClose={cancelDatePicker}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.datePickerModal}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={cancelDatePicker}>
                    <Text style={styles.datePickerCancel}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <Text style={styles.datePickerTitle}>
                    {currentDateField === 'start' ? t('addAnnouncement.from') : t('addAnnouncement.until')}
                  </Text>
                  <View style={{ width: 60 }} />
                </View>
                <ScrollView contentContainerStyle={announcementPickerStyles.yearGrid}>
                  {years.map(year => (
                    <TouchableOpacity
                      key={year}
                      style={announcementPickerStyles.yearGridItem}
                      onPress={() => handlePickerYearSelect(year)}
                    >
                      <Text style={announcementPickerStyles.yearGridItemText}>{year}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )
      })()}
    </KeyboardAvoidingView>
  )
}

const announcementPickerStyles = StyleSheet.create({
  yearNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
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
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  monthItemDisabled: {
    opacity: 0.3,
  },
  monthItemText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
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
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearGridItemText: {
    fontSize: 17,
    color: '#111827',
    fontWeight: '500',
  },
})
