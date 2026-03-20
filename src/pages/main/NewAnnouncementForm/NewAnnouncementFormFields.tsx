import React from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native'
import { AppHeader } from '../../../components/AppHeader'
import { Select } from '../../../components/Select'
import { RegionVillageSelector } from '../../../components/RegionVillageSelector'
import Icon from '../../../components/Icon'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '../../../theme/colors'
import { styles } from './styles'
import type { SupportedLang } from '../../../types/items'
import type { FormData, SelectOption } from './types'

interface NewAnnouncementFormFieldsProps {
  t: (key: string) => string
  type: string
  isEditMode: boolean
  canSubmit: boolean
  formData: FormData
  setFormData: React.Dispatch<React.SetStateAction<FormData>>
  subtypeOptions: SelectOption[]
  categoryOptions: SelectOption[]
  subcategoryOptions: SelectOption[]
  measurementOptions: SelectOption[]
  rentMeasurementOptions: SelectOption[]
  loadingCategories: boolean
  loadingSubcategories: boolean
  showUnitField: boolean
  showRentUnitField: boolean
  additionalFieldsExpanded: boolean
  setAdditionalFieldsExpanded: (v: boolean) => void
  selectedImages: any[]
  selectedRegions: string[]
  setSelectedRegions: (v: string[]) => void
  selectedVillages: string[]
  setSelectedVillages: (v: string[]) => void
  currentLang: SupportedLang
  openDatePicker: (field: 'start' | 'end') => void
  formatPeriodDate?: (dateStr: string) => string
  showImagePickerOptions: () => void
  removeImage: (index: number) => void
  handlePublish: () => Promise<void>
  navigation: any
  updating: boolean
  MAX_IMAGES: number
}

export function NewAnnouncementFormFields({
  t,
  type,
  isEditMode,
  canSubmit,
  formData,
  setFormData,
  subtypeOptions,
  categoryOptions,
  subcategoryOptions,
  measurementOptions,
  rentMeasurementOptions,
  loadingCategories,
  loadingSubcategories,
  additionalFieldsExpanded,
  setAdditionalFieldsExpanded,
  selectedImages,
  selectedRegions,
  setSelectedRegions,
  selectedVillages,
  setSelectedVillages,
  currentLang,
  openDatePicker,
  formatPeriodDate,
  showImagePickerOptions,
  removeImage,
  handlePublish,
  navigation,
  updating,
  MAX_IMAGES,
}: NewAnnouncementFormFieldsProps) {
  const groupValue = typeof formData.group === 'string' ? formData.group : String(formData.group ?? '')
  const sortedCategoryOptions = [...categoryOptions].sort((a, b) =>
    a.label.localeCompare(b.label),
  )
  return (
    <>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <AppHeader
          showBack
          title={isEditMode ? t('common.edit') : t('addAnnouncement.title')}
        />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{t('announcementSubtype.title')} *</Text>
            <Select
              value={formData.subtype}
              onValueChange={value => setFormData(prev => ({ ...prev, subtype: value }))}
              options={subtypeOptions}
              placeholder={t('common.select')}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{t('addAnnouncement.group')} *</Text>
            {loadingCategories ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.buttonPrimary} />
                <Text style={styles.loadingText}>{t('common.loading')}</Text>
              </View>
            ) : (
              <Select
                value={groupValue}
                onValueChange={value => setFormData(prev => ({ ...prev, group: value }))}
                options={sortedCategoryOptions}
                placeholder={t('common.select')}
                disabled={categoryOptions.length === 0}
              />
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{t('addAnnouncement.name')} *</Text>
            {loadingSubcategories ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.buttonPrimary} />
                <Text style={styles.loadingText}>{t('common.loading')}</Text>
              </View>
            ) : (
              <Select
                value={typeof formData.name === 'string' ? formData.name : String(formData.name ?? '')}
                onValueChange={value => setFormData(prev => ({ ...prev, name: value }))}
                options={subcategoryOptions}
                placeholder={t('common.select')}
                disabled={!formData.group || subcategoryOptions.length === 0}
                searchable
                searchPlaceholder={t('common.search')}
              />
            )}
          </View>

          <View style={styles.fieldContainer}>
              <Text style={styles.label}>{t('addAnnouncement.unitOfMeasurement')} *</Text>
              <Select
                value={typeof formData.measurementUnit === 'string' ? formData.measurementUnit : String(formData.measurementUnit ?? '')}
                onValueChange={value => setFormData(prev => ({ ...prev, measurementUnit: value }))}
                options={measurementOptions}
                placeholder={t('common.select')}
                disabled={measurementOptions.length === 0}
              />
            </View> 


           {
            type === 'rent' && <View style={styles.fieldContainer}>
            <Text style={styles.label}>{t('addAnnouncement.rentUnit')} *</Text>
            <Select
              value={formData.rentUnit}
              onValueChange={value => setFormData(prev => ({ ...prev, rentUnit: value }))}
              options={rentMeasurementOptions}
              placeholder={t('common.select')}
              disabled={rentMeasurementOptions.length === 0}
            />
          </View>
           }


          {(type === 'goods' || (type === 'rent' && rentMeasurementOptions.length > 0)) && (
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                {type === 'rent' ? t('addAnnouncement.totalArea') : t('addAnnouncement.quantity')}
                 *
              </Text>
              <View style={styles.inputWithSuffixWrap}>
                <TextInput
                  style={styles.inputWithSuffix}
                  value={formData.quantity}
                  onChangeText={value => {
                    const normalized = value
                      .replace(/,/g, '.')
                      .replace(/[^0-9.]/g, '')
                      .replace(/(\..*)\./g, '$1')
                    setFormData(prev => ({ ...prev, quantity: normalized }))
                  }}
                  placeholder={t('common.select')}
                  placeholderTextColor={colors.textPlaceholder}
                  keyboardType="numeric"
                />
                <Text style={styles.inputSuffixText}>
                  {(() => {
                    const key = (formData.measurementUnit || '').toString()
                    if (!key) return ''
                    const opt = measurementOptions.find(o => String(o.value) === key)
                    return opt?.label ?? ''
                  })()}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{t('addAnnouncement.price')} *</Text>
            <View style={styles.inputWithSuffixWrap}>
              <TextInput
                style={styles.inputWithSuffix}
                value={formData.pricePerUnit}
                onChangeText={value => {
                  const normalized = value
                    .replace(/,/g, '.')
                    .replace(/[^0-9.]/g, '')
                    .replace(/(\..*)\./g, '$1')
                  setFormData(prev => ({ ...prev, pricePerUnit: normalized }))
                }}
                placeholder={t('common.select')}
                placeholderTextColor={colors.textPlaceholder}
                keyboardType="numeric"
              />
              <Text style={styles.inputSuffixText}>{t('common.currency')}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.additionalFieldsToggle}
            onPress={() => setAdditionalFieldsExpanded(!additionalFieldsExpanded)}
          >
            <Text style={styles.additionalFieldsText}>{t('addAnnouncement.additionalFields')}</Text>
            <Icon
              name="chevronDown"
              size={24}
              color={colors.buttonPrimary}
              style={{ transform: [{ rotate: additionalFieldsExpanded ? '180deg' : '0deg' }] }}
            />
          </TouchableOpacity>

          {additionalFieldsExpanded && (
            <>
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>{t('addAnnouncement.description')}</Text>
                <TextInput
                  style={styles.textArea}
                  value={formData.description}
                  onChangeText={value => setFormData(prev => ({ ...prev, description: value }))}
                  placeholder={t('addAnnouncement.fillIn')}
                  placeholderTextColor={colors.textPlaceholder}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {(type === 'rent' || type === 'goods') && (
                <View style={styles.fieldContainer}>
                  <TouchableOpacity
                    style={styles.imageUploadButton}
                    onPress={showImagePickerOptions}
                    disabled={selectedImages.length >= MAX_IMAGES}
                  >
                    <Text style={styles.label}>{t('addAnnouncement.images')}</Text>
                    <View style={styles.imageUploadIconContainer}>
                      <Icon name="add" size={20} color={colors.white} />
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.imageUploadInfo}>{t('addAnnouncement.uploadImagesInfo')}</Text>
                  {selectedImages.length > 0 && (
                    <View style={styles.imagePreviewContainer}>
                      {selectedImages.map((image, index) => (
                        <View key={index} style={styles.imagePreviewWrapper}>
                          <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                          <TouchableOpacity
                            style={styles.imageRemoveButton}
                            onPress={() => removeImage(index)}
                          >
                            <Icon name="close" size={16} color={colors.white} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>{t('addAnnouncement.availabilityPeriod')}</Text>
                <View style={styles.dateRow}>
                  <View style={styles.dateInputHalf}>
                    <Text style={styles.dateLabel}>{t('addAnnouncement.from')}</Text>
                    <TouchableOpacity style={styles.dateInput} onPress={() => openDatePicker('start')}>
                      <Text style={[styles.dateInputText, !formData.periodStart && styles.placeholder]}>
                        {formData.periodStart ? (formatPeriodDate ? formatPeriodDate(formData.periodStart) : formData.periodStart) : t('addAnnouncement.fillIn')}
                      </Text>
                      <Icon name="calendar" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.dateInputHalf}>
                    <Text style={styles.dateLabel}>{t('addAnnouncement.until')}</Text>
                    <TouchableOpacity style={styles.dateInput} onPress={() => openDatePicker('end')}>
                      <Text style={[styles.dateInputText, !formData.salesPeriod && styles.placeholder]}>
                        {formData.salesPeriod ? (formatPeriodDate ? formatPeriodDate(formData.salesPeriod) : formData.salesPeriod) : t('addAnnouncement.fillIn')}
                      </Text>
                      <Icon name="calendar" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {type === 'goods' && (
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>{t('addAnnouncement.dailyMaxQuantity')}</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.dailyMaxQuantity}
                    onChangeText={value => {
                      const normalized = value
                        .replace(/,/g, '.')
                        .replace(/[^0-9.]/g, '')
                        .replace(/(\..*)\./g, '$1')
                      setFormData(prev => ({ ...prev, dailyMaxQuantity: normalized }))
                    }}
                    placeholder={t('addAnnouncement.fillIn')}
                    placeholderTextColor={colors.textPlaceholder}
                    keyboardType="numeric"
                  />
                </View>
              )}

              <Text style={styles.label}>{t('addAnnouncement.transactionLocation')}</Text>
              <View style={styles.fieldContainer}>
                <RegionVillageSelector
                  selectedRegions={selectedRegions}
                  selectedVillages={selectedVillages}
                  onRegionsChange={setSelectedRegions}
                  onVillagesChange={setSelectedVillages}
                  currentLang={currentLang}
                />
              </View>
            </>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              disabled={updating}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.publishButton,
                (updating || !canSubmit) && styles.publishButtonDisabled,
              ]}
              onPress={handlePublish}
              disabled={updating || !canSubmit}
            >
              {updating ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.publishButtonText}>
                  {isEditMode ? t('common.save') : t('addAnnouncement.publish')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  )
}
