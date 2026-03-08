import React from 'react'
import { View, Text, TouchableOpacity, Modal, KeyboardAvoidingView, Platform } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useNewAnnouncementForm } from './useNewAnnouncementForm'
import { NewAnnouncementFormFields } from './NewAnnouncementFormFields'
import { styles } from './styles'

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
    showImagePickerOptions,
    removeImage,
    handlePublish,
    navigation,
    showUnitField,
    showRentUnitField,
    MAX_IMAGES,
  } = useNewAnnouncementForm()

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <NewAnnouncementFormFields
        t={t}
        type={type}
        isEditMode={isEditMode}
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
        showImagePickerOptions={showImagePickerOptions}
        removeImage={removeImage}
        handlePublish={handlePublish}
        navigation={navigation}
        updating={updating}
        MAX_IMAGES={MAX_IMAGES}
      />

      {Platform.OS === 'ios' && showDatePicker && (
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
                  <Text style={styles.datePickerConfirm}>{t('common.save')}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="calendar"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
    </KeyboardAvoidingView>
  )
}
