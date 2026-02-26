import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation, useRoute } from '@react-navigation/native'
import { colors } from '../../theme/colors'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AnnouncementType, Announcement } from '../../types'
import type { SupportedLang } from '../../types/items'
import { AppHeader } from '../../components/AppHeader'
import { Select } from '../../components/Select'
import { RegionVillageSelector } from '../../components/RegionVillageSelector'
import * as announcementsAPI from '../../lib/api/announcements.api'
import * as profileAPI from '../../lib/api/profile.api'
import { ActivityIndicator, Modal, Alert, Image } from 'react-native'
import Icon from '../../components/Icon'
import DateTimePicker from '@react-native-community/datetimepicker'
import { launchImageLibrary, launchCamera, Asset } from 'react-native-image-picker'
import { API_CONFIG } from '../../config/api.config'

interface RouteParams {
  type: AnnouncementType
  announcementId?: string
  announcement?: Announcement
}




export function NewAnnouncementFormPage() {
  const { t, i18n } = useTranslation()
  const navigation = useNavigation()
  const route = useRoute()
  const { type, announcementId, announcement: routeAnnouncement } = (route.params as RouteParams) || { type: 'goods' }
  const isEditMode = !!announcementId

  const currentLang: SupportedLang = ((): SupportedLang => {
    const lang = (i18n.language ?? 'hy').split('-')[0]
    if (lang === 'ru' || lang === 'en' || lang === 'hy') return lang
    return 'hy'
  })()


  const [apiCategories, setApiCategories] = useState<announcementsAPI.APICategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [apiSubcategories, setApiSubcategories] = useState<announcementsAPI.APISubcategory[]>([])
  const [loadingSubcategories, setLoadingSubcategories] = useState(false)
  const [measurementOptions, setMeasurementOptions] = useState<{ value: string; label: string }[]>([])

  const [formData, setFormData] = useState({
    applicationType: type,
    subtype: '',
    productType: '',
    group: '',
    name: '',
    type: '',
    quantity: '',
    unitOfMeasurement: '',
    measurementUnit: '',
    pricePerUnit: '',
    dailyMaxQuantity: '',
    totalArea: '',
    annualFeeAmount: '',
    rentalPeriod: '',
    periodFee: '',
    salesPeriod: '',
    periodStart: '',
    serviceCostPerHour: '',
    description: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [additionalFieldsExpanded, setAdditionalFieldsExpanded] = useState(false)
  const [updating, setUpdating] = useState(false)
  
  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date')
  const [currentDateField, setCurrentDateField] = useState<'start' | 'end'>('start')
  const [tempDate, setTempDate] = useState(new Date())

  // Image picker state
  const [selectedImages, setSelectedImages] = useState<Asset[]>([])
  const MAX_IMAGES = 3
  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB in bytes

  // Location state - using RegionVillageSelector component
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [selectedVillages, setSelectedVillages] = useState<string[]>([])

  // Store announcement data for edit mode
  const [editAnnouncementData, setEditAnnouncementData] = useState<any>(null)
  const [editItemId, setEditItemId] = useState<string>('')
  const [editUnit, setEditUnit] = useState<string>('')

  // Load announcement data when editing
  useEffect(() => {
    if (isEditMode && announcementId) {
      const loadAnnouncement = (announcement: Announcement) => {
        const a = announcement as any
        const apiType = announcement.type || a.apiType || (a.subtype || 'sell')
        const category = announcement.category || type
        
        // Map subtype correctly based on category
        let mappedSubtype = ''
        if (category === 'goods') {
          // For goods, subtype is directly 'sell' or 'buy'
          mappedSubtype = (apiType === 'sell' || apiType === 'buy') ? apiType : 'sell'
        } else {
          // For service/rent, map 'sell' -> 'offer', 'buy' -> 'requirement'
          mappedSubtype = apiType === 'sell' ? 'offer' : apiType === 'buy' ? 'requirement' : 'offer'
        }
        
        // Store for later use
        setEditAnnouncementData(a)
        setEditItemId(a.item_id || '')
        setEditUnit(a.unit || '')
        
        // Set form data (group will trigger subcategory fetch)
        setFormData(prev => ({
          ...prev,
          applicationType: type,
          subtype: mappedSubtype,
          group: a.group_id || '',
          quantity: typeof (a.count || a.available_quantity) === 'string' ? (a.count || a.available_quantity) : ((a.count || a.available_quantity)?.toString() || ''),
          pricePerUnit: typeof a.price === 'string' ? a.price : (a.price?.toString() || ''),
          dailyMaxQuantity: typeof a.daily_limit === 'string' ? a.daily_limit : (a.daily_limit?.toString() || ''),
          totalArea: a.min_area?.toString() || '',
          salesPeriod: a.date_to || '',
          periodStart: a.date_from || '',
          description: a.description || '',
        }))
        
        // Set regions and villages
        if (a.regions && Array.isArray(a.regions)) {
          setSelectedRegions(a.regions)
        }
        if (a.villages && Array.isArray(a.villages)) {
          setSelectedVillages(a.villages)
        }
        
        // Set images if available - check both announcement.images and a.images
        const imagesArray = announcement.images || a.images || []
        if (imagesArray && Array.isArray(imagesArray) && imagesArray.length > 0) {
          const imageAssets = imagesArray
            .filter((img: any) => {
              if (!img) return false
              if (typeof img === 'string') return img.trim() !== ''
              return !!(img.uri || img.url)
            })
            .map((img: any) => {
              // Handle different image formats: string URL, object with uri/url
              let imageUri = typeof img === 'string' ? img.trim() : (img.uri || img.url || '').trim()
              
              // If it's a relative URL, prepend base URL
              if (imageUri && !imageUri.startsWith('http://') && !imageUri.startsWith('https://') && !imageUri.startsWith('file://')) {
                const baseURL = API_CONFIG.baseURL
                imageUri = imageUri.startsWith('/') ? `${baseURL}${imageUri.slice(1)}` : `${baseURL}${imageUri}`
              }
              
              return {
                uri: imageUri,
                type: (typeof img === 'object' && img.type) ? img.type : 'image/jpeg',
                fileName: (typeof img === 'object' && img.fileName) ? img.fileName : (imageUri.split('/').pop() || 'image.jpg'),
              } as Asset
            })
            .filter((asset: Asset) => asset.uri && asset.uri.trim() !== '') as Asset[]
          
          if (imageAssets.length > 0) {
            console.log('Setting images for edit mode:', imageAssets.length, 'images')
            setSelectedImages(imageAssets)
          } else {
            console.log('No valid images found in announcement')
            setSelectedImages([])
          }
        } else {
          // Clear images if none available
          console.log('No images array found in announcement')
          setSelectedImages([])
        }
      }
      
      if (routeAnnouncement) {
        loadAnnouncement(routeAnnouncement)
      } else {
        announcementsAPI.getAnnouncementByIdAPI(announcementId)
          .then(loadAnnouncement)
          .catch((error) => {
            console.error('Error loading announcement:', error)
            Alert.alert(t('common.error'), 'Failed to load announcement')
          })
      }
    }
  }, [isEditMode, announcementId, routeAnnouncement, type])

  // Set item name after subcategories are loaded (for edit mode)
  useEffect(() => {
    if (isEditMode && editItemId && apiSubcategories.length > 0) {
      // Check if the item exists in loaded subcategories
      const itemExists = apiSubcategories.some(sub => 
        sub.items?.some(item => item.id === editItemId)
      )
      if (itemExists && formData.name !== editItemId) {
        // Subcategories are loaded and item exists, now set it
        setFormData(prev => ({ ...prev, name: editItemId }))
      }
    }
  }, [isEditMode, editItemId, apiSubcategories, formData.name])

  // Set measurement unit after item is selected and measurements are loaded
  useEffect(() => {
    if (isEditMode && editUnit && formData.name && measurementOptions.length > 0 && !formData.measurementUnit) {
      // Find matching unit in measurement options
      // Try exact match first, then case-insensitive, then by label
      const unitLower = editUnit.toLowerCase().trim()
      const matchingOption = measurementOptions.find(opt => {
        const valueLower = opt.value.toLowerCase().trim()
        const labelLower = opt.label.toLowerCase().trim()
        return valueLower === unitLower || 
               labelLower === unitLower ||
               valueLower.includes(unitLower) ||
               labelLower.includes(unitLower)
      })
      if (matchingOption) {
        setFormData(prev => ({ ...prev, measurementUnit: matchingOption.value }))
      } else if (measurementOptions.length === 1) {
        // If only one option, use it
        setFormData(prev => ({ ...prev, measurementUnit: measurementOptions[0].value }))
      } else {
        // Fallback: try to set directly (might work if API accepts it)
        setFormData(prev => ({ ...prev, measurementUnit: editUnit }))
      }
    }
  }, [isEditMode, editUnit, formData.name, measurementOptions, formData.measurementUnit])

  // Fetch categories when component mounts or type changes
  useEffect(() => {
    fetchCategories()
  }, [type])

  // Fetch subcategories when group changes
  useEffect(() => {
    if (formData.group) {
      fetchSubcategories(formData.group)
    } else {
      setApiSubcategories([])
      // Only clear name and measurement if not in edit mode (user manually cleared group)
      if (!isEditMode) {
        setFormData(prev => ({ ...prev, name: '', measurementUnit: '' }))
      }
    }
  }, [formData.group, isEditMode])

  // Extract measurements from selected ITEM (no API request)
  useEffect(() => {
    if (formData.name) {
      // Find the selected ITEM from all subcategories
      let selectedItem = null
      for (const subcategory of apiSubcategories) {
        const item = subcategory.items?.find(i => i.id === formData.name)
        if (item) {
          selectedItem = item
          break
        }
      }
      
      if (selectedItem?.measurements && Array.isArray(selectedItem.measurements) && selectedItem.measurements.length > 0) {
        // Convert measurements to select options
        // Each measurement has { en, hy, ru } structure
        const options = selectedItem.measurements.map((measurement) => {
          // Get the label based on current language
          const label = currentLang === 'hy' ? measurement.hy
            : currentLang === 'ru' ? measurement.ru
            : measurement.en
          
          // Use the English abbreviation as the value (unique identifier)
          const value = measurement.en
          
          return {
            value: value,
            label: label
          }
        })
        
        setMeasurementOptions(options)
        
        // In edit mode, check if editUnit matches any option before clearing
        if (isEditMode && editUnit) {
          const unitMatches = options.some(opt => 
            opt.value.toLowerCase() === editUnit.toLowerCase() ||
            opt.label.toLowerCase() === editUnit.toLowerCase()
          )
          if (!unitMatches) {
            // Unit doesn't match, clear it so matching effect can set it
            setFormData(prev => ({ ...prev, measurementUnit: '' }))
          }
        } else if (!isEditMode) {
          // Not edit mode, clear selection to let user choose
          setFormData(prev => ({ ...prev, measurementUnit: '' }))
        }
      } else {
        setMeasurementOptions([])
        if (!isEditMode) {
          setFormData(prev => ({ ...prev, measurementUnit: '' }))
        }
      }
    } else {
      setMeasurementOptions([])
      if (!isEditMode) {
        setFormData(prev => ({ ...prev, measurementUnit: '' }))
      }
    }
  }, [formData.name, apiSubcategories, currentLang, isEditMode, editUnit])

  const fetchCategories = async () => {
    setLoadingCategories(true)
    try {
      const data = await announcementsAPI.getCategoriesByTypeAPI(type)
      setApiCategories(data)
    } catch (error) {
      setApiCategories([])
    } finally {
      setLoadingCategories(false)
    }
  }

  const fetchSubcategories = async (categoryId: string) => {
    setLoadingSubcategories(true)
    try {
      const data = await announcementsAPI.getSubcategoriesByCategoryIdAPI(categoryId)
      setApiSubcategories(data)
    } catch (error) {
      setApiSubcategories([])
    } finally {
      setLoadingSubcategories(false)
    }
  }


  // Show selected values as blue buttons (based on screenshots)
  const renderSelectedValue = (value: string, label: string, onPress?: () => void) => {
    if (!value) return null
    return (
      <TouchableOpacity
        style={styles.selectedValueButton}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={styles.selectedValueText}>{label}</Text>
      </TouchableOpacity>
    )
  }

  // Date picker handlers
  const openDatePicker = (field: 'start' | 'end') => {
    setCurrentDateField(field)
    const existingDate = field === 'start' ? formData.periodStart : formData.salesPeriod
    setTempDate(existingDate ? new Date(existingDate) : new Date())
    setShowDatePicker(true)
  }

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false)
      if (event.type === 'set' && selectedDate) {
        confirmDate(selectedDate)
      }
    } else if (selectedDate) {
      setTempDate(selectedDate)
    }
  }

  const formatDateToYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const confirmDate = (dateToConfirm?: Date) => {
    const finalDate = dateToConfirm || tempDate
    const formattedDate = formatDateToYYYYMMDD(finalDate)
    
    if (currentDateField === 'start') {
      setFormData({ ...formData, periodStart: formattedDate })
    } else {
      setFormData({ ...formData, salesPeriod: formattedDate })
    }
    setShowDatePicker(false)
  }

  const cancelDatePicker = () => {
    setShowDatePicker(false)
  }

  // Image picker handlers
  const showImagePickerOptions = () => {
    Alert.alert(
      t('addAnnouncement.images'),
      t('addAnnouncement.uploadImagesInfo'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel'
        },
        {
          text: 'Camera',
          onPress: () => openCamera()
        },
        {
          text: 'Gallery',
          onPress: () => openGallery()
        }
      ]
    )
  }

  const validateImage = (asset: Asset): boolean => {
    if (!asset.fileSize) {
      Alert.alert('Error', 'Unable to determine file size')
      return false
    }

    if (asset.fileSize > MAX_FILE_SIZE) {
      Alert.alert(
        'Error', 
        `File size exceeds 5MB limit. Selected file is ${(asset.fileSize / (1024 * 1024)).toFixed(2)}MB`
      )
      return false
    }

    // Validate file type (JPEG, PNG, WebP)
    if (asset.uri) {
      const uri = asset.uri.toLowerCase()
      const isValidType = uri.endsWith('.jpg') || 
                         uri.endsWith('.jpeg') || 
                         uri.endsWith('.png') || 
                         uri.endsWith('.webp')
      
      if (!isValidType) {
        Alert.alert('Error', 'Only JPEG, PNG, and WebP image formats are allowed')
        return false
      }
    }

    return true
  }

  const openCamera = () => {
    if (selectedImages.length >= MAX_IMAGES) {
      Alert.alert('Error', `Maximum ${MAX_IMAGES} images allowed`)
      return
    }

    launchCamera(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1920,
      },
      (response) => {
        if (response.didCancel) {
          return
        }
        if (response.errorCode) {
          Alert.alert('Error', response.errorMessage || 'Failed to open camera')
          return
        }
        if (response.assets && response.assets.length > 0) {
          const asset = response.assets[0]
          if (validateImage(asset)) {
            setSelectedImages([...selectedImages, asset])
          }
        }
      }
    )
  }

  const openGallery = () => {
    const remainingSlots = MAX_IMAGES - selectedImages.length
    if (remainingSlots <= 0) {
      Alert.alert('Error', `Maximum ${MAX_IMAGES} images allowed`)
      return
    }

    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1920,
        selectionLimit: remainingSlots,
      },
      (response) => {
        if (response.didCancel) {
          return
        }
        if (response.errorCode) {
          Alert.alert('Error', response.errorMessage || 'Failed to open gallery')
          return
        }
        if (response.assets && response.assets.length > 0) {
          const validAssets = response.assets.filter(asset => validateImage(asset))
          setSelectedImages([...selectedImages, ...validAssets])
        }
      }
    )
  }

  const removeImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index))
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Required fields validation
    if (!formData.subtype) {
      newErrors.subtype = `${t('announcementSubtype.title')} ${t('addAnnouncement.required')}`
    }
    if (!formData.group) {
      newErrors.group = `${t('addAnnouncement.group')} ${t('addAnnouncement.required')}`
    }
    if (!formData.name) {
      newErrors.name = `${t('addAnnouncement.name')} ${t('addAnnouncement.required')}`
    }
    if (!formData.measurementUnit) {
      newErrors.measurementUnit = `${t('addAnnouncement.unitOfMeasurement')} ${t('addAnnouncement.required')}`
    }

    // Quantity validation for goods
    if (type === 'goods' && !formData.quantity) {
      newErrors.quantity = `${t('addAnnouncement.quantity')} ${t('addAnnouncement.required')}`
    }

    // Price validation
    if (!formData.pricePerUnit) {
      newErrors.pricePerUnit = `${t('addAnnouncement.price')} ${t('addAnnouncement.required')}`
    }

    // Note: description, images, region/village, dates, and daily limit are optional

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0]
      Alert.alert('Validation Error', firstError)
      return false
    }

    return true
  }

  const handleContinue = () => {
    // TODO: Validate and proceed to next step or submit
  }

  const handlePublish = async () => {
    if (!validateForm()) {
      return
    }

    try {
      setUpdating(true)
      let apiType = formData.subtype
      if (type === 'service') {
        if (formData.subtype === 'offer') {
          apiType = 'sell' // Service offer = sell
        } else if (formData.subtype === 'requirement') {
          apiType = 'buy' // Service requirement = buy
        }
      } else if (type === 'rent') {
        if (formData.subtype === 'offer') {
          apiType = 'sell' // Rent offer = sell
        } else if (formData.subtype === 'requirement') {
          apiType = 'buy' // Rent requirement = buy
        }
      }
      // For goods, subtype is already 'sell' or 'buy', so no mapping needed

      // Prepare announcement data matching API format
      const announcementData: any = {
        type: apiType, // "sell", "buy", "rent" (mapped from subtype)
        category: type, // "goods", "service", "rent" (type is from route: goods/service/rent)
        group_id: formData.group,
        item_id: formData.name,
        price: parseFloat(formData.pricePerUnit),
        unit: formData.measurementUnit,
      }

      // Add optional description
      if (formData.description) {
        announcementData.description = formData.description
      }

      // Add count (quantity) for goods
      if (type === 'goods' && formData.quantity) {
        announcementData.count = parseFloat(formData.quantity)
      }

      // Add daily limit for goods
      if (type === 'goods' && formData.dailyMaxQuantity) {
        announcementData.daily_limit = parseFloat(formData.dailyMaxQuantity)
      }

      // Add availability period if provided (dates are stored in YYYY-MM-DD format)
      if (formData.periodStart) {
        announcementData.date_from = formData.periodStart
      }
      if (formData.salesPeriod) {
        announcementData.date_to = formData.salesPeriod
      }

      // Add locations if provided (as arrays)
      if (selectedRegions.length > 0) {
        announcementData.regions = selectedRegions
      }
      if (selectedVillages.length > 0) {
        announcementData.villages = selectedVillages
      }

      // Call API to create or update announcement
      const validImages = selectedImages.filter(img => img.uri)
      
      if (isEditMode && announcementId) {
        // Update existing announcement
        // Separate existing URLs from new file uploads
        const existingImageUrls: string[] = validImages
          .filter(img => img.uri && (img.uri.startsWith('http://') || img.uri.startsWith('https://')))
          .map(img => img.uri!)
        
        const newImageFiles = validImages.filter(img => 
          img.uri && (img.uri.startsWith('file://') || img.uri.startsWith('content://'))
        )
        
        // Always include images array in announcementData (even if empty, to handle deletions)
        // This tells the backend which images to keep - includes existing URLs
        announcementData.images = existingImageUrls as any
        
        // Send new file uploads separately via images parameter
        // The API will combine existing URLs (from announcementData.images) with new file uploads
        const imagesToSend = newImageFiles.length > 0 ? newImageFiles : undefined
        
        const response = await announcementsAPI.updateAnnouncementAPI(
          announcementId,
          announcementData,
          imagesToSend
        )
        
        // Show success message
        Alert.alert(
          t('common.success'),
          'Announcement updated successfully',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        )
      } else {
        // Create new announcement (pass images for FormData upload)
        const response = await announcementsAPI.createAnnouncementAPI(
          announcementData,
          validImages.length > 0 ? validImages : undefined
        )

        // Show success message
        Alert.alert(
          t('common.success'),
          t('addAnnouncement.publishSuccess'),
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        )
      }

    } catch (error: any) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} announcement:`, error)
      Alert.alert(
        t('common.error'),
        error.response?.data?.message || error.message || (isEditMode ? 'Failed to update announcement' : t('addAnnouncement.publishError'))
      )
    } finally {
      setUpdating(false)
    }
  }

  const getSelectedLabel = (value: string, options: any[]) => {
    return options.find(opt => opt.value === value)?.label || ''
  }

  const getSubtypeOptions = () => {
    // Use announcement category if in edit mode, otherwise use route type
    const category = (isEditMode && editAnnouncementData?.category) ? editAnnouncementData.category : type
    switch (category) {
      case 'goods':
        return [
          { value: 'sell', label: t('announcementSubtype.sellGoods') },
          { value: 'buy', label: t('announcementSubtype.buyGoods') },
        ]
      case 'service':
        return [
          { value: 'offer', label: t('announcementSubtype.serviceOffer') },
          { value: 'requirement', label: t('announcementSubtype.serviceRequirement') },
        ]
      case 'rent':
        return [
          { value: 'offer', label: t('announcementSubtype.rentOffer') },
          { value: 'requirement', label: t('announcementSubtype.rentRequirement') },
        ]
      default:
        return []
    }
  }

  const subtypeOptions = getSubtypeOptions()

  // Same label-by-lang as FilterModal (shared with announcements API)
  const catalogLang: announcementsAPI.CatalogLang = currentLang === 'ru' || currentLang === 'en' ? currentLang : 'hy'

  // Convert API categories to select options (same as filter)
  const categoryOptions = apiCategories.map(category => ({
    value: category.id,
    label: announcementsAPI.getCategoryLabelByLang(category, catalogLang),
  }))

  // Convert API subcategories with items to grouped select options (same label helpers as filter)
  const subcategoryOptions = apiSubcategories.flatMap(subcategory => {
    const subcategoryLabel = announcementsAPI.getSubcategoryLabelByLang(subcategory, catalogLang)

    // Only process subcategories that have items
    if (!subcategory.items || subcategory.items.length === 0) {
      return [] // Skip subcategories without items
    }

    return [
      // Header option (non-selectable) - subcategory name (e.g., "Berries")
      {
        value: `header_${subcategory.id}`,
        label: subcategoryLabel,
        isHeader: true,
      },
      // Item options (selectable) - only items are selectable (e.g., "Strawberry", "Blueberry")
      ...subcategory.items.map((item: announcementsAPI.APIItem) => ({
        value: item.id,
        label: announcementsAPI.getItemLabelByLang(item, catalogLang),
        isHeader: false,
      }))
    ]
  })

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
        {/* Announcement Subtype Select */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>{t('announcementSubtype.title')}</Text>
          <Select
            value={formData.subtype}
            onValueChange={(value) => setFormData({ ...formData, subtype: value })}
            options={subtypeOptions}
            placeholder={t('common.select')}
          />
        </View>

         <View style={styles.fieldContainer}>
           <Text style={styles.label}>{t('addAnnouncement.group')}</Text>
           {loadingCategories ? (
             <View style={styles.loadingContainer}>
               <ActivityIndicator size="small" color={colors.buttonPrimary} />
               <Text style={styles.loadingText}>{t('common.loading')}</Text>
             </View>
           ) : (
             <Select
               value={formData.group}
               onValueChange={(value) => setFormData({ ...formData, group: value })}
               options={categoryOptions}
               placeholder={t('common.select')}
               disabled={categoryOptions.length === 0}
             />
           )}
         </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{t('addAnnouncement.name')}</Text>
            {loadingSubcategories ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.buttonPrimary} />
                <Text style={styles.loadingText}>{t('common.loading')}</Text>
              </View>
            ) : (
              <Select
                value={formData.name}
                onValueChange={(value) => {
                  setFormData({ ...formData, name: value })
                } }
                options={subcategoryOptions}
                placeholder={t('common.select')}
                disabled={!formData.group || subcategoryOptions.length === 0}
                searchable={true}
                searchPlaceholder={t('common.search')}
              />
            )}
          </View>

          {/* Measurement Unit Select */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{t('addAnnouncement.unitOfMeasurement')}</Text>
            <Select
              value={formData.measurementUnit}
              onValueChange={(value) => setFormData({ ...formData, measurementUnit: value })}
              options={measurementOptions}
              placeholder={t('common.select')}
              disabled={measurementOptions.length === 0}
            />
          </View>

          {/* Quantity Input - Only for goods */}
          {type === 'goods' && (
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>{t('addAnnouncement.quantity')}</Text>
              <TextInput
                style={styles.input}
                value={formData.quantity}
                onChangeText={(value) => setFormData({ ...formData, quantity: value })}
                placeholder={t('common.select')}
                placeholderTextColor={colors.textPlaceholder}
                keyboardType="numeric"
              />
            </View>
          )}

          {/* Price Input */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{t('addAnnouncement.price')}</Text>
            <TextInput
              style={styles.input}
              value={formData.pricePerUnit}
              onChangeText={(value) => setFormData({ ...formData, pricePerUnit: value })}
              placeholder={t('common.select')}
              placeholderTextColor={colors.textPlaceholder}
              keyboardType="numeric"
            />
          </View>

          {/* Additional Fields Toggle */}
          <TouchableOpacity
            style={styles.additionalFieldsToggle}
            onPress={() => setAdditionalFieldsExpanded(!additionalFieldsExpanded)}
          >
            <Text style={styles.additionalFieldsText}>
              {t('addAnnouncement.additionalFields')}
            </Text>
            <Icon
              name="chevronDown"
              size={24}
              color={colors.buttonPrimary}
              style={{
                transform: [{ rotate: additionalFieldsExpanded ? '180deg' : '0deg' }],
              }}
            />
          </TouchableOpacity>

          {/* Additional Fields - Expandable */}
          {additionalFieldsExpanded && (
            <>
              {/* Description */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>{t('addAnnouncement.description')}</Text>
                <TextInput
                  style={[styles.textArea]}
                  value={formData.description}
                  onChangeText={(value) => setFormData({ ...formData, description: value })}
                  placeholder={t('addAnnouncement.fillIn')}
                  placeholderTextColor={colors.textPlaceholder}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Images Upload - Only show for rent or goods */}
              {(formData.applicationType === 'rent' || formData.applicationType === 'goods') && (
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
                  
                  <Text style={styles.imageUploadInfo}>
                    {t('addAnnouncement.uploadImagesInfo')}
                  </Text>

                  {/* Selected Images Preview */}
                  {selectedImages.length > 0 && (
                    <View style={styles.imagePreviewContainer}>
                      {selectedImages.map((image, index) => (
                        <View key={index} style={styles.imagePreviewWrapper}>
                          <Image 
                            source={{ uri: image.uri }} 
                            style={styles.imagePreview}
                          />
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

              {/* Availability Period */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>{t('addAnnouncement.availabilityPeriod')}</Text>
                <View style={styles.dateRow}>
                  <View style={styles.dateInputHalf}>
                    <Text style={styles.dateLabel}>{t('addAnnouncement.from')}</Text>
                    <TouchableOpacity 
                      style={styles.dateInput}
                      onPress={() => openDatePicker('start')}
                    >
                      <Text style={[styles.dateInputText, !formData.periodStart && styles.placeholder]}>
                        {formData.periodStart || t('addAnnouncement.fillIn')}
                      </Text>
                      <Icon name="calendar" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.dateInputHalf}>
                    <Text style={styles.dateLabel}>{t('addAnnouncement.until')}</Text>
                    <TouchableOpacity 
                      style={styles.dateInput}
                      onPress={() => openDatePicker('end')}
                    >
                      <Text style={[styles.dateInputText, !formData.salesPeriod && styles.placeholder]}>
                        {formData.salesPeriod || t('addAnnouncement.fillIn')}
                      </Text>
                      <Icon name="calendar" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Daily Maximum Quantity - Only for goods */}
              {type === 'goods' && (
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>{t('addAnnouncement.dailyMaxQuantity')}</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.dailyMaxQuantity}
                    onChangeText={(value) => setFormData({ ...formData, dailyMaxQuantity: value })}
                    placeholder={t('addAnnouncement.fillIn')}
                    placeholderTextColor={colors.textPlaceholder}
                    keyboardType="numeric"
                  />
                </View>
              )}

              {/* Region & Village Selector */}
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

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              disabled={updating}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.publishButton, updating && styles.publishButtonDisabled]}
              onPress={handlePublish}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.publishButtonText}>{isEditMode ? t('common.save') : t('addAnnouncement.publish')}</Text>
              )}
            </TouchableOpacity>
          </View>
      </ScrollView>
      </SafeAreaView>

      {/* Date Picker Modal for iOS */}
      {Platform.OS === 'ios' && showDatePicker && (
        <Modal
          transparent={true}
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
                textColor={colors.textPrimary}
                style={styles.datePickerIOS}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Date Picker for Android */}
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
    backgroundColor: colors.white,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: colors.textTile,
    marginBottom: 7,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 50,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  
  selectedValueButton: {
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 50,
    marginBottom: 8,
  },
  selectedValueText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
  selectedValueLabel: {
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: 4,
  },
  inputWithSuffix: {
    position: 'relative',
  },
  suffix: {
    position: 'absolute',
    right: 16,
    top: 40,
    fontSize: 16,
    color: colors.textPrimary,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 50,
    backgroundColor: colors.background,
  },
  dateInputHalf: {
    flex: 1,
    marginHorizontal: 4,
  },
  dateInputText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  placeholder: {
    color: colors.textPlaceholder,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  imageUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background,
  },
  imageUploadIconContainer: {
    width: 25,
    height: 25,
    borderRadius: 16,
    backgroundColor: colors.buttonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  imageUploadText: {
    fontSize: 16,
    color: colors.buttonPrimary,
    flex: 1,
  },
  imageUploadInfo: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 8,
    marginLeft: 4,
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 12,
  },
  imagePreviewWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  imageRemoveButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error || '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  textAreaWrapper: {
    marginTop: 7,
  },
  textArea: {
    width: '100%',
    minHeight: 100,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 16,
    backgroundColor: colors.white,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 50,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.buttonPrimary,
  },
  publishButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 50,
    backgroundColor: colors.buttonPrimary,
    alignItems: 'center',
  },
  publishButtonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.6,
  },
  publishButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 50,
    backgroundColor: colors.backgroundSecondary,
  },
  collapsibleHeaderText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  chevronIcon: {
    transform: [{ rotate: '0deg' }],
  },
  chevronIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  collapsibleContent: {
    marginTop: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
  },
  collapsiblePlaceholder: {
    fontSize: 14,
    color: colors.textPlaceholder,
    fontStyle: 'italic',
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
  additionalFieldsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 50,
    backgroundColor: colors.borderLight,
    marginVertical: 16,
  },
  additionalFieldsText: {
    fontSize: 16,
    color: colors.buttonPrimary,
    fontWeight: '500',
  },
  dateLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  addLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.buttonPrimary,
    borderRadius: 50,
    marginTop: 8,
    gap: 8,
  },
  addLocationText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  locationPairsList: {
    marginTop: 12,
    gap: 8,
  },
  locationPairItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 16,
  },
  locationPairInfo: {
    flex: 1,
  },
  locationPairText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  locationPairRemove: {
    padding: 4,
    marginLeft: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  datePickerCancel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  datePickerConfirm: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.buttonPrimary,
  },
  datePickerIOS: {
    height: 200,
    backgroundColor: colors.white,
  },
})

